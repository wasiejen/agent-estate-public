# TASK — plan25: block_transfer anchor fix (integer refs + trim rule + candidate hints)

Worker: `worker_Q3S_245K_slow`. Stay on the current checkout (`opencode_test`).
Maintainer GO 2026-09-27 (direct session, round 2). NO fuzzy resolution —
resolution stays fail-closed exactly-one-match; the fuzzy value lives in the
ERROR MESSAGE only.

## Background (planner-verified facts, measured 2026-09-27 live + in code)
1. The host's constrained decoding of the `anyOf: [string, integer]` ref schema
   stringifies integers in the LIVE channel (measured: `startMarker: 2` →
   `Error: Start marker '2' not found`). The type-aware `resolveRef` number
   branch (block_transfer.ts L136-142) is therefore dead in the live channel.
   Unit-level (direct `execute` with native numbers) it works — S15 pin 108.
2. `matchAnchorLines` (L46-56) strips LEADING spaces/tabs from the LINE but
   never from the anchor (the rule comment L38-40 says so) → an anchor typed
   with the line's indentation can NEVER match (measured live: end-marker
   `   indented line five` against a line with 3 leading spaces → not found;
   the same anchor without the spaces → match).
3. `notFoundError` (L76-78) carries no candidate hints.

## The fix (WHAT — exact end states; HOW is your call inside the DoD)
**(a) Digit-string line refs.** In `resolveRef` (and hence every ref side:
`startMarker`/`endMarker`/`targetMarker`, `refs[]` items, `regions[].start/end`):
a ref that is a NUMBER or a string matching `/^\d+$/` resolves as a 1-based
line number against the PRE-call file state; any other string is a prefix
marker (unchanged). Keep the existing number branch (unit/probe calls pass
native numbers). Errors stay byte-identical to the current number path:
`0` (or `"0"`) → `Error: ${label} 0 is not a 1-based line number in ${fileRef}.`;
beyond the line count → the existing `refOutOfRangeError` (with the count).
Update the Part B header comment (L103-113) and the description REFS section
(L261) to the new rule: an all-digits ref (number or digit-string) is a line
number; any other string is a prefix marker. Schema UNCHANGED.
**(b) Anchor normalization.** `matchAnchorLines`: strip leading spaces/tabs
from the ANCHOR as well, before the `startsWith` (line-side strip unchanged;
case-sensitive verbatim otherwise). An anchor that is empty AFTER trimming
(all-whitespace) matches NO line (never match-all). Update the rule comment
(L35-43) + the description where the prefix rule is stated.
**(c) Candidate hints in the not-found error.** `notFoundError` gains the
file text and, when no line matches, appends ` Closest lines: ` + up to 5
candidates, each `${lineNo}: '${first 40 chars of the line}'` (`...` appended
when cut, the line's `\r` stripped, original indentation shown), joined by
`", "`. "Closest" = deterministic: length of the longest common prefix of the
trimmed anchor and each trimmed line; top 5 by that length descending, ties by
ascending line number; only lines sharing ≥ 1 char qualify; when NO line
qualifies the message stays byte-identical to today's. The non-unique,
empty-buffer, ref-out-of-range, after-start-marker, and sandbox error strings
are UNTOUCHED (pinned). The quoted anchor in the error stays AS GIVEN (not
trimmed).

## Scope (files + bounded areas)
- `.opencode/tools/block_transfer.ts` (673 lines) — L24-145 (rule comments +
  matcher + errors + resolveRef), L253-270 (the description string: the REFS
  section + the prefix-rule wording).
- `.opencode/plugin/tests/block_transfer.smoke.mjs` (314 lines, `chk(` pattern,
  temp-dir fixtures, `finish()` at end) — ≥ 4 new checks: (1) digit-string refs
  give the same byte-exact result as the equivalent numeric call; (2) `"0"`
  not-1-based + out-of-range digit-string, both byte-exact; (3) an indented
  anchor matches its line + an all-whitespace anchor matches nothing; (4)
  candidate-hint format byte-exact (one with candidates, one without = old
  format). Existing 123 checks must stay green (re-pin in the same commit if a
  byte-exact pin is affected).
- `.opencode/plugin/tests/block_transfer.sandbox.smoke.mjs` (175 lines) —
  re-pin ONLY if a pin is affected (expected: none).
- `.opencode/plugin/probes/handover_probe.mjs` (7839 lines) — S15 section
  L3523-3817: re-pin any existing check whose pinned string changes (known
  not-found pins at ~L3732 and ~L7018 — they stay green iff no line shares ≥1
  char with the anchored prefix; re-pin in the same commit if not), add ≤ 4
  new S15 checks for (a)/(b)/(c); update the S15 header count (L3523) + the
  section-sum annotation (~L940) in the SAME commit.

## Definition of done (measured, in your handover)
- block_transfer smokes: 123 + n green (report n and the total); sandbox smoke
  64/64 (or re-pinned total).
- probe: 340 + m green (report m; the `PROBE handover: <t>/<t> PASS` line
  agrees with the updated annotation).
- gate: `./.venv/Scripts/python.exe -m pytest -q` → 459 passed + 1 warning;
  `./.venv/Scripts/ruff.exe check --select F .` → F=0 (FST code untouched).
- The five untouched error strings above remain byte-identical (smoke/probe
  pins prove it).
- Live-channel acceptance PENDING the maintainer's next restart (unit-level
  green is this DoD — the established convention, cf. #102).
- Checkpoint commits per verified unit (code only); `TODO.md` (append
  discrepancies only — no new entry expected) + `handover_task_to_planner.md`
  ride the FINAL commit (carrying the code commits' hashes, never its own —
  the hash is recorded in the planner's bookkeeping commit).

## DO-NOT-touch
FST code (`*.py` at repo root + `tests/`), `.opencode/maintainer/**`,
`opencode.jsonc`, the NAP / loop folder, `.opencode/agent/prompts/**` (edit-
deny anyway), probe sections other than S15 + the annotation line, smoke files
other than the two named, other custom tools, `AGENTS.md`.

## Design forks
If a chosen reading of (a)/(b)/(c) seems to clash with an existing pinned
byte-exact behavior, the pin WINS — note the clash in the handover, do not
silently re-pin. A different candidate metric is NOT approved — keep the
spec's common-prefix rule.
