# Task spec — keepTokens metric fix: usage fields → raw part mass (2026-09-26)

Worker: `worker_Q3S_245K_slow`. Branch: stay on the current checkout (`opencode_test`).

## Goal
`computeKeepTokens` (the #99 dispatch-time keepTokens resolution) currently sums
per-message USAGE fields (user → `info.tokens.input`, assistant →
`info.tokens.output + info.tokens.reasoning`). Those fields do NOT measure
message content: user rows are all-zero (usage is attached to the consuming
assistant call), `reasoning` usage is 0 (provider doesn't report it), and
`input` is the cumulative per-call context (never usable as a per-message
delta). Measured consequence (fork test, ses_f20b3bf14ffedWHp2HGajHmGLN):
last-30 usage mass = 15,903 while the host's raw retention of the same 30
messages = 179,151 part bytes (≈ 32–40k provider tokens) — the dispatched
budget can never bind against the raw mass the host keeps.

CHANGE the metric to RAW PART MASS: per message = Σ JSON.stringify(part).length
over its `entry.parts` (ALL part types), ÷ 4 (coarse bytes→tokens; measured
provider counts run ~20–30% below bytes/4 on this corpus — document that).

## New computation (compaction_core.ts, `computeKeepTokens`, ~L105–145)
- Keep the dual-shape unwrap (#79: bare array OR `{ data: [...] }`; else no sum).
- Per entry: if `entry.parts` is a non-empty array → mass =
  `Math.round(Σ JSON.stringify(part).length / 4)`; else (absent/empty parts)
  → fall back to the CURRENT usage value for that entry (user → input,
  assistant → output+reasoning, other → 0). Same fail-open numeric guards.
- Sum over the last `keepMessages` (fewer → all; `keepMessages <= 0` → no sum).
- `sum > 0` → `{ tokens: sum, source: "computed" }`; else budget file's
  keepTokens (finite > 0) → "budget"; else "none". UNCHANGED.
- Update the doc comment (~L105–115) to describe the new metric + fallback.

## Caller + description
- `compact_memory.ts` schema description of `keepMessages` (~L284): update
  the wording to "the raw content mass (part bytes ÷ 4) of the last N
  messages is sent as keep.tokens …" (keep the rest of the sentence).
- `context_recovery.ts` caller (~L207–222): NO change needed (it passes the
  client's raw messages, which carry `parts`). Verify only.

## Pins to update (exact locations)
- `tests/compact_memory.smoke.mjs` — the #99 section (~L576–660): the
  "computed" case fixture must carry `parts` on the fake messages (e.g. two
  text parts whose byte mass gives a clean expected sum); recompute
  expectations MACHINE-SCRIPTED (AGENTS.md Pattern 1 — no mental math). The
  budget-fallback case (read fails) and none case: give those fixtures NO
  parts AND no token info → sum 0 → budget / none paths unchanged. The
  sum-0 case: fixture messages with no parts + no token info → budget wins.
- `tests/context_recovery.smoke.mjs` — #99 cases 13/14 (~L274–316): same
  treatment (case 13 fixture gains parts; case 14 stays read-fail).
- `probes/handover_probe.mjs` — S32 keepTokens cases (285)–(288)
  (~L326–395): update the fake `messages` fixtures (parts shape) and the
  expected body/line values accordingly. KEEP THE TOTAL PROBE COUNT (340)
  unless a case is genuinely split/merged — report any change in the
  handover.
- COMPACT line format (`keep=Nm tok=<t> <source>`) and budget-store shape:
  UNCHANGED.

## Definition of done
- `node .opencode/plugin/probes/handover_probe.mjs` → all checks green
  (count 340 if unchanged).
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` → 74/74 (or new
  count if a case split — report it).
- `node .opencode/plugin/tests/context_recovery.smoke.mjs` → 17/17 (or new
  count — report it).
- `pytest` baseline 459+1w, `ruff` F=0 (the .ts unit touches no python —
  run anyway, report measured).
- Checkpoint commit(s) per verified unit (code only); `TODO.md` (append a
  one-line close-note to the #99 entry: "metric fixed → raw part mass
  (bytes/4), usage-field fallback kept") + handover in the FINAL commit.

## DO-NOT-TOUCH
- `.opencode/maintainer/**` (incl. `priority.md`), `opencode.jsonc`,
  `.opencode/tools/dev_get_tool_context_contents.ts` — maintainer's live
  files (currently modified in the tree, uncommitted).
- The summarizer-pair resolution, budget store, cap resolver, dump writer,
  COMPACT-line writer — everything else in compaction_core.ts /
  context_recovery.ts / compact_memory.ts.
- No behavior change beyond the keepTokens metric + the description text.
