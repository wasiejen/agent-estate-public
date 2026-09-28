# Task spec — worker-33, plan33 unit 1: TODO #109 silent limit-stop detector (build)

GOAL: make a SILENT context-limit stop visible — a zero-IO `limitStopCheck()` leg in the
auto_resume 5s tick that fires ONE `-WARNING` line into the current looprun's
`loop_log.md` (+ one attribution line in `auto_resume.log`) per episode, when a watched
role session died at the context wall (finish=length, tokens at the window), was never
compacted, and went silent — the class that returns an EMPTY Task result with no failure
message (MEM-0107 / TODO #109).

DESIGN AUTHORITY (read FIRST, 181 lines):
`.opencode/agent/research/2026-09-28_silent-limit-stop-detector.md` — §2 design,
§4 visibility channel, §5 build sketch, appendix evidence. It IS the design; your job is
the build, not the re-derivation.

VERIFIED ANCHORS (planner-measured at spec time, HEAD 5f64052; if one drifted, re-anchor
by the named pattern — never guess a line number):
- `.opencode/plugin/auto_resume.ts` (1735 lines):
  - `interface Watch` L313-345 — append the new fields here.
  - the assistant `message.updated` capture block L1545-1562 (role check L1550, token
    capture L1553-1558) — capture `info.finish` HERE (`finish` is a top-level sibling
    field of the same info object — doc appendix [E1]) into `lastFinish`/`lastFinishAt`
    (event time).
  - `tailCompactRearm()` L1408 (the ctx.log tail reader; the COMPACT-line regex ~L1392)
    — set `lastCompactAt` here on a NEW `COMPACT <sid>` line for that sid.
  - the tick: `tailCompactRearm()` is called at L1467 BEFORE the routing loop — put your
    `limitStopCheck()` leg right after that call (before the routing loop), own
    try/catch (the tick never throws).
  - `getModelLimits` L467 (cached; the nudge path uses it at L607) — the per-model window
    is `limits.context`.
  - `spawnTitleFor()` L645 — looprun-folder resolution; reuse for the `loop_log.md`
    append; NO resolvable folder → degrade to the `auto_resume.log` line only.
  - first-user `info.agent`: reuse the existing `firstUserAgent` pattern (L1036; live-used
    for the inject identity, #85 part 2) — capture at arm time into `firstAgent`.
- `.opencode/plugin/tests/auto_resume.smoke.mjs` — currently 140 `chk(` checks; the smoke
  instantiates the plugin with `tickMs` (fake-timer pattern — see the plugin comment
  L1709-1726).

NEW WATCH FIELDS (5): `lastFinish: string | null`, `lastFinishAt: number | null`,
`lastCompactAt: number | null`, `firstAgent: string | null`, `limitWarned: boolean`
(per-episode dedup latch).

FIRE SIGNATURE (conjunction — ALL on one tick, per watched sid) — doc §2 verbatim:
1. `lastFinish === "length"`.
2. `lastTokenTotal >= 0.99 * window` (window = cached `getModelLimits(...).context`;
   null/unresolvable → NO fire, fail-open).
3. `now - lastActivityAt >= 60_000` AND `status === "idle"`.
4. `lastCompactAt == null || lastCompactAt < lastFinishAt` (no NEW COMPACT line since
   the death step).
5. `firstAgent` starts with `planner`/`worker`/`explorer` OR `w.scope !== "none"`.
   (Evidence win over the original scope-only gate — doc §2 item 5; Task-tool workers
   all carry scope "none".)

FIRE (once — the latch clears on a new busy OR a new assistant update):
- append ONE `-WARNING` line to the current looprun's `loop_log.md` (the plugin writes
  the file itself — the loop_log TOOL is agent-facing; same 8-char line format,
  `.opencode/agent/prompts/agent_readme_loop.md` §Loop log):
  `<stamp> -WARNING auto_resume <sid> <model> silent limit-stop: finish=length total=<n> window=<n> no-COMPACT`
  (stamp format per that file; folder via `spawnTitleFor`; no folder → auto_resume.log
  only).
- append `limit-stop= sid=… total=…` to `auto_resume.log`.
- NO action on the session: NO compaction dispatch, NO send, NO resume — that part is a
  maintainer call and is NOT built here.

SMOKE PINS (6, existing fake-timer / tickMs pattern):
1. finish:length@window + 60 s silence + idle + no COMPACT → exactly ONE `-WARNING` line
   (assert the loop_log.md file content, not only the log line).
2. same but a NEW COMPACT line after lastFinishAt → no fire.
3. finish:length with total < 0.99*window → no fire.
4. first agent not a role prefix AND scope "none" → no fire.
5. latch: unchanged second tick → no second line.
6. fresh busy after firing clears the latch (a later episode fires again).
Smoke count 140 → 146.

DOD:
- auto_resume smoke 146/146; every other smoke at its baseline UNCHANGED
  (intercept_observer 77/77, block_transfer 131/131 + 64/64, compact_memory 78/78,
  context_recovery 17/17, submit 23/23).
- probe 346 (335 pass + the 11 ENVIRONMENTAL #113 failures 136-146 — NOT regressions;
  do not fix the venv).
- ruff F=0.
- the pytest half of the standard gate is UNRUNNABLE (#113 broken venv — MAINTAINER
  CALL): run what runs, report the blocked half in the handover.
- TODO #109 status → `LANDED` (the hash is recorded in the planner's follow-up
  bookkeeping commit — your commit cannot carry its own hash).
- handover in `.opencode/agent/handover/handover_task_to_planner.md` (executive summary,
  measured numbers, commit hashes, TODO entries, deliberately-not-done, discrepancies).
- git status clean; one green checkpoint commit per verified unit (code only);
  TODO + handover ride the FINAL commit.

DO-NOT-TOUCH: `.opencode/maintainer/**`, root `opencode.jsonc`, live `AGENTS.md`, the NAP,
the loop folder, other plugins/tools, the probe (it does not cover this plugin — if you
believe a probe pin is needed, FLAG it in the handover, do not write it),
`.opencode/agent/prompts/**` (you have no edit access — the no-circumvent rule applies).

LIVE ACCEPTANCE: PENDING the maintainer's host restart — one worker dying at the wall →
the `-WARNING` line lands in `loop_log.md` within ~65 s (doc §5 DoD). NOT yours to run.

EFFORT EXPECTED: ~90-130 lines total (50-80 plugin + 40-50 smoke).
