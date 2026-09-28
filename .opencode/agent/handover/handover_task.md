# Task spec — plan31: TODO #114 fix — the gauge budget suffix must agree for a no-total read

Worker: `worker_Q3S_245K_slow` (verified live in `opencode.jsonc`, 2026-09-28).

## Goal
One budget value for both surfaces: the session-start injected `ctx:` line and
the `ctx_gauge` self-read show the SAME ` | N compactions left` for the same
session. The planner root-caused the divergence (measured, 2026-09-28 — the
knowledge entry is already committed in `.opencode/agent/knowledge/
knowledge_plugins.md`, entry "Gauge budget suffix: no-total reads…"): a gauge
read with NO finished step yet (a fresh session at session start) resolves the
model to `""` (the model comes only from the finished-step row) →
`compactionsLeftSuffix` falls back to `model_budget.default` (= 1 in the store)
instead of the session's real model cap (5 for Qwen3.8-27B-Q3S-245K-slow).
Fix: source the model from the SESSION ROW's own `model` column as the fallback.

## The fix (design is settled — implement it; HOW within the files is yours)
`.opencode/plugin/scripts/gauge.mjs` ONLY:
1. `SQL_NEWEST_SESSION` (L350) + `SQL_SESSION_BY_ID` (L374): also select the
   session row's `model` (`SELECT id, model …`).
2. `readApiDb` (L402-438): `model` precedence = finished-step row's model
   (CURRENT source of truth — unchanged when present) → ELSE the session row's
   `model` → ELSE null:
   `step != null && typeof step.model === "string" ? step.model : (typeof newest?.model === "string" ? newest.model : null)`
3. Spawn backend (only reached if both API backends fail — keep it consistent):
   `GAUGE_SQL_MARKER` (L362-367) + `sqlMarkerForSession` (L382-390): the `'S'`
   row also carries the session-row model (`SELECT 'S', id, model …`); in
   `readSpawnSqlite3` (L482-516) parse the S row as `sid | model…` (rest of the
   line = model; the M row prints FIRST and must stay the precedence winner —
   set the S-row model only when model is still null).
4. `compactionsLeftSuffix` (L292-329): NO logic change — it already does the
   right fallback chain; it just finally receives a real modelId.

## Pins (re-pin per the established byte-exact pattern; the fixture DBs are
seeded in the probe/smoke files — find them with `grep -n "ses_fx_empty" /
"ses_fx_ok" / "fx_unk"` in the two test files)
- The no-total fixture sessions should carry a model on their SESSION ROW so
  the pins exercise the NEW behavior: a no-total read of a session whose row
  model matches a model_budget key → the line ends with THAT model's cap
  (e.g. ` | 3 compactions left` for a fixture model with cap 3), NOT
  `default 1`.
- KEEP one pin proving the old fallback still holds: no-total + no model
  anywhere (session row model NULL/absent + no budget entry) → `default 1`
  (` | 1 compaction left`).
- Affected surfaces to re-pin (find all — grep for `notAvailable` +
  `compaction` in both files):
  - `.opencode/plugin/tests/gauge_core.smoke.mjs` (item-3 section, ~L38-80)
  - `.opencode/plugin/probes/handover_probe.mjs` (S6b no-total pin ~L1570; the
    spawn-marker S-row pins in the S6 section if the S-row shape changed; the
    ctx_watchdog t3 pin ~L1270 `ctx: SESSION=ses_fx_empty CTX=notAvailable` —
    it must stay byte-exact per the fixture's model value).
- Update the probe header self-annotated total ONLY if the check count changes
  (re-pins keep counts; a new fallback pin may add one — the header tally must
  match the machine).

## Definition of done
- Standard gate green, measured + reported: full probe run (self-annotated
  total; the 11 numword-python failures 136-146 are ENVIRONMENTAL — #113 venv
  break — not regressions; everything else must pass), gauge_core smoke green,
  all other smokes unchanged (context_recovery 17/17, compact_memory 78/78,
  auto_resume 140/140, intercept_observer 77/77, block_transfer 131/131 +
  sandbox 64/64, submit 20/20), ruff F=0. pytest is UNRUNNABLE (#113 — do not
  attempt it).
- Checkpoint commits per verified unit (code, then pins if you split them);
  `TODO.md` #114 status (LANDED — hash recorded in the planner's follow-up
  bookkeeping commit) + your handover ride the FINAL commit.
- LIVE acceptance stays PENDING the maintainer's host restart (the live
  process predates the change) — state that in your handover; the
  pins + the knowledge entry are the durable evidence.

## DO-NOT-touch
- `.opencode/plugin/auto_resume.ts` (`budgetExhausted` reads entry.model —
  different semantics, NOT affected — leave it).
- `compactionsLeftSuffix` logic (no behavior change).
- The ctx_watchdog nudge ladder / the auto_resume Unit-2 suffix (they consume
  the same gauge core — no change there).
- FST product code, `.opencode/maintainer/**`, `.opencode/tools/ctx_gauge.ts`
  (the tool wraps the core — no change needed; verify by reading that it
  passes through formatGauge).
- The already-committed knowledge entry (it is the spec's evidence; do not
  reword it).

## Context pointers (read ONLY these areas, bounded)
- `.opencode/plugin/scripts/gauge.mjs` L292-330, L350-440, L482-516, L534-553
- `.opencode/plugin/tests/gauge_core.smoke.mjs` L1-120
- `.opencode/plugin/probes/handover_probe.mjs`: header tally + S6/S6b
  (~L140-200, L1100-1120, L1440-1590) + the ctx_watchdog section (~L980-1290)
  + the fixture seeding (grep `ses_fx_empty`)
- `.opencode/agent/knowledge/knowledge_plugins.md` — the #114 root-cause entry
  (last entry) — your evidence
