# Handover task → planner (worker_Q3S_245K_slow, 2026-09-27)

Task: #99 keepTokens metric v2 — raw part bytes → PROVIDER-TRUE S-DIFF
primary, bytes/4 part mass kept as the FALLBACK. Spec: `handover_task.md`
(committed 922463e).

## What changed (code commit dcad3d1)
- `.opencode/plugin/compaction_core.ts` — `computeKeepTokens`: the PRIMARY
  metric is now the provider-true S-DIFF — per assistant message,
  `S = tokens.input + tokens.output + tokens.cache.read` (the CUMULATIVE
  context size after that call); the window's mass = `S[last assistant IN
  the window] − S[last assistant strictly BEFORE the window]` (none before →
  0). Fail-open numeric guards per value (non-finite/negative/absent → 0);
  an assistant entry whose whole token object is absent is a zero row. If
  the window has NO assistant entry, or the diff ≤ 0 (drift) → FALL BACK to
  the b95d532 bytes/4 part-mass metric (same per-entry formula, usage-value
  sub-fallback for entries without parts). The dual-shape unwrap (#79), the
  window slice, `keepMessages <= 0 → no sum`, and the
  computed/budget/none resolution are UNCHANGED. Doc comment rewritten
  (S-diff primary, bytes/4 fallback, usage/none resolution).
- `.opencode/plugin/compact_memory.ts` — the `keepMessages` schema
  description: "the raw content mass (part bytes ÷ 4) of the last N
  messages" → "the provider-token mass of the last N messages (S-diff:
  cumulative context size input+output+cache.read across the window;
  bytes/4 fallback)" (rest of the sentence kept).
- `.opencode/plugin/tests/compact_memory.smoke.mjs` — #99 section: the
  COMPUTED case fixture now carries a TOKEN SERIES on the assistants (A:
  zero in/out row S 1000 before the window; B: in 300 + out 200 + cr 2000 →
  S 2500 in the window) → S-diff 2500 − 1000 = **1500**; NEW BYTES/4
  FALLBACK case (assistants WITHOUT tokens but WITH parts → 8026, fresh
  session `ses_sm_tokfb`, reusing the old computed fixture minus tokens);
  budget/read-fail, sum-0→budget, and none cases UNCHANGED (no-mass
  fixtures). Section header rewritten. Check count 74 → **76** (+2 = the new
  fallback case).
- `.opencode/plugin/tests/context_recovery.smoke.mjs` — case 13: fixture
  gains the token series (assistant S = 500 + 300 + 4000 = 4800, no
  assistant before the window) → **4800**; case 14 (read-fail → budget)
  UNCHANGED. Count stays 17.
- `.opencode/plugin/probes/handover_probe.mjs` — S11 (285): fixture gains
  the token series (S = 500 + 300 + 4000 = 4800) → **4800**; S13 (287):
  token series (S = 400 + 250 + 6000 = 6650) → **6650**; both section
  header comments updated. (286)/(288) (read-fail → budget) UNCHANGED.
  **PROBE COUNT UNCHANGED: 340** — the bytes/4 fallback path is pinned by
  the new SMOKE case, no new probe check was needed (spec: reuse, don't
  add).

Machine-recomputed expectations (AGENTS.md Pattern 1 — no mental math): the
scratchpad script `$TMP/opencode/keep_v2_check.mjs` imports the REAL
`computeKeepTokens` (type-stripped, node 24) and ran 15 fixtures — the five
primary pins + the unchanged budget/none paths + guard cases (zero rows,
drift diff<0, no assistant in window, keepMessages ≤ 0, malformed raw,
non-finite/negative values) → **15/15 PASS** before the pins were written.

## Verification (measured this session, all after the final edits)
- `node .opencode/plugin/probes/handover_probe.mjs` → **340/340 PASS**
  (count unchanged)
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` → **76/76** (was
  74; +2 = the new bytes/4 fallback case)
- `node .opencode/plugin/tests/context_recovery.smoke.mjs` → **17/17**
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed, 1 warning**
  (baseline — no python touched)
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed**
  (F=0)

## Commits
- `dcad3d1` — code + pins (5 files; named-path commit — the maintainer's
  modified `opencode.jsonc` / `dev_get_tool_context_contents.ts` /
  `priority.md` / `agent_feedback.md` / `loop_log.md` were NEVER staged or
  touched)
- this commit — TODO #99 close-note UPDATE (metric v2) + this handover
  (final)

## TODO
- #99: close note UPDATED (metric v2: S-diff provider-true primary, bytes/4
  fallback; gate numbers refreshed). The entry STAYS OPEN for the
  maintainer's live fork-test acceptance (unchanged).

## Deliberately NOT done
- No probe count change (spec: keep 340 — the fallback path is smoke-pinned
  instead of probe-pinned).
- `context_recovery.ts`, the COMPACT-line writer, the budget store, the
  cap resolver, the summarizer pair, the dump writer: UNTOUCHED per the
  DO-NOT-TOUCH list (context_recovery.ts verified only — it passes the
  client's raw messages to the core, which now reads `info.tokens`).
- No python touched (the change is TS-only; gates run anyway).
- Fixture shape note: `tokens` live INSIDE `entry.info` (the real DB
  shape). My first fixture draft (verification script + rc smoke + probe
  285/287) attached them at the entry top level and failed; caught by the
  machine script + the smokes, fixed before any green claim.

## Gauge (verbatim)
SESSION=ses_f204cc004ffeRfCvdnq1fyREae CTX=116127 (47%) REM=128873 | 5 compactions left
