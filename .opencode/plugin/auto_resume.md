# auto_resume.ts — the auto-resume plugin (units 1-4)

Approved 2026-09-21 (`proposals/approved/2026-09-21_opencode-auto-resume-plugin.md`); the header block (units 1-4) is the contract of record.

## What it does

Keeps the autorun loop alive: it logs every host event, nudges a saturating session to self-compact (a PASSIVE suffix on the session's own tool results — no promptAsync), and spawns a successor planner when an in-scope session closes with `action: restart` (or dies with its compaction budget fully exhausted). Hook discipline: the handler NEVER throws (try/catch swallow — a throw out of a hook would surface to the session; the tick callback likewise).

## Implementation sketch

- Entry: DEFAULT-ONLY factory export (a named export breaks the smoke check — the host loader normalizes `Object.values(module)`).
- Hooks: `event` (onEvent — logging + ARM state + session.created tracking) + `tool.execute.after` (onToolAfterNudge — the passive Unit-2 nudge).
- The ONE 5s tick (setInterval, unref) is the only decision+send funnel — events stay ARM-only (deep-dive A §3).
- Unit 1: EVERY delivered event → one line to `.opencode/temp/auto_resume.log` (EXCEPT `message.part.delta` — #96, ~97% of the old log volume) + the one-shot init `surface=` probe (`typeof` only — Object.keys misses prototype methods).
- Unit 2: per busy session, a suffix on the session's own tool-call return when `ratio >= saturationThreshold` (default 0.95) && `autoCompact` ON (both read PER call from `compact_budget.json`, fail-open). Ladder: ratio >= 0.98 → the `--maintainer`-flagged line. SCOPE GATE: verdict "none" (Direct / non-scoped) suppresses — the verdict is RECOMPUTED from a FRESH messages() fetch per eligible tool result.
- Unit 3: the spawn helper — trigger file `.opencode/temp/auto_resume_spawn_trigger` (present + non-empty → ONE spawn attempt, renamed `.consumed` even on failure); spawn = `create()` + ONE queued `promptAsync` (trigger content as the start prompt; a file-trigger spawn carries NO agent/model — the host default). Success → returns the new sid; the caller records the lineage depth + STICKY-deactivates the trigger.
- Unit 4: the liveness watchdog — an in-scope session idle → routed on the next tick. Scope: last own-line toggle wins (`<|autonom|>`/`<|Autorun|>` = "autorun" any agent type; `<|Direct|>` = "none"; no toggle → the first-user-message planner test, agent ids `planner_<model>`). Routing on the last assistant `action:` line: stop/ask → no send; resume/none → ONE CONTINUE (cap 2 per idle cycle) + stored queued message relay; restart or budget-exhausted → successor check → lineage cap (`.opencode/temp/lineage_max_depth`, default 10, -1 unbounded) → successor spawn.
- Queue sweep (2026-09-30): at init, age-based cleanup of `.opencode/temp/compact_message_*` (the compact_memory queued continuation messages — pending + `.consumed` tombstones older than `queueSweepDays`, default 3 — factory option; the live host passes nothing); ONE `queue-sweep=` log line when something was deleted. The compact_memory tool deletes its own queue file on a verified dispatch failure (zombie guard, compact_memory.ts).
- Config: `.opencode/temp/compact_budget.json` (`saturationThreshold` / `outputReserve` / `autoCompact`) + the `lineage_max_depth` file (the 2026-09-27 live-configurable cap).

## Gotchas / lessons

- The tick-era queued-promptAsync nudge LOOPEd — the nudge itself was the busy that reset the once-per-busy budget; Unit 2 went passive, no promptAsync (#85 part 3 — the header carries the loop history).
- NO host-side compaction command exists on this build (`session.compact` is undefined — the unit-1 surface report) — the suffix reminds, the session self-compacts via the compact_memory tool.
- A mid-turn `<|Direct|>` must suppress IMMEDIATELY — the tick-era cached scope verdict was too stale (fresh messages() fetch per nudge).
- The depth map + deactivation flags are restored at init ONCE from the plugin's own log (a host restart loses no state).
- OVERLAP-ERA CAVEAT (documented, not solved): the looprunner ALSO reacts to `action: restart` — the successor check + the 5s tick grace window mitigate a double-spawn.

## Tests

`tests/auto_resume.smoke.mjs`.
