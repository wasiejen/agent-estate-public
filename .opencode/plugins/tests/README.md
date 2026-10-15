# v2 intercept observer — smoke + typecheck (Unit A, TODO #137)

Machine-local verification for `.opencode/plugins/intercept_observer.ts`.
The absolute paths point at this machine's fork workspace and scratchpad.

## Smoke (bun, mock ctx — no opencode process)

    bun run smoke.mjs

46 checks against a mock `ctx`: the surviving channels (read-scoped fuzzy
d<=2 with the gap rule, edit-scoped fuzzy d<=1, `write`-tool exclusion,
R8 typed-path redirect fail-closed, the C doubled-segment anomaly with
the JSON-escaped `\\` collapse, the out-of-sandbox note, the B'
hard-stop, the write/edit journals) + whole-log invariants (8-field
shape, surviving verdicts only, ZERO pair/numword lines, model=unknown).

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
