# Handover task → planner (worker-24, 2026-09-26)

Task: #99 keepTokens metric fix — usage-field sums → RAW PART MASS (part
bytes ÷ 4, usage-field fallback kept). Spec: `handover_task.md` (committed
30b81d9).

## What changed (code commit b95d532)
- `.opencode/plugin/compaction_core.ts` — `computeKeepTokens`: per-message
  metric is now the RAW PART MASS — `Math.round(Σ JSON.stringify(part).length
  / 4)` over `entry.parts` (ALL part types). Entries with absent / empty /
  non-array `parts` fall back to the OLD usage value (user → input,
  assistant → output+reasoning, other → 0) with the SAME fail-open numeric
  guards. The dual-shape unwrap (#79), the last-`keepMessages` slice, the
  `keepMessages <= 0 → no sum` guard, and the computed/budget/none resolution
  are UNCHANGED. Doc comment rewritten (new metric + fallback + the measured
  ~20–30%-below-bytes/4 provider note).
- `.opencode/plugin/compact_memory.ts` — the `keepMessages` schema
  description: "the token size of the last N messages" → "the raw content
  mass (part bytes ÷ 4) of the last N messages" (rest of the sentence kept).
- `.opencode/plugin/tests/compact_memory.smoke.mjs` — #99 COMPUTED case:
  fixture now carries raw parts (2 × 8000-char text parts per fake message),
  expected sum 6200 → 8026 (machine-computed); section header updated. The
  budget-fallback / sum-0 / none cases are UNCHANGED (their fixtures already
  carry no parts and no token info → sum 0 → budget / none paths).
- `.opencode/plugin/tests/context_recovery.smoke.mjs` — #99 case 13: fixture
  gains parts, expected 4500 → 8026. Case 14 (read-fail → budget 42000)
  UNCHANGED.
- `.opencode/plugin/probes/handover_probe.mjs` — cases (285) + (287):
  fixtures gain parts, expected 4500 → 8026 (section header + code block).
  Cases (286)/(288) (read-fail → budget) UNCHANGED. **PROBE COUNT UNCHANGED:
  340** (no case split/merge).
- `.opencode/plugin/context_recovery.ts` — VERIFIED ONLY, no change (it
  passes the client's raw messages to `computeKeepTokens`, which carry
  `parts`).

Machine-computed expectations (no mental math, AGENTS.md Pattern 1 — script
in the scratchpad): each 8000-char text part serializes to 8025 bytes;
2 parts per message → Σ 16050 → `Math.round(16050/4)` = 4013; the two
counted messages → 8026 (all four computed pins share 8026).

## Verification (measured this session)
- `node .opencode/plugin/probes/handover_probe.mjs` → **340/340 PASS**
  (count unchanged)
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` → **74/74**
- `node .opencode/plugin/tests/context_recovery.smoke.mjs` → **17/17**
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed, 1 warning**
  (baseline)
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed**
  (F=0)
Pre-edit baselines were green too (340/340, 74/74, 17/17) — the fix did not
regress any other pin.

## Commits
- `b95d532` — code + pins (5 files; named-path commit — the maintainer's
  modified `priority.md` / `opencode.jsonc` /
  `dev_get_tool_context_contents.ts` were NEVER staged or touched)
- this commit — TODO #99 close note + this handover (final)

## TODO
- #99: one-line close note appended (metric fixed → raw part mass (bytes/4),
  usage-field fallback kept). The entry STAYS OPEN for the maintainer's live
  fork-test acceptance (unchanged).

## Deliberately NOT done
- No new probe/smoke cases (spec: keep the count — no split/merge).
- The usage-fallback path (entries with NO parts but token info) is not
  pinned by any case — the spec's pin list did not require it and the count
  had to stay 340.
- Comments outside the spec's named scope (the config-file header comment,
  the COMPACT-line header comment, the context_recovery caller comment)
  left as-is per the DO-NOT-TOUCH boundary.
- No python touched (the .ts change touches no python — the gates were run
  anyway, baseline unchanged).

## Gauge (verbatim)
SESSION=ses_f206bea11ffetlA7q2Ie3BRtU4 CTX=114423 (46%) REM=130577 | 5 compactions left
