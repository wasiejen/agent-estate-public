# The auto_resume plugin, unit by unit (2026-09-28)

One-page explainer (TODO #112) of what OUR auto_resume plugin does, unit by
unit. Source of truth: the `auto_resume.ts` header (the units 1-4 blocks) —
pointer-only; every hook, trigger, and log token below was spot-checked
against the file (worker-32, 2026-09-28, session ses_f19f14f77ffec3eM4B77xFC36Z —
derived from our own code, not a copied repo).

Log home: `.opencode/temp/auto_resume.log`. Decision vocabulary (the REAL
tokens, grepped from the code): `arm=`, `scope=`, `nudge=`, `rearm=`, `route=`,
`recovery=`, `relay=`, `skip=`, `spawn=`, `spawn-fail=`, `deactivate=`,
`budget=`, `send-fail=`, `err=`. Architecture (deep-dive A §3): events stay
ARM-only — the ONE 5s tick is the only decision+send funnel; the hooks and the
tick callback NEVER throw.

| unit | what it does | what triggers it | log lines |
|---|---|---|---|
| 1 — skeleton / logging | EVERY delivered host event → ONE line `<ISO time> event=<type> sid=<sid> <key fields>` — EXCEPT `message.part.delta` (~97% of the old log volume — #96, never logged); plus the one-shot INIT SURFACE PROBE at load: a `surface=` line with `typeof ctx.client.session.<m>` for the candidate session methods + `client.app.log` (`typeof` only — Object.keys misses prototype methods). | every delivered event (the `event` hook) + plugin load (the probe). | the event lines + the one `surface=` line (the live verdicts — e.g. `session.compact` is UNDEFINED on this build, no host-side compaction command exists — live in the unit-1 surface report). |
| 2 — the context-limit nudge (the PASSIVE ctx-line suffix) | a reminder SUFFIX on the session's OWN tool-call return (the `tool.execute.after` `output.output` mutation — the gauge plugin's `ctx:` channel); NO promptAsync (no queued turn, no busy, no budget reset, no loop); LADDER (highest rung met fires): ratio >= 0.98 → the `--maintainer`-flagged line ("context saturated — self-compact NOW"), else ratio >= the per-call threshold → "self-compact now (ratio=…)"; NOT appended when the scope verdict is "none" (Direct / non-scoped — the verdict is recomputed from a FRESH messages() fetch per eligible tool result, so a mid-turn `<|Direct|>` suppresses immediately). | a nudge-eligible tool result on a WATCHED busy session — gate order (cheap first): a positive token total + known model; `autoCompact` ON (per-call `compact_budget.json` read); the model limits resolve; a positive usable window (context − min(reserve, output)); ratio >= `saturationThreshold` (defaults 0.95 / 20_000 — fail-open). | `arm=`, `scope=`, `nudge=` (ONE per busy cycle — the dedup resets on a fresh busy), `rearm= compact` (a COMPACT line for the sid resets the recovery budget — #98). |
| 3 — the new-planner spawn helper | the shared building block for Unit 4's restart branches — on the tick, the one-shot trigger file `.opencode/temp/auto_resume_spawn_trigger`: present + non-empty → ONE spawn attempt (in-flight latch), then the file is renamed `.consumed` EVEN ON FAILURE (re-trigger = write a new file); present but empty → `spawn-fail= empty trigger` + consumed; the spawn = `create()` (no args — default directory) + ONE QUEUED `promptAsync` (the trigger content as the planner start prompt, with the SOURCE session's CURRENT agent+model — a file-trigger spawn has no source session → NO `agent`/`model` field — the host default applies); success → the helper RETURNS the new sid — the CALLER records the successor's lineage depth (the module-level `spawned` map, sid → depth) + STICKY-deactivates the trigger; failure → `spawn-fail=` (returns null, never throws outward). | the 5s tick finding the trigger file present + non-empty. | `spawn=`, `spawn-fail=`, `deactivate= sid=`. |
| 4 — the liveness watchdog | an in-scope session idle (or session.error) → ROUTED on the next tick — SCOPE (#82/#85, last-toggle-wins, recomputed FRESH every idle): trailing own-line `<|Direct|>` → "none" (OUT — no CONTINUE, the Unit 2 nudge suppressed); own-line `<|autonom|>`/`<|Autorun|>` (case-insensitive, whole-line only) → "autorun" (ANY agent type); NO toggle → the planner test (the first user message's `agent` field — ids follow `planner_<model>`); verdicts "planner" \| "autorun" \| "none" \| "unknown" (unknown until settled — fail-safe, no action); the routing itself is itemized below. | an in-scope session's idle / session.error, decided on the next tick. | `route=`, `recovery=`, `relay=`, `skip=`, `send-fail=`, `budget=`, `deactivate=` (itemized below). |

**Unit 4 routing** (the LAST assistant message's text,
`action:\s*(restart|resume|stop|ask_maintainer)`, last match wins):
- `stop` / `ask_maintainer` → NO send — `route= stop|ask`.
- `resume` or NO recognized line → ONE queued CONTINUE — `recovery= attempt=N`
  (cap 2 per idle cycle, reset on a fresh busy); a STORED queued message (the
  compact_memory per-session temp file) is relayed as the CONTINUE's FIRST
  message + a one-line post-compaction addendum — `relay=` (the file is
  renamed .consumed on a successful send).
- a FAILED CONTINUE (`send-fail=`) DEAD-MARKS the session — the next routed
  tick logs `skip= dead` (the remaining retries AND the cap-exhaustion spawn
  are skipped — no doomed successor; cleared on a fresh busy).
- `restart`, or the recovery cap exhausted with still no line (the budget
  FULLY exhausted — count > cap → `budget= exhausted` + the
  forced-new-session directive) → the SUCCESSOR CHECK (a DIFFERENT sid in a
  session.created event since the closing session's lastActivityAt →
  `skip= successor`) else the LINEAGE-DEPTH CAP (`.opencode/temp/lineage_max_depth`
  — default 10, -1 unbounded; depth >= N → `skip= depth sid=`) else
  `spawnPlanner` with the RESTART prompt — `route= restart spawn`.
- STICKY DEACTIVATION: a successful spawn records the successor's depth
  (+1) and STICKY-deactivates the TRIGGER — `deactivate= sid=` (never
  re-routed/re-spawned from again); the flag clears ONLY on a NEW user message
  carrying an own-line ON toggle → `skip= deactivated sid=`.
- STATE SURVIVAL: session.created epochs are tracked (sid → epoch); the
  in-memory depth map + deactivation flags are restored at init ONCE from the
  plugin's own log (a host restart loses no state).
- CAVEAT (documented, not solved): the looprunner ALSO reacts to
  `action: restart` — the successor check + the 5s tick grace window mitigate
  a double-spawn (the residual race is accepted until the maintainer retires
  the looprunner).

**#109 silent-limit-stop detector** (LANDED 2026-09-28, plan33 worker-33 — the
tick leg AFTER `tailCompactRearm`, BEFORE the routing loop, own try/catch):
zero-IO `limitStopCheck()` over the 5-clause signature (last assistant finish
`length` + `tokens.total` >= 0.99 window + 60 s silence + idle + no NEW
COMPACT line since the death step + in-scope: role-agent prefix
`planner/worker/explorer` OR scope != none — Task-tool workers carry
scope=none, so a scope-only gate would never fire). Fire = ONE `-WARNING`
line appended DIRECTLY to the current looprun's `loop_log.md` (the plugin
machine-stamps the local `YYYY-MM-DD_HH-MM` itself, same form as the
loop_log tool — no folder → `auto_resume.log` only) + ONE `limit-stop=
sid=… total=…` line in `auto_resume.log`; NO action on the session (the
compaction dispatch stays a maintainer call). Build/test gotchas:
`firstAgent` is captured from the USER-role `message.updated` event payload
at arm time (NOT a messages() fetch); the smoke's 60 s silence gate is
tested with a GLOBAL `Date.now` warp applied CUMULATIVELY across pins (each
pin captures lastActivityAt under the current offset, the next pin warps
+70 s further); a same-tick ctx.log COMPACT append is visible because the
leg sits AFTER `tailCompactRearm` (the `rearm=` line is the order
discriminator).

**Pointers** (pointer-only — no restatement):
- `auto-resume-unit1-surface-report.md` — the live host surface (unit 1).
- `auto-resume-deepdive-A.md` / `auto-resume-deepdive-B.md` /
  `auto-resume-deepdive-C.md` — the upstream reference deep-dives (event
  architecture §3, the test runs, the vendored design).
- `auto-resume-map.md` — the feature-index map of the upstream plugin;
  `host-map.md` — the host-side map.
- The compaction-handout inclusion is the MAINTAINER's paste (his draft file)
  — noted only; not part of this entry.
