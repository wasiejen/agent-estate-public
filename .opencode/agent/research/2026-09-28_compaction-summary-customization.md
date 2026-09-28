# 2026-09-28 — compaction-summary customization research (TODO #105 part (d))

Research-only (explorer-30, plan30). Question (maintainer #105 verbatim gist): using the
exact summarize prompt (`compaction_prompt.md` + the temp `opencode:dev` copy), find how
the compaction model's summary behavior can be influenced — e.g. drop all content older
than 4 compactions, mark new additions with the current compaction iteration (keeps the
summary current + trackable).

**Host under study:** installed opencode **1.18.32**; source tree
`home\AppData\Local\Temp\opencode\opencode-dev` (plain copy, provenance
verified 2026-09-27 — pointer: `.opencode/agent/knowledge/opencode-plugins/
2026-09-27_summarize-keep-source-trace.md`). All locators below were grep/read-verified
against that tree on 2026-09-28. The draft
`.opencode/maintainer/draft/compaction_guide/compaction_prompt.md` is the host's own
prompt text verbatim (byte-match: see §2 below).

## 1. Q: does the summarize call accept ANY instruction/prompt override?

**Short answer: the HTTP body does NOT; the CONFIG does (the `agent` section — not the
`compaction` section); there is NO env var; and two plugin hook surfaces we control can
replace the prompt wholesale (see §3).**

### 1a. Summarize HTTP body — none (negative evidence, re-verified)

- `SummarizePayload = Schema.Struct({ providerID, modelID, auto? })` —
  `packages/opencode/src/server/routes/instance/httpapi/groups/session.ts` L65-69. No
  prompt/context/keep field (the `keep.*` fields our plugin sends are dead — pointer:
  #99 trace doc §Q1, live-verified).
- Handler passes only the model pair + the auto flag to `compactSvc.create` —
  `packages/opencode/src/server/routes/instance/httpapi/handlers/session.ts` L273-294.

### 1b. Config `compaction` section — retention knobs only, NO prompt knob

- v2 schema `ConfigV2.Compaction` = `{ auto?, prune?, keep: { tokens? }?, buffer? }` —
  `packages/core/src/config/compaction.ts` L10-14 (only fields that exist).
- v1/legacy names (`preserve_recent_tokens`, `reserved`, `tail_turns`) map in
  `packages/opencode/src/config/v2-compat.ts` L163-184 (pointer: #99 trace doc §Q2 for the
  full consumption map). Nothing in either schema touches the summary prompt or template.

### 1c. Config `agent` section — YES: `agent.compaction` overrides the summarizer prompt

- Built-in default agent `compaction` (hidden, primary): `packages/opencode/src/agent/
  agent.ts` L219-233, prompt = `PROMPT_COMPACTION` (imported L13 from
  `src/agent/prompt/compaction.txt`, 5 lines — read and quoted in §2).
- User-config merge loop: `agent.ts` L267-294 — for every `cfg.agent[key]` entry,
  **L283 `item.prompt = value.prompt ?? item.prompt`** — a config entry
  `agent.compaction.prompt` (v1 shape) therefore REPLACES the built-in system prompt;
  `agent.compaction` also accepts `model`, `variant`, `description`, `temperature`,
  `top_p`, `mode`, `color`, `hidden`, `name`, `steps`, `options`, `permission` (L281-293).
  Setting `disable` deletes the agent (L268-271) — do NOT do that for `compaction`.
- v2 config shape maps `system` → `prompt`: `packages/opencode/src/config/v2-compat.ts`
  L396-407 (`lowerAgent`, L401 `if (input.system !== undefined) result.prompt =
  input.system`); v2 agent schema field `system` at `packages/core/src/config/agent.ts`
  L17. So **either** `agent.compaction.prompt` (v1) **or** `agent.compaction.system`
  (v2) works in opencode.jsonc (maintainer file).
- The agent's prompt becomes the FIRST system entry of the summarizer request:
  `packages/opencode/src/session/llm/request.ts` L56-66 (`input.agent.prompt ?
  [input.agent.prompt] : SystemPrompt.provider(...)`).

### 1d. Env vars — none (negative evidence)

- Grep `process.env` / `Env.` in `packages/opencode/src/session/compaction.ts`,
  `packages/opencode/src/agent/agent.ts`, `packages/core/src/session/compaction.ts`,
  `packages/opencode/src/session/llm/request.ts`: **zero hits** (2026-09-28).

### 1e. What is hardcoded (the un-influenceable core)

- `SUMMARY_TEMPLATE` (the `<template>` block = our `compaction_prompt.md` lines 1-31,
  byte-identical) and `SUMMARY_UPDATE_INSTRUCTIONS` (= `compaction_prompt.md` lines
  32-40) are MODULE CONSTANTS — `packages/core/src/session/compaction.ts` L16-46 /
  L47-55. Only consumer: `buildPrompt` (same file L160-174), called from
  `packages/opencode/src/session/compaction.ts` L384-387. No body/config/env plumbing
  reaches them — the template can only be bypassed, not edited, via the §3 hooks.
- Summary generation flow (`packages/opencode/src/session/compaction.ts`
  `processCompaction` L319-428): agent = `agents.get("compaction")` (L358); model =
  agent's model or the session's (L359-361); `previousSummary = prior.at(-1)?.summary`
  (L364-366 — EXACTLY ONE prior generation, recursively folded); `selected = select(
  {messages, cfg, model})` (L367-371); hooks fire (L373-379); `nextPrompt =
  compacting.prompt ?? [buildPrompt({previousSummary, context:[conversation]}),
  ...compacting.context]` (L381-391); the assistant message carries
  `mode: "compaction"`, `agent: "compaction"`, `summary: true` (L398-401); generated via
  the normal processor (`processors.create` L420, `processor.process` L425-428) — so
  the summarizer request passes through `LLMRequestPrep.prepare`
  (`packages/opencode/src/session/llm.ts` L106) and its hooks.

## 2. The exact prompt the host sends (reference)

The summarizer's user message = `buildPrompt` output (core compaction.ts L160-174):
first compaction: `conversation + "Create a new anchored summary…" + SUMMARY_TEMPLATE`;
subsequent: `conversation + <prior-summary> block + SUMMARY_UPDATE_INSTRUCTIONS +
SUMMARY_TEMPLATE`. System message = the `compaction` agent's prompt (`PROMPT_COMPACTION`,
5 lines — "You are a context summarization agent…"). Both texts are preserved verbatim
in the maintainer's draft `compaction_prompt.md` (verified identical 2026-09-28).

## 3. Influenceable surfaces (inventory, measured 2026-09-28)

| # | Surface | Where (locator) | What it can change | Owner |
|---|---|---|---|---|
| 1 | Body field | `groups/session.ts` L65-69 | NOTHING — no field exists | — |
| 2 | Env var | (none — §1d) | NOTHING | — |
| 3 | Config `agent.compaction.{prompt\|system}` (+model, temperature, …) | `agent.ts` L267-294 (L283), `v2-compat.ts` L396-407, `llm/request.ts` L56-66 | The summarizer's SYSTEM prompt + model + generation params (STATIC text only — no dynamic state) | maintainer file (opencode.jsonc) |
| 4 | Hook `experimental.session.compacting` | trigger `opencode/session/compaction.ts` L373-377; typed `packages/plugin/src/index.ts` L298-308 (doc comment: "`context`: appended to the default prompt; `prompt`: if set, replaces the default compaction prompt entirely") | input `{sessionID}`; output `{context: string[], prompt?: string}` — **append context OR replace the whole default prompt** (the template, the prior-summary folding, everything) | our plugin |
| 5 | Hook `experimental.chat.messages.transform` | trigger `opencode/session/compaction.ts` L379 on `msgs = structuredClone(selected.head)` (typed `plugin/src/index.ts` L284-290) | Mutate the message list BEFORE the summarizer sees it — drop/rewrite individual messages. CAVEAT: also fires on every normal chat step (`opencode/session/prompt.ts` L1255) — a handler must distinguish (e.g. arm state in hook #4, which fires only pre-compaction) | our plugin |
| 6 | Hook `experimental.chat.system.transform` | trigger `opencode/session/llm/request.ts` L69-73 (also `agent.ts` L381 for the title/generate path); typed `plugin/src/index.ts` L291-296 | Mutate the `system[]` array of ANY LLM request incl. the summarizer's (system[0] = the agent prompt). Distinguish via state correlation with hook #4 | our plugin |
| 7 | Hook `experimental.text.complete` | trigger `opencode/session/processor.ts` L526-544 (on text-end of assistant text parts — incl. the summarizer's own text part); typed `plugin/src/index.ts` L327-330 | Rewrite the FINAL summary text after generation (`output.text` is mutable) — deterministic post-processing (e.g. diff vs prior summary, stamp markers) | our plugin |
| 8 | Hook `experimental.compaction.autocontinue` | typed `plugin/src/index.ts` L316-326 | Skip/keep the synthetic post-compaction continue turn — NOT summary content | our plugin |
| 9 | `compact_memory` queue `message` | `.opencode/plugin/compact_memory.ts` (post-compaction relay) | Continuation message AFTER compaction — NOT summary content | our plugin |

Current usage: NONE of hooks #4-#8 is registered by our plugins today (only
`ctx_watchdog.ts` registers `chat.message`, L730; `compact_memory.ts`'s "pre-compaction
dump hook" is internal tool dispatch, not an opencode hook — consistent with host-map
"both UNUSED").

## 4. Maintainer idea 1 — "drop all content older than 4 compactions"

Mechanics first: content ≥ 4 generations old is NOT in the message list — it exists
only INSIDE `previousSummary` (L364-366 folds exactly one prior summary, which itself
recursively contains everything before it, per `SUMMARY_UPDATE_INSTRUCTIONS`). So the
only surfaces that can act on it:

- **Soft (model-directed, plugin-only, cheap):** hook #4 `context` injection. The plugin
  knows the iteration count N (count of compaction parts via `ctx.client`) and the prior
  summary text; it appends: "This is compaction iteration N. In the prior summary, drop
  items that were introduced before iteration N-4 (finished/stale workstreams); carry
  forward only recent context." No config change, no fork. Compliance is probabilistic
  (the model does not see generation timestamps — it infers recency from the summary's
  own ordering).
- **Hard (deterministic, plugin-only, medium):** hook #4 `prompt` replacement. The plugin
  rebuilds the summarizer prompt itself from client reads: conversation = only messages
  since the (N-4)-th compaction part; prior summary = the (N-4)-th summary (or none);
  template = its own copy of `compaction_prompt.md`. Bypasses the host template entirely
  and deterministically bounds summary depth to 4 generations. Cost: the plugin must
  re-implement the host's serialization (tool-output truncation ~2000 chars,
  `serialize`/`truncate` in core compaction.ts L85-121) and diverges from host behavior
  (hidden-index handling L363-365, replay L340-356).
- **Fork (last resort):** cap prior-summary age in `processCompaction` (L364-366) —
  ~5-10 lines; only if both plugin routes prove insufficient.

## 5. Maintainer idea 2 — "mark new additions with the current compaction iteration"

- **Soft (cheapest):** hook #4 `context` injection with dynamic N: "Tag every item you
  ADD from this conversation (not carried from the prior summary) with a `[C<N>]`
  suffix." The static config override (surface #3) CANNOT carry N (config is static and
  the model cannot count its own iterations) — it can only request generic "mark new
  items" behavior.
- **Hard (deterministic):** hook #7 `text.complete` rewrite — the plugin stores the
  pre-compaction summary text (read before dispatch), diffs the new summary against it
  on text-end (identify the summarizer part via state correlation with hook #4 or a
  client read of the `mode: "compaction"` message), and stamps the new lines with
  `[C<N>]` mechanically. ~1 day plugin work; exact result, no model compliance needed.
- Combination: soft context instruction now; deterministic stamping only if the model's
  tagging proves unreliable in live tests.

## 6. Recommendation

**Plugin-side, phased — no fork, no maintainer config change for the initial phase.**

1. **Phase A (start here):** register an `experimental.session.compacting` handler in our
   plugin (new small hook module, e.g. under `.opencode/plugin/`); read the session's
   compaction parts via `ctx.client` (iteration count N + prior summary text); inject ONE
   `context` string carrying (a) the iteration-aware drop instruction (idea 1, soft) and
   (b) the `[C<N>]` tagging instruction (idea 2, soft). ~30-60 lines. Effort **~0.5-1 day**
   incl. live testing (one forked-session compaction per idea).
2. **Phase B (only if Phase A quality is insufficient):** upgrade the same handler to a
   full `prompt` replacement for idea 1 (hard, §4) and/or add a `text.complete`
   diff-stamper for idea 2 (hard, §5). Effort **1-2 days each**, same module.
3. **Optional static knob (maintainer call, zero agent work):** if the maintainer wants a
   permanent change to the summarizer's *personality* (brevity, language, section
   emphasis, "prefer dropping stale work"), a config `agent.compaction.prompt`/`system`
   override is the zero-code surface — it complements, not replaces, the dynamic hook
   (it cannot carry N).
4. **Fork: NOT recommended** for these two ideas — both are fully reachable from the
   plugin surface measured above; a fork would add a maintenance cost (see
   `2026-09-28_keeptokens-fork-effort.md` §4 risks) for a capability we already have.

## 7. Sources (pointers)

- Dev tree (all locators §1-§3): `home\AppData\Local\Temp\opencode\opencode-dev`
  — `packages/opencode/src/{session/compaction.ts, session/llm.ts, session/llm/request.ts,
  session/processor.ts, session/prompt.ts, agent/agent.ts, agent/prompt/compaction.txt,
  config/v2-compat.ts, server/routes/instance/httpapi/{groups,handlers}/session.ts}`,
  `packages/core/src/{session/compaction.ts, config/compaction.ts, config/agent.ts}`,
  `packages/plugin/src/index.ts`.
- #99 trace doc (body/config/keep semantics — NOT re-derived here):
  `.opencode/agent/knowledge/opencode-plugins/2026-09-27_summarize-keep-source-trace.md`.
- Fork-effort facts (risk/rebase cost): `.opencode/agent/research/
  2026-09-28_keeptokens-fork-effort.md`.
- Exact prompt reference (maintainer draft, read-only): `.opencode/maintainer/draft/
  compaction_guide/compaction_prompt.md`.
- Our plugin surface (read-only here): `.opencode/plugin/{compact_memory,compaction_core,
  ctx_watchdog}.ts`.
