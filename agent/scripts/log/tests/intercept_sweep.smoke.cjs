#!/usr/bin/env node
// intercept_sweep.smoke.cjs -- the fixture pin for intercept_sweep.cjs (TODO
// #145: per-event filter view of the intercept log). Self-contained: it runs
// against the committed fixture log tests/intercept_sweep_fixture.log (ASCII,
// 24 events: 1 malformed, 3 new-verdict kinds beyond the frozen list --
// edit-hint / fuzzy-edit / edit-ambiguous -- plus an error, a " | "-bearing
// args region, and 16 filler lines) and asserts structure, never a snapshot
// of the whole view (the caps are dynamic by design). Pinned checks:
//   (1) exports (sweep / splitLine / LINE_CAP) come from the script, parseLine
//       reuse from summarize_intercept.cjs stays intact
//   (2) default view: 24 events -> header "showing last 20", 20 event lines,
//       oldest-first, first line = fixture event 5, malformed line last
//   (3) EVERY output line <= LINE_CAP, and a long-args line carries the
//       visible U+2026 marker on both long fields
//   (4) args region with " | " stays right-anchored (evidence/scope/verdict
//       correct, args merged) -- byte-exact rendered line pin
//   (5) --verdict= matches ANY token, substring-wise, on the verdict field
//       only (tool=edit with verdict=no-candidate must NOT match) and never
//       admits the malformed line
//   (6) --session= substring (malformed line still filters by session)
//   (7) --grep= case-insensitive raw-line substring
//   (8) --lines=3 window, --lines=0 header-only, unknown verdict -> 0 matches
//   (9) one byte-exact whole-event-line pin (short fields, no truncation)
//  10) CLI (child node, repo-root cwd): fixture path in the header, exit 0;
//       missing file -> exit 1 + stderr names it, empty stdout;
//       unknown flag -> exit 2; --help -> exit 0
//  11) READ-ONLY: the fixture bytes are identical before and after every op
// Run: node agent/scripts/log/tests/intercept_sweep.smoke.cjs
//   (plain node, exit 0 iff green)
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync, execFile } = require("child_process");

// repo root = four levels up (tests -> log -> scripts -> agent -> root)
const ROOT = path.join(__dirname, "..", "..", "..", "..");
const SCRIPT = path.join(__dirname, "..", "intercept_sweep.cjs");
const FIX = path.join(__dirname, "intercept_sweep_fixture.log");
// forward slashes on purpose: the path lands in the output header (the
// summarize_intercept smoke pins it byte-exact the same way).
const FIXREL = "agent/scripts/log/tests/intercept_sweep_fixture.log";
const ELL = "\u2026"; // the truncation marker, escaped so this smoke is ASCII
const FIXBEFORE = fs.readFileSync(FIX, "utf8"); // the read-only pin baseline

let failed = 0;
function chk(label, ok, detail) {
  console.log((ok ? "PASS " : "FAIL ") + label + (ok ? "" : " — " + String(detail).slice(0, 400)));
  if (!ok) failed++;
}

const mod = require(SCRIPT);
const view = (opts) => mod.sweep(fs.readFileSync(FIX, "utf8"), opts, FIXREL).trim();
const V = (o) => Object.assign({ session: "", verdict: "", grep: "", lines: 20 }, o);
// event lines = everything after the two header lines (or after the header +
// the "(no matching events)"-style tail line, which starts with "(")
function events(out) {
  const L = out.split("\n");
  return L.slice(2).filter((l) => l.trim() !== "" && !l.startsWith("("));
}
function maxLine(out) {
  return Math.max(...out.split("\n").filter((l) => l.trim() !== "").map((l) => l.length));
}

// (1) exports + the shared right-anchored parser
chk("exports sweep/splitLine/LINE_CAP", typeof mod.sweep === "function" && typeof mod.splitLine === "function" && mod.LINE_CAP === 120, JSON.stringify(Object.keys(mod)));
chk("parseLine reuse from summarize_intercept", typeof require(path.join(__dirname, "..", "summarize_intercept.cjs")).parseLine === "function", "no parseLine export");
const merged = mod.splitLine('2026-09-21_10-01 | s | m | bash | {"command":"echo a | b"} | path=/repo | path | out-of-sandbox');
chk("splitLine merges ' | ' in args", merged.args === '{"command":"echo a | b"}' && merged.evidence === "path=/repo" && merged.scope === "path" && merged.verdict === "out-of-sandbox", JSON.stringify(merged));
chk("splitLine flags malformed", mod.splitLine("2026-09-21_10-23 | s | m | write | {}").malformed === true, "not flagged");

// (2) default view -- last 20 of 24, oldest first
const def = view(V());
const defE = events(def);
chk("header events 24/24 malformed 1 showing last 20", def.includes("events 24/24") && def.includes("malformed 1") && def.includes("showing last 20"), def.split("\n")[0]);
chk("default shows 20 event lines", defE.length === 20, "got " + defE.length);
chk("default window starts at fixture event 5", defE[0].startsWith("2026-09-21_10-04"), defE[0].slice(0, 40));
chk("default window ends at the malformed line", defE[19].startsWith("MALFORMED(5f)"), defE[19].slice(0, 40));
chk("default order oldest-first", defE[1].startsWith("2026-09-21_10-05") && defE[18].startsWith("2026-09-21_10-22"), defE[1].slice(0, 20));

// (3) the <=120 cap + the visible marker
let over = defE.filter((l) => l.length > mod.LINE_CAP);
chk("every default-view line <= LINE_CAP", over.length === 0, over.length + " over: " + (over[0] || "").slice(0, 60));
const hintOut = view(V({ verdict: "edit-hint" }));
const hintE = events(hintOut);
chk("long-args view: both long fields carry the U+2026 marker", hintE.length === 1 && hintE[0].includes(ELL) && hintE[0].split(ELL).length === 3, JSON.stringify(hintE));
chk("long-args view line <= LINE_CAP", hintE.length === 1 && hintE[0].length <= mod.LINE_CAP, hintE[0] && hintE[0].length);

// (4) byte-exact pins (fields short enough to survive uncut)
const exactLine = "2026-09-21_10-00 ses_fixa read no-candidate ev=dense date=2026-09 args={\"filePath\":\"/repo/num-861.md\"}";
const single = events(view(V({ session: "ses_fixa", grep: "dense date=2026-09" })));
chk("byte-exact short-fields event line", single.length === 1 && single[0] === exactLine, JSON.stringify(single));
const mergeLine = events(view(V({ session: "ses_fixa", verdict: "out-of-sandbox" })));
chk("byte-exact ' | '-in-args event line", mergeLine.length === 1 && mergeLine[0] === '2026-09-21_10-01 ses_fixa bash out-of-sandbox ev=path=/repo args={"command":"echo a | b"}', JSON.stringify(mergeLine));

// (5) verdict filter: ANY token, substring, verdict field only
const evEdit = events(view(V({ verdict: "edit" })));
chk("--verdict=edit matches the 3 new kinds", evEdit.length === 3 && evEdit.every((l) => / (edit-hint|fuzzy-edit|edit-ambiguous) /.test(l)), JSON.stringify(evEdit));
chk("--verdict=edit excludes tool=edit/no-candidate and the malformed line", evEdit.every((l) => !l.includes("no-candidate")) && evEdit.every((l) => !l.startsWith("MALFORMED")), JSON.stringify(evEdit));
const fzEdit = events(view(V({ verdict: "fuzzy-edit" })));
chk("--verdict=fuzzy-edit -> the exact kind only", fzEdit.length === 1 && fzEdit[0].includes(" fuzzy-edit "), JSON.stringify(fzEdit));
const fzBroad = view(V({ verdict: "fuzzy-" }));
chk("--verdict=fuzzy- substring -> all 3 fuzzy kinds", fzBroad.includes("events 3/24") && events(fzBroad).length === 3, fzBroad.split("\n")[0]);

// (6) session filter (substring; malformed keeps its session)
const fixc = events(view(V({ session: "fixc" })));
chk("--session=fixc -> 4 events incl. the malformed line", fixc.length === 4 && fixc[3].startsWith("MALFORMED") && fixc.every((l) => l.includes("ses_fixc")), JSON.stringify(fixc));
chk("--session= filter narrows the header count", view(V({ session: "fixc" })).includes("events 4/24"), view(V({ session: "fixc" })).split("\n")[0]);

// (7) grep filter: case-insensitive raw-line substring
const gr = events(view(V({ grep: "PATH=/REPO" })));
chk("--grep= case-insensitive -> 1 event", gr.length === 1 && gr[0].includes("path=/repo"), JSON.stringify(gr));
chk("--grep=miss -> no matching events", view(V({ grep: "zzz-absent-needle" })).includes("(no matching events)"), view(V({ grep: "zzz-absent-needle" })));

// (8) window + count-only forms
const last3 = events(view(V({ lines: 3 })));
chk("--lines=3 window (last 3, oldest first, malformed last)", last3.length === 3 && last3[0].startsWith("2026-09-21_10-21") && last3[2].startsWith("MALFORMED"), JSON.stringify(last3));
const zero = view(V({ lines: 0 }));
chk("--lines=0 header-only + count tail", events(zero).length === 0 && zero.includes("showing none") && zero.includes("(none shown"), JSON.stringify(zero.split("\n")));
chk("--lines=0 names the match count", zero.includes("(none shown: --lines=0, matches 24)"), zero.split("\n")[2]);

// (9) read-only proof is checked after the CLI runs -- (10) CLI first
let cliOut = "", cliErr = "", cliCode = 0;
try {
  cliOut = execFileSync(process.execPath, [SCRIPT, "--lines=4", FIXREL], { cwd: ROOT, encoding: "utf8" });
} catch (e) {
  cliCode = e.status;
  cliOut = e.stdout || "";
  cliErr = e.stderr || "";
}
const cliE = events(cliOut.trim());
chk("cli exit 0", cliCode === 0, "code=" + cliCode + " err=" + cliErr);
chk("cli header names the logfile path as given", cliOut.includes(FIXREL), cliOut.split("\n")[0]);
chk("cli --lines=4 -> 4 event lines <= cap", cliE.length === 4 && cliE.every((l) => l.length <= mod.LINE_CAP), "got " + cliE.length);
chk("cli flags line shows lines=4", cliOut.includes("filters: lines=4"), cliOut.split("\n")[1]);

let missCode = 0, missOut = "", missErr = "";
try {
  execFileSync(process.execPath, [SCRIPT, "definitely_missing_sweep.log"], { cwd: ROOT, encoding: "utf8" });
} catch (e) {
  missCode = e.status;
  missOut = e.stdout || "";
  missErr = e.stderr || "";
}
chk("missing-file exit 1", missCode === 1, "code=" + missCode);
chk("missing-file empty stdout", missOut.trim() === "", missOut);
chk("missing-file stderr names the file", missErr.includes("definitely_missing_sweep.log"), missErr);

let flagCode = 0, flagErr = "", flagOut = "";
try {
  execFileSync(process.execPath, [SCRIPT, "--nope=1", FIXREL], { cwd: ROOT, encoding: "utf8" });
} catch (e) {
  flagCode = e.status;
  flagErr = e.stderr || "";
  flagOut = e.stdout || "";
}
chk("unknown flag exit 2 + stderr names it", flagCode === 2 && flagErr.includes("--nope=1") && flagOut.trim() === "", "code=" + flagCode + " err=" + flagErr);

let helpCode = 0, helpOut = "";
try {
  helpOut = execFileSync(process.execPath, [SCRIPT, "--help"], { cwd: ROOT, encoding: "utf8" });
} catch (e) {
  helpCode = e.status;
}
chk("--help exit 0 + usage line", helpCode === 0 && helpOut.includes("--verdict=KIND"), "code=" + helpCode);

// (11) read-only: the fixture is untouched by every op above
chk("fixture bytes unchanged (read-only)", fs.readFileSync(FIX, "utf8") === FIXBEFORE, "fixture mutated");

if (failed) {
  console.log("SMOKE intercept_sweep: " + failed + " check(s) FAILED");
  process.exit(1);
}
console.log("SMOKE intercept_sweep: all checks passed");
