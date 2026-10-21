import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { tool } from "@opencode-ai/plugin"

// Persistent memory cache for named clipboards across tool invocations within the session
const clipboardBuffers: Record<string, string[]> = {};

// Path guard: every file-path argument (src and dst, all modes) must resolve inside the
// working directory or the Windows temp directory. Returns null if allowed, an error
// string if not. Called BEFORE any fs access — no partial writes on rejection.
function sandboxCheck(cwd: string, givenPath: string): string | null {
  // Hardening item 10 (2026-10-21): the temp root is os.tmpdir() — the TEMP/TMP
  // env vars are Windows-only, so on a POSIX host the temp root used to
  // disappear from the allowed list entirely. TEMP/TMP stay as an OVERRIDE
  // AHEAD of os.tmpdir(); the list is de-duplicated by EXACT string
  // equality, so on Windows (TEMP == os.tmpdir()) the byte-exact 2-root
  // error form stays UNCHANGED and a host where the two differ gains the
  // third root.
  const tempOverride = process.env.TEMP ?? process.env.TMP;
  const roots = [cwd, tempOverride, os.tmpdir()]
    .filter((r): r is string => typeof r === "string" && r.length > 0)
    .filter((r, i, all) => all.indexOf(r) === i);
  const resolved = path.resolve(cwd, givenPath).toLowerCase();
  const allowed = roots.some((root) => {
    const r = path.resolve(root).toLowerCase();
    return resolved === r || resolved.startsWith(r + path.sep);
  });
  if (allowed) return null;
  return `Error: '${givenPath}' is outside the sandbox (allowed: ${roots.join(", ")})`;
}

// ===== THE UNIFIED ANCHOR RULE (approved proposal 2026-09-25_block_transfer-v2, Part A) =====
// Every mode's startMarker / endMarker / targetMarker lookup routes through
// resolveAnchor — ONE rule for ALL modes. This replaces the old per-mode
// matching: COPY's mid-line substring tolerance is GONE (a flagged, approved
// decision), and REPLACE now trims the line's leading whitespace before the
// prefix match (the old bare startsWith did not).
//
// The matching rule itself lives in matchAnchorLines, and ONLY there:
// swapping the general behavior (prefix -> substring / case-insensitive /
// fuzzy) is a change in this one place, not in the modes.
//
// Rule (exactly as approved, Part A; the anchor-side trim added by the
// plan25 fix, 2026-09-27):
//   - the file is split into lines on `\n`; a trailing `\r` on a line is
//     ignored for matching (CRLF-tolerant);
//   - an anchor A matches line L if L, after removing LEADING spaces/tabs,
//     BEGINS with A verbatim (case-sensitive); A is ITSELF stripped of
//     LEADING spaces/tabs before the match — an anchor typed with the
//     line's indentation now matches;
//   - an anchor that is empty AFTER trimming (all whitespace) matches NO
//     line (never match-all);
//   - the line's remainder after A is irrelevant (a longer line still
//     matches — that's the prefix);
//   - the anchor must match EXACTLY ONE line.

// The 1-based line numbers of ALL matching lines (empty array = no match).
export function matchAnchorLines(fileText: string, anchor: string): number[] {
  // plan25 (b): strip LEADING spaces/tabs from the ANCHOR as well — an
  // all-whitespace anchor is empty after trimming and matches nothing.
  const trimmed = anchor.replace(/^[ \t]+/, "");
  if (!trimmed) return [];
  const out: number[] = [];
  const lines = fileText.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (line.replace(/^[ \t]+/, "").startsWith(trimmed)) out.push(i + 1);
  }
  return out;
}

// The EXACTLY-ONE contract: the 1-based line number of the EXACT ONE match,
// else null. The single entry point every mode's anchor lookup resolves
// through.
export function resolveAnchor(fileText: string, anchor: string): number | null {
  const matches = matchAnchorLines(fileText, anchor);
  return matches.length === 1 ? matches[0] : null;
}

// The teaching error taxonomy (Part A), one line each:
//  - not-found: the anchor quoted AS GIVEN (with the file) + the plan25
//    ` Closest lines: ` candidate hint (up to 5; the message stays
//    byte-identical to the pre-fix form when no line qualifies);
//  - non-unique: the anchor quoted (with the file) + the match count + the
//    first match line numbers (the v2 teaching format — S3, the S1-deferred
//    switch; probes 115/263 + the smoke pins re-pinned in the same commit);
//  - empty-buffer: the existing message, kept verbatim (probe-pinned, 116);
//  - ref-out-of-range: a 1-based line number beyond the file's line count,
//    with the count.
// Out-of-sandbox is NOT in this taxonomy — the intercept plugin handles it
// upstream; sandboxCheck above stays the defense-in-depth backstop.
// The plan25 candidate hint (2026-09-27): when no line matches, the error
// appends ` Closest lines: ` + up to 5 candidates, each
// `${lineNo}: '<first 40 chars of the line>'` ('...' appended when cut,
// the line's trailing \r stripped, original indentation shown), joined by
// ", ". "Closest" is deterministic: the length of the longest common
// prefix of the TRIMMED anchor (leading spaces/tabs stripped) and the
// TRIMMED line; top 5 by that length descending, ties by ascending line
// number; only lines sharing >= 1 char qualify. When no line qualifies
// the message stays byte-identical to the pre-fix form. The quoted
// anchor stays AS GIVEN (not trimmed).
function notFoundError(fileRef: string, label: string, anchor: string, fileText: string): string {
  const base = `Error: ${label} '${anchor}' not found in ${fileRef}.`;
  const trimmedAnchor = anchor.replace(/^[ \t]+/, "");
  if (trimmedAnchor === "") return base;
  const lines = fileText.split("\n");
  const scored: { lineNo: number; len: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.endsWith("\r")) line = line.slice(0, -1);
    const trimmedLine = line.replace(/^[ \t]+/, "");
    let common = 0;
    while (common < trimmedAnchor.length && common < trimmedLine.length && trimmedAnchor[common] === trimmedLine[common]) common++;
    if (common >= 1) scored.push({ lineNo: i + 1, len: common });
  }
  if (scored.length === 0) return base;
  scored.sort((a, b) => b.len - a.len || a.lineNo - b.lineNo);
  const hint = scored
    .slice(0, 5)
    .map((s) => {
      let line = lines[s.lineNo - 1];
      if (line.endsWith("\r")) line = line.slice(0, -1);
      const echo = line.length > 40 ? line.slice(0, 40) + "..." : line;
      return `${s.lineNo}: '${echo}'`;
    })
    .join(", ");
  return `${base} Closest lines: ${hint}`;
}
// The v2 non-unique teaching format: the match count + the FIRST match line
// numbers (up to 3 listed; " …" when more — the line stays bounded).
function nonUniqueError(fileRef: string, label: string, anchor: string, matches: number[]): string {
  const first = matches.slice(0, 3).join(", ");
  const more = matches.length > 3 ? " …" : "";
  return `Error: ${label} '${anchor}' is not unique in ${fileRef} (${matches.length} matches: lines ${first}${more}).`;
}
// A 1-based line number beyond the file's line count, with the count.
export function refOutOfRangeError(fileRef: string, lineNo: number, lineCount: number): string {
  const word = lineCount === 1 ? "line" : "lines";
  return `Error: line ${lineNo} is out of range in ${fileRef} (the file has ${lineCount} ${word}).`;
}

// The single routing entry for every mode's anchor lookup: resolves through
// resolveAnchor; on failure builds the teaching error from the same matcher
// (not-found / non-unique).
type AnchorResolution = { line: number } | { error: string };
function resolveAnchorOrError(fileRef: string, label: string, fileText: string, anchor: string): AnchorResolution {
  const line = resolveAnchor(fileText, anchor);
  if (line !== null) return { line };
  const matches = matchAnchorLines(fileText, anchor);
  return { error: matches.length === 0 ? notFoundError(fileRef, label, anchor, fileText) : nonUniqueError(fileRef, label, anchor, matches) };
}

// ===== LINE-NUMBER REFS + ASSEMBLY (approved proposal 2026-09-25_block_transfer-v2, Parts B+C) =====
//
// Part B: EVERY ref side (startMarker / endMarker / targetMarker, and each
// item of the Part C 'refs' lists) is a marker string OR a line number
// (1-based, absolute). The disambiguation is by VALUE (plan25 fix,
// 2026-09-27): the host's constrained decoding of the string | integer
// schema stringifies integers in the LIVE channel, so a type branch alone
// was dead there — an ALL-DIGIT ref (a number, or a digit-string like
// "42") is a 1-based LINE NUMBER resolved against the PRE-call file state
// (no marker lookup); any OTHER string is a prefix MARKER. Beyond the
// file's line count -> the S1 ref-out-of-range error (with the count).
type Ref = string | number;

// The presence test for a ref: absent = null / undefined / "" (the S1 falsy
// forms — byte-compatible); 0 IS present (it then fails the 1-based check
// with the teaching error instead of a silent skip).
function refPresent(ref: Ref | undefined): boolean {
  return ref !== undefined && ref !== null && ref !== "";
}

// The file's conceptual line count: the SAME /\r?\n/ split the rest of the
// tool uses, minus the empty tail element a trailing newline produces
// ("a\nb\n" = 2 lines; "" = 0 lines).
export function countLines(fileText: string): number {
  if (fileText === "") return 0;
  const n = fileText.split(/\r?\n/).length;
  return fileText.endsWith("\n") ? n - 1 : n;
}

// Hardening item 4 (2026-10-21): the destination/file EOL, detected ONCE from
// its own text. The file is split on /\r?\n/ and written back joined with the
// DETECTED EOL, so a CRLF file never churns to LF wholesale and the inserted
// lines (which arrive EOL-free from the buffer / text conventions) get their
// '\r' re-attached. An empty text (a file being created) is LF.
function detectEol(fileText: string): string {
  return fileText.includes("\r\n") ? "\r\n" : "\n";
}
// The write-back: in a CRLF file, EVERY line of the final array gets its
// '\r' (the split stripped it from the untouched ones, and the inserted /
// buffer lines never had it), then the array joins on '\n' — the DETECTED
// EOL is thus the file's own, byte-exact, with no double-CR artifact.
function joinLines(lines: string[], eol: string): string {
  if (eol !== "\r\n") return lines.join("\n");
  // The '\r' is only needed where a '\n' FOLLOWS, so the LAST element keeps
  // its own shape — that preserves both a file WITHOUT a trailing newline
  // ("a\r\nb" round-trips) and the trailing newline's blank tail element
  // ("a\r\n" round-trips, no stray CR).
  const out = lines.map((l, i) => (i === lines.length - 1 ? l : l.endsWith("\r") ? l : `${l}\r`));
  return out.join("\n");
}
// Hardening item 3 (2026-10-21): the EOF insertion index of a split-lines array,
// computed with the SAME countLines() convention — the empty tail element a
// trailing newline produces is NOT a line, so appending to "a\n" inserts
// BEFORE that tail ("a\nb\n", no spurious blank line) and an empty array
// (a file being created) inserts at 0 (no leading blank line).
function eofIndex(lines: string[]): number {
  return countLines(lines.join("\n"));
}

// The single routing entry for a REF (marker string OR line number): a
// number or a digit-string (/^\d+$/) resolves directly as a 1-based line
// number (range-checked against the PRE-call state); any other string
// routes through the S1 anchor rule (resolveAnchor — untouched).
export function resolveRef(fileRef: string, label: string, fileText: string, ref: Ref): AnchorResolution {
  // plan25 (a): the live channel's constrained decoding stringifies schema
  // integers, so a digit-string ref is what it actually hits — treat an
  // all-digit ref (number or digit-string) as a 1-based line number.
  if (typeof ref === "number" || (typeof ref === "string" && /^\d+$/.test(ref))) {
    const lineNo = typeof ref === "number" ? ref : parseInt(ref, 10);
    if (!Number.isInteger(lineNo) || lineNo < 1) {
      return { error: `Error: ${label} ${lineNo} is not a 1-based line number in ${fileRef}.` };
    }
    const lineCount = countLines(fileText);
    if (lineNo > lineCount) return { error: refOutOfRangeError(fileRef, lineNo, lineCount) };
    return { line: lineNo };
  }
  return resolveAnchorOrError(fileRef, label, fileText, ref);
}

// Part C: a 'text' form -> lines (split on \r?\n; a trailing newline does
// NOT add a blank line — the same convention as the file handling).
function textToLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split(/\r?\n/);
  return text.endsWith("\n") ? lines.slice(0, -1) : lines;
}

type AssemblyResolved = { fileRef: string | null; lines: string[]; rangeText: string };
type AssemblyResult = { error: string } | AssemblyResolved;

// Part C: the shared input resolution for COPY (replace-into-buffer) and
// APPEND (append-to-buffer). EXACTLY ONE of three forms:
//   single-ref: srcFile + startMarker..endMarker (each a marker-or-number —
//     the S1 form, byte-compatible);
//   refs list:  srcFile + refs (each ref selects ONE line of srcFile; the
//     sections go into the buffer joined by EXACTLY ONE \n — the documented
//     default, no parameter);
//   text:       the text's lines directly (no file).
// ALL refs resolve against the PRE-call src state; every check runs before
// any buffer change (no partial state on rejection).
function resolveAssembly(mode: string, args: any, cwd: string): AssemblyResult {
  const hasText = typeof args.text === "string";
  const hasRefs = Array.isArray(args.refs);
  // Hardening item 6 (2026-10-21): form detection uses refPresent() at EVERY
  // site (the bare `!== undefined` check treated an empty-string ref as a
  // present one — the single-ref form's own guard is the S1 falsy-form rule).
  const hasSingle = refPresent(args.startMarker) || refPresent(args.endMarker);
  if (hasText && (hasRefs || hasSingle)) {
    return { error: "Error: the 'text' form takes the input alone (no 'refs', no markers)." };
  }
  if (hasRefs && hasSingle) {
    return { error: "Error: the 'refs' list takes the input alone (no markers)." };
  }
  if (hasText) {
    const lines = textToLines(args.text);
    return { fileRef: null, lines, rangeText: lines.length > 0 ? `1..${lines.length}` : "" };
  }
  if (hasRefs) {
    if (!args.srcFile) return { error: `Error: 'srcFile' is required for the 'refs' form of ${mode} mode.` };
    // Hardening item 6 (2026-10-21): an EMPTY 'refs' list is a rejected form,
    // not a silent zero-line buffer.
    if (args.refs.length === 0) return { error: "Error: the 'refs' list is empty (give at least one ref)." };
    const srcPath = path.resolve(cwd, args.srcFile);
    const violation = sandboxCheck(cwd, args.srcFile);
    if (violation) return { error: violation };
    if (!fs.existsSync(srcPath)) return { error: `Error: Source file '${args.srcFile}' not found.` };
    const srcRaw = fs.readFileSync(srcPath, "utf-8");
    const srcLines = srcRaw.split(/\r?\n/);
    const resolved: number[] = [];
    for (const ref of args.refs) {
      const r = resolveRef(args.srcFile, "List ref", srcRaw, ref);
      if ("error" in r) return { error: r.error };
      resolved.push(r.line);
    }
    return { fileRef: args.srcFile, lines: resolved.map((l) => srcLines[l - 1]), rangeText: resolved.join(", ") };
  }
  // single-ref form (including the bare call) — the S1 required-error covers
  // every missing part, byte-compatible.
  if (!args.srcFile || !refPresent(args.startMarker) || !refPresent(args.endMarker)) {
    // Hardening item 6 (2026-10-21): COPY and APPEND bare calls teach the
    // SAME three input forms (the APPEND-only special case generalizes; the
    // APPEND string stays byte-identical — probe 313 / smoke L199 pins).
    if ((mode === "APPEND" || mode === "COPY") && !refPresent(args.srcFile) && !refPresent(args.startMarker) && !refPresent(args.endMarker)) {
      return { error: `Error: ${mode} needs one input form: a 'refs' list, 'startMarker'+'endMarker' (with srcFile), or 'text'.` };
    }
    return { error: `Error: 'srcFile', 'startMarker', and 'endMarker' are required for mode ${mode}.` };
  }
  const srcPath = path.resolve(cwd, args.srcFile);
  const violation = sandboxCheck(cwd, args.srcFile);
  if (violation) return { error: violation };
  if (!fs.existsSync(srcPath)) return { error: `Error: Source file '${args.srcFile}' not found.` };
  const srcRaw = fs.readFileSync(srcPath, "utf-8");
  const srcLines = srcRaw.split(/\r?\n/);
  const start = resolveRef(args.srcFile, "Start marker", srcRaw, args.startMarker);
  if ("error" in start) return { error: start.error };
  const end = resolveRef(args.srcFile, "End marker", srcRaw, args.endMarker);
  if ("error" in end) return { error: end.error };
  // The unified rule resolves both refs file-wide; an end resolved
  // BEFORE the start is the teaching end-not-found error CARRYING THE FILE
  // REFERENCE (S3 switch: the legacy "after start marker" wording is kept,
  // the file is added).
  if (end.line < start.line) {
    return { error: `Error: End marker '${args.endMarker}' not found after start marker in ${args.srcFile}.` };
  }
  return { fileRef: args.srcFile, lines: srcLines.slice(start.line - 1, end.line), rangeText: `${start.line}..${end.line}` };
}

// Part F feedback (one line per op — the ops S2 adds/touches = COPY/APPEND):
// resolved line range + line count + truncated first-line echo (capped at
// 40 chars, '...' marker); buffer ops add the buffer's line count AFTER
// the op.
function assemblyFeedback(verb: string, prep: string, a: AssemblyResolved, bufferKey: string, bufferAfter: number): string {
  const lw = (m: number) => `${m} line${m === 1 ? "" : "s"}`;
  const first = a.lines[0] ?? "";
  const echo = first.length > 40 ? first.slice(0, 40) + "..." : first;
  const srcLabel = a.fileRef === null ? "text" : `'${a.fileRef}'`;
  const mid = a.rangeText !== "" ? ` (lines ${a.rangeText}, first: '${echo}')` : "";
  return `${verb} ${lw(a.lines.length)} from ${srcLabel} ${prep} buffer '${bufferKey}'${mid} - buffer: ${lw(bufferAfter)}.`;
}

// Part F feedback, ALL modes (the S3 redesign completes the ops S1/S2 left
// on the old shape): one line per op — the resolved line range + the line
// count + the truncated first-line echo (~40 chars, '...' when cut). Buffer
// ops add the buffer's line count AFTER the op (the `- buffer: N lines`
// tail); `bufferAfter = null` for the non-buffer ops.
// Hardening item 7 (2026-10-21): `midText` lets an op name its in-parens
// group explicitly (REPLACE/WRITE swap the `lines R` inner text for the
// `old A..B -> new C..D, file now N lines` form — a length-changing op makes
// line-number refs go stale, so the line numbers the next call needs are
// stated); `suffix` carries the MOVE/PASTE insertion point (` (inserted
// after line K in 'dst')` / ` (at EOF)`), which lands BETWEEN the group and
// the buffer tail.
function opLine(verb: string, count: number, phrase: string, rangeText: string, firstLine: string, bufferAfter: number | null, midText?: string, suffix?: string): string {
  const lw = (m: number) => `${m} line${m === 1 ? "" : "s"}`;
  const echo = firstLine.length > 40 ? firstLine.slice(0, 40) + "..." : firstLine;
  const inner = midText !== undefined && midText !== "" ? midText : `lines ${rangeText}`;
  const mid = ` (${inner}, first: '${echo}')`;
  const tail = bufferAfter === null ? "" : ` - buffer: ${lw(bufferAfter)}`;
  return `${verb} ${lw(count)} ${phrase}${mid}${suffix ?? ""}${tail}.`;
}

export default tool({
    description: `Move, copy, cut, paste, delete, or clear multi-line blocks in files using short unique line-prefix anchors and named clipboard buffers.

WHEN — block-level file surgery: moving a section to another file (MOVE), assembling a buffer from file lines or direct text (COPY/APPEND), swapping a region from a buffer or direct text (REPLACE/WRITE), purging a block (CUT/DELETE), or inspecting a buffer without pasting it out (PEEK/MAP).

WHEN-NOT — a small exact string replacement inside one file: use 'edit' — it matches an exact oldString (string-level); block_transfer is LINE-anchored (a short unique line prefix or a line number) and ASCII-safe — no non-ASCII / dense-numeral oldString problems. block_transfer cannot replace a mid-line substring (use 'edit' for that); 'write' rewrites the whole file (use REPLACE/WRITE for an in-place region swap).

MODES — MOVE: immediate cut-and-paste, extracts a block from srcFile and inserts it into dstFile in one call — every destination check (sandbox, dstFile presence, the insertion point) runs BEFORE the source is cut, and a MOVE whose srcFile and dstFile resolve to the SAME file is a move-with-shift inside that file (a target INSIDE the moved block is rejected). COPY: extract a block from srcFile into a buffer, leaving the source untouched — input forms: a single-ref pair (startMarker..endMarker), a 'refs' LIST, or a 'text' key (direct text -> buffer); the buffer is REPLACED (never appended). APPEND: append to the named buffer, created if absent — the SAME input forms as COPY (stepwise assembly, no flags). CUT: extract into a buffer AND delete from the source. PASTE: write a buffer into dstFile. REPLACE: replace the line-anchored span (startMarker..endMarker inclusive) of dstFile with the contents of a named buffer — edit-like region replacement WITHOUT an exact oldString match (REPLACE never creates a file). WRITE: replace a line-anchored region of dstFile with direct text (bufferless — no DELETE + extra write call): one 'text' into a single span (startMarker..endMarker) or into a 'regions' LIST (each { start, end }, ALL resolved against the PRE-call file state, applied HIGHEST LINE first — no shifting; overlapping spans are rejected with the actual line numbers); WRITE never creates a file (an absent dstFile yields the teaching not-found / out-of-range errors). Every WRITE auto-stores its 'text' in the buffer 'last_write' (overwritten per WRITE — automatic, no parameter): reuse it directly when an anchor resolution fails. PEEK: a bounded preview of a buffer — NEVER the full content: default = the line count + 3 head + 3 tail lines (each echoed capped ~40 chars, blank lines skipped when picking); or a 'from'+'count' window (capped at 25 lines); on small buffers the head and tail overlap (a 3-line buffer has head == tail — the same lines echoed twice). Full content: PASTE it to a file and read. MAP: a buffer structure at a glance — the line count + 3 head + 3 tail lines + a HEADING SKELETON (max 10, then '+N more'); lines echoed WITH line numbers, each line capped at ~200 chars + '…' when cut (the line COUNT is already bounded by design; blank lines kept). Headings = '^#{1,6} ' at column 0 (markdown H1-H6; indented '#' EXCLUDED) — no file-type sniffing: a '#' comment in a code buffer is self-evident from the verbatim echo. DELETE: extract a block and discard it (purge without outputting). CLEAR: empty a buffer. Use MOVE for a single direct transfer; use COPY/APPEND + PASTE/REPLACE for multi-buffer work across files (one buffer can be pasted several times); use REPLACE to swap a region in place (PASTE inserts, it does not replace); use WRITE for a direct text -> region write; use PEEK/MAP to inspect a buffer without pasting it out.

REFS — every ref (startMarker / endMarker / targetMarker, each item of a COPY/APPEND 'refs' list, and each start/end of a WRITE 'regions' item) is a line number or a marker string: an ALL-DIGIT ref (a number, or a digit-string like "42") is a 1-based line number (absolute, resolved against the PRE-call file state); any OTHER string is a prefix MARKER. A line number beyond the file's line count returns the ref-out-of-range error (with the count).

ANCHORS — a marker ref is a short UNIQUE line prefix (leading spaces/tabs on the ANCHOR are ignored — an anchor typed with the line's indentation matches; an all-whitespace anchor matches nothing); the block spans the start line through the end line INCLUSIVE. For MOVE/PASTE, an optional targetMarker (marker or line number in dstFile) sets the insertion point right after that line; omit it to append at EOF. For REPLACE, startMarker/endMarker are the span in dstFile itself (no targetMarker). For WRITE, the single span (or each 'regions' item) is the span in dstFile itself.

ASSEMBLY — COPY 'refs' LIST form: each ref selects ONE line of srcFile; the sections go into the buffer joined by EXACTLY ONE \\n (documented default — no parameter). COPY 'text' form: the text is split into lines (a trailing newline adds no blank line). COPY keeps the REPLACE-into-buffer semantics (the buffer is replaced, never appended); APPEND appends (creates the buffer if absent). Feedback for COPY/APPEND: one line — resolved line range + line count + truncated first-line echo (~40 chars, '...' when cut) — plus the buffer's line count AFTER the op.

RETURN LINES — one feedback line per applied op (a WRITE 'regions' list: one line per region, HIGHEST LINE first, plus a summary line). Shape: <Verb> N line(s) <phrase> (GROUP, first: '<echo>') + the tail ' - buffer: M line(s)' for the buffer ops (COPY/CUT/APPEND/PASTE/REPLACE); MOVE and PASTE insert the insertion-point suffix right before that tail. N = the operation's line count (REPLACE: the old lines removed; WRITE: the new text's lines; the others: the moved/extracted block's lines). GROUP is 'lines R' for the extraction ops (COPY/APPEND = the resolved span — the 'refs' list: the selected line numbers; the 'text' form: 1..N of the text's own lines; PASTE = the buffer's own lines 1..N; MOVE/CUT/DELETE = the source span start..end of srcFile, pre-call) — and for REPLACE/WRITE it is 'old A..B -> new C..D, file now K line(s)': the OLD span start..end of dstFile as resolved against the PRE-call state, the NEW span in the file's POST-op numbering (a length-changing op shifts every line BELOW it, so the line-number refs a follow-up call would use go STALE and the feedback states the numbers), K = the file's line count AFTER the op; an EMPTY-text WRITE reports 'new (empty)'. The first: field always echoes the NEW / extracted content's first line (capped ~40 chars, '...' when cut) — NEVER the old span's content. The - buffer: M count = the buffer's line count AFTER the op (APPEND: previous + appended; PASTE/REPLACE: the buffer is preserved — unchanged). The MOVE/PASTE insertion-point suffix is " (inserted after line K in '<dstFile>')" (dstFile quoted AS GIVEN; K = the FINAL line number the block sits right after — for a same-file MOVE, the shifted number), or " (at EOF)" when targetMarker was omitted; both carry the leading space.

BUFFERS — bufferName selects a named clipboard buffer (default 'default'); multiple buffers can coexist in one session; CLEAR empties one. A failed COPY/CUT/APPEND (anchor resolution or any rejection) leaves NO buffer behind — every check runs before any buffer change (no partial state on rejection); a later PEEK/MAP of that buffer name returns the empty-buffer error. For REPLACE the buffer supplies the replacement content (and is preserved afterwards, like PASTE). The buffer 'last_write' is auto-filled by every WRITE (overwritten per WRITE, no parameter) — PASTE/MAP/PEEK it like any buffer. Every MOVE stashes the extracted block in the buffer 'last_move_source' BEFORE the cut (the recovery buffer for a destructive MOVE — overwritten per MOVE, no parameter). PEEK previews a buffer (bounded, see the PEEK mode); full content: PASTE it to a file and read.

SANDBOX — all file access (reads AND writes) is confined to the working directory and the Windows temp directory; any path outside is rejected with an error.

EXAMPLE — move the block spanning "## TODO" .. "## Notes" (inclusive) from TODO.md into BACKLOG.md, right after its "# Backlog" header line:
  { "mode": "MOVE", "srcFile": "TODO.md", "dstFile": "BACKLOG.md", "startMarker": "## TODO", "endMarker": "## Notes", "targetMarker": "# Backlog" }

EDGE — a non-unique anchor (the error carries the match count + the FIRST 3 match line numbers — all of them when 3 or fewer, " …" appended when more — the line stays bounded), a missing required path, an out-of-range line-number ref, an empty PASTE/REPLACE/PEEK/MAP buffer, an overlapping WRITE 'regions' list, or an out-of-sandbox path each return an error naming the cause — read the error, fix the input, re-issue (a non-unique anchor: widen the prefix, do not guess). After MOVE/CUT/DELETE ONLY the block's own lines are removed — adjacent lines (including blank ones) are untouched, so two blank lines can end up adjacent.`,
    args: {
    mode: tool.schema.enum(["MOVE", "COPY", "APPEND", "CUT", "PASTE", "REPLACE", "WRITE", "PEEK", "MAP", "DELETE", "CLEAR"]).describe("Operation mode: MOVE (immediate cut-and-paste), COPY (yank to buffer — single-ref pair, 'refs' list, or 'text'), APPEND (append to the named buffer, created if absent — the same forms as COPY), CUT (yank to buffer and delete from source), PASTE (write buffer to target), REPLACE (replace the line-anchored span of dstFile with a named buffer), WRITE (replace a line-anchored region of dstFile with direct 'text' — a single span or a 'regions' list; NEVER creates a file; auto-stores the text in the 'last_write' buffer), PEEK (bounded buffer preview — head/tail or a from/count window), MAP (buffer structure at a glance — line count + head/tail + a heading skeleton, lines numbered with a ~200-char cap per line), DELETE (cut to null), CLEAR (empty buffer)."),
    srcFile: tool.schema.string().optional().describe("Source file path. Required for MOVE, CUT, DELETE, and the single-ref and 'refs' forms of COPY/APPEND."),
    dstFile: tool.schema.string().optional().describe("Destination file path. Required for MOVE, PASTE, REPLACE, or WRITE. For REPLACE the file must exist (REPLACE never creates a file); WRITE never creates a file either (an absent dstFile yields the teaching not-found / out-of-range errors)."),
    startMarker: tool.schema.union([tool.schema.string(), tool.schema.number().int()]).optional().describe("Block start: a marker string (short UNIQUE line prefix) OR a line number (1-based, absolute) — an all-digit ref (a number, or a digit-string like \"42\") is a line number; any other string is a prefix marker. Required for the single-ref form (MOVE, COPY, CUT, DELETE; for REPLACE: the span start in dstFile; for WRITE: the single-span start in dstFile)."),
    endMarker: tool.schema.union([tool.schema.string(), tool.schema.number().int()]).optional().describe("Block end: a marker string (short UNIQUE line prefix) OR a line number (1-based, absolute) — an all-digit ref (a number, or a digit-string like \"42\") is a line number; any other string is a prefix marker. Required for the single-ref form (MOVE, COPY, CUT, DELETE; for REPLACE: the span end in dstFile; for WRITE: the single-span end in dstFile)."),
    targetMarker: tool.schema.union([tool.schema.string(), tool.schema.number().int()]).optional().describe("Insertion point in dstFile: a marker string (short UNIQUE line prefix) OR a line number (1-based, absolute); an all-digit ref (a number, or a digit-string like \"42\") is a line number; any other string is a prefix marker. The block goes right after that line. If omitted in MOVE or PASTE, appends to EOF."),
    refs: tool.schema.array(tool.schema.union([tool.schema.string(), tool.schema.number().int()])).optional().describe("COPY/APPEND list form: a LIST of refs (each a marker string or a line number — an all-digit ref (a number, or a digit-string) is a line number; any other string is a prefix marker); each ref selects ONE line of srcFile, and the sections go into the buffer joined by EXACTLY ONE \\n. Mutually exclusive with 'text' and the markers."),
    text: tool.schema.string().optional().describe("COPY/APPEND direct-text form: the text goes into the buffer (split into lines; a trailing newline adds no blank line). Mutually exclusive with 'refs' and the markers. For WRITE: the direct text that replaces the span (required)."),
    regions: tool.schema.array(tool.schema.object({
      start: tool.schema.union([tool.schema.string(), tool.schema.number().int()]),
      end: tool.schema.union([tool.schema.string(), tool.schema.number().int()])
    })).optional().describe("WRITE list form: a LIST of regions, each an object { start, end } (each ref a marker string or a line number — an all-digit ref is a line number; any other string is a prefix marker); ALL regions resolve against the PRE-call file state and are applied HIGHEST LINE first (no shifting). Mutually exclusive with the single startMarker/endMarker pair."),
    from: tool.schema.union([tool.schema.string(), tool.schema.number().int()]).optional().describe("PEEK window start: a 1-based line number in the buffer — an ALL-DIGIT ref (a number, or a digit-string like \"42\") is a line number (the live channel stringifies schema integers); any other value is a teaching error. Given together with 'count' (both or neither)."),
    count: tool.schema.union([tool.schema.string(), tool.schema.number().int()]).optional().describe("PEEK window length in lines (capped at 25) — an ALL-DIGIT ref (a number, or a digit-string like \"5\") is the count; any other value is a teaching error. Given together with 'from' (both or neither)."),
    bufferName: tool.schema.string().optional().describe("Name of the clipboard buffer (defaults to 'default'). Allows managing multiple clipboards. Note: the buffer 'last_write' is auto-filled by every WRITE (overwritten per WRITE) — no parameter to request it.")
  },

  execute: async (args: any, context: any) => {
    try {
      const mode = (args.mode || "MOVE").toUpperCase();
      const bufferKey = args.bufferName || "default";
      const cwd = context.directory || process.cwd();

      // 1. CLEAR BUFFER (Part F: the buffer op — the buffer's line count
      // AFTER the op = 0)
      if (mode === "CLEAR") {
        delete clipboardBuffers[bufferKey];
        return `Cleared buffer '${bufferKey}' - buffer: 0 lines.`;
      }

      // 1b. PEEK BUFFER (Part E) — a bounded preview of the named buffer:
      // NEVER the full content. Default = the line count + 3 head + 3 tail
      // lines (each echoed capped at 40 chars; blank lines are SKIPPED when
      // picking the echoed lines). A 'from' + 'count' pair (given together)
      // gives a bounded window, capped at 25 lines. Full content: PASTE the
      // buffer to a file and read it.
      if (mode === "PEEK") {
        const buffer = clipboardBuffers[bufferKey];
        if (!buffer || buffer.length === 0) {
          return `Error: Clipboard buffer '${bufferKey}' is empty. Perform a COPY or CUT first.`;
        }
        const hasFrom = refPresent(args.from);
        const hasCount = refPresent(args.count);
        if (hasFrom !== hasCount) {
          return `Error: 'from' and 'count' must be given together.`;
        }
        const echo = (l: string) => (l.length > 40 ? l.slice(0, 40) + "..." : l);
        const quoted = (l: string) => `'${echo(l)}'`;
        if (hasCount) {
          // Hardening item 5 (2026-10-21, plan25): the live channel stringifies
          // schema integers, so a digit-string 'from'/'count' is what the
          // window call actually hits — the SAME /^\\d+$/ treatment as the
          // ref fields (a non-numeric or fractional value keeps the old
          // teaching wording, quoting the value AS GIVEN).
          const toNum = (v: Ref | undefined): number | null => {
            if (typeof v === "number") return Number.isInteger(v) ? v : null;
            if (typeof v === "string" && /^\d+$/.test(v)) return parseInt(v, 10);
            return null;
          };
          const from = toNum(args.from);
          const count = toNum(args.count);
          if (from === null || from < 1) {
            return `Error: from ${args.from} is not a 1-based line number in buffer '${bufferKey}'.`;
          }
          if (count === null || count < 1) {
            return `Error: count ${args.count} is not a positive line count.`;
          }
          const total = buffer.length;
          if (from > total) {
            const word = total === 1 ? "line" : "lines";
            return `Error: line ${from} is out of range in buffer '${bufferKey}' (the buffer has ${total} ${word}).`;
          }
          const window = Math.min(count, 25);
          const slice = buffer.slice(from - 1, from - 1 + window);
          return `Peeked buffer '${bufferKey}': lines ${from}..${from - 1 + slice.length} of ${total} — ${slice.map(quoted).join(", ")}`;
        }
        const nonBlank: number[] = [];
        for (let i = 0; i < buffer.length; i++) {
          if (buffer[i].trim().length > 0) nonBlank.push(i + 1);
        }
        const pick = (idxs: number[]) => (idxs.length === 0 ? "(none)" : idxs.map((i) => quoted(buffer[i - 1])).join(", "));
        const lw = (m: number) => `${m} line${m === 1 ? "" : "s"}`;
        return `Peeked buffer '${bufferKey}': ${lw(buffer.length)} — head: ${pick(nonBlank.slice(0, 3))} ... tail: ${pick(nonBlank.slice(-3))}`;
      }

      // 1c. MAP BUFFER (Part G) — a buffer structure preview: the line
      // count + 3 head + 3 tail lines + a HEADING SKELETON (max 10, then
      // '+N more'). Lines are echoed VERBATIM WITH line numbers (no
      // truncation, blank lines kept — verbatim by design). Headings =
      // '^#{1,6} ' at column 0 (markdown H1-H6; indented '#' EXCLUDED) —
      // no file-type sniffing: a '#' comment in a code buffer is
      // self-evident from the verbatim echo. Head and tail never overlap:
      // for N <= 6 the tail is only the lines beyond the head.
      if (mode === "MAP") {
        const buffer = clipboardBuffers[bufferKey];
        if (!buffer || buffer.length === 0) {
          return `Error: Clipboard buffer '${bufferKey}' is empty. Perform a COPY or CUT first.`;
        }
        const total = buffer.length;
        // Hardening item 8 (2026-10-21): the line COUNT is already bounded by
        // design (3 head + 3 tail + max 10 headings), so LINE WIDTH was the
        // remaining leak — every echoed line is capped at 200 chars + '…'.
        const capAt = (s: string) => (s.length > 200 ? `${s.slice(0, 200)}…` : s);
        const entry = (i: number) => `${i}: '${capAt(buffer[i - 1])}'`;
        const lw = (m: number) => `${m} line${m === 1 ? "" : "s"}`;
        const head = Array.from({ length: Math.min(3, total) }, (_, k) => entry(k + 1));
        const tail: string[] = [];
        for (let i = Math.max(4, total - 2); i <= total; i++) tail.push(entry(i));
        const headings: number[] = [];
        for (let i = 0; i < total; i++) {
          if (/^#{1,6} /.test(buffer[i])) headings.push(i + 1);
        }
        const shown = headings.slice(0, 10);
        const extra = headings.length - shown.length;
        const headingPart = shown.length === 0
          ? "(none)"
          : shown.map(entry).join(", ") + (extra > 0 ? ` +${extra} more` : "");
        const tailPart = tail.length > 0 ? ` ... tail: ${tail.join(", ")}` : "";
        return `Mapped buffer '${bufferKey}': ${lw(total)} — head: ${head.join(", ")}${tailPart} — headings: ${headingPart}`;
      }

      // 2. PASTE FROM BUFFER
      if (mode === "PASTE") {
        if (!args.dstFile) return "Error: 'dstFile' is required for PASTE mode.";
        const buffer = clipboardBuffers[bufferKey];
        if (!buffer || buffer.length === 0) {
          return `Error: Clipboard buffer '${bufferKey}' is empty. Perform a COPY or CUT first.`;
        }

        const dstPath = path.resolve(cwd, args.dstFile);
        const dstViolation = sandboxCheck(cwd, args.dstFile);
        if (dstViolation) return dstViolation;
        let dstText = "";
        let dstLines: string[] = [];
        if (fs.existsSync(dstPath)) {
          dstText = fs.readFileSync(dstPath, "utf-8");
          dstLines = dstText.split(/\r?\n/);
        } else {
          fs.mkdirSync(path.dirname(dstPath), { recursive: true });
        }
        // Hardening item 4 (2026-10-21): the destination's EOL is detected
        // ONCE and the file is written back with it — no whole-file CRLF->LF
        // churn — joinLines() puts the file's OWN EOL on every line (the
        // inserted buffer lines get their '\r' there, no double-CR artifact).
        const eol = detectEol(dstText);

        // Hardening item 3 (2026-10-21): the EOF index is countLines()-based,
        // so appending to a trailing-newline file inserts BEFORE its blank
        // tail ("a\n" + "b" = "a\nb\n", no spurious blank line) and a NEW
        // file inserts at 0 (no leading blank line).
        let insertIdx = eofIndex(dstLines);
        let insertNote = " (at EOF)";
        if (refPresent(args.targetMarker)) {
          const target = resolveRef(args.dstFile, "Target marker", dstText, args.targetMarker);
          if ("error" in target) return target.error;
          insertIdx = target.line; // 1-based line number: insert right AFTER that line
          insertNote = ` (inserted after line ${insertIdx} in '${args.dstFile}')`;
        }

        dstLines.splice(insertIdx, 0, ...buffer);
        fs.writeFileSync(dstPath, joinLines(dstLines, eol), "utf-8");

        // Part F: the resolved range = the buffer's own lines (1..N), the
        // echo = the buffer's first line; the buffer is PRESERVED, so the
        // count AFTER the op is the same. Part F + hardening item 7: the
        // suffix names WHERE the block landed (the insertion line, or EOF).
        return opLine("Pasted", buffer.length, `from buffer '${bufferKey}' into '${args.dstFile}'`, `1..${buffer.length}`, buffer[0] ?? "", buffer.length, undefined, insertNote);
      }

      // 2b. REPLACE SPAN IN DST — the line-anchored span (start..end inclusive) of
      // an EXISTING dstFile is replaced by the named buffer's content. PASTE-like
      // buffer semantics: the buffer is PRESERVED (not consumed). All checks run
      // BEFORE any fs write — no partial writes on rejection.
      if (mode === "REPLACE") {
        if (!args.dstFile) return "Error: 'dstFile' is required for REPLACE mode.";
        if (!refPresent(args.startMarker)) return "Error: 'startMarker' is required for REPLACE mode.";
        if (!refPresent(args.endMarker)) return "Error: 'endMarker' is required for REPLACE mode.";

        const dstPath = path.resolve(cwd, args.dstFile);
        const dstViolation = sandboxCheck(cwd, args.dstFile);
        if (dstViolation) return dstViolation;
        // REPLACE never creates a file — there is no span to replace in a nonexistent file.
        if (!fs.existsSync(dstPath)) return `Error: File '${args.dstFile}' not found.`;

        const buffer = clipboardBuffers[bufferKey];
        if (!buffer || buffer.length === 0) {
          return `Error: Clipboard buffer '${bufferKey}' is empty. Perform a COPY or CUT first.`;
        }

        const dstText = fs.readFileSync(dstPath, "utf-8");
        const dstLines = dstText.split(/\r?\n/);
        const start = resolveRef(args.dstFile, "Start marker", dstText, args.startMarker);
        if ("error" in start) return start.error;
        const end = resolveRef(args.dstFile, "End marker", dstText, args.endMarker);
        if ("error" in end) return end.error;
        const startIdx = start.line - 1;
        const endIdx = end.line - 1;
        if (startIdx > endIdx) {
          return `Error: Start marker '${args.startMarker}' is after end marker '${args.endMarker}' in ${args.dstFile}.`;
        }

        const replacedCount = endIdx - startIdx + 1;
        const eol = detectEol(dstText);
        dstLines.splice(startIdx, replacedCount, ...buffer);
        fs.writeFileSync(dstPath, joinLines(dstLines, eol), "utf-8");
        const fileNow = eofIndex(dstLines);

        // Part F + hardening item 7 (2026-10-21): the in-parens group names
        // the OLD span AND the NEW span (final line numbering) AND the file's
        // new line count — a length-changing op makes the line-number refs the
        // next call would use go stale, so the feedback states them; the
        // echo = the buffer's first line (the new content); the buffer is
        // PRESERVED, so the count AFTER the op is the same.
        const newEnd = startIdx + buffer.length;
        const mid = `old ${startIdx + 1}..${endIdx + 1} -> new ${startIdx + 1}..${newEnd}, file now ${fileNow} line${fileNow === 1 ? "" : "s"}`;
        return opLine("Replaced", replacedCount, `in '${args.dstFile}' with buffer '${bufferKey}'`, `${startIdx + 1}..${endIdx + 1}`, buffer[0] ?? "", buffer.length, mid);
      }

      // 2b2. WRITE (Part D) — replace a line-anchored region of dstFile with
      // direct text (bufferless — "no DELETE + extra write call"). ONE span:
      // startMarker..endMarker (marker-or-number per S2). A LIST: a 'regions'
      // array of { start, end } — ALL regions resolve against the PRE-call
      // file state and are applied HIGHEST LINE -> LOWEST (no shifting), with
      // an overlap check (teaching, with the ACTUAL line numbers — the lower
      // span is named first). WRITE CREATES the target file if absent
      // (flagged detail #2, approved): there is NO missing-file guard — an
      // absent file is the EMPTY state for ref resolution (the teaching
      // not-found / out-of-range errors fire as usual), and a successful
      // write creates the file. PASTE's existing behavior is unchanged.
      // Part F: one line per applied op (descending for the list form) + a
      // summary line (multi-op only).
      if (mode === "WRITE") {
        if (!args.dstFile) return "Error: 'dstFile' is required for WRITE mode.";
        if (typeof args.text !== "string") return "Error: 'text' is required for WRITE mode.";
        const hasRegions = Array.isArray(args.regions);
        const hasSingle = refPresent(args.startMarker) || refPresent(args.endMarker);
        if (hasRegions && hasSingle) {
          return "Error: the 'regions' list takes the span alone (no single markers).";
        }
        // Hardening item 6 (2026-10-21): an EMPTY 'regions' list is a REJECTED
        // form (a teaching error), not a silent no-op write.
        if (hasRegions && args.regions.length === 0) {
          return "Error: the 'regions' list is empty (give at least one region).";
        }

        const dstPath = path.resolve(cwd, args.dstFile);
        const dstViolation = sandboxCheck(cwd, args.dstFile);
        if (dstViolation) return dstViolation;
        const dstText = fs.existsSync(dstPath) ? fs.readFileSync(dstPath, "utf-8") : "";
        // Hardening item 4 (2026-10-21): the file's EOL is detected ONCE; the
        // text's lines stay EOL-free (they feed the 'last_write' buffer) and
        // get the file's EOL re-attached on write (a CRLF file keeps CRLF).
        const eol = detectEol(dstText);
        const newLines = textToLines(args.text);

        // Resolve the spans — ALL against the PRE-call file state.
        const spans: { start: number; end: number }[] = [];
        if (hasRegions) {
          for (const region of args.regions) {
            const start = resolveRef(args.dstFile, "Region start", dstText, region.start);
            if ("error" in start) return start.error;
            const end = resolveRef(args.dstFile, "Region end", dstText, region.end);
            if ("error" in end) return end.error;
            if (end.line < start.line) {
              return `Error: End marker '${region.end}' not found after start marker in ${args.dstFile}.`;
            }
            spans.push({ start: start.line, end: end.line });
          }
        } else {
          if (!refPresent(args.startMarker) || !refPresent(args.endMarker)) {
            return "Error: 'startMarker' and 'endMarker' are both required for WRITE mode.";
          }
          const start = resolveRef(args.dstFile, "Start marker", dstText, args.startMarker);
          if ("error" in start) return start.error;
          const end = resolveRef(args.dstFile, "End marker", dstText, args.endMarker);
          if ("error" in end) return end.error;
          if (end.line < start.line) {
            return `Error: End marker '${args.endMarker}' not found after start marker in ${args.dstFile}.`;
          }
          spans.push({ start: start.line, end: end.line });
        }

        // Overlap check (list form): two spans sharing ANY line overlap.
        if (spans.length > 1) {
          const asc = [...spans].sort((a, b) => a.start - b.start);
          for (let i = 1; i < asc.length; i++) {
            if (asc[i].start <= asc[i - 1].end) {
              const a = asc[i - 1];
              const b = asc[i];
              return `Error: overlapping spans (lines ${a.start}..${a.end} and ${b.start}..${b.end}) in ${args.dstFile}.`;
            }
          }
        }

        // Apply HIGHEST LINE -> LOWEST (the pre-call resolution keeps the
        // lower spans' positions valid — no shifting). All checks ran
        // before any write — no partial state on rejection.
        const work = dstText.split(/\r?\n/);
        const desc = [...spans].sort((a, b) => b.start - a.start);
        for (const span of desc) {
          work.splice(span.start - 1, span.end - span.start + 1, ...newLines);
        }
        fs.mkdirSync(path.dirname(dstPath), { recursive: true });
        fs.writeFileSync(dstPath, joinLines(work, eol), "utf-8");
        const fileNow = eofIndex(work);
        // Hardening item 7 (2026-10-21): each per-op line names the OLD span
        // (pre-call) AND the NEW span in the file's FINAL line numbering (a
        // LOWER region shifts every HIGHER one by its length delta — the
        // shift is summed over the regions below) AND the file's new line
        // count: line-number refs go stale after a length-changing op, so
        // the numbers the next call needs are stated. One line per op,
        // descending, then the summary line (UNCHANGED).
        const asc = [...spans].sort((a, b) => a.start - b.start);
        const shift = new Map<{ start: number; end: number }, number>();
        let acc = 0;
        for (const sp of asc) {
          shift.set(sp, acc);
          acc += newLines.length - (sp.end - sp.start + 1);
        }
        const feedback: string[] = [];
        for (const span of desc) {
          const s = span.start + (shift.get(span) ?? 0);
          const newSpan = newLines.length === 0 ? "new (empty)" : `new ${s}..${s + newLines.length - 1}`;
          feedback.push(opLine("Wrote", newLines.length, `to '${args.dstFile}'`, `${span.start}..${span.end}`, newLines[0] ?? "", null, `old ${span.start}..${span.end} -> ${newSpan}, file now ${fileNow} line${fileNow === 1 ? "" : "s"}`));
        }
        // Part H (S4): the last_write auto-buffer — the WRITE text is
        // auto-stored in the buffer 'last_write' (overwritten per WRITE —
        // automatic, NO parameter: poka-yoke), for direct reuse when an
        // anchor resolution fails. The WRITE feedback line is UNCHANGED
        // (probe-pinned) — the auto-store is silent. An explicit
        // bufferName arg does not divert it.
        clipboardBuffers["last_write"] = newLines;
        if (spans.length > 1) {
          feedback.push(`Wrote ${spans.length} regions into '${args.dstFile}' (${newLines.length * spans.length} lines total).`);
        }
        return feedback.join("\n");
      }

      // 2c. COPY — yank to buffer (Part C). THREE input forms, exactly one:
      // a single-ref pair (startMarker..endMarker — the S1 form, byte-
      // compatible), a 'refs' LIST (each ref selects ONE line), or a 'text'
      // key (direct text -> buffer). COPY keeps the REPLACE-into-buffer
      // semantics: the buffer is REPLACED in every form (never appended —
      // that is APPEND). Part F feedback (one line): resolved line range +
      // line count + truncated first-line echo; the buffer's line count
      // AFTER the op (buffer op).
      if (mode === "COPY") {
        const a = resolveAssembly("COPY", args, cwd);
        if ("error" in a) return a.error;
        clipboardBuffers[bufferKey] = a.lines;
        return assemblyFeedback("Copied", "into", a, bufferKey, a.lines.length);
      }

      // 2d. APPEND (Part C) — append to the named buffer, created if absent:
      // stepwise assembly without flags. The SAME input forms as COPY.
      if (mode === "APPEND") {
        const a = resolveAssembly("APPEND", args, cwd);
        if ("error" in a) return a.error;
        const before = clipboardBuffers[bufferKey] ?? [];
        clipboardBuffers[bufferKey] = [...before, ...a.lines];
        return assemblyFeedback("Appended", "to", a, bufferKey, before.length + a.lines.length);
      }

      // 3. ANCHOR EXTRACTION (MOVE, CUT, DELETE)
      if (!args.srcFile || !refPresent(args.startMarker) || !refPresent(args.endMarker)) {
        return `Error: 'srcFile', 'startMarker', and 'endMarker' are required for mode ${mode}.`;
      }

      const srcPath = path.resolve(cwd, args.srcFile);
      const srcViolation = sandboxCheck(cwd, args.srcFile);
      if (srcViolation) return srcViolation;
      // MOVE: guard the destination BEFORE any write — a rejected dst must not leave the
      // source already cut (no partial writes on rejection).
      if (mode === "MOVE" && args.dstFile) {
        const moveViolation = sandboxCheck(cwd, args.dstFile);
        if (moveViolation) return moveViolation;
      }
      if (!fs.existsSync(srcPath)) return `Error: Source file '${args.srcFile}' not found.`;
      // MOVE: the missing-dst check runs BEFORE any write too — a missing dst must not
      // leave the source already cut (no partial writes on rejection).
      if (mode === "MOVE" && !args.dstFile) {
        return "Error: 'dstFile' is required for MOVE mode.";
      }
      // Hardening item 2 (2026-10-21): the two MOVE paths may be spelled
      // differently yet resolve to the SAME file — the op is then a move-with-
      // shift INSIDE the file (pre-call line numbers + the insert shifted by
      // the removed block), NOT a cut plus a paste into itself.
      const dstPath = mode === "MOVE" ? path.resolve(cwd, args.dstFile) : "";
      const sameFile = mode === "MOVE" && dstPath.toLowerCase() === srcPath.toLowerCase();

      const srcRaw = fs.readFileSync(srcPath, "utf-8");
      const srcLines = srcRaw.split(/\r?\n/);

      const start = resolveRef(args.srcFile, "Start marker", srcRaw, args.startMarker);
      if ("error" in start) return start.error;
      const end = resolveRef(args.srcFile, "End marker", srcRaw, args.endMarker);
      if ("error" in end) return end.error;
      // The unified rule resolves both refs file-wide; an end resolved
      // BEFORE the start is the teaching end-not-found error CARRYING THE
      // FILE REFERENCE (S3 switch).
      if (end.line < start.line) {
        return `Error: End marker '${args.endMarker}' not found after start marker in ${args.srcFile}.`;
      }
      const startIdx = start.line - 1;
      const endIdx = end.line - 1;

      const extractedBlock = srcLines.slice(startIdx, endIdx + 1);
      // Part F (S3, all modes): one line per op — the resolved line range +
      // the line count + the truncated first-line echo; buffer ops add the
      // buffer's line count AFTER the op.
      const rangeText = `${start.line}..${end.line}`;

      // Save to named clipboard buffer for CUT
      if (mode === "CUT") {
        clipboardBuffers[bufferKey] = extractedBlock;
      }

      // Cut out lines from the source for CUT or DELETE (MOVE cuts only once
      // its destination checks pass — see the MOVE block), writing the
      // source's OWN EOL (hardening item 4).
      if (mode === "CUT" || mode === "DELETE") {
        const remainingLines = [
          ...srcLines.slice(0, startIdx),
          ...srcLines.slice(endIdx + 1)
        ];
        fs.writeFileSync(srcPath, joinLines(remainingLines, detectEol(srcRaw)), "utf-8");
      }

      // Return immediate feedback (Part F)
      if (mode === "DELETE") {
        return opLine("Deleted", extractedBlock.length, `from '${args.srcFile}'`, rangeText, extractedBlock[0] ?? "", null);
      }
      if (mode === "CUT") {
        return opLine("Cut", extractedBlock.length, `from '${args.srcFile}' into buffer '${bufferKey}'`, rangeText, extractedBlock[0] ?? "", extractedBlock.length);
      }

      // 4. IMMEDIATE MOVE (CUT + PASTE IN ONE STEP) — hardening item 1
      // (2026-10-21): EVERY destination check — the sandbox guard and the
      // dstFile presence above, the targetMarker resolution below — runs
      // BEFORE the source is touched, so a bad target leaves the source
      // byte-identical instead of already cut. The extracted block is ALSO
      // stashed in the buffer 'last_move_source' BEFORE the cut (the recovery
      // buffer for a destructive MOVE — see the description BUFFERS note).
      if (mode === "MOVE") {
        const dstExists = fs.existsSync(dstPath);
        const dstRaw = dstExists ? fs.readFileSync(dstPath, "utf-8") : "";
        let insertIdx: number;
        let insertNote: string;
        let insertAfter: number; // 0-based splice index into the write-back array
        let remaining: string[] | null = null; // set ONLY for a same-file MOVE

        if (sameFile) {
          const target = refPresent(args.targetMarker)
            ? resolveRef(args.srcFile, "Target marker", srcRaw, args.targetMarker)
            : null;
          if (target && "error" in target) return target.error;
          const spanLen = endIdx - startIdx + 1;
          if (target === null) {
            remaining = [...srcLines.slice(0, startIdx), ...srcLines.slice(endIdx + 1)];
            insertIdx = eofIndex(remaining);
            insertAfter = insertIdx;
            insertNote = " (at EOF)";
          } else if (target!.line < start.line) {
            // The target sits ABOVE the moved block: its pre-call line number
            // stays the splice index (the removal happens below it).
            remaining = [...srcLines.slice(0, startIdx), ...srcLines.slice(endIdx + 1)];
            insertIdx = target!.line;
            insertAfter = insertIdx;
            insertNote = ` (inserted after line ${insertIdx} in '${args.dstFile}')`;
          } else if (target!.line > end.line) {
            // The target sits BELOW the block: the removal shifts it UP by the
            // block's length, so the adjusted index is the FINAL line number.
            remaining = [...srcLines.slice(0, startIdx), ...srcLines.slice(endIdx + 1)];
            insertIdx = target!.line - spanLen;
            insertAfter = insertIdx;
            insertNote = ` (inserted after line ${insertIdx} in '${args.dstFile}')`;
          } else {
            return `Error: same-file MOVE target '${args.targetMarker}' (line ${target!.line}) is inside the moved block (lines ${start.line}..${end.line}) — pick a target OUTSIDE the block (move-with-shift keeps the block intact).`;
          }
        } else {
          insertIdx = eofIndex(dstExists ? dstRaw.split(/\r?\n/) : []);
          insertNote = " (at EOF)";
          if (refPresent(args.targetMarker)) {
            const target = resolveRef(args.dstFile, "Target marker", dstRaw, args.targetMarker);
            if ("error" in target) return target.error;
            insertIdx = target.line;
            insertNote = ` (inserted after line ${insertIdx} in '${args.dstFile}')`;
          }
          if (!dstExists) fs.mkdirSync(path.dirname(dstPath), { recursive: true });
        }

        clipboardBuffers["last_move_source"] = extractedBlock;
        const insertEol = detectEol(dstRaw);
        const insertedBlock = extractedBlock;
        if (sameFile) {
          (remaining as string[]).splice(insertAfter, 0, ...insertedBlock);
          fs.writeFileSync(srcPath, joinLines(remaining as string[], detectEol(srcRaw)), "utf-8");
        } else {
          // The source cut — every destination check has passed by now, so
          // this is the op's FIRST filesystem write (hardening item 1).
          const remainingSrc = [...srcLines.slice(0, startIdx), ...srcLines.slice(endIdx + 1)];
          fs.writeFileSync(srcPath, remainingSrc.join(detectEol(srcRaw)), "utf-8");
          const dstLines = dstExists ? dstRaw.split(/\r?\n/) : [];
          dstLines.splice(insertIdx, 0, ...insertedBlock);
          fs.writeFileSync(dstPath, joinLines(dstLines, insertEol), "utf-8");
        }

        return opLine("Moved", extractedBlock.length, `from '${args.srcFile}' to '${args.dstFile}'`, rangeText, extractedBlock[0] ?? "", null, undefined, insertNote);
      }

      return "Operation completed.";
    } catch (err: any) {
      return `block_transfer failed: ${err.message}`;
    }
  }
});
