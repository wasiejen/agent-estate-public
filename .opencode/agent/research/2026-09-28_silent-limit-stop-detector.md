# 2026-09-28 — silent context-limit-stop detector (TODO #109, plan32 unit 2, explorer-32)

RESEARCH ONLY. Goal: the cheapest RELIABLE plugin-side detector that makes a
silent limit-stop visible (empty Task result, no failure message, no log
line — TODO #109; measured 2026-09-25_18-01 + MEM-0107). DB-field claims
carry evidence tags [E#] — appendix.

## 1. Death-class taxonomy (what the DB shows at the moment of death)

The last assistant row of `message` (`data` JSON = the info object, fields
top-level — [E1]) shows one of three shapes:

- **(a) SILENT** — `finish:"length"`, NO `error` field, `tokens.total` at the
  model window, `output` = the cut generation size: the per-turn OUTPUT cap
  cut the step while the context was already at the wall (the next request
  can never fit; a rejection row, if any, lands only later via a recovery
  attempt — §2). Task result = EMPTY. Measured: `total=170238`/`output=23156`
  (MEM-0107) and `total=170240`/`output=997` (the 18-01 worker; the `170240`
  window constant comes from the server's own error text [E4]). [E2][E3]
- **(b) FAILURE-MESSAGE** — last row carries `error`: `finish:"error"` +
  `error.name:"ContextOverflowError"` (message `request (N tokens) exceeds
  the available context size (M tokens)`, current host [E4][E5]) or older
  vocabulary: NO `finish` field + `error.name:"UnknownError"` with
  `context_length_exceeded: the request exceeds the available context size;
  context shift is disabled` in `data.message`, all-zero tokens (rejected
  pre-generation [E6]). Task result = the failure message (MEM-0104/0109).
- **(c) NORMAL / IN-PROGRESS** — `finish:"stop"` (normal completion; the
  18-01 worker's final row after recovery: `total=85455`) [E7] or
  `finish:"tool-calls"` (a live mid-turn step) [E2][E7].

Corpus scan (16566 message rows, read-only [E8]): 17 `finish:"length"` rows
/ 15 sessions; 25 `ContextOverflowError` rows; 25 older
`context_length_exceeded` rows — many sessions show BOTH a `length` row and a
later overflow row (the cut, then a rejected recovery/resume — the 18-01
chain [E3]).

## 2. Detector design

Hook: the auto_resume 5s tick (`auto_resume.ts`, default 5000ms
[L1722/1725]). A new leg `limitStopCheck()` sits AFTER `tailCompactRearm()`
(ctx.log cursor fresh) and BEFORE the routing loop; own try/catch (the tick
never throws). NO DB access, NO messages() fetch per tick — everything from
in-memory watch state + the existing per-tick ctx.log tail-read
(`ctxLogOffset`, [L306, L1408-1449]).

State (new `Watch` fields, all event-time captured — zero per-tick cost):
- `lastFinish`/`lastFinishAt` — the LAST assistant-role `message.updated`
  event's `info.finish` (the event's info IS the object the plugin already
  reads `role`/`tokens`/model from at [L1545-1562]; `finish` is a top-level
  sibling field, DB-verified [E1][E2]; a smoke pin asserts the event carries
  it).
- `lastCompactAt` — set by `tailCompactRearm` on a NEW `COMPACT <sid>` line
  (regex exists [L1392]; live shape `<stamp> <model> COMPACT <sid> keep=<N>m
  tok=<n> computed` [E9]).
- `firstAgent` — the first user message `info.agent` (arm-time; live-used by
  `firstUserAgent` for the inject identity, #85 part 2) [E2].
- `limitWarned` — per-episode dedup latch.

Signature (conjunction — ALL must hold on one tick, per watched sid):
1. `lastFinish === "length"`.
2. `lastTokenTotal >= 0.99 * contextWindow` — per-model window via the
   existing CACHED `getModelLimits` (nudge path's `limits.context`,
   [L607-612]); measured deaths sit at 99.99–100 % of 170240 [E2][E3].
3. Silence: `now - lastActivityAt >= 60_000` AND `status === "idle"` — the
   measured idle event landed 23 s after the death step [E3], so 60 s ≈ 3x
   that latency; this separates "at the wall, turn dead" from "mid-turn
   streaming" (a live session emits its next `message.updated`/busy within
   seconds).
4. `lastCompactAt == null || lastCompactAt < lastFinishAt` — no NEW COMPACT
   line since the death step (guards the finish→compact race window).
5. In-scope: `firstAgent` starts with `planner`/`worker`/`explorer` OR
   `w.scope !== "none"`. **Spec discrepancy (evidence wins):** the task spec
   names the scopeVerdict gate alone, but the 18-01 worker's live scope was
   `scope= none` [E3] — EVERY Task-tool worker session has scope "none" (no
   ON toggle; first agent `worker_*`), so a scope-only gate would never see
   the primary silent-death victim class; the role-agent prefix is the
   effective gate.

Fire (once — the latch clears on new busy / new assistant update): append a
`-WARNING` line to the current looprun's `loop_log.md` (§4) + an
`auto_resume.log` attribution line. No action on the session.

## 3. False-positive analysis

- **Streaming session (mid-turn near the wall):** excluded by (1) — the last
  COMPLETED step's finish is `tool-calls`, not `length`, until the cut lands;
  after a cut a live host emits its next update/idle within seconds, so the
  (3) 60 s + idle gate passes no live session. Residual: a >60 s host stall
  (never measured) → one informational, non-actionable line.
- **Compacted between the step finish and the tick:** excluded by (4) — the
  COMPACT line is recorded before evaluation (leg order); the resumed turn
  resets `lastFinish`/`lastActivityAt` anyway.
- **Maintainer-killed session:** a kill after a wall-cut step satisfies the
  conjunction only if the host emits idle — acceptable residual (the line is
  informational; a killed session has no error row and the maintainer's own
  action is the context). If the kill emits no idle, `status` stays busy and
  (3) excludes it.
- **Direct session out of scope:** excluded by (5) — first agent is the main
  agent (no role prefix), no ON toggle (`scope === "none"`).
- **Last step died of a NON-context error:** `finish:"error"` (or absent
  `finish` on the old rejected row) — excluded by (1). A
  `ContextOverflowError` row left by a recovery attempt is ALSO
  `finish:"error"` — class (b), already visible via the Task failure message,
  not a FP.

## 4. Visibility channel

Chosen: the plugin appends the `-WARNING` line DIRECTLY to the looprun's
`loop_log.md` (the loop_log TOOL is agent-facing; the plugin writes the file
itself, same 8-char format — `agent_readme_loop.md` §Loop log): `<stamp>
-WARNING auto_resume <sid> <model> silent limit-stop: finish=length
total=<n> window=<n> no-COMPACT`. The plugin already resolves the current
`autorun-*` folder (the `spawnTitleFor` logic, [L645+]); no looprun folder →
degrade to `auto_resume.log` only. Why not auto_resume.log-only + planner
surfaces it at next start: (i) the planner hits the empty Task result
MID-iteration — visibility is needed now, not at the next iteration start;
(ii) the loop log IS the loop's activity record and the planner already greps
it; (iii) it matches the existing `-WARNING` semantics ("sub-agent task
fails … session_id + one-phrase cause") with a machine writer in the role
slot.

## 5. Build spec sketch (the small follow-up)

- **Files:** `.opencode/plugin/auto_resume.ts` ONLY (+ its existing smoke
  suite). New: 4 `Watch` fields, arm-time captures (assistant `finish`; first
  user `agent`; `lastCompactAt` in `tailCompactRearm`), the `limitStopCheck()`
  tick leg, the loop-folder append (reusing `spawnTitleFor`'s resolution).
- **Log lines:** the `-WARNING` loop-log line (§4) + `limit-stop= sid=…
  total=…` in `auto_resume.log`.
- **Smoke pins (6, fake timers / tickMs — the existing pattern):**
  (1) finish:length@window + 60 s silence + no COMPACT → exactly one
  `-WARNING` line; (2) same + COMPACT line first → no fire; (3) finish:length
  at <0.99 window → no fire; (4) non-role first agent → no fire; (5) latch —
  unchanged second tick → no second line; (6) fresh busy after firing clears
  the latch.
- **DoD:** smoke suite green (count up), full gate (probe/pytest/ruff)
  green, `git status` clean; live acceptance = one worker killed at the wall
  → the `-WARNING` line lands in `loop_log.md` within ~65 s (measured).
- **Approval boundary:** detector + `-WARNING` line = pre-approved
  agent-usage class (plugin fix / friction removal, agent-facing files, no
  user-visible behavior change) — borderline: the loop log is also
  maintainer-readable, flag it at the next curation if the maintainer
  disagrees. DISPATCHING a compaction (or any action) on detection = an
  observable behavior change → maintainer call first (TODO #109's
  "optionally a compaction dispatch").
- **Effort:** ~90–130 lines total (50–80 plugin + 40–50 smoke); ~0.5–1 day
  wall including gate + review.

## Appendix — evidence

- [E1] `host-map.md` §3: `message.data` IS the info object (`tokens` top
  level); `finish = msg.finish ?? info.finish ?? info.finishReason`
  (Deep-Dive B §3.2/3.3); `tokens.total` = the cumulative context size after
  that call.
- [E2] `sesdata.cjs ses_f33ee8eabffeaE0xuwZ7lc65NR` (MEM-0107 death,
  2026-09-23): last row `finish:"length" tokens:{total:170238, output:23156}`,
  no `error`.
- [E3] 2026-09-25_18-01 episode, session `ses_f271155b4ffeIWwbQEekkRQRA6`
  (worker-17, loop_log lines 115/116/117): `sesdata.cjs` — death row 113
  `finish:"length" total:170240`; row 115 `finish:"error"`
  ContextOverflowError `170869 > 170240` (the planner's task_id-resume
  request, NOT a plugin send); final row 155 `finish:"stop" total:85455`.
  `ctx.log`: COMPACT 14:54 (self, keep=5m), 15:34 + 15:39 (cross, keep=18m).
  `auto_resume.log`: `scope= none` (14:54:21); idle events 15:29:51 (23 s
  after the death step) / 15:31:28 / 15:58:34; NO recovery/send lines (scope
  none → Unit 4 never acted).
- [E4] overflow text `request (170372 tokens) exceeds the available context
  size (170240 tokens)` (MEM-0109; the 170240 window constant).
- [E5] `sesdata.cjs ses_f2a2ebcafffeVW1j4oXA7K3ioa` (MEM-0109 death): last row
  `finish:"error"`, `error.name:"ContextOverflowError"`.
- [E6] `sesdata.cjs ses_f3ab3c67dffeujQ8L1ucfWu8k8` (MEM-0104 death): last row
  NO `finish` field, `error.name:"UnknownError"`, `data.message` =
  `context_length_exceeded: the request exceeds the available context size;
  context shift is disabled`, all-zero tokens.
- [E7] final rows of [E3] (`stop`) and the `tool-calls` rows of [E2]/[E3].
- [E8] read-only corpus scan (`node:sqlite` `readOnly: true`, LIKE on
  `message.data`, bounded output): counts per §1.
- [E9] `ctx.log` live COMPACT lines (grep, 2026-09-27/28): `<stamp> <model>
  COMPACT <sid> keep=<N>m tok=<n> computed`.
- Plugin line refs: `auto_resume.ts` [L306/313-345/607-612/1392-1449/
  1545-1562/1722-1726] — READ ONLY, no edits.
