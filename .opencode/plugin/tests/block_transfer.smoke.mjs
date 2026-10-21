// block_transfer.smoke.mjs — the block_transfer tool() translation
// (scratchpad origin: bt_smoke.mjs, iter-4 verification; moved per the
// 2026-09-15_smoke-harness-home proposal). Functional round-trips run in a
// scratchpad sandbox subdir.
// Run: node .opencode/plugin/tests/block_transfer.smoke.mjs (plain node, exit 0 iff green).
import fs from "node:fs";
import path from "node:path";
import { loadRepo, freshSandbox, makeChecker } from "./_smoke_base.mjs";

const dir = freshSandbox("block_transfer");
const { chk, finish } = makeChecker("BLOCK_TRANSFER_SMOKE");

const mod = await loadRepo(".opencode/tools/block_transfer.ts");
const t = mod.default;
chk("default export = tool() result (object with description string)", t != null && typeof t === "object" && typeof t.description === "string");
chk("no stale 'name'/'parameters' keys", t && !("name" in t) && !("parameters" in t));
chk("execute is async fn", typeof t.execute === "function" && t.execute.constructor.name === "AsyncFunction");
const args = t.args;
chk("mode is required (rejects undefined)", args && args.mode && !args.mode.safeParse(undefined).success);
chk("mode accepts MOVE", args.mode.safeParse("MOVE").success);
chk("mode rejects bogus value", !args.mode.safeParse("BOGUS").success);
for (const k of ["srcFile", "dstFile", "startMarker", "endMarker", "targetMarker", "bufferName"]) {
  chk(`args.${k} is optional (accepts undefined)`, args[k] && args[k].safeParse(undefined).success);
}

// Functional smoke in the sandbox
const src = path.join(dir, "bt_src.txt");
const dst = path.join(dir, "bt_dst.txt");
fs.writeFileSync(src, "AAA start\nline1\nline2\nZZZ end\ntail\n");
fs.writeFileSync(dst, "head\n");
const ctx = { directory: dir };
const r1 = await t.execute({ mode: "COPY", srcFile: src, startMarker: "AAA", endMarker: "ZZZ", bufferName: "b4" }, ctx);
const r2 = await t.execute({ mode: "PASTE", dstFile: dst, bufferName: "b4", targetMarker: "head" }, ctx);
chk("COPY reported 4 lines (markers inclusive)", /Copied 4 lines/.test(r1));
chk("PASTE reported 4 lines", /Pasted 4 lines/.test(r2));
chk("src untouched by COPY", fs.readFileSync(src, "utf-8") === "AAA start\nline1\nline2\nZZZ end\ntail\n");
chk("dst gained block after target marker", fs.readFileSync(dst, "utf-8") === "head\nAAA start\nline1\nline2\nZZZ end\n");
fs.writeFileSync(dst, "only-head");
const r3 = await t.execute({ mode: "MOVE", srcFile: src, startMarker: "AAA", endMarker: "ZZZ", dstFile: dst }, ctx);
chk("MOVE reported 4 lines", /Moved 4 lines/.test(r3));
chk("src lost the block", fs.readFileSync(src, "utf-8") === "tail\n");
chk("dst gained block at EOF (no target marker)", fs.readFileSync(dst, "utf-8") === "only-head\nAAA start\nline1\nline2\nZZZ end");
const r4 = await t.execute({ mode: "PASTE", dstFile: dst, bufferName: "nope" }, ctx);
chk("PASTE from empty buffer returns error note", /empty/.test(r4));
// #57: MOVE with missing dstFile must error and leave the source byte-identical (no partial cut)
fs.writeFileSync(src, "AAA start\nline1\nline2\nZZZ end\ntail\n");
const r5 = await t.execute({ mode: "MOVE", srcFile: src, startMarker: "AAA", endMarker: "ZZZ" }, ctx);
chk("MOVE without dstFile returns the exact error string", r5 === "Error: 'dstFile' is required for MOVE mode.");
chk("MOVE without dstFile leaves source byte-identical", fs.readFileSync(src, "utf-8") === "AAA start\nline1\nline2\nZZZ end\ntail\n");
// ---- REPLACE (TODO #94): line-anchored span replacement from a buffer
// The content channel stays buffers-only — COPY fills the buffer first.
fs.writeFileSync(src, "AAA start\nline1\nline2\nZZZ end\ntail\n");
const rep = "bt_rep.txt"; // relative to dir — the return string embeds it verbatim
fs.writeFileSync(path.join(dir, rep), "head\nOLD one\nOLD two\nfoot");
await t.execute({ mode: "COPY", srcFile: src, startMarker: "line1", endMarker: "line2", bufferName: "repbuf" }, ctx);
const r6 = await t.execute({ mode: "REPLACE", dstFile: rep, startMarker: "OLD one", endMarker: "OLD two", bufferName: "repbuf" }, ctx);
chk("REPLACE happy path: exact Part F return string (hardening item 7: old->new span + the file's new line count) + the span replaced in place (byte-exact dst)", r6 === "Replaced 2 lines in 'bt_rep.txt' with buffer 'repbuf' (old 2..3 -> new 2..3, file now 4 lines, first: 'line1') - buffer: 2 lines." && fs.readFileSync(path.join(dir, rep), "utf-8") === "head\nline1\nline2\nfoot");
const r7 = await t.execute({ mode: "PASTE", dstFile: dst, bufferName: "repbuf" }, ctx);
chk("REPLACE preserved the buffer (a later PASTE reports 2 lines)", /Pasted 2 lines/.test(r7));
const r8 = await t.execute({ mode: "REPLACE", startMarker: "OLD one", endMarker: "OLD two", bufferName: "repbuf" }, ctx);
chk("REPLACE without dstFile returns the exact error string", r8 === "Error: 'dstFile' is required for REPLACE mode.");
const r9 = await t.execute({ mode: "REPLACE", dstFile: rep, endMarker: "OLD two", bufferName: "repbuf" }, ctx);
chk("REPLACE without startMarker returns the exact error string", r9 === "Error: 'startMarker' is required for REPLACE mode.");
const r10 = await t.execute({ mode: "REPLACE", dstFile: rep, startMarker: "NOPE", endMarker: "OLD two", bufferName: "repbuf" }, ctx);
chk("REPLACE with a missing anchor returns the exact not-found error", r10 === "Error: Start marker 'NOPE' not found in bt_rep.txt.");
const rep2 = "bt_rep2.txt";
fs.writeFileSync(path.join(dir, rep2), "head\nDUP a\nDUP b\nfoot");
const r11 = await t.execute({ mode: "REPLACE", dstFile: rep2, startMarker: "DUP", endMarker: "DUP b", bufferName: "repbuf" }, ctx);
chk("REPLACE with a non-unique start anchor returns the exact v2 teaching error (match count + first match lines)", r11 === "Error: Start marker 'DUP' is not unique in bt_rep2.txt (2 matches: lines 2, 3).");
const rep3 = "bt_rep3.txt";
fs.writeFileSync(path.join(dir, rep3), "head\nZZ endline\nAA startline\nfoot");
const r12 = await t.execute({ mode: "REPLACE", dstFile: rep3, startMarker: "AA startline", endMarker: "ZZ endline", bufferName: "repbuf" }, ctx);
chk("REPLACE with start after end returns the exact error", r12 === "Error: Start marker 'AA startline' is after end marker 'ZZ endline' in bt_rep3.txt.");
const rep4 = "bt_rep4.txt";
fs.writeFileSync(path.join(dir, rep4), "head\nONLY line\nfoot");
const r13 = await t.execute({ mode: "REPLACE", dstFile: rep4, startMarker: "ONLY line", endMarker: "ONLY line", bufferName: "repbuf" }, ctx);
chk("REPLACE single-line span (start == end): exact Part F return string (shrinking: old 2..2 -> new 2..3) + the one line became the 2-line buffer", r13 === "Replaced 1 line in 'bt_rep4.txt' with buffer 'repbuf' (old 2..2 -> new 2..3, file now 4 lines, first: 'line1') - buffer: 2 lines." && fs.readFileSync(path.join(dir, rep4), "utf-8") === "head\nline1\nline2\nfoot");

// ---- Part A: the unified anchor rule (2026-09-25_block_transfer-v2 Part A)
// resolveAnchor is exported and pure — the rule lives in ONE place (own pins).
const ra = mod.resolveAnchor;
chk("resolveAnchor is exported (pure fn)", typeof ra === "function");
chk("resolveAnchor: 1-based line number of the EXACT ONE prefix match", ra("one\nTWO line\nthree", "TWO") === 2);
chk("resolveAnchor: leading spaces/tabs on the line are trimmed before the prefix match", ra("\tTWO indented\nx", "TWO indented") === 1);
// re-labeled per plan25 (b): the anchor is trimmed before the match, so
// " TWO" now matches BOTH lines — the value (null) is unchanged, the
// reason is non-uniqueness (the assertion below still pins null).
chk("resolveAnchor: an anchor WITH leading whitespace is trimmed before the match (here: BOTH lines match -> null via non-unique)", ra("TWO x\n   TWO y", " TWO") === null);
chk("resolveAnchor: case-sensitive (no case fold)", ra("TWO line\nx", "two") === null && ra("TWO line\nx", "TWO") === 1);
chk("resolveAnchor: CRLF-tolerant (a trailing \\r on the line is ignored for matching)", ra("TWO cr\r\nrest", "TWO cr") === 1);
chk("resolveAnchor: a LONGER line still matches (the prefix — the remainder is irrelevant)", ra("TWO prefix and more\nx", "TWO") === 1);
chk("resolveAnchor: a mid-line substring does NOT match (the old COPY substring tolerance is gone)", ra("xx TWO mid\nx", "TWO") === null);
chk("resolveAnchor: zero matches -> null (not-found)", ra("a\nb", "nope") === null);
chk("resolveAnchor: two matches -> null (non-unique)", ra("TWO a\nTWO b", "TWO") === null);

// Part A pins — the teaching error taxonomy (one line each), via execute()
const errFile = "bt_err.txt";
fs.writeFileSync(path.join(dir, errFile), "head\nDUP one\nmid\nDUP two\nfoot");
const rA1 = await t.execute({ mode: "COPY", srcFile: errFile, startMarker: "NOPE", endMarker: "mid", bufferName: "errA" }, ctx);
chk("taxonomy not-found (the anchor quoted, with the file)", rA1 === "Error: Start marker 'NOPE' not found in bt_err.txt.");
const rA2 = await t.execute({ mode: "COPY", srcFile: errFile, startMarker: "DUP", endMarker: "mid", bufferName: "errA" }, ctx);
chk("taxonomy non-unique: start marker (the v2 teaching format — match count + first match lines)", rA2 === "Error: Start marker 'DUP' is not unique in bt_err.txt (2 matches: lines 2, 4).");
const rA3 = await t.execute({ mode: "COPY", srcFile: errFile, startMarker: "head", endMarker: "DUP", bufferName: "errA" }, ctx);
chk("taxonomy non-unique: end marker — the SAME one rule for every marker", rA3 === "Error: End marker 'DUP' is not unique in bt_err.txt (2 matches: lines 2, 4).");
const rA4 = await t.execute({ mode: "COPY", srcFile: errFile, startMarker: "mid", endMarker: "head", bufferName: "errA" }, ctx);
chk("extraction: an end resolved before the start -> the v2 teaching error carrying the file reference (probe 115 re-pin)", rA4 === "Error: End marker 'head' not found after start marker in bt_err.txt.");
fs.writeFileSync(dst, "head\nmid\nfoot");
const rA5 = await t.execute({ mode: "PASTE", dstFile: dst, bufferName: "repbuf", targetMarker: "NOPE" }, ctx);
chk("PASTE: an unresolvable targetMarker -> the not-found error (no silent EOF append), dst untouched", rA5 === `Error: Target marker 'NOPE' not found in ${dst}.` && fs.readFileSync(dst, "utf-8") === "head\nmid\nfoot");

// ---- Part B+C: line-number refs + assembly (2026-09-25_block_transfer-v2)
// Schema level: each ref arg is string | integer (type-disambiguated — no
// runtime string sniffing) + the new 'refs' list and 'text' forms.
chk("schema: mode accepts APPEND", args.mode.safeParse("APPEND").success);
for (const k of ["startMarker", "endMarker", "targetMarker"]) {
  chk(`schema: args.${k} accepts a marker string`, args[k].safeParse("AAA").success);
  chk(`schema: args.${k} accepts an integer line number`, args[k].safeParse(2).success);
  chk(`schema: args.${k} rejects a float`, !args[k].safeParse(2.5).success);
  chk(`schema: args.${k} rejects a bool`, !args[k].safeParse(true).success);
}
chk("schema: args.refs is optional (accepts undefined)", args.refs && args.refs.safeParse(undefined).success);
chk("schema: args.refs accepts a list of marker-or-number refs", args.refs.safeParse([2, "ZZZ"]).success);
chk("schema: args.refs rejects a float item", !args.refs.safeParse([2.5]).success);
chk("schema: args.refs rejects a bare string (a list is required)", !args.refs.safeParse("nope").success);
chk("schema: args.text is an optional string", args.text && args.text.safeParse(undefined).success && args.text.safeParse("x").success);
// ---- Part D+E schema (2026-09-25_block_transfer-v2 S3): the WRITE + PEEK
// modes + the 'regions' / 'from' / 'count' args
chk("schema: mode accepts WRITE", args.mode.safeParse("WRITE").success);
chk("schema: mode accepts PEEK", args.mode.safeParse("PEEK").success);
chk("schema: args.regions is an optional list of {start, end} refs", args.regions && args.regions.safeParse(undefined).success && args.regions.safeParse([{ start: 1, end: 2 }]).success && args.regions.safeParse([{ start: "AAA", end: "ZZZ" }]).success && args.regions.safeParse([1]).success === false && args.regions.safeParse([{ start: 1.5, end: 2 }]).success === false);
chk("schema: args.from / args.count are optional integers", args.from && args.from.safeParse(undefined).success && args.from.safeParse(3).success && args.from.safeParse(2.5).success === false && args.count && args.count.safeParse(undefined).success && args.count.safeParse(5).success && args.count.safeParse(true).success === false);

// B: number refs (1-based, absolute, PRE-call file state)
const numFile = "bt_num.txt"; // 5 lines: 1 "AAA start" ... 5 "tail"
fs.writeFileSync(path.join(dir, numFile), "AAA start\nline1\nline2\nZZZ end\ntail\n");
const rB1 = await t.execute({ mode: "COPY", srcFile: numFile, startMarker: 2, endMarker: 4, bufferName: "nb1" }, ctx);
chk("B: number refs (single form): exact Part F feedback line", rB1 === "Copied 3 lines from 'bt_num.txt' into buffer 'nb1' (lines 2..4, first: 'line1') - buffer: 3 lines.");
const nbDst = "bt_nb.txt";
fs.writeFileSync(path.join(dir, nbDst), "head");
await t.execute({ mode: "PASTE", dstFile: nbDst, bufferName: "nb1" }, ctx);
chk("B: the buffer from number refs holds exactly lines 2..4 (src untouched)", fs.readFileSync(path.join(dir, nbDst), "utf-8") === "head\nline1\nline2\nZZZ end" && fs.readFileSync(path.join(dir, numFile), "utf-8") === "AAA start\nline1\nline2\nZZZ end\ntail\n");
const rB2 = await t.execute({ mode: "PASTE", dstFile: nbDst, bufferName: "nb1", targetMarker: 1 }, ctx);
chk("B: number targetMarker inserts right after line 1 (Part F feedback — buffer range + echo + the insertion-point suffix + buffer count AFTER)", rB2 === "Pasted 3 lines from buffer 'nb1' into 'bt_nb.txt' (lines 1..3, first: 'line1') (inserted after line 1 in 'bt_nb.txt') - buffer: 3 lines." && fs.readFileSync(path.join(dir, nbDst), "utf-8") === "head\nline1\nline2\nZZZ end\nline1\nline2\nZZZ end");
const rB3 = await t.execute({ mode: "COPY", srcFile: numFile, startMarker: "AAA", endMarker: 4, bufferName: "nb2" }, ctx);
chk("B: mixed marker + number refs (1-based, absolute)", rB3 === "Copied 4 lines from 'bt_num.txt' into buffer 'nb2' (lines 1..4, first: 'AAA start') - buffer: 4 lines.");
const rB4 = await t.execute({ mode: "COPY", srcFile: numFile, startMarker: 9, endMarker: 4, bufferName: "nb3" }, ctx);
chk("B: ref-out-of-range on the start ref (the S1 error wired in, with the count)", rB4 === "Error: line 9 is out of range in bt_num.txt (the file has 5 lines).");
const rB5 = await t.execute({ mode: "COPY", srcFile: numFile, startMarker: 1, endMarker: 6, bufferName: "nb3" }, ctx);
chk("B: ref-out-of-range on the end ref", rB5 === "Error: line 6 is out of range in bt_num.txt (the file has 5 lines).");
fs.writeFileSync(path.join(dir, nbDst), "one\ntwo");
const rB6 = await t.execute({ mode: "PASTE", dstFile: nbDst, bufferName: "nb1", targetMarker: 99 }, ctx);
chk("B: ref-out-of-range on the targetMarker side", rB6 === "Error: line 99 is out of range in bt_nb.txt (the file has 2 lines).");
const rB7 = await t.execute({ mode: "DELETE", srcFile: numFile, startMarker: 2, endMarker: 3 }, ctx);
chk("B: number refs in DELETE (Part F feedback — resolved range + echo, block purged)", rB7 === "Deleted 2 lines from 'bt_num.txt' (lines 2..3, first: 'line1')." && fs.readFileSync(path.join(dir, numFile), "utf-8") === "AAA start\nZZZ end\ntail\n");
// number refs on the REPLACE side (the untouched op keeps its S1 feedback shape)
const repN = "bt_repnum.txt";
fs.writeFileSync(path.join(dir, repN), "head\nOLD one\nOLD two\nfoot");
await t.execute({ mode: "APPEND", text: "NEW", bufferName: "repN" }, ctx);
const rR1 = await t.execute({ mode: "REPLACE", dstFile: repN, startMarker: 2, endMarker: 3, bufferName: "repN" }, ctx);
chk("B: number refs in REPLACE (Part F feedback — old->new span, the length-changing shrink, + buffer count AFTER)", rR1 === "Replaced 2 lines in 'bt_repnum.txt' with buffer 'repN' (old 2..3 -> new 2..2, file now 3 lines, first: 'NEW') - buffer: 1 line." && fs.readFileSync(path.join(dir, repN), "utf-8") === "head\nNEW\nfoot");

// C: assembly (COPY-list / COPY-text / APPEND)
fs.writeFileSync(path.join(dir, numFile), "AAA start\nline1\nline2\nZZZ end\ntail\n"); // restore (DELETE above cut 2 lines)
const rC1 = await t.execute({ mode: "COPY", srcFile: numFile, refs: [2, "ZZZ", 5], bufferName: "lb" }, ctx);
chk("C: COPY-list (mixed marker + number refs): exact Part F feedback", rC1 === "Copied 3 lines from 'bt_num.txt' into buffer 'lb' (lines 2, 4, 5, first: 'line1') - buffer: 3 lines.");
const cDst = "bt_c.txt";
fs.writeFileSync(path.join(dir, cDst), "top");
await t.execute({ mode: "PASTE", dstFile: cDst, bufferName: "lb" }, ctx);
chk("C: COPY-list join is EXACTLY ONE \\n between sections (no blanks, no merge)", fs.readFileSync(path.join(dir, cDst), "utf-8") === "top\nline1\nZZZ end\ntail");
const rC2 = await t.execute({ mode: "COPY", srcFile: numFile, refs: [1, 8], bufferName: "lb" }, ctx);
chk("C: COPY-list: an out-of-range item -> the ref-out-of-range error", rC2 === "Error: line 8 is out of range in bt_num.txt (the file has 5 lines).");
const cDst2 = "bt_c2.txt";
fs.writeFileSync(path.join(dir, cDst2), "top");
await t.execute({ mode: "PASTE", dstFile: cDst2, bufferName: "lb" }, ctx);
chk("C: the failed COPY-list left the buffer untouched (no partial state)", fs.readFileSync(path.join(dir, cDst2), "utf-8") === "top\nline1\nZZZ end\ntail");
const rC3 = await t.execute({ mode: "COPY", text: "hello\nworld", bufferName: "tb" }, ctx);
chk("C: COPY text key: direct text -> buffer (exact Part F feedback)", rC3 === "Copied 2 lines from text into buffer 'tb' (lines 1..2, first: 'hello') - buffer: 2 lines.");
const tDst = "bt_t.txt";
fs.writeFileSync(path.join(dir, tDst), "top");
await t.execute({ mode: "PASTE", dstFile: tDst, bufferName: "tb" }, ctx);
chk("C: COPY text: the buffer holds exactly the text's lines", fs.readFileSync(path.join(dir, tDst), "utf-8") === "top\nhello\nworld");
const rC4 = await t.execute({ mode: "COPY", text: "a\nb\n", bufferName: "tb2" }, ctx);
chk("C: COPY text: a trailing newline adds no blank line", rC4 === "Copied 2 lines from text into buffer 'tb2' (lines 1..2, first: 'a') - buffer: 2 lines.");
const rC5 = await t.execute({ mode: "COPY", text: "x", srcFile: numFile, startMarker: 1, endMarker: 2, bufferName: "ex" }, ctx);
chk("C: 'text' + markers is rejected (mutually exclusive forms)", /alone/.test(rC5));
const rC6 = await t.execute({ mode: "COPY", refs: [1], startMarker: 1, endMarker: 2, srcFile: numFile, bufferName: "ex" }, ctx);
chk("C: 'refs' + markers is rejected (mutually exclusive forms)", /alone/.test(rC6));
const rP1 = await t.execute({ mode: "APPEND", srcFile: numFile, refs: [1, 3], bufferName: "ab" }, ctx);
chk("C: APPEND creates an absent buffer (exact Part F feedback)", rP1 === "Appended 2 lines from 'bt_num.txt' to buffer 'ab' (lines 1, 3, first: 'AAA start') - buffer: 2 lines.");
const rP2 = await t.execute({ mode: "APPEND", text: "x\ny", bufferName: "ab" }, ctx);
chk("C: APPEND appends text (buffer count AFTER the op)", rP2 === "Appended 2 lines from text to buffer 'ab' (lines 1..2, first: 'x') - buffer: 4 lines.");
const rP3 = await t.execute({ mode: "APPEND", srcFile: numFile, startMarker: 4, endMarker: 5, bufferName: "ab" }, ctx);
chk("C: APPEND single-ref pair appends the span", rP3 === "Appended 2 lines from 'bt_num.txt' to buffer 'ab' (lines 4..5, first: 'ZZZ end') - buffer: 6 lines.");
const aDst = "bt_a.txt";
fs.writeFileSync(path.join(dir, aDst), "top");
await t.execute({ mode: "PASTE", dstFile: aDst, bufferName: "ab" }, ctx);
chk("C: APPEND = stepwise assembly (AAA start, line2, x, y, ZZZ end, tail)", fs.readFileSync(path.join(dir, aDst), "utf-8") === "top\nAAA start\nline2\nx\ny\nZZZ end\ntail");
const rP4 = await t.execute({ mode: "APPEND" }, ctx);
chk("C: bare APPEND teaches the input forms", rP4 === "Error: APPEND needs one input form: a 'refs' list, 'startMarker'+'endMarker' (with srcFile), or 'text'.");
// feedback truncation: the first-line echo is capped at 40 chars ('...' marker)
const longFile = "bt_long.txt";
const longLine = "A".repeat(50);
fs.writeFileSync(path.join(dir, longFile), longLine + "\nshort\n");
const rF1 = await t.execute({ mode: "COPY", srcFile: longFile, startMarker: 1, endMarker: 1, bufferName: "lg" }, ctx);
chk("C: feedback first-line echo capped at 40 chars ('...' marker) + singular form", rF1 === `Copied 1 line from 'bt_long.txt' into buffer 'lg' (lines 1..1, first: '${"A".repeat(40)}...') - buffer: 1 line.`);

// ---- Part D: WRITE mode (2026-09-25_block_transfer-v2 S3)
const w1 = "bt_w1.txt";
fs.writeFileSync(path.join(dir, w1), "head\nOLD one\nOLD two\nfoot");
const rW1 = await t.execute({ mode: "WRITE", dstFile: w1, startMarker: "OLD one", endMarker: "OLD two", text: "NEW one\nNEW two" }, ctx);
chk("D: WRITE single span: exact Part F feedback (hardening item 7: old->new span + the file's new line count) + the span replaced in place (byte-exact dst)", rW1 === "Wrote 2 lines to 'bt_w1.txt' (old 2..3 -> new 2..3, file now 4 lines, first: 'NEW one')." && fs.readFileSync(path.join(dir, w1), "utf-8") === "head\nNEW one\nNEW two\nfoot");
const rW2 = await t.execute({ mode: "WRITE", dstFile: "bt_w_new.txt", startMarker: "NOPE", endMarker: "NOPE2", text: "x" }, ctx);
chk("D: WRITE on an absent file (flagged detail #2): the marker refs resolve against the EMPTY state (teaching not-found error) + no file created", rW2 === "Error: Start marker 'NOPE' not found in bt_w_new.txt." && !fs.existsSync(path.join(dir, "bt_w_new.txt")));
const rW3 = await t.execute({ mode: "WRITE", dstFile: "bt_w_new.txt", startMarker: 1, endMarker: 1, text: "x" }, ctx);
chk("D: WRITE on an absent file: the number refs are out of range (the file has 0 lines) + no file created", rW3 === "Error: line 1 is out of range in bt_w_new.txt (the file has 0 lines)." && !fs.existsSync(path.join(dir, "bt_w_new.txt")));
const w2 = "bt_w2.txt";
fs.writeFileSync(path.join(dir, w2), "h1\nA one\nA two\nmid\nB one\nB two\nh7");
const rW4 = await t.execute({ mode: "WRITE", dstFile: w2, text: "REPL", regions: [{ start: "A one", end: "A two" }, { start: "B one", end: "B two" }] }, ctx);
chk("D: WRITE list (2 regions, applied HIGHEST LINE first — no shifting): the 3-line feedback (per-op descending: old->new in the FINAL numbering + summary) + byte-exact dst", rW4 === "Wrote 1 line to 'bt_w2.txt' (old 5..6 -> new 4..4, file now 5 lines, first: 'REPL').\nWrote 1 line to 'bt_w2.txt' (old 2..3 -> new 2..2, file now 5 lines, first: 'REPL').\nWrote 2 regions into 'bt_w2.txt' (2 lines total)." && fs.readFileSync(path.join(dir, w2), "utf-8") === "h1\nREPL\nmid\nREPL\nh7");
const w3 = "bt_w3.txt";
fs.writeFileSync(path.join(dir, w3), "l1\nl2\nl3\nl4\nl5");
const w3Before = fs.readFileSync(path.join(dir, w3), "utf-8");
const rW5 = await t.execute({ mode: "WRITE", dstFile: w3, text: "X", regions: [{ start: 2, end: 4 }, { start: 3, end: 5 }] }, ctx);
chk("D: WRITE list with overlapping spans: the teaching error with the ACTUAL line numbers + the file byte-identical (no write)", rW5 === "Error: overlapping spans (lines 2..4 and 3..5) in bt_w3.txt." && fs.readFileSync(path.join(dir, w3), "utf-8") === w3Before);
const rW6 = await t.execute({ mode: "WRITE", startMarker: "a", endMarker: "b", text: "x" }, ctx);
chk("D: WRITE without dstFile returns the exact error", rW6 === "Error: 'dstFile' is required for WRITE mode.");
const rW7 = await t.execute({ mode: "WRITE", dstFile: w3, startMarker: "l1", endMarker: "l2" }, ctx);
chk("D: WRITE without text returns the exact error", rW7 === "Error: 'text' is required for WRITE mode.");
const rW8 = await t.execute({ mode: "WRITE", dstFile: w3, text: "x", startMarker: "l1", endMarker: "l2", regions: [{ start: 1, end: 1 }] }, ctx);
chk("D: WRITE 'regions' + the single markers is rejected (mutually exclusive forms)", rW8 === "Error: the 'regions' list takes the span alone (no single markers).");
const rW9 = await t.execute({ mode: "WRITE", dstFile: w3, text: "x", startMarker: "l1" }, ctx);
chk("D: WRITE with only one span marker returns the exact error", rW9 === "Error: 'startMarker' and 'endMarker' are both required for WRITE mode.");

// ---- Part E: PEEK mode (bounded buffer preview — NEVER the full buffer)
await t.execute({ mode: "COPY", text: "AAA first\n\nbbb third\nccc fourth\nddd fifth\neee sixth\nfff seventh\nGGG last", bufferName: "pk" }, ctx);
const rK1 = await t.execute({ mode: "PEEK", bufferName: "pk" }, ctx);
chk("E: PEEK default: line count + 3 head + 3 tail (byte-exact) — the BLANK line is skipped when picking", rK1 === "Peeked buffer 'pk': 8 lines — head: 'AAA first', 'bbb third', 'ccc fourth' ... tail: 'eee sixth', 'fff seventh', 'GGG last'");
const bigPk = Array.from({ length: 30 }, (_, i) => "L" + (i + 1)).join("\n");
await t.execute({ mode: "COPY", text: bigPk, bufferName: "pk30" }, ctx);
const rK2 = await t.execute({ mode: "PEEK", bufferName: "pk30", from: 5, count: 3 }, ctx);
chk("E: PEEK window: from+count gives the bounded window (byte-exact)", rK2 === "Peeked buffer 'pk30': lines 5..7 of 30 — 'L5', 'L6', 'L7'");
const rK3 = await t.execute({ mode: "PEEK", bufferName: "pk30", from: 1, count: 40 }, ctx);
chk("E: PEEK window cap: a 40-line request on a 30-line buffer echoes exactly 25 lines", rK3 === "Peeked buffer 'pk30': lines 1..25 of 30 — " + Array.from({ length: 25 }, (_, i) => `'L${i + 1}'`).join(", "));
const rK4 = await t.execute({ mode: "PEEK", bufferName: "pk30", from: 31, count: 1 }, ctx);
chk("E: PEEK 'from' beyond the buffer: the ref-out-of-range error (with the count)", rK4 === "Error: line 31 is out of range in buffer 'pk30' (the buffer has 30 lines).");
const rK5 = await t.execute({ mode: "PEEK", bufferName: "pk", from: 2 }, ctx);
chk("E: PEEK 'from' without 'count': the exact together-error", rK5 === "Error: 'from' and 'count' must be given together.");
const rK6 = await t.execute({ mode: "PEEK", bufferName: "pk", count: 2 }, ctx);
chk("E: PEEK 'count' without 'from': the exact together-error", rK6 === "Error: 'from' and 'count' must be given together.");
const rK7 = await t.execute({ mode: "PEEK", bufferName: "nopeek" }, ctx);
chk("E: PEEK of an absent buffer: the empty-buffer error", rK7 === "Error: Clipboard buffer 'nopeek' is empty. Perform a COPY or CUT first.");

// ---- Part G: MAP mode (2026-09-25_block_transfer-v2 S4) — buffer
// structure: line count + head 3 + tail 3 + heading skeleton (max 10,
// '+N more'); lines echoed VERBATIM WITH line numbers. Headings =
// '^#{1,6} ' at column 0 (indented '#' excluded).
chk("schema: mode accepts MAP", args.mode.safeParse("MAP").success);
await t.execute({ mode: "COPY", text: "# Title\nlong line that exceeds forty chars for sure\n  # indented hash\nbody\n## Sub\nx\ny\nz\nw\nv\nu\ntail line", bufferName: "mp" }, ctx);
const rG1 = await t.execute({ mode: "MAP", bufferName: "mp" }, ctx);
chk("G: MAP: line count + head 3 + tail 3 + heading skeleton — lines echoed VERBATIM (no 40-char cap) WITH line numbers (byte-exact); the indented '#' is NOT a heading", rG1 === "Mapped buffer 'mp': 12 lines — head: 1: '# Title', 2: 'long line that exceeds forty chars for sure', 3: '  # indented hash' ... tail: 10: 'v', 11: 'u', 12: 'tail line' — headings: 1: '# Title', 5: '## Sub'");
await t.execute({ mode: "COPY", text: Array.from({ length: 11 }, (_, i) => "# h" + (i + 1)).join("\n"), bufferName: "mh" }, ctx);
const rG2 = await t.execute({ mode: "MAP", bufferName: "mh" }, ctx);
chk("G: MAP heading cap: 11 headings -> the first 10 listed + '+1 more' (byte-exact)", rG2 === "Mapped buffer 'mh': 11 lines — head: 1: '# h1', 2: '# h2', 3: '# h3' ... tail: 9: '# h9', 10: '# h10', 11: '# h11' — headings: 1: '# h1', 2: '# h2', 3: '# h3', 4: '# h4', 5: '# h5', 6: '# h6', 7: '# h7', 8: '# h8', 9: '# h9', 10: '# h10' +1 more");
await t.execute({ mode: "COPY", text: "#tight\n  # indented\n## ok\nbody", bufferName: "mp2" }, ctx);
const rG3 = await t.execute({ mode: "MAP", bufferName: "mp2" }, ctx);
chk("G: MAP heading detection is narrow — only '^#{1,6} ' at column 0 (a no-space '#' and an indented '#' are excluded; byte-exact)", rG3 === "Mapped buffer 'mp2': 4 lines — head: 1: '#tight', 2: '  # indented', 3: '## ok' ... tail: 4: 'body' — headings: 3: '## ok'");
await t.execute({ mode: "COPY", text: "a\nb\nc", bufferName: "m3" }, ctx);
const rG4 = await t.execute({ mode: "MAP", bufferName: "m3" }, ctx);
chk("G: MAP short buffer (N <= 3): head only (no tail part), headings '(none)' (byte-exact)", rG4 === "Mapped buffer 'm3': 3 lines — head: 1: 'a', 2: 'b', 3: 'c' — headings: (none)");
const rG5 = await t.execute({ mode: "MAP", bufferName: "nomap" }, ctx);
chk("G: MAP of an absent buffer: the empty-buffer error (byte-exact)", rG5 === "Error: Clipboard buffer 'nomap' is empty. Perform a COPY or CUT first.");

// ---- Part H: the last_write auto-buffer (2026-09-25_block_transfer-v2
// S4) — every WRITE auto-stores its text in the buffer 'last_write'
// (overwritten per WRITE; automatic, NO parameter — poka-yoke).
const lwFile = "bt_lw.txt";
fs.writeFileSync(path.join(dir, lwFile), "one\ntwo");
await t.execute({ mode: "WRITE", dstFile: lwFile, startMarker: "one", endMarker: "two", text: "AAA first" }, ctx);
const lwDst = "bt_lwd.txt";
fs.writeFileSync(path.join(dir, lwDst), "top");
await t.execute({ mode: "PASTE", dstFile: lwDst, bufferName: "last_write" }, ctx);
chk("H: the WRITE auto-stores its text in the 'last_write' buffer (no parameter — PASTE shows it)", fs.readFileSync(path.join(dir, lwDst), "utf-8") === "top\nAAA first");
await t.execute({ mode: "WRITE", dstFile: lwFile, startMarker: "AAA first", endMarker: "AAA first", text: "BBB second\nCCC third" }, ctx);
await t.execute({ mode: "PASTE", dstFile: lwDst, bufferName: "last_write" }, ctx);
chk("H: a second WRITE OVERWRITES 'last_write' (PASTE shows the new text)", fs.readFileSync(path.join(dir, lwDst), "utf-8") === "top\nAAA first\nBBB second\nCCC third");
const rH3 = await t.execute({ mode: "WRITE", dstFile: lwFile, startMarker: "BBB second", endMarker: "CCC third", text: "DDD fourth", bufferName: "explicit" }, ctx);
chk("H: the WRITE feedback line carries NO last_write note (the auto-store is silent — hardening item 7 shape only)", rH3 === "Wrote 1 line to 'bt_lw.txt' (old 1..2 -> new 1..1, file now 1 line, first: 'DDD fourth').");
await t.execute({ mode: "PASTE", dstFile: lwDst, bufferName: "last_write" }, ctx);
chk("H: an explicit bufferName does NOT divert the auto-store ('last_write' still gets the text)", fs.readFileSync(path.join(dir, lwDst), "utf-8") === "top\nAAA first\nBBB second\nCCC third\nDDD fourth");
const rH4 = await t.execute({ mode: "PASTE", dstFile: lwDst, bufferName: "explicit" }, ctx);
chk("H: the WRITE's own bufferName buffer is untouched (empty-buffer error)", /is empty/.test(rH4));

// ---- Part F: the unified feedback line for ALL the remaining modes
const mSrc = "bt_m.txt";
const mDst = "bt_m_dst.txt";
fs.writeFileSync(path.join(dir, mSrc), "AAA start\nline1\nline2\nZZZ end\ntail");
fs.writeFileSync(path.join(dir, mDst), "head");
const rM1 = await t.execute({ mode: "MOVE", srcFile: mSrc, startMarker: "AAA", endMarker: "ZZZ", dstFile: mDst }, ctx);
chk("F: MOVE feedback: exact Part F line (resolved range + first-line echo + the insertion-point suffix — cross-file EOF)", rM1 === "Moved 4 lines from 'bt_m.txt' to 'bt_m_dst.txt' (lines 1..4, first: 'AAA start') (at EOF).");
const cSrc = "bt_cut.txt";
fs.writeFileSync(path.join(dir, cSrc), "AAA start\nline1\nline2\nZZZ end\ntail");
const rCt = await t.execute({ mode: "CUT", srcFile: cSrc, startMarker: "line1", endMarker: "line2", bufferName: "cutb" }, ctx);
chk("F: CUT feedback: exact Part F line + the buffer count AFTER the op", rCt === "Cut 2 lines from 'bt_cut.txt' into buffer 'cutb' (lines 2..3, first: 'line1') - buffer: 2 lines.");
const pDst = "bt_p2.txt";
fs.writeFileSync(path.join(dir, pDst), "head");
const rPst = await t.execute({ mode: "PASTE", dstFile: pDst, bufferName: "cutb", targetMarker: "head" }, ctx);
chk("F: PASTE feedback: exact Part F line (the buffer's own range + echo + the insertion-point suffix + the buffer count AFTER)", rPst === "Pasted 2 lines from buffer 'cutb' into 'bt_p2.txt' (lines 1..2, first: 'line1') (inserted after line 1 in 'bt_p2.txt') - buffer: 2 lines.");
const dSrc = "bt_d2.txt";
fs.writeFileSync(path.join(dir, dSrc), "AAA start\nline1\nline2\nZZZ end\ntail");
const rDel = await t.execute({ mode: "DELETE", srcFile: dSrc, startMarker: "line1", endMarker: "line2" }, ctx);
chk("F: DELETE feedback: exact Part F line (resolved range + first-line echo)", rDel === "Deleted 2 lines from 'bt_d2.txt' (lines 2..3, first: 'line1').");
const rCl = await t.execute({ mode: "CLEAR", bufferName: "cutb" }, ctx);
chk("F: CLEAR feedback: exact Part F line (the buffer count AFTER the op = 0)", rCl === "Cleared buffer 'cutb' - buffer: 0 lines.");

// ---- Part B2: the plan25 anchor fixes (2026-09-27, spec fafdee8):
// (a) digit-string line refs, (b) anchor-side trim, (c) candidate hints.
// numFile = 5 lines (restored at the Part C setup, untouched since).
const rNS1 = await t.execute({ mode: "COPY", srcFile: numFile, startMarker: "2", endMarker: "4", bufferName: "ns1" }, ctx);
chk("B2(a): a digit-string ref pair resolves as line numbers — the SAME byte-exact result as the numeric call (the live channel stringifies schema integers)", rNS1 === "Copied 3 lines from 'bt_num.txt' into buffer 'ns1' (lines 2..4, first: 'line1') - buffer: 3 lines.");
const rNS2 = await t.execute({ mode: "COPY", srcFile: numFile, startMarker: "0", endMarker: "4", bufferName: "ns2" }, ctx);
chk("B2(a): the digit-string '0' -> the byte-exact not-1-based error (same wording as the number 0)", rNS2 === "Error: Start marker 0 is not a 1-based line number in bt_num.txt.");
const rNS3 = await t.execute({ mode: "COPY", srcFile: numFile, startMarker: "6", endMarker: "4", bufferName: "ns3" }, ctx);
chk("B2(a): an out-of-range digit-string -> the byte-exact ref-out-of-range error (with the count)", rNS3 === "Error: line 6 is out of range in bt_num.txt (the file has 5 lines).");
const indFile = "bt_ind.txt";
fs.writeFileSync(path.join(dir, indFile), "one\n   ind line\ntwo");
const rIN1 = await t.execute({ mode: "COPY", srcFile: indFile, startMarker: "   ind line", endMarker: "   ind line", bufferName: "ind" }, ctx);
chk("B2(b): an anchor typed WITH the line's leading whitespace now MATCHES its line (the anchor is trimmed before the startsWith; the echo keeps the original indentation)", rIN1 === "Copied 1 line from 'bt_ind.txt' into buffer 'ind' (lines 2..2, first: '   ind line') - buffer: 1 line.");
const rIN2 = await t.execute({ mode: "COPY", srcFile: indFile, startMarker: " \t ", endMarker: "two", bufferName: "ind2" }, ctx);
chk("B2(b): an all-whitespace anchor matches NO line (never match-all) -> the byte-identical OLD not-found format (no candidate hint)", rIN2 === "Error: Start marker ' \t ' not found in bt_ind.txt.");
const hintFile = "bt_hint.txt";
fs.writeFileSync(path.join(dir, hintFile), "head\nAAA one\nAAA two\nfoot");
const rHT1 = await t.execute({ mode: "COPY", srcFile: hintFile, startMarker: "ABX", endMarker: "foot", bufferName: "hint" }, ctx);
chk("B2(c): a not-found anchor WITH qualifying lines -> the byte-exact candidate hint (common-prefix length desc, ties by line asc; the anchor quoted AS GIVEN)", rHT1 === "Error: Start marker 'ABX' not found in bt_hint.txt. Closest lines: 2: 'AAA one', 3: 'AAA two'");
const nohintFile = "bt_nohint.txt";
fs.writeFileSync(path.join(dir, nohintFile), "zzz\nqqq\nwww");
const rHT2 = await t.execute({ mode: "COPY", srcFile: nohintFile, startMarker: "NOPE", endMarker: "qqq", bufferName: "nohint" }, ctx);
chk("B2(c): a not-found anchor with NO qualifying line (no shared char) -> the byte-identical OLD format (no hint)", rHT2 === "Error: Start marker 'NOPE' not found in bt_nohint.txt.");
const capFile = "bt_cap.txt";
const capLong = "RX " + Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)).join(" ");
fs.writeFileSync(path.join(dir, capFile), capLong + "\nRX short two\nRX short three\nRX short four\nRX short five\nRX short six");
const rHT3 = await t.execute({ mode: "COPY", srcFile: capFile, startMarker: "RY", endMarker: "RX short six", bufferName: "cap" }, ctx);
chk("B2(c): 6 qualifying lines -> EXACTLY 5 candidates (the cap, ties by line asc) + the >40-char line echoed capped at 40 chars ('...' appended, original indentation shown)", rHT3 === `Error: Start marker 'RY' not found in bt_cap.txt. Closest lines: 1: '${capLong.slice(0, 40)}...', 2: 'RX short two', 3: 'RX short three', 4: 'RX short four', 5: 'RX short five'`);

// ---- Hardening unit (2026-10-21): the items 1-8 NEW pins (the re-pinned
// Part F shapes above cover the changed return strings; these cover the
// newly hardened behavior). Item 1: the MOVE destination checks (sandbox,
// dstFile presence, the targetMarker resolution) ALL run BEFORE the source
// is cut, and the block is ALSO stashed in the buffer 'last_move_source'
// before the cut (the recovery buffer for a destructive MOVE).
const hS = "bt_h_src.txt", hD = "bt_h_dst.txt";
fs.writeFileSync(path.join(dir, hS), "k1\nBLK one\nBLK two\nk2");
fs.writeFileSync(path.join(dir, hD), "d1\nd2");
const rHB1 = await t.execute({ mode: "MOVE", srcFile: hS, startMarker: "BLK one", endMarker: "BLK two", dstFile: hD, targetMarker: "NOPE" }, ctx);
chk("Item 1: MOVE with an unresolvable targetMarker -> the not-found error + BOTH files byte-identical (no partial cut)", rHB1 === "Error: Target marker 'NOPE' not found in bt_h_dst.txt." && fs.readFileSync(path.join(dir, hS), "utf-8") === "k1\nBLK one\nBLK two\nk2" && fs.readFileSync(path.join(dir, hD), "utf-8") === "d1\nd2");
const rHB2 = await t.execute({ mode: "MOVE", srcFile: hS, startMarker: "BLK one", endMarker: "BLK two", dstFile: hD, targetMarker: "d2" }, ctx);
chk("Item 1: the recovered MOVE names the insertion line + 'last_move_source' holds the block (stashed BEFORE the cut)", rHB2 === "Moved 2 lines from 'bt_h_src.txt' to 'bt_h_dst.txt' (lines 2..3, first: 'BLK one') (inserted after line 2 in 'bt_h_dst.txt')." && fs.readFileSync(path.join(dir, hS), "utf-8") === "k1\nk2" && fs.readFileSync(path.join(dir, hD), "utf-8") === "d1\nd2\nBLK one\nBLK two" && /Peeked buffer 'last_move_source': 2 lines . head: 'BLK one', 'BLK two'/.test(await t.execute({ mode: "PEEK", bufferName: "last_move_source" }, ctx)));

// Item 2 (SAME-FILE MOVE): move-with-shift — the source span AND the target
// resolve against the PRE-CALL state; the insert adjusts for the removed
// block; a target INSIDE the span is a teaching error.
fs.writeFileSync(path.join(dir, hS), "L1\nL2\nL3\nL4\nL5\nL6\nL7");
const rHB3 = await t.execute({ mode: "MOVE", srcFile: hS, startMarker: 2, endMarker: 3, dstFile: hS, targetMarker: 5 }, ctx);
chk("Item 2: same-file MOVE DOWN (span 2..3, target pre-call 5) inserts at FINAL line 3 (the shift) + byte-exact file", rHB3 === "Moved 2 lines from 'bt_h_src.txt' to 'bt_h_src.txt' (lines 2..3, first: 'L2') (inserted after line 3 in 'bt_h_src.txt')." && fs.readFileSync(path.join(dir, hS), "utf-8") === "L1\nL4\nL5\nL2\nL3\nL6\nL7");
const rHB4 = await t.execute({ mode: "MOVE", srcFile: hS, startMarker: 1, endMarker: 3, dstFile: hS, targetMarker: 2 }, ctx);
chk("Item 2: a same-file target INSIDE the span -> the teaching shift error + the file byte-identical", rHB4 === "Error: same-file MOVE target '2' (line 2) is inside the moved block (lines 1..3) — pick a target OUTSIDE the block (move-with-shift keeps the block intact)." && fs.readFileSync(path.join(dir, hS), "utf-8") === "L1\nL4\nL5\nL2\nL3\nL6\nL7");
const rHB5 = await t.execute({ mode: "MOVE", srcFile: hS, startMarker: 6, endMarker: 7, dstFile: hS, targetMarker: 1 }, ctx);
chk("Item 2: same-file MOVE UP (target ABOVE the block) — the insert index stays the pre-call target line", rHB5 === "Moved 2 lines from 'bt_h_src.txt' to 'bt_h_src.txt' (lines 6..7, first: 'L6') (inserted after line 1 in 'bt_h_src.txt')." && fs.readFileSync(path.join(dir, hS), "utf-8") === "L1\nL6\nL7\nL4\nL5\nL2\nL3");

// Item 3: the EOF index is countLines-based — appending to a trailing-newline
// file inserts BEFORE the blank tail; a NEW file gets no leading blank line.
await t.execute({ mode: "COPY", text: "BLK one\nBLK two", bufferName: "eofbuf" }, ctx);
fs.writeFileSync(path.join(dir, "bt_eof.txt"), "a\n");
const rHB6 = await t.execute({ mode: "PASTE", dstFile: "bt_eof.txt", bufferName: "eofbuf" }, ctx);
chk("Item 3: PASTE at EOF of a trailing-newline file gives \"a\nBLK one\nBLK two\n\" (no spurious blank line)", rHB6 === "Pasted 2 lines from buffer 'eofbuf' into 'bt_eof.txt' (lines 1..2, first: 'BLK one') (at EOF) - buffer: 2 lines." && fs.readFileSync(path.join(dir, "bt_eof.txt"), "utf-8") === "a\nBLK one\nBLK two\n");
const rHB7 = await t.execute({ mode: "PASTE", dstFile: "bt_newfile.txt", bufferName: "eofbuf" }, ctx);
chk("Item 3: PASTE creating a NEW file writes the block with NO leading blank line", rHB7 === "Pasted 2 lines from buffer 'eofbuf' into 'bt_newfile.txt' (lines 1..2, first: 'BLK one') (at EOF) - buffer: 2 lines." && fs.readFileSync(path.join(dir, "bt_newfile.txt"), "utf-8") === "BLK one\nBLK two");
// Item 4 (EOL preservation): the destination's EOL is detected ONCE and
// written back with it; the pasted lines get the CR re-attached — no whole-file
// CRLF->LF churn.
const crlf = "bt_crlf.txt";
fs.writeFileSync(path.join(dir, crlf), "h1\r\nh2\r\nh3\r\n");
const rHB8 = await t.execute({ mode: "PASTE", dstFile: crlf, bufferName: "eofbuf", targetMarker: "h1" }, ctx);
chk("Item 4: PASTE into a CRLF file keeps CRLF throughout (the inserted lines get the CR back)", rHB8 === "Pasted 2 lines from buffer 'eofbuf' into 'bt_crlf.txt' (lines 1..2, first: 'BLK one') (inserted after line 1 in 'bt_crlf.txt') - buffer: 2 lines." && fs.readFileSync(path.join(dir, crlf), "utf-8") === "h1\r\nBLK one\r\nBLK two\r\nh2\r\nh3\r\n");

// Item 5: the PEEK window takes the digit-string form of from/count (the live
// channel stringifies schema integers — plan25 parity with the ref fields).
const rHB9 = await t.execute({ mode: "PEEK", bufferName: "pk30", from: "5", count: "3" }, ctx);
chk("Item 5: PEEK from/count as digit-strings -> the SAME byte-exact window as the numeric call", rHB9 === "Peeked buffer 'pk30': lines 5..7 of 30 — 'L5', 'L6', 'L7'");
const rHB10 = await t.execute({ mode: "PEEK", bufferName: "pk30", from: "x", count: "3" }, ctx);
chk("Item 5: a non-numeric PEEK 'from' -> the teaching error quoting the value AS GIVEN", rHB10 === "Error: from x is not a 1-based line number in buffer 'pk30'.");
// Item 6: refPresent at every form-detection site + the empty-list teaching
// errors + the COPY bare-input message mirroring APPEND's three forms.
const rHB11 = await t.execute({ mode: "COPY" }, ctx);
chk("Item 6: a bare COPY teaches the THREE input forms (the APPEND wording, generalized)", rHB11 === "Error: COPY needs one input form: a 'refs' list, 'startMarker'+'endMarker' (with srcFile), or 'text'.");
const rHB12 = await t.execute({ mode: "COPY", srcFile: numFile, refs: [], bufferName: "emptyrefs" }, ctx);
chk("Item 6: an EMPTY 'refs' list -> the teaching error and NO buffer side-effect", rHB12 === "Error: the 'refs' list is empty (give at least one ref)." && /is empty/.test(await t.execute({ mode: "PEEK", bufferName: "emptyrefs" }, ctx)));
const rHB13 = await t.execute({ mode: "WRITE", dstFile: w3, text: "x", regions: [] }, ctx);
chk("Item 6: an EMPTY 'regions' list -> the teaching error + the file byte-identical", rHB13 === "Error: the 'regions' list is empty (give at least one region)." && fs.readFileSync(path.join(dir, w3), "utf-8") === "l1\nl2\nl3\nl4\nl5");
const rHB14 = await t.execute({ mode: "COPY", srcFile: numFile, startMarker: "", endMarker: 4, bufferName: "emptym" }, ctx);
chk("Item 6: an empty-string marker is ABSENT (refPresent) -> the required-args error, not a not-found error", rHB14 === "Error: 'srcFile', 'startMarker', and 'endMarker' are required for mode COPY.");

// Item 7: an EMPTY-text WRITE reports 'new (empty)' + the file's new count.
const rHB15 = await t.execute({ mode: "WRITE", dstFile: w3, startMarker: "l2", endMarker: "l4", text: "" }, ctx);
chk("Item 7: an EMPTY-text WRITE -> 'new (empty)' + the file's new line count + the file byte-exact", rHB15 === "Wrote 0 lines to 'bt_w3.txt' (old 2..4 -> new (empty), file now 2 lines, first: '')." && fs.readFileSync(path.join(dir, w3), "utf-8") === "l1\nl5");
// Item 8: the MAP echo caps each LINE at 200 chars + '…' (the line COUNT was
// already bounded by design; the WIDTH was the leak).
const wide = "M".repeat(260);
await t.execute({ mode: "COPY", text: wide, bufferName: "widebuf" }, ctx);
const rHB16 = await t.execute({ mode: "MAP", bufferName: "widebuf" }, ctx);
chk("Item 8: MAP caps each echoed line at 200 chars + '…' (byte-exact single-line buffer)", rHB16 === "Mapped buffer 'widebuf': 1 line — head: 1: '" + "M".repeat(200) + "…' — headings: (none)");

fs.rmSync(dir, { recursive: true, force: true });

finish();
