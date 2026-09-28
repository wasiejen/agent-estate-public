# plan31 summary — autorun 2026-09-28 (planner-31, ses_f1a4f121cffepXvNl2sCuSaM51)

Iteration 31 (unit-4 restart branch after planner-30 `action: restart`).

## Unit 1 — #114 (budget-suffix discrepancy): root cause + fix + verified
- **Root cause (planner-direct research — the 3rd live data point, own
  session):** the session-start injected `ctx:` line read
  `CTX=notAvailable | 1 compaction left` while the ctx_gauge self-read
  showed `5 compactions left` (same session, no compaction between).
  `gauge.mjs` no-total reads (no finished step yet — a fresh session)
  resolved the model to `""` (the model came only from the finished-step
  row; the session row's own `model` column was never read) →
  `model_budget.default` (=1) instead of the session's cap (5). Both
  surfaces share the SAME gauge core — one code path read at two times,
  not two code paths. Evidence: the live DB session row carries
  `model = {"id":"Qwen3.8-27B-Q3S-245K-slow",…}` (parseable → exact key).
- Knowledge entry: `.opencode/agent/knowledge/knowledge_plugins.md`
  (last entry, "Gauge budget suffix: no-total reads…").
- **Fix LANDED (worker-31 ses_f1a403aecffeP658IC4yNdEFdr, 12e3262 +
  bookkeeping 2c04582/4870630):** the session-row model as the no-total
  fallback — SQL forms select `id, model`, `readApiDb` falls back to the
  session row, the spawn S row carries `sid | model` (M-row precedence
  kept); `compactionsLeftSuffix` logic untouched. Verified: probe **346**
  (335 pass + the 11 environmental 136-146, #113), pins 23/28.6/28.7
  (NEW: model-nowhere → default 1)/36 + `ses_fx_nomodel` fixture,
  gauge_core smoke ALL PASS (planner re-run). LIVE acceptance PENDING the
  maintainer's host restart (a fresh session's injected line should then
  read `| 5 compactions left`).

## Unit 2 — #106 (edit-hint/edit-fuzzy outcome tokens): LANDED + verified
- **LANDED (worker-31 ses_f1a200e9cffeI44wf8d7jjx8Cu, cbbebf8; spec
  ea730f9):** `fuzzy-edit applied orig=… len=… d=… value=…` — STORED +
  DELIVERED on the SUCCESSFUL tool result (the mutation was invisible to
  the agent before — the hint was deliberately not stored) + `hint
  rejected …` on every fail-closed/ambiguous hint line (existing fields
  unchanged). No verdict-table change.
- Verified: intercept_observer smoke 77→**78/78** (planner re-run), probe
  346 re-pinned byte-exact (S20 203, S26 271-276, S27 277-284 — tally
  unchanged), ruff F=0, all other smokes at baseline.
- Recorded lesson (handover): the DELIVERED hint keeps the RAW
  (unflattened) evidence string — a multi-line oldString carries real
  newlines/CRLF in the delivered line while the LOG line is flattened at
  write time (probe 283 pin).
- Edge case per spec: a `hint rejected` line next to a SUCCESSFUL edit can
  only co-occur on a between-hooks file race — the visible signal, no
  special-casing.
- Live: the new line forms take effect from the next process restart.

## Bookkeeping
- todo_inbox 2026-09-28_04-25 (stale submit-smoke baseline in the plan31
  spec — 20/20 vs 23/23) curated: the NAP Standing baseline corrected
  (no regression).
- Baselines (NAP Standing): probe 346; intercept_observer 78/78; submit
  23/23; venv still broken (#113 MAINTAINER CALL — pytest half
  unrunnable, the 11 numword-python failures environmental).
- Friction submitted (close-down check): the stale spec baseline (a spec
  DoD quoted the stale NAP number — re-verify smoke totals at spec time) +
  the glob tool returning "No files found" on `.opencode/plugin/*`
  (dot-folder pattern quirk — grep worked).

## Close
`action: restart` — the queue for iter 32 is in the NAP (plan31 section):
#110, #112, #109 (research first), #114 live acceptance (post-restart),
the repo-split research (idle lane), the LANDED-header one-liner condenses
(deferred to the iter-35 pass), #105 (e) (maintainer domain).
