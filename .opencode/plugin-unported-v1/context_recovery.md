# context_recovery.ts — the emergency context-recovery backstop

TODO #93: the 2026-09-25 event-hook port of the retired T5 prototype (the deactivated copy is gone — this file is the single source, auto-loaded by the host; activation = the host restart).

## What it does

On a REAL context-overflow error (the host's `session.error` event) with the `emergencyRecovery` flag ON, it compacts the stuck session via the shared core and hands control back — it makes a limit-stuck session RESUMABLE. The RESUME is owned by the auto-resume unit-4 flow (planner sessions) / the planner's task_id resume (worker sessions).

## Implementation sketch

- Entry: the `event` hook ONLY (notification-only, returns VOID — the old design's `"session.error"` hook does NOT exist in the current SDK; the installed `Hooks` has `event?: (input: {event}) => Promise<void>`).
- The once-per-overflow in-memory guard per sessionID: the host emits FOUR `session.error` events for ONE overflow (its internal tail-strip retries — measured 2026-09-23); the follow-up events are no-ops; the guard clears on the session's idle.
- Compaction via `./compaction_core.ts` (the 2026-09-26 unification): the config-resolved summarizer pair (the root `opencode.jsonc` `agent.compaction.model` → fallback the session's OWN model read via its messages — its own providerID + modelID) + keep {messages, tokens?}.
- VERIFIED success only → the budget increment + the COMPACT line (`.opencode/temp/ctx.log` — the core's verified-success handling).
- Over budget / unresolvable pair / failed compact → CLEAN FAIL: no compact, no line, no budget change — the session error propagates (the visible hard stop; the `-WARNING` line is the protocol's job, not the plugin's).

## The activation flag

`emergencyRecovery` — a top-level BOOLEAN in `.opencode/temp/compact_budget.json` (the SAME file as the shared budget store, read PER FIRE through the core's config reader — a mid-run flip takes effect on the next overflow). ONLY the value `true` enables it; missing file / missing key / any other value / unparseable JSON → OFF (the hook does NOTHING).

## Gotchas / lessons

- The hook NEVER resumes (2026-09-26 unification Part B — the old reload-directive prompt injection is REMOVED).
- The 2026-09-26_14-26 incident (the hook's pair resolution did not carry the session's own providerID + modelID, and its promptAsync resume ran against the default agent/model) is fixed structurally by the shared core.
- The overflow error shape is a `MessageAbortedError` — "request (N tokens) exceeds the available context size (M tokens)" (the live 2026-09-23 fork test).

## Tests

`tests/context_recovery.smoke.mjs`.
