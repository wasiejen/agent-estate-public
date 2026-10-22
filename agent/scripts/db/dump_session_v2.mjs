#!/usr/bin/env node
// dump_session_v2.mjs -- READ-ONLY v2-shaped opencode session dump into the
// CLONE corpus (TODO #137 unit 4c: the v2 twin of agent/scripts/db/dump_session.cjs).
//
// CLI parity with the v1 script (same flags, same exit codes):
//   node dump_session_v2.mjs <sessionID>              LOSSLESS full-detail md dump
//   node dump_session_v2.mjs <sessionID> --lite       LITE (filtered) md dump
//   node dump_session_v2.mjs <sessionID> --json       RAW JSON dump (unfiltered, uncapped)
//   node dump_session_v2.mjs <sessionID> --out <relpath>
//                                               single-session dump to OUT_DIR/<relpath>
//                                               instead of <sessionID>.md (single-session
//                                               ONLY; <relpath> relative, no `..`, safe
//                                               chars — else exit 2; --json appends .json
//                                               when the relpath has no extension)
//   node dump_session_v2.mjs --all [--slim]           corpus backfill (slim lines, default)
//   node dump_session_v2.mjs --all --full             corpus backfill (full detail)
// Exit codes: 0 ok; 1 no such session / db-error / a corpus failure; 2 usage
// rejections (unknown flag, flag conflicts, no args, unsafe --out relpath) and the
// no-v2-tables rejection.
//
// Output: <this script's dir>/../../../archive/sessions/<sessionID>.md
//         (or OUT_DIR/<relpath>; `.json` in --json mode) — the CLONE's
//         `archive/sessions/` (the script's own dir-relative OUT_DIR, like v1).
// The DB (`OPENCODE_DB` env override, else `~/.local/share/opencode/opencode.db`)
// is opened READ-ONLY by every backend and is NEVER written.
//
// V2 SHAPE (measured 2026-10-22 with mode=ro reads of the migrated DB): the rows
// come from `session_v2` (the `session` columns PLUS the fork/idle columns; the
// `model` column holds a JSON STRING) and `session_message`(id, session_id,
// type, seq, time_created, time_updated, `data` JSON). The v1 `part`-table lane
// is GONE: v2 content lives INLINE in the row's `data` — assistant `content[]`
// items `{type:"text"|"reasoning", text}`, `{type:"tool", id, name, executed,
// state{status,input,content|error}, time}`; `user` rows carry `text` + `files`;
// `compaction` rows carry status/reason/summary/recent (their `tokens` are the
// REQUEST usage, NOT the context size). "parts" in the summary line and the
// `parts=` stdout field therefore count CONTENT ITEMS. A DB WITHOUT the v2 pair
// is a clear rejection (exit 2) — v1 DBs stay the v1 script's job.
//
// Backend chain (the v1 context_trim / gauge-core discipline, FIRST SUCCESS
// wins): (1) `bun:sqlite` (the bun-compiled host's native module), (2) `node:sqlite`
// (system node v24+ — the smoke host), (3) `spawn-sqlite3` — the LAST-RESORT
// maintainer-placed CLI (`<clone root>/.opencode/plugin/tools/sqlite3.exe`):
// ARGS ARRAY (no shell), a hard 2500 ms KILL per call (a stuck child = db-error,
// never a hang), and a `file:...?mode=ro` URI so no journal write happens while
// the host writes concurrently. Every read is a one-shot query; NO write
// statement exists in this file. The chain is test-steerable via `setBackends`
// (the gauge core / v1 context_trim pattern); with no backend available the
// opens fail CLOSED to a db-error (never a blind write).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(THIS_DIR, "..", "..", "..", "archive", "sessions");
const DEFAULT_EXE_PATH = path.resolve(THIS_DIR, "..", "..", "..", ".opencode", "plugin", "tools", "sqlite3.exe");
const BUSY_TIMEOUT_MS = 2500;
const SPAWN_TIMEOUT_MS = 2500; // hard KILL per CLI call — never a hang
const MAX_BUFFER = 16 * 1024 * 1024; // the data JSON of a session's rows in one exec

function usage(code) {
  console.log(
    "usage:\n" +
      "  node dump_session_v2.mjs <sessionID>              lossless full dump of one session\n" +
      "  node dump_session_v2.mjs <sessionID> --lite       lite (filtered) markdown dump\n" +
      "  node dump_session_v2.mjs <sessionID> --json       raw JSON dump (unfiltered, uncapped)\n" +
      "  node dump_session_v2.mjs <sessionID> --out <relpath>   single-session dump to OUT_DIR/<relpath>\n" +
      "                                                      (relpath relative, no `..`, safe chars — else exit 2;\n" +
      "                                                       --json appends .json when the relpath has no extension)\n" +
      "  node dump_session_v2.mjs --all [--slim]            corpus backfill (slim lines, default)\n" +
      "  node dump_session_v2.mjs --all --full              corpus backfill (full detail)\n" +
      "  env OPENCODE_DB overrides the DB path"
  );
  process.exit(code);
}
function iso(ts) {
  if (typeof ts === "number" && isFinite(ts)) {
    const ms = ts < 1e12 ? ts * 1000 : ts; // opencode stores epoch millis
    return new Date(ms).toISOString();
  }
  return String(ts);
}
function jparse(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}
function jstr(o, max) {
  let s;
  try { s = JSON.stringify(o); } catch (e) { s = String(o); }
  if (s == null) s = "";
  if (max && s.length > max) s = s.slice(0, max) + "...";
  return s;
}
function safeFile(sid) {
  if (!/^[A-Za-z0-9_-]+$/.test(sid)) throw new Error("unsafe session id for filename: " + sid);
  return sid + ".md";
}
function safeJsonFile(sid) {
  if (!/^[A-Za-z0-9_-]+$/.test(sid)) throw new Error("unsafe session id for filename: " + sid);
  return sid + ".json";
}
// --out relpath in --json mode: append `.json` when the basename carries no
// extension (a trailing `.safe-chars` dot-run counts as one).
function jsonOutRel(rel) {
  return /\.[A-Za-z0-9]+$/.test(path.basename(rel)) ? rel : rel + ".json";
}
// Validate a `--out` relpath: relative (no leading `/`, no backslash), no `.` /
// `..` / empty segments (no traversal), safe chars only.
function safeRelPath(rel) {
  if (typeof rel !== "string" || rel.length === 0) return false;
  if (rel.startsWith("/") || rel.includes("\\")) return false;
  for (const s of rel.split("/")) {
    if (s === "" || s === "." || s === "..") return false;
    if (!/^[A-Za-z0-9_.-]+$/.test(s)) return false;
  }
  return true;
}
// The model FIELD unwraps both shapes: the v2 `session_v2.model` column holds a
// JSON STRING ('{"id":…,"providerID":…}'), an assistant row's `data.model` is an
// OBJECT; a bare string passes through.
function modelName(v) {
  if (v == null) return "?";
  if (typeof v === "string") {
    const p = jparse(v);
    if (p && typeof p === "object") return p.id || p.name || v;
    return v;
  }
  if (typeof v === "object") return v.id || v.name || jstr(v, 60);
  return String(v);
}

// ---------------------------------------------------------------------------
// Backend chain — see the header. `setBackends` restricts the selection order
// for tests (the smoke forces ["spawn-sqlite3"] to exercise the CLI lane);
// production never calls it. A backend = an opener handing back a one-shot
// `query(sql, params)` (always async) + `close()`.
// ---------------------------------------------------------------------------
export const V2_BACKENDS = Object.freeze(["bun:sqlite", "node:sqlite", "spawn-sqlite3"]);
let backendList = [...V2_BACKENDS];
export function setBackends(list) {
  backendList = Array.isArray(list) ? [...list] : [...V2_BACKENDS];
}
export function getBackends() {
  return [...backendList];
}
// The CLI-side chain steer (same style as the `OPENCODE_DB` env override):
// `DUMP_V2_BACKENDS="spawn-sqlite3"` restricts the chain for one process — the
// smoke pins the spawn lane through it (production never sets it).
if (typeof process.env.DUMP_V2_BACKENDS === "string" && process.env.DUMP_V2_BACKENDS !== "") {
  setBackends(process.env.DUMP_V2_BACKENDS.split(",").map((x) => x.trim()).filter((x) => x !== ""));
}

async function importModule(spec) {
  try { return await import(spec); } catch (e) { return null; }
}

// Backend 1 — bun:sqlite (the native module; `readonly` is the bun option
// NAME — the gauge core's shape-surprise fallback stays for a constructor
// shape error only, an OPEN error propagates).
async function openBunSqlite(p) {
  const mod = await importModule("bun:sqlite");
  const Database = mod?.Database ?? (typeof mod === "function" ? mod : mod?.default?.Database ?? mod?.default);
  if (typeof Database !== "function") throw new Error("Database export missing");
  let db;
  try {
    db = new Database(p, { readonly: true, timeout: BUSY_TIMEOUT_MS });
  } catch (e) {
    if (/bad parameter|api misuse|misspelled/i.test(String(e?.message ?? e))) db = new Database(p, { readonly: true });
    else throw e;
  }
  return {
    name: "bun:sqlite",
    // bun 1.4.3 (measured): the Database prototype carries `prepare`/`query`
    // — NOT the old `db.all` sugar — so the shape matches node:sqlite.
    query: (sql, params) => db.prepare(sql).all(...(params ?? [])),
    close: () => db.close(),
  };
}

// Backend 2 — node:sqlite (system node v24+; the v1 script's open shape).
async function openNodeSqlite(p) {
  const mod = await importModule("node:sqlite");
  const DatabaseSync = mod?.DatabaseSync;
  if (typeof DatabaseSync !== "function") throw new Error("DatabaseSync export missing");
  const db = new DatabaseSync(p, { readOnly: true });
  db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS};`);
  return {
    name: "node:sqlite",
    query: (sql, params) => db.prepare(sql).all(...(params ?? [])),
    close: () => db.close(),
  };
}

// Backend 3 — spawn-sqlite3 (the gauge core's proven spawn discipline; one
// CLI invocation per query, `-json` so the big `data` blobs need no
// delimiter dance; a stuck child becomes a db-error, never a hang).
const uriRo = (p) => `file:${p.replace(/\\/g, "/")}?mode=ro`;
// The positional `?` bindings inlined (the CLI takes ONE SQL text): strings
// single-quoted ('' doubled), numbers/booleans as-is, null → NULL. Session
// ids match ^[A-Za-z0-9_-]+$ — no quoting surface in practice.
function inlineParams(sql, params) {
  let i = 0;
  return sql.replace(/\?/g, () => {
    const v = (params ?? [])[i++];
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (v == null) return "NULL";
    return "'" + String(v).replace(/'/g, "''") + "'";
  });
}
async function openSpawnSqlite3(p) {
  if (!existsSync(DEFAULT_EXE_PATH)) throw new Error(`exe-missing ${DEFAULT_EXE_PATH}`);
  return {
    name: "spawn-sqlite3",
    query: async (sql, params) => {
      const { stdout } = await execFileAsync(DEFAULT_EXE_PATH, ["-json", uriRo(p), inlineParams(sql, params)], {
        timeout: SPAWN_TIMEOUT_MS,
        maxBuffer: MAX_BUFFER,
        encoding: "utf8",
      });
      const t = String(stdout).trim();
      if (t === "") return [];
      return JSON.parse(t);
    },
    close: () => {},
  };
}

// Table probe (cheap, sqlite_master names only) — every backend runs it FIRST,
// so a missing/unopenable DB fails the CHAIN the SAME way for every backend
// (the gauge core's probe-first discipline).
const SQL_TABLE_PROBE =
  "SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name IN ('session','session_v2','message','session_message') ORDER BY name";

async function pickBackend(dbPath) {
  const errors = [];
  for (const kind of backendList) {
    let h = null;
    try {
      h = kind === "bun:sqlite" ? await openBunSqlite(dbPath) : kind === "node:sqlite" ? await openNodeSqlite(dbPath) : await openSpawnSqlite3(dbPath);
      const rows = await h.query(SQL_TABLE_PROBE, []);
      const tables = new Set();
      for (const r of rows) {
        const v = Array.isArray(r) ? r[0] : Object.values(r)[0];
        if (v != null) tables.add(String(v));
      }
      return { handle: h, tables };
    } catch (e) {
      errors.push(`${kind}: ${String(e?.message ?? e).replace(/\s+/g, " ").slice(0, 160)}`);
      try { await h?.close?.(); } catch { /* already dead */ }
    }
  }
  return { dbError: "db-error: " + errors.join(" | ") };
}

const SQL_SESSION_BY_ID = (t) => `SELECT * FROM ${t} WHERE id = ?`;
const SQL_SESSION_IDS = (t) => `SELECT id FROM ${t} ORDER BY time_created ASC, rowid ASC`;
// The v2 row read — `seq` is the v2 order key (the fork keeps a session_id+seq
// index); time_created/rowid stay as tie-breakers.
const SQL_ROWS_BY_SESSION =
  "SELECT id, session_id, type, seq, time_created, time_updated, data FROM session_message WHERE session_id = ? ORDER BY seq ASC, time_created ASC, rowid ASC";

// ---------- renderers (the v1 md/json shapes, v2 sources) ----------
function header(s) {
  const L = [];
  L.push("# session " + s.id);
  L.push("# title: " + (s.title == null ? "" : String(s.title)));
  L.push("# agent: " + (s.agent == null ? "" : s.agent) + "  model: " + modelName(s.model));
  L.push("# parent: " + (s.parent_id == null ? "" : s.parent_id));
  L.push("# created: " + iso(s.time_created) + "  updated: " + iso(s.time_updated));
  L.push("# compacting: " + iso(s.time_compacting) + "  archived: " + iso(s.time_archived));
  L.push("# tokens in/out/reasoning: " + s.tokens_input + "/" + s.tokens_output + "/" + s.tokens_reasoning);
  return L;
}

// one content item's rendered lines (`lite` = the filtered preset: text/reasoning
// verbatim, tool header-only (no input/output), other types 400-capped; full =
// LOSSLESS: tool state.input/state.content/state.error verbatim, no caps).
function itemBlock(it, lite) {
  if (!it || typeof it !== "object") return ["  (unparsed): " + jstr(it)];
  const t = it.type ?? "?";
  if (t === "text" && typeof it.text === "string") return ["  [text]", it.text];
  if (t === "reasoning" && typeof it.text === "string") return ["  [reasoning]", it.text];
  if (t === "tool") {
    const st = it.state ?? {};
    const L = ["  [tool] " + (it.name ?? "?") + " callID=" + (it.id ?? "?") + " status=" + (st.status ?? "?")];
    if (it.executed != null) L[0] += " executed=" + String(it.executed);
    if (!lite) {
      if (st.input != null) L.push("  [tool input] " + jstr(st.input));
      if (st.content != null) L.push("  [tool output] " + jstr(st.content));
      if (st.error != null) L.push("  [tool error] " + jstr(st.error));
    }
    return L;
  }
  return ["  [" + t + "] " + jstr(it, lite ? 400 : undefined)];
}

// one v2 row's rendered lines. `role=` carries the row TYPE (v1's role); the
// v2 row's OWN content blocks come from `data.content` (assistant rows) or the
// type-specific fields (`user`: text/files; `compaction`: reason/summary/recent;
// `idle`: outcome; `synthetic`: text/content).
function rowBlock(r, s, lite) {
  const d = jparse(r.data);
  const L = [];
  L.push(
    "## " + r.id +
      " | role=" + (r.type ?? "?") +
      " | seq=" + (r.seq ?? "?") +
      " | agent=" + (d && d.agent ? d.agent : (s.agent == null ? "?" : s.agent)) +
      " | model=" + modelName((d && d.model) || s.model) +
      " | " + iso(r.time_created)
  );
  if (d) {
    const meta = {};
    for (const k of ["finish", "rawFinish", "cost", "tokens", "error", "outcome", "status", "reason"])
      if (k in d && d[k] != null) meta[k] = d[k];
    if (Object.keys(meta).length) L.push("meta: " + jstr(meta, lite ? 600 : undefined));
    const items = Array.isArray(d.content) ? d.content : [];
    for (const it of items) L.push(...itemBlock(it, lite));
    if (r.type === "user" && typeof d.text === "string") L.push("  [text]", d.text);
    else if (r.type === "user" && Array.isArray(d.text)) for (const it of d.text) L.push(...itemBlock(it, lite));
    if (r.type === "user" && d.files != null && (!Array.isArray(d.files) || d.files.length)) L.push("  [files] " + jstr(d.files, lite ? 200 : undefined));
    if (r.type === "compaction") {
      if (d.reason != null) L.push("  [compaction reason] " + jstr(d.reason));
      if (d.summary != null) L.push("  [summary]", String(d.summary));
      if (d.recent != null) L.push("  [recent] " + jstr(d.recent, lite ? 400 : undefined));
    }
    if (r.type === "idle" && d.outcome != null) L.push("  [outcome] " + jstr(d.outcome, lite ? 400 : undefined));
    if (items.length === 0 && !(r.type === "user" && d.text != null) && r.type !== "compaction" && r.type !== "idle") L.push("  (no parts)");
  } else {
    L.push(lite ? "  (unparsed)" : "  (unparsed): " + r.data);
  }
  return L;
}

// slim line for one v2 row (the corpus default)
function slimLine(r) {
  const d = jparse(r.data);
  const slim = { type: r.type };
  if (d) for (const k of ["agent", "finish", "cost", "tokens", "outcome", "status", "reason"])
    if (k in d && d[k] != null) slim[k] = d[k];
  return iso(r.time_created) + " | " + jstr(slim, 420);
}

// content-item count = the v2 stand-in for v1's `parts=` count
function itemRows(rows) {
  let n = 0;
  for (const r of rows) {
    const d = jparse(r.data);
    if (Array.isArray(d?.content)) n += d.content.length;
    else if (typeof d?.text === "string") n += 1;
  }
  return n;
}

// RAW JSON dump: the session_v2 row + every session_message row, structure
// preserved (`data` parsed when parseable, the raw string otherwise). NO parts/
// orphans lane — v2 has no part table.
function renderJson(handle, s, rows) {
  const doc = {
    session: s,
    messages: rows.map((r) => {
      const d = jparse(r.data);
      return {
        id: r.id,
        session_id: r.session_id,
        type: r.type,
        seq: r.seq,
        time_created: r.time_created,
        time_updated: r.time_updated,
        data: d != null ? d : r.data,
      };
    }),
  };
  return { text: JSON.stringify(doc, null, 2) + "\n", nmsg: rows.length, npart: itemRows(rows) };
}

// mode: "full" (lossless) | "lite" (filtered) | "slim"
function renderSession(handle, s, rows, mode, backend) {
  const L = [];
  for (const h of header(s)) L.push(h);
  L.push("# messages: " + rows.length + "  parts: " + itemRows(rows));
  L.push("# source: v2 tables=session_v2+session_message  backend=" + backend);
  L.push("# dumped: " + new Date().toISOString() + "  mode=" + mode);
  L.push("");
  if (mode === "slim") {
    for (const r of rows) L.push(slimLine(r));
  } else {
    const lite = mode === "lite";
    for (const r of rows) {
      L.push(...rowBlock(r, s, lite));
      L.push("");
    }
  }
  return { text: L.join("\n") + "\n", nmsg: rows.length, npart: itemRows(rows) };
}

// ---------- main ----------
async function main() {
  const argv = process.argv.slice(2);
  let wantAll = false, wantFull = false, wantSlim = false, wantJson = false, wantLite = false, target = null, outRel = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") wantAll = true;
    else if (a === "--full") wantFull = true;
    else if (a === "--slim") wantSlim = true;
    else if (a === "--json") wantJson = true;
    else if (a === "--lite") wantLite = true;
    else if (a === "-h" || a === "--help") usage(0);
    else if (a === "--out") {
      i++;
      outRel = argv[i];
      if (outRel == null || outRel === "") { console.error("--out requires a <relpath> argument"); usage(2); }
    }
    else if (a.startsWith("-")) { console.error("unknown flag: " + a); usage(2); }
    else {
      if (target) { console.error("multiple session IDs given"); process.exit(2); }
      target = a;
    }
  }
  if (wantAll && target) { console.error("--all and a session ID are mutually exclusive"); process.exit(2); }
  if (wantAll && outRel != null) { console.error("--out is single-session mode only (cannot combine with --all)"); process.exit(2); }
  if (wantJson && wantAll) { console.error("--json is single-session mode only (cannot combine with --all)"); process.exit(2); }
  if (wantLite && wantAll) { console.error("--lite is single-session mode only (cannot combine with --all)"); process.exit(2); }
  if (wantJson && wantLite) { console.error("--json and --lite are mutually exclusive (raw JSON vs markdown)"); process.exit(2); }
  if ((wantJson || wantLite) && (wantFull || wantSlim)) { console.error("--json/--lite cannot combine with --full/--slim (corpus modes)"); process.exit(2); }
  if (!wantAll && !target) usage(2);
  if (target && outRel != null && !safeRelPath(outRel)) {
    console.error("unsafe --out relpath (must be relative, no `..`, safe chars only): " + outRel);
    process.exit(2);
  }
  const fullCorpus = wantFull && !wantSlim; // corpus full detail is opt-in

  const dbPath = process.env.OPENCODE_DB || path.join(os.homedir(), ".local", "share", "opencode", "opencode.db");
  const picked = await pickBackend(dbPath);
  if (picked.dbError) { console.error(picked.dbError); process.exit(1); }
  const { handle, tables } = picked;
  const hasV2 = tables.has("session_v2") && tables.has("session_message");
  if (!hasV2) {
    console.error("no v2 tables (session_v2 + session_message) in " + dbPath + " — this twin dumps v2 rows only (the v1 pair stays dump_session.cjs's job)");
    handle.close?.();
    process.exit(2);
  }

  try {
    if (target) {
      const s = (await handle.query(SQL_SESSION_BY_ID("session_v2"), [target]))[0];
      if (!s) { console.error("no such session: " + target); handle.close?.(); process.exit(1); }
      const rows = await handle.query(SQL_ROWS_BY_SESSION, [target]);
      const mode = wantJson ? "json" : wantLite ? "lite" : "full";
      const r = mode === "json" ? renderJson(handle, s, rows) : renderSession(handle, s, rows, mode, handle.name);
      const file = outRel != null
        ? path.join(OUT_DIR, mode === "json" ? jsonOutRel(outRel) : outRel)
        : path.join(OUT_DIR, mode === "json" ? safeJsonFile(target) : safeFile(target));
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, r.text, "utf8");
      console.log(
        "dumped " + target + " messages=" + r.nmsg + " parts=" + r.npart +
          " bytes=" + r.text.length + " mode=" + mode + " backend=" + handle.name + " -> " + file
      );
      handle.close?.();
      process.exit(0);
    }

    const ids = (await handle.query(SQL_SESSION_IDS("session_v2"), [])).map((x) => (Array.isArray(x) ? x[0] : x.id)).filter((v) => typeof v === "string" && v !== "");
    let wrote = 0, failed = 0, totalBytes = 0;
    for (const sid of ids) {
      try {
        const s = (await handle.query(SQL_SESSION_BY_ID("session_v2"), [sid]))[0];
        if (!s) throw new Error("session row vanished");
        const rows = await handle.query(SQL_ROWS_BY_SESSION, [sid]);
        const r = renderSession(handle, s, rows, fullCorpus ? "full" : "slim", handle.name);
        const file = path.join(OUT_DIR, safeFile(sid));
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, r.text, "utf8");
        wrote++;
        totalBytes += r.text.length;
      } catch (e) {
        failed++;
        console.error("failed " + sid + ": " + String(e?.message ?? e));
      }
    }
    console.log(
      "corpus: sessions=" + ids.length + " files=" + wrote + " failed=" + failed +
        " bytes=" + totalBytes + " mode=" + (fullCorpus ? "full" : "slim") + " backend=" + handle.name + " -> " + OUT_DIR
    );
    handle.close?.();
    process.exit(failed === 0 ? 0 : 1);
  } finally {
    try { await handle.close?.(); } catch { /* closed already */ }
  }
}

main().catch((e) => {
  console.error("db-error: " + String(e?.stack ?? e).replace(/\s+/g, " ").slice(0, 400));
  process.exit(1);
});
