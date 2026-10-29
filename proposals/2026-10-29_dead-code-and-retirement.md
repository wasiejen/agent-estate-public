# Dead code and retirement — three separable verdicts (#229, #215 step-3, #198)

Status: awaiting approval. Each part is independently approvable.

## Intention
Stop paying context and review cost for code that cannot run, without
throwing away insurance you may still want while the v2 migration settles.

## Part A (#229) — forward-compat legs in two tools
- Evidence: `.opencode/plugins/intercept_observer.ts` (~L614-621) and the
  deactivated `block_transfer` config loader read a top-level `permissions`
  ARRAY key; `opencode.jsonc` has only `permission` (singular) — the leg
  cannot execute with any reachable config (`grep` evidence in TODO).
- Options:
  1. **RECOMMENDED — keep, labeled.** Add a one-line
     `forward-compat (v2 config conversion)` header in both legs. Zero
     behavior change, removes the "dead code?" question for every future
     audit. Free surface, landable immediately after your ruling.
  2. Remove both legs (cleaner, but loses the conversion lane you kept on
     purpose for v1→v2 config drift).
  3. Leave unmarked (audit keeps re-filing it).

## Part B (#215 step-3) — retire the compaction plugin file
- Evidence: `compact_memory` is denied and absent from the live tool list,
  but `.opencode/plugins/compact_memory.ts` still LOADS and registers a
  `compaction` hook + event watcher (`setup()` L925-943); the hook never
  fires (v2 has no auto-compaction). Removal = removing a deactivated
  implementation → your call (`AGENTS.md` §Approval Boundaries).
- Options:
  1. **RECOMMENDED — delete the file** once step-2 (docs/prompts) is
     settled; it renders no tool schema and its hook is dead weight on
     every host start (14 plugins reconcile).
  2. Move it to `.opencode/plugins/deactivated/` (keeps bytes reviewable,
     still loads unless the loader skips that dir — needs a check).
  3. Keep as is.

## Part C (#198) — the dead-code audit vehicle
- Evidence: the audit produced #229-#234 findings; the ACT trial (A/B,
  self-trim vs compaction) is still unrun.
- Options:
  1. **RECOMMENDED — keep the audit grep-based and planner-run on demand**
     (idle menu), no new tooling; ACT trial stays parked until #220/#221
     decide the survival lane.
  2. Formalize a periodic audit unit (counter-triggered like maintenance).
  3. Drop the audit lane; rely on inbox findings.

## Acceptance
- A: both legs carry the header line; next audit pass does not re-file them.
- B: host log shows one fewer plugin reconciled; no probe/smoke regression.
- C: decision recorded in TODO; no new standing duty unless option 2.
