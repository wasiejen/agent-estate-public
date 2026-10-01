#!/usr/bin/env node
// loop_stats.cjs -- READ-ONLY looprun measurement (the P6 draft, 2026-09-18).
// Operational telemetry on OUR loop — not an eval harness: no LLM-as-judge,
// no task suite. Sources (all pre-existing): the looprun's loop_log.md,
// .opencode/temp/ctx.log (COMPACT lines), and the live opencode session DB
// (opened readOnly, NEVER written).
//
//   node loop_stats.cjs <looprun-folder>          print the stats to stdout
//   node loop_stats.cjs <looprun-folder> --write  also write _loop_stats.md
//                                                 into the looprun folder
//   env OPENCODE_DB / OPENCODE_CTX_LOG override the machine paths
//
// Output: a per-session table (tool calls, wall time, ctx first/last gauge
// readout, compaction count) + the looprun counters (iterations, planner
// sessions, worker launches, returns/warnings/info, compactions). The
// per-session compaction counts are scoped to the run's session ids.
// Read-only: writes at most _loop_stats.md (only with --write).
"use strict";

const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

const DB = process.env.OPENCODE_DB || "home/.local/share/opencode/opencode.db";
const ROOT = path.resolve(__dirname, "..", "..", "..");
const CTX_LOG = process.env.OPENCODE_CTX_LOG || path.join(ROOT, ".opencode", "temp", "ctx.log");

const STATUS_TOKENS = {
  "-->START": "start",
  "DONE<---": "done",
  "-RETURN-": "return",
  "-WARNING": "warning",
  "--INFO--": "info",
  "CORRECT-": "correct",
};

function usage() {
  console.log(
    "usage:\n" +
      "  node loop_stats.cjs <looprun-folder> [--write]\n" +
      "  <looprun-folder> must contain loop_log.md (relative from repo root or absolute)\n" +
      "  --write also writes _loop_stats.md into the looprun folder\n" +
      "  env OPENCODE_DB / OPENCODE_CTX_LOG override the machine paths"
  );
}

function fail(msg, code) {
  console.error(msg);
  process.exit(code);
}

// ---------- args ----------
const argv = process.argv.slice(2);
let folder = null;
let write = false;
for (const a of argv) {
  if (a === "--write") write = true;
  else if (a === "-h" || a === "--help") { usage(); process.exit(0); }
  else if (a.startsWith("-")) { console.error("unknown flag: " + a); usage(); process.exit(2); }
  else if (folder) { console.error("multiple folders given"); process.exit(2); }
  else folder = a;
}
if (!folder) usage();
const runDir = path.isAbsolute(folder) ? folder : path.join(ROOT, folder);
const logPath = path.join(runDir, "loop_log.md");
if (!fs.existsSync(logPath)) fail("no loop_log.md in: " + runDir, 2);

// ---------- parse loop_log.md ----------
// line format: <stamp> <status> <role> <session> <model> <content>
const logLines = fs.readFileSync(logPath, "utf8").split(/\r?\n/);
const sessions = new Map(); // session id -> {role, model, lines: [], gauge: []}
const tokenCounts = { start: 0, done: 0, return: 0, warning: 0, info: 0, correct: 0 };
let maxPlannerIter = 0;
// NOTE: non-global on purpose — String.match with /g returns full matches
// only (no capture groups); one gauge readout per line at most.
const GAUGE_FULL = /SESSION=(ses_[A-Za-z0-9]+)\s+CTX=(\S+)(?:\s+\((\d+)%\))?\s+REM=(\S+)/;
const GAUGE_SHORT = /(\d+)%\/(\d+)K/;

for (const line of logLines) {
  const m = line.match(/^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})\s+(\S+)\s+(\S+)\s+(ses_[A-Za-z0-9]+)\s+(\S+)\s*(.*)$/);
  if (!m) continue;
  const [, stamp, status, role, sid, model, content] = m;
  const key = STATUS_TOKENS[status];
  if (!key) continue;
  tokenCounts[key]++;
  const it = (role + " " + content).match(/planner-(\d+)/);
  if (it) maxPlannerIter = Math.max(maxPlannerIter, parseInt(it[1], 10));
  let s = sessions.get(sid);
  if (!s) { s = { role, model, lines: [], gauge: [] }; sessions.set(sid, s); }
  s.lines.push({ stamp, key });
  // gauge readouts on ANY line of the session (the DONE lines carry them)
  const g = content.match(GAUGE_FULL);
  if (g) {
    const [ , , ctx, pct, rem ] = g;
    s.gauge.push(pct ? `CTX=${ctx} (${pct}%) REM=${rem}` : `CTX=${ctx} REM=${rem}`);
  } else {
    const sh = content.match(GAUGE_SHORT);
    if (sh) s.gauge.push(`${sh[1]}%/${sh[2]}K`);
  }
}
if (sessions.size === 0) fail("no log lines parsed (empty or malformed loop_log.md)", 1);

// ---------- parse ctx.log COMPACT lines (scoped to the run's sessions) ----------
const compactCount = new Map();
if (fs.existsSync(CTX_LOG)) {
  for (const line of fs.readFileSync(CTX_LOG, "utf8").split(/\r?\n/)) {
    const cm = line.match(/COMPACT\s+(ses_[A-Za-z0-9]+)\s+keep=(\d+)m/);
    if (cm && sessions.has(cm[1])) compactCount.set(cm[1], (compactCount.get(cm[1]) || 0) + 1);
  }
} else {
  console.error("note: no ctx.log at " + CTX_LOG + " (compaction counts will be 0)");
}

// ---------- DB (read-only) ----------
const db = new DatabaseSync(DB, { readOnly: true });
const qSession = db.prepare("SELECT id, agent, model, time_created, time_updated FROM session WHERE id = ?");
const qPartStats = db.prepare(
  "SELECT count(*) AS n, min(time_created) AS tmin, max(time_created) AS tmax, " +
  "sum(CASE WHEN data LIKE '%\"type\":\"tool\"%' THEN 1 ELSE 0 END) AS tools " +
  "FROM part WHERE session_id = ?"
);
const rows = [];
for (const sid of sessions.keys()) {
  const s = sessions.get(sid);
  let dbRow = null, parts = null;
  try {
    dbRow = qSession.get(sid);
    parts = qPartStats.get(sid);
  } catch (e) {
    rows.push({ ...base(sid, s), db: false, err: e.message });
    continue;
  }
  if (!dbRow) { rows.push({ ...base(sid, s), db: false, err: "no session row" }); continue; }
  const wallMin = parts && parts.tmin && parts.tmax ? (parts.tmax - parts.tmin) / 60000 : 0;
  // the DB session.model is a JSON object string ({id, providerID, variant})
  let dbModel = dbRow.model || "?";
  try {
    const mo = JSON.parse(dbModel);
    if (mo && (mo.id || mo.name)) dbModel = mo.id || mo.name;
  } catch (e) { /* keep the raw value */ }
  rows.push({
    ...base(sid, s),
    db: true,
    dbModel,
    toolCalls: parts ? parts.tools : 0,
    partsN: parts ? parts.n : 0,
    wallMin: wallMin.toFixed(1),
    compact: compactCount.get(sid) || 0,
  });
}
db.close();

function base(sid, s) {
  const first = s.lines[0].stamp;
  const last = s.lines[s.lines.length - 1].stamp;
  const g = s.gauge;
  return {
    sid,
    role: s.role,
    model: s.model,
    span: first + " .. " + last,
    nlines: s.lines.length,
    ctxFirst: g.length ? g[0] : "n/a",
    ctxLast: g.length ? g[g.length - 1] : "n/a",
  };
}

// ---------- render ----------
const L = [];
L.push("# looprun stats — " + path.basename(runDir));
L.push("# generated " + new Date().toISOString() + " by agent/scripts/db/loop_stats.cjs (read-only)");
L.push("");
L.push("## per session");
L.push("| session | role | model | tool calls | parts | wall (min) | ctx first -> last | compactions |");
L.push("|---|---|---|---|---|---|---|---|");
for (const r of rows) {
  // model: the DB session row is the authority (the log's model field is
  // sometimes the role token, written by hand); fall back to the log value.
  const model = r.db ? r.dbModel || r.model : r.model;
  if (!r.db) {
    L.push(`| ${r.sid} | ${r.role} | ${model} | n/a | n/a | n/a | ${r.ctxFirst} -> ${r.ctxLast} | ${compactCount.get(r.sid) || 0} | (DB: ${r.err})`);
  } else {
    L.push(
      `| ${r.sid} | ${r.role} | ${model} | ${r.toolCalls} | ${r.partsN} | ${r.wallMin} | ${r.ctxFirst} -> ${r.ctxLast} | ${r.compact} |`
    );
  }
}
L.push("");
L.push("## looprun");
// iterations = DISTINCT PLANNER SESSIONS (the serial loop: one new planner
// session per iteration; a task_id resume keeps the same session id). The
// max planner-N token is a cross-check — a difference is the counter
// mismatch signal (readme_loop §Iteration semantics).
const plannerSessions = rows.filter((r) => /planner/i.test(r.role)).length;
L.push("- iterations: " + plannerSessions + " (distinct planner sessions)");
// informational cross-check: a token ABOVE the session count is a real
// counter mismatch; a lower value is normal (recent role tokens carry no
// digit — the loop_log auto-fill uses the context.agent id).
if (maxPlannerIter) {
  L.push("- max planner-N token: " + maxPlannerIter +
    (maxPlannerIter > plannerSessions ? " — MISMATCH: token exceeds the distinct planner-session count" : ""));
}
L.push("- worker launches: " + rows.filter((r) => !/planner/.test(r.role)).length);
L.push("- log lines: START " + tokenCounts.start + " / DONE " + tokenCounts.done +
  " / RETURN " + tokenCounts.return + " / WARNING " + tokenCounts.warning +
  " / INFO " + tokenCounts.info + " / CORRECT " + tokenCounts.correct);
L.push("- sessions in DB: " + rows.filter((r) => r.db).length + " of " + rows.length);
L.push("- compactions (ctx.log, scoped to run sessions): " + [...compactCount.values()].reduce((a, b) => a + b, 0));
const text = L.join("\n") + "\n";

if (write) {
  const out = path.join(runDir, "_loop_stats.md");
  fs.writeFileSync(out, text, "utf8");
  console.log("wrote " + out);
}
console.log(text);
process.exit(0);
