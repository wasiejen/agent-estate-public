# 2026-09-27 — summarize/compaction keep-source trace (TODO #99 follow-up)

Planner-27 (plan27, ses_f1d198b41ffeJA3a3By7tu3TfD), planner-direct research
(the findings were 80 % in hand at plan26 close; the remaining checks were
bounded greps — a full delegation round-trip was not worth the serial slot).

Question (his ruling 2026-09-27, direct): "if there is a way to set keeptoken
flexibly, it should be used" — map the installed host's summarize path for a
PER-CALL keep input. The gap named in TODO #99: host-map §compaction did not
trace where `preserve_recent_tokens` is read from (config vs per-call body).

## Sources (verified 2026-09-27)

- Installed host = native exe
  `home\AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe`;
  platform package `opencode-windows-x64` **version = 1.18.32** (measured from
  its package.json) — the host-map's "live host binary 1.18.31" (2026-09-21,
  carried 09-26) is STALE.
- Source copy: `home\AppData\Local\Temp\opencode\opencode-dev`
  (plain copy, NOT a git repo; `packages/opencode/package.json` version =
  1.18.32). Provenance spot-verified: `groups/session.ts` (the
  SummarizePayload block) is byte-identical to the published v1.18.32 tag
  (raw.githubusercontent.com, fetched 2026-09-27). The tree is usable as
  the installed build's source.

## Q1: per-call keep input — NONE exists (installed 1.18.32)

- `SummarizePayload = Schema.Struct({ providerID, modelID, auto? })` —
  `server/routes/instance/httpapi/groups/session.ts` L65-69. No keep field,
  no token field, no tail field.
- Handler `SessionHttpApi.summarize` (`.../handlers/session.ts` L273-294):
  calls `compactSvc.create({ sessionID, agent, model: {providerID, modelID},
  auto })` — the body contributes ONLY the model pair + the auto flag.
- Budget function `preserveRecentBudget` (`session/compaction.ts` L115-120):
  `cfg.compaction?.preserve_recent_tokens ?? clamp(0.25*usable, 2000, 15000)`
  (constants L32-33). Its ONLY input is the config.
- **Conclusion:** the `keep.tokens` / `keep.messages` our plugins send in the
  summarize body are DEAD fields — silently ignored by the server (live-
  verified 2026-09-26/27: compactions ran with the keep fields in the body,
  retention tracked the config; no error). There is NO per-call knob to wire
  the computed keepTokens into on this build.

## Q2: the config knobs, installed build (1.18.32)

- **Legacy mapping** (`config/v2-compat.ts` `normalizeCompaction` L163-184):
  - `compaction.keep.tokens` → `preserve_recent_tokens` via `preferLegacy`
    (L425-437: if the NEW field is already set it wins and a differing legacy
    value raises a conflict diagnostic; otherwise the legacy value is mapped).
  - `compaction.buffer` → `reserved` (consumed in `session/overflow.ts`
    L15-16; default `COMPACTION_BUFFER = 20000`).
  - So the maintainer's live `keep: {tokens: …}` config IS honored on 1.18.32,
    through the compat shim — this explains every live measurement
    (config-wins series, his compaction_tests.md).
- `compaction.auto` (`session/overflow.ts` L28): `isOverflow` returns false
  when `auto === false` → host auto-compaction OFF on our config; our
  context_recovery + unit-2 backstop own the limit.
- `compaction.tail_turns` (`compaction.ts` L228-233): > 0 → only the LAST N
  turns are candidates for the retained tail; ≤ 0 → no tail at all.
- `compaction.prune` (`compaction.ts` L273-317): when enabled, erases the
  output of older completed tool parts once more than `PRUNE_PROTECT = 40000`
  tokens of them are protected-behind; applies only above
  `PRUNE_MINIMUM = 20000`; `PRUNE_PROTECTED_TOOLS = ["skill"]`.

## Q3: how the budget is consumed (`select`, compaction.ts L223-269)

- Turns = user-message boundaries (messages carrying a compaction part are
  excluded from turn starts).
- Walk newest → oldest: whole turns are RETAINED while `total + size <=
  budget`; the first turn that would exceed the budget is offered to
  `splitTurn` (splits that single turn at a message boundary to fit the
  remainder); if it cannot split and nothing was kept yet → NO tail.
- `size = estimate` = `Token.estimate(JSON.stringify(model messages))` — a
  BYTE-based estimate of the model-message JSON, NOT provider tokens.
- **Retention snaps to whole-turn/message boundaries under an estimated-token
  budget.** This answers his test-#9 "rounding" question: yes — turns,
  estimated tokens, and the estimate metric differs from provider prefill.
- Post-compaction context = system prompt + the summary message + the
  retained tail. The summary is generated over `selected.head` by the
  `"compaction"` agent (`agents.get("compaction")` L358 — matches the
  agent=compaction summarizer step observed live in the fork test); prior
  summaries fold in via `buildPrompt(previousSummary, …)`; the plugin hooks
  `experimental.session.compacting` / `experimental.chat.messages.transform`
  can inject/replace (both UNUSED — host-map). The summary's own mass is
  NOT part of the tail budget (selection precedes summarization).
- `keep.tokens = 1` (his tests #11/#12): budget smaller than any single turn
  → no tail → the measured floor 25.8-25.9k = system prompt + summary ONLY.
  Consistent with the code.

## Live-vs-source delta (OPEN — maintainer live tests, on 1.18.32)

- Fork test (2026-09-26, installed build of that era = 1.18.31 per host-map;
  config keep.tokens = 30000): the FULL 30-message tail (raw ≈ 179KB) was
  retained with NO observable truncation (prefill ≈ 61k = ~20k system + ~37k
  raw tail + ~2k summary + new turns). That CONTRADICTS the 1.18.32
  `select()` budget semantics (a 30k budget vs ≈ 45k estimated tail mass
  should truncate to whole turns ≤ budget). Candidate explanation: the
  compaction logic changed between 1.18.31 and 1.18.32 — the fork
  observation cannot be read through 1.18.32's code.
- **N=10 discriminator** (his, post-restart, on 1.18.32): fork a session,
  compact via compact_memory with keepMessages=10 (the COMPACT line's
  computed `tok=` ≈ the S-diff mass of the last 10), config `keep.tokens`
  unchanged; measure the post-compaction prefill via the gauge (the TUI
  display is unreliable — his ruling). Read: COUNT-like semantics →
  prefill ≈ system + raw last-10 (~20k) + summary (~2k) + new turn ≈ 44k;
  1.18.32 BUDGET semantics → prefill ≈ system + budget-capped content
  (~4-5k estimated) + summary + new ≈ 29-30k.
- **Summarize-scope probe** (per plan24_nap.md,
  `scripts/log/summarize_intercept.cjs`): verify what the summarizer
  actually receives (fork-test reading: the whole context minus system +
  tool outputs).
- If 1.18.32 shows budget semantics, our computed keepTokens (the COMPACT
  line's `tok=`) remains an advisory metric either way; retention control
  stays config-only.

## Implications for our plugins

- **No code change:** the body `keep.*` fields stay (dead but harmless —
  the server ignores extra fields, live-verified); keepTokens resolution
  (computed / budget / none) and the COMPACT line's `tok=` are unchanged
  (advisory).
- **Fallback ruling confirmed:** the config `compaction.keep.tokens`
  (the maintainer's opencode.jsonc) is the ONLY retention control on the
  installed host; no per-call field exists to wire.
- **Forward reference for a future host build:** if upstream ever adds a
  per-call keep, this trace is the reference point — payload schema
  (groups/session.ts L65-69), handler (handlers/session.ts L273-294),
  budget function (compaction.ts L115-120), config compat (v2-compat.ts
  L163-184).
