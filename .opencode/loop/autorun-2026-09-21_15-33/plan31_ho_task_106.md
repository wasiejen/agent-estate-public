# Task spec — plan31 (unit 2): TODO #106 — the edit-hint / edit-fuzzy feedback line states APPLIED vs REJECTED

Worker: `worker_Q3S_245K_slow` (verified live in `opencode.jsonc`, 2026-09-28).

## Goal
One unambiguous outcome token per edit-fuzzy outcome, visible on the TOOL RESULT
(the agent's only perception channel — it cannot see its own pre-mutation args,
MEM-0101):
- **APPLIED** — the mutating edit-fuzzy resolved (oldString mutated, the edit
  succeeds): the feedback line carries `applied` + the resolved d.
- **REJECTED** — every fail-closed hint outcome (0 raw + no unique candidate,
  and the >1 raw ambiguous case): the feedback line carries `rejected`
  (the existing fields — line/cands/reason/best-d — unchanged).

Evidence (2026-09-26_12-15 feedback, TODO #106): a NAP edit returned
`hint reason=d-too-high best-d=24` — the line reads like a rejection, so the
agent retries/verifies uselessly; and the APPLIED case (the fuzzy-edit
mutation) delivers NOTHING on the tool result today (the hint is deliberately
not stored — `intercept_observer.ts` L1458-1459 `hint.verdict !== "fuzzy-edit"`),
so a successful mutation is invisible to the agent.

## The change (settled design; HOW within the files is yours)
`runEditFuzzy` (`intercept_observer.ts` ~L1224-1308) + the after-hook
(~L1310-1490) — the evidence strings are the single source (the log line and
the delivered hint share them):
1. **APPLIED**: the `fuzzy-edit` evidence becomes
   `fuzzy-edit applied orig=<t40> len=<n> d=<0|1> value=<t40>` (token right
   after `fuzzy-edit`). The after-hook now STORES + DELIVERS this line on the
   tool result — the delivered edit-hint line is no longer failure-only
   (the token makes every delivered line self-describing; the R8 notes
   delivery is unchanged).
2. **REJECTED**: prefix `rejected` after `hint` in ALL fail-closed/ambiguous
   hint evidence (same shape otherwise):
   - `hint rejected lines=<starts…>` (the >1 raw case)
   - `hint rejected line=<n> d=0 gap=inf snippet=<…>` (exact-single)
   - `hint rejected line=<n> d=<d> gap=<g|inf> snippet=<…>` (resolved)
   - `hint rejected lines=<n1,…>` (exact-ambiguous)
   - `hint rejected cands=<…>` (fuzzy-ambiguous)
   - `hint rejected reason=<…>[ best-d=<d>]` (no-candidate)
3. The header doc block (~L85-120) gains the token forms (doc-only).
4. NO verdict-table change (the core `VERDICTS` list + counts stay — evidence
   strings only). `locateContent` / `resolveEditOldString` untouched.

## Edge case (record in your handover, do not hide)
A stored fail-closed hint + a SUCCESSFUL edit can only co-occur on a
between-hooks file race (fail-closed ⟺ 0 raw occurrences at before-hook time).
If it happens, the delivered `rejected` line next to a success is the VISIBLE
race signal (exactly the #106 pain, now detectable) — no special-casing.

## Pins (re-pin byte-exact per the established pattern)
- `.opencode/plugin/tests/intercept_observer.smoke.mjs`: the R6/edit-fuzzy
  hint pins (grep `hint` / `fuzzy-edit`); ONE new check: a mutating edit-fuzzy
  now delivers the `fuzzy-edit applied` line on the (successful) tool result.
- `.opencode/plugin/probes/handover_probe.mjs`: S26/S27 (grep `S26` / `S27` /
  `hint`) — re-pin the changed lines; header tally only if the check count
  changes.

## Definition of done
- Gate green, measured + reported: intercept_observer smoke (all PASS),
  full probe run (self-annotated total; the 11 numword-python failures
  136-146 are ENVIRONMENTAL — #113 — not regressions), all other smokes
  unchanged (auto_resume 140/140, compact_memory 78/78, context_recovery
  17/17, block_transfer 131/131 + 64/64, gauge_core, ctx_gauge 3/3,
  loop_log 69/69, submit 23/23), ruff F=0. pytest UNRUNNABLE (#113 — do not
  attempt).
- Checkpoint commits per verified unit; `TODO.md` #106 status → LANDED
  (hash recorded in the planner's follow-up bookkeeping commit) + your
  handover ride the FINAL commit.
- LIVE acceptance: the tokens are observable in intercept.log + on tool
  results of any later edit — no restart dependency beyond the live
  process lag (state the standard canary caveat in your handover).

## DO-NOT-touch
- The pair/fuzzy/segment channels, R8 redirect notes, the journal,
  `locateContent` / `resolveEditOldString` internals, auto_resume,
  compact_memory, the gauge family, FST code, `.opencode/maintainer/**`,
  the #114 gauge.mjs change (already landed, 12e3262).

## Context pointers (read ONLY these areas, bounded)
- `.opencode/plugin/intercept_observer.ts` L85-120 (header doc),
  L1220-1310 (runEditFuzzy), L1310-1490 (after-hook + storeHint delivery)
- `.opencode/plugin/tests/intercept_observer.smoke.mjs` — the R6 +
  edit-fuzzy sections (grep `hint` / `fuzzy-edit` / `S26` / `S27`)
- `.opencode/plugin/probes/handover_probe.mjs` — S26/S27 sections (grep
  `S26` / `S27` / `hint`), bounded greps only (`| head -30`)
- TODO #106 (the entry text is the contract)
