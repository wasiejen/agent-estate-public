# #162 — the five retired-leg coverage gaps: per-leg recommendation (2026-10-26, planner-33 autorun)

## Problem

#150 unit B retired the v1 estate and pruned 22 probe sections (248 checks).
TODO.md #162 lists five legs with NO surviving v2 pinner. Each needs either a
v2 rebuild + pin, or a one-line maintainer ruling "leg retired — no v2 build".
This proposal recommends a per-leg verdict so the maintainer can approve or
override each part independently. Full evidence: `TODO.md` #162 +
`agent/handover/specs/2026-10-26_150b-estate-audit.md`.

## Design — five parts, independently approvable

### Part 1 — `context_recovery.ts` emergency-compact backstop (#93) — RECOMMEND: RETIRE

- The v1 watchdog re-armed watched sessions on a DB `COMPACT` line when the
  emergency compaction died mid-turn.
- v2 reality: compaction is native + durable; `context_family.ts` holds the
  fired-rung store (≥1% gate), `auto_resume` arms from `session.step.started`
  / terminal `session.step.ended` (#159) — a dead-compaction session ends its
  turn and the arm legs fire anyway.
- Rebuild cost: a new v2 plugin leg with no native hook to hang it on
  reliably (the v1 trigger was a log-line poller). Not worth the surface.
- Ruling text to paste into `TODO.md` #162: `leg 1 retired — no v2 build
  (planner-33 proposal 2026-10-26)`.

### Part 2 — content locator `locateContent` + edit-hint channel + after-hook enrichment (S26/S27) — RECOMMEND: RETIRE

- The v2 observer implements neither the locator nor the hint channel; the
  edit-hint friction cluster was resolved as misattribution (MEM-0111: the
  hint line is not the apply/reject authority — read the file back).
- Without the v1 consumer there is nothing to pin. Retire.

### Part 3 — positive R7 segment-matcher `kind=seg` line pin (S21) — RECOMMEND: REBUILD (cheap)

- The v2 matcher EXISTS; `plugins/tests/smoke.mjs` C5 pins only its ABSENCE.
- One positive pin in `plugins/tests/smoke.mjs`: fire a segment-matched event
  fixture → assert the `kind=seg` log line. Cost: one check + fixture, no
  production change.


### Part 4 — redirect pure-resolver case-(i..vi) detail pins + POSIX `/tmp` + bash-`command` legs (S28/S29) — RECOMMEND: REBUILD the RESOLVER pins only, RETIRE the bash leg

- The resolver cases are pure-function inputs/outputs → cheap fixture pins in
  `plugins/tests/smoke.mjs` (or a small dedicated block).
- The bash-`command` redirect leg is excluded BY DESIGN in v2
  (`plugins/intercept_observer.ts:33,822`) — rebuilding its pin would pin
  dead-by-ruling behavior. Retire that sub-leg.

### Part 5 — S3 mirror guarantee: v2 never writes the handover files — RECOMMEND: REBUILD (cheap)

- One smoke assert on the v2 observer core: run the mutation paths against a
  sandbox tree → `agent/handover/handover_task.md` /
  `handover_task_to_planner.md` untouched (byte-identical / absent).
- Cost: one check; guards exactly the file pair the protocol depends on.

## Acceptance

- Per leg: the maintainer rules (approve the recommendation or override) →
  approved parts land as ONE worker unit (parts 3+4-resolver+5 pins, no
  production behavior change); retired parts get a one-line ruling in
  `TODO.md` #162. Entry #162 closes when all five legs carry a verdict.

## Status

AWAITING APPROVAL — recommendations only; nothing built until ruled.
Priority: parts 3/5 first (smallest), part 4-resolver with them.

--comment: i just follow your recommendations on all 5.
