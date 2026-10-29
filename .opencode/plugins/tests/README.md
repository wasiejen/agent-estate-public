# v2 plugins — smokes + typecheck (TODO #137)

Machine-local verification for `.opencode/plugins/` (Unit A: the intercept
observer; unit 3a: the context-family core). Every smoke resolves its repo
root from its own file (`import.meta.dirname` -> up 3), so run the commands
below FROM this directory in the MAIN checkout
(`repo-root`) — the suite follows whatever
checkout owns `tests/`. The only absolute paths left are the fork workspace
(`home/Repos/opencode`) and the scratchpad
(`home/AppData/Local/Temp/opencode`) (TODO #156, 2026-10-26).
Subfolder `v1/`: the plain-`node` smokes for `.opencode/tools/**` + the gauge
core (relocated from the deleted v1 estate, #150 unit B) — run those from the
repo root with `node`, not from here with bun.

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

## Context-family smoke (TODO #137 units 3a + 3b, RE-PINNED for the #153/#154 append leg, 2026-10-26)

    bun run context_family.smoke.mjs

46 checks against a mock `ctx` (no opencode process): the loader shape + the
hook list EXACTLY `execute.before` + `execute.after` (the `session.hook(
"context")` draft leg is NOT registered — a separate session-hook map pins that);
the append lanes (a string `output`, the LAST text item of a content array, a
content array without a text item -> a NEW tail item, a string `content`, an
empty result -> `output` SET), the append-only tail (the original output survives
as a byte prefix), the byte-exact gauge line `ctx: CTX=<n> (<p>%) REM=<m>`
(NO `SESSION=` token, NO `ITER=` — #212 dropped the budget suffix), the >= 1%-of-window economy
gate (delta below -> nothing, delta at exactly 1% -> append), the `ctx_gauge`
skip on a below-rung AND on a rung session, the silence lanes (a no-total read —
which carries a resolved window but NO ctx —, an sid mismatch, a missing event
sessionID, an ERROR-status call with nothing appendable), `db-error` -> ONE
`kind:gauge` line with a capped preview and NO append, and the durable store
`.opencode/temp/ctx_family_store.json` (the first-append CTX baseline, the
reload-surviving rung dedup from a pre-seeded `fired` list, the additive #119
write that keeps a foreign key + another session's entry, the fail-open read on
a malformed file); the 5-rung ladder ON THE APPEND CHANNEL (each boundary: pct
50 / REM 30k / REM 20k / REM 10k / REM<5k over the 120K/80K name-marker
fixtures, the highest-rung-met rule, per-rung dedup, and ZERO
`session.synthetic` calls — the mock keeps the method so any call WOULD be
counted); and the handover pre-flight on `tool.execute.before` (missing/EMPTY/
whitespace spec file -> ONE `handover-preflight` warn; non-handover and
non-object input silent; `event.input` never mutated) + the whole-log JSON
invariants (kinds ONLY `ctx-append`/`gauge`/`handover-preflight` — `ctxmsg` and
`nudge` retired) + the cleanup dispose pin.
Fixtures ride the scratchpad `home/AppData/Local/Temp/opencode/
ctx-family-smoke-v2` (fixture `session_v2`/`session_message` DB + the budget
file — NEVER the live DB; the shared gauge core is steered via its test hooks;
the store and the evidence log ride the mock WS root). Expected final line:
`SMOKE: ALL PASS`.

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

71 checks against a mock `ctx` (no opencode process — the window rows come from
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
COMPOSITION block against the REAL context_family plugin on the CURRENT channel
(#157 re-pin, 2026-10-26): context_family registers EXACTLY `execute.before` +
`execute.after` and APPENDS its `ctx: ` line to the tool RESULT — so the pins
cover the registration shape, ONE append per after-event (the original output
survives as a byte prefix), the `ctx-append` evidence line in its own log with
NO `ctxmsg`/`nudge` kind, the draft filter's inability to mutate a tool result
(silent with no boundary, one honest `messages-not-array` line with one), the
>= 1%-of-window economy gate, the append surviving a SET boundary (a moved fill),
and cleanup disposing both hooks + the trim plugin keeping its draft handler.
Fixtures ride the scratchpad
`home/AppData/Local/Temp/opencode/ctx-trim-smoke-v2` (fixture
`session_v2`/`session_message` DB + budget file; the boundary store + the
evidence log ride the mock WS root — NEVER the live DB). Expected final line:
`SMOKE: ALL PASS`.

NOTE (2026-10-26, #157): the COMPOSITION block is re-pinned onto the `execute.after`
append channel — the `ctx: ` line no longer rides the request draft, and
`context_family` registers no draft handler at all (#153). PLANNER RULING recorded
here: the `kind:"gauge"` db-error evidence line STAYS on `execute.after` (one
channel, pinned as A14 in `context_family.smoke.mjs`); the retired
`session.hook("context")` leg was never revived. The append-leg ladder pins live in
`context_family.smoke.mjs`. The clone-root resolution is fixed: this suite resolves
its root from its own file (TODO #156, 2026-10-26).

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

## submit smoke (TODO #137 unit 5a, 2026-10-22)

    bun run submit.smoke.mjs

29 checks against a mock `ctx` (no opencode process, NEVER the live inbox
trees): the loader shape `{id:'submit', setup}` + the `tool.transform`/
`editor.add` registration (FIVE optional string props, no required — the
>=1 gate is runtime, string output, teardown disposes the registration), the
zero-param and empty/blank-string error string (`error: none of feedback/
knowledge/todo/ideas/memory provided — nothing written`) with NO file
touched, the v1 channel map byte-identical (feedback -> agent/agent_feedback.md
###, knowledge -> agent/knowledge/knowledge_inbox.md ##, todo -> todo_inbox.md
## at the repo root, ideas -> agent/agent_ideas.md ###, memory -> agent/memory/
`<role>`/memory_inbox.md ### — `planner_FlashNext`/`worker_Q3S_170K` prefix
split, no-agent -> the `agent` namespace), the entry form `<header> <YYYY-MM-
DD_HH-MM> <role> <session>` + raw text + one trailing blank line with the
role/session auto-fill (context.agent else `agent`, context.sessionID else
`unknown`), the return blocks `<param>`/`target:`/`entry:` in feedback/knowledge/
todo/ideas/memory order sharing ONE stamp per call, append-only (sentinel
byte-exact, unprovided targets untouched), and the 2026-10-21 NEWLINE GUARD
carried from the MAIN repo's v1 twin: a final-byte probe lands a one-
`\n` separator when the target lacks a trailing newline (the glued-
header bug fixed), a `\n`-terminated target gets NO extra separator, an
absent target starts clean. NOTE: the clone's v1 twin `.opencode/tools/
submit.ts` predates this guard — the port carries the MAIN version (logged
discrepancy). Fixtures ride the scratchpad
`home/AppData/Local/Temp/opencode/small-write-tools-smoke-v2/submit`.
Expected final line: `SMOKE: ALL PASS`.

## ctx_gauge smoke (TODO #137 unit 5b, 2026-10-22)

    bun run ctx_gauge.smoke.mjs

11 checks against a mock `ctx` (no opencode process): the loader shape `{id:'
ctx_gauge', setup}` + the `tool.transform`/`editor.add` registration (ONE
optional `sessionID` string arg, no required, string output, teardown disposes
the registration, NO hooks), the v1-carried in-band readout forms over a
scratchpad FIXTURE `session_v2`/`session_message` DB steered via the gauge
core's test hooks (NEVER the live DB): the named-session byte-exact readout
(mass/pct/REM ending at REM — #212 (U26) retired the ` | N compactions
left` budget suffix; the fixture-store pins are drop-regression guards),
the EMPTY/non-string-`sessionID` default read (newest `time_updated` row),
the no-total `CTX=notAvailable` form (NO cap-1 fallback suffix, NO
` (unlisted)` marker — #212 retired both), the budget-store absent ->
default trip constant, and the db-error in-band mirror (NO throw, the
line NEVER replaced, ` — <error>` appended, the `unknown` sid -> NO suffix,
the steer restores). Fixtures ride the scratchpad
`home/AppData/Local/Temp/opencode/ctx-gauge-smoke-v2`. Expected
final line: `SMOKE: ALL PASS`.

## state_snapshot smoke (TODO #137 unit 5b, 2026-10-22)

    bun run state_snapshot.smoke.mjs

33 checks against a mock `ctx` (no opencode process): the loader shape `{id:'
state_snapshot', setup}` + the `tool.transform`/`editor.add` registration (a
NO-argument object input, string output, teardown disposes the registration,
NO hooks) and the digest byte-shape carried from v1 over FOUR scratchpad FIXTURE
repo trees (per-fixture `setup` retargets the repo-root carrier; NEVER the live
repo/loop folder/DB): the seven-section order (`## loop` AFTER `## todo`), the
fixture `git init` commit
under `## git`, the todo header count + LAST-15 `#<id> — <60-char truncation>`
forms (`## Notes` NOT counted), the `## loop` section pinned in BOTH forms
(spec #155: FX1/FX2 have no `autorun-*` dir → `no-looprun`; FX4's
`loop/autorun-X/counter.json` → byte-exact `loop=autorun-X ITER=7
log=loop/autorun-X/loop_log.md`, and the fail-closes — a `looprun` MISMATCH, a
missing counter, a non-integer `n`, an EMPTY `loop/` dir → `no-looprun`),
the maintainer inbox first-lines max-5 + `… (+1
more)` + priority.md's first 10, the sorted proposals root filenames (subfolder
+ .txt excluded), the READY-MADE marker sweep run via bash carrying the fixture
`--now` line with the `/done/`-filtered line ABSENT, the READ-ONLY pin (the
fixture tree byte-identical around a digest run) and the 49-line FX1 digest
under the cap; FX2 pins the EXACT non-planner refusal line, the EMPTY/absent-
agent soft-gate pass, the fail-closed `(git log failed: …)` / `(nap missing: …)`
lines, the `0 open-entry headers` count line and the `(none)` / `(priority.md
missing)` empties; FX3 pins the 150-line hard cap (a 158-line digest, all seven
headers preserved,
the `… (+20 more)` steer SURVIVES, the LAST section's content lines trimmed
from the end backwards — markers keeps 12 of 20, proposals INTACT at 100). The child's
`fatal: not a git repository` stderr noise on the non-repo fixtures is expected.
Fixtures ride the scratchpad `home/AppData/Local/Temp/opencode/
state-snapshot-smoke-v2`. Expected final line: `SMOKE: ALL PASS`.

## dev_get_tool_context_contents smoke (TODO #137 unit 5b, 2026-10-22)

    bun run dev_get_tool_context_contents.smoke.mjs

13 checks against a mock `ctx` (no opencode process; NO fixtures — a pure
context reader, NOTHING touches the filesystem): the loader shape `{id:'dev_get_
tool_context_contents', setup}` + the `tool.transform`/`editor.add` registration
(the v1 description VERBATIM, a NO-argument object input, string output, teardown
disposes, NO hooks), the ONE-plain-string return discipline (the v1 2026-09-27
fix — the dump parses as an object, NEVER an array, NEVER a throw), the dump
fields = the v2 `ToolContext` keys that EXIST (`contextKeys` + sessionID/agent/
messageID/id/progress/signal — values carried, `progress` -> the `<function>`
marker), the v1-only legs (`callID`/`extra`/`messages`/`metadata`/`ask`/`directory`
/`worktree`/`client`) NEVER invented as dump fields — their absence rides the
ACTUAL runtime `contextKeys` listing (a live extra key shows there but is NOT
fabricated as a field), the absent-field drop (NO null placeholders), the
`undefined`-context -> `{contextKeys:[]}` form, and the non-serializable (
circular) leg pinned THROUGH A DUMP-CARRIED FIELD (`signal` circular — a
contextKeys-only string can never trip it): the v1 fallback line `JSON.stringify
failed (…) — context keys only: <keys>`, NEVER a throw. Expected final line:
`SMOKE: ALL PASS`.

## block_transfer smoke + sandbox smoke (TODO #137 unit 5c, 2026-10-22)

    bun run block_transfer.smoke.mjs

90 checks against a mock `ctx` (no opencode process; fixtures ride the scratchpad
`home/AppData/Local/Temp/opencode/block-transfer-smoke-v2`): the loader
shape `{id:'block_transfer', setup}` + the `tool.transform`/`editor.add` registration
(12-property JSON-schema input, required `[mode]`, the mode enum, string output, teardown
disposes), the description carried (WHEN-NOT/RETURN-LINES/BUFFERS/EDGE sections), the
mode guard (no default, unknown echoes AS GIVEN, case normalizes), every mode's happy-
path feedback line BYTE-EXACT (assemblyFeedback + opLine formats, the WRITE
`old A..B -> new C..D, file now N line(s)` group, the MOVE/PASTE insertion suffix
before the buffer tail), the teaching taxonomy (not-found + Closest-lines hint,
non-unique + count + first-3 matches + ` …`, ref-out-of-range with the count, the PEEK
window teaching), the ALL-DIGIT line-number ref rule (digit-strings + numbers, the
"0" not-1-based leg), the COPY/APPEND three-form rejections (clashes, empty list,
bare-call form lesson, partial-marker trio), the buffer semantics (COPY replaces,
APPEND appends, PASTE/REPLACE preserve, failed ops leave NO buffer behind, `last_write`
auto-store, `last_move_source`, CLEAR), the PEEK/MAP bounded previews (blank-skip head/
tail pick, 25-cap window, 200-char MAP cap + `…`, heading regex at column 0, the
non-overlapping small-buffer tail), the CUT/DELETE exact-cuts-only rule, the
WRITE never-creates + multi-region REJECT + overlap REJECT + `new (empty)` forms, the
same-file MOVE-with-shift (target above/below/INSIDE), the MOVE dst-checks-before-cut
order, and the EOL/EOF hardening (CRLF round-trips, trailing-newline EOF inserts
BEFORE the blank tail, new files join WITHOUT a trailing newline). Expected final
line: `SMOKE: ALL PASS`.

    bun run block_transfer.sandbox.smoke.mjs

23 checks — the sandbox twin. The SELF-SET fixture TEMP/TMP mechanism (the v1
pattern) makes it env-robust; deny fixtures sit OUTSIDE all roots (direct children of
the user Temp dir, siblings of the fixture repos — the fixture repos themselves ride
`home/AppData/Local/Temp/bt_fx_sandbox_v2`, OUTSIDE the scratchpad config
root, so the fixture configs genuinely control access): the byte-exact deny line
`Error: '<given>' is outside the sandbox (allowed: <roots>)` vs a test-side mirror of
the roots list (CWD, config allow roots, TEMP override, os.tmpdir() — deduped by
EXACT string equality), guard ordering (sandbox wins over 'not found' and over the
REPLACE empty-buffer check; MOVE guards the dst before the source is touched; the
REJECT never writes), CONFIG allow roots + the TEMP-override ALLOW legs, the
case-insensitive root prefix, the /**-twin dedupe in the printed roots list, BOTH
config shapes via fixture-repo plugin copies (the v1 object form; the v2 native
array form with LAST MATCH WINS — a later deny for the SAME resource removes the
earlier allow — /** stripping and entry dedupe), and the malformed-config EMPTY-
set fail-open (CWD + temp roots ONLY, NEVER "everything allowed"). The fixture
plugin copies read their OWN fixture `opencode.jsonc` at import (one CONFIG_ROOTS
per module instance). Teardown dispose + the ambient env restore pinned. Expected
final line: `SMOKE: ALL PASS`.

## auto_resume smoke (TODO #137 order 2, 2026-10-22)

    bun run auto_resume.smoke.mjs

57 checks against a mock `ctx` (no opencode process; NO backend request; fixtures
ride the scratchpad `home/AppData/Local/Temp/opencode/auto-resume-
smoke-v2`, the LIVE temp estate NEVER touched): the loader shape `{id:'auto_resume',
setup}` + the `context`-hook registration + the exported smoke levers
(`runTick`, `trimLogIfNeeded`, `actionFromText`, `scopeVerdict`); UNIT 1 — the
init `log-trim= old=<pre> new=512` guard cutting a pre-seeded 120-line log while
KEEPING the #90 part-C `route= restart spawn`/`spawn=` PAIR for the restore, the
`surface= v=<sha8> …` probe line (typeof ONLY, the v2 Pick's methods +
`event.subscribe` + `app.name`), the `event=<type> sid=<sid> <key fields>` line
shape (status / finish+tokens / created-agent key fields) and the NEVER-logged
delta classes; UNIT 3 — the ONE-SHOT trigger file consumed to `.consumed` EVEN
ON FAILURE, the FLAT `SessionCreateInput` body (ident `title` alone for a file-
trigger spawn; `agent` + `model:{id,providerID}` on a restart spawn), the
QUEUED `delivery:"queue"` prompt, the `loop/<folder>/counter.json` n = max
(candidate, loop-log `planner-N` + 1) and the `ident=` bit, plus every failure
lane (`create missing` / rejection / `create no id` / `prompt missing` /
rejection); UNIT 4 — `route= stop|ask` with NO send, `action: resume` -> ONE
QUEUED CONTINUE with the locked text + the #167 cause-sensitive branches (a fresh
ctx.log COMPACT line -> `recovery= … cause= compact` + the compaction flavor with the
`readme_post_compaction.md` pointer; a no-compact state -> `cause= idle` + the plain
text with NO compaction words), the #80 `arm= … injected` busy, the
recovery budget (attempt 1, 2, then the RESTART route), the `spawn= … agent=
model= ident=` line + `deactivate=`, the STICKY `skip= deactivated`, the
`send-fail=` dead-mark + `skip= dead`; #159 — the ARM SOURCE the v2 host
actually feeds (the fork publishes NEITHER `session.status` NOR `session.idle`):
busy from `session.step.started` (one shared state-change path with the status
leg), idle from a TERMINAL `session.step.ended` finish, NO idle from
`finish=tool-calls` / `unknown` / a missing finish, duplicate idles route ONCE
(the `idlePending` reset + the `sending` latch), and the old
`session.status busy|idle` legs pinned unchanged for a host that emits them;
#109 — the detector's five clauses each
pinned NEGATIVE (finish ≠ length, total below the 0.99·window wall, an
unresolvable window, the 60 s idle threshold via the `limitStopIdleMs` lever, a
scope-"none" session), the FIRE (`limit-stop= sid= total=` + the byte-shape
`-WARNING auto_resume <sid> <model> silent limit-stop: … window=8000 no-COMPACT`
line in `loop/autorun-T/loop_log.md`), the once-per-episode latch + its reset
by a fresh busy, and the clause-(4) suppression by a NEW ctx.log COMPACT line
(`rearm= compact sid=`); the #90 RESTORE through the trimmed pair (`skip=
deactivated sid=ses_par` + `skip= depth sid=ses_child depth=1` with
`lineage_max_depth=1`); the budget gate forms (count == cap NOT exhausted,
count = cap+1 exhausted, the CPU cap-0 entry) and the forced-new-session
directive sentence; the LINE-ANCHORED action-line scan (prose-quoted and
bullet-prefixed mentions NEVER match, last match wins); the scope verdict ladder
(Direct beats the agent test, an ON toggle is ANY agent, NO toggle falls to the
planner prefix); fail-open on a THROWING hook payload (a poison `text` getter
never reaches the host, later events still log), and the teardown dispose.
Expected final line: `SMOKE: ALL PASS`.
