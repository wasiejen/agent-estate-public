# Worker summary — #115 gauge window config-first (worker-34)

SESSION ses_f19678e4affewDsm1KbWh7ZyNj · model Qwen3.8-27B-Q3S-245K-slow · 2026-09-28

## Executive summary
TODO #115 is LANDED: the gauge's context window now resolves CONFIG-FIRST —
the root `opencode.jsonc` `provider.<pid>.models.<mid>.limit.context`
(finite > 0) wins, the name-marker `parseWindow` is the fallback. A model
rename (no K/M marker) no longer degrades the readout. ONE change in the
shared core `.opencode/plugin/scripts/gauge.mjs` covers all three surfaces
(the ctx_watchdog injected line, the intercept_observer note, the
ctx_gauge tool) — no plugin/tool code changed.

## What changed
- **Code commit `0c90abe` (2 files, 180 ins / 4 del):**
  - `gauge.mjs`:
    - `parseJsonc` (replicated from auto_resume.ts's string-aware
      JSONC→JSON strip — a `//` inside a string literal is NOT a comment;
      trailing commas stripped; throws on parse failure, the caller
      swallows). Replicated, not imported (plain .mjs — no TS import
      possible).
    - `DEFAULT_CONFIG_FILE` = repo-root `opencode.jsonc` (the
      `join(THIS_DIR, "..", "..")` pattern of `DEFAULT_BUDGET_FILE`),
      falling back to `opencode.json` when absent; `setConfigFileForTest` /
      `getConfigFile` hooks (the `setBudgetFileForTest` pattern).
    - new exported `resolveWindow(modelId)`: non-string → undefined;
      first-`/` split → providerID/modelID (no `/` → skip the config path);
      per-call config read (small file — the budget-store precedent) →
      walk `provider[pid].models[mid].limit.context` — finite > 0 → the
      window; every miss → `parseWindow(modelId)` (unchanged). Never throws.
    - `gaugeFromRaw`: `window: resolveWindow(modelId)` (was parseWindow).
    - the `parseWindow` header comment updated (it is now the FALLBACK of
      resolveWindow — the rule itself is unchanged).
  - `gauge_core.smoke.mjs`: 7 NEW resolveWindow pins — (a) config hit beats
    the name marker (fx/x-256K → 999999), (b) no-marker model + config →
    the config value (123456), (c) model not in the config → the name
    parse (256000), (d) config file missing → the name parse, (e) a JSONC
    fixture with line + block comments, trailing commas AND a `//` inside
    a string literal parses (tricky-100K → 777777), (f) no provider prefix
    → the name-parse fallback — + the non-string contract pin (undefined).
    The fixture is a real JSONC file under the scratchpad, steered via
    `setConfigFileForTest`. The existing 11 parseWindow pins + the item-3
    budget-suffix pins are UNCHANGED (byte-identical).
- **Bookkeeping (FINAL commit):** this handover, TODO.md #115 → LANDED,
  the knowledge one-liner, the loop log DONE line.

## Measured verification (all measured this session)
- `gauge_core.smoke.mjs`: ALL PASS — 11 parseWindow pins (unchanged) + 1
  parseModelId trio + 7 resolveWindow pins + 7 item-3 pins.
- `ctx_gauge.smoke.mjs`: 3/3 — UNCHANGED, no re-pin needed (its live fixture
  resolves identically: the live model's config value 245000 === its
  name-marker parse).
- `handover_probe.mjs`: 346 checks = **335 PASS** + the **11 pre-existing
  environmental numword-python failures (136-146, #113 — NOT regressions)**
  — identical to the documented baseline (TODO #106 close note). Zero
  gauge-section failures; no probe re-pin / header change needed (the
  synthetic `probe-model-256K_MTP`-style ids carry no provider prefix →
  the config path is skipped — verified by running).
- Other smokes at baseline: auto_resume 146/146, intercept_observer 78/78,
  compact_memory 78/78, context_recovery 17/17, block_transfer 131/131 +
  64/64, loop_log 69/69, submit 23/23.
- ruff `--select F .`: **F=0** (all checks passed).
- Live spot-check: `resolveWindow('llama-swap/Qwen3.8-27B-Q3S-245K-slow')`
  = 245000 (config hit), no-prefix / unknown-provider / non-string ids fall
  back as designed.
- **pytest: BLOCKED by #113 (the broken venv)** — measured this session:
  `./.venv/Scripts/python.exe -m pytest -q` exits 103 with `No Python at
  'C:\...\python312\python.exe'` (the venv launcher points at a missing
  `python312\python.exe`). Reported, NOT fixed (per spec). NOTE: this is
  the SAME root cause as the 11 probe env failures (the probe spawns the
  same venv python for the S17 python-twin checks).

## TODO entries
- #115 → **LANDED** (status flipped in TODO.md; the code commit's hash —
  `0c90abe` — recorded in the planner's follow-up bookkeeping commit, not
  in mine).
- NO new TODO entry appended — no doc/code discrepancy found in scope.
  (Stated, not promised: a legitimate one would have gone to
  `todo_inbox.md`.)

## What was deliberately NOT done
- `opencode.jsonc` — READ-ONLY (untouched; verified git status clean for it).
- `auto_resume.ts` (`getModelLimits` / the tick legs) — the provider.list()
  path is separate (untouched).
- `formatGauge`'s output format — unchanged (existing fixture bytes
  identical; the item-3 pins prove it).
- `parseWindow` / `parseModelId` themselves — kept + exported (they are
  the fallback); only the `parseWindow` header comment was updated to say
  so.
- The budget-store read (compact_budget.json) — separate concern (untouched).
- The pytest/venv block (#113) — reported, not rebuilt.
- The 11 probe env failures — pre-existing baseline, not touched.

## Friction
- (submit fired separately — one line on the glob-tool anomaly.)

## Lessons
- `glob` silently misses files under `.opencode/plugin/` on this host
  (a `.opencode/plugin/**/*.mjs` pattern returned nothing while the files
  exist) — `bash ls` / `grep` with an explicit dir worked.
