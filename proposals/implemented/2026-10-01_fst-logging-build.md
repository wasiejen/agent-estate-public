# Proposal — FST structured-logging build (TODO #131 build)

Date: 2026-10-01 (planner-8, autorun). Status: draft — awaiting maintainer
decision.
Source: `agent/research/2026-10-01_fst-logging-design.md` (commit `c899675`,
explorer-4) + TODO #131 (status: RESEARCH LANDED — "THE BUILD = maintainer
call").

## Problem

The FST `CONSTANTS.DEBUG<X>` console flags (4 distinct values, some
leftover from fixed bugs) are ad-hoc live debugging; the maintainer's started
logging integration is incomplete. The research doc's recommendation:
structured logging beats the DEBUG constants for his use case (finding lag
causes, documenting errors, associating output to code areas — without
overwhelming).

## Design (pointer — the full design is the research doc)

One FST worker unit on `fst_work3`:

- **Part 1 — logger setup:** append-only `fst.log` (the current
  `filemode='w'` wipes per-run evidence) + separate `fst_flow.log`;
  `-log=LEVEL` / `-flow` start args; the runtime numpad/menu toggles
  remapped to logger levels.
- **Part 2 — per-flag dispositions:** DEBUG/DEBUG2/DEBUG3 → kill the flag +
  convert the sites (error-class sites → always-on WARNING); DEBUG4 → the
  `fst.flow` logger keeping the arrow vocabulary + latency pairs;
  DEBUG_NUMPAD kept as the safety gate.
- **Part 3 — absorbs the 4 FST audit bugs:** the `fst.log` filemode wipe, the
  two parallel flag channels making runtime toggles ineffective for some
  reads, `check_result` swallowing repeat-task exceptions, the stale
  "suppressed" print.

## Acceptance

Per the research doc: FST gate green (pytest + ruff F=0); the per-flag
disposition list complete; the start args pinned; the live console/file
behavior confirmed by the maintainer (it is an observable behavior change).

## Recommendation

GO (Parts 1+2 as the unit; Part 3 as a second unit of the same worker run or
a follow-up). It retires 5 flags = observable behavior change, hence this
call; the research doc's recommendation stands as written.

comment:
approved in full
+ a guideline for me after implementation on how to use to effectively :-)
  - just put it in maintainer/feedback ^^

## Verdict (LANDED 2026-10-05, plan11 unit 2)

Worker worker_Q3S_slow (ses_ef6b793f2ffek8H7AISRzFV4gX), FST repo
`fst_work3`: `ea2aac3` (U1 logger setup) / `cac6704` (U2 per-flag
dispositions) / `cd0f3a2` (U3 error-documentation fixes). Planner-verified
from files: FST gate re-run 474 passed + 1 known warning, ruff F=0;
flag-surface greps clean (only the kept `DEBUG_NUMPAD` gate + its start arg
remain); the live-config regression guard (`test_real_config_parses`) stayed
green; diff scope = FST code + tests only.

Deviations (all evidence-backed, in the handover):
1. The nested `clear_all_variables` was KEPT, not deleted — the research
   doc §5.5 misclassified it dead; it is the live eval-scope shim behind
   bare `clear_all_variables()` config calls (`FSTconfig_test.txt:850,1596`,
   pinned by a test). Corrected in the doc's §7 item 9.
2. Out-of-range start-arg notices kept as console prints (doc §2 only
   itemizes the unknown-arg site; the DoD pins only "unknown arg →
   WARNING") — a small optional follow-up.
3. `-logdir=` deferred per doc §3.3.

The usage guideline (the approved maintainer ask) landed at
`maintainer/feedback/2026-10-05_fst-logging-usage.md`. Live console/file
confirmation = maintainer domain (post-build).
