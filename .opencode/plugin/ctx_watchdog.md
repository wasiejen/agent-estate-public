# ctx_watchdog.ts — the gauge/ctx-nudge family (the live plugin)

Renamed from handover_v2.4.ts (2026-09-11, approved rename); the header version history (v1.1 → v2.8.1) is the contract of record. Bundles the shared gauge core (`scripts/gauge.mjs` + `scripts/peek.mjs`, built-in node:sqlite) and the probe gate (`probes/handover_probe.mjs`).

## What it does

Feeds every acting session its context readout (per tool result), ladders auto-nudges before the stop line, injects the `ctx:` line per message, pre-flights handover delegations, and logs the host events (the v1.1 log observer). v2.8: ONE per-session gauge read per `tool.execute.after` feeds THREE consumers from the SAME read.

## Implementation sketch

- Entry: the plugin factory returning four hooks:
  - `event` — one capped JSON line to `.opencode/plugin.log` (the delta filter + truncation ladder; the opt-out `SKIP_EVENT_TYPES` set — UNSEEN event types stay logged: shape learning).
  - `tool.execute.before` — the handover pre-flight: the spec file `agent/handover/handover_task.md` missing or empty → one warn line; observation only, never blocks or mutates the delegation.
  - `tool.execute.after` — the v2.8 readout consumer trio: (1) the MINIMAL readout appended IN PLACE to `output.output` — `(NN% used, NNNK left)` known window / `(NNNK used)` unknown window (SPEAKING forms, v2.8.1); (2) the auto-nudge LADDER — rungs 50 / 70 / 80 / 90 / stop-line (pct OR REM whichever first; per-session read — the match-only gate would blind-spot concurrent sessions, v2.6); race-free delivery via setImmediate (busy → skip silently); (3) ONE append-only `.opencode/temp/ctx.log` entry IFF the readout was actually APPENDED (log ⟷ appended returns isomorphic).
  - `chat.message` — the session-gated `ctx: <full readout>` line pushed as ONE text part onto the just-received last message (append-only — the cacheable prefix stays byte-stable); sid mismatch → SILENT (no post, no gauge line).
- Shared core: `scripts/gauge.mjs` (`readGauge`/`formatGauge` — backend chain, window rule, readout forms; the ` | N compactions left` budget suffix when the compaction budget store resolves — item 3, 2026-09-24; NEVER throws — the `db-error` kind is the silent fallback). `scripts/peek.mjs` — the self-peek CLI over the SAME core (the retired python peek is gone — v2.5 de-peek).
- Nudge delivery: `client.session.promptAsync` with ONE synthetic text part (fire-and-forget — never awaited in the hook; rejections evidence-logged, kind `nudge`).

## Gotchas / lessons

- v2.3 died: mutating ANYTHING in front of the newest message invalidates the prompt cache EVERY turn (the maintainer's slowdown + looping) — per-message append-only injection is the shape (the frozen copy sits in `deactivated/`).
- The passed `output` object is the ONLY mutation channel on `tool.execute.after` (no return value is used — SDK type fact).
- `client.session.status()` returns an ALL-SESSIONS `{[sid]: SessionStatus}` map (no path argument — the 031 sketch's `status({path:{id}})` is NOT the SDK signature).
- Unknown-window / no-total / db-error reads NEVER nudge — SILENT (the chat.message gauge lines stay the failure channel).
- v2.7 (P02): the after-hook summary mirror is REMOVED (7 confirmed collisions with the committed summary file — the worker writes its own; the probe pins the no-write behavior, S3).

## Tests

`probes/handover_probe.mjs` (the gate — the total is self-annotated in the probe header).
