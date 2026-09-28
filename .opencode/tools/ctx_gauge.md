# ctx_gauge.ts — the context-gauge readout tool

T2 (iter-10, the loop-tool-batch part 2). The gauge readout as a DIRECTLY-FIRED tool instead of the `node .opencode\plugin\scripts\peek.mjs` bash shell-out (~15k tokens per readout — the maintainer's observation that motivated the batch).

## What it does

Reads the context usage of the current (or a named) session, read-only, and returns the full readout IN-BAND: `SESSION=… CTX=… (…%) REM=…` (window unknown → no pct/REM; no total / unreadable db → `CTX=notAvailable` with the error text appended to the line).

## Implementation sketch

- Entry: `export default tool({ description, args, execute })` — args: `sessionID?` (empty/omitted → the newest-updated session, the default peek read).
- Wraps the ONE shared gauge core `../plugin/scripts/gauge.mjs` (`readGauge`/`formatGauge` — backend chain, window rule, readout forms; NOTHING re-derived here; the core NEVER throws — a hard failure comes back as `kind: "db-error"` with the capped, backend-naming error text, APPENDED in-band where peek.mjs would write stderr).
- The budget suffix (item 3, 2026-09-24): when the compaction budget store (`.opencode/temp/compact_budget.json`) resolves, the readout line ENDS with the distinct ` | N compactions left` field (file absent / unparseable → no suffix) — the per-model cap (+ the once-per-session emergency).

## Gotchas / lessons

- The readout LAGS true usage by ≈1 tool call (~5k tokens — the in-flight step's output, not yet in the DB; the gauge reads the last FINISHED step's in+out+cr, #103) — treat it as a LOWER bound and plan with margin; the SAME lag applies to the injected `ctx:` nudge lines (the ctx_watchdog chat.message line, the auto_resume unit-2 suffix).
- The `ctx_gauge` tool, `peek.mjs`, and the ctx_watchdog plugin wrap the SAME core — one implementation, three surfaces (knowledge_plugins.md).
- Registration is the maintainer's domain (deliberately NOT registered in any repo config).

## Tests

`tests/ctx_gauge.smoke.mjs` (the shared core is covered by `tests/gauge_core.smoke.mjs`).
