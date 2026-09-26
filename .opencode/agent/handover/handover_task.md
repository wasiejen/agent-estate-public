# Task spec — keepTokens metric v2: raw part bytes → S-diff (provider-true tokens) (2026-09-26)

Worker: `worker_Q3S_245K_slow`. Branch: stay on the current checkout (`opencode_test`).
Supersedes the spec you just implemented (`b95d532`): the bytes/4 metric stays ONLY as
the fallback path.

## Goal (verified facts — do not re-derive)
Per assistant message, `S = tokens.input + tokens.output + tokens.cache.read` is the
CUMULATIVE context size after that call (all values already in provider tokens).
Verified continuity: `S[i] ≈ cr[next assistant]` with drift ±1 across ~90% of rows
(cache evictions drift 1–2.3k at a few rows; some rows have all-zero token fields —
sparse recording). Forks do NOT break S: the fork's first call moves the whole context
from `cache.read` into `input` (refilled prefill) — measured: S[45]=150,482 ≈
cr[46]=150,481 (drift 1). So the raw mass of the last-N messages ≈
`S[last assistant IN the window] − S[last assistant BEFORE the window]`.
Example (this session, keepMessages=12 at the fork point): S[43]−S[32] = 9,458.

## New computation (compaction_core.ts, `computeKeepTokens`)
- Keep the dual-shape unwrap (#79).
- Window = the last `keepMessages` entries (any role; fewer → all; `<= 0` → no sum).
- Primary: `S(end) − S(start)` where `S(end)` = input+output+cache.read of the LAST
  assistant entry in the window, `S(start)` = the same sum for the LAST assistant entry
  strictly before the window (none → 0). Fail-open numeric guards per value
  (non-finite/negative/absent → 0); an assistant entry whose whole token object is
  absent contributes nothing (treated as zero-row).
- If the window has no assistant entry, or the difference ≤ 0 (drift) → FALL BACK to
  the bytes/4 part-mass metric landed in `b95d532` (same per-entry formula).
- `sum > 0` → `computed`; else budget file keepTokens (finite > 0) → `budget`; else
  `none`. UNCHANGED.
- Update the doc comment to describe: S-diff primary, bytes/4 fallback, usage/none
  resolution.
- `compact_memory.ts` `keepMessages` description (~L284): update to "the provider-token
  mass of the last N messages (S-diff: cumulative context size input+output+cache.read
  across the window; bytes/4 fallback) is sent as keep.tokens …".

## Pins (exact locations — the fixtures were just rewritten for bytes/4; re-derive)
- `tests/compact_memory.smoke.mjs` #99 section (~L576–660): the computed case fixture
  needs assistant entries carrying a `tokens: {input, output, cache.read}` series so
  S-diff is exercised (e.g. two assistants with cr 1000 → 2000 → expected 1000 + their
  in/out); keep ONE bytes/4 fallback case (assistant entries WITHOUT tokens but WITH
  parts → bytes/4 wins); budget/none/read-fail cases keep their no-mass fixtures.
  Recompute all expectations MACHINE-SCRIPTED (AGENTS.md Pattern 1).
- `tests/context_recovery.smoke.mjs` #99 case 13 (~L274–316): fixture gains the token
  series (S-diff expected value); case 14 (read-fail) unchanged.
- `probes/handover_probe.mjs` S32 cases (285)–(288) (~L326–395): case 285/287 fixtures
  gain the token series (S-diff values); if one case now needs the fallback path
  covered, reuse an existing case rather than adding one — KEEP THE TOTAL COUNT (340).
- COMPACT line format (`keep=Nm tok=<t> <source>`) + budget store: UNCHANGED.

## Definition of done
- `node .opencode/plugin/probes/handover_probe.mjs` → 340/340 (count unchanged).
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` → green (report count).
- `node .opencode/plugin/tests/context_recovery.smoke.mjs` → green (report count).
- pytest 459+1w, ruff F=0 (no python touched — run + report measured).
- Checkpoint commit(s) per verified unit (code only); TODO #99 close-note UPDATE
  ("metric v2: S-diff provider-true primary, bytes/4 fallback") + handover in the
  FINAL commit.

## DO-NOT-TOUCH
- `.opencode/maintainer/**`, `opencode.jsonc`, `.opencode/tools/dev_get_tool_context_contents.ts`
  (maintainer's live files, modified in the tree — never stage/edit them).
- Everything else in compaction_core.ts / context_recovery.ts / compact_memory.ts
  (summarizer pair, budget store, cap resolver, dump writer, COMPACT-line writer).
- Named-path commits only — the working tree carries uncommitted maintainer changes.
