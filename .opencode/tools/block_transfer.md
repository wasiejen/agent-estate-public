# block_transfer.ts — the multi-line block-transfer tool

Host-named custom tool (no `name` field — the file IS the tool name; the host names a tool by FILENAME).

## What it does

Line-anchored file surgery for multi-line blocks: MOVE (cut + paste in one call), COPY / APPEND (extract to a NAMED clipboard buffer — a single-ref pair, a `refs` list, or direct `text`), PASTE (buffer → file), REPLACE (swap a line-anchored span with a buffer), WRITE (swap a span with direct `text` — a single span or a `regions` list; creates the file if absent; the `last_write` buffer is auto-stored), CUT / DELETE, PEEK / MAP (bounded buffer inspection), CLEAR. No dense-numeral oldStrings — the anchor form sidesteps the mid-line / numeric-match failure modes of exact string edits.

## Implementation sketch

- Entry: `export default tool({ description, args, execute })`.
- THE UNIFIED ANCHOR RULE (approved proposal 2026-09-25_block_transfer-v2, Part A): every mode's startMarker / endMarker / targetMarker lookup routes through `resolveAnchor` / `matchAnchorLines` — ONE rule for ALL modes. Ref form: an ALL-DIGIT ref (a number, or a digit-string) = a 1-based line number; any OTHER string = a prefix marker. Matching: the file is split on `\n` (trailing `\r` ignored — CRLF-tolerant); an anchor A matches line L if L, after removing LEADING spaces/tabs, BEGINS with A verbatim (case-sensitive); A is ITSELF stripped of leading spaces/tabs (the plan25 fix — an anchor typed with the line's indentation matches); an all-whitespace anchor matches NOTHING; the anchor must match EXACTLY ONE line (non-unique → an error carrying the match count + first matches).
- Sandbox: every path arg must resolve inside the working directory or the Windows temp directory (`sandboxCheck`, called BEFORE any fs access — no partial writes on rejection).
- Buffers: session-scoped in-memory named clipboards (`clipboardBuffers`) — multiple buffers coexist in one session.

## Gotchas / lessons

- The old COPY mid-line substring tolerance is GONE and REPLACE trims the line's leading whitespace before the prefix match (the approved Part A decisions — swapping the general matching behavior is a change in `matchAnchorLines` ONLY).
- Out-of-sandbox paths fail CLOSED (no 1:1 mapping = no redirect; the intercept_observer R8 channel is what maps allowed roots).
- WRITE `regions` are ALL resolved against the PRE-call file state and applied HIGHEST LINE first (no shifting; overlapping spans are rejected with the actual line numbers).
- Knowledge notes (pointer-only): `knowledge/plugin_tools/2026-09-25_block_transfer.replace_mode.md` + `2026-09-26_block_transfer-v2-s3-write-peek-feedback.md`.

## Tests

`tests/block_transfer.smoke.mjs` + `tests/block_transfer.sandbox.smoke.mjs`.
