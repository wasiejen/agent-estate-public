#!/usr/bin/env node
// intercept_sweep.cjs -- read-only: the PER-EVENT FILTER VIEW of the fuzzy-numword
// intercept log (.opencode/temp/intercept.log, written by the R7 observer).
// The counterpart of summarize_intercept.cjs, which stays untouched as the
// AGGREGATE summary (TODO #145: a live-acceptance sweep currently re-reads the
// raw 8-field lines through greps, and those blow the context budget).
//
// GENERIC by design: no count, no session id, no verdict is hardcoded.
// Output: ONE BOUNDED LINE PER EVENT (<= 120 chars), last N events by default
// (default 20), printed OLDEST FIRST; the long args-JSON field is truncated
// with a visible "..." (U+2026) marker. stdout only -- never writes the log.
//
// Line grammar, shared with summarize_intercept.cjs (its exported parseLine is
// reused via require; that script is NOT edited):
//   date_time | session_id | model | tool | args-json | evidence | scope | verdict
// parsed RIGHT-ANCHORED: verdict = last field, scope = second-to-last,
// evidence = third-to-last; args = everything between tool and evidence, so
// an args value that contains " | " merges into the args region and the
//   right-anchored fields stay correct. Lines with < 8 fields are malformed:
//   they render as MALFORMED(Nf), filter by session/grep but NEVER by verdict,
//   and their count rides the header (the log-integrity signal).
// NOT pinned to the frozen verdict vocabulary -- the log carries NEW kinds
// (measured 2026-10-22: edit-ambiguous, edit-hint, error, fuzzy-edit), so a
// verdict filter matches ANY trailing token.
// Printed per event: date_time, session_id, tool, verdict, evidence, args.
// Omitted: model and scope (the 120-char budget goes to the long fields).
//
// Usage: node intercept_sweep.cjs [--session=ID] [--verdict=KIND]
//                     [--grep=NEEDLE] [--lines=N] [logfile]
//   logfile default .opencode/temp/intercept.log (repo-root cwd convention).
//   --session / --verdict / --grep are case-insensitive SUBSTRINGS: session and
//   grep match the raw line, verdict matches the verdict token only (so
//   --verdict=edit catches edit-hint, edit-ambiguous and fuzzy-edit, never a
//   line whose TOOL is edit). --lines=0 prints the header only (count-only).
//   e.g. node agent/scripts/log/intercept_sweep.cjs
//        node agent/scripts/log/intercept_sweep.cjs --session=ses_e9b46b7a
//        node agent/scripts/log/intercept_sweep.cjs --verdict=edit-hint
//        node agent/scripts/log/intercept_sweep.cjs --grep=oldString --lines=6
// Exit: 0 = view printed (0 matches is still 0), 1 = log file unreadable,
//       2 = bad flag.

"use strict";
const fs = require("fs");
// parseLine comes from the aggregate summarizer -- right-anchored split +
// malformed detection, byte-stable by contract. Requiring it does not run its
// cli (that script guards main() with require.main === module).
const { parseLine } = require("./summarize_intercept.cjs");

const LINE_CAP = 120; // the whole per-event line, markers included
const EV_CAP = 44; // evidence: the discriminating field, preferred share
const ARGS_CAP = 48; // args-json: the long field, truncated hardest
const ARGS_SHARE = 0.4; // floor of the free budget kept for args
const SESS_CAP = 32; // head-field safety caps
const TOOL_CAP = 12;
const VERDICT_CAP = 20;
const DATE_CAP = 19;
const ELL = "\u2026"; // the visible truncation marker

function fit(s, cap) {
  if (cap <= 0) return "";
  if (s.length <= cap) return s;
  return s.slice(0, cap - 1) + ELL;
}

// --- parsing ---------------------------------------------------------------

// Left-anchored fields (date/session/tool) + the args region, on top of
// parseLine's right-anchored verdict/scope/evidence.
function splitLine(line) {
  const base = parseLine(line);
  if (base.malformed) return { malformed: true, session: base.session, raw: line };
  const p = line.split(" | ");
  return {
    malformed: false,
    date: p[0],
    session: p[1],
    tool: p[3],
    evidence: p[p.length - 3],
    scope: p[p.length - 2],
    verdict: p[p.length - 1],
    args: p.slice(4, p.length - 3).join(" | "),
    raw: line,
  };
}

// --- filtering -------------------------------------------------------------

// A verdict filter admits only lines that HAVE a verdict token: a malformed
// line has none, so it never matches (the header still reports its count, the
// log-integrity signal stays visible in every view).
function matches(e, o) {
  if (o.verdict && (e.malformed || lower(e.verdict).indexOf(lower(o.verdict)) === -1)) return false;
  if (o.session && lower(e.session || "").indexOf(lower(o.session)) === -1) return false;
  if (o.grep && lower(e.raw).indexOf(lower(o.grep)) === -1) return false;
  return true;
}

// One event line. The free budget (LINE_CAP minus the head and the two field
// labels) splits evidence-first; a field shorter than its share hands the
// remainder to the other, so short args (e.g. "intercept-error") buy the
// evidence room and vice versa.
function renderEvent(e) {
  if (e.malformed) {
    return "MALFORMED(" + e.raw.split(" | ").length + "f) " + fit(e.raw, LINE_CAP - 17);
  }
  const head = [
    fit(e.date, DATE_CAP),
    fit(e.session, SESS_CAP),
    fit(e.tool, TOOL_CAP),
    fit(e.verdict, VERDICT_CAP),
  ].join(" ");
  const avail = Math.max(0, LINE_CAP - head.length - " ev= args=".length);
  const evW = Math.min(e.evidence.length, EV_CAP);
  const arW = Math.min(e.args.length, ARGS_CAP);
  let evCap = evW;
  let arCap = arW;
  if (evW + arW > avail) {
    arCap = Math.min(arW, Math.floor(avail * ARGS_SHARE));
    evCap = Math.min(evW, avail - arCap);
    arCap = Math.min(arW, avail - evCap); // leftover back to args
  }
  return (
    head + " ev=" + fit(e.evidence, evCap) + " args=" + fit(e.args, arCap)
  );
}

// --- view ----------------------------------------------------------------

function sweep(text, o, logname) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const events = lines.map(splitLine);
  const kept = events.filter((e) => matches(e, o));
  // malformed counted over ALL parsed events: a log-integrity fact, reported
  // in every view (see the matches() note above).
  const malformed = events.filter((e) => e.malformed).length;
  const shown = kept.slice(Math.max(0, kept.length - o.lines));

  const flt = [];
  if (o.session) flt.push("session=" + fit(o.session, 24));
  if (o.verdict) flt.push("verdict=" + fit(o.verdict, 20));
  if (o.grep) flt.push("grep=" + fit(o.grep, 20));
  if (o.lines !== 20) flt.push("lines=" + o.lines);
  const header = [
    "INTERCEPT SWEEP " + fit(logname, 56) +
      "  events " + kept.length + "/" + events.length +
      (malformed ? " malformed " + malformed : "") +
      "  showing " + (shown.length ? "last " + shown.length : "none"),
    flt.length ? "filters: " + flt.join(" ") : "filters: none",
  ];
  if (!shown.length) {
    return header
      .concat(kept.length ? "(none shown: --lines=0, matches " + kept.length + ")" : "(no matching events)")
      .join("\n");
  }
  return header.concat(shown.map(renderEvent)).join("\n");
}

// --- cli ---------------------------------------------------------------

function lower(s) {
  return String(s).toLowerCase();
}

function help() {
  console.log(
    "usage: node intercept_sweep.cjs [--session=ID] [--verdict=KIND] " +
      "[--grep=NEEDLE] [--lines=N] [logfile]\n" +
      "  default: last 20 events of .opencode/temp/intercept.log, one <=120-char line per event"
  );
}

function badArg(msg) {
  console.error("intercept_sweep: " + msg);
  process.exit(2);
}

function parseArgs(argv) {
  const o = { session: "", verdict: "", grep: "", lines: 20, file: "" };
  for (const a of argv) {
    if (a === "-h" || a === "--help") {
      help();
      process.exit(0);
    } else if (a.startsWith("--session=")) o.session = a.slice("--session=".length);
    else if (a.startsWith("--verdict=")) o.verdict = a.slice("--verdict=".length);
    else if (a.startsWith("--grep=")) o.grep = a.slice("--grep=".length);
    else if (a.startsWith("--lines=")) {
      const n = a.slice("--lines=".length);
      if (!/^\d+$/.test(n)) badArg("--lines= wants a non-negative integer, got " + a);
      o.lines = parseInt(n, 10);
    } else if (a.startsWith("--")) badArg("unknown flag " + a);
    else if (o.file) badArg("second logfile " + a);
    else o.file = a;
  }
  return o;
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  const file = o.file || ".opencode/temp/intercept.log";
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    console.error("intercept_sweep: cannot read " + file + ": " + e.message);
    process.exit(1);
  }
  console.log(sweep(text, o, file));
}

if (require.main === module) main();
module.exports = { sweep, splitLine, LINE_CAP, EV_CAP, ARGS_CAP };
