# TASK SPEC — #115: the gauge window is config-derived (root opencode.jsonc `limit.context`), name-marker fallback

## Goal
The gauge's context window must resolve from the root `opencode.jsonc`
`limit.context` (config-FIRST), falling back to the existing model-ID
name-marker parse. A model rename (no K/M marker) must not degrade the
readout (losing `(pct%)/REM`).

## Verified facts (planner-measured at spec time — trust these, don't re-derive)
- All THREE gauge surfaces share ONE core: `.opencode/plugin/scripts/gauge.mjs`
  (`readGauge`/`formatGauge` — the ctx_watchdog.ts injected ctx: line, the
  intercept_observer note, the tools/ctx_gauge.ts tool). A single change in
  gauge.mjs covers all surfaces — no plugin/tool code change needed.
- `gaugeFromRaw` (gauge.mjs ~L546-565) sets `window: parseWindow(modelId)`;
  `parseWindow` (~L242-250) is the name-marker parser only.
- The DB model id is `provider/model` (e.g. "llama-swap/Qwen3.8-27B-Q3S-245K-slow") —
  `parseModelId` (gauge.mjs L254-267) returns the full "provider/model" string.
- The root `opencode.jsonc` declares per-model limits:
  `provider.<pid>.models.<mid>.limit.context` (finite > 0). E.g. L111-114:
  "Qwen3.8-27B-Q3S-245K-slow" → 245000. The file is JSONC (comments +
  trailing commas; a `//` INSIDE a string literal, e.g. the baseURL, is NOT a
  comment).
- Repo-root resolution pattern in gauge.mjs: `join(THIS_DIR, "..", "..")`
  (see `DEFAULT_BUDGET_FILE`, gauge.mjs L186-189) — resolve the config the
  same way (opencode.jsonc, falling back to opencode.json when absent).
- The string-aware JSONC→JSON strip reference implementation: auto_resume.ts
  L1098 `parseJsonc` (comments + trailing commas, string-aware, throws on
  parse failure). REPLICATE its logic into gauge.mjs (plain .mjs — no TS
  import possible).
- A per-call config read is fine (small file — same precedent as the
  budget-store read in formatGauge); NEVER throw (missing / unparseable /
  no entry → the parseWindow fallback stands).
- The `formatGauge` OUTPUT FORMAT must not change. `auto_resume.ts`
  `getModelLimits` (the provider.list() path, L478) is a SEPARATE mechanism —
  untouched.

## Design (the contract — the HOW inside it is yours)
- New exported `resolveWindow(modelId)`:
  1. modelId not a string → undefined (the parseWindow contract).
  2. Config path: split on the FIRST "/" → providerID + modelID (no "/" →
     skip the config path). Read the root config (opencode.jsonc →
     opencode.json), strip + parse the JSONC, walk
     `provider[providerID].models[modelID].limit.context` — a finite number
     > 0 → that is the window.
  3. Fallback: `parseWindow(modelId)` (unchanged).
- `gaugeFromRaw`: `window: resolveWindow(modelId)`.
- A test hook `setConfigFileForTest(p)` (the `setBudgetFileForTest` pattern,
  gauge.mjs L190-194) so smokes point at a fixture config; the default is
  the THIS_DIR-relative root path.

## DoD
- gauge_core.smoke.mjs: the existing pins stay valid UNCHANGED (the
  parseWindow cases L14-26 use synthetic ids that appear in no fixture
  config) + NEW resolveWindow pins:
  (a) config hit beats the name marker (fixture "fx/x-256K" with config
      context 999999 → 999999);
  (b) no-marker model + config → the config value (e.g. 123456);
  (c) model not in the config → the name parse (e.g. 256000);
  (d) config file missing → the name parse;
  (e) a JSONC config with comments (incl. a `//` inside a string literal)
      parses correctly;
  (f) a modelId without a provider prefix → the name-parse fallback.
- ctx_gauge.smoke.mjs: re-pin ONLY if affected (its fixtures are name-marker
  models — verify; update expected bytes only where the config path actually
  changes a value).
- Probe `.opencode/plugin/probes/handover_probe.mjs`: the gauge fixtures use
  synthetic "probe-model-256K_MTP"-style ids (no provider prefix → the config
  path is skipped → the pins should stay green — VERIFY by running; re-pin +
  update the header tally only if actually changed).
- Standard gate: the probe (self-annotated header total), gauge_core +
  ctx_gauge smokes, all other smokes at their baselines (auto_resume 146/146,
  intercept_observer 78/78, compact_memory 78/78, context_recovery 17/17,
  block_transfer 131/131 + 64/64, loop_log 69/69, submit 23/23), ruff F=0.
  The pytest half is BLOCKED by #113 (the broken venv) — report it in the
  handover, do NOT fix it.
- Knowledge: ONE dated line appended to
  `.opencode/agent/knowledge/knowledge_plugins.md`: the gauge window is now
  config-first (root opencode.jsonc `limit.context`), name-marker fallback —
  a model rename is free as long as the config entry keeps its limit.context.
- TODO.md #115 → status `LANDED` (hash recorded in the planner's follow-up
  bookkeeping commit — never your own hash).
- Checkpoint commits per verified unit (code only); TODO + handover ride the
  FINAL commit.
- No new TODO entry expected — but state it, don't promise it: a legitimate
  doc/code discrepancy found in scope gets appended to `todo_inbox.md` (repo
  root).

## DO-NOT-TOUCH
- `opencode.jsonc` (READ-ONLY — the maintainer's live file).
- `.opencode/maintainer/**`.
- `auto_resume.ts` (getModelLimits / the tick legs) — the provider.list()
  path is separate.
- `formatGauge`'s output format (the existing fixture readout bytes must stay
  identical).
- FST product code. `parseWindow` / `parseModelId` themselves (keep + export
  — they are the fallback).
- The budget-store read (compact_budget.json) — separate concern.

## Worker
worker_Q3S_245K_slow (live roster in opencode.jsonc — verified at spec time).
Stay on the current checkout (branch `opencode_test`, HEAD c21cc72).

## Handover
`.opencode/agent/handover/handover_task_to_planner.md` — the standard shape:
what changed, the measured verification (smoke + probe + gate numbers), the
code commit hash(es), the TODO entry status, what was deliberately NOT done.
