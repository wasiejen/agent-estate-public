# v2 plugins — smokes + typecheck (TODO #137)

Machine-local verification for `.opencode/plugins/` (Unit A: the intercept
observer; unit 3a: the context-family core). The absolute paths point at
this machine's fork workspace and scratchpad.

## Smoke (bun, mock ctx — no opencode process)

    bun run smoke.mjs

47 checks against a mock `ctx`: the surviving channels (read-scoped fuzzy
d<=2 with the gap rule, edit-scoped fuzzy d<=1, `write`-tool exclusion,
R8 typed-path redirect fail-closed, the C doubled-segment anomaly with the
JSON-escaped `\\` collapse, the out-of-sandbox note, the B' hard-stop,
the write/edit journals) + whole-log invariants (8-field shape, surviving
verdicts only, ZERO pair/numword lines) + the model-field pins (v2-migration
unit 1, 2026-10-21): the line's model field resolves through the shared gauge
core, steered at a scratchpad FIXTURE DB carrying a `session_v2` row for the
mock sid (`fx_gauge_v2.db` — NEVER the live DB), and stays the literal
`unknown` for an id present in neither session table.

Fixtures and the log are written to the scratchpad
`home/AppData/Local/Temp/opencode/intercept-smoke-v2`
(recreated on every run). The plugin is imported directly by bun.
Expected final line: `SMOKE: ALL PASS`.

## Typecheck (tsgo — the fork's checker)

    home/Repos/opencode/node_modules/.bin/tsgo.exe -p tsconfig.json

Zero errors expected. `tsconfig.json` maps `@opencode/plugin` to the
fork's source (`packages/plugin/src/promise/index.ts`) and pulls
`@types/node` from the fork's installed workspace, so the plugin's
type-only import is checked against the real v2 types (the clone
itself has no node_modules).

Both tools run read-only against the fork; the smoke writes only the
scratchpad fixtures. The `tests/` dir has no `server.ts`/`index.ts`
entrypoint, so v2 plugin discovery drops it at scan time (fork
`packages/core/src/config/plugin/source.ts:164-167`).

## Context-family smoke (TODO #137 unit 3a, 2026-10-22)

    bun run context_family.smoke.mjs

24 checks against a mock `ctx` (no opencode process): the `context`-hook
registration, the `ctx: ` tail injection with the byte-exact gauge readout
(name-marker window + budget + ITER suffixes from fixture stores), the
APPEND-ONLY cache pin (the untouched messages prefix byte-compares), the
own-session gate (mismatch -> no post, no line), the honest `CTX=notAvailable`
post, `db-error` -> ONE evidence line (no post), `messages-not-array`, the
suffix fail-open forms, the singular budget-at-cap form, and the whole-log
JSON invariants (kinds ONLY `ctxmsg`/`gauge`). Fixtures ride the scratchpad
`home/AppData/Local/Temp/opencode/ctx-family-smoke-v2` (fixture
`session_v2`/`session_message` DB, budget + loop-root files — NEVER the live
DB; the shared gauge core is steered via its test hooks). Expected final
line: `SMOKE: ALL PASS`.
`packages/core/src/config/plugin/source.ts:164-167`).
