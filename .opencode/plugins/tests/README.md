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

## Context-family smoke (TODO #137 units 3a + 3b, 2026-10-22)

    bun run context_family.smoke.mjs

46 checks against a mock `ctx` (no opencode process): the 3a legs — the
`context`-hook registration, the `ctx: ` tail injection with the byte-exact
gauge readout (name-marker window + budget + ITER suffixes from fixture
stores), the APPEND-ONLY cache pin (the untouched messages prefix byte-
compares), the own-session gate (mismatch -> no post, no line), the honest
`CTX=notAvailable` post, `db-error` -> ONE evidence line (no post),
`messages-not-array`, the suffix fail-open forms, the singular budget-at-cap
form — plus the 3b legs: the 5-rung nudge ladder on `tool.execute.after`
(each rung boundary: pct 50 / REM 30k / REM 20k / REM 10k / REM<5k —
fixture sessions with 120K/80K name-marker windows), the highest-rung-met
rule, per-rung dedup (second fire same rung -> no line, no call), the
no-total/db-error silence (ZERO lines on that channel), the `session.synthetic`
delivery captured on the mock (`delivery:"queue"`, text = the bare formatGauge
readout + the v1 rung text VERBATIM), the mock rejection/sync-throw ->
`delivery-rejected`/`delivery-threw` evidence lines with the tool call NOT
failed, and the handover pre-flight on `tool.execute.before` (missing/EMPTY/
whitespace spec file -> ONE `handover-preflight` warn; non-handover and
non-object input silent; `event.input` never mutated) and the whole-log
JSON invariants (kinds ONLY `ctxmsg`/`gauge`/`nudge`/`handover-preflight`).
Fixtures ride the scratchpad `home/AppData/Local/Temp/opencode/
ctx-family-smoke-v2` (fixture `session_v2`/`session_message` DB, budget +
loop-root files — NEVER the live DB; the shared gauge core is steered via
its test hooks). Expected final line: `SMOKE: ALL PASS`.
`packages/core/src/config/plugin/source.ts:164-167`).

## compact_memory smoke (TODO #137 units 4a + 4c, 2026-10-22)

    bun run compact_memory.smoke.mjs

63 checks against a mock `ctx` (no opencode process, NO backend request): the
loader shape + the `tool.transform`/`editor.add` registration (a plain JSON-
schema input, string output), the ported core's cap forms (CPU guard FIRST,
listed, unlisted -> `model_budget.default`, absent file -> 1), CPU denial with
ZERO side effects, SELF resolution from the `ToolContext` `sessionID`, the
compact body carrying NO keep fields (keys EXACTLY `[sessionID]`),
INCREMENT-ON-SUCCESS only (no burn at dispatch; the `session.compaction.
ended` event leg burns once and writes the v1-format COMPACT line into the
fixture `ctx.log` with the `tok=<keepTokens> budget` source), fire-and-forget
(a `slow` compact promise resolves AFTER the tool returns), the `.failed`
leg (no burn + a capped-preview evidence line), the emergency-1 at `count
== cap` and the exhausted refusal above, CROSS with the effective cap+1 +
the ` ovr` token and the `count == cap+1` refusal, the U3 marker legs (`
event.result = {summary, metadata:{marker:true}}` captured at the `comp
action` draft hook, the `boundary-ignored` line, the no-pending-record
silence), the native `delivery:"queue"` continuation delivered ONLY at
verified success + the rejection evidence, the `keep-not-applied` line,
the dump-leg audit line (`state:"ok"`/`"failed"`) ONCE per allowed dispatch,
the whole-log kind/cap invariants, the #119 additive budget-file invariant,
and cleanup (registrations disposed, the event consumer stopped). Fixtures ride
the scratchpad `home/AppData/Local/Temp/opencode/compact-smoke-
v2` (budget file + BOTH logs — NEVER the live DB). Expected final line:
`SMOKE: ALL PASS`.

Unit 4c grows the SAME file with the pre-compaction dump legs: `preCompaction
DumpName` byte-exact in the normal/stamped/#92-json forms + `resolveNodeExe`
(the node-runtime passthrough vs the bun-host fallback); the success lane
(BOTH artifacts under the ws corpus + the v1 `DUMP-OK … ms=` ctx.log lines);
the no-script lane NEVER blocks (the dispatch still lands, the response
carries the v1 WARNING, EXACTLY two `DUMP-RETRY=1` + two one-lined `DUMP-
FAIL` lines) plus the hook's `{ok:false, files:[], error:"md: … | json: …"}`
return shape; RETRY-once (ONE retry line for the failed artifact, the other
artifact landing directly per #92); the no-overwrite repeat landing STAMPED
with both artifacts sharing the stamp and the base files byte-identical; and
the REAL twin CLI (`agent/scripts/db/dump_session_v2.mjs`) pinned in a sandbox
copy against FIXTURE DBs: full/`--lite` (tool header-only)/`--json` shapes
with the v2 row renderers, the exit-2 unsafe-relpath/flag-conflict/no-v2-
tables rejections, the exit-1 `no such session`, the `--all --slim` corpus
lines, and all three backends (`node:sqlite` default, the copied `sqlite3.
exe` spawn lane byte-equal modulo the backend field, `bun:sqlite` FIRST under
the bun host).

## context_trim_v2 smoke (TODO #137 unit 4b, 2026-10-22)

    bun run context_trim_v2.smoke.mjs

65 checks against a mock `ctx` (no opencode process — the window rows come from
a MOCKED `session.context` RPC, the header's ctx figure from the gauge core
steered at a v2-shaped fixture DB): the loader shape + the `tool.transform`/
`editor.add` registration (name `context_trim`, the v1-mirroring args + the v2
`clear` lane), the REPORT leg (the compaction head + the header's `boundary-
state`, the gauge readout line, the `tokens=` sums over the five token fields
and the `bytes4=` fallback, the read/bash `target=` detail, the trim-RANGE
option lines with the read/thought/shell split, the `biggest:` ranking with the
error turn excluded, the `last:` flag, the dry-run counts + the floor verdict),
the tail-store leg (set/clear lines in v1's `tail-set= <old> -> <new> keep=<
count>` shape, every rejection line — session-not-found, target-not-found,
target-at-window-head, retained-tail-below-floor, keep-invalid/keep-exceeds-
history/keep-at-window-head, the mutual-exclusion + usage errors — with the
store UNTOUCHED by rejections and the write ADDITIVE (#119), the default store
path + `setStoreFileForTest` steering), the `session.context` HOOK filter
(drops EXACTLY the pre-boundary id-carrying entries, KEEPS the id-less
projections, appends NOTHING, ONE `trim` line), the STALE-boundary fail-open
(ONE deduped `boundary-stale` line, nothing dropped, the report's `boundary-
state=stale` header), the read-failure channels (`context-read-failed`/`session-
not-found`/`messages-not-array`), the whole-log kind/cap invariants, and the
COMPOSITION pins with the REAL context_family plugin registered on the same
mock (both handler orders on ONE draft: the `ctx: ` injection survives the
filter byte-exactly, the pre-boundary entries are gone in both, the surviving
entries byte-compare) + cleanup. Fixtures ride the scratchpad
`home/AppData/Local/Temp/opencode/ctx-trim-smoke-v2` (fixture
`session_v2`/`session_message` DB + budget file; the boundary store + the
evidence log ride the mock WS root — NEVER the live DB). Expected final line:
`SMOKE: ALL PASS`.

## loop_log smoke (TODO #137 unit 5a, 2026-10-22)

    bun run loop_log.smoke.mjs

29 checks against a mock `ctx` (no opencode process, NEVER the live loop
folder): the loader shape `{id:'loop_log', setup}` + the `tool.transform`/
`editor.add` registration (plain JSON-schema input with required status/content
+ optional role/model/session, string output, teardown disposes the
registration), the status token table (one case per keyword in order done/return/
warn/info/start/correct, `restart` -> START, case/dash normalization) and the
unrecognized/EMPTY-status v1 Error string with ZERO writes (no folder, no
append), the folder rules (fresh `autorun-<date>_<HH-MM>` create flagged
`(created)`, single-folder reuse flagged `(existing)`, SEVERAL -> most-
recently-modified with the ANOMALY note appended LAST and the other folder
untouched), the line format `<stamp> <status> <role> <session> <model>
<content>` (append-only, minute-boundary-safe), the readback readback-match/
readback-MISMATCH confirmation (glued partial line names the ACTUAL last
line), the `corrects:` line (byte-exact previous line; omitted for an empty
log), and the Part A auto-fill chains on the v2 carrier (args beat context;
blank args fall through to context.sessionID/context.agent; the all-`unknown`
fallback — the v1 twin's sessionId/session.id/extra.model.id legs have NO v2
carrier, the fallthrough carries). Fixtures ride the scratchpad
`home/AppData/Local/Temp/opencode/small-write-tools-smoke-v2/looplog`
(per-fixture `setup` retargets the repo-root carrier — NEVER the live DB or
loop folder). Expected final line: `SMOKE: ALL PASS`.
