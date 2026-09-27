# Handover task → planner (worker-25 `worker_Q3S_245K_slow`, 2026-09-27)

Task: plan25 — block_transfer anchor fix: (a) digit-string line refs, (b)
anchor-side trim, (c) common-prefix candidate hints in the not-found error.
NO fuzzy resolution (resolution stays fail-closed exactly-one-match).
Spec: `handover_task.md` (committed fafdee8). Branch `opencode_test` (stayed).

## What changed (three green checkpoint commits, code only)

**Commit 2b50fee — fix (a) digit-string line refs** (`.opencode/tools/block_transfer.ts`)
- `resolveRef`: a ref that is a NUMBER or a string matching `/^\d+$/` resolves
  as a 1-based line number against the PRE-call file state; any other string
  is a prefix marker (unchanged). The existing number branch is preserved
  (unit/probe calls pass native numbers). Errors byte-identical to the
  current number path: `0` / `"0"` → `Error: ${label} 0 is not a 1-based line
  number in ${fileRef}.`; beyond the count → the existing `refOutOfRangeError`.
  Every ref side is covered (single markers, `refs[]` items, `regions[].start/
  end`, `targetMarker`) — all route through `resolveRef`.
- Docs: Part B header comment (L103-113), the description REFS section (L261),
  and — deliberately beyond the spec's named L253-270 range — the five arg
  `.describe()` strings (startMarker/endMarker/targetMarker/refs/regions):
  the old "the TYPE decides (no string sniffing: the string '42' is a prefix
  MARKER)" wording was now FALSE and is the live-channel text the model reads
  when choosing the ref format — leaving it stale would steer the live
  channel AWAY from the fix. Schema types UNCHANGED (spec: "Schema UNCHANGED").
- Smoke: 3 new B2(a) checks (digit-string pair = byte-exact same result as the
  numeric call; `"0"` not-1-based byte-exact; out-of-range digit-string
  byte-exact with the count).

**Commit b2e3963 — fix (b) anchor-side trim** (`.opencode/tools/block_transfer.ts`)
- `matchAnchorLines`: leading spaces/tabs are stripped from the ANCHOR before
  the `startsWith` (line-side strip unchanged; case-sensitive verbatim
  otherwise); an anchor empty after trimming (all whitespace) matches NO line
  (never match-all).
- Docs: Part A rule comment (L35-43) + the description ANCHORS section
  (prefix-rule wording). Sandbox-smoke description pins unaffected
  ("INCLUSIVE", "append at EOF", first sentence all preserved).
- Smoke: the stale L85 LABEL re-labeled ("anchor WITH leading whitespace never
  matches (used as typed)" → "trimmed before the match; here BOTH lines match
  → null via non-unique") — the pinned VALUE (`null`) is unchanged, so no
  re-pin; 2 new B2(b) checks (indented anchor matches its line, echo keeps
  original indentation; all-whitespace anchor → byte-identical OLD not-found
  format, no hint).

**Commit 6616689 — fix (c) candidate hints** (tool + smoke + probe)
- `notFoundError(fileRef, label, anchor, fileText)`: appends ` Closest lines: `
  + up to 5 candidates, each `<lineNo>: '<first 40 chars of the line>'`
  (`...` appended when cut, the line's `\r` stripped, original indentation
  shown), joined by `", "`. "Closest" = deterministic: length of the longest
  common prefix of the trimmed anchor and each trimmed line; top 5 by that
  length descending, ties by ascending line number; only lines sharing ≥ 1
  char qualify; no qualifier → message byte-identical to today's. The quoted
  anchor stays AS GIVEN (not trimmed). The five pinned error strings
  (non-unique, empty-buffer, ref-out-of-range, after-start-marker, sandbox)
  are untouched.
- Smoke: 3 new B2(c) checks (with-candidates byte-exact; no-candidates = old
  format byte-identical; 6 qualifying lines → exactly 5 + the >40-char echo
  cap).
- Probe (`handover_probe.mjs`, S15 only + annotation): 4 new checks 341-344
  (a)/(b)/(c-ordering)/(c-bounds); S15 header count 12 → 16; the section-sum
  annotation updated in the SAME commit (S15=16, `340/340` → `344/344`).

## NO re-pins were needed (spec's "pin wins" fork never fired)

Every existing byte-exact not-found pin was checked against the new hint rule
before committing: all six (smoke r10/rA1/rA5/rW2, probe check 114 ~L3732,
probe check 306 ~L7018) use anchors that share ZERO chars with every file
line (or an empty/absent file), so every one stayed byte-identical and green.
The S31 drift guard (check 318) stays green too — its fixtures use only
no-leading-whitespace anchors ("Dup", "h1"). See #104 for the consequence.

## Measured verification (all green)

- `node .opencode/plugin/tests/block_transfer.smoke.mjs` → **131/131**
  (123 existing + 8 new; spec DoD "123 + n" → **n = 8**)
- `node .opencode/plugin/tests/block_transfer.sandbox.smoke.mjs` → **64/64**
  (no pin affected, no re-pin — as expected by the spec)
- `node .opencode/plugin/probes/handover_probe.mjs` → **PROBE handover:
  344/344 PASS** (340 existing + 4 new; spec DoD "340 + m" → **m = 4**); the
  PASS line agrees with the updated annotation (S15=16, 344/344)
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed, 1 warning**
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed! (F=0)**
  — FST code untouched

## TODO entries

- **#104 (open, filed by me)** — doc/code discrepancy found while landing
  fix (b): the S31 drift-guard comment claims the tool's `matchAnchorLines`
  is equivalent to the plugin core's `matchAnchorPrefixLines` ("the S1
  unified rule, 0d85a8c"), but the tool now trims the anchor and the core
  (`intercept_observer_core.ts`) does not; check 318's fixtures can't catch a
  re-divergence in that dimension. The core was deliberately left unchanged
  (out of plan25 scope; an R3-gate behavior change is a maintainer call).
- No other TODO entries appended. (The spec's "no new entry expected" was
  slightly off — the S31 note is a genuine discrepancy; flagged via the
  friction channel too.)

## Deliberately NOT done

- **Live-channel acceptance** — pending the maintainer's next restart
  (unit-level green is this DoD; the established convention, cf. #102).
- The five arg `.describe()` strings were updated (noted above) — the only
  edit beyond the spec's named line ranges; schema types and all behavior
  otherwise exactly per spec.
- The plugin core `matchAnchorPrefixLines` and S31 checks were NOT touched
  (DO-NOT-touch + #104 filed instead).
- No fuzzy resolution anywhere — resolution stays fail-closed exactly-one-
  match; the fuzzy value lives in the ERROR MESSAGE only (per spec).

## Notes for the planner

- New S15 check IDs 341-344 continue from the global max (340).
- Baseline before the task: smoke 123/123, sandbox 64/64, probe 340/340,
  pytest 459+1w, ruff F=0 — everything above measured on top of that.
- The spec's S15 range (L3523-3817) was ~28 lines short: S15 actually ends
  at L3845 (check 263); the new checks were inserted after 263.
