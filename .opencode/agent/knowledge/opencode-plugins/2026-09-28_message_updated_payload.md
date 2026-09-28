# 2026-09-28 — `message.updated` event payload carries the finished step's token usage (#116 source-side evidence)

TODO #116 question: does the `message.updated` event payload carry token
content — can a plugin derive the live context WITHOUT a DB read?

**Verdict (source-side): YES — a real-time readout is feasible plugin-side
(option (a) in the #116 acceptance).** The live capture (3+ raw payloads,
the #116 DoD) is still pending the maintainer's restart + plugin
registration.

- **Do:** treat `message.updated` as a token source for a live gauge — the
  payload's `info.tokens` IS the message row's token state at step finish
  (same values the DB carries afterwards), so the last `message.updated`
  for an assistant message per session feeds ctx = `tokens.input +
  tokens.output + tokens.cache.read` (the #103 formula) with no DB read.
  Cadence: one event per step-finish + one at message finalization — NOT
  per part delta (mid-step there are no token updates; the running ctx
  grows in one jump per step).
- **Why (evidence — source, the opencode-dev tree = the installed 1.18.32
  build, provenance verified in the #99 close note):**
  - SDK type: `EventMessageUpdated = { type: "message.updated",
    properties: { info: Message } }` (`packages/sdk/js/src/gen/types.gen.ts`
    L145-150); `Message = UserMessage | AssistantMessage` (L143).
  - `AssistantMessage` declares `tokens: { input, output, reasoning,
    cache: { read, write } }` + `cost: number` + `time.completed?` +
    `finish?` (types.gen.ts L112-141).
  - Emit: `Session.updateMessage` publishes
    `SessionV1.Event.MessageUpdated` with `{ sessionID: msg.sessionID,
    info: msg }` (full object) — `src/session/session.ts` L629-633.
  - Step-finish path: `src/session/processor.ts` L452-470 — on each step
    finish `Session.getUsage(...)` computes the usage, then
    `ctx.assistantMessage.tokens = usage.tokens` (REPLACED per step — the
    row's tokens column = the LAST step's tokens) + `cost += usage.cost`
    (accumulated) + a `step-finish` part is written +
    `session.updateMessage(ctx.assistantMessage)` → the event fires with
    the set tokens. Finalization: L609-610 sets `time.completed` +
    `updateMessage` again.
  - Corroboration: the CLI's own run consumer reads the same event —
    `src/cli/cmd/run/session-data.ts` L825-850 extracts
    `event.properties.info` and renders `formatUsage(info.tokens,
    limits[...], info.cost)`; the file's header comment (L767) states
    "message.updated → learn role, flush buffered parts, track usage".
- **Ref:** the #116 entry in TODO.md; host-map.md §event hook (the
  installed host's `event` hook DOES deliver `message.updated` live with
  `properties.sessionID` — host-map L226); the #103 gauge semantics
  (last FINISHED step's in+out+cr).
- **Residual (live, post-restart):** confirm the plugin `event` hook
  receives the same payload shape (ids-only vs full info); capture 3+ raw
  payloads around a busy tool-call step (the #116 acceptance); confirm
  the tokens arrive only at step finish (no mid-step token events).
- **Keys:** message.updated, event hook, tokens, cost, real-time gauge,
  #116, #103, processor, updateMessage, step-finish.
