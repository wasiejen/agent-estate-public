// block_transfer.smoke.mjs — TODO #137 unit 5c: the v2 block_transfer plugin
// behavior smoke. bun, MOCK ctx — no opencode process; fixtures in the scratchpad
// (NEVER the live trees). Pins the MAIN twin's CURRENT v1 behavior BYTE-EXACT:
// the mode guard (no default), every mode's happy-path feedback line (the opLine
// + assemblyFeedback formats, incl. the WRITE `old A..B -> new C..D, file now
// N line(s)` group), the teaching-error taxonomy (not-found + Closest lines
// hint, non-unique + count + first-3 matches, ref-out-of-range, the PEEK window
// teaching), the ALL-DIGIT line-number ref rule, the COPY/APPEND three-form
// rejections (incl. the empty-list and the APPEND/COPY bare-call form lesson),
// the buffer semantics (COPY replaces, APPEND appends, PASTE/REPLACE preserve,
// failed ops leave NO buffer behind, last_write auto-store, last_move_source,
// CLEAR), the same-file MOVE-with-shift (target above/below/INSIDE), the
// MOVE dst-checks-before-cut order, the WRITE multi-region REJECT + overlap
// REJECT + never-creates rule, and the EOL-detection/EOF-index hardening
// (CRLF round-trips, no spurious blank lines). The sandbox twin covers the
// roots matrix — not re-pinned here.
// Run: bun run block_transfer.smoke.mjs (this dir). Final line `SMOKE: ALL PASS`.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRATCH = "home/AppData/Local/Temp/opencode/block-transfer-smoke-v2";
// The repo root this suite lives in (`.opencode/plugins/tests` -> up 3). Resolved
// from the file so the suite runs in whatever checkout owns the tests dir — the
// old absolute archived-clone path no longer exists on this machine (TODO #156,
// 2026-10-26).
const CLONE_ROOT = path.join(import.meta.dirname, "..", "..", "..");
const PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "block_transfer.ts");
const WS = path.join(SCRATCH, "work"); // the mock workspace (ctx.location.directory)

let failures = 0;
function chk(label, ok, detail = "") {
  if (ok) console.log(`PASS  ${label}`);
  else { failures++; console.log(`FAIL  ${label}${detail ? "  [" + detail + "]" : ""}`); }
}

rmSync(SCRATCH, { recursive: true, force: true });
mkdirSync(WS, { recursive: true });
mkdirSync(path.join(WS, "sub"), { recursive: true });
const W = (rel) => path.join(WS, rel);
const write = (rel, content) => writeFileSync(W(rel), content, "utf-8");
const readW = (rel) => readFileSync(W(rel), "utf-8");

// ------------------------------------------------------------------ loader shape + registration

const TOOLS = [];
let DISPOSED = 0;
const mod = await import(pathToFileURL(PLUGIN).href);
const plugin = mod.default;
chk("(L0) default export: plugin object {id, setup}",
  plugin != null && typeof plugin === "object" && plugin.id === "block_transfer" && typeof plugin.setup === "function");
const cleanup = await plugin.setup({
  location: { directory: WS },
  tool: {
    transform: async (cb) => {
      const editor = { list: () => [], get: () => undefined, namespace: () => {}, add: (t) => TOOLS.push(t), update: () => {}, remove: () => {} };
      cb(editor);
      return { dispose: async () => { DISPOSED++; } };
    },
    hook: async () => ({ dispose: async () => {} }),
  },
});
chk("(L1) setup adds exactly ONE tool named block_transfer", TOOLS.length === 1 && TOOLS[0].name === "block_transfer");
const t = TOOLS[0];
chk("(L2) tool surface: input required=[mode] + 12 properties + the mode enum; output {type:'string'}",
  t.input?.type === "object" && JSON.stringify(t.input.required) === '["mode"]' && Object.keys(t.input.properties).length === 12
  && JSON.stringify(t.input.properties.mode.enum) === '["MOVE","COPY","APPEND","CUT","PASTE","REPLACE","WRITE","PEEK","MAP","DELETE","CLEAR"]'
  && t.output?.type === "string");
chk("(L3) description carried: WHEN/MODES/RETURN LINES/BUFFERS/EDGE sections present",
  [t.description.startsWith("Move, copy, cut, paste, delete, or clear multi-line blocks"),
   t.description.includes("WHEN-NOT — a small exact string replacement inside one file"),
   t.description.includes("'old A..B -> new C..D, file now K line(s)'"),
   t.description.includes("last_move_source"), t.description.includes("EDGE — a non-unique anchor")].every(Boolean));
const out = async (args) => (await t.execute(args, {})).output;

// ------------------------------------------------------------------ fixtures

write("a.txt", "AAA start\nline1\nline2\nZZZ end\ntail"); // 5 lines, LF
write("sub/b.txt", "BBB start\nx1\nx2\nYYY end");
write("crlf.txt", "C1\r\nC2\r\nC3\r\n"); // CRLF, trailing newline
write("tn.txt", "T1\nT2\n"); // trailing newline, LF
write("mv.txt", "HEAD\nB1\nB2\nTAIL1\nTAIL2\nTAIL3"); // same-file MOVE target (6 lines)

// ------------------------------------------------------------------ mode guard

chk("(M1) omitted mode -> the no-default teaching error",
  ((o) => o.startsWith("Error: 'mode' is required — no default") && o.includes("Expected one of: MOVE, COPY, APPEND, CUT, PASTE, REPLACE, WRITE, PEEK, MAP, DELETE, CLEAR."))(await out({})));
chk("(M2) unknown mode echoes the value AS GIVEN",
  (await out({ mode: "Frob" })) === "Error: unknown mode 'Frob'. Expected one of: MOVE, COPY, APPEND, CUT, PASTE, REPLACE, WRITE, PEEK, MAP, DELETE, CLEAR.");
chk("(M3) mode case normalizes (lowercase 'copy' runs COPY)",
  (await out({ mode: "copy", text: "Z1", bufferName: "mg" })).startsWith("Copied 1 line from text into buffer 'mg'"));

// ------------------------------------------------------------------ COPY/APPEND forms + buffer

{
  const o = await out({ mode: "COPY", srcFile: "a.txt", startMarker: "line1", endMarker: "ZZZ end" });
  chk("(C1) COPY single-ref pair — the assemblyFeedback line byte-exact",
    o === "Copied 3 lines from 'a.txt' into buffer 'default' (lines 2..4, first: 'line1') - buffer: 3 lines.", o);
  const o2 = await out({ mode: "COPY", srcFile: "a.txt", refs: ["AAA start", 5, "1"], bufferName: "cl" });
  chk("(C2) COPY refs list — selected line numbers as the group; digit-string + number refs both line numbers",
    o2 === "Copied 3 lines from 'a.txt' into buffer 'cl' (lines 1, 5, 1, first: 'AAA start') - buffer: 3 lines.", o2);
  const o3 = await out({ mode: "COPY", text: "L1\nL2\n", bufferName: "cw" });
  chk("(C3) COPY text form — own-line range; trailing newline adds no blank line",
    o3 === "Copied 2 lines from text into buffer 'cw' (lines 1..2, first: 'L1') - buffer: 2 lines.", o3);
  const o4 = await out({ mode: "APPEND", text: "L3\n", bufferName: "cw" });
  chk("(C4) APPEND appends (creates if absent); buffer count AFTER the op",
    o4 === "Appended 1 line from text to buffer 'cw' (lines 1..1, first: 'L3') - buffer: 3 lines.", o4);
  const o5 = await out({ mode: "COPY", text: "O1", bufferName: "cw" });
  chk("(C5) COPY REPLACES (never appends)",
    o5 === "Copied 1 line from text into buffer 'cw' (lines 1..1, first: 'O1') - buffer: 1 line.", o5);
}

// ------------------------------------------------------------------ teaching errors

{
  const o = await out({ mode: "COPY", srcFile: "a.txt", startMarker: "tail", endMarker: "AAA start", bufferName: "e1" });
  chk("(E1) end-before-start — the teaching error carrying the file reference",
    o === "Error: End marker 'AAA start' not found after start marker in a.txt.", o);
  write("dup.txt", "X1\nX2\nX3\nX4\nX5\ndup\nend2");
  const o2 = await out({ mode: "COPY", srcFile: "dup.txt", startMarker: "X", endMarker: "X1" });
  chk("(E2) non-unique anchor — count + FIRST 3 match line numbers, ' …' when more",
    o2 === "Error: Start marker 'X' is not unique in dup.txt (5 matches: lines 1, 2, 3 …).", o2);
  const o3 = await out({ mode: "COPY", srcFile: "a.txt", startMarker: "AAAa", endMarker: "tail", bufferName: "e2" });
  chk("(E3) not-found — Closest lines hint (longest-common-prefix candidates)",
    o3 === "Error: Start marker 'AAAa' not found in a.txt. Closest lines: 1: 'AAA start'", o3);
  const o4 = await out({ mode: "COPY", srcFile: "a.txt", startMarker: "   ", endMarker: "tail", bufferName: "e3" });
  chk("(E4) all-whitespace anchor matches nothing — the base form (no hint)",
    o4 === "Error: Start marker '   ' not found in a.txt.", o4);
  const o5 = await out({ mode: "COPY", srcFile: "a.txt", startMarker: "99", endMarker: "tail", bufferName: "e4" });
  chk("(E5) line-number ref beyond the count — the ref-out-of-range error with the count",
    o5 === "Error: line 99 is out of range in a.txt (the file has 5 lines).", o5);
  const o6 = await out({ mode: "COPY", srcFile: "a.txt", startMarker: "0", endMarker: "tail", bufferName: "e5" });
  chk("(E6) \"0\" IS present + ALL-DIGIT -> 0 fails the 1-based check, not a silent skip",
    o6 === "Error: Start marker 0 is not a 1-based line number in a.txt.", o6);
  const o7 = await out({ mode: "COPY", text: "T", refs: ["X"], bufferName: "e6" });
  chk("(E7) text+refs form clash",
    o7 === "Error: the 'text' form takes the input alone (no 'refs', no markers).", o7);
  const o8 = await out({ mode: "COPY", srcFile: "a.txt", refs: ["X"], startMarker: "X", bufferName: "e7" });
  chk("(E8) refs+markers form clash",
    o8 === "Error: the 'refs' list takes the input alone (no markers).", o8);
  const o9 = await out({ mode: "COPY", srcFile: "a.txt", refs: [], bufferName: "e8" });
  chk("(E9) empty refs list is a rejected form",
    o9 === "Error: the 'refs' list is empty (give at least one ref).", o9);
  const o10 = await out({ mode: "COPY", refs: ["X"], bufferName: "e9" });
  chk("(E10) refs form without srcFile",
    o10 === "Error: 'srcFile' is required for the 'refs' form of COPY mode.", o10);
  const o11 = await out({ mode: "COPY", srcFile: "gone.txt", startMarker: "X", endMarker: "Y", bufferName: "e10" });
  chk("(E11) missing src file",
    o11 === "Error: Source file 'gone.txt' not found.", o11);
  const o12 = await out({ mode: "COPY", bufferName: "e11" });
  chk("(E12) COPY bare call teaches the three input forms",
    o12 === "Error: COPY needs one input form: a 'refs' list, 'startMarker'+'endMarker' (with srcFile), or 'text'.", o12);
  const o13 = await out({ mode: "APPEND", srcFile: "a.txt", bufferName: "e12" });
  chk("(E13) partial markers -> the required-trio error",
    o13 === "Error: 'srcFile', 'startMarker', and 'endMarker' are required for mode APPEND.", o13);
  const pk = await out({ mode: "PEEK", bufferName: "default" });
  chk("(E14) a failed COPY left NO buffer change — 'default' still the 3 lines from C1",
    pk === "Peeked buffer 'default': 3 lines — head: 'line1', 'line2', 'ZZZ end' ... tail: 'line1', 'line2', 'ZZZ end'", pk);
  const o14 = await out({ mode: "COPY", srcFile: "dup.txt", startMarker: "dup", endMarker: "end2" });
  chk("(E15) bufferName default still 'default' on re-pin (dup 2 lines copied into default)",
    o14 === "Copied 2 lines from 'dup.txt' into buffer 'default' (lines 6..7, first: 'dup') - buffer: 2 lines.", o14);
}

// ------------------------------------------------------------------ CLEAR / PEEK / MAP

{
  const o = await out({ mode: "CLEAR", bufferName: "gone" });
  chk("(B1) CLEAR absent buffer is legal (buffer op: 0 lines)",
    o === "Cleared buffer 'gone' - buffer: 0 lines.", o);
  const o2 = await out({ mode: "PEEK", bufferName: "gone" });
  chk("(B2) empty-buffer error (verbatim, probe-pinned form)",
    o2 === "Error: Clipboard buffer 'gone' is empty. Perform a COPY or CUT first.", o2);
  await out({ mode: "COPY", text: "N1\n\nN2\nN3\nN4\n\nN5\n", bufferName: "pm" }); // 7 lines, blanks
  const pk = await out({ mode: "PEEK", bufferName: "pm" });
  chk("(B3) PEEK default — count + 3 head + 3 tail, BLANK lines skipped when picking",
    pk === "Peeked buffer 'pm': 7 lines — head: 'N1', 'N2', 'N3' ... tail: 'N3', 'N4', 'N5'", pk);
  const pk2 = await out({ mode: "PEEK", bufferName: "pm", from: "2", count: "3" });
  chk("(B4) PEEK window — digit-strings ride the ALL-DIGIT rule",
    pk2 === "Peeked buffer 'pm': lines 2..4 of 7 — '', 'N2', 'N3'", pk2);
  const pk3 = await out({ mode: "PEEK", bufferName: "pm", from: "1" });
  chk("(B5) from WITHOUT count",
    pk3 === "Error: 'from' and 'count' must be given together.", pk3);
  const pk4 = await out({ mode: "PEEK", bufferName: "pm", from: "9", count: "3" });
  chk("(B6) window from beyond the buffer — the buffer out-of-range form",
    pk4 === "Error: line 9 is out of range in buffer 'pm' (the buffer has 7 lines).", pk4);
  const pk5 = await out({ mode: "PEEK", bufferName: "pm", from: "1.5", count: "3" });
  chk("(B7) non-numeric window from — the teaching error quoting AS GIVEN",
    pk5 === "Error: from 1.5 is not a 1-based line number in buffer 'pm'.", pk5);
  const big = "W1\n" + Array.from({ length: 29 }, (_, i) => `W${i + 2}`).join("\n") + "\n";
  await out({ mode: "COPY", text: big, bufferName: "win" });
  const pk6 = await out({ mode: "PEEK", bufferName: "win", from: "1", count: "30" });
  chk("(B8) window count CAPPED at 25", pk6.split(" — ")[1].split(", ").length === 25 && pk6.startsWith("Peeked buffer 'win': lines 1..25 of 30"), pk6.slice(0, 60));
  await out({ mode: "COPY", text: "# H1\nnot a heading\n#   spaced\n" + "x".repeat(250) + "\n## H2   \n   ## indented\n", bufferName: "mp" });
  const mp = await out({ mode: "MAP", bufferName: "mp" });
  chk("(B9) MAP — numbered verbatim echoes, headings ^#{1,6} at column 0 only, 200-char cap + '…'",
    mp === "Mapped buffer 'mp': 6 lines — head: 1: '# H1', 2: 'not a heading', 3: '#   spaced' ... tail: 4: '" + "x".repeat(200) + "…', 5: '## H2   ', 6: '   ## indented' — headings: 1: '# H1', 3: '#   spaced', 5: '## H2   '", mp);
  await out({ mode: "COPY", text: "S1\nS2\nS3\nS4\nS5", bufferName: "sm" });
  const mp2 = await out({ mode: "MAP", bufferName: "sm" });
  chk("(B10) MAP small buffer — tail NEVER overlaps the head (only lines beyond it)",
    mp2 === "Mapped buffer 'sm': 5 lines — head: 1: 'S1', 2: 'S2', 3: 'S3' ... tail: 4: 'S4', 5: 'S5' — headings: (none)", mp2);
}

// ------------------------------------------------------------------ CUT / DELETE

{
  write("cut.txt", "K1\nK2\nCUTME1\nKEEP\nCUTME2\nEND");
  const o = await out({ mode: "CUT", srcFile: "cut.txt", startMarker: "CUTME1", endMarker: "CUTME2", bufferName: "ct" });
  chk("(X1) CUT line byte-exact",
    o === "Cut 3 lines from 'cut.txt' into buffer 'ct' (lines 3..5, first: 'CUTME1') - buffer: 3 lines.", o);
  chk("(X2) CUT removed ONLY the block's own lines (the KEEP line sits INSIDE the block here)",
    readW("cut.txt") === "K1\nK2\nEND", readW("cut.txt"));
  const o2 = await out({ mode: "DELETE", srcFile: "cut.txt", startMarker: "END", endMarker: "END" });
  chk("(X3) DELETE line — no buffer tail",
    o2 === "Deleted 1 line from 'cut.txt' (lines 3..3, first: 'END').", o2);
  chk("(X4) DELETE cut the source", readW("cut.txt") === "K1\nK2", readW("cut.txt"));
  const o3 = await out({ mode: "CUT", srcFile: "gone.txt", startMarker: "A", endMarker: "B", bufferName: "ct" });
  chk("(X5) CUT missing source — teaching, no write",
    o3 === "Error: Source file 'gone.txt' not found.", o3);
}

// ------------------------------------------------------------------ PASTE

{
  write("p1.txt", "P1\nP2\n"); // trailing newline
  const o = await out({ mode: "PASTE", bufferName: "ct", dstFile: "p1.txt" });
  chk("(P1) PASTE at EOF — suffix before the tail; inserts BEFORE the blank tail",
    o === "Pasted 3 lines from buffer 'ct' into 'p1.txt' (lines 1..3, first: 'CUTME1') (at EOF) - buffer: 3 lines.", o);
  chk("(P2) no spurious blank line (hardening item 3)",
    readW("p1.txt") === "P1\nP2\nCUTME1\nKEEP\nCUTME2\n", readW("p1.txt"));
  const o2 = await out({ mode: "PASTE", bufferName: "ct", dstFile: "deep/n.txt" });
  chk("(P3) PASTE into a NEW file in a NEW dir (mkdir leg) — insert at 0, no leading blank",
    o2 === "Pasted 3 lines from buffer 'ct' into 'deep/n.txt' (lines 1..3, first: 'CUTME1') (at EOF) - buffer: 3 lines.", o2);
  chk("(P4) new file content = the block, NO trailing newline (v1 join semantics)",
    readW("deep/n.txt") === "CUTME1\nKEEP\nCUTME2", readW("deep/n.txt"));
  const pErr = await out({ mode: "PASTE", bufferName: "ct", dstFile: "deep2/n.txt", targetMarker: 1 });
  chk("(P5b) PASTE into a NON-EXISTENT dst WITH a numeric target -> out-of-range (0 lines), file NOT created",
    pErr === "Error: line 1 is out of range in deep2/n.txt (the file has 0 lines)." && !existsSync(path.join(WS, "deep2", "n.txt")), pErr);
  const o3 = await out({ mode: "PASTE", dstFile: "p1.txt", bufferName: "emptY" });
  chk("(P5) PASTE from an empty buffer",
    o3 === "Error: Clipboard buffer 'emptY' is empty. Perform a COPY or CUT first.", o3);
  const o4 = await out({ mode: "PASTE", bufferName: "ct" });
  chk("(P6) PASTE without dstFile",
    o4 === "Error: 'dstFile' is required for PASTE mode.", o4);
  write("crlfP.txt", "Q1\r\nQ2\r\n");
  await out({ mode: "PASTE", bufferName: "ct", dstFile: "crlfP.txt" });
  chk("(P7) CRLF destination keeps CRLF; inserted lines get the '\\r' (hardening item 4)",
    readW("crlfP.txt") === "Q1\r\nQ2\r\nCUTME1\r\nKEEP\r\nCUTME2\r\n", JSON.stringify(readW("crlfP.txt")));
}

// ------------------------------------------------------------------ REPLACE

{
  write("r.txt", "R1\nBAD A\nBAD B\nBAD C\nR5\nR6");
  await out({ mode: "COPY", text: "NEW1\nNEW2", bufferName: "rp" });
  const o = await out({ mode: "REPLACE", dstFile: "r.txt", startMarker: "BAD A", endMarker: "BAD C", bufferName: "rp" });
  chk("(R1) REPLACE line — old span -> new span + file now + buffer preserved",
    o === "Replaced 3 lines in 'r.txt' with buffer 'rp' (old 2..4 -> new 2..3, file now 5 lines, first: 'NEW1') - buffer: 2 lines.", o);
  chk("(R2) REPLACE swapped the span", readW("r.txt") === "R1\nNEW1\nNEW2\nR5\nR6", readW("r.txt"));
  const pk = await out({ mode: "PEEK", bufferName: "rp" });
  chk("(R3) REPLACE PRESERVES the buffer", pk.startsWith("Peeked buffer 'rp': 2 lines"), pk);
  const o2 = await out({ mode: "REPLACE", dstFile: "r.txt", startMarker: "R6", endMarker: "R1", bufferName: "rp" });
  chk("(R4) REPLACE start-after-end teaching",
    o2 === "Error: Start marker 'R6' is after end marker 'R1' in r.txt.", o2);
  const o3 = await out({ mode: "REPLACE", dstFile: "r.txt", startMarker: "R1", bufferName: "rp" });
  chk("(R5) REPLACE without endMarker",
    o3 === "Error: 'endMarker' is required for REPLACE mode.", o3);
  const o4 = await out({ mode: "REPLACE", dstFile: "nope.txt", startMarker: "A", endMarker: "B", bufferName: "rp" });
  chk("(R6) REPLACE never creates a file",
    o4 === "Error: File 'nope.txt' not found.", o4);
  const o5 = await out({ mode: "REPLACE", dstFile: "r.txt", startMarker: "R1", endMarker: "R1", bufferName: "noBuffer" });
  chk("(R7) REPLACE with an empty buffer — checked before any write",
    o5 === "Error: Clipboard buffer 'noBuffer' is empty. Perform a COPY or CUT first.", o5);
  chk("(R8) the rejected REPLACE left the file untouched",
    readW("r.txt") === "R1\nNEW1\nNEW2\nR5\nR6", readW("r.txt"));
}

// ------------------------------------------------------------------ WRITE

{
  write("w.txt", "W1\nW2\nW3\nW4\nW5");
  const o = await out({ mode: "WRITE", dstFile: "w.txt", startMarker: "W2", endMarker: "W4", text: "NEW1\nNEW2" });
  chk("(W1) WRITE single span — the hardening-7 group (old/new/file now), NO buffer tail",
    o === "Wrote 2 lines to 'w.txt' (old 2..4 -> new 2..3, file now 4 lines, first: 'NEW1').", o);
  chk("(W2) WRITE applied the span", readW("w.txt") === "W1\nNEW1\nNEW2\nW5", readW("w.txt"));
  const pk = await out({ mode: "PEEK", bufferName: "last_write" });
  chk("(W3) last_write auto-store (silent, explicit arg NOT diverted)",
    pk === "Peeked buffer 'last_write': 2 lines — head: 'NEW1', 'NEW2' ... tail: 'NEW1', 'NEW2'", pk);
  const o2 = await out({ mode: "WRITE", dstFile: "w.txt", regions: [{ start: "W1", end: "W1" }], text: "TOP" });
  chk("(W4) one-region list form is FINE",
    o2 === "Wrote 1 line to 'w.txt' (old 1..1 -> new 1..1, file now 4 lines, first: 'TOP').", o2);
  const o3 = await out({ mode: "WRITE", dstFile: "w.txt", regions: [{ start: "W5", end: "W5" }, { start: "TOP", end: "TOP" }], text: "FAN" });
  chk("(W5) multi-region + one text -> REJECTED (no silent fan-out)",
    o3 === "Error: the 'regions' list has 2 regions but WRITE takes ONE 'text' (it would fan the same text into every region) — use exactly one region in the list, or one WRITE call per region.", o3);
  chk("(W6) the REJECT wrote NOTHING", readW("w.txt") === "TOP\nNEW1\nNEW2\nW5", readW("w.txt"));
  const o4 = await out({ mode: "WRITE", dstFile: "w.txt", regions: [{ start: "1", end: "3" }, { start: "3", end: "4" }], text: "FAN" });
  chk("(W7) overlapping spans rejected WITH the actual line numbers (before the fan-out guard)",
    o4 === "Error: overlapping spans (lines 1..3 and 3..4) in w.txt.", o4);
  const o5 = await out({ mode: "WRITE", dstFile: "w.txt", startMarker: "TOP", regions: [{ start: "1", end: "1" }], text: "X" });
  chk("(W8) regions + single markers clash",
    o5 === "Error: the 'regions' list takes the span alone (no single markers).", o5);
  const o6 = await out({ mode: "WRITE", dstFile: "w.txt", regions: [], text: "X" });
  chk("(W9) empty regions list rejected",
    o6 === "Error: the 'regions' list is empty (give at least one region).", o6);
  const o7 = await out({ mode: "WRITE", dstFile: "w.txt", text: "X" });
  chk("(W10) WRITE without markers",
    o7 === "Error: 'startMarker' and 'endMarker' are both required for WRITE mode.", o7);
  const o8 = await out({ mode: "WRITE", dstFile: "gone/deep/x.txt", startMarker: "A", endMarker: "B", text: "X" });
  chk("(W11) WRITE NEVER creates a file — absent dst = the EMPTY state -> not-found",
    o8 === "Error: Start marker 'A' not found in gone/deep/x.txt.", o8);
  chk("(W12) no dir/file created by the rejected WRITE", !existsSync(path.join(WS, "gone")));
  const o9 = await out({ mode: "WRITE", dstFile: "w.txt", startMarker: "TOP", endMarker: "TOP", text: "" });
  chk("(W13) EMPTY-text WRITE — 'new (empty)'",
    o9 === "Wrote 0 lines to 'w.txt' (old 1..1 -> new (empty), file now 3 lines, first: '').", o9);
  chk("(W14) empty-text store in last_write is the EMPTY buffer",
    (await out({ mode: "PEEK", bufferName: "last_write" })) === "Error: Clipboard buffer 'last_write' is empty. Perform a COPY or CUT first.");
  write("cw.txt", "D1\r\nD2\r\nD3\r\n");
  await out({ mode: "WRITE", dstFile: "cw.txt", startMarker: "D2", endMarker: "D2", text: "N1\nN2" });
  chk("(W15) CRLF file keeps CRLF through WRITE",
    readW("cw.txt") === "D1\r\nN1\r\nN2\r\nD3\r\n", JSON.stringify(readW("cw.txt")));
}

// ------------------------------------------------------------------ MOVE

{
  write("m_src.txt", "M1\nMOVE A\nMOVE B\nM4");
  write("m_dst.txt", "D1\nD2\n");
  const o = await out({ mode: "MOVE", srcFile: "m_src.txt", startMarker: "MOVE A", endMarker: "MOVE B", dstFile: "m_dst.txt", targetMarker: "D1" });
  chk("(V1) MOVE cross-file — insertion suffix, no buffer tail",
    o === "Moved 2 lines from 'm_src.txt' to 'm_dst.txt' (lines 2..3, first: 'MOVE A') (inserted after line 1 in 'm_dst.txt').", o);
  chk("(V2) source cut + destination inserted",
    readW("m_src.txt") === "M1\nM4" && readW("m_dst.txt") === "D1\nMOVE A\nMOVE B\nD2\n", readW("m_src.txt") + "|" + readW("m_dst.txt"));
  const pk = await out({ mode: "PEEK", bufferName: "last_move_source" });
  chk("(V3) last_move_source recovery buffer stashed BEFORE the cut",
    pk === "Peeked buffer 'last_move_source': 2 lines — head: 'MOVE A', 'MOVE B' ... tail: 'MOVE A', 'MOVE B'", pk);
  const before = readW("mv.txt");
  const o2 = await out({ mode: "MOVE", srcFile: "mv.txt", startMarker: "B1", endMarker: "B2", dstFile: "mv.txt", targetMarker: "TAIL2" });
  chk("(V4) same-file MOVE-with-shift — target BELOW the block: the FINAL line number",
    o2 === "Moved 2 lines from 'mv.txt' to 'mv.txt' (lines 2..3, first: 'B1') (inserted after line 3 in 'mv.txt').", o2);
  chk("(V5) block moved intact", readW("mv.txt") === "HEAD\nTAIL1\nTAIL2\nB1\nB2\nTAIL3", readW("mv.txt"));
  writeFileSync(W("mv.txt"), before, "utf-8");
  const o3 = await out({ mode: "MOVE", srcFile: "mv.txt", startMarker: "B1", endMarker: "B2", dstFile: "mv.txt", targetMarker: "HEAD" });
  chk("(V6) same-file target ABOVE the block — pre-call number stays the splice index",
    o3 === "Moved 2 lines from 'mv.txt' to 'mv.txt' (lines 2..3, first: 'B1') (inserted after line 1 in 'mv.txt').", o3);
  chk("(V7) block intact after an above-target shift", readW("mv.txt") === "HEAD\nB1\nB2\nTAIL1\nTAIL2\nTAIL3", readW("mv.txt"));
  writeFileSync(W("mv.txt"), before, "utf-8");
  const o4 = await out({ mode: "MOVE", srcFile: "mv.txt", startMarker: "B1", endMarker: "B2", dstFile: "mv.txt", targetMarker: "B2" });
  chk("(V8) same-file target INSIDE the block -> REJECTED",
    o4 === "Error: same-file MOVE target 'B2' (line 3) is inside the moved block (lines 2..3) — pick a target OUTSIDE the block (move-with-shift keeps the block intact).", o4);
  chk("(V9) the REJECT left the file intact", readW("mv.txt") === before, readW("mv.txt"));
  const o5 = await out({ mode: "MOVE", srcFile: "mv.txt", startMarker: "HEAD", endMarker: "TAIL3", dstFile: "m_dst.txt", targetMarker: "999" });
  chk("(V10) MOVE target out-of-range in the dst — teaching",
    o5 === "Error: line 999 is out of range in m_dst.txt (the file has 4 lines).", o5);
  chk("(V11) dst-check ran BEFORE the cut — source AND dst untouched",
    readW("mv.txt") === before && readW("m_dst.txt") === "D1\nMOVE A\nMOVE B\nD2\n", readW("m_dst.txt"));
  const o6 = await out({ mode: "MOVE", srcFile: "mv.txt", startMarker: "HEAD", endMarker: "TAIL3" });
  chk("(V12) MOVE without dstFile — BEFORE the source is read/cut",
    o6 === "Error: 'dstFile' is required for MOVE mode.", o6);
  chk("(V13) source untouched by the missing-dst error", readW("mv.txt") === before, readW("mv.txt"));
  write("eof.txt", "E1\nE2\n");
  const o7 = await out({ mode: "MOVE", srcFile: "mv.txt", startMarker: "HEAD", endMarker: "TAIL1", dstFile: "eof.txt" });
  chk("(V14) MOVE at EOF (no targetMarker) — srcFile and dstFile spelled differently, both exist",
    o7 === "Moved 4 lines from 'mv.txt' to 'eof.txt' (lines 1..4, first: 'HEAD') (at EOF).", o7);
  const o8 = await out({ mode: "MOVE", srcFile: "m_src.txt", startMarker: "M1", endMarker: "M1", dstFile: "gone/moved.txt" });
  chk("(V15) MOVE into a NON-EXISTENT dst (new dir) — allowed, creates it",
    o8 === "Moved 1 line from 'm_src.txt' to 'gone/moved.txt' (lines 1..1, first: 'M1') (at EOF).", o8);
  chk("(V16) dst content (no trailing newline — new file join)", readW("gone/moved.txt") === "M1", readW("gone/moved.txt"));
}

// ------------------------------------------------------------------ teardown

{
  const d0 = DISPOSED;
  cleanup();
  chk("(I1) teardown disposes the registration (exactly ONE dispose)", DISPOSED === d0 + 1, `d0=${d0} after=${DISPOSED}`);
}

console.log(`SMOKE: ${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
