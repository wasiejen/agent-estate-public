# plan25 summary — bt anchor fix (planner ses_f20d1b39dffefE8ge0hH7jbgAn, 2026-09-27)

Task: block_transfer anchor fix — (a) digit-string line refs, (b) anchor-side
trim rule, (c) common-prefix candidate hints in the not-found error. NO fuzzy
resolution (resolution stays fail-closed exactly-one-match). Spec `fafdee8`.
Worker: worker-25 `worker_Q3S_245K_slow` (ses_f1d622087ffeGu1toSY7Xzt1fw).

## Root causes (planner-measured live BEFORE the spec, 2026-09-27)
- (a) the host's constrained decoding of the `anyOf: [string, integer]` ref
  schema stringifies integers in the LIVE channel (`startMarker: 2` →
  "Start marker '2' not found") — the type-aware `resolveRef` number branch
  was dead in the live channel (unit/probe calls pass native numbers).
- (b) `matchAnchorLines` trimmed the line's leading whitespace but used the
  anchor as typed → an anchor typed with the line's indentation could never
  match (measured: 3-space end-marker fails, trimmed succeeds).
- (c) `notFoundError` carried no candidate hints.

## What landed (worker-25, planner-verified from files)
- `2b50fee` (a): an all-digit ref (number OR `/^\d+$/` string) resolves as a
  1-based line number on every ref side (markers, `refs[]`,
  `regions[].start/end`, `targetMarker`); errors byte-identical to the number
  path; schema UNCHANGED; the five arg `.describe()` strings updated (the old
  "type decides" wording was now false in the live channel — the text the
  model reads when choosing the ref format).
- `b2e3963` (b): leading spaces/tabs stripped from the anchor before the
  match; an all-whitespace anchor matches NO line (never match-all); rule
  comment + description ANCHORS section updated.
- `6616689` (c): the not-found error appends ` Closest lines: ` + up to 5
  candidates (longest common prefix of trimmed anchor/line, ties by line asc,
  ≥1 char to qualify, 40-char echo cap, original indentation shown, `\r`
  stripped); byte-identical to the old format when no line qualifies. Probe
  S15 +4 checks (341-344), S15=16, section-sum annotation 344/344 in the SAME
  commit.
- `7ddae1d`: bookkeeping — TODO **#104** (the S31 drift-guard equivalence
  note is stale in the anchor-trim dimension: the tool now trims the anchor,
  the plugin core `matchAnchorPrefixLines` does not — comment fix or
  core-side trim = a maintainer call) + worker handover.

## Verification (planner: from files + targeted spot re-run — his
2026-09-23_00-12 ruling, no full gate re-run)
- `block_transfer.smoke.mjs` **131/131** (123 + 8 new; re-run by the planner).
- `block_transfer.sandbox.smoke.mjs` 64/64 (no pin affected).
- probe **344/344 PASS** (340 + 4; the PASS line agrees with the updated
  annotation, S15=16).
- pytest 459 passed + 1 warning (known #10), ruff F=0 — FST code untouched.
- NO re-pins needed: all six pinned byte-exact not-found pins (smoke
  r10/rA1/rA5/rW2, probe 114 ~L3732, probe 306 ~L7018) use anchors sharing
  zero chars with every file line → unchanged (the spec's prediction held).
- Diff audit (planner): the digit-string branch, the anchor-side trim, and
  the hint algorithm match the spec; schema types untouched.

## Deliberately not done
- Live-channel acceptance — pending the maintainer's next restart (unit-
  level green is the DoD; cf. #102).
- The plugin core `matchAnchorPrefixLines` unchanged (out of plan25 scope;
  #104 filed instead — an R3-gate behavior change needs his ruling).

## Friction (logged via the friction channel)
- Worker's entry (13-53): the spec's S15 probe range (L3523-3817) was ~28
  lines short (S15 ends at L3845) + the "no new TODO entry expected" DoD
  assumption was slightly off (#104 was genuine).
- Planner's entry: the host's "consecutive tool errors" warning false-alarms
  during deliberate error-path measurement (live root-cause probes).

## Queue
Next unit: **#92 build** (the pre-compaction dump saves BOTH the markdown
dump AND the raw JSON snapshot — scope: `preCompactionDump` in
`compact_memory.ts` L183 + call site L380 + smoke/probe re-pin; spec staged
from the entry's acceptance, worker worker_Q3S_245K_slow). Then #99 research
(flexible per-dispatch keepToken; source `opencode-dev` 1.18.32 in the
scratchpad).
