# TODO records — closed entries

One-line records; resolution lives in the file / git log. Moved out of `TODO.md` on
2026-09-10 (planner curation per maintainer call — removes ~6 k chars of closed history
from the live file).

**Numbering rule:** every ID used here is RESERVED and never reused — new entries in
`TODO.md` continue from the last used ID (counter in the root `TODO.md` header:
currently #219, next = #220). FST records moved to `projects/Free-Snap-Tap/

Pre-carve hash note (2026-09-30, plan45, #123): the 2026-09-29 filter-repo carve rewrote the entire history — every 7-hex hash cited below from before 2026-09-29 is a dead revision in the post-carve repo (historical text, not a live pointer). Measured remaps: cbbebf8→7a9e291 (#106), 0c90abe→60f031b (#115), 12e3262→fea1cbb (#114), 44c50a2→9e91878 (R3 import fix). The 4 pairs are re-pointed inline; the remaining dead citations are annotated by this line.
todo_records.md` on 2026-09-29 (#117 per-project split).

## 12. v1.1 task spec "exactly 5 lines" off-by-one — CLOSED (planner record, 2026-09-08) — the off-by-one was on the spec side (the filter deterministically yields 4); the reusable invariant = "one line per unskipped payload" — used by the v2 tasks.

## 13. `handover.ts` header self-labelled "v1" — CLOSED (planner, 2026-09-09) — the v2/v2.2 header rewrite replaced the v1 label; the v2.2.2 + v1.3 header notes landed in the same file.

## 14. transform hook exposes no agent identifier — CLOSED (superseded, 2026-09-08) — the open "choose a planner-only signal" call is moot: the maintainer's 'both' decision (#18) formally overrode "never inject for all" (v2.2 removed the gate); v2.4 targets the just-received last message (ALL agents) — no planner-only signal is needed any more.

## 15. AGENTS.md plan-state routine vs "workers never touch handover_planner.md" — CLOSED (maintainer call → #26, 2026-09-08) — workers never edit or commit the plan-state file (prompt clause + `permission.edit` deny); the pre-commit routine applies to the planner's own commit only.

## 16. v1.2 byte-budget arithmetic (190 vs 150, "< 4 KB" infeasible) — CLOSED (planner, 2026-09-08) — budget target = cascade window 0 B (met); the mixed-window total was spec arithmetic, not a code target; the event count settled by cycle measurement.

## 18. ctxgauge 'both' decision — inject ALL sessions (v2.2 gate removed) — CLOSED (maintainer decision, 2026-09-08) — the formal override of the planner-only design; the companion worker stop-line rule landed 2026-09-09 (#29 item 3); the accepted caveat (gauge = most-recently-updated session only) carries on in #17/#30/#31/#32/#33.

## 19. stale inline comment above `onSystemTransform` — CLOSED (#20, 2026-09-08) — comment rewired per the v2.2 'both' decision (comment-only edit, probe 23/23 both sides).

## 20. persistent offline probe + exact executable pinned — CLOSED (2026-09-08) — the probe is permanent at `.opencode/plugin/probes/handover_probe.mjs` (run it, never rebuild — exception: a hook-surface change); the exe pin was superseded 2026-09-09 by system `node` (the electron host is gone — #29).

## 21. `ctxgauge/peek.py` fresh-session TypeError crash — CLOSED (code side #24, 2026-09-08) — the `None`-row guard + explicit model-id parse; the v2-schema-migration note rides into #30 (write against the CURRENT schema).

## 22. worker-proof task spec pointed at `.opencode/plugin/log` — CLOSED (2026-09-08) — doc-only mismatch measured against the real path (`.opencode/plugin.log`); the task file is per-cycle and already superseded.

## 23. worker prompt carried NO `ctx:` line — CLOSED (planner, 2026-09-09, `kind:"gauge"` evidence) — not a transform-scope issue: the gauge READOUT was failing (23× `shell-missing` + 47× `no-ctx-output` — the v2 call shape rejected by the live BunShell); the root cause (the call shape) fixed in v2.2.2 (#29); the 09-10 cache-discipline correction (#31) superseded the "session-start-only" reading.

## 24. `peek.py` crash fix + model-id parse (code side of #21) — CLOSED (planner direct fix, 2026-09-08) — fallback to the latest FINISHED message overall + `CTX=0 (0%) REM=<window>` guard; model id from `session.model`'s JSON `id` field.

## 25. `opencode.jsonc` planner edit-permission pattern still `/tmp/**` — CLOSED (#26, `6523406`, 2026-09-08) — the old planner permission block replaced wholesale (Windows temp path).

## 26. workers denied on `handover_planner.md` + prompt clause — CLOSED (maintainer call, 2026-09-08, `6523406`) — `permission.edit` deny on all three worker scopes + the prompt clause; closed #15 + #25 with it.

## 27. v2.2.1 gauge-failure evidence log — CLOSED (planner, 2026-09-09) — the evidence log landed (4-reason vocabulary + `preview`, probe 28/28); the follow-up single opencode start named the branch (`no-ctx-output` + tagged-template preview) → #23/#29.

## 28. `GAUGE_CMD` constant declared but unused — CLOSED (already removed in the `b8ea40b` cycle, 2026-09-09) — verified against the live file (no such constant; probe 28/28) — the entry had been left open by oversight.

## 29. Electron → terminal/CLI + system Node; BunShell `input.$` gauge host — CLOSED (planner, 2026-09-09 — proof start performed) — worker + planner prompts carry `ctx:` (43423/36 % + 13837/12 %) with NO plugin.log read; the v1.3-profile measurement is deferred by the no-log constraint → #17; the fire-scope reading was corrected 09-10 (EVERY LLM build — #31).

## 31. v2.4 per-message injection via `chat.message` (cache-safe append to the last message only) — CLOSED (design + root-cause record, 2026-09-10) — root cause: `experimental.chat.system.transform` fires on EVERY LLM build = prompt-cache invalidation (the 09-09 "session-start-only" reading was a misread); v2.4 = append-only ctx TextPart onto the just-received last message — full record: NAP 09-10 correction + v2.4 blocks; the live fix continued as #32 (v2.4.1).

## 38. (TEST) explorer smoke test — jill gemmaQ4-256K first launch — CLOSED (planner verified, 2026-09-10, `452de1a`) — smoke test PASSED (spec read, one marked entry appended, TODO.md-only commit, fast stop ~45 s); CAVEAT: its final self-gauge line was FABRICATED (no session step carries that ctx; numbers internally inconsistent — format mimicry without running the command) — check explorer output numbers.

## 32. v2.4 part-schema SchemaError = v2.4.1 + v2.5 nudge ladder spec — CLOSED (maintainer restart live-clean, 2026-09-10) — the root cause + design record: the LIVE `chat.message` input carries only `{sessionID, agent, model}` (no `messageID` — proven from the plugin's OWN scoped evidence reads); the v2.5 nudge ladder spec → #33; the target-scope pre-build call lives at section item 3 (NOT dropped).

## 260908-0951 (NAP-copied dedup block) — DEDUP (2026-09-08) — item 1 (116–117 unreachable) → #4; item 2 (lint 6→8 at `ca61a26`) → #5; item 3 (C-class lines covered as by-products — expected state confirmed) → record only (no open work); item 4 (302–303 unreachable + 707 empty-macro contradiction) → #6 + #7.

## 17. v1.3 log-growth confirmation — CLOSED (planner, 2026-09-11, approved one-shot read) — post-base segment (base 1269, new base 2474) of `.opencode/plugin.log`: the three silenced types (`file.watcher.updated`/`file.edited`/`session.idle`) = 0 (expected ≈79 % event-line cut verified in kind — they were the growth driver); residual event lines are low-frequency lifecycle only (54 of 1205 lines: message.removed 25, session.created 13, session.error 12, session.compacted 1, todo.updated 1, permission.asked/replied 1+1); new log base 2474 recorded in the NAP.

## 30. De-peek — CLOSED (planner, 2026-09-11) — the node:sqlite build completed 2026-09-10 (core + v2.5 wiring + probe, token semantics verified); the open tails resolved this cycle: v1.3 log-profile rebaseline done (the #17 one-shot read) + #34 residual doc refs gone (live prompts + repo parts grep-clean; the AGENTS.md copy in `proposals/files/` is archived; `playground/` excluded as maintainer-personal per the date-sweep scope rule).

## 35. T1 de-peek build — CLOSED (planner, 2026-09-11) — build scope complete since 2026-09-10 (continuation 2); the remaining tail (v1.3 rebaseline + #34 doc refs) resolved this cycle — see the #17 + #30 records.

## 39. Looprunner prompt v2 proposal — applied + smoke test clean (2026-09-10) (closed 2026-09-10, full text moved from TODO.md)

- **Problem / evidence:** the current `.opencode/prompt_looprunner.md` (27 lines) is
  ambiguous in four places: no closing-action protocol (the loop always restarts until
  the runner hits 85 %), the maintainer-message routing rule ("Ignore the messages you
  get from the user/maintainer") is imprecise, "create a summary" is due exactly at the
  point where writing headroom is gone, and the embedded planner task text carries
  typos — one functional: it names a NON-EXISTENT explorer agent
  (`worker_explorer_jill_gemmaQ4_256K`; the real key is
  `worker_explorer_jill_gemma_256K_mtp`).
- **Outcome (goal):** the looprunner prompt coordinates the loop as a small explicit
  state machine (restart / ask_maintainer / stop) with a verbatim console log and a
  mechanical suggestion-capture channel.
- **Acceptance:** the maintainer applied the consolidated proposal
  `.opencode/looprunner_prompt_proposal_planner.md` (full replacement prompt text + the
  scoped `opencode.jsonc` permission change for `looprunner_Q4_120k`: edit allow for
  `.opencode/prompt_looprunner.md` + `.opencode/loop_log.md` only) and one smoke-test
  cycle (launch → closing message → action line → restart) runs clean.
- **Scope (non-exhaustive):** `.opencode/prompt_looprunner.md`, `opencode.jsonc`
  (both maintainer-owned — the agents must not edit them).
- **Status:** OPEN — MAINTAINER CALL (section above, item 6). Planner-authored
  consolidated proposal (2026-09-10, autonomous session 2) — point-by-point verdicts on
  the looprunner's 8-point proposal and the gemini proposal live in the proposal doc.
  NOT adopted: `loop_state.json`, default `action: resume`, CLI launch.
- **2026-09-10 (session 3) — APPLIED:** the maintainer applied the proposal — the live
  `prompt_looprunner.md` now carries the v2 text (closing action protocol, `@loop`/
  `@looprunner` routing, 80 %/85 % loop hygiene, verbatim suggestions divider, the
  explorer agent name typo FIXED, plus two maintainer additions: "check first if there
  is unfinished work from an interrupted session" and "explorer = fallback when no
  actionable items are left"); `opencode.jsonc` has the scoped edit-allow (prompt +
  loop_log).
- **2026-09-10 (autonomous session 4 — CLOSED, planner-verified):** the smoke-test
  cycle ran clean — session 3 closed with an `action: restart` line and the loop
  restarted this session with the maintainer messages routed verbatim into the
  prompt (routing + action protocol + NAP-edit permission all working). Acceptance
  met → CLOSED.

## 37. Production plugin host lacks `node:sqlite` — the ctx nudge never lands in production (2026-09-10) (closed 2026-09-10, full text moved from TODO.md)

- **Problem / evidence:** the v2.5 match-only post (`313e83b`) is live after the maintainer
  restart (planner session `ses_f773b9c5…`): the `chat.message` hook FIRES for the planner's
  own session (scoped live read of `.opencode/plugin.log`, prompted by the maintainer's
  "test the nudge mechanism" task — chatmsg line, `midSrc=input`), but the gauge read fails
  on every fire: `kind:"gauge" reason:db-error preview:"sqlite-module ResolveMessage: No such
  built-in module: node:sqlite"` (Bun error format = the bun-based opencode.exe host).
  Consequence: NO `ctx:` line reaches ANY agent in production; the never-throw guard + the
  per-fire evidence line work exactly as designed (no post, no crash, silence otherwise).
  The worker's "bun 1.4.2 host-proxy check: PASS" (#30 status line) tested the SYSTEM bun —
  which DOES expose node:sqlite — NOT the bun baked into opencode.exe: the proxy check
  measured the wrong host and gave false confidence.
- **Outcome (goal):** the gauge read succeeds under the PRODUCTION opencode.exe host, so the
  injected ctx line (and the T2 nudge ladder, which depends on the read — #33) can actually
  fire; one implementation, never-throw preserved.
- **Acceptance:** after a maintainer restart, a `ctx: SESSION=<own sid> CTX=…` line reaches
  the planner's own session (chatmsg fire with NO db-error line); probe 33/33 (extend it if
  the core gains a second backend); no NEW gauge-failure reasons.
- **Scope (non-exhaustive):** `.opencode/ctxgauge/gauge.mjs` backend selection (options the
  host facts support: try `node:sqlite` → fall back to `bun:sqlite`, OR spawn the
  maintainer-placed `.opencode/plugin/tools/sqlite3.exe` — proven live by the retired v1.x
  backend); the plugin itself stays unchanged or minimal; probe S4/S6 fixtures if the read
  mechanic changes.
- **Status:** OPEN — maintainer call (which backend path for the bun host; the read must
  work before T2 #33 can fire). The on-disk `sqlite3.exe` (#30 flag-only, do not delete) is
  a ready-made fallback option. Next-session resume order: 1) #37 maintainer call + fix,
  2) launch `worker_explorer_jill_gemmaQ4_256K` (standing goal; CHECK its findings — fast
  but dumb; its edits are allow-listed to TODO.md/handover_task.md/scratchpad), 3) T2 #33
  (blocked on #37), 4) #34 residual doc refs. Note: the NAP could NOT be updated this
  session — `planner_Q4_120K`'s opencode.jsonc permission block denies
  `.opencode/handover_planner.md` (copy-paste from the worker profiles; the older
  `planner_Q3_120k_mtp` block does not have it) — flagged to the maintainer.
- **2026-09-10 (autonomous session 1 — build LANDED):** the backend fallback chain is
  implemented in the shared core (`node:sqlite` → `bun:sqlite` → spawn `sqlite3.exe`,
  per-process cache, readout forms byte-identical, never-throw preserved; NO plugin
  change needed) + probe extended to 45/45 (S7 forces each backend; the REAL
  sqlite3.exe end-to-end on fixtures) + host proofs: system node peek green, system
  bun 1.4.2 proxy green (all three backends on the live WAL db; bun:sqlite API
  verified as `{readonly:true,timeout:N}` — NOT the spec sketch's `readWrite` — and
  `get()`→`null` no-row). Suite 434/434 + ruff F=0. The worker (Q4_120K) built it and
  was killed by the planner's 40-min CLI timeout at the final renumber step; the
  planner finished (check-ID fix + final verifications). PRODUCTION EVIDENCE PENDING
  maintainer restart (a `ctx: SESSION=<own sid>` line must reach the planner session
  with NO db-error line). NOT closed.
- **2026-09-10 (autonomous session 3 — production evidence in → CLOSED):** after the
  maintainer restart, the line `ctx: SESSION=ses_f76b0f74affeKJEu0HdQerFNHv CTX=notAvailable`
  reached the planner's own session with the first user message — NO db-error line (the
  bun-host backend chain `node:sqlite` → `bun:sqlite` → spawn `sqlite3.exe` works in
  production; `notAvailable` = correct readout for a session without a finished step yet,
  cross-checked: the same session's later self-gauge read `CTX=27215 (22%)` cleanly).
  Acceptance met → CLOSED (planner, session 3). Tail note: the v1.3 log-profile
  rebaseline remains #30 / maintainer call 1 (default SKIP — not done autonomously).

## 38. (TEST) explorer smoke test — jill gemmaQ4-256K first launch (closed 2026-09-10, full text moved from TODO.md)

CLOSED (planner verified, 2026-09-10): smoke test PASSED — the explorer read the spec,
appended this entry, committed ONLY `TODO.md` (`452de1a`), stopped fast (~45 s session).
CAVEAT recorded: its final self-gauge line `CTX=14329 (11%) REM=241058` is FABRICATED —
no finished step of its session carries that ctx, and the numbers are internally
inconsistent for any window (14329/256k would be 5 % / REM 241671): it pattern-matched
the required final-line format without running the command. Fast-but-dumb signal for
the maintainer (check explorer work; the number itself is unverifiable).

## 34. Stale `peek.py` documentation refs + worker prompt permission block (closed 2026-09-10, full text moved from TODO.md)

CLOSED — all agent-facing docs now self-peek via `node .opencode\ctxgauge\peek.mjs`
(readout `SESSION=… CTX=… (…) REM=…`): prompt files (`a235886`, planner execution — the
worker was blocked by the `.opencode/prompt_**` deny) + `agents_repo.md` gauge line
(~164) and module-map line (~122) (explicit maintainer instruction, 2026-09-10).
Residual refs (frozen `deactivated/handover.ts` copy, `playground/outline_rework_prompts.md`
draft, historical files/records) = LEFT AS HISTORICAL. **2026-09-10 (260910, maintainer):**
"#34 is stale and closed? why ask for decision?" — the residual refs stay historical, NO
call needed (the NAP call bundle drops the #34 residual).

## 36. `agents_repo.md` `Environment & shell` — wrong/stale lines (lab-verified, fixed) (closed 2026-09-09, full text moved from TODO.md)

One-line record: the section (previously 48 lines) was validated in fresh-worker
first-shot batteries (T1–T10, pwsh + git-bash) and compacted 48→24 lines; round 2
ended 10/10 first-shot. Corrected/verified facts now in the section: `ConvertTo-Path`
does NOT exist in pwsh 7.6 (the old text suggested it — guaranteed first-shot failure);
`$env:NO_COLOR='1'` does NOT suppress ANSI codes in table output; env var `FST` value
carries a trailing `\`; bare `python` on PATH = 3.14.3 without repo deps (fake-starts,
then import-fails — always venv exe); scalar listing recipe needs `-File`; `pwd -W`
prints forward slashes. Status: closed — section committed as tested.

## 49. `handover_task.md` worktree/HEAD conflict (2026-09-10) (closed 2026-09-11)

One-line record: maintainer call — the worktree held the LANDED part-3 spec (byte-identical
to `854bb68`) while HEAD held the split-build spec (`8b4123b`); the maintainer resolved it
directly (`b6dc3e7` "cleaned up commit mess" — restored lost updates, HEAD split-build spec
canonical, tree clean) → closed; the split build launched per the committed spec.

## 40. Explorer run #1 output unreliable (2026-09-10) - CLOSED (maintainer ruling 2026-09-10: the gemma agent option removed, verified in the live opencode.jsonc; curated 2026-09-11, iter 5) - the audit re-run goal was completed via audit 3a/3b (session 4; #48 is the only open audit residual); the gauge-fabrication caveats stand as the explorer-output-check lesson (verify numbers against the real command).

## 50. (closed 2026-09-11, planner-direct, approved by maintainer inbox 11-11) — repo_map.md refresh: (a) §Worker-roster explorer bullet "findings to `TODO.md`" → "findings to `todo_inbox.md` (the planner curates + assigns the TODO IDs)"; (b) §Module-map `.opencode/` bullet now lists `system_readme/` parts + `agent_readme_*.md` readmes + the `loop/` current-looprun / `archive/loop/` history convention (and drops the stale "draft copies in `proposals/files/`" — they are archived). "Stable facts only" kept — no phase progress introduced.

## 17. (closed 2026-09-11, see one-line record above) — v1.3 log-growth CONFIRMATION — one-shot read, deferred by the no-`plugin.log` constraint (2026-09-08)

- **Problem / evidence:** the old-profile measurement (v1.1+v2 era): the delegation cycle
  grew the log to 1036 lines / 571 KB in 5 min (≈0.9 KB/s — the "rapid growth" complaint,
  quantified); child-session lines ≈47 % of total; the residual unsilenced types were
  `file.watcher.updated` ×41, `file.edited` ×7, `session.idle` ×1. v1.3 = silence exactly
  those — landed 2026-09-09 (#29 item 3) — but the live byte-ratio of that extension has
  NOT been measured; measuring requires a read of `plugin.log`, which the standing
  maintainer constraint forbids except ONE scoped, one-shot read on request.
- **Outcome (goal):** take the v1.3 profile — ONE scoped, one-shot read of the retained
  log's post-base segment; expect the three types at 0 + ≈79 % event-line cut; refresh the
  NAP's log base (currently 1269 — STALE on purpose).
- **Acceptance:** measured ratio + new log base recorded in the NAP; this entry closes.
- **Status:** OPEN — MAINTAINER CALL (section above, item 1; default: SKIP unless asked —
  never parse the log unprompted).

## 30. (closed 2026-09-11, see one-line record above) — De-peek: replace the peek.py shell-out with an in-plugin `node:sqlite` read (2026-09-09)

- **Problem / evidence:** the gauge shell-outs (`$`-tagged-template → `.venv/Scripts/python.exe
  .opencode/ctxgauge/peek.py`, `handover.ts` ≈301) against the OLD opencode.db schema —
  fragile (fresh-session `fetchone() → None` class of bug, #21/#24). `node:sqlite` is
  built into the probe node v24.19.0 (confirm exposed on the system CLI host — it was
  absent in the electron host).
- **Outcome (goal — ONE cycle, APPROVED):** (1) in-plugin `node:sqlite` gauge landing +
  peek.py removal (`.opencode/ctxgauge/` delete, unless the maintainer keeps a
  standalone-CLI copy — his call) + doc purge (`AGENTS.md` COPY — the original is
  agent-read-only — + `prompt_agent_planner.md` + `prompt_agent_task.md`); (2) re-baseline
  the v1.3 log-profile measurement in the SAME cycle (landing de-peek re-baselines the
  gauge host — the probe's S4 fake-shell gauge shapes must be rebuilt per the #20
  exception); (3) the read is written against the CURRENT opencode.db schema (`session` /
  message-token JSON; model id from `session.model`'s `id`) and guards the fresh-session
  case like peek.py does (no finished message ⇒ `CTX=0`, never throw into the transform) —
  this replaces the parked #21 v2-schema note.
- **Carry-over caveat (UNVERIFIED, from the 2026-09-09 dirty `peek.py` diff, committed with
  that entry):** "should total not be the most current total token number? output should
  be the generated tokens for the last message so it should be substract output from
  total" — i.e. `total − output` may already be the right readout — CHECK the token-field
  meaning BEFORE wiring the same arithmetic into handover.ts; record the verified meaning
  when done.
- **Acceptance:** no python shell-out on the gauge path; probe passes (rebuilt S4); the
  doc references purged (AGENTS.md via the hand-over copy); token semantics recorded here.
- **Scope:** `.opencode/plugin/handover_v2.4.ts` (readout ≈301), `.opencode/plugin/scripts/`
  (the gauge core + self-peek CLI — moved out of the former `.opencode/ctxgauge/` on
  2026-09-10), `prompt_agent_planner.md`, `prompt_agent_task.md`, the AGENTS.md copy.
- **Token semantics — VERIFIED (record per this cycle's task fact 3, closes the
  carry-over caveat above):** `total = input + output + cache.read` holds EXACTLY across all
  recent step rows → `ctx = total − output` = the exact prompt size at the latest finished
  step = current context at that moment (measured 2026-09-10; the implemented read-out is built on this).
- **Backend ruling (2026-09-09, maintainer):** the node:sqlite design is SUPERSEDED — the
  plugin host (opencode.exe, a bun-compiled binary) cannot be trusted with node:sqlite (the
  T1 worker could not solve a sqlite call via node modules there). The core now spawns the
  maintainer-placed `.opencode/plugin/tools/sqlite3.exe` (args array, `file:…?mode=ro`,
  marker SQL `M|…`/`S|…`, no PRAGMA in the call — its echo pollutes stdout). Verified live
  under node v24.19.0 + bun 1.4.2; the worker's digit corruption (multiplier `105` →
  `100`/`1000`) fixed; window rule = trailing `<N>K` × 1000 exactly, last marker wins
  (maintainer-confirmed).
- **Backend RE-RULING (2026-09-10, maintainer):** the sqlite3.exe spawn backend is
  SUPERSEDED — back to built-in `node:sqlite` (`DatabaseSync`; node v24.19.0 flag-free per
  fact 1 of the task spec). Rationale: the 3bit Q3 workers lost coherence on the SQL/JSON
  detail work; the build now runs on the 4bit same-model worker `worker_Q4_120K`
  (maintainer restart with the new roster). The bun-compiled opencode.exe host risk is
  guarded by the never-throw `db-error` fallback; the worker records a bun 1.4.2 host-proxy
  check; production evidence = maintainer restart + one-shot log read (call 1).
  `sqlite3.exe` stays on disk (maintainer-placed, now unused — do not delete).
- **Status:** LANDING (2026-09-10, continuation 2 — node:sqlite re-ruling) —
  plugin wiring + probe + node:sqlite core landed this cycle — log-profile
  re-baseline pending maintainer restart + one-shot log read (call 1, default
  SKIP). bun 1.4.2 host-proxy check: PASS (core import + `readGauge()` green
  under system bun, kind=ok on the live db). The build scope is complete (core
  node:sqlite-only, v2.5 plugin wiring + probe 33/33, peek.py deleted); do NOT
  close — the log-profile tail + #34 residual doc refs remain open.
  **2026-09-10 (evening, production restart evidence):** the read fails under the
   PRODUCTION bun host (`db-error`, no `node:sqlite` — Bun error format) → no ctx line
   lands; see #37 (the bun-1.4.2 system-bun proxy check measured the wrong host).
   **2026-09-10 (T2 #33): ladder build LANDED —** per-session read (gauge.mjs optional
  sessionID param) + the v2.6 nudge ladder in handover_v2.4.ts + probe S8 (checks
  46-53; 52/52 PASS, exit 0) + suite 434/434 + ruff F=0; production evidence (a forced
  high-readout nudge after a maintainer restart) PENDING.

## 35. (closed 2026-09-11, see one-line record above) — T1 de-peek build — LANDED (continuation 2); tail open: v1.3 log-profile re-baseline (call 1) + #34 residual doc refs (2026-09-10)

- **Problem / evidence:** T1 build (task file `.opencode/handover_task.md`) stopped at the
  context stop-line: self-gauge read at stop time `CTX=106441 (87%)` (≈14 k left vs. ≈45–50 k
  estimated for the remainder). Landed + committed: shared gauge core (`ctxgauge/gauge.mjs`)
  + self-peek CLI (`ctxgauge/peek.mjs`, verified live against the real DB) + peek.py
  deletion + suite 434/434. NOT landed (spec DoD pending): the v2.5 plugin wiring in
  `handover_v2.4.ts` (native gauge import + session-gated match-only post + `sess` evidence
  field + db-error vocabulary + header block + dead shell mechanism deletion), the probe
  rebuild (currently pointing at the deleted `handover.ts` — stale; S4/S6 shapes per spec),
  the doc purge (#34), the v1.3 log-profile rebaseline (call 1, default SKIP).
- **Outcome (goal):** T1 completed per spec (probe `PROBE handover: N/N PASS`, suite 434/434,
  `peek.mjs` prints the `SESSION=…` line — this one already holds — plugin lands the gated read, #30/#33 tail updates, commit).
- **Acceptance:** task file DoD items 1–5 all true.
- **Suggested scope:** `.opencode/plugin/handover_v2.4.ts`, `.opencode/plugin/probes/handover_probe.mjs`, doc files in #34, `TODO.md`.
- **Status:** OPEN — the T1 build scope itself is COMPLETE (2026-09-10, continuation 2 —
  see the status tail below); remaining tail = the v1.3 log-profile rebaseline + #34
  residual doc refs. 2026-09-09 update:
  the sqlite-via-node:sqlite problem is SOLVED per maintainer ruling — the core
  (`ctxgauge/gauge.mjs` + `peek.mjs`) landed on the sqlite3.exe backend (planner-direct,
  verified live, corruption fixed; task file now carries a PLANNER RULING block). Remaining
  continuation scope: plugin wiring (session-gated match-only post) + probe rebuild +
  suite/ruff + peek.py deletion + #30/#35 status lines — per the ruling block + DoD.
  2026-09-10: backend RE-RULING (node:sqlite, see #30) — the committed core's sqlite3.exe
  read mechanic is re-implemented in continuation 2; the 3bit 210K delegation looped
  (no partial commits, verified via git log); re-delegated to `worker_Q4_120K`.
  **2026-09-10 (continuation 2 — LANDED):** node:sqlite core + v2.5 plugin wiring +
  probe rebuild (33/33) + suite 434/434 + ruff F=0 + peek.py deletion committed;
  remaining tail = the v1.3 log-profile rebaseline (maintainer call 1) + #34
  residual doc refs (planner/maintainer-owned).

## 52. `compact_memory` fails in the current host build — connection error on both paths (2026-09-12, planner ses_f6b7c5242ffeZpNl0Ar8mILWua)

- **Problem / evidence:** firing the `compact_memory` tool returns
  "Compaction request failed: Unable to connect. Is the computer able to
  access the url?" in the current host build (verified live 2026-09-12).
  Diagnosis (same session, measured): the only opencode process
  (`opencode.exe`) listens on NO TCP port at all; `OPENCODE_PORT` is empty
  → the HTTP fallback targets `localhost:4096`, where nothing listens.
  Definitive key dump (maintainer's `get_context_keys` probe, 2026-09-12):
  contextKeys = sessionID, abort, messageID, callID, extra, agent, messages,
  metadata, ask, directory, worktree — **NO `client` key** (clientKeys /
  sessionKeys empty). So `context.client` IS absent from the tool context in
  this build (the earlier throw was `client` itself being undefined, not a
  missing `.app`). The failure came from the HTTP fallback (no usable client
  + no listener on 4096). The failure did NOT consume the
  per-session compaction budget (no `.opencode/temp/compact_budget.json`
  — increment-on-success holds).
  Installed-SDK evidence (2026-09-12, grepped from
  `.opencode/node_modules/@opencode-ai/sdk/dist/`): **v1** generated types
  expose only `session.summarize` (url `/session/{id}/summarize`) — NO
  `compact` method; **v2** exposes both `summarize` and `compact`
  (`compact` url `/api/session/{sessionID}/compact`, FLAT `parameters`
  shape). Consequences: (a) the tool's current call
  `client.session.compact({path:{id}, body:{keep}})` mixes generations —
  v1 has no `compact`, v2's `compact` takes flat parameters, so even WITH a
  wired client the call shape is suspect; (b) the HTTP fallback hits
  `/api/session/compact` with the sessionId IN THE BODY — matches NEITHER
  typed endpoint (both are session-ID-in-path); (c) the `context.api`
  fallback is dubious per the maintainer's knowledge doc (not necessarily
  SDK-client-interchangeable).
- **Outcome (goal):** `compact_memory` compacts a live session in the
  current host build via the path this build actually exposes (client
  wiring decision = maintainer domain); if no path exists in this build,
  the tool reports WHICH path was attempted and why it failed (client
  absent / HTTP no-listener / endpoint mismatch) instead of the generic
  "Unable to connect".
- **Acceptance:** a live fire in a session → success (COMPACT line in
  `.opencode/temp/ctx.log` + budget increment), or a maintainer decision
  on the supported host configuration. The chosen call shape must match
  the installed SDK `.d.ts` (grep-verified against
  `sdk/dist/{gen,v2/gen}`); if the HTTP fallback stays, its endpoint is
  `/api/session/{sessionID}/compact` and it only applies when a server is
  actually listening.
- **Scope:** `.opencode/tools/compact_memory.ts` (resolution chain:
  `context.sessionID` first per the knowledge doc; `context.client` only —
  drop the silent `context.api` equivalence; error reporting),
  `.opencode/node_modules/@opencode-ai/sdk/dist/{gen,v2/gen}/*.d.ts`
  (installed types — the authority for the call shape), the host-side
  client/URL wiring (maintainer domain), the v2 test notes
  (`maintainer/done/compact_memory_v2test.ts` +
  `compaction_warning.md`), the knowledge doc
  (`maintainer/done/knowledge_opencode_tools_plugins.md`).
  Related: the loop_log-v2 proposal's Part A context probe (which context
  fields the host wires — `sessionID`/`agent` confirmed, model open); the
  installed plugin package DOES expose the
  `experimental.session.compacting` hook (candidate alternative design:
  inject durable context AT compaction instead of triggering it).
- **Solution paths (2026-09-12, maintainer Q&A + this session):**
  (1) **Plugin-registered compact tool** — the clean architecture: the
  custom-tool context is clientless BY DESIGN, so a client-needing tool
  must be registered FROM a plugin (plugin `ctx` carries the SDK/RPC
  access; plugins can register tools; the tool's execute still gets
  sessionID/agent). I.e. move `compact_memory` to a plugin-registered
  tool (registration = maintainer domain; the call shape must still match
  the installed SDK `.d.ts` per the evidence above).
  (2) **Compaction hook plugin** (prompt-level) — the maintainer's WIP
  `inbox_planner/custom_compaction.ts` sets `output.prompt` in
  `experimental.session.compacting` to a swarm-oriented resume prompt
  (shape verified against installed plugin types 2026-09-12). Complements
  (1): compaction stays host-triggered (maintainer compacts manually in a
  direct session); the plugin shapes the resulting prompt.
  (Source: `maintainer/done/plugin_exposed_custom_tool.md`.)
- **Status:** LANDED (2026-09-12, worker-2) — the build landed per the
  approved v2 proposal (plugin-registered `compact_memory` at
  `.opencode/plugin/compact_memory.ts`; v1 retired to `plugin/deactivated/`;
  probe S13 checks 86-99, 98/98; live acceptance PENDING: the maintainer's
  registration in `opencode.jsonc` + restart, proposal Acceptance 2-4).
  Design agreed with the maintainer (2026-09-12): plugin-registered tool
  (client via captured plugin ctx; v1 `summarize` path ACTIVE on this build
  + v2 `compact` hedge; keep args optional in the body with a 400-retry;
  cross-session via `sessionID` arg; HTTP fallback + compaction hook
  retired). Proposal:
  `proposals/approved/2026-09-12_compact_memory_plugin.md` (APPROVED).
  Probe evidence: `.opencode/plugin/dev_probe_ctx.ts` (client present in
  plugin ctx; summarize=function, compact=undefined; session methods on
  the prototype → detect with typeof; registration via the `plugins` array;
  the file IS the worked example of a plugin-registered tool — the
   registration shape is verified live).
  - **2026-09-13 (direct session ses_f692e1071ffevodtnJTET0DEEs):** live
    no-op bug FIXED — root cause: the server's `summarize` payload schema
    REQUIRES `providerID` + `modelID` (binary: the handler
    `SessionHttpApi.summarize` reads both from the body; a missing body /
    missing key is a schema rejection → HTTP 404 JSON `{name:"BadRequest"}`
    + a logged WARN "schema rejection" — 6 in the server log, one per fired
    tool, both test sessions). The handler never ran → NO compaction; and
    the host client does NOT throw on the 404 (it resolves) → the old code
    reported a false success and burned a budget slot. Fix: the body ALWAYS
    carries the resolved model pair (self: `extra.model.{id, providerID}`;
    cross: the last message's info, assistant `modelID`+`providerID` / user
    `model` object); an unresolvable pair → the request is NOT sent (clear
    failure, no increment, no COMPACT line); the resolved result is VERIFIED
    (success = the handler's boolean `true`; a resolved 404 JSON is a
    failure carrying the server's message). Probe re-pinned (S13: the retry
    2nd body keeps the pair, the failing-RPC path no-sends) + the S11 RC
    import REPOINTED to `plugin/deactivated/context_recovery.ts` (the
    maintainer's cleanup 4b44d8c moved the file without repointing the
    probe — the probe was broken at HEAD). Gates: probe 98/98, smoke 23/23.
    Live acceptance STILL PENDING: a real fire must show the compaction
    part + the `time_compacting` flag in the DB (verify with
    `Temp/opencode/sesdata.cjs` or `compaudit.cjs`).
- **2026-09-12 (direct session ses_f6976031bffeRa8gNNcpy5FoYj):** model
  field RESOLVED — it is nested, not top-level: `context.extra.model.id`
  (live capture `tools/dev/hot_loaded_tool.ts` + maintainer `--todo` note in
  the loop_log-v2 approval; the earlier key dump listed top-level keys
  only). Feeds the Part 4 quant-class classification (priority.md #1) and
  loop_log-v2 Part A. `priority.md` #1 (his `--wip` item) extends this
  design with the per-model quant-class budget: Q4→3, Q3→1, other→1
  preliminary, CPU models excluded — design grounded in the NAP, awaiting
  his ruling (approval path + CPU- prefix confirmation).
- **CLOSED 2026-09-13 (iteration 1):** live acceptance DONE — a real fire
  (worker-1 `ses_f6765a68bffeudOXmVzLROTYk6` + planner-direct rescue) shows
  the compaction part + reload directive + budget v2 count 1/3 + the COMPACT
  line in the DB; the host runs the fixed plugin (the `2ace5e1` model-pair
  fix). The resume-via-`task_id` context-overflow finding →
  `proposals/2026-09-13_compact_memory-findings.md` (AWAITING APPROVAL;
  item 1: lower the self-compact trigger + server keep support as the
  durable fix; item 2: `time_compacting` semantics ruling).

## #89. (LANDED 2026-09-23, worker-15 `worker_Q3S_170K`) — autorun-identifiable names for plugin-spawned sessions: the auto_resume spawns carry the title `<loop-folder> planner-<N>` (his # 2026-09-23_04-34)
- **Problem + evidence:** sessions the auto_resume plugin SPAWNS (the Unit-3 file-trigger spawn and the Unit-4 restart branch) get auto-resolved names (opencode derives them from context) — the sessions that belong to a loop autorun are not findable by name (maintainer request, priority.md # 2026-09-23_04-34).
- **Desired outcome:** make the loop's spawned sessions identifiable: name = the current loop folder + the next planner iteration (`planner-<N>`, N = the largest `planner-<N>` in that folder's `loop_log.md`, + 1 — the same derivation the planner uses for its iteration number).
- **What landed:** the bounded SDK answer was YES — `session.create()` accepts a title (vendored `@opencode-ai/sdk` types, `.opencode/node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts` L1811: `SessionCreateData.body?: { parentID?, title? }`) → the identifier is passed as `body.title` in the SHARED `spawnPlanner` helper's `create()` call (both spawn paths; `auto_resume.ts`), with an `ident=` bit in the `spawn=` log line; no loop folder / no `loop_log.md` / no `planner-<N>` line → no identifier (the spawn is exactly as before — the prompt-prefix fallback was NOT used).
- **Acceptance:** two new smoke checks (deterministic loop folder `autorun-test_0-0` → title `autorun-test_0-0 planner-8` lands in the create body + `ident=` bit, queued prompt text unchanged; a log with no planner-<N> line → no title, prompt unchanged); auto_resume smoke 104/104 (baseline 102, no removals); gate: all 10 smokes, probe 241/241, pytest 459 passed + 1 warning (#10), ruff F=0 (baselines as of commit 725ab3a, measured at 75566e6).
- **Status:** LANDED (commit 2240d00, recorded in the planner-9 bookkeeping per the commit-hash rule). LIVE acceptance pending: the plugin activates on the next host restart; the planner verifies the first named spawn (out of scope for the worker).

## 84. (LANDED 2026-09-22, worker `worker_Q3S_170K`) — Compaction config consolidation: ALL compaction config in the shared `compact_budget.json` (replaces the `QUANT_CLASS_RULES` substring table + the opencode.jsonc emergency flag + the hardcoded recovery keeps)
- **Problem + evidence:** the compaction caps came from a hardcoded ordered
  substring table (`QUANT_CLASS_RULES`, compact_memory.ts L79-86 — the
  2026-09-21 quant-class ruling with the probe trap pin); the T5 emergency
  flag lived in `opencode.jsonc` (read per fire); context_recovery's keep
  (30_000 / 12) was hardcoded; auto_resume already read its keys from
  compact_budget.json per tick — the config was split across three files
  (2026-09-22 design exchange, recorded in the NAP).
- **Desired outcome:** compact_budget.json is the SINGLE compaction-config
  source: top-level optional fail-open keys `keepTokens` (default 30_000),
  `keepMessages` (12), `emergencyRecovery` (strictly `true`, default false),
  `model_budget` (bare model ID → cap, plus a `default` key, default 1);
  CPU models stay cap 0 as a SAFETY INVARIANT; an unlisted / typo'd model
  id → the configured default (fails safe).
- **Acceptance criteria (all LANDED, measured gate green):**
  `compact_memory.ts` exposes `resolveCap(root, model)` (per-call
  model_budget read) + `readCompactionConfig(root)` (fail-open); keep
  reporting falls back to the file config (explicit args still win);
  `context_recovery.ts` reads flag + keeps from the SAME file (self-
  contained local reader — no runtime import from compact_memory.ts; the
  file STAYS in `deactivated/`); smokes updated (model_budget seed +
  exact/unlisted/typo/CPU fixtures + keep-override + config fail-open
  cases); probe 241/241 (check 87 → the "configured value" fixtures; S11
  checks 77/78 flag from the budget file, the JSONC fixture dropped);
  full gate green — 10/10 plugin smokes, probe 241/241, pytest 459 passed
  + 1 warning, ruff F=0.
- **Suggested scope (actual):** `.opencode/plugin/compact_memory.ts`,
  `.opencode/plugin/deactivated/context_recovery.ts`,
  `.opencode/plugin/tests/compact_memory.smoke.mjs`,
  `.opencode/plugin/tests/context_recovery.smoke.mjs`,
  `.opencode/plugin/probes/handover_probe.mjs`.
- **Status:** LANDED (2026-09-22, worker `worker_Q3S_170K` — the gate
   green as above; the commit hash is recorded by the planner in the
   follow-up bookkeeping commit, not in this entry's commit).

## 61. (closed 2026-09-15, planner plan5; title reworded plan6) — probe baseline corrected: post-S14 baseline is one-zero-six, not the plan3/plan4-era nine-four

The plan3/plan4 NAP baseline line said ninetyfour — the plan3-era probe,
whose header annotation and per-section list sum AGREED at ninetyfour
(machine-verified plan6 at `a15828c`). After S14 (plan4 build `4512fe6`,
checks 101-107) the self-counted baseline is one-zero-six
(one-zero-six/one-zero-six); annotation and self-count agree at HEAD
(machine-verified plan6; plan5 gate one-zero-six PASS). The original
"annotation stale by 5 hygiene checks (40–43/45/64)" narrative is NOT
corroborated by the commits — the annotation was self-consistent at every
commit checked (`a15828c`/`4512fe6`/`4340043`/HEAD); superseded, original
text recoverable in git (`0761e42`/`4b4153f`). NUMWORDS NOTE retained:
dense X/X numeral pairs are a transcription trap — write them as words in
prose.

## 63. (closed 2026-09-16, plan7 worker-7; finding 2026-09-15 worker-5, planner plan5) — compact_memory smoke: 4 failures at HEAD (dump-hook sandbox gap)

- **Problem / evidence:** `node .opencode/plugin/tests/compact_memory.smoke.mjs`
  → 4 failures that EXIST at clean HEAD (proven by the worker via `git stash`
  before his commit `28783a7`). Suspect cause: the pre-compaction dump hook
  (TODO #55 build, `4512fe6`) writes dump files, and the smoke sandbox /
  mocks do not account for that path (or vice versa). NOTE: the smoke tests
  are NOT in the standard gate (pytest + ruff + probe) — this is why the
  failures went undetected through plan4.
- **Desired outcome:** the 4 smoke failures fixed (either the hook respects
  the smoke sandbox, or the smoke fixtures/mocks are updated for the hook);
  `node .opencode/plugin/tests/compact_memory.smoke.mjs` green.
- **Acceptance criteria:** all plugin smoke tests green (`node
  .opencode/plugin/tests/<name>.smoke.mjs` for each); standard gates
  unchanged (probe 106/106, pytest 459+1w, ruff F=0).
- **Suggested scope:** `.opencode/plugin/compact_memory.ts` (the dump-hook
  call site), `.opencode/plugin/tests/compact_memory.smoke.mjs`,
  `.opencode/agent/scripts/db/dump_session.cjs` (read-only reference).
- **Status:** CLOSED (2026-09-16, plan7 worker-7) — fixed by the smoke stub: the sandbox now carries a byte-identical `dump_session.cjs` stub from the probe S13 preamble (handover_probe.mjs 1983-2015) so the dump hook (4512fe6) succeeds silently + 1 new chk pins the hook firing on the tool path (`compaction_dumps/ses_sm_self_c0.md`); smoke 43/43, all 7 smokes green, gates unchanged (probe 106/106, pytest 459+1w, ruff F=0); fix + this note ride the plan7 closing commit (subject "close #63: compact_memory smoke adapts to the pre-compaction dump hook"). DECISION NEEDED (optional): should the smoke suite join the standard gate in repo_commands.md? (relates to #58's gate-definition entry.)

## 60. (closed 2026-09-16, worker-9, plan7/iter7; 2026-09-15, planner plan5) — `block_transfer` + `loop_log` lack probe pinning

- **Problem / evidence:** the custom tools `block_transfer` and `loop_log`
  (`.opencode/tools/*.ts`) have smoke tests (`plugin/tests/block_transfer*.smoke.mjs`,
  `loop_log.smoke.mjs`) but ZERO handover-probe pinning (`grep block_transfer
  handover_probe.mjs` = 0 hits) — contrast `compact_memory` (S10–S14) and
  `ctx_gauge` (S12): their contracts can drift silently with no gate signal.
- **Desired outcome:** a probe section pinning both tools' contracts
  (registration shape, arg schemas, core behavior — sandbox validation for
  block_transfer, the 8-char status tokens + line format for loop_log),
  APPEND-only per the probe discipline.
- **Acceptance criteria:** probe total grows by the new section's check
  count, all green; both smoke tests still pass; header annotation updated.
- **Suggested scope:** `.opencode/plugin/probes/handover_probe.mjs`,
  `.opencode/tools/{block_transfer,loop_log}.ts` (read-only reference).
- **Status:** CLOSED 2026-09-16 (worker-9, plan7/iter7) — S15 (10 checks) + S16 (6 checks) appended; probe total 106 -> 120+2 all green (header annotation agrees with the reported total), all 7 smokes green, pytest 459+1 warning, ruff F=0; fix commit 75be075.

## 59. (closed 2026-09-16, plan6; 2026-09-15, script-collection worker, curated plan3) — session-corpus refresh cadence

- **Problem / evidence:** the corpus `.opencode/archive/sessions/` goes stale
  between backfills (e.g. `ses_f5d03802...` was dumped mid-session: 59 msgs
  vs 65 in the DB); the pre-compaction dump hook covers new sessions only.
  PLAN3 (2026-09-15) ran a one-off `dump_session.cjs --all --slim` refresh
  (147 sessions, 0 failures).
- **Desired outcome:** a documented cadence / trigger for corpus refreshes
  (suggestion: before the #56 distillation runs start; after heavy loopruns).
- **Acceptance criteria:** the cadence decision recorded (NAP Standing or the
  scripts README); the corpus refreshable via one documented command
  (`node .opencode/agent/scripts/db/dump_session.cjs --all --slim`).
- **Suggested scope:** the decision record; `.opencode/archive/sessions/`.
- **Status:** CLOSED (planner call, plan6 2026-09-16) — cadence recorded in
  the NAP Standing: refresh BEFORE the #56 distillation runs start + after
  heavy loopruns; command `node .opencode/agent/scripts/db/dump_session.cjs
  --all --slim`.

## 58. (closed 2026-09-16, plan8; 2026-09-15, script-collection worker, curated plan3) — standard gate definition lacks the probe command

- **Problem / evidence:** the standing gate baseline mentions "probe 99/99",
  but the probe command is not defined in `repo_commands.md` §Run / test
  (pytest + ruff only) — the worker had to infer it from the launch baseline
  (worker script-collection, 2026-09-15).
- **Desired outcome:** the gate definition lists all three commands
  (`pytest -q`, `ruff check --select F .`,
  `node .opencode/plugin/probes/handover_probe.mjs`) so "standard gate" is
  unambiguous for every spec/launch.
- **Acceptance criteria:** `repo_commands.md` §Run / test names the probe
  command with the current baseline (99/99 as of 2026-09-15).
- **Suggested scope:** `.opencode/agent/readme/repo_commands.md`
  (maintainer-owned file — he edits it or tasks the planner).
- **Status:** CLOSED (2026-09-16, plan8) — `repo_commands.md` §Run/test now
  names the probe command and defines **"standard gate" = pytest + ruff +
  probe** (the probe's total is self-annotated in its header — the annotation
  is the source, no duplicated moving number); his temp-path note landed in
  §Environment & shell as verified fact (git-bash `$TMP/opencode` =
  `home/AppData/Local/Temp/opencode`, the approved scratchpad).
  His "add to them as need be — curate, don't duplicate" ruling is the standing
  convention for this file. The #63 optional question (do the plugin smokes
  join the standard gate?) was NOT decided unilaterally — it stays open for
  his direct session.

## 57. (closed 2026-09-16, worker-8, plan7/iter7; 2026-09-15, worker T1 block_transfer sandbox, curated plan3) — block_transfer MOVE silently deletes a block when `dstFile` is missing

- **Problem / evidence:** in `.opencode/tools/block_transfer.ts`, MOVE mode
  extracts the source block (CUT) BEFORE the `'dstFile' is required for MOVE
  mode.` check runs — so a MOVE with `dstFile` missing deletes the block from
  the source file and only THEN errors: silent data loss of the yanked block.
  Pre-existing (pre-T1). Recorded by worker-10 (2026-09-12).
- **Desired outcome:** the `dstFile` requirement is checked before ANY source
  write — a missing `dstFile` yields the error with the source file untouched.
  Valid-input semantics stay byte-identical.
- **Acceptance criteria:** a smoke/assertion proves MOVE with missing
  `dstFile` → error + source file unchanged; the existing block_transfer
  smokes stay green.
- **Suggested scope:** `.opencode/tools/block_transfer.ts` (hoist the
  `!args.dstFile` check to the top of the anchor-extraction section, before
  any write); a smoke in `.opencode/plugin/tests/`.
- **Status:** CLOSED (2026-09-16, worker-8, plan7/iter7) — guard hoisted pre-write: the `!args.dstFile` check now runs before the source-cut write (invalid-input-only change, exact error string kept); 2 new smoke assertions (22/22), gates 106/106 + 459 passed + ruff F=0; commit 733ca7a.
  NOTE 2026-09-16 (plan1): his approval comment on this entry handled — the
  status feedback he requested is in
  `.opencode/maintainer/feedback/2026-09-16_block_transfer_status.md`
  (answers the buffer / sandbox / shared-scriptlet questions).

## 55. (closed 2026-09-17, live-accepted in direct session ses_f4f539d7c…; maintainer call 2026-09-15) — `compact_memory` needs a dump function of the current session

- **Problem / evidence:** compaction (host default AND `compact_memory`) irreversibly
  destroys the fine-grained session context — the pre-compaction messages are gone once
  the summarize lands. A post-compaction dump of that session would miss EXACTLY the
  content that was destroyed. Maintainer 2026-09-15 (direct session, chat mode):
  "moment when we compact, we destroy exactly this ... i have only access to the
  default compact and this would irreversible destroy some part of the sessions
  context. mark this down: compact_memory needs a dump function of the current
  session." Related: the session-corpus discussion 2026-09-15 (readable dumps of all
  sessions from the opencode DB — 130 sessions / 6,125 messages / 27,003 parts verified
  in `~/.local/share/opencode/opencode.db` — as the consolidation basis; a post-hoc
  dump script by session_id was the interim idea).
- **Desired outcome:** `compact_memory` (and eventually the host auto-compaction path)
  dumps the session's FULL pre-compaction content into the session corpus BEFORE the
  compaction runs — so the corpus stays complete even for compacted sessions.
- **Acceptance criteria:** after any compaction of session X via `compact_memory`,
  `.opencode/archive/sessions/<date>_<X>.md` exists and contains the pre-compaction
  messages; the dump runs BEFORE the summarize dispatch; a dump failure does not block
  the compaction (note/WARNING logged); probe stays green (append-only checks).
- **Suggested scope:** `.opencode/plugin/compact_memory.ts` (dump hook before
  summarize); the session-dump script shared with the backfill idea (read-only DB →
  markdown, tool outputs condensed); `.opencode/archive/sessions/`.
- **Status:** **LIVE ACCEPTED 2026-09-17** (direct session
  `ses_f4f539d7cffeVeRhsFQRdoSRUC`, post-restart — the acceptance was the
  session's own self-compact call): `compaction_dumps/ses_f4f539d7cffeVeRhsFQRdoSRUC_c0.md`
  produced with the FULL pre-compaction content (75 messages / 360 parts,
  mode=full, dumped 19:33:00 — BEFORE the summarize landed; the post-dump
  compaction ran clean, COMPACT line in `.opencode/temp/ctx.log` at 21-33,
  gauge back from 84% to 27%). All acceptance criteria met: dump exists,
  pre-compaction messages intact, no-overwrite `_c0` naming, compaction not
  blocked. BUILD LANDED (plan4, 2026-09-15): the hook is in
  `compact_memory.ts` (`preCompactionDump`, fires before ANY dispatch,
  no-overwrite `compaction_dumps/<sid>_c<count>.md` naming), `dump_session.cjs`
  gained `--out`, probe S14 (101-107) green.
   NOTE 2026-09-16 (worker-10, plan7/iter7): node-resolution fix landed (commit
   9fd7557) — the dump hook spawns via `resolveNodeExe()` (the live host's
   execPath is the CLI binary — the wrong spawn failed every dump with a
   WARNING); live acceptance still pending the host restart.
   History: APPROVED + BUILDABLE (maintainer ruling 2026-09-15, direct session:
  "todo 55 can be done and will be activated before the next autorun"); NOTE
  2026-09-15: the corpus `.opencode/archive/sessions/` was backfilled
  (137 sessions).
   NOTE 2026-09-16 (plan1): his approval comment on this entry handled — the
   approval is recorded in the entry history + `priority.md` (#55 approved
   block); the approved follow-up improvements (count-aware dump,
   provider/model fallback, reworded params) are queued in the NAP.

## 54. (closed 2026-09-16, plan8 planner-direct; maintainer call 2026-09-12) — Rule: never circumvent access restrictions; blocked-file protocol for agents

- **Problem / evidence:** worker_Q4_120K (attention-keywords task, 2026-09-12) had no
  edit access to `.opencode/agent/prompts/**` (opencode.jsonc edit-deny) and tried to
  circumvent via bash; task cancelled by the maintainer before anything landed.
- **Desired outcome:** the rule is codified in the role prompts: (1) an agent NEVER
  circumvents access restrictions (no bash/write workarounds around edit-denies);
  (2) when blocked on a file the task needs: do the work as far as possible and note
  the block in `handover_task_to_planner.md`, OR — if the blocked files ARE the main
  body of the work — close the session and report the fact back (no partial hacks).
- **Acceptance criteria:** the rule present in `prompt_agent_task.md` (honesty guard /
  work loop) and in the planner's delegation section; grep-verifiable; zero
  circumvention attempts in subsequent loop logs.
- **Suggested scope:** `prompt_agent_task.md`, `prompt_agent_planner.md`, possibly
  AGENTS.md (maintainer's call — it is his file).
- **Status:** CLOSED (2026-09-16, plan8 planner-direct, approved 2026-09-15) —
  the no-circumvent rule is codified in all three role prompts:
  `prompt_agent_task.md` + `prompt_agent_explorer.md` (§Honesty guard) +
  `prompt_agent_planner.md` (§Delegate vs. do) — grep-verifiable
  (`rg -n circumvent .opencode/agent/prompts/agents/` → 5 hits).

## 65. (closed 2026-09-17, maintainer-ruled — NOT a tool bug, see todo_records.md for the full entry if needed) — loop_log tool folder-detection bug: spurious folders on the maintainer-renamed loop folder (2026-09-16, plan2)
- **Problem / evidence:** the `loop_log` tool did not recognize the
  maintainer-renamed folder `autorun_2-6_0-9_1-6__1-3_3-3` and created TWO
  spurious date-stamped folders in one iteration (autorun-2026-09-16_16-15
  [looprunner INFO], autorun-2026-09-16_17-20 [worker-13 START+DONE]); the
  planner consolidated the lines into the real loop_log.md and deleted the
  folders by hand (twice).
- **Outcome:** folder detection accepts the current loop folder even when its
  name does not match the date pattern (e.g. latest subfolder of
  `.opencode/loop/` carrying a `loop_log.md`; refuse to create a second
  candidate when one already exists).
- **Acceptance:** a `loop_log` call in a renamed folder appends to THAT
  folder's loop_log.md; no spurious folder on the next looprun; probe/smoke
  green.
- **Scope:** `.opencode/tools/loop_log.ts` (+ its smoke if any). Restart-gated.
- **Status:** CLOSED 2026-09-17 (maintainer-ruled, direct session): the cause
  was the maintainer HIMSELF — he had been testing another date format on the
  autorun folder to reduce bitdrift, which the tool's date-pattern detection
  did not recognize. He re-unified both folders into the old date style and
  changed the minute value to remove the previously observed 3→5 bitdrift. No
  tool change needed; the "spurious folder" events were expected behavior on
  a non-matching folder name.

## 51. (closed 2026-09-16, plan8; 2026-09-11, T3 worker flag) — Stale probe header vs `.opencode/package.json` "type" field

- **Problem / evidence:** the probe "WHY THAT COMMAND" block
  (`handover_probe.mjs` ≈28) says `.opencode/package.json` "has no 'type'
  field and must not gain one — that would change the plugin's module
  context", but the file NOW carries `"type": "module"` (+ the
  `@opencode-ai/plugin` dep) — verified 2026-09-11.
- **Outcome (goal):** ruling — is `type: module` the intended current
  state? (header then corrected) or does the constraint still bind (field
  removed)?
- **Acceptance:** header and package.json agree; probe green.
- **Scope:** the probe header (comment), `.opencode/package.json`.
- **Status:** CLOSED (2026-09-16, plan8) — the stale `"type": "module"` field
  removed from `.opencode/package.json` per his ruling; probe header and file now
  agree (the expected `MODULE_TYPELESS_PACKAGE_JSON` warning is the pinned
  post-state, header line ~45); gate green (probe 120+2/120+2 machine-verified
  against the header annotation, pytest 459+1w, ruff F=0, all 7 smokes). Left
  untouched (out of scope for his ruling): the `@opencode-ai/plugin` dep and the
  stale `opencode-context-meter` package name — his call at the next restart if
  opencode says anything.

## 75. (open, 2026-09-21, planner) — **Build our own auto-resume plugin** — unit history (full text moved from TODO.md, 2026-09-23 curation):
the looprunner is a mechanical relay; the maintainer wants infinite direct
planner sessions (his ideas.md item 2026-09-18). Three measured gaps: no
auto-resume after compaction, no auto compaction trigger on context limit, no
auto-restart on `action: restart`. A working reference exists and is
vendored in-repo (opencode-auto-resume v1.1.16, v1-era API surface, verified
compatible with our opencode-ai@1.18.31). — **Desired outcome:** a plugin in
`.opencode/plugin/` that keeps a direct planner session running through
compaction and restart without the looprunner. — **Acceptance criteria:** the
four-unit acceptance list in `proposals/2026-09-21_opencode-auto-resume-plugin.md`
(unit 1 = skeleton logging plugin/testbed; unit 2 = context-limit compaction
trigger; unit 3 = auto-resume after compaction; unit 4 = restart detection +
new planner; each unit leaves the repo green). — **Suggested scope:**
`.opencode/plugin/auto_resume.ts` (new), `knowledge/opencode-plugins/`
(surface report append), the proposal file itself. — Units are independently
approvable, strict build order, unit 1 launchable on approval. **Status 2026-09-21:** Unit 1
LANDED + planner-verified (worker d322927, gate green: smoke 14/14, probe
235/235, pytest 459+1w, ruff F=0); LIVE ACCEPTANCE PASSED same day (post-restart:
the init `surface=` line + 12,629 live event lines in
`.opencode/temp/auto_resume.log`; verdict in the unit-1 surface report).
Unit 2 LANDED + planner-verified (2026-09-21, plan2, worker
`worker_Q3S_160K` ses_f3b8c19e9ffe2IoV4S9lrx0vSi, code `d90973b`): the
context-limit compaction trigger — queued `promptAsync` self-compact
instruction (`compact_memory` SELF path) at ratio >= 0.85 of the usable
window, once per busy cycle, one 5s tick as the sole gated send funnel
(smoke 32/32 all 7 DoD cases pinned; gate re-verified by the planner:
probe 235/235, pytest 459+1w, ruff F=0). Three spec-vs-reality
discrepancies resolved defensively (SDK `provider.list()` not `get()`;
model pair top-level on the message, not `info.model`; smoke live-log
invariant) — facts cured into the unit-1 surface report §UNIT 2 supplement.
LIVE ACCEPTANCE for Unit 2: the shape bug was FOUND in live acceptance
(the live `session.status` carries `status` as OBJECT `{type}` while
`armEvent` compared strings → zero `arm=`/`saturation=`/`trigger=` lines
in the whole log) and FIXED this commit (`statusOf()` normalization +
dual-shape smoke pin; verdict in the unit-1 surface report
§LIVE ACCEPTANCE supplement). Live re-acceptance PENDING the next host
restart (a live session crossing 85 % must self-compact once per busy
cycle, no re-prefill stall — verified from
`arm=`/`saturation=`/`trigger=` log lines). PARTIAL LIVE VERDICT (plan6,
2026-09-21 post-restart): the `arm=` lines ARE live (6 for the planner
session — the statusOf shape fix works; the trigger side still unproven —
no live session crossed 85 % this looprun; saturation/trigger pending a
natural crossing). Unit 3 LANDED + smoke-verified
(2026-09-21, plan3, worker
`worker_Q3S_160K` ses_f3b555033ffem2gI9qBct1JZwG, the single UNIT 3 commit
on `opencode_test` — see the committed handover summary): the new-planner
spawn helper — the 5s tick (the only decision+send funnel; events stay
ARM-only) checks the one-shot trigger file
`.opencode/temp/auto_resume_spawn_trigger` (same dir as the log); a
present non-empty trigger spawns ONCE (in-flight latch — no double-fire),
then the file is renamed `.consumed` EVEN ON FAILURE (re-trigger = write
a new file); the spawn = `create()` (no args) + ONE QUEUED `promptAsync`
with `agent: "planner_Q3S_160K"` and NO model field (the agent-configured
model applies — the host's opencode.jsonc is the live source of truth,
re-verified at build time: no drift); success → the new sid self-marked
in a module-level `spawned` map (sid → epoch, for Unit 4) + `spawn=`
line; every failure → `spawn-fail=` line, the helper never throws
outward; `create` added to the init surface candidates (the live typeof
verdict is pending for the surface-report supplement). Smoke 39/39 (32
existing + 7 new UNIT 3 checks; surface pin updated to carry create);
gate: probe 235/235 UNCHANGED, pytest 459+1w, ruff F=0 (one pre-existing
red smoke OUT OF SCOPE: block_transfer.sandbox stale description pin —
todo_inbox entry 2026-09-21). LIVE ACCEPTANCE for Unit 3 PASSED (planner-run 2026-09-21 17:00Z: the
one-shot trigger file → `spawn= sid=ses_f3b16aa46ffe07iI4CSrScxeWK
agent=planner_Q3S_160K` (log line 163103) + `.consumed` rename + the
spawned session wrote
`.opencode/temp/auto_resume_unit3_live_acceptance.txt`; verdict in the
unit-1 surface report §LIVE ACCEPTANCE supplement). Unit 4 LANDED +
smoke-verified (2026-09-21, plan4, worker-5 `worker_Q3S_160K`
ses_f3af705fdffeRiYr9H7FflN0o7): the planner liveness watchdog — a
planner-scoped session (Unit 3 `spawned` self-mark OR a `<|autonom|>`
launch marker in a user message; cached `scope: planner|none|unknown`)
going idle / `session.error` is routed on the next tick by the LAST
assistant message's `action:` line (last match wins): `stop` /
`ask_maintainer` → left alone (`route= stop|ask`); `resume` / no line →
queued CONTINUE prompt (recovery cap 2 per idle cycle, reset on a fresh
busy, `recovery= attempt=N`); `restart` / cap exhausted with still no
line → successor check (`session.created` tracked since
lastActivityAt → `skip= successor`) else `spawnPlanner` (RESTART
prompt, `route= restart spawn`); one `err=` line per failed cycle per
sid; the tick never rejects. `messages` added to the init surface
candidates (live typeof verdict pending the next restart). Smoke
53/53 (40 existing + 13 new UNIT 4 checks); gate: probe 235/235,
pytest 459+1w, ruff F=0; full smoke suite green (10/10). LIVE
 ACCEPTANCE PENDING the next host restart (the four acceptance cases in
 the proposal lines 138-142). NOTE: unit numbering
 per the revised proposal — Unit 3 = new-planner spawn helper (shared
 building block), Unit 4 = planner liveness watchdog (auto-resume after
 compaction is its first branch); the "unit 3 = auto-resume / unit 4 =
 restart detection" wording above is the pre-revision numbering.

## 2026-09-23 (plan10, planner-10) — full text of closed entries #68, #69, #71, #73 and #79 (moved from TODO.md; #68/#69/#71/#73 deferred from the 2026-09-23_02-51 curation, #79 closed by the plan10 live acceptance):

## 68. (CLOSED 2026-09-16 — R2 approved + landed) — Write-scope fuzzy (step 2 of the Q3 roadmap)
- **Problem / evidence:** maintainer ruling (addendum Q3, 2026-09-16): read
  AND write scope, one step after the other — "too useful to degrade to
  observer permanently". Write-scope needs the mutation-channel verdict
  (#66) AND its own approval (write-scope fuzzy on edit/write/delete is a
  data-loss hazard per research §2.3 — the existence-gate + correction-log
  discipline of §4.2 must be specced).
- **Outcome:** spec for write-scope resolution (scope rule, existence gate,
  correction log, fail-closed) → maintainer approval → build.
- **Acceptance:** approved spec + landed build + gate green (per spec).
- **Scope:** research doc §2.3/§3.4/§4.2 as the design source; staged spec
  `research/fuzzy-numword/spec_R2_write_scope.md`.
- **Status:** CLOSED 2026-09-16 — approved ("R2 approved") + build landed
 GREEN (35f8143: probe 206/206 S20, smoke 35/35 8f, pytest 459, ruff
 clean); acceptance met per spec. Deviation accepted: ref gate =
 `for-each-ref` membership (rev-parse 40-hex ambiguity measured,
 decision-record §5). **ONE-SHOT ACCEPTANCE MET 2026-09-17** (direct
 session, post-restart): write-scope LIVE — benign mistype corrected
 (`file-for→file-four d=1 gap=2`) AND the #72 hazard live-measured
 (`file-5→file-4 d=1 gap=3` hijack); display finding: tool results show
 the POST-MUTATION path (log field 5 = sole authority — decision-record
 §5 R2). Residual hazard → #72 (M1 ruling recorded).

## 69. (CLOSED 2026-09-16 — AGENTS.md paste, acceptance fully met) — Redundancy form codification: `[left:right]` (SUPERSEDES the `<4|four>` Q2 form)
- **Problem / evidence:** the addendum Q2 form `<4|four>` (angle brackets +
  pipe) was REJECTED by measurement 2026-09-16 (direct session): unquoted
  in Git-Bash, `<...>` = syntax error (exit 2) and `|` = pipe break (exit
 127) — both measured; `[left:right]` survives (exit 0) with one known
  glob edge (single-char cwd file) mitigated by a quote-when-bash rule.
  Full table + reasoning: `research/fuzzy-numword/decision-record.md` §2.4.
  His FB grammar comments (`<8-6-1>` fallback, adder-left `[800+50+11:…]`,
  right-wins, "to be discussed in direct session") were DISCUSSED and
  ruled: single-digit dash form recommended, full map = accepted fallback,
  pair-left ∈ {as-seen | adder | numword}, right = numword, right-wins.
- **Outcome:** codify the convention where it survives compaction of ANY
  agent: (a) AGENTS.md — maintainer PASTE (draft in decision-record §4,
  his action); (b) the observer form switch + read-scope resolution =
  spec_R1 (launch-ready); (c) role-prompt pointer lines (planner-direct or
  planner-as-text-worker, after R1 — worker edit-deny on prompts/).
- **Acceptance:** his AGENTS.md paste landed + R1 green + pointer lines in
  planner/worker/looprunner prompts.
- **Scope:** AGENTS.md (maintainer), spec_R1 build, `prompt_agent_*.md`
  pointer lines.
- **Status:** CLOSED 2026-09-16 — acceptance fully met: AGENTS.md paste
  landed (bf18f14); R1 GREEN (96bb173, probe 193/193); pointer lines in
  planner+worker prompt index (3e0406c). NOTE: ALL FB-file comments are
  acted on and recorded in the decision record (§6.5) — do not re-act the
  `--comment` markers there (they are his input record).

## 71. (CLOSED 2026-09-17, planner-direct) — Stale probe totals in repo_commands.md (maintainer file)
- **Problem / evidence:** `repo_commands.md` §Run/test still quotes "~376"
  and "one hundred twenty-two (plan7…)" — mutually inconsistent stale
  numbers; the declared source (the probe's self-annotation) is 180/180
  (plan2). Worker-13 flagged; the file is maintainer-maintained (agents do
  not edit the repo parts directly).
- **Outcome:** refresh the section to the curate-don't-duplicate pointer
  (per #64 convention: point at the self-annotation, no moving number).
- **Acceptance:** section reads the pointer; no duplicated total.
- **Scope:** `repo_commands.md` §Run/test (maintainer or an explicitly
  tasked agent).
- **Status:** CLOSED (2026-09-17, planner-direct — maintainer ruled the
  planner is allowed to update this file): §Run/test now carries the
  curate-don't-duplicate pointer (no duplicated moving number at all — the
  probe's self-annotation is the sole source), per the #58/#64 convention.

## #73. (LANDED 2026-09-17, planner-verified) — R7 realistic doubled case: the segment channel's gap rule fails

## when the target's parent DIR is a corpus entry (measured 09-17)
- **Problem + evidence:** the shipped R7 (ee19a84; gates 216/216 + 37/37
 green) does NOT resolve the realistic nested doubling. Repro
 (scratchpad `r7_realistic_repro.mjs`, still there): repo
 `Projects/OpenCodeProjects/{Free-Snap-Tap/TODO.md, SiblingProj/…}` +
 doubled arg `…/OpenCodeProjects/OpenCodeProjects/Free-Snap-Tap/TODO.md`
 → `fuzzy-rejected` for read AND edit. Root cause: the corpus (built
 from the nearest existing ancestor) contains the target's parent DIR
 entry at seg-d=2; the target sits at seg-d=1 → gap 1 <
 FUZZY_MIN_GAP=2 → `gap-too-small`. S21 pins 210/211 pass only because
 their fixture corpus is FLAT files (second-best at seg-d=3) — the
 pin-fixture design gap is the planner's (spec'd the shapes, not the
 corpus realism).
- **Desired outcome:** the doubled-folder case (the maintainer's most
 observed error) resolves at hook level in a real nested repo.
- **Design (planner 09-17):** a STRUCTURAL pre-check before corpus
 matching in `runFuzzyRead`/`runFuzzyWrite`: if the arg's segments
 contain an adjacent identical pair (case-insensitive), collapse one
 copy; the collapsed path must EXIST (strict gate, no corpus, no gap
 rule) → resolve; else fail-closed and fall through to the existing
 matchers. Verdict reuses `fuzzy-resolved` with a `kind=dedup` evidence
 flag (9-verdict vocabulary untouched; `write` stays M1-excluded).
 S21 gains the REALISTIC nested fixture pin (parent-dir corpus entry +
 sibling project) for read + edit + write-zero-lines.
- **Acceptance:** the 3 repro cases behave per the design (read/edit
 resolved, write zero lines); new S21 realistic pin green; full gate
 green; repro torn down.
- **Suggested scope:** `intercept_observer_core.ts` (the collapse
 helper), `intercept_observer.ts` (pre-check in both fuzzy runners),
 the S21 section.
- **Status:** LANDED + planner-verified (2026-09-17, ses_f510a…, code
 dce82ad, bookkeeping 9c701ed): the `collapseAdjacentDup` existence-gated
 pre-check in `runFuzzyRead`/`runFuzzyWrite` (BEFORE the seg/char matchers)
 resolves the realistic nested doubling with a `kind=dedup` evidence line
 (d=0, no gap); a doubled `write` stays ZERO lines (M1 extends to the dedup).
 Gate: probe two-one-six → two-two-zero (216), smoke 37/37, pytest 459+1w,
 ruff F=0; S21 8 → 12 (re-pins 210/211 + smoke 8g to kind=dedup, 4 new pins
 218 read / 219 edit / 220 collapse-target-absent stays rejected / 21 write
 zero-lines + realistic-nested fixture). Repro torn down. **LIVE ACCEPTED
 (2026-09-17, ses_f4f539d7c… post-restart one-shot, scratchpad fixture, torn
 down):** doubled nested `read` resolved `kind=dedup scope=read d=0` (log
 `orig=` doubled → corrected, file content returned); doubled `edit` resolved
 `kind=dedup scope=write d=0` (applied to the real file). Doubled `write`
 NOT live-proven via the planner's own emission — 5/5 attempts collapsed the
 doubled segment at emission (log-verified `orig=` single each time; the
 single writes landed literal + zero lines, M1 guard held). Hook-level
 doubled-write coverage stands on pins 21/218–220 (same runner as the
 live-proven edit path — the guard is the shared dispatch condition).
 Emission data point: the collapse bias is STRONGEST on write calls
 (read doubled 1st try, edit 3rd, write 5/5 collapsed).

## 79. (open — LANDED 2026-09-22, live acceptance pending; 2026-09-21, planner; HIGH — live, measured) — auto_resume Unit 4 `msgPairs` never unwraps the SDK `{ data }` wrapper → action lines are NEVER recognized (spurious recovery prompts / context drain)
- **Problem / evidence (measured live, plan6, 2026-09-21):** after closing TWO consecutive turns each ending in a valid `action: restart`, `auto_resume.log` shows two `recovery= … attempt=1` lines (the counter RESET between them — `armEvent` busy resets `recoveryCount` at line 679 on every busy cycle) and `route=` count = **0** across the whole looprun — i.e. NO action line was ever recognized.
- **Root cause:** `auto_resume.ts` line 492 `msgPairs(msgs) = Array.isArray(msgs) ? msgs : []`. But `sess.messages()` (line 567) returns the SDK `RequestResult` wrapper `{ data: [...] }`, never a bare array — so `msgPairs` always returns `[]` → `lastAssistantAction` (line 518) always returns null → `userHasMarker` (line 505) always returns false. **Same root cause as the `compact_memory` `resolveModel` bug fixed in 280b8d0 — NOT covered in auto_resume.**
- **Consequence:** Unit 4 can never read restart/resume/stop/ask_maintainer → always the recovery branch; since `recoveryCount` resets on every busy cycle, the cap (2) is never reached → a FINISHED session gets re-woken with spurious recovery prompts (context drain). The loop itself still progresses via the **looprunner** (a separate mechanism with correct parsing) — the auto-resume plugin's own routing is broken.
- **Desired outcome:** the messages-RPC result is unwrapped (bare array + `{ data }` wrapper) at the single `msgPairs` site, so Unit 4 routing reads action lines correctly: stop/ask → no send (`route= stop|ask`); resume/null → bounded recovery; restart → `route= restart spawn`.
- **Acceptance:** a planner closing `action: restart` produces `route= restart spawn` (not a recovery prompt); `action: stop` → `route= stop`, no send; a smoke case pins the wrapper shape; standard gate green (smoke + probe + pytest + ruff).
- **Suggested scope:** `.opencode/plugin/auto_resume.ts` (`msgPairs` line 492 — the single consumer fix; verify no other messages-RPC site), `.opencode/plugin/tests/auto_resume.smoke.mjs` (add a wrapper-shape case), probe pins.
  - **Status:** LANDED + planner-verified (2026-09-22, plan7, worker-11
    `worker_Q3S_110K_mtp` ses_f39eef70effefmk8Bt598jhqwK, code `eaef397`):
    the dual-shape unwrap in `msgPairs` (bare array + `{ data }` wrapper —
    the same normalization as 280b8d0) + the `ses_u4_wrap` wrapper-shape
    smoke case (smoke 63/63, probe 241/241, pytest 459+1w, ruff F=0). LIVE
    ACCEPTANCE pending the next host restart (the running host is pre-fix;
    the post-restart planner verifies `route=`/`skip=` lines for the
    planner-7 close from `auto_resume.log`). NOTE: an earlier plan6 INFO
    line attributed this to a "read-race" — that was WRONG; this shape bug
    is the real cause. **LIVE ACCEPTED 2026-09-23 (plan10):** `route= restart spawn`
    for planner-9's valid `action: restart` on both builds (12:52:39Z on
    v=24972ebd, 13:00:08Z on v=d2b9d510), no recovery= lines for the sid.

## 2026-09-23 (plan11, worker `worker_Q3S_170K`) — full text of closed entry #87 (subsumed by #90, moved from TODO.md):

## #87. (open — maintainer call) — Unit-4 cannot revive a dead self-spawned successor: the plugin-driven loop stalls (finding 2026-09-23, planner-8)
- **Problem + evidence:** `scopeVerdict`'s FIRST check is the `spawned`
  self-mark (`auto_resume.ts` L754; set in `spawnPlanner` L612; NO
  clear/expiration path) → any session the plugin spawned itself
  (Unit-3/4 `spawnPlanner`) is scope "none" — never recovered, never
  restart-spawned (#85 part-1 loop-prevention: "a freshly-spawned
  successor must not be re-triggered"). Measured live (2026-09-23):
  planner-8's session (ses_f33f1eb98ffeFvrnTdmTzmyE2x) was spawned by the
  Unit-4 RESTART branch (log `spawn=` 02:17:49Z; its first user message
  is the locked restartText); it went idle 3× — once after a self-
  compaction close WITHOUT an action line — and the plugin never routed
  it (log: `scope= none` 03:00:03Z; no `recovery=`/`route=` lines for the
  sid). Consequence: the L3 self-compaction continue protocol ("the
  looprunner RESUMEs via task_id") has no live looprunner in
  plugin-driven mode — only a maintainer message rescued the session.
  NOTE: a toggle in a maintainer message (`<|Autorun|>`) does NOT re-scope
  a self-spawned session (the spawned check precedes the toggle check).
- **Desired outcome:** his ruling on dead-successor semantics (options
  below); then spec + landing.
- **Options (his ruling):** (a) keep the stall — a dead loop is visible,
  he restarts (no code); (b) bounded restart-spawn of a dead self-spawned
  successor (e.g. ONE re-spawn per successor, or only if the session made
  a committed progress since spawn — preserving #85's loop prevention);
  (c) keep the looprunner in the loop after a plugin spawn (hand off to
  the looprunner instead of self-spawning — it already has
  resume-from-death semantics); (d) re-arm on a fresh busy after
  compaction (clear the spawned mark on the self-spawned session's first
  busy — revives L3 continuation; risks the #85 loop unless bounded).
- **Acceptance:** ruling recorded; spec written; the behavior change is
  approved BEFORE implementation (observable behavior).
- **Status:** open — maintainer call (he is AFK; recorded for the next
  direct session).
- **Closed:** 2026-09-23 — SUBSUMED by #90 (the approved proposal, Parts
  A+B+C). Part A removes the `spawned` exclusion so the self-spawned
  successor is now TRACKED (its first user message is the RESTART prompt,
  line 1 = the exact own-line toggle → scope "autorun") and is RECOVERED
  after an idle without an action line (the #87 stall case, inverted);
  option (b)'s "committed progress" idea is replaced by the LINEAGE-DEPTH
  cap (N=2) on the spawn branch. Options (a)/(c)/(d) are superseded.

## 80. (open — fix LANDED 2026-09-22 + plugin reactivated, live acceptance (b) verified, close pending maintainer confirm; 2026-09-22, planner; HIGH) auto_resume inject calls lose the session agent → turns run as "build"
- **Problem + evidence:** the Unit 2 (L387) + Unit 4 (L643) `promptAsync`
  calls in `.opencode/plugin/deactivated/auto_resume.ts` send NO `agent`
  field (the Unit 3 spawn does, L432). opencode's prompt path defaults a
  missing agent to "build" → the injected turn runs as Build (DB, 2026-09-22
  direct session ses_f39d250e9ffeheip2FVEeY5Fk6: injected user msgs + the
  following assistant turns carry agent=build/mode=build, 23:58 ×4;
  planner-6's session record agent=build). Impact: per-injected-turn
  system-prompt change → whole prompt-cache invalidation + the planner loses
  its system prompt (the planner-worker workflow is broken for those turns).
- **Related open anomaly:** unit 4 acted on a direct (non-autorun) session
  despite the scope=none fail-safe (5× `recovery= attempt=1`; the cap resets
  on each injected busy → unreachable as-is). NO user text part of that
  session carries `<|autonom|>` (all 15 checked) and the spawned map never
  held it. Maintainer 2026-09-22: the 5 injections = his 4 interrupt
  attempts + 1 initial — he tried to interrupt 4 times, then exited
  opencode; NO scope-logic edits. The scope verdict is single (L614:
  `spawned.has` || `userHasMarker`; the spawned-map population path is
  untraced — likely a Map) → verify at fix time. Resolve before
  re-activation (suggested: a version hash in the `surface=` line).
- **Desired outcome:** injected messages preserve the session's agent (cache
  warm, role prompt intact); a direct session ends idle untouched.
- **Acceptance criteria:** (a) the unit 2/4 `promptAsync` body carries an
  explicit agent — scoped sessions: the spawn-side `PLANNER_AGENT_ID`; other
  sessions: the first user message's agent from the existing `messages()`
  fetch (`session.agent` is UNRELIABLE — it tracks the LAST prompt; proven
  lock-in to "build" on planner-6); (b) live (post re-activation): the
  injected message + turn show the session's original agent in the DB and
  cache-read tokens stay high (no full re-prefill); (c) a direct session ends
  idle with no recovery/trigger injection.
- **Open design questions (maintainer, undecided):** recovery-cap semantics
  (reset-on-busy makes the cap unreachable while the plugin keeps injecting);
  direct session = new "autorun" entry with direct interaction (his
  stop/interrupt + `ask_maintainer` must stop the loop — NEW (his idea
  2026-09-22): an `ask_maintainer` timer, e.g. 5 min — if he is not
  available, the loop/autorun resumes after the timeout); planner
  compaction budget exhaustion (keep=0 + same-session resume + budget reset
  vs. higher cap — bit-rot risk).
- **Status:** implementation LANDED (4098253, worker-2
  ses_f371e0e23ffe0eza71uD5qWy7K); plugin REACTIVATED 2026-09-22
  (380e326) — live gen `surface= v=0bb5c46f` hash-verified byte-identical
  to the #80-fixed build; **(b) VERIFIED LIVE 2026-09-22 12:33:18Z
  (DB): both the unit-2 + unit-4 injections carry
  agent=planner_Q3S_160K (pre-fix behavior: agent=build) and the
  following assistant turn does too — injected turns keep the session
  agent; (c) now gated on #82 (his marker-quote message flipped the
  scope live — a design gap, not a fix failure); close pending his
  confirm. Gate note: probe 240/241 — check [97] pre-existing red
  (maintainer temp fix 0f192e5) → #81. **Close ruling 2026-09-23 (planner-12 direct): close YES once #91 + #82 have landed** (his reply to the confirm request). (c) live evidence now also covers the post-#90 build: the Direct session ses_f3144d9d6… was judged scope=none at 17:08:57Z and went idle untouched (zero recovery/route/spawn lines) under the new build ef8c6149.
  History: investigated 2026-09-22
  (planner, direct session); FIX DESIGN APPROVED by the maintainer
  2026-09-22; plugin DEACTIVATED (a000dfd). Item-3 scope anomaly: H1
  REFUTED 2026-09-22 (DB check — none of the session's 44 user-role parts,
  every part type, contains `<|autonom|>`); H2 (running variant ≠ committed
  file) leading; the new `scope=` verdict log line + `surface=` v= version
  ID will pin verdict + code state on the next incident.
- **Suggested scope:** `.opencode/plugin/deactivated/auto_resume.ts` (L387,
  L643; scope scan L543-551).
- **Closed:** 2026-09-23 — maintainer confirm (planner-12 direct session: "close YES once #91 + #82 have landed"); both landed (#91: 2fa4bb6; #82's unit-2 part = the already-landed #85 p3 Direct-gate behavior, his ruling recorded in #82). (c) live-verified under the post-#90 build (the Direct session idle-untouched, scope=none 17:08:57Z).

## 81. (open — re-pin LANDED 2026-09-22 (af38e2f), gate green; maintainer call — close pending his confirm; 2026-09-22, worker-2 via inbox) probe [97] + compact_memory smoke pin red since temp fix 0f192e5
- **Problem + evidence:** `handover_probe.mjs` check [97] (unit A: "exactly
  ONE queued promptAsync carrying the text part") and the matching
  `compact_memory.smoke.mjs` message pin FAIL at HEAD (probe 240/241, only
  [97] red; the smoke: 1 FAIL, everything else pass). Pre-existing — NOT
  the #80 work (the probe does not load auto_resume.ts): the maintainer's
  temp fix `0f192e5` (2026-09-22) commented out the `promptAsync` call in
  `compact_memory.ts` `queueMessage` (to stop the queued-message race — the
  SELF compaction incident); the pins still expect the pre-fix behavior.
- **Desired outcome:** the gate green again — either re-pin probe [97] +
  the smoke to the temp-fix behavior (no queued promptAsync; the queued-note
  line is still emitted), or re-pin them when the compact_memory message
  feature gets its proper fix.
- **Acceptance criteria:** probe 241/241 + `compact_memory.smoke.mjs`
  green; TODO #80's live acceptance then re-runnable against a full-green
  gate.
- **Suggested scope:** `.opencode/plugin/probes/handover_probe.mjs` (check
  [97]), `.opencode/plugin/tests/compact_memory.smoke.mjs`;
  `compact_memory.ts` only if the message path is restored.
- **Status:** LANDED 2026-09-22 (af38e2f, worker_Q3S_160K — the planner records
  ses_f36d1ca53ffe0GXACaVwW9iCJO — planner re-verified: probe 241/241, smoke 53/53, pytest 459+1w, ruff F=0; hash recorded in the planner's bookkeeping commit, #80 precedent) — re-pinned per the ruling (NOT
  deactivated/skipped, promptAsync NOT restored): probe [97] + the smoke
  message pin now assert the temp-fix behavior (dispatch line + the
  queued note byte-exact, NO queued promptAsync); gate green: probe
  241/241 (header total agrees), smoke 53/53, pytest 459 passed +
  1 warning, ruff F=0.
- **Closed:** 2026-09-23 — maintainer confirm (planner-12 direct session); gate green since af38e2f (probe 241/241, smoke 53/53, pytest 459+1w, ruff F=0).

## 53. Agent-feedback protocol: mandatory close-down step + small write-tool (DEFERRED 2026-09-12, **DEFERRAL LIFTED 2026-09-17** — direct session; maintainer: "it did not even know anymore that i deferred it") — the optional `agent_feedback.md` entries get discarded by the early-close-at-stop-line discipline; make it a NON-optional part of the close-down phase (directly before the closing message), full date_time on each entry, and a small tool that writes the entry (no file fiddling / accidental reads). **Proposal FILED 2026-09-17** (`proposals/2026-09-17_agent-feedback-closedown.md` —
Part A: mandatory close-down prompt step, full date_time auto-stamped; Part B:
unified `submit` tool per his #5 sketch; recommendation: both as one unit)
— **ruled 2026-09-17: approved both parts in one unit**.
**Status 2026-09-18 (plan1, looprun 2026-09-17_23-58):** Part A LANDED
(5e29cb0 — friction close-down step in all 4 role prompts) + Part B LANDED
(b83b34f — `submit` tool + 20/20 smoke + probe S23 pin; gate re-verified
green by planner: probe annotation-agree, all 9 smokes, pytest 459+1w,
ruff F=0). REMAINING (maintainer domain): registration in live
`opencode.jsonc` + per-agent tool grant at restart; live acceptance after
restart. **Status 2026-09-18 (plan2/iter2):** maintainer inbox instruction
(session/role autofill) LANDED (86a977f — `submit` derives role from
context.agent / session from context.sessionID; role+session REMOVED from the
args schema; smoke 20/20 + probe S23 re-pinned to 3 args + context stamps;
gate green: probe two-two-nine (2-2-9) annotation-agree [worker's "239/239"
was a dense-numeral drift — the planner's re-run measured 2-2-9], all 9
smokes, pytest 459+1w, ruff F=0).
- **Closed:** 2026-09-23 (planner-13) — the maintainer-domain tail is done (`submit` registered live in the role toolsets; the AGENTS.md paste LANDED 2026-09-18; machine-stamped entries firing in live sessions since) — full text to todo_records.md.

## 66. 5.3+5.4 restart acceptance (open — PENDING RESTART, 2026-09-16 direct session)
- **Problem / evidence:** the observer plugin failed to LOAD on the first
  live check ("Plugin export is not a function" — fixed by the core split,
  `4719cc5`); the read-scope mutation channel (5.4 one-shot) is still
  unproven. No `.opencode/temp/intercept.log` exists yet.
- **Outcome:** at the next restart: (1) first `intercept.log` lines appear
  (dense/numword/dense-date triggers — any session with dense args);
  (2) the mutation-channel verdict: read the scratchpad sentinel
  `home/AppData/Local/Temp/opencode/fuzzy_accept/file-four.txt`
  via a d<=2 mistyped path → if the tool result is the TWIN content
  (`file-4.txt`) AND a `fuzzy-resolved` line is logged → mutation channel
  LIVE (write-scope #68 unblocked); else NOT live (5.3 stays log-only,
  redundancy-naming route #69 becomes primary). Record the verdict in
  TODO + the research doc; then tear down the sentinel per §5.4.
- **Acceptance:** verdict line in TODO.md + one line in the research doc
  dated section; fixture state noted.
- **Scope:** none (read the log + one controlled read) — planner at the
  restart.
- **Status:** PENDING RESTART (stale — resolved by #68's live acceptance 2026-09-17).
- **Closed:** 2026-09-23 (planner-13) — the read-scope mutation channel was proven LIVE by #68's one-shot live-acceptance (benign mistype corrected + `fuzzy-resolved` logged); the §5.4 sentinel torn down (the scratchpad `fuzzy_accept/` folder no longer exists); intercept.log accumulated to 3076 lines / 139 sessions by 2026-09-23 — full text to todo_records.md.

## 82. (open — scope-toggle LANDED 2026-09-22 via #85 part 1; live acceptance + unit-2 suppression question pending; 2026-09-22, planner live; HIGH) scope verdict: last-toggle-wins over user history, own-line anchor, bidirectional (on/off markers)
- **Problem + evidence:** live incident 2026-09-22T12:33:18Z (gen
  v=0bb5c46f — the verified #80-fixed build, post-380e326 re-activation):
  unit 4 injected a recovery prompt into the direct (no-launch) session
  ses_f39d250e9ffeheip2FVEeY5Fk6. Log: `scope= planner sid=…` →
  `recovery= attempt=1` → `arm= … injected` (the cap fix worked — the
  injected busy was consumed, no reset). CAUSE identified live: the
  maintainer's clarifying-question message contained the literal
  `<|autonom|>` (a user text part) — `userHasMarker` scans ALL user
  parts, so any later user message quoting the marker flips a direct
  session to scope=planner. (The original 2026-09-21 incident — 9×
  recovery with NO user marker in history at the time — remains H2,
  runtime-shape, unresolved.)
- **Desired outcome (his ruling 2026-09-22 — SUPERSEDES the
  first-message-only proposal):** scope is re-evaluated on EVERY new
  user message — LAST TOGGLE WINS over the user history (restart-safe:
  the same scan derives the state after a process restart). Toggle
  markers count ONLY on their own line (message-start anchors ruled
  out — the injected `ctx:` gauge line always prefixes the message, so
   the marker never sits at the start). ON: `<|autonom|>` (the existing
   launch marker) AND `<|Autorun|>` — CONFIRMED 2026-09-22: both count as
   ON, CASE-INSENSITIVE (his original german wordplay was `autonom`; both
   spellings stick); OFF: `<|Direct|>` (case-insensitive). Bidirectional:
   he can deactivate AND reactivate mid-session without starting a new
   session (context preservation — his stated motivation).
- **Acceptance criteria:** own-line match only (mid-sentence or
  bullet-prefixed markers never toggle); smoke: (i) mid-sentence quote
  → scope unchanged; (ii) own-line `<|Direct|>` then own-line
  `<|autonom|>` → last wins (ON); (iii) restart derives the same state
  from history (no in-memory persistence). Live: his post-restart test
  on this session — under the CURRENT code (all-parts scan) autorun WILL
  re-engage (any quote counts); after #82 it must NOT (his message
  carries no own-line toggle). `route= stop` live-proven by this
  session's `action: stop` turns (#70 residue). OPEN (his call, after
  the 85%-trigger info given 2026-09-22): does OFF also suppress unit 2
  (context trigger) or only unit 4?
- **Suggested scope:** `userHasMarker` / scope verdict in
  `.opencode/plugin/auto_resume.ts` (L614, L543-551) + smoke section.
 - **Status:** design AGREED 2026-09-22 (his ruling on all open
   questions); the SCOPE-TOGGLE portion LANDED as part of #85 part 1
   (2026-09-22, worker worker_Q3S_170K — the last-toggle-wins own-line
   evaluation is in the auto_resume.ts scope verdict, and the smoke pins
   acceptance (i) mid-sentence quote, (ii) last-toggle-wins ON, plus the
   own-line/trim + case-insensitive rules and the restart-safe derivation);
   remaining: live acceptance (his post-restart test) + the unit-2-
   suppression question (his call after the 85%-trigger info). **Unit-2 suppression RULING 2026-09-23 (planner-12 direct): YES — Direct suppresses Unit 2** (his rationale: otherwise he would toggle autoCompact off in compact_budget.json and forget to re-enable it). That is ALREADY the landed behavior since #85 part 3 (the onToolAfterNudge verdict-none gate — the passive ctx-line nudge is Direct-gated; NO code change needed). Live evidence 2026-09-23: the Direct session ses_f3144d9d6… judged scope=none (17:08:57Z), idle-untouched under the post-#90 build. Remaining: the full post-restart live acceptance rides the #90 new-build spawn tail (the restartText line-1 own-line marker as a spawned successor's first message) — DONE 2026-09-23 (planner-13).
- **Closed:** 2026-09-23 (planner-13) — FULL live acceptance on the #90 spawn tail (build v=7d2e6207): the own-line `<|autonom|>` toggle judged `scope= autorun` (19:20:54Z) then `route= restart spawn` (19:20:55Z) then the successor's first message carries the exact own-line marker (the restartText line 1) + `deactivate=` on the trigger (idle-untouched afterwards); the unit-2 suppression ruling (Direct suppresses Unit 2) = the already-landed #85 part 3 behavior (no code change) — full text to todo_records.md.

## #90. (LANDED 2026-09-23, worker `worker_Q3S_170K`) - plugin-spawned successors inherit the trigger's Autorun state + the trigger deactivates (approved proposal Parts A+B+C): (A) the `spawned` self-mark EXCLUSION removed from `scopeVerdict` (now a 1-arg function of the messages only), the `spawned` map REPURPOSED as the LINEAGE-DEPTH map (sid→depth), `restartText()` LINE 1 = the exact own-line `<|autonom|>` (prose moved to line 2) so every restart-spawned successor derives scope "autorun" from its first user message ALONE (restart-safe — no in-memory state), and a LINEAGE-DEPTH CAP (N=2) on the restart/cap-exhaustion spawn branch REPLACES the #85 exclusion's loop guard (`skip= depth sid=` at depth≥2; a file-trigger spawn stays depth 0); (B) `spawnPlanner` RETURNS the new sid (null on every failure path — the `spawn-fail=` lines are unchanged), a SUCCESSFUL spawn STICKY-deactivates the TRIGGER (`deactivate= sid=` line; a failed spawn changes nothing) and `routeScopedIdle` skips the deactivated trigger right after the scope recompute (`skip= deactivated sid=` — no send, no re-spawn, the session stays manually usable); the flag records the trigger's user-message count at deactivation and clears ONLY on a NEW user message carrying an own-line ON toggle; (C) at init (the factory call) the plugin RESTORES the in-memory depth map + deactivation flags from its own `auto_resume.log` (each `route= restart spawn sid=X` line paired with the following `spawn= sid=Y` → deactivated(X) + depth(Y)=depth(X)+1; an unpaired `spawn=` → depth 0; once per process). Smoke re-pinned: auto_resume.smoke.mjs 118/118 (the old #85 spawned-exclusion pins flipped to the new behavior + the proposal's acceptance pins 1-7 added). Gate green: probe 241/241, all 10 smokes, pytest 459 passed + 1 warning, ruff F=0. SUBSUMES #87 (now closed). Commit **c4b244d** (planner-verified 2026-09-23: independent smoke re-run 118/118).
   **Live acceptance (2026-09-23, planner-12 direct ses_f3144d9d6…, post-restart):** the live build v=ef8c6149 IS the #90 build (sha256 prefix of the on-disk auto_resume.ts = the surface= v= line; process starts 16:32:37Z + 16:37:45Z, both after c4b244d 15:53:06Z). PART A verified by A/B contrast on the SAME successor session — the old build (d2b9d510) judged it scope=none (14:46:16Z, the spawn exclusion) vs the new build scope=autorun (16:37:07Z) + recovery= attempt=1 (the #87 stall case INVERTED: the successor is tracked + recoverable; the cap held at attempt=1). PART B/C verified — the new process's init log-restore (the old route= + spawn= pair) → zero re-routing/spawn against the trigger (planner-11) after the restart + zero spawn= lines in the new process (no unbounded loop; the trigger's own final close was correctly route= stop at 15:59:27Z under the old process). NOT YET exercised live by the new build: its own restart spawn (the deactivate= line on success, the new restartText line-1 exact-own-line marker as the successor's first message, the depth-cap skip=) — awaits the next autorun action:restart close. ADJACENT LIVE FINDING → TODO #91 (the compaction summary leaked into the spawn identity + routing during the 14:46Z episode — STILL LATENT in the live build).
   **Spawn-tail live acceptance (2026-09-23, planner-13 autorun, build v=7d2e6207 = the sha256 prefix of the on-disk auto_resume.ts at HEAD d6ddf37, process start 19:13:25Z):** the maintainer's own-line `<|autonom|>` toggle + the `action: restart` close led to `scope= autorun` (19:20:54Z) then `route= restart spawn sid=ses_f3144d9d6...` (19:20:55Z) then `spawn= sid=ses_f30493f9... agent=planner_Q3S_170K model=llama-swap/Qwen3.8-27B-Q3S-170K ident=autorun-2026-09-21_15-33 planner-13` + `deactivate= sid=ses_f3144d9d6...` (19:20:55Z). ALL THREE previously unexercised items verified live: (1) the `deactivate=` line on success + the trigger idle-untouched afterwards (zero scope=/route=/recovery= for its sid post-spawn); (2) the new restartText line-1 exact own-line `<|autonom|>` as the successor's first user message (line 1 of the queued text; line 2 of the received message after the gauge's passive `ctx:` prefix per #85 part 3); (3) zero `skip=` depth-cap lines. The successor was armed (arm= lines from 19:20:55Z); its own `scope= autorun` line appears in the log at its first idle evaluation (after that session's close).
- **Closed:** 2026-09-23 (planner-13) — the spawn-tail live acceptance is complete (see the paragraph above); subsumes #87 (closed) — full text to todo_records.md.

## #96. (open, 2026-09-25, planner-14; his launch directive — auto_resume.log hardware wear) auto_resume.log write-volume reduction
- **Problem / evidence:** `.opencode/temp/auto_resume.log` = 239.6MB /
  2,813,277 lines at ~4 days process uptime (measured 2026-09-25):
  **97.4% of the bytes = `event=message.part.delta` lines** (2,718,066
  lines / 231.0MB) — the event hook `onEvent` (auto_resume.ts
  L1468-1480) logs ONE line per event, incl. every streamed token
  delta; the current process (v=c57de2cc) wrote ≈18.7k delta lines in
  ~20 min ≈ 1.25M lines/day ≈ ~100MB/day of small appends (his SSD-
  wear concern). The remaining lines grow ≈1MB/day. The old-build
  lines `skip= autoCompact-off` / `saturation=` are NOT emitted by the
  current source (grep-clean) — no work needed there.
- **Desired outcome:** the log stops growing per-token; a size guard
  bounds long-term growth; the existing 233MB file is trimmed
  AUTOMATICALLY on the next host restart (no manual step).
- **Design (planner, 2026-09-25 — the spec at launch is built from this
  entry):** (1) `onEvent` NEVER logs `message.part.delta` (the arm path
  is unaffected — the Unit-2 saturation input is `message.updated`
  only, L1447-1464); all other event types unchanged. (2) Size guard
  at init, BEFORE `restoreLineageFromLog` (L1508-1544 — today it reads
  the whole 233MB): log size > 20MB → keep the byte TAIL (last 2MB),
  ONE `log-trim= old=<bytes> new=<bytes>` line; caps as factory options
  (defaults 20MB/2MB; small values in the smoke — the `tickMs` factory-
  option pattern L1573-1574); absent/unreadable → no-op. `log()` is a
  per-line appendFileSync (L352-359) → the file is never held open → a
  synchronous init-trim is safe. Documented accepted consequence: the
  #90 lineage restore sees only the surviving tail (an older
  route=/spawn= pair cut by the trim → depth resets to 0 — best-effort
  by design). (3) Smoke re-pins (baseline 129/129): a synthetic
  `message.part.delta` event → zero log lines for it (a paired
  `message.updated` in the same batch still logs); a seeded oversized
  log → trim + tail preserved + the `log-trim=` line; the lineage
  restore still works on a trimmed tail.
- **Acceptance:** zero `message.part.delta` lines appended after a
  live restart (his live check); the 233MB file trimmed to ~2MB on the
  next restart with the `log-trim=` line; smoke + standard gate green.
- **Suggested scope:** `.opencode/plugin/auto_resume.ts` (`onEvent`,
  init, the trim guard), `.opencode/plugin/tests/auto_resume.smoke.mjs`.
- **Status:** CODE LANDED (worker-Q3S-170K, 2026-09-25, commits
  22c36e4 + 70399ea): the delta exclusion + the init size guard
  (defaults 20MB/2MB, factory options `maxLogBytes`/`logTailBytes`) +
  the smoke re-pins (133/133; standard gate green: probe 279/279,
  pytest 459 passed + 1 warning, ruff F=0). PENDING his live check at
  the next host restart: zero `message.part.delta` lines appended from
  the new build + the existing file (239.6MB at measure, ~100MB/day
  growth — 264.4MB at worker run) trimmed to ~2MB with the `log-trim=`
  line — then close.
- **Closed:** 2026-09-25 (planner-17) — live-verified post-restart this session: the init trim fired (`log-trim= old=293026007 new=2097152`, 12:50:57Z — 293MB → 2MB) and zero `message.part.delta` lines were appended after the trim (last delta line 24391 < trim line 24434; the new build's ~2.7k lines are delta-free) — acceptance met, closed.

## #93. (closed 2026-09-27, direct session ses_f20d1b39… — live-verified by his repeated overflow tests 2026-09-26/27: the recovery fires on overflow, compacts, and does NOT resume (the unification Part B behavior — correct), the session continues; budget counter 1 increment (Gemma ses_f20e63e08); the event-hook port LANDED 2026-09-25; the one-plugin integration follow-up LANDED 2026-09-26 plan23 unification) — Emergency compact backstop: port context_recovery.ts to the `event` hook

- **Problem / evidence:** context_recovery.ts (the T5 emergency overflow recovery — the backstop for when the agent fails to self-compact in time) registers a `"session.error"` plugin hook that does NOT exist in the current `@opencode-ai/plugin` SDK (zero matches in the node_modules d.ts) → the hook never fires (silent). Live fork test 2026-09-23 (ses_f2fee1f3fffej3GlGz8jJ5iGwb "compaction agent and context limit testing", fork of planner-13, Qwen3.8-27B-Compaction): 4× overflow errors `request (148149 tokens) exceeds the available context size (131072 tokens)` reached the event stream with `emergencyRecovery: true` ON + the plugin loaded — no COMPACT line, no budget increment, the session died at the wall (`MessageAbortedError`).
- **Outcome:** the backstop fires on an overflow session.error (compact with the configured keep → COMPACT line → reload directive → `{handled:true, action:"retry"}`) + a diagnostic line on EVERY fire (so a future silent failure is visible in one file).
- **Acceptance:** live overflow on a driven/forked session → COMPACT line + budget increment + the session retries and continues (log evidence); smoke pin for the event-hook path (extend the existing probe's faked client to the event shape); standard gate green.
- **Scope:** `.opencode/plugin/deactivated/context_recovery.ts` → `event` hook (`event.properties.sessionID` — capital D — + the `ContextOverflowError` union); flag/budget/keep/COMPACT/directive logic unchanged; move back to `.opencode/plugin/` at landing. PRESTEP to the maintainer's planned integration of context_recovery + compact_memory into ONE plugin (shared compaction functionality) — the integration itself is a separate follow-up task.
- **Status:** LANDED 2026-09-25 (worker, `worker_Q3S_170K`): the event-hook port lives at `.opencode/plugin/context_recovery.ts` (the deactivated copy is removed) — `event` hook (no `"session.error":` key — that hook does not exist in the current SDK), capital-D `sessionID`, the overflow markers, the v1 summarize path with the config-resolved pair (self-contained local copies — no runtime import from compact_memory.ts), the v2 budget gate (normal / emergency-1 / exhausted CLEAN FAIL), the once-per-overflow guard (cleared on EventSessionIdle), the COMPACT line per the current tool's writer (messages-only + the ` emergency` suffix), and the spec-2+11 post-compaction directive via promptAsync (the retry vehicle — the hook returns void, so the old `{handled, action:"retry"}` return is gone). Smoke re-pinned 15/15, probe S11 re-pinned (11 checks: 76-81 + 257-261) — probe 257/257, gate green (commit hash recorded in the planner's follow-up bookkeeping commit — no self-reference). REMAINING (maintainer domain, verbatim): (1) the host restart (plugin activation), (2) the live overflow acceptance on a driven/forked session as the 2026-09-23 fork test (expect: ONE COMPACT line + the budget increment + the session survives/continues — the flag is already `true` in the budget file, no flag work needed). FOLLOW-UP (out of scope): the context_recovery + compact_memory ONE-plugin integration is the next candidate. Architecture ruling: host auto-compaction stays DEACTIVATED by design (`"auto": false` — it fired uncontrollably, `buffer` never worked); the host `compaction` config only supplies defaults (model + keep); the agent-driven compaction stays primary; the emergency compact is the remaining piece. Keep-values (CLARIFIED 2026-09-24 — no drift, by design): our plugins (compact_memory + the emergency backstop) read `compact_budget.json` (keepMessages 12); the host MANUAL compact (usable on any session any time, independent of `auto`) reads the opencode.json `compaction` block (keep.messages 18) — each system its own store; tokens agree (30000).

## #83. (closed 2026-09-27, direct session ses_f20d1b39… — his autoCompact question answered: the `autoCompact`/`saturationThreshold`/`outputReserve` keys currently gate ONLY the passive nudge suffix (auto_resume.ts onToolAfterNudge — no promptAsync, no compaction dispatch); raising the threshold would only push the nudge back; the ACTUAL auto-compaction backstop = context_recovery, live-verified by his overflow tests (the #93 close above, same evidence); the threshold knob stays in compact_budget.json (= 0.85, the nudge position)) — unit-2 backstop: catch the ACTUAL context-limit hit cleanly (revive context_recovery.ts)

- **Problem + evidence:** the pre-emptive trigger (now configurable, default
  0.95 via the #82-adjacent change) still fires BEFORE the limit, so a
  chunk of the window is never used. He wants to "use as much of the
  context window as possible" → move the threshold toward ~0.98 and rely
  on a CLEAN catch of the real limit hit. That mechanism ALREADY EXISTS
  (verified 2026-09-22): `.opencode/plugin/deactivated/context_recovery.ts`
  (324 lines, T5 approved design 2026-09-11, built on the maintainer's
  prototype) — a hook firing on the overflow `session.error` (activation
  flag `emergencyRecovery: true` in opencode.jsonc, read per fire; only
  `true` enables it), which compacts with an informed keep (30k tokens /
  12 messages), appends its COMPACT line to ctx.log, injects the
  re-application directive, and returns `{handled:true, action:"retry"}` —
  a SINGLE clean retry that replaces the slow "opencode removes the tail
  (last message in generation) and retries 5-6 times" loop. Over budget →
  CLEAN FAIL (returns unhandled, the error propagates). Budget: the SAME
  `compact_budget.json`, ≤2 per session id (self + emergency combined).
  A smoke test exists: `tests/context_recovery.smoke.mjs`. It is
  currently DEACTIVATED.
- **Desired outcome:** the pre-emptive threshold can be raised toward ~0.98
  (configurable) because the actual limit hit is caught cleanly (one
  compact + single retry) instead of the slow tail-removal loop; and an
  over-budget session gets a clean STOP (no runaway retries).
- **Acceptance criteria:** `emergencyRecovery: true` activates it; on an
  overflow `session.error` it compacts + returns a single retry (not 5-6
  tail loops); over budget → clean fail (error propagates; the -WARNING is
  the looprunner's/protocol's job); the shared ≤2/session budget is
  respected (re-read-then-write, no await between); smoke green.
- **Suggested scope:** re-activate + adapt
  `.opencode/plugin/deactivated/context_recovery.ts` to the CURRENT
  compact_memory summarize path (v1-generation client, config-resolved
  summarizer); wire the `emergencyRecovery` flag. KEY UNCERTAINTY: the
  host must actually CALL this hook on overflow — needs a LIVE
  verification (the prototype was working at build time, but the build
  changed since). Effort MEDIUM (the code exists but predates the current
  compact_memory design and is deactivated).
- **Status:** the paired configurable-threshold change LANDED
  (2026-09-22, worker: `saturationThreshold` (0 < t < 1, default 0.95) +
  `outputReserve` (>= 0, default 20_000) as per-tick fail-open keys in the
  budget file; smoke 89/89 + full gate green; commit hash recorded in the
   planner's follow-up bookkeeping). The BACKSTOP part remains open —
   maintainer call (needs his flag in the live opencode.jsonc + the live
   host-call verification). This is the enabler for raising the threshold
   to ~0.98. NOTE (2026-09-22, #84): the `emergencyRecovery` flag now lives
   in the shared compact_budget.json (not opencode.jsonc) — the live-flag
   part of this entry must be set there.

## #74. (closed 2026-09-27, direct session ses_f20d1b39… — maintainer: the backend no longer runs on ik_llama and the offending PR was reverted in the fork — non-issue, can be closed) — Write tool fails on long content payloads on this host

**Problem / evidence:** JSON parse errors ("Text: {." / "Expected '}'"), once even on a 3-line file — logged by four worker sessions (2026-09-19 long multi-paragraph args; 2026-09-20 Deep-Dive B run #4; 2026-09-21 run #6 "write failed for every payload"; 2026-09-21 run #7_1 three long-content failures). His --info note pointed at the fuzzy_numword intercept path-resolution — CORRECTED same day by him: the intercept is actually live, and two extra test rounds (his handover-file overwrite runs, direct-message specs writing other files) show the write still failing WITH the intercept deactivated; no opencode changes made; the problem predates the new model set (surfaced in Deep-Dive B run 2 with the old models) — so the intercept is NOT the root cause and this is a host-side issue independent of our models; 2026-09-21 (planner direct session): the SAME signature ("JSON parsing failed: Text: {.") hit a GREP tool call — scope extends beyond write; machine check: both error strings are embedded in the installed `opencode.exe` (v1.18.31: "JSON parsing failed: Text" x8, "Invalid input for tool" x2) → the failing parse is inside the opencode server, upstream of every plugin hook (intercept is log-only and sees already-parsed args); candidate captures: provider-side raw response log (maintainer) + `opencode --log-level DEBUG --print-logs` stderr capture (agent-side, flags verified); HIS HYPOTHESIS (2026-09-21, direct): the truncation began after his llama.cpp update — his bit-drift-countermeasure fork `ik_llama` — and OTHER PEOPLE report the same issue → suspected fork-side (provider) bug; isolation test = direct-to-server long-JSON probe bypassing opencode; SECOND LIVE DATA POINT same session: a webfetch call with SHORT args failed with the identical signature → the signature is "assistant response stream cut mid tool-call JSON", long payload is a risk factor, not the sole cause; fork identified as `ikawrakow/ik_llama.cpp` (issue #380 "Drop at the start of generation" confirms known fork-side streaming bugs); ROOT-CAUSE CANDIDATE (his link 2026-09-21): issue #2492 "Truncated tool calls on qwen3.8-flash-next" (opened 2026-09-20, open) — regression attributed to PR #2470; its raw SSE dump shows the tool-call arguments JSON closed MID-VALUE (finish_reason=tool_calls on an incomplete JSON) = exactly our signature; his timeline caveat: PR ~18h old vs his problem ~48h old → "might be not connected"; BISECTION POINT (this session): 4 live failures pre-reload (grep, webfetch, two writes — incl. the short-arg webfetch — all served under the buggy build); after his unload + fresh reload to the old ik_llama: 2 short writes clean + byte-verified (scratchpad flaky_t1/t2.txt); CONSTRAINT (his): agents never send direct requests to the inference server — single slot unloads the session's model (also logged in knowledge_tools.md single-slot section). POST-RELOAD RESULTS (old ik_llama, same session — natural A/B against the 4 pre-reload failures): 70B write clean, 156B write clean, 10,095B write clean (101 lines, tail-verified — far past the 4k acceptance bar; caveat: repetitive filler content — a non-repetitive variant + cross-model coverage remain). NEXT: optional — one non-repetitive ~10k write + one run on another model, then the entry can move toward close pending the fork's #2470 fix.
**Outcome:** host-side fix (maintainer domain); if not fixed, codify the workaround (create via bash printf/heredoc, then small write/edit append batches — see knowledge_tools.md) in the repo docs so runs don't re-discover it.
**Acceptance:** a ~4k+ char write payload succeeds without parse errors (tested across models), OR the workaround is documented and the next long-file run completes with no write-tool failure.
**Suggested scope:** opencode host (maintainer) + repo docs/prompts (agent-side).
**Status:** open; root cause CONFIRMED per timeline (his 2026-09-21: PR #2470 merged ~4 days ago ≈ his ~48h onset; #2492 = same signature) — old ik_llama in place, workaround stays until the fork patches #2470; his update discipline: never adopt a fresh ik_llama build immediately — let it rest so others find the bugs first.

## #95. (closed 2026-09-28, plan28 maintenance pass — all four sub-items LANDED 2026-09-26: (1) R6 acb6323, (2) edit-fuzzy 15761d8+78b68e7, (3) R3 3ec1c5c/9e91878/20d5a48, (4) R8 + return-info #97 07bdd56/0d9b8e6; R3 live-acceptance COMPLETE 2026-09-26 (plan23 re-test: grep/glob pair + bash quoted-form + bt anchor-marker pair live-accepted; section-anchor pinned-only, schema-shadowed)) — fuzzy edit-oldstring track (PARENT entry)

## #67. (closed 2026-09-28, plan30 maintenance pass — R3 build LANDED 2026-09-26 (3ec1c5c/9e91878/20d5a48, gate 337/337 + io 77/77) + live acceptance COMPLETE 2026-09-26 (plan23 re-test: grep/glob pair + bash quoted-form + bt anchor-marker pair live-accepted; section-anchor pinned-only, schema-shadowed — dormant by design on this host; see #95 closed status)) — Fuzzy scope extension: glob / grep / section-anchor resolvers (2026-09-16, plan2 queue)
- **Problem / evidence:** plan2 wired ONLY `read` (+string filePath) — the
  core matcher (`resolveReadPath`, corpus cache) is corpus-root-agnostic and
  ready for more read-scope tools (research §2.3/§2.6).
- **Outcome:** extend the hook scope to `glob`/`grep` path args and add the
  section-anchor resolver (anchor line-prefix → offset, exactly-one-match,
  fail-closed on 0/≥2 — §2.6), fail-closed + both-outcomes logged, probe
  pins per the established pattern.
- **Acceptance:** probe green (self-annotation updated), smoke green,
  standard gate unchanged.
- **Scope:** `intercept_observer_core.ts` + `intercept_observer.ts` + probe
  S18 section.
- **Status:** OPEN (this is the scope of staged spec R3,
  `research/fuzzy-numword/spec_R3_arg_scope_extension.md`; gated on R1 + R2
  green + R4 log-volume data). R4 LANDED 2026-09-23 (planner-13,
  worker-13 ses_f30310096, commit dde74b9, planner-verified): the mining
  scriptlet `scripts/log/summarize_intercept.cjs` + fixture pin (6/6 smoke) +
  INVENTORY/README; the gate data is in hand (run output: verdict counts,
  fuzzy-rejected d/gap lines, out-of-sandbox prefixes, per-session counts —
  counts move, the log grows live). Census-basis note (worker finding): the
  spec's "139 distinct session ids" was a substring census; the script's
  field-2 census reads 86 at 3130 lines — the field-2 census is the R4
  per-session basis (the gate is met on either basis). R3:
   the build LANDED 2026-09-26 (3ec1c5c/9e91878/20d5a48 — gate 337/337 + io
   77/77; see #95 sub-item (3)). LIVE acceptance 2026-09-26 (plan22): 2 of 4
   channels live (grep/glob pair + bash quoted-form); the section-anchor +
   bt anchor-marker channels blocked — the live process predates the import
   fix 9e91878 (the 14-26 mid-incident restart) → pending the maintainer's
   next restart.

## #70. (closed 2026-09-28, plan30 maintenance pass — all units LANDED + live-accepted: unit A 6864bc0 (2026-09-21) + unit B d4ef76e (2026-09-22); live acceptance 2026-09-21 (DUMP-OK PASS + config resolution; the cross model-read bug found+fixed 280b8d0 + re-accepted); the requested research-spec follow-on superseded by the #99/#101/#105 research tracks) — compact_memory rework: config-resolved summarizer + queued message + dump diagnostics (2026-09-16, new priority.md item; re-scoped 2026-09-21 by his priority.md #1)
- **Problem / evidence:** maintainer priority.md addition: context_limit
  error → compact the worker (use the Gemma compaction model per
  opencode.jsonc `agent.compaction`); the flow is SERIAL (compaction active
  = planner inactive — no sleep/wait polling); cross-compaction needs only
  the target session_id (providerID/modelID to be REMOVED from the
  compact_memory parameter list — resolved from opencode.jsonc; the
  parameter descriptions were "described badly" — #55 item). Plan2 hit the
  friction live: the dispatch resolved the SUMMARIZER to the same model as
  the target session (Qwen) and I had to wait for the single slot. HIS
  2026-09-21 priority.md #1 ADDITIONS: (1) BOTH providerID and modelID
  REMOVED from the exposed parameter list — the summarizer resolves from
  opencode.jsonc `agent.compaction.model` ("provider/model"); absent /
  malformed → the COMPACTING session's own model (his ruling: same-model
  compaction gives better results even if slower); the LIVE config has
  `agent.compaction` commented out → the fallback path is currently
  active; (2) the `message` arg does NOT arrive in the compacted session
  (it only rides the caller's tool result) — change to a direct QUEUED
  prompt message (promptAsync, no await — delivered on resume);
  (3) DUMP-FAIL evidence (ctx.log 2026-09-16/17: 2× `spawnSync node
  ETIMEDOUT`; measured: the dump script is 0.12 s standalone — a HUNG
  CHILD INSIDE THE HOST, not script slowness; the hook logs failures
  only, no DUMP-OK line → add DUMP-OK + duration for self-diagnosis;
  defensive spawn stdio pipe→ignore); (4) auto-compaction on context
  limit = an option togglable via a parameter in the budget file
  (`.opencode/temp/compact_budget.json`); (5) research spec requested: a
  small research on compact_memory + block_transfer (he wrote
  "buffer_transfer") — up/downs, what is problematic and why,
  alternatives.
- **Outcome (goal):** param rework landed (4-key schema:
  sessionID/keepTokens/keepMessages/message; config resolution with
  session-model fallback) + the message queued to the compacted session +
  DUMP-OK diagnostics + (follow-on) the budget-file auto-compact toggle +
  (follow-on) the requested research spec; probe/smoke green; live
  acceptance after a host restart.
- **Acceptance:** param rework landed + probe/smoke green; a cross-compact
  dispatch needs only the session_id; the queued message reaches the
  compacted session (live, post-restart); the toggle readable from the
  budget file (follow-on unit); the research spec filed + run (follow-on
  unit).
- **Scope:** `.opencode/plugin/compact_memory.ts`,
  `.opencode/plugin/tests/compact_memory.smoke.mjs`,
  `.opencode/plugin/probes/handover_probe.mjs`, (follow-on:
  `.opencode/plugin/auto_resume.ts` + the budget store).
- **Status:** OPEN (approved — priority.md #1, top of his active list).
  **Unit A LANDED (2026-09-21, plan5, worker-6 `worker_Q3S_160K`
  ses_f3ab3c67dffeujQ8L1ucfWu8k8, code `6864bc0` — the planner verified the
  full gate and landed the commit after the worker's context-limit death):**
  4-key args (providerID/modelID removed) + config-resolved summarizer
  (opencode.jsonc `agent.compaction.model` → session-model fallback; the
  live config is commented out → fallback active = same-model summarize) +
  queued promptAsync message + DUMP-OK line + stdio ignore (probe 241/241,
  all 10 smokes, pytest 459+1w, ruff F=0). FOLLOW-ONS: the auto-compact
  budget-file toggle (unit B), the research spec (compact_memory +
  block_transfer up/downs), live acceptance after the next host restart.
  **Unit A build in flight (plan5, 2026-09-21, looprun 2026-09-21_15-33):**
  the param rework + config resolution + queued message + DUMP-OK
  diagnostics — spec committed this iteration; follow-on: the auto-compact
  toggle unit, the research spec, live acceptance post-restart.
  **Live acceptance ATTEMPTED (2026-09-21, plan6, post-restart, planner-run):**
  (a) DUMP-OK LIVE PASS — the pre-compaction dump hook fired on a live
  dispatch (ctx.log `DUMP-OK ses_f3b16aa46… 76` + `compaction_dumps/
  ses_f3b16aa46…_c0.md` created); (b) config resolution — the live
  `agent.compaction` is COMMENTED OUT (opencode.jsonc line ~130) → the
  same-model fallback is the active path (the dispatch reached it);
  (c) CROSS MODEL-READ LIVE BUG FOUND: two live cross dispatches failed
  `no resolvable model … request was NOT sent` + `cross-session model read
  empty (no messages)` for sessions that DO have messages — root cause
  measured: the in-process client resolves SDK calls to a RequestResult
  wrapper `{ data: [...] }`, never a bare array (precedent: auto_resume.ts
  383-386 unwraps `create()` as `res.data.id ?? res.id`; SDK types
  `SessionMessagesResponses = { 200: Array<{info, parts}> }`) —
  `resolveModel` ran `Array.isArray` on the raw result → always "no
  messages" (smoke fakes returned bare arrays, so the gate stayed green).
  **FIXED (280b8d0, worker-7, planner re-verified): dual-shape unwrap in
  resolveModel + smoke wrapper case (smoke 53/53, probe 241/241, pytest
  459+1w, ruff F=0).** LIVE RE-ACCEPTANCE (cross model resolution + queued
  message + COMPACT line) PENDING the NEXT host restart (the fix is not
   live yet). Unit B: spec committed (1c599a6); worker-8 DIED mid-run
   (host stream-cut mid tool-call emission — the #74 family; no file
   changes, nothing lost) → UNIT B LAUNCH-READY for the next iteration.
   **Unit B LANDED (2026-09-22, plan7, worker-10 `worker_Q3S_160K`
   ses_f3a03af20ffe1bRa56xVl143VG, code `d4ef76e` — planner re-verified:
   smoke 62/62, probe 241/241, pytest 459+1w, ruff F=0):**
   `autoCompactEnabled()` per-tick reader (fail-open: missing/unreadable/
   malformed file or absent key → ON; key present → Boolean) + the tick
   gate (`skip= autoCompact-off` line, no send, the once-per-busy-cycle
   attempts budget NOT consumed when OFF); live `compact_budget.json`
   untouched. Worker-9's cancelled partial (header comment + constant —
   maintainer interrupt, the #79 ping-pong incident) was carried by
   worker-10. Live acceptance pending the next host restart. Follow-on:
   the requested research spec (compact_memory + block_transfer up/downs).

## #78. (closed 2026-09-28, plan30 maintenance pass — LANDED 2026-09-23 (6b33907, per his 2026-09-23 ruling "go for 1 + 2, plus 3+4 unified": --json raw mode + lossless full markdown + --lite preset + hook 120 s budget / pipe stderr / one retry; planner-verified: --json spot-check 70 msgs / 337 parts exact-match the live DB)) — Dump completeness: the session dumps filter out parts (thinking/writing) (2026-09-21, planner; his --info note in priority.md)
- **Problem / evidence:** his --info (priority.md, 2026-09-21): "automatic
  dumps which were generated by the dumping script to backup all sessions
  seemed to not include any thinking, writing or other parts at all" (e.g.
  `.opencode/archive/sessions/ses_f5aefe9e1ffemgTiq9GELiqaGL.md`); "the
  current dumping in the compact tool seems to filter out some parts. if
  they are in json maybe it is best to just dump this directly as it is to
  preserve the structure"; dumps in general should be COMPLETE — filtering
  out tool calls can be done by scripts on a need basis.
- **Desired outcome:** dumps (the `dump_session.cjs` corpus dumps AND the
  compact pre-dump hook) preserve ALL part types (incl. reasoning); a raw
  JSON dump mode that preserves structure as-is; the markdown filtering
  stays available as an on-demand script concern.
- **Acceptance:** a dump of a session containing reasoning parts shows
  them (or the explicit JSON mode exists); his ruling recorded
  (markdown-completeness vs raw-JSON-as-is as the default).
- **Suggested scope:** `.opencode/agent/scripts/db/dump_session.cjs` (+ the
  `preCompactionDump` call site in compact_memory.ts),
  `.opencode/archive/sessions/` (read-only reference).
- **Live evidence #2 (plan6, 2026-09-21):** the compact pre-dump hook
  ALSO times out on large sessions — `DUMP-FAIL ses_f3a51aedcffeSa0cwt8PmwlXAr
  spawnSync node ETIMEDOUT` (ctx.log) on a ~90 % session while a small
  session dumped in 76 ms (`DUMP-OK`) — the dump's spawn timeout does not
  scale with session size (same script family as the corpus dumps).
- **Status:** LANDED 2026-09-23 (worker_Q3S_170K
   ses_f30807a16ffelPQPUBH50wiXBe — A+B+C per spec 2f64d76: `--json` raw mode
   + lossless full markdown + `--lite` preset + hook 120 s budget / pipe
   stderr capture / one retry; DUMP-OK `ms=` + stdio + S14-104 re-pins
   (recorded in the worker handover); gate green — the code commit hash is
   recorded in the planner's follow-up bookkeeping — Commit **6b33907** (planner-verified 2026-09-23: compact_memory smoke re-run 57/57; `--json` spot-check on the trigger session: 70 msgs / 337 parts, JSON.parse OK, counts exact-match the live DB)). Was SCOPED 2026-09-23
   (plan11, explore ses_f317d80c2ffeMGup4T9z5IvUs2 — findings:
   `.opencode/loop/autorun-2026-09-21_15-33/plan11_78_scope.md`. Headline: his
  cited corpus file is a STALE 2026-09-15 slim backfill — the CURRENT full
  mode emits all 141 parts of that session (30 reasoning + 16 text verbatim);
  residual gaps = tool `state.input`/`state.output` never emitted + 400/600-
  char caps on other types; NO raw-JSON mode exists. Hook timeout = fixed
  60 s (`compact_memory.ts` L359) vs measured 64–87 ms dump wall-times → the
  live DUMP-FAIL ETIMEDOUT is a SPAWN-LEVEL STALL, not budget exhaustion
  (`stdio: "ignore"` hides the child stderr). Ranked recs: (1) add a
  `--json` raw-as-is mode to `dump_session.cjs` (S; hook-default = his call),
  (2) raise/diagnose the hook timeout (S–M), (3) make markdown full mode
  lossless (S) + (4) later an on-demand markdown filter over the raw JSON.)
   Awaiting his ruling on the options. **RULING 2026-09-23 (planner-12 direct): go for 1 + 2, plus 3+4 unified** (his 3/4 intuition confirmed — unfiltered vs filtered = a renderer toggle: 3 = lossless full markdown AT DUMP TIME, 4 = a `--lite` filtered preset on the same script). Spec written (handover_task.md) + `worker_Q3S_170K` launched; the pre-compaction hook keeps its markdown backup rendered with the lossless full mode (raw JSON stays the on-demand `--json` mode — planner call, veto-able).

## #97. (closed 2026-09-28, plan30 maintenance pass — LANDED 2026-09-25 (worker-17: 07bdd56 Unit 1 redirect + 0d9b8e6 Unit 2 escape return-info + 6684991 handover; gate green) + LIVE-ACCEPTED 2026-09-26 (plan22 planner spot-check: the Windows-root form redirected 1:1 into the scratchpad, kind=redirect line delivered)) — R8 sandbox redirect: out-of-sandbox path args redirected INTO the sandbox (2026-09-25, his live priority.md edit labeled "TODO #97"; planner-14 filed)
- **Problem / evidence:** his priority.md live section 2026-09-25 ("# fuzzy_numword
  R8"): repeated accesses outside the sandbox stop everything until he
  intervenes — e.g. an access to `home\AppData\Local\Temp`
  instead of the designated `home\AppData\Local\Temp\opencode`;
  the earlier priority.md fuzzy_numword item gives the shape (redirect
  calls like `C:\Users\Asiejen\AppData\Local\Temp\opencode\brtest.mjs`
  into the sandbox). His named basis for the allowed paths: the
  `permission.external_directory` + `references` sections of
  opencode.jsonc (both). This is #95 sub-item (4) first half — the
  escape return-info is the second half (rides the same launch).
- **Desired outcome:** an out-of-sandbox path argument that maps 1:1 into
  a sandbox/allowed path is REDIRECTED (mutated) by the intercept before
  the call runs, with the mandatory log line (kind + orig= + value= per
  his return-info ruling) — the "repeated accesses stop everything"
  loop ends; NO new out-of-sandbox access is ever granted (redirect
  only, never an allow-widening).
- **Acceptance:** a controlled out-of-sandbox path (the Temp-without-
  opencode-suffix case) is redirected + logged; a path with no 1:1
  mapping fails closed (no mutation); probe pins per the established
  pattern; standard gate green.
- **Suggested scope:** `.opencode/plugin/intercept_observer.ts` (+ core —
  the allowed-path resolution from opencode.jsonc
  `permission.external_directory` + `references`),
  `.opencode/plugin/probes/handover_probe.mjs`, the tests.
- **Status:** LANDED (worker-17, 2026-09-25 — commits `07bdd56` (Unit 1
  R8 redirect) + `0d9b8e6` (Unit 2 escape return-info) + `6684991`
  (handover); planner-17 spot-verified: intercept smoke re-run 67/67
  green, probe 303/303, pytest 459 passed + 1 warning, ruff F=0 per the
  handover). The return-info/feedback half landed as Unit 2 (his
  context-saving ruling honored: truncated first form in the feedback,
  full pre-mutation payload in the journal `pre-escape` field).
   Sign-offs (handover §deliberately-not-done): S28 probe section
   placement, `pair-resolved` verdict reuse (the 12-token vocabulary is
   pinned), the redirect note text, the 13b hint token — all accepted by
   planner-17. **LIVE-ACCEPTED 2026-09-26 (plan22, planner spot-check):**
   the Windows-root form `home\AppData\Local\Temp\
   plan22_r8.txt` redirected 1:1 into the scratchpad (the `kind=redirect`
   line delivered in the tool feedback — the R8 note mechanism live).

## #107. (open, 2026-09-28, plan28 feedback review; pre-approved class) DUMP-OK / COMPACT ctx.log lines should carry the FULL repo-relative directory
- **Problem / evidence:** agent_feedback 2026-09-27_16-20 (planner): the
  #92 live-acceptance verification cost two extra probes — the ctx.log
  DUMP-OK line carries only the archive-RELATIVE path
  (`compaction_dumps/…_c0.md`) but the real dir is
  `.opencode/archive/sessions/compaction_dumps/`; the TODO/summary now names
  the full dir, but the log line itself still forces the re-discovery.
- **Desired outcome:** the DUMP-OK / DUMP-FAIL / DUMP-RETRY lines (and the
  COMPACT line where a file path is named) carry the full repo-relative
  path — a live acceptance is a single `ls`.
- **Acceptance criteria:** the line format change pinned (probe S14
  byte-exact pins + compact_memory smoke re-pins); gate green.
- **Suggested scope:** `.opencode/plugin/compact_memory.ts` (the dump-hook
  log lines), `.opencode/plugin/probes/handover_probe.mjs` (S14),
  `.opencode/plugin/tests/compact_memory.smoke.mjs`.
- **Status:** LANDED (plan29, 2026-09-28, planner-29 planner-direct —
  pre-approved class): the three DUMP-* lines (DUMP-OK / DUMP-RETRY= /
  DUMP-FAIL) now carry the FULL repo-relative dump path
  (`.opencode/archive/sessions/` + name — the `DUMP_ARCHIVE_REL` constant
  shared with the archive-dir join) so a live acceptance is a single `ls`;
  the spawn's `--out` keeps the corpus-relative name (the script's
  OUT_DIR-relative arg); the COMPACT line names no file path (checked —
  unchanged). Pins re-pinned: probe S14 check 104 (4 includes()) + S25
  check 255 (regex + label) + the compact_memory smoke's two DUMP-OK pins
  (md + json). Measured: compact_memory smoke 78/78; probe all green
  except the 11 pre-existing python312 environmental failures (see #113).
  Hash in the plan29 bookkeeping commit.

## #108. (open, 2026-09-28, plan28 feedback review; pre-approved class) auto_resume smoke: programmatic pair-block fixture builder
- **Problem / evidence:** agent_feedback 2026-09-27_20-49 (planner): hand-
  re-typing the 10-pair `#96 (c)` trim-restore fixture was error-prone — 19
  lines written for 10 pairs (one `route=` line dropped), caught by the
  smoke only after 2 runs + a standalone repro.
- **Desired outcome:** the multi-pair fixture blocks are generated
  programmatically (a loop building the string, not literal lines) + a
  pair-count assert so a dropped line fails instantly with the count.
- **Acceptance criteria:** the #96 (c) fixture (and any sibling multi-pair
  fixtures) built by the generator; a pair-count assert present; the smoke
  re-runs green with identical pin coverage.
- **Suggested scope:** `.opencode/plugin/tests/auto_resume.smoke.mjs` (the
  #96 (c) fixture block + the generator helper).
- **Status:** LANDED (plan29, 2026-09-28, planner-29 planner-direct —
  pre-approved class): the #96 (c) trim-restore fixture's 10 pairs are now
  generated PROGRAMMATICALLY in the child script (`L(i) = charCode 97+i` +
  `Array.from({length: 10})` loop — the same pattern the cap-config
  sibling already carried) + a PAIR-COUNT assert (`pairCount !== 10` →
  `console.log("PAIR_COUNT " + pairCount)` + non-zero exit BEFORE the log
  is seeded — a dropped pair fails instantly with the count in the smoke
  detail). The sibling multi-pair fixture (cap-config child) was already
  programmatic (checked — no other hand-typed pair blocks exist).
  Measured: auto_resume smoke 140/140 (the 140 = 139 baseline + the
  3914181 cap-config check — the NAP baseline was stale, corrected in
  plan29 bookkeeping). Hash in the plan29 bookkeeping commit.

## #110. (open, 2026-09-28, plan28 ideas.md scan; pre-approved — docs) per-plugin README files for `.opencode/plugin/`
- **Problem / evidence:** ideas.md 2026-09-22_17-53 (maintainer): "might be
  a good idea to create separate README.md files for each plugin we have
  written — general explanation what it does and how it is implemented;
  might contain gotchas encountered — lessons learned and what not to do
  with reasoning; this might be better in another gotchas file specific to
  plugins."
- **Desired outcome:** one README per our plugin (auto_resume,
  compact_memory, context_recovery, intercept_observer, gauge/ctx nudge
  family, block_transfer/loop_log/submit tool plugins where they live in
  the plugin dir) — what it does, how it is implemented (hook surface +
  key files), the gotchas/lessons (from knowledge entries + session
  incidents); each ≤ ~60 lines, pointer-only (no restatement of the
  knowledge base).
- **Acceptance criteria:** the READMEs present in the plugin folder; every
  plugin in `.opencode/plugin/` covered; content spot-checked against the
  code (no stale hook names); the folder README (if any) indexes them.
- **Suggested scope:** `.opencode/plugin/` (new README files, one per
  plugin), `.opencode/agent/knowledge/knowledge_plugins.md` (source of the
  gotchas).
- **Status:** LANDED (plan32 unit 1, 2026-09-28, worker-32 — 9 per-plugin /
  per-tool READMEs next to their sources + the two folder-README index
  lines; the tools folder's 4 READMEs ride the same batch — see the
  worker-32 handover). Hash recorded in the planner's follow-up bookkeeping
  commit.

## #111. (open, 2026-09-28, plan28 feedback review; pre-approved — small doc/prompt batch) doc/prompt friction batch from the plan28 review
- **Problem / evidence:** three small pre-approved doc items from the
  feedback review that are NOT in the prompt/spec docs yet: (1)
  ideas.md 2026-09-22_12-03 — the worker "burned 10k tokens and 6.5 minutes
  to decide to look up how others" referenced the git hash in his closing
  commit (happens nearly every time); the task-spec doc carries the
  commit-hash DoD RULE (codified 2026-09-22) but the worker prompt has no
  short working example of the closing-commit message form (what goes in,
  what the hash line says — "hash recorded in the planner's follow-up
  bookkeeping"); (2) agent_feedback 2026-09-27_15-55 — a probe-comment
  syntax slip survived to the ~2-min gate run: a cheap `node --check
  .opencode/plugin/probes/handover_probe.mjs` after each probe edit batch
  would catch token slips early; (3) agent_feedback 2026-09-26_15-13 — the
  intercept smoke's module-state flip (the second factory call re-points
  module state to proj2) is easy to miss on a fresh read: a header-level
  note in the smoke file naming the before2/read2 convention for sections
  after the R8 config-read block (~L712).
- **Desired outcome:** the three one-liner doc fixes in place (worker
  prompt commit-message example; `node --check` line in the test-gate doc;
  smoke header convention note).
- **Acceptance criteria:** the three lines present (worker prompt,
  `repo_testgate.md` or the worker prompt, the intercept smoke header);
  no behavior change.
- **Suggested scope:** `.opencode/agent/prompts/agents/prompt_agent_task.md`,
  `.opencode/agent/readme/repo_testgate.md`,
  `.opencode/plugin/tests/intercept_observer.smoke.mjs` (header comment only).
- **Status:** LANDED (plan29, 2026-09-28, planner-29 planner-direct —
  pre-approved, no behavior change): (1) worker prompt `Checkpoint &
  handoff` gains the commit-message worked example (subject + ~3 body
  lines; the hash NEVER in the commit — `LANDED` (hash recorded in the
  planner's follow-up bookkeeping commit), the spec doc's hash DoD rule);
  (2) `repo_testgate.md` Test conventions gains the `node --check`
  probe-syntax line (run before the gate after each probe edit batch);
  (3) the intercept smoke header gains the MODULE-STATE FLIP note
  ((12f) second factory re-points the shared module state to proj2 —
  from (12f) on only `before2`/`read2` may be used). Hash in the plan29
  bookkeeping commit.

## #112. (open, 2026-09-28, plan28 ideas.md scan; pre-approved — docs) auto-resume explainer for the compaction handout + knowledge (compact, unit-by-unit)
- **Problem / evidence:** ideas.md 2026-09-24_21-13 (maintainer): "include
  infos about auto-resume in the compaction handout and system prompt —
  e.g. what unit 2 and 4 actually do, how the restart of the planner after
  compaction works, how a new planner is started; move it to knowledge
  folder together." The knowledge base has the deep-dives (vendored
  upstream reference) + our unit surface reports, but NO single compact
  "what our auto_resume plugin does, unit by unit, in 1 page" explainer —
  the compaction handout (the maintainer's draft) carries none of it.
- **Desired outcome:** one compact knowledge entry (≤ ~80 lines) — unit 1
  (skeleton/logging), unit 2 (context-limit nudge — the passive ctx-line
  suffix, what the threshold gates), unit 3 (new-planner spawn helper),
  unit 4 (liveness watchdog — the restart→spawn branch + the recovery
  continue + the lineage cap + deactivation) — each: what it does, what
  triggers it, the log lines it emits; pointer-only to the deep-dives /
  surface reports for detail. The handout inclusion itself is the
  maintainer's paste (his draft file).
- **Acceptance criteria:** the knowledge entry present (dated, pointer-
  only); the unit descriptions spot-checked against auto_resume.ts (no
  stale hook names); the handout inclusion noted in the summary as
  maintainer-pending.
- **Suggested scope:** `.opencode/agent/knowledge/knowledge_plugins.md` or
  a new dated file in `opencode-plugins/`, `.opencode/plugin/auto_resume.ts`
  (read-only reference).
- **Status:** LANDED (plan32 unit 1, 2026-09-28, worker-32 — the dated
  explainer `knowledge/opencode-plugins/2026-09-28_auto-resume-units-
  explainer.md`, ≤80 lines, spot-checked against auto_resume.ts). The
  compaction-handout paste stays maintainer-domain. Hash recorded in the
  planner's follow-up bookkeeping commit.

## #114. (closed 2026-09-29, first fresh session in the new workspace root ses_f130ae200ffeDRuhAMKmw0N1qE — the final no-total data point; filed 2026-09-28, plan30 maintenance pass — feedback review; pre-approved class — truthfulness) the injected ctx: line's budget suffix disagrees with the ctx_gauge self-read (1 vs 5 compactions left — same session, no compaction in between)
- **Problem / evidence:** agent_feedback 2026-09-28_02-40 (planner-29): at
  session start the injected `ctx:` line read
  `SESSION=ses_f1a8a9671ffezAA9MrZmlE8YKV CTX=notAvailable | 1 compactions
  left` while the `ctx_gauge` self-read (source of truth per #103) showed
  `5 compactions left` minutes later — no compaction in between, same
  session. The two code paths (the injected nudge's budget read vs the gauge
  tool's budget read) resolve the per-session budget differently; the
  injected line even emitted the budget suffix while its own ctx read was
  `notAvailable` (the budget read ran independently of the ctx read).
- **Desired outcome:** one budget value for both surfaces — the injected line
  and the ctx_gauge tool agree; the root cause of the divergence identified
  (which file/field each path reads, why they differed).
- **Acceptance:** a next session's injected line + self-gauge show the same
  "N compactions left" (measured); the root cause recorded in the knowledge
  base (dated entry).
- **Suggested scope:** `.opencode/plugin/` (the gauge/ctx-nudge plugin that
  emits the injected line + the ctx_gauge tool/gauge core),
  `.opencode/temp/compact_budget.json` (the store both read), the knowledge
  base (dated note).
- **Status:** LANDED (2026-09-28, plan31, worker-31 — hash recorded in the
  planner's follow-up bookkeeping commit).
- **Status note (2026-09-28, plan31, planner-31): ROOT CAUSE IDENTIFIED
  (planner-measured — knowledge_plugins.md entry "Gauge budget suffix:
  no-total reads…"): a gauge read with no finished step yet (a fresh session
  at session start) resolves the model to "" (the model comes only from the
  finished-step row) → model_budget.default (=1) instead of the session's
  real cap (5) — the session row's own model column is never read. 3rd live
  data point (this session: injected "1 compaction left" vs ctx_gauge self-
  read "5 compactions left", same session, no compaction between). FIX
  DELEGATED (worker spec plan31_ho_task.md — session-row model as the
   no-total fallback; pins re-pinned to exercise the new behavior + keep the
   default-1 fallback pin).**
- **Live check 2026-09-28 (plan32, 4th data point):** a fresh session
  (ses_f19fdb571ffeb0aoqGGu62wbzo) carried the injected `ctx:` line
  "1 compactions left" while its ctx_gauge self-read showed "5
  compactions left" — the live host process still PREDATES the fix
  fea1cbb; live acceptance remains pending the maintainer's host restart
  (a fresh session's injected line should then read "5 compactions
  left").
- **LIVE-ACCEPTED (2026-09-29, direct ses_f15c490bdffe9KsxVC3kDdLi1K,
  post-restart):** the injected ctx line and the ctx_gauge self-read
  both read "5 compactions left" for the same session (`123085 (72%)
  REM=46915 | 5`) — the original 1-vs-5 mismatch is GONE on the live
  build (budget store restored by the maintainer). Residual: the exact
  no-total failure path (a FRESH session's first injected line) gets
  its final check on the next fresh session's first ctx line (should
  read 5, not 1) — close on that data point.

- **Final check 2026-09-29 (first fresh session in the new workspace
   root, ses_f130ae200ffeDRuhAMKmw0N1qE — CLOSING the entry):** the fresh
   session's first injected ctx line read `SESSION=ses_f130ae200ffeDRuhAMKmw0N1qE
   CTX=notAvailable | 5 compactions left` — the no-total path emitted the
   session's real cap (5), not the default 1. Both surfaces agree; root
   cause + fix history in the bullets above (knowledge entry in
   knowledge_plugins.md). CLOSED.

## #126. (open, 2026-09-30, direct session ses_f0e129deeffeqmM5rc8mpnTY2Q — live acceptance run of #120U1 after the maintainer's restart; pre-approved class — agent-usage tool fix) context_trim's in-process-only sqlite backend fails in the live host process (no spawn fallback)
- **Problem / evidence:** the first live `report` call (2026-09-30 ~15:55; the
  live process is the current build — `context_trim` IS in the live toolset,
  registration confirmed) returned `db-error: no in-process writable sqlite
  backend (bun:sqlite / node:sqlite both unavailable)`. The header design
  (`context_trim.ts` L72-79) deliberately has no spawn fallback (a "no blind
  CLI write" rule). The gauge core proves the third backend works in this
  live host: `spawn-sqlite3` via `.opencode/plugin/tools/sqlite3.exe`
  (`gauge.mjs` `DEFAULT_BACKENDS` L163, `DEFAULT_EXE_PATH` L161, the
  "PROVEN IN PRODUCTION" comment L42-44) — all live gauge reads use it.
- **Desired outcome:** `context_trim` works in the live host process
  (`report` AND `tail`), staying fail-closed when NO backend is available at
  all (no blind write).
- **Acceptance:** the existing 20/20 fixture pins stay green; 2-3 new pins
  forcing the spawn-sqlite3-only backend (report content parity with the
  in-process path on the fixture DB; a tail rewrite lands in the fixture DB;
  at least one validation rejection still fires via the spawn path); the
  standard gate green (probe 352/352 + all 11 smokes); live re-acceptance =
  the maintainer's NEXT restart (the live process lags HEAD — the planner
  runs `report` on a real session; `tail`'s live test stays the maintainer's
  throwaway-session call).
- **Suggested scope:** `.opencode/tools/context_trim.ts` (`openDb` L98-129 +
  a backend-list test hook), `.opencode/plugin/tests/context_trim.smoke.mjs`;
  reference (read-only): `.opencode/plugin/scripts/gauge.mjs` (the
  spawn-sqlite3 cascade region).
- **Status:** LANDED 2026-09-30 (worker session ses_f0d49cb6bffeNMhGpmF7O3DyjU,
  code+smoke commit `a43311a`): `openDb` chain bun→node→spawn-sqlite3 (the
  gauge core's execFileSync discipline; the tail transaction = ONE CLI
  invocation `PRAGMA busy_timeout; BEGIN; UPDATE; COMMIT;`) + the
  `setBackends` test hook; report/tail logic unchanged; fail-closed end
  kept. Standard gate green: probe 352/352 + all 11 smokes (context_trim
  25/25 — the 20 old pins + 5 forced spawn-only pins on a second fixture
  session). LIVE-ACCEPTED (`report`) 2026-09-30 post-restart — the planner
  ran a live `report` on a real session (ses_f0e129deeffeqmM5rc8mpnTY2Q):
  a valid window map via the spawn-sqlite3 fallback, no db-error (code unit
  a43311a). LIVE DEBUG (2026-09-30/10-01, the forked test session): two
  further live-only failures found and fixed in the planner's direct
  session — (1) the TAB separator arg is whitespace-collapsed in the
  Bun-compiled live host's Windows command-line join → CLI arg shift →
  interactive mode → the deterministic 2500 ms kill (the gauge's
  separator-less call worked live — same exe, same ro-URI; fixed:
  `\x01` SOH separator, live-verified post-fix: the fork report reached
  the big query and produced output); (2) the 1 MB SPAWN_MAX_BUFFER was
  too small — the report pulls the window's part JSON through the CLI
  (measured: fork 1271 KB, main 921 KB of parts) → ENOBUFS (fixed:
  16 MB + a >1 MB smoke pin + stderr on the timeout error; smoke
  26/26). 16 MB build loaded on the maintainer's 2026-10-01 restart:
  **`report` LIVE-ACCEPTED** (valid window map: marker + retained=31 +
  post-summary=51 on the fork).   `tail` live WRITE was blocked by a
  live-process-specific RW hang — MECHANISM FOUND: the tail SQL
  inlined a JSON.stringify literal (double quotes); Bun's Windows
  command-line join mangles double-quote-bearing argv (same family as
  the TAB collapse) → the CLI loses its SQL arg → interactive mode →
  the deterministic 2500 ms kill (the report's single-quote-only SQL
  works live; the identical call 19 ms from bash with correct quoting;
  the 81 MB stale WAL ruled out; the fork's DB layer checked —
  bun:sqlite static import works there, semaphore-scoped short
  executes, no transaction across tool execution, so the earlier
  deadlock candidate is withdrawn). FIX LANDED (2026-10-01): the
  single-field edit now happens INSIDE sqlite via json_set (JSON1,
  bundled CLI 3.53.4 verified) — only the new tail_start_id binds, the
  SQL text carries no double quotes; smoke 26/26 (byte-exact JSON
  output via both the in-process and the spawn path). **tail LIVE-
  ACCEPTED** (2026-10-01, json_set build): the rewrite returned
  `tail= msg_0f46d581… -> msg_0f46d58e… keep=6`; DB readback confirms
  the part row carries the new tail_start_id (JSON byte-exact); the
  host re-derived the shrunken window — context 204k → ~169k (the
  lever; the maintainer's prediction confirmed). Floor-6 refusal:
  smoke-verified byte-exact; the live attempts were blocked by a NEW
  post-tail hang mode (report + floor-tail 2500 ms-killed after the
  successful tail, while the identical report worked live before it —
  trigger unknown; candidates: a checkpoint window under the host's
  streaming writes / an AV rescan of the just-modified DB — noted,
  not chased at the stop line).   Unit 2 UNHELD (its hold was the tail
  live test). POST-TAIL HANG RESOLVED (2026-10-01, same session): the
  pattern across all restarts was FIRST spawned CLI call per process
  succeeds, every later one 2500 ms-kills (the maintainer's "first
  call poisons the following" guess, confirmed: bash/node parents and
  the gauge's async execFile keep working — the gauge's ctx lines
  never failed). Cause: the live Bun host's execFileSync spawns only
  once per process (compiled-Bun Windows stdio-handle issue). Fix:
  the spawn path now uses the ASYNC execFile — the gauge's proven
  pattern (gauge.mjs readSpawnSqlite3) — smoke 26/26. LIVE-RE-VERIFIED
  (2026-10-01, after the restart): THREE in-process spawn calls in
  one process, all green — report ✓, report again ✓ (pre-fix: every
  call after the first 2500 ms-killed), floor-6 refusal
  `tail= rejected: retained-tail-below-floor 5` ✓ (byte-exact) —
  #120 U1 context_trim FULLY LIVE-ACCEPTED (report + tail rewrite +
  floor refusal, live + smoke). The residual fork question (dynamic
  bun:sqlite/node:sqlite imports fail in the live tool context while
  the host's static import works) stays in the todo-inbox finding.
  (The final hash rides the planner's follow-up bookkeeping commit.)
## 72. Write-scope residual hazard: new-file near-miss (maintainer decision; 2026-09-17)
- **Problem / evidence:** the write-fuzzy channel (and the pair gate) cannot
  distinguish "a mistyped path to an EXISTING file" from "a deliberately
  NEW filename that happens to sit within d<=1 of an existing sibling" —
  a legitimate new-file write (e.g. creating `file-5.txt` next to
  `file-4.txt`) can be mutated onto the sibling and overwrite it. Read
  scope has no such hazard (non-destructive). Pinned as behavior: S20
  checks 200/201 + smoke 8f (worker R2, commit 35f8143).
- **Outcome (decision needed):** accept as designed (audit lines carry
  the ORIGINAL arg — re-targeting verifiable after the fact), OR mitigate
  later with an intent signal the interceptor does not currently have
  (e.g. agent confirms the log line before the write lands — R6-era
  surface).
- **Acceptance:** your ruling recorded; if mitigate: spec'd as a follow-on
  stage (R6-adjacent), not built before approval.
- **Status:** RULING 2026-09-17 (direct session): **M1 approved** — restrict
  the implicit write-fuzzy to `edit`/`block_transfer` (no new-file intent is
  legal there → redirect is unambiguous); `write` loses the implicit channel
  (new-file IS a legal intent → every degraded outcome becomes a visible
  stray file, never a silent overwrite); the pair channel stays unchanged
  (strict existence, fail-closed). **M1 LANDED (commit 9ec4c0b, 2026-09-17,
  worker):** dispatch guard in intercept_observer.ts (write excluded from the
  fuzzy channel); S20 re-pinned (196/198 no fuzzy line, 200/201 NOT mutated +
  zero lines) + new edit counter-pins 208/209; probe 208/208, smoke 36/36,
   pytest 459+1w, ruff F=0. **LIVE ACCEPTED 2026-09-17 (post-restart one-
   shot, scratchpad fixture, torn down):** the d=1 new-file write landed
   LITERAL (zero fuzzy lines — the guard live; the d=1 sibling untouched —
   the hazard is dead) AND the `edit` d=1 typo was still corrected
   (`fuzzy scope=write … d=1 gap=inf`, no stray file). Follow-on: R7
   (segment resolver) + R8 (root re-anchoring) STAGED + design agreed
   (substitution bar approved 09-17, decision-record §5); R9 documented-
   optional. See NAP 2026-09-17 direct session.
## 64. (closed 2026-09-16, plan9 planner-direct; backfilled by the plan5 maintenance pass 2026-10-01 — the record was missing) — stale "84/84" probe baseline in `.opencode/plugin/README.md` → replaced by the curate-don't-duplicate pointer to the probe's self-annotated header total (the #58 convention).
## #123. (closed 2026-09-30, plan45 maintenance pass — scripted sweep + batch re-point + one-line annotations; body retired from TODO.md at the plan20 maintenance pass) stale pre-carve commit hashes in TODO.md / NAP status lines — batch re-point or annotate (maintenance pass)
- **Problem / evidence:** the 2026-09-29 carve (filter-repo rewrite)
  invalidated every pre-carve commit hash; status lines still cited them.
  The 4 measured DEAD revisions with known post-carve equivalents:
  `cbbebf8` (#106) -> `7a9e291`, `0c90abe` (#115) -> `60f031b`,
  `12e3262` (#114) -> `fea1cbb`, `44c50a2` (R3 import fix) ->
  `9e91878`. Full sweep over TODO.md + todo_records.md + NAP: 340 unique
  7-hex citations, 307 dead (the carve rewrote the whole history, not just
  the 4 measured), 33 alive.
- **Desired outcome:** every cited hash either re-pointed to the
  post-carve equivalent or annotated pre-carve — a future `git cat-file -e`
  never dead-ends.
- **Acceptance criteria:** a scripted sweep (`git cat-file -e` over every
  cited hash) reports zero dead revisions, or each dead one carries a
  one-line annotation; TODO.md + todo_records.md + NAP archive covered.
- **Suggested scope:** TODO.md, todo_records.md,
  `agent/handover/handover_planner.md` (compressed archive), loop-folder
  summaries (read-only annotation if stale).
- **Status:** CLOSED (2026-09-30, plan45) — the 4 verified pairs re-pointed
  inline (33 occurrences; each target script-verified on the current
  branch); the one-line pre-carve annotation landed in the headers of
  TODO.md, todo_records.md, and the NAP compressed archive, covering the
  other 303 dead historical citations; the loop-folder summaries carry
   179 dead citations (historical — not re-pointed per the read-only scope,
   covered by this entry + the TODO.md header note).
## #121. (closed 2026-09-30, plan40 planner-direct — inline, doc-only; moved verbatim from TODO.md at the plan20 maintenance pass) two stale refs in the repo_commands.md parts post-#117/#113 — fixed: (a) `agent/readme/repo_commands.md`'s FST-commands pointer now points at `projects/Free-Snap-Tap/repo/repo_commands.md` (was a self-reference); (b) the FST part's "(#113: the venv's python.exe is currently broken …)" note updated to the 3.12.9 close
## #177. (closed 2026-10-26, spec 177-U10 worker_FlashNext — SERIES: units U1-U10, one green unit per file; moved verbatim from TODO.md at the close) Rework all `agent/readme/**` parts to conform to `AGENTS.md` §Writing-and-Output-Rules
- **Problem / evidence:** maintainer 2026-10-26 (direct): "maybe we can schedule a rework of all the readme and repo files to follow the ## Writing and Output Rules of AGENTS.md" — plus the ownership ruling of the same day (agents may edit these parts). The parts carry accumulated prose (long sentences, parenthetical chains, dated asides), e.g. `repo_commands.md` §Run/test and §Handover blocks.
- **Desired outcome:** every file under `agent/readme/` conforms to §Writing-and-Output-Rules: short active sentences, one action per step, exact paths/commands preserved, uncertainty marked. No factual content lost or changed.
- **Acceptance / DoD:** per-file pass (one commit per file or per logical group): commands, paths, marker-sweep literal, and gate numbers byte-preserved; the rework diff touches wording only — spot-check greps (`grep -c "\`" <file>` sanity for command literals, `git diff --stat` wording-only); `node .opencode/plugins/probes/handover_probe.mjs` green (115/115 — the MARKER_SWEEP literal in `state_snapshot.ts` must still match the doc literal if any pin exists — check before repinning).
- **Suggested file scope (non-exhaustive):** `agent/readme/repo_overview.md`, `repo_commands.md`, `repo_custom_tools.md`, `repo_opencode.md`, `readme_proposals.md`, `readme_todo.md`, `readme_task_spec.md`, `readme_loop.md`, `readme_post_compaction.md`, `readme_research.md`.
- **Status:** OPEN — delegable docs unit, P3; decision-needed: none (order = planner's call; `repo_commands.md` first, it is the gate contract). U1 DONE (worker-45, 2026-10-26): `repo_commands.md` prose-only rework — backticked-literal before/after diff EMPTY (order kept), `^## ` heading diff EMPTY, probe 115/115 PASS; remaining `agent/readme/**` files pending (units 2+). U3 DONE (worker-48 `d101764`/`543796a`): `repo_custom_tools.md` reworded — literal diff EMPTY (42 literals), heading diff EMPTY, probe 115/115. Its NOTEs fixed planner-direct in the follow-up commit: 6 stale `.opencode/plugin/` literals repointed (3 in repo_custom_tools, 3 in repo_opencode) + the `status` token list corrected to the 6 lenient keyword->token pairs (`start`/`done`/`return`/`warn`/`info`/`correct`, `CORRECT-` was missing). NOTE 2 (stray quote) was already gone after the reword; NOTE 4 not a defect. U2 DONE (planner-direct, 2026-10-26): `repo_overview.md` prose rework — literal diff EMPTY except ONE intentional factual fix (`.opencode/plugin/` -> `.opencode/plugins/`, the singular dir does not exist); `^## ` diff EMPTY; 49->48 lines. U3 DONE (worker_FlashNext, 2026-10-26): `repo_custom_tools.md` prose-only rework — backticked-literal before/after diff EMPTY (42 literals, order kept), `^## ` heading diff EMPTY, probe `PROBE handover: 115/115 PASS`; 74->72 lines; suspected doc literals flagged as handover NOTEs, not fixed. NOTE fixes landed (planner, commit `397e22b`). U4 DONE (worker_FlashNext, 2026-10-26): `repo_opencode.md` prose-only rework — literal before/after diff EMPTY (24 grep-extracted literals + ONE grep-invisible wrapped literal `event?: (input: {…} => Promise<void>` verified intact separately), `^## ` heading diff EMPTY, probe `PROBE handover: 115/115 PASS`; 38->41 lines; NOTE: `maintainer/draft/compaction_guide/full_guide.md` literal stale (real path has `archive/`), heading typo `Onlione` unprescribable — both unfixed per wording-only rule. NOTEs fixed (planner, commit `3593cd0`). U5 DONE (worker_FlashNext, 2026-10-26): `readme_proposals.md` prose-only rework — backticked-literal before/after diff EMPTY (19 literals, order kept), `^## ` heading diff EMPTY, probe `PROBE handover: 115/115 PASS`; 41->43 lines; NOTEs: `proposals/files/` literal names a dir that does not exist, `proposals/superseded/` (exists, agent-owned) undocumented in the folder flow — both unfixed per wording-only rule; spec-example grep command named `repo_opencode.md` (copy-paste slip in spec, target was readme_proposals.md). U6 DONE (worker_FlashNext, 2026-10-26): `readme_todo.md` prose-only rework — backticked-literal before/after diff EMPTY (9 literals, order kept), `^## ` heading diff EMPTY, probe `PROBE handover: 115/115 PASS`; 29->31 lines; NOTEs: field list omits AGENTS.md's `definition of done` + `decision-needed flag`, and `todo_records.md` claim omits the FST twin `projects/Free-Snap-Tap/todo_records.md` named in the TODO.md header — both unfixed per wording-only rule; spec-example grep again named `repo_opencode.md` (same slip, target was readme_todo.md). U4 DONE (worker-48 resumed, `740b051`/`4ae5cdd`): `repo_opencode.md` reworded — literal diff EMPTY (24 literals), heading diff EMPTY, probe 115/115; its NOTEs fixed planner-direct in the follow-up commit (stale `maintainer/draft/compaction_guide/` literal -> `…/archive/…`, heading typo `Onlione` -> `Online`, `knowledge/` shorthand -> `agent/knowledge/`). Remaining `agent/readme/**`: `readme_proposals.md`, `readme_todo.md`, `readme_task_spec.md`, `readme_loop.md`, `readme_post_compaction.md`, `readme_research.md`. U5 DONE (worker-48 `b4100f2`/`08c84fe`, spec `f389223`): `readme_proposals.md` reworded — literal diff EMPTY (19 literals), heading diff EMPTY, probe 115/115. NOTE fixes in the follow-up commit: added step 9 `proposals/superseded/` (exists, was undocumented); the dead `proposals/files/` bullet replaced by `maintainer/draft/` (the scratch is there); `proposals/README.md` corrected too (`unclear_if_implemented/` + `files/` + `.opencode/maintainer/` are dead paths — measured) and the `auto-resume-*` shorthand repointed. U6 DONE (worker-48 `c967a85`/`4a1e3e0`/`6b153d1`, spec `dc29e03`): `readme_todo.md` reworded — literal diff EMPTY (9 literals), heading diff EMPTY, probe 115/115. NOTE fixes in the follow-up commit: the entry-contract field list completed to AGENTS.md's 5 fields (added definition-of-done + the decision-needed flag) and the per-project `projects/<name>/TODO.md` + `todo_records.md` twins added to §Files. Spec-template slip (grep example named the previous file — 3rd time) recorded by the worker via submit; the remaining specs name their own target. U7 DONE (worker_FlashNext, 2026-10-26): `readme_task_spec.md` prose-only rework — backticked-literal before/after diff EMPTY (8 extracted literals, order kept — incl. the 4 line-wrapped fragments proven byte-identical: `proposals/`+`, not ` pair + `info.tokens: {input, output,`+`cache.read}` pair), `^## ` heading diff EMPTY (file has zero `^## ` headings — `###` lead kept verbatim), probe `PROBE handover: 115/115 PASS`; 104->109 lines; NOTEs: the path-example literal pair shows full vs full form (truncation lost in the wrap — meaningless as written), `compact_memory check 86` example number has NO matching case in the current probe (`context_trim check 346` IS live) — both unfixed per wording-only rule. U7 DONE (worker-48 `00660e3`/`cde8209`, spec `b761e99`): `readme_task_spec.md` reworded — literal extraction EMPTY (8 tokens) + line-wrapped fragments proven byte-identical, heading diff EMPTY (zero `## ` headings, `###` lead kept), probe 115/115. NOTE fixes in the follow-up commit: the wrapped truncated-path literal rewritten to `approved/…` vs `proposals/approved/…`; the stale probe check numbers (`86`/`346`) replaced by the rule 'name the check LABEL, never the printed number' (`[355]` is the 2026-10-26 registration-shape id); the stale 'AGENTS.md commit-routine paste pending' note corrected — the paste LANDED (step 1). U8 DONE (worker_FlashNext, 2026-10-26): `readme_loop.md` prose-only rework — backticked-literal before/after diff EMPTY (97 literals, order kept), wrapped pair `grep -oE … |`+`sort -u -V …` + fenced example block proven byte-identical against the whole-file before-copy (`grep -Fxc` count 1 each), `^## ` heading diff EMPTY (7 headings), probe `PROBE handover: 115/115 PASS`; 187->188 lines; NOTEs (drift observations, claims intact): live DONE/role lines mostly carry the FULL gauge readout + agent-id role (doc form `<CTX>%/<REM>K` appears in 14/108 DONE lines — doc's OPTIONAL auto-fill note covers the rest). U8 DONE (worker-48 `04dcd75`/`adb9e16`, spec `e78cc55`): `readme_loop.md` reworded — literal diff EMPTY (97 literals, order kept; wrapped grep-pair + the fenced example block byte-proven via `grep -Fxc`), heading diff EMPTY (7 headings), probe 115/115. NOTE fixes in the follow-up commit: `counter.json` documented with the `round` key + the ROUND/MAINT channels (#171); the false 'injected ctx: line carries ITER=' claim corrected twice (the digest `## loop` line is the carrier — measured); the DONE-content form documented as the FULL gauge readout (live practice) besides the condensed form; the maintenance trigger re-keyed from iteration N to ROUND %5. U9 DONE (worker_FlashNext, 2026-10-26): `readme_post_compaction.md` prose-only rework — backticked-literal diff EMPTY (file has ZERO backticked literals both sides; all path/id literal-bearing lines proven byte-identical against the whole-file before-copy via `grep -Fxc` count 1 each), `^## ` heading diff EMPTY (zero headings both sides — STEP labels kept verbatim), probe `PROBE handover: 115/115 PASS`; 34->35 lines. NOTEs (unfixed, wording-only rule): (a) STEP 1 batch names 3 files that do NOT exist in this repo — `repo_map.md`/`repo_testgate.md`/`repo_gotchas.md` (FST-project names; the agent's "report failed paths" clause absorbs it); (b) STEP 0 label 'Queued continuation' is v1-era — #158 LANDED the FILE channel (written at verified success), so "pre-compaction continuation message" is message-authorship wording, not delivery-mechanism wording; (c) STEP 5 '(Pattern 3)' names a pattern number whose canonical list is not found under `agent/` (Pattern 3 = failed-edit retry loop in the fuzzy-numword decision record; STEP 5 means repetition-after-compaction) — the number may be misapplied. U9 DONE (worker-48 `8cd9050`/`e6f5453`, spec `2aa9a60`): `readme_post_compaction.md` reworded — the file has NO backticked literals, so the proof was the whole-file before-copy (`grep -Fxc` = 1 on every literal-bearing line), heading diff EMPTY, probe 115/115. NOTE fixes in the follow-up commit: STEP 1's 3 nonexistent paths (`repo_map.md`/`repo_testgate.md`/`repo_gotchas.md`) replaced by the real parts (`repo_custom_tools.md`, `repo_opencode.md`) + the project-trio pointer; STEP 0 relabeled `Continuation file (#158)` and states the queue is NOT used; STEP 5's bare `(Pattern 3)` now names its source `agent/research/fuzzy-numword/decision-record.md`. U10 DONE (worker_FlashNext, 2026-10-26): `readme_research.md` prose-only rework — backticked-literal before/after diff EMPTY (51 literals, order kept; no wrapped literals in this file), `^## ` heading diff EMPTY (6 headings), probe `PROBE handover: 115/115 PASS`; 64->85 lines; NOTE: Worked-example item 1 claims README.md `(21 lines)`, measured 23 — unfixed per wording-only rule. SERIES CLOSED: all 10 listed files reworked (U1-U10), one green unit each; full entry text moved to `todo_records.md`, one-line record stays here.

## #92. (LANDED 2026-09-27, 2026-09-23, planner-12 direct; his question; SMALL) pre-compaction hook should save BOTH the lossless full markdown AND a raw `--json` snapshot
- **Problem / evidence:** after #78 the hook keeps only the markdown backup. His question (2026-09-23): with raw JSON as the on-demand `--json` mode (DB-sourced), how do you get the pre-compaction JSON later — "the db is overwritten by the compacted session"? MEASURED on this session (compacted 17:32:02Z): the DB is NOT overwritten — 36 pre-compaction messages + 170 parts are still in the DB, 76 reasoning parts whole-session (the compaction summary is an ADDED assistant message, agent=compaction; planner-11's session showed the same). So on-demand `--json` of a compacted session works TODAY. BUT the DB is a live host-managed store (session deletion / pruning / migration / corruption can lose the rows) — the hook's _c0 snapshot is the only PINNED "state at compaction time" record; markdown-only forfeits the lossless source at exactly that moment.
- **Desired outcome:** every pre-compaction dump writes BOTH: the lossless full markdown (current) + a raw `--json` snapshot (the lossless master — any later filtered view re-derivable from it).
- **Acceptance criteria:** two DUMP-OK lines per dump (md + json); both files land in the archive dir; the #78 diagnostics (ms= / DUMP-RETRY= / DUMP-FAIL + stderr) + the 120 s budget + one retry apply to BOTH dumps; compact_memory smoke re-pinned; gate green.
- **Suggested scope:** `.opencode/plugin/compact_memory.ts` (the preCompactionDump call site — the dump script already has `--json`), `.opencode/plugin/tests/compact_memory.smoke.mjs`.
- **Status:** LANDED 2026-09-27 (worker-26, plan26 — per the 2026-09-27 ruling "save both"): `preCompactionDump` now writes BOTH artifacts — the lossless md (first) + the raw `--json` snapshot (the lossless master) — each INDEPENDENTLY (the same attempt → DUMP-RETRY=1 → one retry → DUMP-FAIL per artifact, the #78 120 s budget + stderr capture on both); the DUMP-RETRY=/DUMP-FAIL lines gain the artifact relFile; the hook returns `{ ok, files, error }` (files = the landed paths, md first; error = `<md|json>: <detail>` per failed artifact, joined by " | "); the no-overwrite stamp stays MD-base-driven (both artifacts share the stamped base); the dispatch call site reads only ok/error (unchanged). The probe S14 checks 104/105/106/107 re-pinned + NEW check 345 (the json naming byte-exact) — 345/345 (header self-annotated); the compact_memory smoke +2 (78/78: the json artifact exists + the json DUMP-OK line byte-exact); gate green (all smokes, pytest 459 passed + 1 warning, ruff F=0). **Closed (planner-26 bookkeeping, 2026-09-27):** commits `11f4a12` (code) / `5a6e842` (probe) / `e2a1a52` (smoke) / `86bda25` (this status + handover) — planner-verified by own re-run (probe 345/345 + compact_memory smoke 78/78, exit 0). **LIVE-ACCEPTED (planner-27, 2026-09-27, verified from files):** the first real compaction under the #92 build was the planner-27 part-2 self-compact (ctx.log 2026-09-27_15-42/15-45, ses_f1d198b41): TWO DUMP-OK lines (`…_c0.md` ms=49 + `…_c0.json` ms=50) + the COMPACT line (keep=12m tok=29498 computed); both artifacts on disk in `archive/sessions/compaction_dumps/` — the md (616,987 B, correct session/title/agent header) and the json (1,216,263 B, valid JSON, top keys `session,messages,orphan_parts`).

## #94. (LANDED 2026-09-25, planner direct; his approval 2026-09-25) block_transfer REPLACE mode — line-anchored span replacement from a buffer (edit-like, no exact oldString)
- **Problem / evidence:** edit oldString exact-match is a very regular failure (his priority.md "fuzzy matching of edit oldstring"; ideas.md L153-158: "what would be needed to make block_transfer as versatile as edit but less prone to oldstring mismatch?"); block_transfer PASTE is insert-only (append after targetMarker / EOF) — a slot/region replacement needs a MOVE+DELETE composition (two calls, intermediate state); the 2026-09-24 slot-clobber incident (agent_feedback) showed PASTE-as-slot-replacement is a trap.
- **Desired outcome:** one atomic call replaces the line-anchored span (short unique line-prefix anchors — no exact oldstring, no whitespace sensitivity) with the named buffer content; the return string reports what was replaced (perceptibility — the caller cannot see its own args after the call).
- **Acceptance criteria:** smokes 30/30 + 53/53 (from 22/52); probe S15 = 12 checks, total 259; standard gate green; the tool description documents REPLACE; a knowledge note appended.
- **Suggested scope:** `.opencode/tools/block_transfer.ts`, `.opencode/plugin/tests/block_transfer*.smoke.mjs`, `.opencode/plugin/probes/handover_probe.mjs` (S15), `agent/knowledge/plugin_tools/`.
- **Status:** LANDED 2026-09-25 (worker, `worker_Q3S_170K`): `REPLACE` mode in `.opencode/tools/block_transfer.ts` (enum + the dispatch branch next to PASTE + the description MODES/ANCHORS/BUFFERS/EDGE text) — the line-anchored span (short UNIQUE line prefixes, `startsWith`, non-unique → an error naming the cause, start..end INCLUSIVE, start ≤ end) of an EXISTING dstFile is replaced atomically by the named buffer (REPLACE never creates a file; the buffer is preserved, PASTE semantics; all checks before any fs write; the return reports the 1-based line span + counts); smokes re-pinned 30/30 (+8) + 53/53 (+1); probe S15 = 12 checks (+262/263), probe total 259/259 (header totals machine-updated); gate green (pytest 459 passed + 1 warning, ruff F=0); knowledge note appended at `agent/knowledge/plugin_tools/2026-09-25_block_transfer.replace_mode.md`. (Commit hash recorded in the planner's follow-up bookkeeping commit — no self-reference.) The broader fuzzy-oldstring track (anchor-based fuzzy oldString resolution + the edit/write journal dump per his ideas.md L146-150 + the priority.md fuzzy_numword items) is a SEPARATE track awaiting design ruling.

## #95. (CLOSED 2026-09-28, plan28 maintenance pass; was open, 2026-09-25, planner direct; his rulings 2026-09-25) fuzzy edit-oldstring track — PARENT entry (replaces the stale #67 references — that ID never existed in the committed TODO.md) (TODO.md body moved 2026-10-29 maintenance pass 1 — the close record above is the one-line record)
- **Problem / evidence:** edit oldString exact-match failure is a very regular problem (his priority.md "fuzzy matching of edit oldstring" + ideas.md L143-158); the #94 worker's anchor-semantics drift finding is queued here (todo_inbox 2026-09-25). Track state: R1/R2 live, R4/R7 landed, R6 STAGED (gate cleared), R3 STAGED, R8 + the escape return-info not staged.
- **Sub-items (order):** (1) R6 as-is (pre-approved per its spec: payload journal + edit hints, observation-only); (2) the MUTATING edit-fuzzy (design pinned below — spec at launch); (3) R3 (gate CLEARED by his ruling 2026-09-25 — bitdrift retired, no correction data, R4 mining retired; absorbs the anchor-drift fix: existing block_transfer modes `includes` + no unique-check → startsWith+unique per #94); (4) R8 sandbox redirect + escape return-info.
- **Pinned design for (2) (agreed 2026-09-25 direct):** oldString miss → the R6 content-locator candidates (anchors = distinctive lines of the oldString) → **normalize BOTH sides before comparing** (`\r\n`→`\n` + strip per-line trailing whitespace) → d=0 normalized → mutate oldString to the file's exact bytes (the CRLF/LF + trailing-whitespace class is unbounded in length — a proportional bar like 1-in-100 REJECTED: a 40-line CRLF drift = 39 chars, far beyond any proportional cap, while normalization removes it exactly); d≤1 normalized → mutate ONLY on exactly-one candidate (typo tolerance, the #72/M1 strict bar); else fail-closed + the edit-hint line; mandatory log line kind=fuzzy-edit orig=/value= (his return-info ruling); no auto-retry beyond the mutation; the R6 journal stays the recovery fallback.
- **Acceptance:** per sub-item (each spec at launch); overall: a controlled CRLF-drift edit and a single-typo edit both resolve without agent action (log evidence), gate green at each landing.
- **Suggested scope:** `.opencode/plugin/intercept_observer.ts` (+ core), `.opencode/plugin/tests/`, `.opencode/plugin/probes/handover_probe.mjs`, the `research/fuzzy-numword/` specs.
- **Status:** LANDED 2026-09-26 (all four sub-items: (1) R6 acb6323;
  (2) edit-fuzzy 15761d8+78b68e7; (3) R3 3ec1c5c/9e91878/20d5a48;
  (4) R8 + return-info #97 07bdd56/0d9b8e6). Live acceptances
  2026-09-26 (plan22): the grep/glob pair + bash quoted-form R3 channels
  live-accepted (worker-22) + the #97 Windows-root redirect form
  (planner spot-check); the section-anchor + bt anchor-marker channels
  NOT live-verifiable — ROOT CAUSE: the live opencode process was
  restarted DURING the 14-26 incident, before the R3 import fix 9e91878
  landed, so both anchor channels throw the swallowed
  `LOCATOR_MAX_FILE_CHARS is not defined` ReferenceError live (planner
   spot-check: a pair-form startMarker reached the tool VERBATIM + the
   `intercept-error` log line); the section-anchor channel is additionally
   shadowed by the integer `offset` schema (constrained decoding — the
   worker's 7/7 integer-1 observation).
   2026-09-26 (plan23, planner-23, post-restart): the re-test — the
   import-fix 9e91878 is now LIVE (canary: anchor channels run clean, zero
   new `intercept-error` lines). (b) the bt anchor-marker PAIR channel is
   LIVE-ACCEPTED — the pair-form `startMarker` reached the hook VERBATIM +
   resolved (`pair=[7:seven] canon=7 dist=0 gate=mutated line=2 arg=
   startMarker ... pair-resolved`, 2/2; the log is the authority — the
   tool return shows only the post-mutation canonical form, correcting the
   plan22 "model can't emit pairs" reading as a MEM-0101 false-repeat).
   (d) the section-anchor channel stays schema-shadowed — `read.offset` is
   integer-typed, so constrained decoding never delivers a string anchor
   (the worker's 7/7 integer-1 stands); the pure resolver remains
   probe-pinned (S31 check 319) while the live channel is dormant on this
   host. R3's live acceptance is now COMPLETE for this model class (the
   four channels: grep/glob pair + bash quoted-form + bt anchor-marker
   pair live-accepted; section-anchor pinned-only).
   2026-09-25 (autorun, ses_f29afbb66ffeRM1EHgBIpTwTg5, planner-14): his
  GO for sub-item (2) — the normalize-then-compare design is CONFIRMED
  (his words: better than the proportional distance rule; go ahead) +
  two directives folded into the (2) spec: (a) resolutions AND failed
  resolutions are LOGGED — every attempt, the line carries the best-
  candidate d (a near-miss d<10 is visible; no d bar on logging),
  (b) the return feedback does NOT carry the full oldstring (context
  saving — a truncated identifier: first ~40 chars + length + d +
   target; the full payload stays in the R6 journal). R6 (sub-item 1)
   LANCHED (worker_Q3S_170K, spec plan14_ho_task.md).
   2026-09-25 (autorun, ses_f29afbb66ffeRM1EHgBIpTwTg5, planner-14,
   post-compaction): sub-item (1) R6 LANDED + planner-verified from file
   evidence (the worker's close-out died silently — the state was
   committed from the working tree): content-locator `locateContent`
   (VERDICTS 11) + the payload journal (journal_write.log /
   journal_edit.log) + the edit-hint channel (edit-hint /
   edit-ambiguous / no-candidate) + the after-hook enrichment (live
   acceptance restart-gated) + the DoD machine check. Gates: probe
   279/279 (baseline 259 + S26's 20), intercept_observer smoke 48/48,
   pytest 459+1w, ruff F=0. Docs: the plugin README recovery protocol +
   decision-record §8.1 addendum. Next: sub-item (2) the edit-fuzzy spec
   (normalize-then-compare).
   2026-09-25 (worker ses_f27bb616dffe8yue93zR3sEwHs, worker_Q3S_170K,
   resumed post-compaction): sub-item (2) the MUTATING edit-fuzzy
   oldString (normalize-then-compare) LANDED: `runEditFuzzy` supersedes
   the R6 hint path for the 0-raw-occurrence case — exactly-one
   candidate at d=0/d≤1 → oldString MUTATED to the file's exact unique
   bytes + the `fuzzy-edit` line (VERDICTS = 12; NO after-hook hint);
   else FAIL-CLOSED (the R6 verdict carrying the best-candidate d —
   directive a; the after-hook hint stored). Directive b: the feedback
   line truncated (first 40 + ...), the journal's edit `old` = the
   ORIGINAL pre-mutation oldString. Code commit 15761d8; the probe/docs
   commit hash is in the worker handover (the planner records it in the
   follow-up — no self-reference). Gates: probe 287/287 (baseline 279 +
   S27's 8; the S26 re-pins 271/275/276), intercept_observer smoke 55/55
   (from 48/48), pytest 459+1w, ruff F=0. Docs:
   spec_sub2_edit_fuzzy_oldstring.md + decision-record §8.2 addendum.
    Next: sub-item (3) R3 (gate cleared — absorbs the anchor-drift fix).
   **CLOSED (plan28 maintenance pass, 2026-09-28):** all four sub-items
   LANDED 2026-09-26 — (1) R6 `acb6323`, (2) edit-fuzzy `15761d8`+`78b68e7`,
   (3) R3 `3ec1c5c`/`9e91878`/`20d5a48`, (4) R8 + return-info `#97`
   `07bdd56`/`0d9b8e6` — + the R3 live-acceptance is COMPLETE for this
   model class (plan23 2026-09-26 re-test: grep/glob pair + bash quoted-
   form + bt anchor-marker pair live-accepted; section-anchor pinned-only,
   schema-shadowed — see the status text above). Entry complete; full text
   now in `todo_records.md`.

## #98. (LANDED, 2026-09-25, worker-16; Parts A+B implemented + smoke re-pinned, Part C not-applicable per the planner ruling) unit-4 resume-after-compaction: line-anchor the action regex (A) + re-arm on COMPACT (B) + prompt note (C)
- **Problem / evidence:** `proposals/approved/2026-09-23_unit4-
  compaction-resume.md` (his `--comment` "approved A, B and C") —
  verified NOT implemented 2026-09-25: `ACTION_RE` (auto_resume.ts
  L267) is still the unanchored `/action:\s*(restart|resume|stop|
  ask_maintainer)/g` (a prose-quoted action line still drives routing —
  the live-verified 2026-09-23 20:14Z mis-route) and there is NO
  ctx.log `COMPACT` tail-read in the tick (a landing compaction is
  silent → the unit-4 recovery-continue promise is non-deterministic).
- **Desired outcome:** per the proposal — Part A: `action:` matches only
  at line start (`/(^|\n)\s*action:\s*(…)/g`, last match still wins);
  Part B: on the 5s tick, tail-read `.opencode/temp/ctx.log` for NEW
  `COMPACT <sid>` lines → `idlePending = true` + `recoveryCount = 0`
  (fresh budget — the context situation changed); Part C: the Work
  State dump form should not quote a literal `action: restart` in
  prose (prompt-text note — planner-as-text-worker, workers have no
  prompt edit access).
- **Acceptance:** per the proposal: smoke pin A (a last assistant
  message with a PROSE-quoted mid-line `action: restart` →
  `lastAssistantAction` null; a standalone line → "restart"), smoke
  pin B (a synthetic ctx.log `COMPACT` line for a watched sid → re-armed
  on the next tick), standard gate green; LIVE: the next self-compact
  → idle cycle routes from the real close (no mis-spawn from a quoted
  line) + a `recovery=`/`route=` line follows the `COMPACT` line
  WITHOUT a user message in between.
- **Suggested scope:** `.opencode/plugin/auto_resume.ts` (L267, the
  tick), `.opencode/plugin/tests/auto_resume.smoke.mjs`; Part C =
  prompt text (planner, not the worker).
- **Status:** LANDED (worker-16, 2026-09-25, commit 4f90218 Part A +
  cf7e6f5 Part B) — Part A: `ACTION_RE` line-anchored (NON-capturing
  `(?:^|\n)` — group 1 stays the action word); Part B: the 5s tick
  tail-reads `.opencode/temp/ctx.log` for NEW `COMPACT <sid>` lines
  (module-level `ctxLogOffset` cursor, partial-line hold-back,
  never-throw) → for a WATCHED sid: `idlePending=true` +
  `recoveryCount=0` BEFORE the routing loop (the silent-compaction gap
  closed). Smoke 139/139 (133 baseline + 6 new: A1/A2/B1/B2/B3 + the
  section re-factory chk; 17 scripted closing texts re-pinned to
  own-line action lines — the pins' routing assertions unchanged).
  Standard gate green: pytest 459 passed + 1 warning, ruff F=0, probe
  291/291 (no probe pin breakage — the existing probe pins use
  standalone `action:` lines). LIVE acceptance (the next self-compact
  routes from the real close; a `recovery=`/`route=` line follows the
  `COMPACT` line WITHOUT a user message in between) = PENDING live
  observation. Part C: not-applicable (the Work State dump form was
  removed in the 2026-09-24 rework — the planner records it in the
  handover).

## #100. (LANDED 2026-09-26, plan18, worker-18 `worker_Q3S_245K_slow`, commit bc374b2; direct session 2026-09-25; maintainer GO 2026-09-25) remove the numword escape channel — bit-drift solved backend-side, the escape's use-case is gone
- **Problem / evidence:** the escape sentinel (`[<incident>:<safe-form>:esc]` in
  write/edit content → the digits, the `kind=escape` channel) existed to
  protect dense values from model bit-drift. Bit-drift no longer occurs
  (maintainer, direct session 2026-09-25: "the bitdrift problematic is
  solved as of now"). It fulfills no usage right now and makes fuzzy-channel
  development more cumbersome (every write/edit change must respect the
  escape path).
- **Desired outcome:** the escape channel is gone (code + pins) while the
  fuzzy track's positive parts stay fully intact: the pair channel
  (R1/R2 — right-side numwords → digits), the shared numword map
  (`agent/scripts/numword/numwords.json`), the dense/numword
  observation logging, the R6/R7/R8 channels. The Unit-2 (#97) noteCache /
  after-hook note delivery STAYS (the R8 redirect notes ride it).
- **Scope (agreed, direct session 2026-09-25):**
  - core: `ESCAPE_RE`, `EscapeHit`, `resolveEscapeSafe`, `resolveEscapes`
    (`intercept_observer_core.ts` ~L445-506)
  - plugin: `runEscapeContent` + the `onToolBefore` wiring + the
    `pre-escape=` journal extension (`appendJournal`'s escapeForms param)
    + the `kind=escape` log lines
  - tests: the escape pins (intercept smoke: ~24 escape grep hits incl.
    13a-13d; probe: ~45 grep hits) — removed; one 13-style note-delivery
    pin repurposed to the R8 redirect note (the note mechanism stays)
  - knowledge: the primer `agent/research/fuzzy-numword/primer.md`
    → new `agent/knowledge/fuzzy-numword/primer.md` (escape
    section annotated removed 2026-09-25) + the subfolder README (≤20
    lines) in the SAME commit; NOT into AGENTS.md (his ruling)
  - DO-NOT-touch: the pair channel, the map, R1/R2/R6/R7/R8,
    auto_resume / compact_memory / context_recovery / block_transfer
    plugins, FST code, `maintainer/**`
- **Acceptance criteria:** standard gate green; zero escape code paths
  (grep-clean for `ESCAPE_RE` / `runEscapeContent` / `kind=escape`); the
  pair/fuzzy pins unchanged; the note mechanism still delivers the R8
  redirect notes (smoke pin); the primer present in knowledge/ with its
  README; `numwords.json` untouched.
- **Interaction:** #95 sub-item (3) R3 is UNAFFECTED (still blocked on his
  GO — a separate unit).
- **Status:** LANDED (2026-09-26, plan18, worker-18
  `worker_Q3S_245K_slow`, commit bc374b2): escape channel removed
  (core + plugin + journal extension + pins); grep-clean; smoke 64/64,
  probe 297/297 (baseline 303 − the 6 S24 pins), pytest 459+1w, ruff F=0;
  the 13-style note pins repurposed to the R8 redirect note (mechanism
  stays covered); primer moved to `knowledge/fuzzy-numword/` (+ README,
  escape section annotated removed); numwords.json untouched.

## #101. (LANDED 2026-09-26, explorer ses_f24bf71beffekwRYMtnlrWy5UG, commit 1081e52; GO 2026-09-25 direct) opencode host map — one-time explorer task: map the installed host internals so planner/worker LOOK UP instead of re-deriving
- **Problem / evidence:** every task re-pays the derivation cost of opencode host facts (SDK v1/v2 shape, plugin hook surface, session/message/part DB schema, permission system, the compaction/summarize path) — knowledge is gathered per task, not accumulated as a map (maintainer observation 2026-09-25: "we derive the same knowledge often again and again").
- **Desired outcome:** a durable, dated host map in the knowledge base of the relevant installed opencode internals (with file/line locators); upstream (web) research delegated to the explorer (cost in its context, finding → knowledge base); the planner reads installed types for VERIFICATION only.
- **Scope (suggested):** explorer task → new `agent/knowledge/opencode-plugins/host-map.md`: SDK surface (v1/v2 endpoints from the installed .d.ts), plugin hook registration + ordering, session/message/part DB schema, permission / external_directory mechanics, the compaction/summarize path, tool registration; every entry dated + locator.
- **Acceptance criteria:** the map covers the areas above with locators verified against the installed build; the knowledge folder/README rules are followed; planner spot-check: one host question answered from the map alone.
- **Status:** DONE (explorer 2026-09-26, ses_f24bf71beffekwRYMtnlrWy5UG) — the map is at `agent/knowledge/opencode-plugins/host-map.md` (all 6 areas, dated + located; 6 open/unverified items listed there).

## #102. (LIVE ACCEPTANCE COMPLETE 2026-10-21, planner-12 sweep — the 2026-09-26 maintainer live report + re-verified on the new model: intercept.log 2026-10-21_21-01 + 22-56 carry `kind=redirect tool=bash arg=command orig=/tmp/bt_probe.cjs value=home/AppData/Local/Temp/opencode/bt_probe.cjs | path | pair-resolved`; LANDED 2026-09-26, plan20, worker-20 `worker_Q3S_245K_slow`, commit be07ce6) R8 redirect extension: map the POSIX `/tmp` (and `/var/tmp`) root into the sandbox — unmappable forms STOP the loop
- **Problem / evidence:** maintainer live report (2026-09-26, autorun session):
  "worker keep trying to access the temp/tmp folder directly and are
  stopping the loop repeatedly." Log evidence: `intercept.log` line 4668
  (2026-09-26_07-55, S2 worker `ses_f23d1afbaffeUSeabbt0aArOdj`) — the
  Windows-Root form (`home\AppData\Local\Temp\bt_smoke_out.txt`)
  WAS redirected 1:1 (`kind=redirect ... value=home/AppData/
  Local/Temp/opencode/...`) — that case WORKS since #97. The POSIX `/tmp/...`
  form (Git-Bash habit; S1 worker friction entry 2026-09-26: "/tmp under
  Git-Bash resolves outside the sandbox") has NO 1:1 mapping onto an allowed
  root -> R8 fails closed -> the permission gate STOPS the session until the
  maintainer intervenes. Worker prompt bullet added (scratchpad discipline,
  2026-09-26) as the immediate mitigation; this unit is the structural fix.
- **Desired outcome:** POSIX `/tmp/<rest>` (and `/var/tmp/<rest>`) map 1:1
  onto the scratchpad root `home\AppData\Local\Temp\opencode/<rest>`
  — redirected + logged (`kind=redirect` line) BEFORE the call runs, for ALL
  tools incl. the bash `command` string; no new out-of-sandbox access is ever
  granted (redirect only, never an allow-widening); unmappable forms still
  fail closed.
- **Acceptance criteria:** a controlled `/tmp/x` write+read (bash + a typed
  tool arg) is redirected, the file lands in the sandbox, and the
  `kind=redirect` line carries orig=/value=; a no-mapping path still fails
  closed; probe pins per the established pattern; standard gate green.
- **Suggested scope:** `.opencode/plugin/intercept_observer_core.ts`
  (the redirect resolver / root mapping), `.opencode/plugin/
  intercept_observer.ts` (allowed-root resolution from opencode.jsonc),
  `.opencode/plugin/probes/handover_probe.mjs`, the intercept smoke.
- **Status:** LANDED (2026-09-26, worker-20 `worker_Q3S_245K_slow`, commit
  be07ce6): the POSIX temp-root prefix mapping (core `resolveRedirect` — a
  CODE constant, root-list-independent: `/tmp/<rest>` + `/var/tmp/<rest>` →
  scratchpad root, full remainder kept; bare root → the root itself) + the
  BASH `command`-string redirect (same resolver over the mapped POSIX spans;
  unmapped spans fail-closed, the note stays) + pins (smoke 64→68, probe
  297→305 — the new S29 section, checks 297-304). Measured: smoke 68/68,
  probe 305/305, pytest 459+1w, ruff F=0. **LIVE ACCEPTED 2026-09-26
  (plan22, worker-22 ses_f21bb91c):** both forms redirected 1:1 — bash
  `kind=redirect … orig=/tmp/plan22_acc.txt value=C:/…/Temp/opencode/
  plan22_acc.txt` + the write-tool form (`orig=/tmp/plan22_acc2.txt`); both
  files landed in the scratchpad with correct content (entry complete).

## #103. (LANDED 2026-09-27, plan27 part 2; was: maintainer instruction in direct fork session ses_f20b3bf14ffedWHp2HGajHmGLN) fix the ctx gauge readout semantics — it lags the live context by one generated turn
- **Problem / evidence:** the ctx gauge reads `input + cache.read` of the LAST FINISHED assistant step — verified 2026-09-26 by exact matches (61,298 = 78 in + 61,220 cr of the last finished row; 32,507 = the summarizer row). Because it excludes `output`, the readout sits one generated turn below the live context → the documented "≈2 tool-call lag" (AGENTS.md §Context budget, role prompts, compaction guide) is STRUCTURAL, not measurement noise. Full field semantics: `agent/knowledge/knowledge_inbox.md` entry 2026-09-27 (S-continuity, fork-robustness, gauge semantics).
- **Desired outcome:** the gauge readout ≈ the live context within one tool call (e.g. read `input + output + cache.read` of the last finished step, or the in-flight step's recorded input when available), OR the lag note in all docs is replaced by the verified exact semantics if the maintainer rules the current behavior acceptable.
- **Acceptance criteria:** after one known small turn, gauge readout differs from the last finished step's S (input+output+cache.read, DB-verifiable) by < 1k tokens; the lag wording in AGENTS.md / role prompts / compaction guide updated to the measured semantics; gauge smoke re-pinned.
- **Scope (suggested):** FIRST locate the gauge source — it is NOT in the repo (`.opencode/**/ctx_gauge*` glob empty; check the live `opencode.jsonc` tool registration + the referenced file, maintainer domain if host-side); then the one-metric change + doc updates + smoke pin.
- **Status:** LANDED (2026-09-27, plan27 part 2, planner-27 planner-direct — GO per his in-session ruling; the approval-boundary ruling pre-approves agent-usage-facing improvements): the gauge core now reads **ctx = TOTAL (in+out+cr)** of the last FINISHED step (was total−output — the structural 2-turn lag is gone; the readout now lags the live context by ONE generated turn: the in-flight step's output, not yet in the DB) — `gauge.mjs` gaugeFromRaw + header; probe S6/S7/S12 re-pinned (FX_OK readout CTX=12345 (4%) REM=243655; ses_fx_old CTX=12345 (10%) REM=107655) + S8/S9 fixture rows rebuilt to the new semantics (total = the intended readout value); gauge_core smoke re-pinned (R_OK ctx 12345); probe 345/345 + gauge_core + ctx_gauge 3/3 + io 77/77; lag wording updated in the role prompts + repo_custom_tools + the ctx_gauge tool description (AGENTS.md + the compaction guide are his files — noted for his paste, NOT edited). Hash in the plan27 bookkeeping commit.

## #104. (LANDED 2026-09-27, plan27 part 2; was: worker-25 plan25 — doc/code discrepancy found while landing the bt anchor fix) S31 drift-guard equivalence note is stale in the anchor-trim dimension: the block_transfer tool's `matchAnchorLines` now trims leading whitespace from the ANCHOR (plan25 b), while the plugin core's `matchAnchorPrefixLines` still uses the anchor as typed
- **Problem / evidence:** plan25 fix (b) changed `.opencode/tools/block_transfer.ts` `matchAnchorLines` (leading spaces/tabs on the anchor stripped; an all-whitespace anchor matches nothing), but the S31 drift guard (probe check 318, handover_probe.mjs ~L7244-7262) asserts EQUIVALENCE with `.opencode/plugin/intercept_observer_core.ts` `matchAnchorPrefixLines`, and its comment claims both implement "the S1 unified rule, 0d85a8c" — the comment is now wrong in the anchor-trim dimension. The guard's fixtures use only no-leading-whitespace anchors ("Dup", "h1"), so the probe stays green (344/344) and would NOT catch the two matchers re-diverging in this dimension. The core's own pin (check 317: `m("  beta") === []`) still pins the core's as-typed behavior — the core was deliberately left unchanged (out of plan25 scope; an R3-gate behavior change is a maintainer call).
- **Desired outcome:** either (1) extend the S31 check-318 fixtures with a leading-whitespace anchor and pin the INTENDED relationship (equivalent after a matching core-side trim, or intentionally different with the comment corrected), or (2) correct the S31 comment to state the equivalence holds except in the anchor-trim dimension.
- **Acceptance criteria:** check 318's fixtures distinguish the anchor-trim behavior (a fixture where a leading-whitespace anchor resolves differently in the two matchers), or the comment states the exact intended relationship; probe green.
- **Scope (suggested):** `.opencode/plugin/probes/handover_probe.mjs` (S31, checks 317/318); `.opencode/plugin/intercept_observer_core.ts` ONLY if the maintainer rules the core should match the tool's new rule (observable behavior change — approval needed); `.opencode/tools/block_transfer.ts` (doc-only if the comment route is chosen).
- **Status:** LANDED (2026-09-27, plan27 part 2, planner-27 planner-direct — GO per his in-session ruling: "a removal of friction (like the mismatch in #104)"; the new approval-boundary ruling pre-approves agent-usage-facing improvements): option (a) taken — the core `matchAnchorPrefixLines` now MIRRORS the tool's plan25-b anchor-side trim EXACTLY (an anchor typed with the line's indentation matches; an all-whitespace anchor matches nothing) — the S31 equivalence is restored in the trim dimension; probe check 317 re-pinned (`"  beta"` → [2,3,5] + all-whitespace anchor → []) and check 318 gains the `"  Dup"` drift fixture (pre-fix it would have diverged: tool [2,3] vs core []); headers updated; probe 345/345 + intercept_observer smoke 77/77 (hash in the plan27 bookkeeping commit).

## #106. (LIVE ACCEPTANCE COMPLETE 2026-10-21, planner-12 sweep — hint lines verified live on BOTH models: `hint rejected reason=no-anchor-line` (2026-10-15_22-57 + 2026-10-21_21-55) + `hint rejected reason=d-too-high best-d=7 / best-d=798` in intercept.log; the APPLIED side observed in-session (this session's edit returned `fuzzy-edit applied orig=... len=123 d=1`); LANDED 2026-09-28, plan31 unit 2, worker-31; pre-approved class — agent-usage friction removal) edit-fuzzy hint line should state APPLIED vs REJECTED
- **Problem / evidence:** agent_feedback 2026-09-26_12-15 (planner): a NAP
  edit returned `hint reason=d-too-high best-d=24` yet the edit WAS applied
  (the file carried the new text) — the hint reads like a rejection, so an
  agent may uselessly retry/verify; the R6/edit-fuzzy hint channel does not
  state whether the fuzzy resolution was APPLIED (and at what d) or
  REJECTED.
- **Desired outcome:** the edit-hint / edit-fuzzy feedback line distinguishes
  APPLIED (carrying the resolved d) from REJECTED (carrying the best
  candidate d) — one unambiguous token per outcome.
- **Acceptance criteria:** the line format carries the outcome token;
  affected smoke/probe pins re-pinned (the hint lines are byte-pinned);
  standard gate green.
- **Suggested scope:** `.opencode/plugin/intercept_observer_core.ts` (the
  hint construction) + `intercept_observer.ts` (the edit-fuzzy feedback
  line), `.opencode/plugin/tests/`, `.opencode/plugin/probes/handover_probe.mjs`.
- **Status:** LANDED (worker-31, 2026-09-28, plan31 unit 2 — spec ea730f9):
  the mutating edit-fuzzy evidence now reads
  `fuzzy-edit applied orig=<t40> len=<n> d=<0|1> value=<t40>` and is
  STORED + DELIVERED on the (successful) tool result (the delivered
  edit-hint line is no longer failure-only); every fail-closed / ambiguous
  hint evidence now reads `hint rejected …` (existing fields unchanged);
  the outcome token makes every delivered edit-hint line self-describing;
  NO verdict-table change; `locateContent` / `resolveEditOldString`
  untouched. Pins re-pinned: intercept_observer smoke (10e/10f/10g/10h +
  11a-11f) + ONE new check (10h2 — the mutating edit-fuzzy delivers the
  `fuzzy-edit applied` line on the successful result) — smoke 77 → 78;
  probe S20-203 + S26 271-276 + S27 277-284 re-pinned (check count
  unchanged — the header tally stays 346). Measured: intercept_observer
  smoke 78/78; probe 346 checks = 335 PASS + the 11 pre-existing
  environmental numword-python failures 136-146 (#113, not regressions);
  all other smokes unchanged (auto_resume 140/140, compact_memory 78/78,
  context_recovery 17/17, block_transfer 131/131 + 64/64, gauge_core,
  ctx_gauge 3/3, loop_log 69/69, submit 23/23); ruff F=0; pytest
  UNRUNNABLE (#113 — not attempted). Hash recorded in the planner's
  follow-up bookkeeping commit (a worker commit cannot carry its own hash).

## 107. (closed 2026-09-28, plan35 maintenance pass — LANDED 2026-09-28 plan29 planner-direct; full text in todo_records.md) — the DUMP-OK / DUMP-RETRY / DUMP-FAIL ctx.log lines carry the FULL repo-relative dump path (`.opencode/archive/sessions/` + name, shared `DUMP_ARCHIVE_REL` constant — a live acceptance is a single `ls`); probe S14/S25 + the compact_memory smoke's two DUMP-OK pins re-pinned

## 108. (closed 2026-09-28, plan35 maintenance pass — LANDED 2026-09-28 plan29 planner-direct; full text in todo_records.md) — the #96 (c) trim-restore fixture's 10 pairs are now built programmatically (the `L(i)` charCode loop) + a PAIR-COUNT assert (a dropped pair fails instantly with the count); auto_resume smoke 140/140

## 109. (CLOSED 2026-10-21, planner-12 sweep — LIVE-ACCEPTED 2026-10-01: the two `loop/autorun-2026-10-01_03-27/loop_log.md` lines 40 + 46 (`-WARNING auto_resume ... silent limit-stop: finish=length ... no-COMPACT`, 13-38 + 18-43 local); the header annotation was stale — plan10 had already triaged it closed; LANDED 2026-09-28, plan33 unit 1, worker-33; was: 2026-09-28, plan28 ideas.md scan; research → design) silent context-limit stops carry NO signal — a worker dying at the wall without self-compaction returns an empty result with no log line
- **Problem / evidence:** ideas.md 2026-09-25_18-01 (maintainer) + the
  submit feedback in that entry: a worker session that stops at the context
  wall WITHOUT triggering a self-compaction returns only an EMPTY Task
  result (no error, no Work State, no loop-log line) — recovery required
  full file forensics (git log + status + in-progress handover). MEASURED
  twice: the 2026-09-25_18-01 episode + MEM-0104/0109 (limit deaths where
  the signal is a failure MESSAGE — the silent variant is worse: not even
  that).
- **Desired outcome:** a SILENT limit-stop becomes visible — either a
  plugin-side detection (the auto_resume tick or a hook checks the DB/gauge
  for a session whose last step is a limit stop — `reason=length` /
  `tokens.total` at the window — with NO ctx.log COMPACT line → a
  `-WARNING` loop-log line + optionally a compaction dispatch) or a
  result-channel stop reason. Design the cheapest reliable detector first.
- **Acceptance criteria:** a research note with the chosen detector design
  (where it hooks, what it reads, the false-positive risk) + a small build
  spec (or a maintainer call if the design touches observable behavior).
- **Suggested scope:** `.opencode/plugin/auto_resume.ts` (the tick) or
  `.opencode/plugin/compact_memory.ts` (the dispatch path),
  `agent/scripts/db/` (the step-meta read), the research doc in
  `agent/research/`.
- **Status:** RESEARCH DONE (plan32 unit 2, 2026-09-28, explorer-32 —
  doc `agent/research/2026-09-28_silent-limit-stop-detector.md`):
  the detector = a zero-IO `limitStopCheck()` leg in the auto_resume 5s
  tick — signature = last assistant finish `length` + `tokens.total` ≥
  0.99 window + 60 s silence + idle + no NEW COMPACT line since the death
  step + in-scope (role-agent prefix `planner/worker/explorer` OR
  scope≠none — KEY FINDING: Task-tool workers carry `scope= none`, so a
  scope-only gate would never fire); visibility = a `-WARNING` line
  appended directly to the looprun's `loop_log.md` (the loop_log tool is
  agent-facing; the plugin writes the file); build spec sketch in doc §5
  (6 smoke pins, ~90-130 lines, ~0.5-1 day; detector + -WARNING =
  pre-approved agent-usage class; a compaction DISPATCH on detection =
  maintainer call).
- **Status:** LANDED (plan33 unit 1, 2026-09-28, worker-33): the
  detector is built per the research doc — the zero-IO `limitStopCheck()`
  leg in the auto_resume tick (5 new `Watch` fields; the 5-clause
  signature verbatim from doc §2; leg order = AFTER `tailCompactRearm`,
  BEFORE the routing loop, own try/catch); fire = ONE `-WARNING` line per
  episode appended to the current looprun's `loop_log.md` (the plugin
  writes the file itself — `auto_resume` in the role slot, the shared
  `currentLoopFolder()` resolution — no folder → `auto_resume.log`
  only) + ONE `limit-stop= sid=… total=…` line in `auto_resume.log`; NO
  action on the session (no dispatch/send/resume — that part stays a
  maintainer call). Verification: auto_resume smoke 140 → 146 (6 pins;
  the 60 s silence gate tested with a global `Date.now` warp — no real
  60 s waits); every other smoke at baseline UNCHANGED (block_transfer
  131/131 + 64/64, intercept_observer 78/78 — the spec DoD's "77" is
  stale, the baseline was already 78 since #106 `7a9e291`, compact_memory
  78/78, context_recovery 17/17, submit 23/23); probe 346 = 335 pass +
  11 ENVIRONMENTAL #113 failures 136-146 (`No Python at python312` — the
  venv NOT fixed, per spec: MAINTAINER CALL); ruff F=0; the pytest half
  of   the standard gate is BLOCKED by #113 (exit 103, reported in the
  handover, not fixed). (Commit hashes recorded in
  the planner's follow-up bookkeeping commit — no self-reference.)
  **LIVE-ACCEPTED (plan10, 2026-10-04, verified from files):** two live
  firings in the post-build process — `limit-stop= sid=ses_f0999d65…
  total=230144` (auto_resume.log 2026-10-01T11:38:17Z) + `limit-stop=
  sid=ses_f07be53e2… total=170240` (16:43:52Z), each followed by its
  `-WARNING auto_resume … silent limit-stop: finish=length … no-COMPACT`
  line in `loop/autorun-2026-10-01_03-27/loop_log.md` (13:38 / 18:43 local)
  — the detector + the loop-log visibility channel both fired as
  designed. Entry complete.

## 110. (closed 2026-09-28, plan35 maintenance pass — LANDED 2026-09-28 plan32 unit 1, worker-32, 3a5de39; full text in todo_records.md) — per-plugin / per-tool README files for `.opencode/plugin/` + `.opencode/tools/` (9 READMEs, each ≤ ~60 lines, pointer-only, hook names spot-checked against the code) + the two folder-README index lines

## 111. (closed 2026-09-28, plan35 maintenance pass — LANDED 2026-09-28 plan29 planner-direct; full text in todo_records.md) — doc/prompt friction batch: the worker-prompt closing-commit worked example (the hash NEVER in the worker's commit) + the `node --check` probe-syntax line in repo_testgate.md + the intercept-smoke module-state-flip header note

## 112. (closed 2026-09-28, plan35 maintenance pass — LANDED 2026-09-28 plan32 unit 1, worker-32, f406a20; full text in todo_records.md) — the compact auto-resume units explainer `knowledge/opencode-plugins/2026-09-28_auto-resume-units-explainer.md` (units 1-4, the 14 log tokens, pointer-only; the compaction-handout inclusion = the maintainer's paste)

## #115. (LANDED, 2026-09-28, plan34 idle-lane — agent_ideas.md triage, idea 1; pre-approved class — bookkeeping reduction; worker-34 landed — the code commit's hash is recorded in the planner's follow-up bookkeeping commit) the gauge window is config-first: root opencode.jsonc `limit.context` beats the name marker (parseWindow is the fallback)
- **Problem / evidence:** `gauge.mjs` `parseWindow` (L242-250) derives the
  context window ONLY from a trailing `<N>K`/`<N>M` marker in the model id —
  a model rename (or a backend limit move without a marker update) → window
  UNKNOWN → the readout loses `(pct%)/REM` on BOTH surfaces (the injected
  ctx: line via ctx_watchdog + the ctx_gauge tool — the shared
  `gaugeFromRaw`). The declarative source of truth already exists: the live
  `opencode.jsonc` declares `provider.<pid>.models.<mid>.limit.context` per
  model (e.g. "Qwen3.8-27B-Q3S-245K-slow" → 245000, L111-114). The auto_resume
  saturation path already resolves limits via `client.provider.list()`
  (`getModelLimits`, auto_resume.ts L478) — only the gauge surfaces use the
  name parse. Origin: agent_ideas.md 2026-09-28_01-22 idea (1) (from the
  maintainer's ideas.md 2026-09-23_04-53 + 2026-09-22_17-41 — "derive the
  context limit from opencode.jsonc instead of the model-ID name, so the
  model can be renamed freely without syncing name→limit").
- **Desired outcome:** a model rename no longer degrades the gauge readout —
  the window resolves config-first (the root opencode.jsonc `limit.context`),
  with the existing name-marker parse as fallback.
- **Acceptance criteria:** the config-first chain pinned in the gauge_core
  smoke (config hit beats the name marker; no-marker model + config →
  config value; not-in-config / missing config / no provider prefix → the
  parseWindow fallback; a JSONC (comments) config parses, incl. a `//`
  inside a string literal); the `formatGauge` readout format UNCHANGED (the
  existing fixture bytes identical); standard gate green (probe self-
  annotated total + the other smokes at baseline + ruff F=0; the pytest
  half is BLOCKED by #113 — reported, not fixed); the dated knowledge
  one-liner appended (knowledge_plugins.md).
- **Suggested scope:** `.opencode/plugin/scripts/gauge.mjs` (the new
  `resolveWindow` + the per-call config read + the `setConfigFileForTest`
  hook + the string-aware JSONC strip per auto_resume.ts L1098
  `parseJsonc`), `.opencode/plugin/tests/gauge_core.smoke.mjs`,
  `.opencode/plugin/tests/ctx_gauge.smoke.mjs` (re-pin only if affected),
  `.opencode/plugin/probes/handover_probe.mjs` (re-pin only if affected),
  `agent/knowledge/knowledge_plugins.md` (one-liner).
- **Status:** LANDED (plan34, 2026-09-28, worker-34
  `worker_Q3S_245K_slow`, code **60f031b** — gauge.mjs: replicated
  string-aware `parseJsonc` + exported `resolveWindow(modelId)` (config-
  first, first-`/` provider split, per-call root-config read, never-throw)
  + `setConfigFileForTest` hook; `gaugeFromRaw` switched; 7 new resolveWindow
  pins (a)-(f) in gauge_core.smoke.mjs, existing pins unchanged) —
  planner-verified: own gauge_core ALL PASS + ctx_gauge 3/3 re-runs + the
  live byte-identity readout (CTX=155274 (63%) REM=89726 — window 245000 =
  config value); probe 346 = 335 PASS + 11 #113 env fails (no re-pin needed);
  ruff F=0; pytest blocked #113. Live note: the running host process still
  predates this build — the gauge surfaces pick it up at the maintainer's
  next restart (no visible change until then: config 245000 == the current
   model's name marker).

## #117. (LANDED 2026-09-29, worker ses_f12b5172dffeq1r2iwK4QLlWxj, final 7c5d623; direct session — ruling "per project folder is enough") reorganize the agent-repo bookkeeping into per-project folders (projects/<name>/)
- **Problem / evidence:** post-carve, the agent repo will hold
  per-project bookkeeping flat (root TODO.md / todo_inbox.md /
  todo_records.md, `agent/handover/`, repo docs,
  knowledge/research) — with multi-project use ahead ("other repos
  will be added and worked on in the future"), bookkeeping must be
  organized per project; additionally every .md under
  `agent/` auto-registers as an opencode agent type
  (measured ~90 phantom Task-tool agent entries in the live agent
  list).
- **Desired outcome:** a per-project bookkeeping layout in the agent
  repo (`projects/Free-Snap-Tap/`: TODO.md, todo_inbox.md,
  todo_records.md, handover/, the repo doc set; the shared agent
  prompts stay under `agent/prompts/`) and the Task-tool
  agent list reduced to the real role prompts.
- **Acceptance:** the layout is in place; ALL path references updated
  in one pass (role prompts, the AGENTS.md copy, `tools/submit.ts`,
  `tools/loop_log.ts`, repo docs, probe/smoke geometry where touched);
  gate green; the moved .md folders no longer appear as Task-tool
  agent types.
- **Suggested scope:** the agent repo (post-carve),
  `agent/{handover,knowledge,research,memory,scripts}`,
  `.opencode/tools/submit.ts`, `.opencode/tools/loop_log.ts`,
  AGENTS.md (copy protocol), the repo docs.
- **Status:** LANDED 2026-09-29 (worker session ses_f12b5172dffeq1r2iwK4QLlWxj — final commit 7c5d623): the five folders (agent/archive/loop/maintainer/proposals) at root with R-rename history kept, all active code/docs re-pointed in one pass, `projects/Free-Snap-Tap/` built (TODO.md, todo_records.md, repo/), staged replacements at root — his apply + the prompts reorg followed (b4adfd1/529bdb5/7b41b5d, he did #118 himself). Gate: probe 335/346 (11 = #113 env, no venv) + 10/10 smokes + summarize smoke green; grep gate clean (hits = allow-list + maintainer domain + live config only); planner re-ran the full gate after his post-landing reorg/link-fix (green) and re-pinned the 10 filename-form smoke pins his full-path replace missed (87a0487). Follow-up: #118 (internal prompts restructure, post-move) — CLOSED, done by the maintainer.

## #118. (closed 2026-09-29 — DONE by the maintainer himself: 529bdb5 prompts reorg (agent_readme_* → agent/readme/readme_*, repo docs → agent/readme/, roles/ → prompts/addition/, prompt_agent_* → agent_*, skill/ in place) + 7b41b5d repo-wide link fix + b4adfd1 staged-config apply; he kept the readme_ prefix — deviation from the requested prefix drop) internal restructure of the prompts/ tree post-reorg: move the agent_readme_* files into an `agent/readme/` folder and drop the prefix (e.g. `agent/readme/loop.md`); re-home `prompts/skill/` (dynamically loaded — not a prompt component like agent/role prompts); restructure the `prompts/agents/` layout; decide the placement of the repo content (repo docs)
- **Problem / evidence:** maintainer's message 2026-09-29 (direct,
  ses_f130ae200ffeDRuhAMKmw0N1qE): "I only contemplate to move the
  readme/readme_* files into an extra readme folder and remove the
  agent_readme_ prefix ... same with prompt/skill folder (dynamically
  loaded — not a part of a prompt like agent prompts or role prompts).
  generally will restructure the prompts/agents folder a bit after
  movement. unsure of the best placement for repo content though."
- **Desired outcome:** a tidier prompts/ tree with stable paths; all
  `{file:}` pointers in opencode.jsonc + prompt self-references +
  AGENTS.md updated in one pass (same staging protocol as #117).
- **Acceptance:** new tree in place; all references updated; agents load
  the correct prompts after a restart (live check); no phantom-agent
  growth (the .md files stay outside the `.opencode/` agent-registration
  namespace — unaffected post-reorg).
- **Suggested scope:** `agent/prompts/**` (readme/, skill/, agents/,
  repo/), opencode.jsonc (staged replacement), AGENTS.md (copy), active
  prompt self-references.
- **Status:** CLOSED 2026-09-29 — done by the maintainer (see title); the planner's layout-proposal step became unnecessary.

## #119. (LIVE ACCEPTANCE COMPLETE 2026-10-21, planner-12 sweep — `.opencode/temp/compact_budget.json` today still carries the non-session keys (`autoCompact`, `nudge1-4`, `saturationThreshold`, `keepTokens`...) alongside the session counters (key survival verified live on the new build); LANDED 2026-09-29, direct session ses_f11b625d3ffeio02fDzjzypbN2, planner-direct; found mid-#117 worker run) compact_memory's budget increment rewrites `.opencode/temp/compact_budget.json` as a v2 sessions-only file, destroying all other keys
- **Problem / evidence:** the #117 worker's self-compaction rewrote the file: the committed v1 config (autoCompact, saturationThreshold, outputReserve, keepTokens, keepMessages, emergencyRecovery, emergency_budget, model_budget map) was replaced by a v2 `{version:2, sessions:{…}}` file (measured via git diff; the rewrite landed 2026-09-29 14:05Z). Consequence: the worker's model cap silently fell to the DEFAULT 1 mid-run (its next compaction attempt was refused: "model_budget default (cap 1), used 1/1") and the planner session's injected budget line dropped 5 → 1.
- **Desired outcome:** the budget increment is read-modify-write — all pre-existing keys survive; only the `sessions` map changes (additively).
- **Acceptance:** a compaction event leaves a `compact_budget.json` diff with ONLY the sessions block changed; a compact_memory smoke check asserts non-session-key survival across an increment on a pre-seeded v1-style config (model_budget + emergency_budget present).
- **Suggested scope:** the budget-increment write path in `.opencode/plugin/compact_memory.ts` (+ `compaction_core.ts` if shared), `.opencode/plugin/tests/compact_memory.smoke.mjs` (survival pin).
- **Status:** LANDED 2026-09-29 (direct session ses_f11b625d3ffeio02fDzjzypbN2,
  planner-direct — pre-approved class): `readBudget` in
  `.opencode/plugin/compaction_core.ts` now returns the parsed object AS-IS
  (every pre-existing top-level key survives — the file is shared with the
  compaction config) and only normalizes the `sessions` map (absent / wrong-
  typed → fresh empty map); the `version` bump to 2 still lands on the first
  write (recordSuccess). Root cause confirmed: the committed config file had
  NO `sessions` block → the old lenient read fell through to the fresh v2
  object → the first increment rewrote the whole file. Pin: compact_memory
  smoke +2 (80/80) — the config-only file (autoCompact / saturationThreshold /
  outputReserve / keepTokens / keepMessages / emergencyRecovery /
  emergency_budget / model_budget, no sessions block) survives an increment
  with ONLY the sessions block changed + the version bump. Gate: probe = 335
  PASS + 11 #113 env, all 10 smokes green. Live note: the running host process
  carries the old code until the maintainer's next restart (the next real
  compaction under the new build shows the config keys surviving).

## #123. (closed 2026-09-30, plan45 maintenance pass — scripted sweep + batch re-point + one-line annotations) stale pre-carve commit hashes in TODO.md / NAP status lines — batch re-point or annotate (maintenance pass); full text in todo_records.md (body retired at the plan20 maintenance pass) (TODO.md body moved 2026-10-29 maintenance pass 1 — the close record above is the one-line record)


## Loop & coordination (open)

## 53. (closed 2026-09-23, planner-13 bookkeeping; full text in todo_records.md) — Agent-feedback protocol: the mandatory close-down friction step (Part A, 5e29cb0, all 4 role prompts) + the `submit` write-tool (Part B, b83b34f + session/role autofill 86a977f); maintainer-domain tail closed (registration live in the role toolsets, AGENTS.md paste LANDED 2026-09-18, machine-stamped entries firing in live sessions since).

## 56. (DEFERRED 2026-09-15, maintainer `--defer` in priority.md) — Distillation worker runs over the session dumps (his # 3 3 mandate)

- **Problem / evidence:** the 137-session corpus (`archive/sessions/`,
  backfilled 2026-09-15) is the basis for distilling session history; the
  maintainer deferred the runs 2026-09-15 ("to much work right now") while
  focusing on the proposal/inbox backlog (his #0).
- **Desired outcome (his # 3 3, verbatim gist):** test different distillation
  workers on session dumps — gemma4 workers (`worker_gemma_Q4_128K` /
  `agent_gemma_Q4_128K`, much faster, parallelizable) with a WIDE range of
  scanning perspectives, compared against qwen runs (4x slower); roles/
  skillsets to keep track of them; document what is found; also usable to
  recover the last messages of a failed worker.
- **Acceptance criteria:** when the deferral lifts — ≥2 perspectives run on
  the same dump with ≥1 gemma and ≥1 qwen model; a written comparison (what
  each model found, quality, cost); findings worth keeping in the knowledge
  base; the skillset/roles documented for reuse.
- **Suggested scope:** `skill_session_scan.md` (ALREADY BUILT, plan1 —
  perspectives P1 FRICTION / P2 DECISIONS / P3 KNOWLEDGE + output format);
  `archive/sessions/` (read-only dumps); the `worker_gemma_Q4_128K`
  + `worker_Q4_120K` roster; a comparison notes file in the loop folder.
- **Status:** DEFERRED — picked up only when the maintainer lifts the
  `--defer` marker in `priority.md` (# 3 3) or re-prioritizes it.
  **Still DEFERRED 2026-09-27 (direct session ses_f20d1b39…) — REWORK
  PENDING before any runs: the idea is to be clarified first — per-agent-
  type distill (planner/worker/explorer/…) gathering friction points +
  undocumented knowledge/memory (behaviors, repeatedly re-derived
  methods/tricks) into per-agent memories (memories not yet seeded for all
  roles); the gemma speedup is nullified by cache invalidation on every
  model switch (the planner re-prefills per delegation) → gemma only for
  preliminary scanning. The `--defer` stays. Re-verified 2026-10-01 (plan1 maintenance pass): still DEFERRED (the deferral marker is unchanged; the rework is still pending before any runs).**

## Plugin & gauge (open)

## #124. (LANDED 2026-09-30, plan46 worker-46; curated from todo_inbox worker-45 new-hire test; pre-approved class — agent-usage friction removal) block_transfer return-line / description clarity: the 3 new-hire friction findings
- **Problem / evidence:** the plan45 new-hire test (worker-45
  ses_f0fad3537ffe6BVZbeAUPPkoxi — battery 10/10 PASS, 0 escapes, the tool
  source never read) found 3 description/return gaps (full text in
  `todo_inbox.md` 2026-09-30_05-25 entries; scratch evidence
  `.opencode/temp/bt_newhire_plan45/`): (1) PASTE/REPLACE/WRITE returns
  report the source span / buffer range + a `first:` field but never the
  destination insertion line, and `first:` mixes old-span range with
  new-content first line; (2) the non-unique-anchor error lists ALL match
  lines (2 → both) but the description says "the first match line numbers"
  — ambiguous at scale; (3) a failed COPY/CUT leaves no buffer (PEEK →
  "empty") — the description is silent. Same run, same unit (optional):
  the PEEK head/tail overlap note on small buffers + the blank-line
  adjacency after MOVE/DELETE (residual blank line stays).
- **Desired outcome:** a new hire can predict every return line and error
  from the description alone; PASTE reports where it landed (description
  or return — the build's call inside the DoD).
- **Acceptance criteria:** description updated (per-mode return-shape
  block: range semantics + `first:` label + the PASTE destination line +
  buffer-on-failure + all-match-line error listing); if any return line
  changes, the bt smoke pins re-pinned (131/131 + 64/64 baseline) + the
  standard gate green.
- **Suggested scope:** `.opencode/tools/block_transfer.ts` (description +
  possibly the PASTE return line), `.opencode/plugin/tests/
  block_transfer.smoke.mjs` (re-pin if behavior changes).
- **Status:** LANDED 2026-09-30 (plan46, worker-46 — description-only
  build call, zero behavior change, no re-pins): new RETURN LINES
  paragraph in the `block_transfer` description (per-mode range semantics:
  PASTE = buffer's own 1..N; REPLACE = the replaced old span, N = old lines
  removed; MOVE/CUT/DELETE = the source span; WRITE = the pre-call span,
  N = new text lines; COPY/APPEND = resolved span / selected refs / text
  1..N; `first:` always the NEW/extracted content's first line, capped
  ~40 chars; `- buffer: M` = the count AFTER the op; destination landing =
  after the targetMarker line or appended at EOF — the return line names
  the file but not the insertion line) + the bounded non-unique error form
  (match count + FIRST 3 match line numbers — all of them when 3 or fewer,
  " …" appended when more) + buffer-on-failure note (a failed COPY/CUT/
  APPEND leaves NO buffer; a later PEEK/MAP returns the empty-buffer
  error) + the optional item 4 notes (PEEK head == tail overlap on small
  buffers; residual blank-line adjacency after MOVE/CUT/DELETE). Gate
  green: probe 352/352 + bt smoke 131/131 + sandbox 64/64 + all other
  smokes ALL PASS (the description-only change broke no pin — the
  sandbox-smoke description pins re-verified green in the same run).
  (Commit hash recorded in the planner's follow-up bookkeeping commit —
  no self-reference.)

## #125. (closed 2026-09-30, plan48, planner-48 inline — all 8 items LANDED, zero behavior change; gate probe 352/352 + all 11 smokes green) #86 audit LOW findings batch: 7 inline/stale code refs + 2 doc-only duplicates
- **Problem / evidence:** the #86 read-only audit (explorer-47 ses_f0f768f33,
  plan47 — handover in `agent/handover/handover_task_to_planner.md`, full
  per-finding detail in the `plan47 TODO #86 cluster A-D` todo_inbox entries,
  2026-09-30) found 11 findings; the 2 med ones are already fixed
  (61cd616: BUSY_TIMEOUT_MS dedup + ctx_watchdog nudge-ladder constants;
  f7f4100: the role-prompt index stale refs from the explorer's
  observation). Remaining (all low): (1) .opencode/tools/loop_log.ts:127 —
  description example `Qwen3.8-27B-IQ4KT-120K` is not a live model id → a
  live id (e.g. Qwen3.8-27B-Q3S-170K) or a neutral example; (2)
  .opencode/tools/submit.ts:34 + :141 — comment example
  `planner_Q3S_245K_slow` is a stale agent name → `planner_Q3S`; (3)
  .opencode/plugin/auto_resume.ts:1536 — inline `0.99 * window`
  (limitStopCheck #109 condition 2) → named constant
  (LIMIT_STOP_WINDOW_RATIO); (4) auto_resume.ts:1538 — inline `60_000`
  idle threshold (#109 condition 3) → named constant; (5)
  auto_resume.ts:1885/1887 — inline `20MiB`/`2MiB` log-size defaults →
  named constants; (6) auto_resume.ts:1901 — inline `5000` tickMs default →
  named constant; (7) auto_resume.ts:173-177 — the "OVERLAP-ERA CAVEAT"
  note describes the RETIRED looprunner_Q3S (commented out in the live
  opencode.jsonc) as if live → update/remove; (8) doc-only: the opencode.db
  path is defined 5x in the standalone agent/scripts/db/*.cjs CLIs +
  gauge.mjs DEFAULT_DB_PATH, and HOST_EXE 2x in agent/scripts/binary/
  {binwin,binhits}.cjs → document the single source of truth (no shared
  .cjs helper unless wanted).
- **Desired outcome:** every inline literal named/deduplicated, the stale
  examples and the retired-looprunner note current — zero behavior change.
- **Acceptance criteria:** grep-clean for the stale example strings and the
  five inline literals (named constants in place); the caveat note removed
  or reworded to the retired state; standard gate green (smokes + ruff F=0,
  the #113 env-fail exclusion applies); no smoke pin changes expected (the
  values are unchanged).
- **Suggested scope:** the files named above; worker-delegable as one small
  cleanup unit (spec names each literal + its replacement).
- **Status:** CLOSED 2026-09-30 (plan48, planner-48, inline): (1)
  loop_log.ts example → Qwen3.8-27B-Q3S-170K; (2) submit.ts comment
  example ×2 → planner_Q3S; (3)–(6) auto_resume.ts literals named
  (LIMIT_STOP_WINDOW_RATIO / LIMIT_STOP_IDLE_MS / MAX_LOG_BYTES_DEFAULT
  / LOG_TAIL_BYTES_DEFAULT / TICK_MS_DEFAULT); (7) the OVERLAP-ERA
  CAVEAT reworded to the retired-looprunner state; (8) the
  agent/scripts/README.md machine-path single-source-of-truth note.
  No smoke pin changes (values unchanged); ruff/pytest do not apply in
  this repo (post-#117 split — the standard gate = probe + smoke
  suite). The 2 med findings of the same audit were already LANDED
  (61cd616).

## 74. (closed 2026-09-27, direct session ses_f20d1b39… — backend no longer on ik_llama, the offending PR was reverted — non-issue; full text in todo_records.md) — **Write tool fails on long content payloads on this host**

## 65. (closed 2026-09-17, maintainer-ruled — NOT a tool bug, see todo_records.md for the full entry if needed) — loop_log tool folder-detection bug: spurious folders on the maintainer-renamed loop folder (2026-09-16, plan2)

## 66. (closed 2026-09-23, planner-13 bookkeeping; full text in todo_records.md) — 5.3+5.4 restart acceptance was stale: the read-scope mutation channel was proven LIVE by #68's one-shot live-acceptance (2026-09-17); the §5.4 sentinel torn down; intercept.log accumulated to 3076 lines / 139 sessions by 2026-09-23.

## 67. (closed 2026-09-28, plan30 maintenance pass — R3 build LANDED 2026-09-26 (3ec1c5c/9e91878/20d5a48, gate 337/337 + io 77/77) + live acceptance COMPLETE 2026-09-26 (plan23 re-test: grep/glob pair + bash quoted-form + bt anchor-marker pair live-accepted; section-anchor pinned-only, schema-shadowed — dormant by design on this host; see #95 closed status)) — Fuzzy scope extension: glob / grep / section-anchor resolvers (2026-09-16, plan2 queue)

## 70. (closed 2026-09-28, plan30 maintenance pass — all units LANDED + live-accepted: unit A 6864bc0 (2026-09-21) + unit B d4ef76e (2026-09-22); live acceptance 2026-09-21 (DUMP-OK PASS + config resolution; the cross model-read bug found+fixed 280b8d0 + re-accepted); the requested research-spec follow-on superseded by the #99/#101/#105 research tracks) — compact_memory rework: config-resolved summarizer + queued message + dump diagnostics (2026-09-16, new priority.md item; re-scoped 2026-09-21 by his priority.md #1)


## Closed entries

Moved to `todo_records.md` on 2026-09-10 — one-line records, IDs 2, 5, 10, 12, 13, 14, 15,
16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32 (+ the 260908-0951 dedup block).
All those IDs stay reserved — see the numbering rule in the header.

## (closed 2026-09-15, the first commit after f4de326, worker-16) — Smoke-harness build: the tool/plugin smokes moved from the scratchpad into `.opencode/plugin/tests/` (7 smokes + shared `_smoke_base.mjs` + README, all green; gates 99/99 + 459 passed + ruff F=0) per `approved/2026-09-15_smoke-harness-home.md` — the cm_v2 + qc smokes folded into `compact_memory.smoke.mjs` (assertions adapted to the 2026-09-14 fire-and-forget build, no source change) and the `context_recovery` smoke pinned to the deactivated plugin file (attribution verified).

## 34. (closed 2026-09-10, see todo_records.md) — Stale `peek.py` documentation refs + worker prompt permission block

## 36. (closed 2026-09-09, see todo_records.md) — `agents_repo.md` `Environment & shell` — wrong/stale lines (lab-verified, fixed)

## 54. (closed 2026-09-16, plan8 planner-direct; maintainer call 2026-09-12) — Rule: never circumvent access restrictions; blocked-file protocol for agents

## 55. (closed 2026-09-17, live-accepted in direct session ses_f4f539d7c…; maintainer call 2026-09-15) — `compact_memory` needs a dump function of the current session

## 57. (closed 2026-09-16, worker-8, plan7/iter7; 2026-09-15, worker T1 block_transfer sandbox, curated plan3) — block_transfer MOVE silently deletes a block when `dstFile` is missing

## 58. (closed 2026-09-16, plan8; 2026-09-15, script-collection worker, curated plan3) — standard gate definition lacks the probe command

## 59. (closed 2026-09-16, plan6; 2026-09-15, script-collection worker, curated plan3) — session-corpus refresh cadence

## 60. (closed 2026-09-16, worker-9, plan7/iter7; 2026-09-15, planner plan5) — `block_transfer` + `loop_log` lack probe pinning

## 63. (closed 2026-09-16, plan7 worker-7; finding 2026-09-15 worker-5, planner plan5) — compact_memory smoke: 4 failures at HEAD (dump-hook sandbox gap)

## 62. (closed 2026-09-16, planner plan6) — LANDED (planner-direct): all three lines present in BOTH role prompts — (1) compaction is NOT a restart (recent messages INTACT, summary auto-created, re-read only the named head files), (2) above 90 % → EMERGENCY handover + commit + self-compact IF budget available, (3) above 95 % → commit + self-compact, DO NOT DELIBERATE while budget remains (`keepMessages` keeps the last N messages INTACT) — in `prompt_agent_planner.md` §Context-budget trigger and `prompt_agent_task.md` §Context-budget trigger + §compact_memory. Adjacent stale-ref fixes rode the same commit: stopline proposal name → `2026-09-15_agents-knowledge-stopline.md`, `dump_session.cjs` path → `scripts/db/`.

## 61. (closed 2026-09-15, planner plan5; title reworded plan6) — probe baseline corrected: post-S14 baseline is one-zero-six, not the plan3/plan4-era nine-four

## 76. (closed 2026-09-21, plan1, planner-direct; finding 2026-09-21 worker_Q3S_160K auto-resume UNIT 1 gate run, via todo_inbox.md) — stale classifier pin in `handover_probe.mjs`: check [87] expected `iq3`→1 but the `compact_memory.ts` classifier (the 2026-09-21 quant-class budget ruling) returns 3 → probe pin updated to 3; probe 235/235 green. Pre-existing (the probe references no UNIT 1 file; `compact_memory.ts` untouched).

## 77. (closed 2026-09-21, plan3, planner-direct; finding 2026-09-21 worker-3 UNIT 3 gate run, via todo_inbox.md) — stale description pin in `block_transfer.sandbox.smoke.mjs`: line 53 expected the "Housekeeping rule … instead of write/edit" sentence that the maintainer's commit `ff4c2fc` (2026-09-18) deliberately dropped from the `block_transfer` description → pin re-pointed to the new first sentence (the one-liner); smoke 52/52 ALL PASS. Pre-existing since ff4c2fc (worker-3 verified by stash; the Unit 3 commit touches neither file).

## 78. (closed 2026-09-28, plan30 maintenance pass — LANDED 2026-09-23 (6b33907, per his 2026-09-23 ruling "go for 1 + 2, plus 3+4 unified": --json raw mode + lossless full markdown + --lite preset + hook 120 s budget / pipe stderr / one retry; planner-verified: --json spot-check 70 msgs / 337 parts exact-match the live DB)) — Dump completeness: the session dumps filter out parts (thinking/writing) (2026-09-21, planner; his --info note in priority.md)

## 79. (closed 2026-09-23 - live-accepted, full text in todo_records.md) - auto_resume Unit 4 msgPairs never unwrapped the SDK { data } wrapper -> action lines were NEVER recognized (spurious recovery prompts / context drain); fixed eaef397 (dual-shape unwrap + ses_u4_wrap smoke) + LIVE ACCEPTED 2026-09-23 (route= restart spawn for a valid action: restart on both builds: v=24972ebd 12:52:39Z + v=d2b9d510 13:00:08Z, no recovery= lines for the sid)

## 75. (open, 2026-09-21, planner) — **Build our own auto-resume plugin** (opencode-auto-resume research, Phase 3 seed).
- **Problem / evidence:** the looprunner is a mechanical relay; the maintainer wants infinite direct planner sessions (his ideas.md item 2026-09-18). Three measured gaps: no auto-resume after compaction, no auto compaction trigger on context limit, no auto-restart on `action: restart`. A working reference exists and is vendored in-repo (opencode-auto-resume v1.1.16, v1-era API surface, verified compatible with our opencode-ai@1.18.31).
- **Desired outcome:** a plugin in `.opencode/plugin/` that keeps a direct planner session running through compaction and restart without the looprunner.
- **Acceptance criteria:** the four-unit acceptance list in `proposals/2026-09-21_opencode-auto-resume-plugin.md` (unit 1 = skeleton logging plugin/testbed; unit 2 = context-limit compaction trigger; unit 3 = auto-resume after compaction; unit 4 = restart detection + new planner; each unit leaves the repo green).
- **Suggested scope:** `.opencode/plugin/auto_resume.ts` (new), `knowledge/opencode-plugins/` (surface report append), the proposal file itself. Units are independently approvable, strict build order.
- **Status per unit** (full unit history in `todo_records.md` — appended by the 2026-09-23 curation):
  - Unit 1 (skeleton logging plugin/testbed): LANDED + planner-verified; LIVE ACCEPTANCE PASSED post-restart (init `surface=` line + live event lines; verdict in the unit-1 surface report).
  - Unit 2 (context-limit compaction trigger, `d90973b`): LANDED + planner-verified; the live `statusOf` shape bug found in live acceptance + fixed; LIVE re-acceptance PENDING the next host restart (`arm=` lines verified live; saturation/trigger pending a natural 85 % crossing).
  - Unit 3 (new-planner spawn helper): LANDED + smoke-verified; LIVE ACCEPTANCE PASSED (planner-run 2026-09-21: one-shot trigger file → `spawn=` line + `.consumed` rename + the spawned session wrote the acceptance file; verdict in the unit-1 surface report).
  - Unit 4 (planner liveness watchdog): LANDED + smoke-verified; PARTIALLY LIVE — case (b) recovered 2026-10-21T18:56-18:57Z (the `recovery= sid=ses_ea02d3559ffe… attempt=1` x3 lines in auto_resume.log, watchdog detected the stopped planner); case (c) `action: restart` spawn fires at THIS session's close (the successor verifies from its `spawn=` line); (a)/(d) unchanged from the 2026-09-23-era evidence (the four acceptance cases in the proposal lines 138-142).
- **NOTE:** unit numbering per the revised proposal — Unit 3 = new-planner spawn helper (shared building block), Unit 4 = planner liveness watchdog (auto-resume after compaction is its first branch); the "unit 3 = auto-resume / unit 4 = restart detection" wording is the pre-revision numbering.

## 80. (closed 2026-09-23 - fix LANDED 4098253 (worker-2) + plugin reactivated, live-accepted: (b) the injected turns keep the session agent (DB, 2026-09-22) + (c) the Direct session idle-untouched under the post-#90 build (scope=none 17:08:57Z, zero recovery/route/spawn); maintainer confirm 2026-09-23; full text in todo_records.md) - auto_resume inject calls lost the session agent → the turns ran as "build" (the prompt-cache invalidation + the planner lost its system prompt); fixed: the injected bodies carry the session's CURRENT agent+model (the last REAL assistant's info — #91: the compaction summary is skipped; else the JSONC configured-model fallback; else the host default — never a planner constant)

## 81. (closed 2026-09-23 - re-pin LANDED af38e2f (worker_Q3S_160K), gate green (probe 241/241, smoke 53/53, pytest 459+1w, ruff F=0), maintainer confirm 2026-09-23; full text in todo_records.md) - probe [97] + the compact_memory smoke message pin red since the maintainer's temp fix 0f192e5 (the queued promptAsync commented out); re-pinned to the temp-fix behavior (the dispatch line + the queued note byte-exact, NO queued promptAsync — NOT deactivated, promptAsync NOT restored)

## 82. (closed 2026-09-23, planner-13 bookkeeping; full text in todo_records.md) — scope toggle (last-toggle-wins, own-line anchor, bidirectional) LANDED as #85 part 1 (97fccfc) + the unit-2 suppression ruling (Direct suppresses Unit 2 = the already-landed #85 part 3 behavior, no code change); FULL live acceptance 2026-09-23 on the #90 spawn tail (own-line toggle judged scope=autorun, route= restart spawn, successor's first message carries the own-line marker, trigger deactivate=).

## 83. (closed 2026-09-27, direct session ses_f20d1b39… — his autoCompact question answered: nudge gate only, no autocompact; backstop live-verified via #93; the threshold knob = nudge position, stays in the budget file (0.85 confirmed by his 2026-09-27 ruling); full text in todo_records.md) — unit-2 backstop: catch the ACTUAL context-limit hit cleanly

## 84. (LANDED 2026-09-22, worker `worker_Q3S_170K`) — Compaction config consolidation: ALL compaction config in the shared `compact_budget.json` (replaces the `QUANT_CLASS_RULES` substring table + the opencode.jsonc emergency flag + the hardcoded recovery keeps)

## #128. (LANDED, 2026-09-30, direct session ses_f0e129deeffeqmM5rc8mpnTY2Q — maintainer ruling on `proposals/approved/2026-09-30_compact-memory-cross-override.md`: option (b), cross spend ≤ model_budget + emergency_budget, "the same as when self-compacting"; pre-approved class — agent-usage) compact_memory caller-scoped compaction override (a cross caller gets effective cap+1)
- **Problem / evidence:** a worker dead at the wall at `count == cap` is
  resolvable only by a cross call that BURNS its one self-rescue (the
  emergency arg); at `count == cap+1` it is refused outright — no planner
  rescue path (`compact_memory.ts:422-440`).
- **Design (ruling-adjusted — the proposal's original Part 1 is RETRACTED):**
  `isCross` (explicit id ≠ the caller) → `effCap = cap + 1` (the SELF path
  unchanged); the gate allows `count < effCap`, else the existing emergency
  branch (`count == cap && emergency`). Cross at `count == cap+1` stays
  REFUSED — the cross spendable total = cap+1 = the same as self (no second
  slot). Part 3 (the `ovr` audit token) INCLUDED (his live comment
  2026-09-30: "part 3 can be implemented as well" — a successful cross
  dispatch at pre-dispatch `count == cap` gains the `ovr` token on the
  COMPACT line). Part 2 docs:
  the tool description + the `compaction_core.ts` budget header (worker
  part); the planner-prompt line + the AGENTS.md staged copy = the planner's
  bookkeeping (workers have no edit access to `agent/prompts/**`).
  VERIFIED-FACT CORRECTION (the proposal's "CPU cap 0 denied for all" line
  is inaccurate): at cap 0 the current gate ALLOWS one EMERGENCY self
  compact (`count 0 === cap 0 && emergency`, L425) — under "the same as
  self" a cap-0 cross gets exactly 1 as well; no special CPU denial is
  added (flagged to the maintainer in the direct session).
- **Acceptance:** the adjusted pin set in the `compact_memory.smoke.mjs`
  Gate-M block (~L422-500, fixture cap 2): cross@cap no-emergency →
  dispatched; cross@cap+1 → refused (names the override consumed);
  self@cap no-emergency → refused (regression, wording unchanged);
  self@cap+emergency → dispatched (regression); self@cap+1 → refused
  (regression); the cap-0 corner pinned; the old cross@cap-refusal pins
  re-pinned; 82/82 total; the standard gate (probe 352/352 + all 11 smokes);
  live acceptance = the next real cross-override dispatch (maintainer
  domain).
- **Suggested scope:** `.opencode/plugin/compact_memory.ts` (the gate
  L410-440 + the tool description), `.opencode/plugin/compaction_core.ts`
  (the budget header comment), `.opencode/plugin/tests/compact_memory.smoke.mjs`.
- **Status:** spec committed
  `agent/handover/specs/2026-09-30_compact-memory-cross-override.md`; queue
  order after #127. **LANDED 2026-10-01** (worker session
  ses_f0abc032dffenb1K8yrfXKOg5V): gate (`isCross`/`effCap` — the emergency
  branch fires only for SELF) + Part-3 `ovr` token + Part-2 worker-part docs
   (tool description + `compaction_core.ts` header); smoke 82 → 89 (net +7:
   the override pins (a)/(b)/(c) + Part-3 line pins, self regressions (d)/(e)/(f),
   cap-0 corner ×2, the IQ4 cap-3 override pin; the old cross-shape pins
   re-pinned — incl. the CPU plain-call pins → SELF shape); probe
  352/352 (S13 92/93/95/222/223/225/226 + S32 340 re-pinned). PENDING
  PLANNER-SIDE (done 2026-10-01, plan2 bookkeeping): the AGENTS.md
   Compaction Guidelines "Budgets" block (staged copy at repo root
   `AGENTS_pending_2026-10-01.md`) + the planner-prompt budget line
   (`agent/prompts/agent_planner.md` — the CROSS-dispatch bullet).
   **AGENTS.md Budgets paste LANDED by the maintainer (commit 3296339,
   2026-10-04 — the cross-override bullet now in the live AGENTS.md
   Budgets block).** Live acceptance = the next real cross-override
   dispatch (maintainer domain) — still PENDING.

## #132. (LANDED 2026-10-01, plan6 worker_Q3S_slow — the byte-exact readout marker ` (unlisted)` on the silent built-in cap-1 fallback; gate probe 355/355 + all 11 smokes + ruff F=0; filed in the plan5 maintenance pass — agent_feedback 2026-09-30_16-57; pre-approved class — agent-usage friction) the silent default-cap-1 budget fallback is invisible: an unlisted model row falls back to cap 1 with no marker
- **Problem / evidence:** agent_feedback 2026-09-30_16-57 (planner): after the maintainer's model key swap, the row model was no longer listed in `model_budget` → the silent default-cap-1 fallback (compaction_core.ts ~L205-211 — the file has no `default` key) → the injected ctx suffix read `1 compactions left` while the self-gauge read 5; ~4 tool calls to diagnose.
- **Desired outcome:** the default-cap fallback is visible — a marker on the injected budget suffix (and/or a logged line) whenever the cap resolves to the silent default (not an explicit model_budget entry), and/or a documented `default` key convention in `compact_budget.json`.
- **Acceptance criteria:** a fixture with an unlisted model → the marker appears on the injected suffix / logged line; a compact_memory smoke pin for the marker; standard gate green.
- **Suggested scope:** `.opencode/plugin/compaction_core.ts` (the budget read), `.opencode/plugin/tests/compact_memory.smoke.mjs`, the budget-file header comment.
- **Status:** LANDED 2026-10-01 (plan6, worker_Q3S_slow — the byte-exact marker ` (unlisted)` appended after `left` ONLY on the silent built-in cap-1 fallback branch (model unlisted/empty + no finite `model_budget.default` key; the CPU branch excluded); gauge.mjs `compactionsLeftSuffix` tracks the branch; 2 new gauge_core pins + probe S6b 28.8 (S6b 8, total 355/355) + 3 doc one-liners (ctx_gauge.ts description, compaction_core.ts header comment, ctx_watchdog.md). Standard gate green: probe 355/355 + all 11 smokes + ruff F=0. Code commits `748f7cd` (gauge.mjs + gauge_core pins) / `bbd8705` (probe 28.8 + tally) / `e3ae1c1` (doc one-liners) / `85fbf7a` (close-down) — planner-verified from files (own re-run: probe 355/355 + gauge_core ALL PASS). Live acceptance = natural occurrence (the next gauge readout of an unlisted model shows the marker).)

## #133. (LANDED 2026-10-01, plan8 planner-direct — the 4 new-hire-test frictions of the context_trim description; pre-approved class — agent-usage friction) context_trim new-hire test: 4 description frictions found + fixed (the report rejection surface + 3 missing description lines)
- **Problem / evidence:** the plan8 new-hire test (worker_Q3S_slow
  ses_f09aca202ffe7Dn08BNLLCObnQ — battery 6/6 PASS from the tool's
  description alone, zero source reads; findings
  `loop/autorun-2026-10-01_03-27/plan8_newhire_context_trim.md`) found 4
  frictions: (F1) the report dry-run on a no-marker session degenerates to
  a bare rejection with no counts — the shared fail-closed validation was
  undocumented; (F2) the report rejection `error: session-not-found` made
  the host inject a spurious SYSTEM-Warning retry nudge (the tail mode
  returns the SAME cause as a plain `tail= rejected:` line — no warning);
  (F3) the report rows include the CURRENT in-flight message with
  `tokens=0` (uncommitted, not zero-mass) — undocumented; (F4) the row
  format is under-specified (epoch-ms `time`, the `bytes4=` fallback label,
  the conditional offset/limit display).
- **Status:** LANDED (plan8, planner-direct, inline): the report rejection
  now returns the plain two-line `session <id>\nreport= rejected:
  session-not-found` (no error surface — the genuine `db-error:` / `error:`
  lines stay for real backend failures) + the 4 description lines (the
  uniform rejection-surface note, the in-flight-message note, the
  row-field note, the dry-run-shared-validation note); the smoke
  exact-string check re-pinned. Gate green: probe 355/355 + all 11 smokes
  (context_trim 29/29). LIVE acceptance (natural occurrence, post-restart —
  the live host process predates the change): the next report call on a
  dead session shows the `report= rejected:` line WITHOUT the host
  SYSTEM-Warning retry nudge (the detector: the warning line's absence).

## #138. (closed 2026-10-22, plan14 — #142+#138 field-scan unit LANDED + planner-verified: main dd5b63b + clone 622e75e, gates green both trees) the R8/C path resolver FALSE-FIRES on path-looking SUBSTRINGS inside command/arg TEXT — verdict noise today, false hard-stops once #134 B' lands
- **Problem / evidence:** intercept.log 2026-10-21_23-17 (my own bash `grep -n ... '/^## #120/'`): `path=/^## root=repo-root | path | out-of-sandbox`; 2026-10-21_23-04 (an edit whose `filePath` was fully in-sandbox, the literal `/tmp-redirect` inside the newString): `path=/tmp-redirect ... out-of-sandbox`; 21-53/22-17 `doubled=n | path | path-anomaly` on bash heredocs with quoted example paths. The resolver scans the ARG STRING, not the effective path field.
- **Desired outcome:** the path/fuzzy channels classify only the TOOL'S PATH FIELDS (write/edit/read `filePath`, block_transfer `srcFile`/`dstFile`) — free-text content inside a bash command or an edit payload is not a path candidate.
- **Acceptance criteria:** the three observed calls log NO `out-of-sandbox`/`path-anomaly` verdict; the genuine cases (the `/tmp/bt_probe.cjs` redirect, the clone-root out-of-sandbox line) still fire; intercept_observer smoke gains a pin per false form; standard gate green.
- **Suggested scope (non-exhaustive):** `.opencode/plugin/intercept_observer.ts` (the path-scan site + `REDIRECT_PATH_FIELDS` already separates fields — reuse it), `intercept_observer.smoke.mjs`.
- **Status:** LANDED 2026-10-22 (worker_FlashNext, ses_e9ee3329) — the (d) path-anomaly + (e) out-of-sandbox channels scan the JOINED string values of the call's TYPED path fields (the `REDIRECT_PATH_FIELDS` table; clone v2 `path` fields), never the args string; a path-looking substring inside free text (bash `command`, `content`, `oldString`/`newString`) logs NOTHING. Pins per false form (smoke (16b): in-root write/edit payload with `c:\\users\\users\\x.txt` + `/tmp-redirect` + `/^## #120/`; (16e): bash command with quoted doubled example paths) + per genuine form (the `C:\Windows` / config-root-sibling controls still fire). Repurposed pins: (2b) cap retargeted to a typed write, (12n) + probe 303/304 bash-note halves flipped (`runRedirectCommand` itself untouched), smoke (B3) retargeted to a typed write inside the allowed root — the spec's Pin audit missed (B3), probe 303, probe 304 (filed to todo_inbox, closed at plan14 curation). Gates: main smoke 93→96/96, probe 360/360, bt 150/150, bt-sandbox 76/76; clone smoke 49→52/52, clone probe 360/360. Planner stamp: main `dd5b63b`, clone `622e75e`; my re-runs — main smoke 96/96 + probe 360/360, clone `plugins/tests/smoke.mjs` 52 PASS + clone probe 360/360.

## #139. (CLOSED 2026-10-22, plan15 — DOCUMENTED leg LANDED: the knowledge entry states the artifact with both dated examples + the interpretation rule; the fix option NOT taken (documented-leg acceptance met; no behavior change shipped) — intercept.log lines can carry a session id + TIMESTAMP that do not match the CALL (flush-time labeling across a process restart)
- **Status:** CLOSED 2026-10-22 (planner-15) — `agent/knowledge/knowledge_plugins.md` entry "intercept.log lines can carry a session id + TIMESTAMP that do NOT match the CALL" carries both dated examples (2026-10-21_23-04 sid-vs-payload mismatch; 2026-10-04 plan10 line 2089) + the rule (attribute by payload, not the sid field). Fix (sid at call time) remains an alternative — decision taken: document (low severity, pre-approved class).
- **Problem / evidence:** intercept.log 2026-10-21_23-04 lines (local, = ~21:04Z UTC, BEFORE this session's first tool call at 21:15:40Z) carry `ses_e9fb4e611ffe…` (my session) while the payload is the PREVIOUS direct session's NAP edit. Plan10 logged the same class 2026-10-04 (line 2089, plan9-era content + current sid).
- **Desired outcome:** an intercept line's sid + timestamp identify the CALLER reliably, or the knowledge base states the lag as a hard interpretation rule (the log is authoritative for the CALL, NOT for who/when the line landed).
- **Acceptance criteria:** either a fix (sid resolved at call time) + smoke pin, or a verified `knowledge_plugins.md` entry stating the artifact with the two dated examples; no wrong-agent attribution in the NEXT sweep that relies on the sid field.
- **Suggested scope:** `.opencode/plugin/intercept_observer.ts` (where the sid is read + the flush/queue path), `agent/knowledge/opencode-plugins/knowledge_plugins.md`.
- **Status:** OPEN — low severity, investigation trap; decision-needed (fix vs document).

## #140. (closed 2026-10-22, plan14 — unit A (config-driven sandbox roots, main 5ce85b3 / clone 8d6bbd5) + unit B (whole-path field rule, main a46ca9b / clone bdbf663) LANDED + LIVE-ACCEPTED by planner-13 (the 3-tool cross-repo probe, no `C:\Users\*` ask) + the residual `out-of-sandbox` note fixed by #142 (main dd5b63b / clone 622e75e, smoke (16a) + clone pin (i)); the unit-A env-robustness follow-up stays in todo_inbox 2026-10-22_01-34) cross-repo file access into the v2 clone: the tool refuses or the path arrives TRUNCATED, and the permission ask shows `C:\Users\*` instead of the real path
- **Problem / evidence:** his report: the clone paths are `allow`-ed in `opencode.jsonc` yet the asks surface `C:\Users\*`, and agents conclude they typo'd `C:\Users\Wasi`. Measured this session: `.opencode/temp/intercept.log` 2026-10-21_22-56 line 3201 — my own `cd repo-root-v2` logged `path=repo-root-v2 root=repo-root | path | out-of-sandbox`; the worker's knowledge_inbox entry (commit 1bf76a3) — `edit`/`write` reach the clone, `block_transfer` hard-refuses outside the launching CWD + Windows temp (`sandboxCheck`), and a truncated `C:\Users\Wasi` went to maintainer approval. #138 shows the resolver scans ARG TEXT, not only path fields. His hypothesis (intercept-side mangling) is the leading candidate; the truncation happens BEFORE the host ask.
- **Desired outcome:** an `allow`-ed external root works end-to-end for every file tool (block_transfer included); any ask names the FULL path; no `C:\Users\*` glob ask.
- **Acceptance criteria:** a controlled probe from the main repo — write a fixture into the clone with `write`, `edit`, `block_transfer` (COPY + PASTE) and read it back; `intercept.log` shows the full path with NO mutation line, and the host ask text (if any) carries the full path; the fix lands in BOTH trees (main + clone `plugins/intercept_observer.ts` + `tools/block_transfer.ts`); intercept_observer + block_transfer smokes gain a pin per form; the standard gate green in both.
- **Suggested scope (non-exhaustive):** `.opencode/plugin/intercept_observer.ts` (the `REDIRECT_PATH_FIELDS` scan + `runRedirect` + the path verdict), `.opencode/tools/block_transfer.ts` (`sandboxCheck`, the sandbox roots + the external-root allow), `.opencode/plugin/tests/intercept_observer.smoke.mjs`, `.opencode/plugin/tests/block_transfer.sandbox.smoke.mjs`, the clone twins.
- **Status:** RULINGS LANDED 2026-10-22 (planner-12, the maintainer's answers to the 3 close-out questions) — build approved, no decision needed: unit A = `block_transfer` sandbox roots become CONFIG-DRIVEN (the same `permission.external_directory` `allow` set the R8 resolver already reads at `.opencode/plugin/intercept_observer.ts:319-345` — the `/**`-suffix strip + dedupe + fail-open fallback already exist there, reuse the shape), fix in BOTH trees; unit B = the log-field truncation must NEVER cut inside a single-path field (raise the path-field cap over `MAX_FIELD_CHARS = 160`, `.opencode/plugin/intercept_observer_core.ts:137` + the truncate helper `:660`), fix in BOTH trees. The `C:\Users\*` ask and the self-blame loop are the truncation artifact + the init-time root snapshot, both covered. The live 3-tool probe run stays the maintainer's.
- **Unit A status: LANDED 2026-10-22 (worker-12, ses_e9f4b2f)** — main repo commit 5ce85b3: tool (config block + `CONFIG_ROOTS` load + sandboxCheck roots + description) + sandbox smoke (64->76 pins, fixture config under the scratchpad, TEMP-override isolation) + probe check 113 re-pin — green: 150/150 bt, 76/76 sandbox, 360/360 probe. Clone commit 8d6bbd5 (branch `migration`): same change transplanted onto the clone's pre-hardening form (`[cwd, ...CONFIG_ROOTS, TEMP ?? TMP]`, no dedupe/tmpdir terms — the smoke/probe mirrors match it exactly); clone gate DIFF vs its red baseline: probe output IDENTICAL to baseline (module-not-found `ctx_watchdog.ts`, TODO #141), sandbox smoke 64->76 ALL PASS, bt smoke 131/131 unchanged. Follow-up OPEN (todo_inbox 2026-10-22_01-34, cause-corrected): the sandbox smokes require `TEMP`/`TMP` at startup (line 13) — an env-free gate run crashes before pins; make the smoke's temp fixtures self-set the env. Live 3-tool acceptance: pending (maintainer). NOTE: the earlier close commit 4bef076 misattributed clone/probe state to a nonexistent planner-13 commit and restart; this line replaces that text (no history rewritten).
- **Live acceptance (BOTH units) 2026-10-22 — COMPLETE (planner-13, this session, host restarted per the maintainer marker):** 3-tool cross-repo probe ran from the main repo — `write` + `edit` + `block_transfer` COPY→PASTE into `repo-root-v2/.opencode/temp/live_accept_2026-10-22.txt` / `live_accept_bt_2026-10-22.txt` + `read` back; all accepted, NO sandbox refusal, NO `C:\Users\*` ask, PASTE content byte-correct on read-back, clone tree stayed clean (fixtures deleted). Mechanism side, intercept.log lines 3634-3640 (this session's sid): every `path=`/`orig=` field prints WHOLE incl. the 74-char clone paths (unit B LIVE); prose/payload fields cut with the ASCII `...` and the cut moves BACK before path substrings; the write-scope fuzzy line shows `fuzzy-rejected` (fail-closed, no filename mutation); unit A live via the accepted PASTE (CONFIG_ROOTS loaded at tool load). Remaining: the `out-of-sandbox` NOTE still fires on the allowed clone paths — observation-level only, see #142; entry can CLOSE once #142 lands.
- **Unit B status: LANDED 2026-10-22 (worker-13, ses_e9f24eaf)** — main repo commit a46ca9b: `intercept_observer_core.ts` FIELD CONTENT rule in `flattenField` (new `MAX_PATH_FIELD_CHARS = 1024` + helpers `isPathShapedValue`/`safeCutLen`: a single path-shaped field prints WHOLE; a mixed prose+path field's cut moves BACK so it never lands inside a path substring; fallback = the existing short summary form; the 8-field shape + ASCII `...` marker byte-unchanged) + smoke 85->93 pins (DoD items 1-3 incl. the hook long-path byte-shape pin) — green: smoke 93/93, probe 360/360 UNCHANGED (the probe's intercept sections audited in place: no check re-pinned, all expected values flow through the SAME `flattenField`; annotation/section sums still agree). Clone commit bdbf663 (branch `migration`): same rule transplanted into `plugins/intercept_observer.ts` + smoke 46->49 (C11 re-pinned: orig whole + value dropped whole; 3 new e2e pins) — clone gate as DIFF vs its red baseline (TODO #141): probe output byte-IDENTICAL to baseline (0 checks, `ctx_watchdog.ts` module-not-found), smoke ALL PASS (49/49). Entry stays OPEN: live acceptance pending (maintainer's next session shows whole paths in its own intercept lines; grep the log for mid-word path echoes).

## #141. (CLOSED 2026-10-22, plan13 — clone gate LANDED GREEN (clone `652ee6f`+`47aa082`: probe 360/360 + 12 smokes ALL PASS); header stamped at plan15 curation — the CLOSED status line existed under the stale OPEN header, 2026-10-22, planner-12) the v2 clone's probe gate is RED at baseline — `ERR_MODULE_NOT_FOUND` on `.opencode/plugin/ctx_watchdog.ts`
- **Problem / evidence:** measured in the clone `repo-root-v2`: `node .opencode/plugin/probes/handover_probe.mjs` → 0 PASS, module-not-found on `file:///…/.opencode/plugin/ctx_watchdog.ts` (the worker's baseline run 2026-10-21 attributes the import to clone commit 5516a83). So the clone has NO green probe gate; its 11 node smokes report 0 PASS each at baseline.
- **Desired outcome:** the clone's standard gate (probe + smokes) runs green against the v2 line, so v2 units are verifiable the same way as the main repo.
- **Acceptance criteria:** `node .opencode/plugin/probes/handover_probe.mjs` in the clone prints `PROBE handover: <t>/<t> PASS` with the annotation agreeing with the section sums; each v1-only import is either ported, pointed at its v2 twin, or excluded with a comment; the 11 node smokes each report their real counts (no 0-PASS suite).
- **Suggested scope (non-exhaustive):** clone `.opencode/plugin/probes/handover_probe.mjs` (the import list + section sums), clone `.opencode/plugin/` (the missing v1 plugin file vs the ported set), the clone suite header counts.
- **Status (clone-gate unit, 2026-10-22, worker-14, ses_e9effdf2):** LANDED — clone `migration` branch, 2 checkpoint commits (hashes recorded by the planner; not in this line by design): (1) probe v1-module constants repointed to `.opencode/plugin-unported-v1/` (ctx_watchdog/context_recovery/compact_memory/intercept pair/compaction_core; deactivated `TOOL_TS` kept — the file EXISTS in the clone) + a `.opencode/plugin-unported-v1/scripts/gauge.mjs` re-export shim (ONE implementation — resolves the v1 modules' byte-unchanged relative `./scripts/gauge.mjs` imports to the clone's gauge-core home) + probe check 32 re-pinned to the clone's table-aware gauge twin (7 ordered prepares — catalog x2, newest x2 session_v2-first, time_updated x2, step/tokens.total LAST; clone-twin precedent = unit A check-113); (2) 4 smoke files repointed (auto_resume incl. the 2 child-script import strings, compact_memory incl. reimport + source-read joins, context_recovery, intercept_observer). Measured green in the clone: `PROBE handover: 360/360 PASS` (section sums UNCHANGED — no section excluded, every subject exists); all 12 smokes ALL PASS: auto_resume 170/170, block_transfer.sandbox 76/76, block_transfer 131/131, compact_memory 110/110, context_recovery 17/17, context_trim 40/40, ctx_gauge 3/3, gauge_core ALL PASS (32 PASS lines measured — the suite's custom verdict line prints no n/n), intercept_observer 85/85 (the clone v1 smoke+core pair predates unit B's field rule — the v2 twin carries it at 49/49, out of this unit), loop_log 69/69, state_snapshot 20/20, submit 31/31. Baseline correction to the Problem line: measured 11 red smokes — actually 8 were already green (tools/gauge subjects exist in the clone); only the 4 plugin-module smokes were red. Main-repo gate untouched (probe 360/360 there, re-run after the unit). Entry stays OPEN: planner hash stamping + curation into #137's tools-estate units; decision-needed: NONE.

- **Status:** CLOSED 2026-10-22 (planner-13 stamp): clone `migration` `652ee6f` (probe repoint + gauge.mjs re-export shim — a NEW 7-line file, no v1 bytes touched) + `47aa082` (4 smokes repointed); main bookkeeping `c9c94a3` + `a5f6446`. Planner re-ran: clone probe `PROBE handover: 360/360 PASS` + main probe `360/360 PASS`; `git show --stat` matches both clone commits; worker's baseline correction accepted (only the 4 plugin-module smokes were red). The clone standard gate is GREEN; the v2 tools-estate survivors ride #137 (unit 2 = the token-mass legs, then the tools estate).

## #142. (closed 2026-10-22, plan14 — the #142+#138 field-scan unit LANDED + planner-verified: main dd5b63b, clone 622e75e; the cross-repo note is gone, the controls still fire) the `out-of-sandbox` NOTE fires for paths under a config-`allow`ed root — misleading evidence for cross-repo calls
- **Problem / evidence:** live probe 2026-10-22_02-16/02-17 (this session, sid `ses_e9f0c2d5…`): `write`/`edit`/`block_transfer` PASTE/`read` on `repo-root-v2/.opencode/temp/live_accept*` all EXECUTED, yet each logged `... | path=repo-root-v2/.opencode/temp/live_accept_2026-10-22.txt root=repo-root | path | out-of-sandbox` although the clone root is in `opencode.jsonc` `permission.external_directory` (lines 34-35, allow). Cause: `intercept_observer_core.ts` `observeArg` calls `observeSandbox(s, workspaceRoot)` WITHOUT `extraRoots` (659); the `extraRoots` join is documented as "used when an R8 redirect fires" (545-550) and the recomputed-notes site (observer 1474) only filters after a redirect. The clone path is nested 3+ levels inside the allowed root → `resolveRedirect` 1:1 cases (i)/(ii) do not match → no redirect → the note stands.
- **Desired outcome:** the observation-level `out-of-sandbox` note does not fire for spans under ANY allowed root (workspace + scratchpad + config roots + references), so an agent reading its own log sees no false escalation signal for an allow-listed cross-repo call.
- **Acceptance criteria:** the same cross-repo call pattern logs NO `out-of-sandbox` verdict; a genuinely un-allowed path STILL logs the note; the B' hard-stop site (`observer:1519`, already full-roots) unaffected; intercept_observer smoke gains a pin per form (allowed nested path → no note; un-allowed → note); standard gate green in both trees (clone twin `plugins/intercept_observer.ts`).
- **Suggested scope (non-exhaustive):** `.opencode/plugin/intercept_observer_core.ts` (`observeArg` + `observeSandbox` call site), `.opencode/plugin/intercept_observer.ts` (pass `allowedRoots` through), `.opencode/plugin/tests/intercept_observer.smoke.mjs`, the clone twins.
- **Status:** LANDED 2026-10-22 (worker_FlashNext, ses_e9ee3329) — the note check now receives the allow-list roots (`observeArg` gained `extraRoots`; the plugin passes `allowedRoots` at the observation site AND the redirect recompute) and scans the TYPED path-field text: a path nested under a config-`allow`ed root logs NO `out-of-sandbox` note (main smoke (16a), clone smoke pin (i)), an un-allowed path STILL logs it (controls pinned: (7), (12g), (16b control), probe 295). #140's remaining "the NOTE still fires on the allowed clone paths" item is covered by this unit — stamped below. Planner stamp: main `dd5b63b`, clone `622e75e`; my re-runs — main smoke 96/96 + probe 360/360, clone `plugins/tests/smoke.mjs` 52 PASS + clone probe 360/360.

## #144. (CLOSED 2026-10-22, plan22 — CLOSED planner-direct (small test-side fix): retry-on-EBUSY `rmTear` teardown in `_smoke_base.mjs` + the three node-dir smokes; trio green ×3 + gates 12/12 BOTH trees, clone `4045331`; header was stale-OPEN until this plan25 curation) three node-dir smokes exit 1 on the Windows teardown `fs.rmSync` EBUSY flake — 0 FAIL, green on re-run, but every gate run pays the re-run tax
- **Problem / evidence:** bun's final `fs.rmSync(fixtureDir,{recursive:true})` in
  `.opencode/plugin/tests/gauge_core.smoke.mjs` (scratch `gauge_v2_mass`),
  `context_trim.smoke.mjs` and `auto_resume.smoke.mjs` throws
  `EBUSY: resource busy or locked` AFTER ZERO check failures — measured identical
  at the clone baseline `358cba7` (scratchpad worktree) and `context_trim` +
  `auto_resume` fail the same way in MAIN; the open sqlite handles are the
  suspected holder.
- **Desired outcome:** the three exit 0 (`ALL PASS`) on EVERY run — no per-session
  re-run cost (each planner session currently burns a re-run trio at the gate).
- **Acceptance criteria:** running all smokes in `.opencode/plugin/tests` →
  13/13 exit 0, in a clean-env AND an env shell, BOTH trees; check counts
  UNCHANGED (gauge_core 42, context_trim 40, auto_resume 170). Fix class: retry-
  on-EBUSY teardown OR close every sqlite handle before the rm — worker's call.
- **Suggested scope (non-exhaustive):** `.opencode/plugin/tests/gauge_core.smoke.mjs`
  + `context_trim.smoke.mjs` + `auto_resume.smoke.mjs` (MAIN + clone twins).
- **Status: CLOSED 2026-10-22 (planner-22 direct, no worker — small test-side fix).** Fix class chosen: RETRY-ON-BUSY teardown — `rmTear` exported from `.opencode/plugin/tests/_smoke_base.mjs` (bounded backoff: `Atomics.wait` sleeps 25–175ms over 8 attempts on `EBUSY|EPERM|ENOTEMPTY`, non-busy errors rethrow; `freshSandbox` pre-clean uses it too); converted all `fs.rmSync` teardown calls in the three smokes (gauge_core 2 MAIN/3 clone incl. the clone's extra `d` site, context_trim 1 — its node:fs `rmSync` import dropped, auto_resume 14 both trees). Check counts UNCHANGED (gauge_core ALL PASS, context_trim 40/40, auto_resume 170/170); trio ran green ×3 BOTH trees; full v1 gate MAIN 12/12 + clone 12/12 exit 0. MAIN commit with this status line; clone `4045331`. Note: the entry said "13/13"; the folder holds 12 `*.smoke.mjs` — 12/12 is the real full-suite count.

## #145. (LANDED 2026-10-22, planner-25 — curated from `agent_ideas.md` 2026-10-22_00-36; pre-approved class — agent-usage friction) per-event filter helper for `.opencode/temp/intercept.log` — every live-acceptance sweep re-reads the log through raw greps and the field widths blow the context budget
- **Problem / evidence:** idea 2026-10-22_00-36 (planner_FlashNext ses_e9fb4e611…); `agent/scripts/log/summarize_intercept.cjs` is an AGGREGATE summary, NOT a filter/last-N tool (gap re-confirmed planner-24 NAP entry); full-line greps of intercept.log return the 8+ field lines (path fields are long) and blow context.
- **Desired outcome:** a curated read-only helper that filters intercept.log by date/session-id/verdict-kind and prints BOUNDED fields, defaulting to the last N lines.
- **Acceptance criteria:** a script (new `.mjs`/`.cjs` under `agent/scripts/log/`, or new flags on `summarize_intercept.cjs` — implementer's call) with a folder-README line; demo on the live intercept.log prints: (a) last-20 default, (b) `--session=<ses_…>` filter, (c) verdict-kind filter (e.g. `redirect|reject|applied`) — each output ≤ ~120 chars/line, exit 0; read-only (never writes the log).
- **Suggested scope (non-exhaustive):** `agent/scripts/log/` (new file + README), `agent/readme/repo_commands.md` (script pointer if a doc line fits).
- **Status: LANDED 2026-10-22 (worker_FlashNext ses_e9b41981…, code commit c3f856e; docs+TODO+handover pair 5d04c0c).** Decision taken at spec time: NEW file `agent/scripts/log/intercept_sweep.cjs` (aggregate summary stable, `parseLine` reused via require). Verified by the worker AND planner-re-run at plan26: `node agent/scripts/log/tests/intercept_sweep.smoke.cjs` → all checks PASS exit 0; `summarize_intercept.smoke.cjs` green and byte-UNCHANGED; live-log views (default 20 / `--lines=4` / `--session=`) exit 0; `--lines=200` → max 120 CHARS, 0 lines over (measured with a node char-count — `awk length()` over-counts because the log carries multibyte `→`/`…`); gate probe `360/360 PASS` unchanged. Opportunistic planner fix: `fit()` no longer splits a surrogate pair at the cut (the `�` artifact in truncated args fields). No maintainer decision needed (pre-approved).

## #148. (CLOSED inline, 2026-10-23, planner-28b DIRECT — his reported `err_bcd2ee05`) the `plugins` config entry is LOAD-BEARING under v2.1.3
- **Evidence:** `run=a1366727 00:51:57Z level=WARN message="failed to load plugin" target=".../Repos/the estate (former name)/plugins/intercept_observer.ts" ref=err_bcd2ee05 cause=ENOENT stat` + `level=ERROR message="configured plugin watch failed"` (ENOENT watching `.../the estate (former name)/plugins`). The target = the `opencode.jsonc` entry `plugins: ["./plugins/intercept_observer.ts"]`; MAIN has NO root `plugins/` — the plugin is `.opencode/plugins/intercept_observer.ts`.
- **Behavior (CORRECTED 2026-10-23):** the directory guard EXISTS in 2.1.3 (`grep -c "configured plugin path must be a directory" bin/opencode.exe` = 2). A MISSING path does NOT hit it: the loader stats + watches the target anyway, so ENOENT lands as `configured plugin watch failed` ERROR + `failed to load plugin` WARN (the red panel).
- **Plugin NOT broken:** the same run logs `loading plugin id=.../.opencode/plugins/intercept_observer.ts`, and my probe write logged `.opencode/temp/journal_write.log` `2026-10-23_03-14 | ses_e99be06a6ffeZsLdTtFsqm0WC4 | write | .../observer_probe_20261023.txt`. The `must default export an object with server()` errors (runs 8105542d + e9e04f95) came from the PRE-2.1.3 host; 2.1.3 accepts the v2 `setup()` shape.
- **Fix LANDED:** the `plugins` key is REMOVED from `opencode.jsonc` and the comment rewritten. Verify: `grep '"plugins"' opencode.jsonc` → no match.
- **Twin leg CLOSED (2026-10-23, his ruling + measured):** the clone is ARCHIVED — `ls home/Repos/archive/` shows `the estate (former name)-v2` (+ `the estate (former name) - Copy`), and `repo-root-v2` is GONE. The clone-side panel (`00:52:57Z ref=err_7d471aa6`) came from that now-archived tree, so no fix is needed there.

## #150. (LANDED 2026-10-26 — units A + B; header was PENDING-HIS until his 2026-10-23 approval below) v1-estate removal in MAIN: his condition FAILS on measurement — re-home the shared core first
- **Problem / evidence:** his ruling was "if there are no other dependencies in these folders then the plugin folder and plugin-unported-v1 can be removed". Measured the opposite: `.opencode/plugin/scripts/gauge.mjs` is imported by 8 live v2 files (`plugins/{auto_resume:108, compact_memory:103, context_family:148, context_trim_v2:149, ctx_gauge:32, intercept_observer:87}` + `tools/{context_trim:140, ctx_gauge:18}`) plus `plugins/tests/{compact_memory,smoke}.smoke.mjs`; `gauge.mjs:161` resolves the #126 spawn-sqlite3 fallback at `.opencode/plugin/tools/sqlite3.exe`; `.opencode/plugin-unported-v1/**` is referenced by `.opencode/plugin/probes/handover_probe.mjs` + 5 v1 smokes. `.opencode/plugin/tools/sqlite3.exe` + `scripts/peek.mjs` also live in the same tree.
- **Desired outcome:** one v2 estate — the shared cores (`gauge.mjs`, `compaction_core_v2.mjs`, `peek.mjs`) + `sqlite3.exe` re-homed under the v2 roots, then `.opencode/plugin/` and `.opencode/plugin-unported-v1/` deletable without breaking the gate.
- **Acceptance:** ZERO `../plugin/` imports left under `.opencode/{plugins,tools,plugins/tests}/**` (grep-verified); the MAIN standard gate (probe + 11 smokes) GREEN; `.opencode/plugin/` + `.opencode/plugin-unported-v1/` ABSENT; `sqlite3.exe` still resolvable by the #126 fallback pin.
- **Suggested scope (non-exhaustive):** `.opencode/plugin/scripts/**`, `.opencode/plugin/tools/sqlite3.exe`, the 11 importers, `.opencode/plugin/probes/handover_probe.mjs` (retire the v1-only sections), the v1 smokes.
- **Status (APPROVED, 2026-10-23 — his ruling 05-1x):** "v1 estate should be retired entirely and everything that has dependencies moved to plugins." Unit = re-home `.opencode/plugin/scripts/{gauge.mjs, compaction_core_v2.mjs, peek.mjs}` + `plugin/tools/sqlite3.exe` into the v2 estate (e.g. `.opencode/plugins/scripts/` + keep the exe path pinned by `gauge.mjs:161`), repoint the 11 importers, retire the v1-only gate files, then DELETE `.opencode/plugin/` + `.opencode/plugin-unported-v1/`. Assign the worker only AFTER the #151 gauge work lands (both touch `context_family.ts` + `gauge.mjs`).
- **Status (unit A LANDED, 2026-10-26, worker_FlashNext, MAIN `migration`, checkpoint `420a1a9`):** the four files moved by `git rename` into `.opencode/plugins/scripts/{gauge,peek,compaction_core_v2}.mjs` + `.opencode/plugins/tools/sqlite3.exe`; the `DEFAULT_*` path constants UNCHANGED (verified: the new depth is identical, so the exe/budget/loop/config targets are the same paths). Repointed consumers: 6 plugin imports (`../plugin/scripts/…` → `./scripts/…`), `tools/{context_trim,ctx_gauge}.ts` + `tools/ctx_gauge.md`, the probe's `../scripts/gauge.mjs` import URL, the 4 v1 smokes' `loadRepo` + the `peek.mjs` spawn, the `plugin-unported-v1/scripts/gauge.mjs` RE-EXPORT shim (the v1 plugin modules stay byte-unchanged), `agent/scripts/db/dump_session_v2.mjs` (the #126 exe resolution + its sandbox mirror in the v2 compact_memory smoke), 5 v2 smokes, both estate READMEs. DoD 4 pin added INSIDE the existing #126 block of `.opencode/plugin/tests/context_trim.smoke.mjs`: `existsSync(DEFAULT_EXE_PATH)` + the `plugins/tools` shape → smoke `41/41` (`+1` check).
- **Measured (unit A):** probe `PROBE handover: 360/360 PASS`; 12 v1 smokes ALL PASS (auto_resume 170/170, block_transfer 151/151, block_transfer.sandbox 76/76, compact_memory 110/110, context_recovery 17/17, context_trim 41/41, ctx_gauge 3/3, gauge_core ALL PASS, intercept_observer 96/96, loop_log 69/69, state_snapshot 23/23, submit 32/32) — no EBUSY flake; 11 v2 smokes + `smoke.mjs` → `SMOKE: ALL PASS` (`red=0`); tsgo exit 0. The only remaining `plugin/scripts` / `plugin/tools` strings in the DoD-2 scope are TWO dated historical comments in `.opencode/plugins/scripts/gauge.mjs` (#152 + #150) explaining the move.
- **Planner verification + NEW GATE BASELINE (plan31, 2026-10-26, planner-31):** commits `e4275b6` (re-home), `228972c` (prune), `1850e5f` (delete — 23 files, 9647 lines), `e2800ca` (consumer repoints), `d1b9cf5` (stale comment), `51b3c58` (bookkeeping) verified against `git show --stat`; `.opencode/` now holds ONLY `plugins/` + `tools/` (+ the untracked v1 `plugin.log` artifact, maintainer cleanup candidate). My re-runs: `node .opencode/plugins/probes/handover_probe.mjs` → `PROBE handover: 112/112 PASS`; the 8 relocated smokes under `node` → ALL PASS (`76/76`, `151/151`, `41/41`, `3/3`, gauge_core, `69/69`, `23/23`, `32/32`); the 11 bun smokes + `smoke.mjs` → `SMOKE: ALL PASS`; tsgo exit 0; `port_sync.selftest.cjs` → `SELFTEST: ALL PASS (115/115)`. BASELINE FROM NOW ON: probe **112** + 8 v1 node smokes + 11 v2 bun smokes + `smoke.mjs` + tsgo 0 — the old `360` and the 12-v1-smoke baseline are DEAD, never restate them. Worker spec-deviation accepted: `_smoke_base.mjs` needs `REPO_ROOT` up-4, not my spec's up-3 (my claim was wrong at authoring — the estate dir was 3 deep, `plugins/tests/v1/` is 4). DoD-5's real `port_sync` dry run is BLOCKED by env (the clone is archived, MAIN is on `migration`) — HIS call. Pending HIS paste list for the stale `agent/readme/**` paths is in `agent/handover/handover_task_to_planner.md` §Pending paste list.
- **Planner verification + LIVE acceptance (unit A, 2026-10-26, planner-29):** commits `420a1a9` (4 renames incl. the binary exe + all repoints) and `60a6b9c` (TODO + handover + loop DONE) verified against `git show --stat`. My re-runs: DoD-2 grep → ZERO live-path hits; `node .opencode/plugin/tests/gauge_core.smoke.mjs` → `GAUGE_CORE_SMOKE: ALL PASS`; the live read through the MOVED core (`$TMP/opencode/live152.mjs`, real DB + real config) → `CTX=172786 (65%) REM=89358 | 2 compactions left`, and `.opencode/temp/ctx_family.log` gained `ctx-append` lines at `10:48:26Z`/`10:49:06Z` AFTER the move → the running v2 host re-reconciled the plugins onto the new core path with no load error (no `Cannot find module` in opencode.log), i.e. the move took effect mid-session without a restart. Worker-reported spec gap, accepted: my consumer list missed `agent/scripts/db/dump_session_v2.mjs` and the `.opencode/plugin-unported-v1/scripts/gauge.mjs` re-export shim (both repointed as path repoints).
- **Status (unit B LANDED, 2026-10-26, worker_FlashNext #150-unit-B, MAIN `migration`):** survivors re-homed by `git mv` — probe → `.opencode/plugins/probes/handover_probe.mjs` (gauge import URL → `../scripts/gauge.mjs`), the 8 surviving smokes + `_smoke_base.mjs` + README → `.opencode/plugins/tests/v1/`; the base's `REPO_ROOT` is now up-4 (spec's "up-3 still correct at the new depth" was WRONG — measured: `.opencode/plugins/tests/v1` is one level deeper than `.opencode/plugin/tests`). The 4 dead v1 smokes (`auto_resume`, `compact_memory`, `context_recovery`, `intercept_observer`) deleted (v2 twins pinned; `context_recovery` gap → #162). The 22 RETIRE sections S1-S5, S8-S11, S13-S14, S18-S21, S25-S29, S31-S32 (248 checks) pruned whole with their estate consts (`PLUGIN_TS`, tool-load block, `TOOL_TS`, `RC_TS`, `QC_PLUGIN_TS`, `OBS_TS`/`OBS_CORE_TS`, `CORE_TS`) and the spec/mirror/log sandbox fixture helpers; header tally re-annotated (13 KEEP sections = 112). `.opencode/plugin/` + `.opencode/plugin-unported-v1/` ABSENT (23 tracked files `git rm` + the empty untracked `scripts/`/`tools/` `rmdir`). Consumers repointed: `port_sync.cjs` (`TAKE_MAIN` → `.opencode/plugins/{probes,tests/v1,scripts}/`, `PROBE_FILE`, gate runner; Rule A + discovery guard KEPT as the v1-resurrection defense), selftest fixtures (115 checks), `git/README.md`, `repo_testgate.md:23`, `agent/scripts/README.md` gauge home, `INVENTORY.md` stale `handover-check.js` row, stale `context_trim.ts:41` backstop comment. Measured: probe `PROBE handover: 112/112 PASS`; 8 relocated smokes `ALL PASS` (node); v2 11 smokes + `smoke.mjs` → `SMOKE: ALL PASS` (12/12); tsgo exit 0; `node --check` clean; `SELFTEST: ALL PASS` (115/115). Deviations recorded in the handover: (a) base up-3→up-4; (b) the plain `port_sync.cjs` dry run CANNOT run here — clone tree `the estate (former name)-v2` absent AND MAIN is on `migration` (guard expects `main`), exit 2 by design; dry-run behavior + no-estate-paths proven by the selftest scenario B. Coverage gaps of the retired legs → NEW entry #162. Commits: `e4275b6` (re-home), `228972c` (prune), `1850e5f` (estate delete), `e2800ca` (consumer repoints), `d1b9cf5` (comment) + the bookkeeping commit. Maintainer-owned `agent/readme/*` stale lines → pending paste list in the worker handover (NOT edited).

## #152. (LANDED 2026-10-26 — planner-direct, his OK; LIVE-ACCEPTED mid-session in the v2 host, planner-29) The gauge loses pct/REM for a provider-qualified model: the core reads only `model.id`, dropping `model.providerID`
- **Problem / evidence:** with the new `strata/gyro-gyro-m` model live, `ctx_gauge` returns `SESSION=ses_e8a690972ffem1DSIF8R4gSJ66 CTX=65367 | 3 compactions left` — NO `(p%)` and NO `REM=`. Measured: the v2 row `.local/share/opencode/opencode.db` → `session_v2.model` = `{"id":"gyro-gyro-m","providerID":"strata"}`, but the unified core selects only `model` (`gauge.mjs:545-575`) and `parseModelId` (:323-334) extracts `$.id` → the bare id has no `/`, so `resolveWindow` (:413-429) skips the config walk and falls to the name-marker `parseWindow`, which finds no `[-_]<n>K|M` marker in `gyro-gyro-m` → `window` undefined → `no-total`-style readout without pct/REM (`:961-977`). The config DOES define the window (`opencode.jsonc:107-111 "limit": { "context": 262144 }`).
- **Consequence:** the whole budget family degrades on any provider-qualified model whose id has no size marker — no `p%`, no `REM`, so the nudge ladder (`context_family.ts:299-430`, rungs on pct/REM) can NEVER fire, and every planner budget call rests on a raw CTX number. Compaction budget caps are unaffected (`model_budget.default: 3` resolves → "3 compactions left").
- **Desired outcome:** the gauge resolves the window from the root config for provider-qualified models, so the readout regains `(p%) REM=` and the nudge ladder works again on `strata/gyro-gyro-m` — without touching the v1-side behavior.
- **Acceptance:** `ctx_gauge` prints `CTX=<n> (<p>%) REM=<m>` in the live v2 host for the current session; `gauge_core.smoke.mjs` gains a pin for a row of the shape `{"id":…,"providerID":…}` resolving through the config walk, plus a pin that a bare legacy id still falls to `parseWindow`; the MAIN gate stays green (`node .opencode/plugin/probes/handover_probe.mjs` → `PROBE handover: <t>/<t> PASS`) and the v2 smokes + `tsgo` stay green. Both trees via `port_sync` (the core is shared from MAIN — the #147 baseline).
- **Scope (non-exhaustive):** `.opencode/plugin/scripts/gauge.mjs` (`parseModelId` + the two SELECT sites — read `providerID` alongside `id`, e.g. `json_extract(model,'$.providerID')`, and build `providerID/id` when both resolve), `.opencode/plugin/tests/gauge_core.smoke.mjs`, `.opencode/plugin/probes/handover_probe.mjs` (the mock row shape), `agent/knowledge/plugin_tools/` note. A `model`-column shape probe first (one read-only `sqlite3.exe` query) before any SQL change.
- **Status:** OPEN. Implementation is a plugin/tool fix (pre-approved class), but the core is shared by both trees and the probe mock drives the leg choice → keep it one small verified unit.
- **Status (LANDED planner-direct, 2026-10-26, planner-29, his OK "yes that would be needed to adapt"):** TWO causes, both fixed in the shared core: (1) the row's `providerID` was dropped — NEW `parseModelRef(raw)` → `{ id, ref }`, `ref = providerID/id` when both are non-empty; `gaugeFromRaw` keeps the BARE `modelId` (the budget-map key + the readout slot) and passes `ref` to `resolveWindow` only. (2) A REAL P0 found while proving it: `DEFAULT_CONFIG_FILE` was `join(THIS_DIR,"..","..","opencode.jsonc")` = `.opencode/opencode.jsonc` — a leftover of the T1 estate move (`plugin/scripts/` → `.opencode/plugin/scripts/`), so the CONFIG WALK WAS DEAD FOR EVERY MODEL and only name-marked ids ever got a window (that is why markerless ids like `Qwen3.8-NEXT-Coder` worked earlier: the pre-move path reached the root). Now THREE levels up, same as `DEFAULT_LOOP_ROOT`; `DEFAULT_BUDGET_FILE` (:200) was already correct. Verified: the new smoke unit = 8 pins (`gauge_core.smoke.mjs`), with pin (5) PROVEN RED on the pre-fix core by a negative control (`$TMP/opencode/neg152.mjs` against HEAD's `gauge.mjs` → `window: undefined`, `hasParseModelRef: undefined`; against the fixed core → `window: 555555`); pin (6) keeps the no-providerID fallback, pin (7) guards the BARE budget key, pin (8) pins the root config path. Gate: `node .opencode/plugin/tests/gauge_core.smoke.mjs` → `GAUGE_CORE_SMOKE: ALL PASS`, all 12 v1 smokes `ok=12 red=0`, `node .opencode/plugin/probes/handover_probe.mjs` → `PROBE handover: 360/360 PASS`. LIVE proof against the REAL DB + REAL config (read-only, `$TMP/opencode/live152.mjs`): `SESSION=ses_e8a690972ffe… CTX=133656 (50%) REM=128488 | 3 compactions left` — pct/REM RESTORED for `gyro-gyro-m`. LIVE-ACCEPTED at the SAME start, no restart: the live `ctx_gauge` tool prints `CTX=149423 (57%) REM=112721 | 3 compactions left` and the nudge ladder fired its 50% rung (`CTX=131801 (50%) REM=130343` arrived as a synthetic user turn) → the window resolution works in the running v2 host. MEASURED MECHANISM: `ctx_gauge.ts:32` imports the core STATICALLY, so the change can only have arrived through a module re-load — the log shows `plugin reconciliation started/completed` (ids 4-7, `plugins=13`) at `00:39:52`…`00:42:43`, i.e. right after the edit → v2 RE-RECONCILES plugins on plugin-dir file changes, so plugin/core code can take effect mid-session. Corrects MEM-0116: the restart rule is not universal — verify per change from the reconciliation log instead of assuming. Caveat recorded: the window now follows the CONFIG `limit.context` — if the backend serves a smaller window than the jsonc row states, `p%` is optimistic (his config is the authority). Caveat recorded: the window now follows the CONFIG `limit.context` — if the backend serves a smaller window than the jsonc row states, `p%` is optimistic (his config is the authority).

## #153. (LANDED, 2026-10-26, planner-29 direct + worker_FlashNext) The dead gauge-injection leg still logs a `ctxmsg` "posted" line per request — a misleading evidence channel
- **Problem / evidence:** `.opencode/plugins/context_family.ts:279` (`event.messages.push({role:"user", …})`) is commented out by his cache test (commit `cee85ce`), but `:281 appendLog(buildLine("ctxmsg", {…, line: text}))` is unconditional. Measured today: 13 `kind":"ctxmsg"` lines for my session in `.opencode/temp/ctx_family.log` (`tail -8` at 00:26:18Z), each naming a `ctx: …` line that was NEVER injected. The header comment at :280 still claims "posted fires only". This is what made his #151 A/B read as "a second injector is still live".
- **Desired outcome:** the log distinguishes a real post from a dry fire, so the injection A/B is verifiable from `ctx_family.log` alone; and the deactivation is ruled permanent or reverted (the #151 fix decision).
- **Acceptance:** one of: (a) the leg is DELETED (injection + its `ctxmsg` line), leaving `ctx_gauge` as the only readout, or (b) the push is restored and gated (byte-stable text or threshold-only). Either way the log line fires ONLY on an actual post, the `context_family.smoke.mjs` ctx pins are re-pinned to match, and a live 5-call run shows the `ctxmsg` count matching the actual post count (0 under (a)).
- **Scope (non-exhaustive):** `.opencode/plugins/context_family.ts` (:264-292 + the header block), `.opencode/plugins/tests/context_family.smoke.mjs`, `agent/knowledge/plugin_tools/` + TODO #151 status.
- **Status (RULED by him, 2026-10-26, planner-29 direct):** draft-push leg REMOVED (his words: "the draft-push leg (ctxmsg?) can be removed since you explained that the invalidation is inherent"). Economy ruled: fire on every tool call but append only when the fill moved ≥ 1% of the window (my pick over 2% — ~2.6k tokens at 262k keeps blind spots short and costs ~25 tokens per append; 2% would leave up to 5.2k blind), and on every tool EXCEPT `ctx_gauge` (accepted recommendation). `ITER=<n> <loop-folder>` is OUT of the appended line (his ruling after my recommendation was re-examined): `loop_log` needs only `status`+`content` (`.opencode/plugins/loop_log.ts:94`, folder auto-located at `:147-161`), so repeating the folder ~100 times is waste; the session-start carrier becomes TODO #155 (a `## loop` section in the `state_snapshot` digest). Spec written: `agent/handover/specs/2026-10-26_153-154-gauge-append-leg.md` (9-point DoD, pin surfaces named, v1 twin out of scope).
- **Status (channel ANSWERED from fork source, 2026-10-26, planner-29 direct — his question "how can we still inject the context gauge line? / is execute.after or execute.before also injection?"):** YES, `tool.execute.after` is a real delivery channel and it is cache-safe. Fork `packages/core/src/tool.ts:132-152`: the hook receives `afterEvent.result = { output?, content, metadata? }`, a plugin may MUTATE it, and the tool's RETURNED value is rebuilt from `afterEvent.result` (`:150-152`) → the appended text becomes part of the PERSISTED tool result, so the next prompt extends it byte-identically and the checkpoint written at that tool-return keeps matching. `execute.before` (`:104-110`) mutates only the tool INPUT — the model never reads it as text (that is why the intercept observer's R8 redirect is invisible to the agent), so it is NOT a delivery channel, and it does not break the cache either. The draft hook (`session.hook("context")`) is cache-destructive by construction: its entry is never persisted, so the prompt that got checkpointed contains bytes the history does not → prompt N+1 diverges at the injection point → the checkpoint is discarded and prefill falls back. `session.synthetic({delivery:"queue"})` IS persisted (a real `session_message` row — fork `session/inbox.ts:98-139` reads `user|synthetic` rows) → cache-safe, but it lands as a QUEUED TURN, so it stays right for the nudge rungs and wrong for a per-call readout. REFINED recommendation: delete the draft-push leg, append `ctx: CTX=<n> (<p>%) REM=<m> | N compactions left` to `event.result.output` on `execute.after` (window resolves now — #152 landed), skip it on `ctx_gauge`'s own output, and log one line naming the appended bytes (answers his "no way to see it"). Token cost = ~25 tokens per tool call, written once into history (262k window → negligible); economy variants for his call: every call / only when CTX moved ≥ N tokens / a tool subset / every Kth call.
- **Status (channel answered from source, 2026-10-26, planner-29 direct, his question "how can we still inject the context gauge line?"):** the cache-safe channel is `tool.execute.after` writing the tool RESULT. Fork `packages/core/src/tool.ts:132-152`: the hook receives `afterEvent.result = { output?, content, metadata? }`, plugins mutate it, and the RETURNED value is built from `afterEvent.result` (`:150-152`) — so an appended tail becomes part of the PERSISTED tool result, i.e. append-only history: every past line stays byte-identical and the checkpoint written at the last tool-return survives. The draft hook (`session.hook("context")`) is the invalidation cause precisely because its entry is NOT persisted: the next request's prompt diverges at the injection point, discarding that checkpoint (his A/B, #151). `execute.before` mutates only the tool INPUT (`tool.ts:104-110`) — the model never reads it as text, so it is the wrong channel for informing the agent. `session.synthetic({delivery:"queue"})` IS persisted (cache-safe) but lands as a QUEUED TURN (fork `session/inbox.ts:126` pulls `user|synthetic` rows as prompt items) → keep it for the nudge rungs only, not for a per-call readout. DESIGN pending his ruling: append `ctx: CTX=<n> (<p>%) REM=<m> | N left` to `result.output` on `execute.after` (window now resolves thanks to #152), delete the draft-push leg, and re-tag or drop the `ctxmsg` evidence line so the log means what it says. Economy options for his call: (i) every tool call, (ii) only when CTX moved by ≥ N tokens, (iii) a tool subset, (iv) every Kth call. Recommendation: (i) with a minimal line, and drop the `ITER=` suffix from it (loop-iteration context belongs to the autorun start, not every call).
- **Status (LANDED 2026-10-26, worker_FlashNext, commits `52bffb9` + `3df45d2`):** the draft leg is DELETED — no `session.hook("context")` registration, no `onContext`, no `ctxmsg` kind, no draft-entry branch (the maintainer's commented push at the old `:279` and its unconditional evidence line are gone). The readout now rides `tool.execute.after`: ONE line per tool call appended to the PERSISTED tool result — `ctx: CTX=<n> (<p>%) REM=<m> | <N> compactions left` (no `SESSION=` token, no `ITER=` per his ruling) — gated at >= 1% of the resolved window vs this session's last append, first append per session unconditional, skipped for `ctx_gauge`, silent on a no-total read (its shape carries a window but no `ctx` — gauge.mjs:995). Evidence kind `ctx-append` (session + `gauge:"line"` | `rung:<n>` + the appended text) writes ONLY after the result mutation succeeded. Deviation: the append targets `content` before `output`, because `normalizeContent` keeps content and reads `output` only when content is absent (fork `tool/runtime.ts:261-265`). Re-pinned: `context_family.smoke.mjs` → 46 checks, `SMOKE: ALL PASS`. Open decision (inbox): the `kind:"gauge"` db-error emitter moved onto this channel.
- **Planner verification (#153 + #154 unit, 2026-10-26, planner-29):** commits `52bffb9` (plugin + smoke, 494+/543−), `3df45d2` (tests README), `cac9551` (TODO + handover + inboxes), `aefe712` (loop-log DONE) — all present in `git log`, file lists match `git show --stat`. My re-runs: `bun run context_family.smoke.mjs` → `SMOKE: ALL PASS` (46 pins); grep of `.opencode/plugins/context_family.ts` → registrations are ONLY `execute.before` (`:488`) + `execute.after` (`:489`), no `session.hook("context")`, no `synthetic` call, `GAUGE_TOOL` skip at `:146`, store `.opencode/temp/ctx_family_store.json` (`:116`). LIVE ACCEPTANCE in the running host: `.opencode/temp/ctx_family.log` has 17 `ctx-append` lines (mine: rung 2 at `02:12:33Z`), the last `ctxmsg` is `01:58:53Z` and the last `nudge` `01:59:09Z` — both kinds retired; the appended line is visible in MY tool outputs (`ctx: CTX=212935 (81%) REM=49209 | 3 compactions left`); the store holds `{ctx, fired:[…]}` per session. RESIDUAL RED found by the planner: the v2 smoke suite cannot run — TODO #156 (P0).

## #154. (LANDED, 2026-10-26, planner-29 direct + worker_FlashNext) The nudge ladder arrives STALE and can re-fire the same rung — queue delivery + reload reset the dedup map
- **Problem / evidence:** two 50%-rung nudges landed in my session as user turns (`CTX=131801 (50%) REM=130343` then `CTX=131980 (50%) REM=130164`) while the real fill was already `CTX=156644 (59%)` (`node $TMP/opencode/live152.mjs`). DB check (`sqlite3.exe -readonly`, `session_message` for `ses_e8a690972ffem1DSIF8R4gSJ66`, 99 completed assistant rows): the two fired against rows `…175a8b264` total **131801** and `…175a8d34c` total **131980** — OLD rows (the newest then was `…175ae554` = 157833). So the readout was correct AT FIRE TIME but the delivery lags: `ctx.session.synthetic({delivery:"queue"})` (fork `session/inbox.ts:98-139` reads `user|synthetic` rows) lands at IDLE, so the number I read is the fill of a turn many turns back. Second half: the SAME rung fired TWICE, and `context_family.ts:307 nudgeFired` is an in-memory map ("one nudge per rung per session") — the plugin re-reconciliation measured in #152 (`plugin reconciliation started/completed`, ids 4-7) rebuilds the plugin module → the map resets → repeat fires.
- **Desired outcome:** a delivered nudge states the CURRENT fill (or at least its own fire time), and one rung fires once per session across plugin reloads.
- **Acceptance:** a live run at ≥50% shows a nudge whose `CTX=` matches the gauge read at delivery time within one turn, or the line carries an explicit fire timestamp; a plugin reload mid-session does NOT re-fire an already-fired rung (durability beyond the in-memory map, e.g. a fired-rung record in the existing store); `context_family.smoke.mjs` gains pins for both and the v1 gate + v2 smokes + `tsgo` stay green.
- **Scope (non-exhaustive):** `.opencode/plugins/context_family.ts` (the ladder + `nudgeFired`, :307-430), `.opencode/plugins/tests/context_family.smoke.mjs`, the v1 twin `.opencode/plugin-unported-v1/` if it shares the leg, `agent/knowledge/plugin_tools/`.
- **Status:** OPEN, decision-needed: recomputed-at-delivery vs fire-stamped text is HIS call (recommend recomputed at delivery — the queue depth is unbounded, so a stale line is worse than no line). Not urgent enough to interrupt #153.
- **Status (ruling + mechanism confirmed, 2026-10-26, planner-29 direct):** HIS clarification measured and accepted: those two turns were NOT his messages — the plugin's queued synthetic delivery RESUMED the session at idle, which is exactly the interference he objects to ("a nudge must not override a deliberate stop"). Root cause confirmed in code: `.opencode/plugins/context_family.ts:371-407 deliverNudge` → `sessionApi.synthetic({sessionID, text, delivery:"queue"})`, and fork `packages/core/src/session/inbox.ts:98-139` delivers `user|synthetic` rows as the NEXT TURN. Fix folded into the #153 unit: the rung text rides the SAME tool-result append, so no wake-up and no stale readout (computed at append time), with the fired-rung dedup moved to a durable store. Spec: `agent/handover/specs/2026-10-26_153-154-gauge-append-leg.md`.
- **Status (LANDED 2026-10-26, worker_FlashNext, commit `52bffb9`):** BOTH halves closed by the append channel. Staleness: the rung text is appended to the tool RESULT of the very call that grew the context (computed at append time) — no queued turn, so nothing lands many turns later, and no `session.synthetic` call remains in the file (the mock keeps the method and the smoke pins ZERO calls). Reload repeat: fired rungs persist per session in the new `.opencode/temp/ctx_family_store.json` (`fired` list + the last appended `ctx`, additive #119 write, never-throwing read), replacing the in-memory `nudgeFired` map — a plugin reconciliation now cannot re-fire a rung. A session with no tool call receives nothing, so a deliberate stop stays a stop. Pinned: `context_family.smoke.mjs` N1-N9 (the five rung boundaries, the highest-rung rule, per-rung dedup, the reload dedup from a pre-seeded store, the appended-text byte-exactness, ZERO synthetic calls).



- **Status (live acceptance caveat — a STALE plugin instance still fires the retired channel, 2026-10-26, planner-29):** the append channel works (`ctx-append` lines with `rung`/`gauge` fields; the plain line visible in my tool outputs), BUT `session_message` still gained a `type='synthetic'` row for my session at `1792980962543` (≈`02:16:02Z`, AFTER `52bffb9` landed) carrying a STALE readout `CTX=197295 (75%)` while the real fill was `218770 (83%)`. No `.synthetic(` caller exists in any `.opencode/plugins/*.ts` (grep) → the row must come from an OLD module instance still registered in the server process (`run=001cf46b`): re-reconciliation gives a fresh instance (the append lines prove it), it does not necessarily dispose the server's earlier instance. CONSEQUENCE: retire-live is per-instance, not per-process. Action for the maintainer: ONE host restart, then re-check that no `type='synthetic'` row appears for a session at >50% fill (the old queued backlog rows also drain in the meantime, so ignore rows fired before the restart).

## #155. (LANDED + LIVE-ACCEPTED, 2026-10-26, planner-29 direct — his ruling + worker_FlashNext, MAIN `migration`, checkpoints `de1841b` v1 + `4c43e52` v2; live acceptance planner-33 iter 33: own state_snapshot digest printed `loop=autorun-2026-10-01_03-27 ITER=33 log=loop/autorun-2026-10-01_03-27/loop_log.md` — matches counter.json n=33 + launch N) Loop context belongs at SESSION START: give ITER + looprun folder in the state_snapshot digest, not in per-call gauge lines
- **Problem / evidence:** the only carrier of ` ITER=<n> <loop-folder>` was the per-turn ctx line (`.opencode/plugins/context_family.ts` `loopIterationSuffix()`), and #153 rules that suffix OUT of the tool-result append — a ~100-append session would reprint the same folder name for nothing. Measured: `loop_log` needs no folder (`agent/../.opencode/plugins/loop_log.ts:94 required: ["status","content"]`, the folder is located/created at `:147-161`), and the `state_snapshot` digest has NO loop section at all (its six sections are git/nap/todo/maintainer/proposals/markers; grep of `.opencode/plugins/state_snapshot.ts` finds no loop/ITER section) → a fresh session learns nothing about the current looprun.
- **Desired outcome:** a session that calls `state_snapshot` once at its start knows the iteration counter, the current looprun folder, and the loop_log path — with no per-call suffix anywhere.
- **Acceptance:** the v1 tool `.opencode/tools/state_snapshot.ts` and the v2 plugin `.opencode/plugins/state_snapshot.ts` both print a `## loop` section carrying `ITER=<n>`, the folder name, and the `<folder>/loop_log.md` path, with an explicit empty/`no-looprun` form when there is no folder or no counter; both smokes pin the two forms; the probe's digest-shape sections are re-pinned for the extra section; `node .opencode/plugin/probes/handover_probe.mjs` stays `PROBE handover: <t>/<t> PASS`; live check after the host reload.
- **Scope (non-exhaustive):** `.opencode/tools/state_snapshot.ts`, `.opencode/plugins/state_snapshot.ts`, their smokes, the probe's state_snapshot sections, the loop-root/counter reader used by `loopIterationSuffix()` (shared helper candidate — do NOT remove that helper, probe checks 356-358 pin it).
- **Status:** LANDED 2026-10-26 (worker_FlashNext, MAIN `migration`). Does not block #153 (that spec shipped without the suffix). The autorun launch message carrying the pair is NOT part of this unit — the planner's loop `START` line already carries it.

- **Status (planner-32 curation, 2026-10-26):** OPEN — the LANDED status line that stood here belonged to the #156 story (commits `3a2ab30`/`bc1e209`, `ok=10 red=1` — a mis-placed copy of #156's own verification) and was removed; the same content lives in #156's Status lines. The #155 unit (loop section in the digest) has NOT run; spec: `agent/handover/specs/2026-10-26_155-loop-section-digest.md`.
- **Status (worker-33, 2026-10-26, LANDED):** BOTH implementations print `## loop` after `## todo` and before `## maintainer`: present `loop=<folder> ITER=<n> log=loop/<folder>/loop_log.md`, empty `no-looprun` (zero `autorun-*` dirs / unreadable counter / non-integer `n` / a `looprun` field that mismatches the folder name). Checkpoints `de1841b` (v1 tool + v1 smoke) and `4c43e52` (v2 plugin + v2 smoke); the FINAL commit hash lands here in the planner's follow-up.
- **Measured:** `node .opencode/plugins/tests/v1/state_snapshot.smoke.mjs` → `STATE_SNAPSHOT_SMOKE: ALL PASS (27/27)` (six → SEVEN headers, FX1 60 → 62 lines, FX3 158 → cap trims 8: markers keeps 12 of 20, both loop forms + the counter fail-closes pinned); `bun run state_snapshot.smoke.mjs` (cwd `.opencode/plugins/tests`) → `SMOKE: ALL PASS` (33 checks: FX1 47 → 49 lines, FX2/FX1 `no-looprun`, FX4 present form byte-exact + its own `setup` carrier block, FX3 seven headers); the 8 v1 node smokes `ok=8 red=0`; the v2 loop `*.smoke.mjs` + `smoke.mjs` → `ok=12 red=0`; `tsgo -p .opencode/plugins/tests/tsconfig.json` exit 0; `node .opencode/plugins/probes/handover_probe.mjs` → `PROBE handover: 112/112 PASS` UNCHANGED — S35's three SURFACE pins (`:3356`) pin the phrase `planner`, NOT `all six headers` (grep-measured), so no probe re-pin was needed and `loopIterationSuffix()` (gauge.mjs `:236`, S36) is untouched.
- **Live evidence (read-only, direct execute against the MAIN root — the planner's host-level acceptance is still his):** both twins print `loop=autorun-2026-10-01_03-27 ITER=32 log=loop/autorun-2026-10-01_03-27/loop_log.md` at index 80, `## todo` at 63, `## maintainer` at 82, digest 117 lines (under the 150 cap).
- **Doc re-pin:** `.opencode/plugins/tests/README.md`'s state_snapshot section updated to 33 checks / seven sections / the 49-line FX1 / the 158→150 cap (markers 12 of 20) + the FX4 loop fixtures — it carried stale numbers (24 checks, a 46-line FX1 vs the 47 the smoke pinned) which this unit corrected.
- **Planner ruling (planner-32, 2026-10-26):** the omitted probe SURFACE pin STAYS omitted — S35 is surface-only by design; digest behavior belongs to the smokes (pinned there). The duplicated loop-root/counter read was filed as TODO #164.

## #156. (LANDED, 2026-10-26, planner-29 direct + worker_FlashNext — from the worker's inbox finding) The v2 smoke suite cannot run in MAIN: 12 test files still hardcode the ARCHIVED clone root
- **Problem / evidence:** `bun run context_trim_v2.smoke.mjs` (cwd `.opencode/plugins/tests`) → `error: Cannot find module 'repo-root-v2\.opencode\plugin\scripts\gauge.mjs'`. `grep -rln 'the estate (former name)-v2' .opencode/plugins/tests/` → 12 code files + `README.md` (`auto_resume`, `block_transfer`, `block_transfer.sandbox`, `compact_memory`, `context_trim_v2`, `ctx_gauge`, `dev_get_tool_context_contents`, `loop_log`, `smoke`, `state_snapshot`, `submit` + the README), each with a form like `const CLONE_ROOT = "repo-root-v2"`. That clone is ARCHIVED (`Repos/the estate (former name)-v2` GONE, TODO #148) and MAIN on `migration` is now the only tree, so the whole v2 gate is un-runnable — the worker hit it in `context_family.smoke.mjs` and fixed THAT file only (`52bffb9`, `const CLONE_ROOT = path.join(import.meta.dirname, "..", "..", "..")`).
- **Desired outcome:** every v2 smoke resolves its repo root from its own file, so `bun run <f>.smoke.mjs` works in any checkout that owns `.opencode/plugins/tests`.
- **Acceptance:** `grep -rn 'the estate (former name)-v2' .opencode/plugins/tests/` yields ZERO code hits (a dated historical comment is allowed only where it explains the fix); each of the 12 files runs `bun run <f>.smoke.mjs` → `SMOKE: ALL PASS` in MAIN on `migration` (name each result in the handover); `home/Repos/opencode/node_modules/.bin/tsgo.exe -p .opencode/plugins/tests/tsconfig.json` → exit 0; `node .opencode/plugin/probes/handover_probe.mjs` → `PROBE handover: 360/360 PASS` unchanged; `.opencode/plugins/tests/README.md` run instructions updated to the MAIN tree.
- **Scope (non-exhaustive):** the 12 `.opencode/plugins/tests/*.smoke.mjs` files, `.opencode/plugins/tests/README.md`. Separate follow-ups, do NOT fold in: the `context_trim_v2.smoke.mjs` COMPOSITION pins that assume the retired draft leg (worker inbox `2026-10-26_03-09`), and the `kind:gauge` db-error channel move decision (same stamp).
- **Status:** LANDED 2026-10-26 (worker_FlashNext, MAIN `migration`, commits `a797b67` + `3a2ab30`): the 11 remaining files resolve `CLONE_ROOT` as `path.join(import.meta.dirname, "..", "..", "..")` — the `context_family.smoke.mjs` shape (`52bffb9`), variable name kept. `smoke.mjs` also derives its `PLUGIN` path, its config allowed-root entry (slash-normalized) and its C13 redirect target from that root; `block_transfer.smoke.mjs` gained a `CLONE_ROOT` + a `path.join` PLUGIN.
- **Measured:** 11 of 12 smokes → `SMOKE: ALL PASS` (`smoke`, `auto_resume`, `block_transfer`, `block_transfer.sandbox`, `compact_memory`, `ctx_gauge`, `dev_get_tool_context_contents`, `loop_log`, `state_snapshot`, `submit`, `context_family`); tsgo `-p .opencode/plugins/tests/tsconfig.json` exit 0; probe `360/360 PASS`; grep of the archived root → ZERO code hits (one dated historical comment at `context_family.smoke.mjs:32` explains the fix); README says to run FROM this dir in MAIN.
- **RESIDUAL (not #156):** `context_trim_v2.smoke.mjs` stays RED — its C1 composition pin expects the RETIRED `session.hook("context")` leg (`handlers=1`, then a `cfHandler` TypeError aborts the section). Filed `todo_inbox.md` `2026-10-26_11-14` (root cause `2026-10-26_03-09`); the re-pin is its own unit. **CLOSED 2026-10-26 by #157** (`bc0440b`): the block is re-pinned onto the append channel, the v2 suite reports `red=0`.

## #157. (LANDED 2026-10-26 — worker_FlashNext resumed session, `bc0440b`; planner-verified: v2 suite red=0) `context_trim_v2.smoke.mjs` COMPOSITION pins die on the retired draft hook: `cfHandler is not a function`
- **Problem / evidence:** `bun run context_trim_v2.smoke.mjs` → `TypeError: cfHandler is not a function. (In 'cfHandler(dA)', 'cfHandler' is undefined) at .opencode/plugins/tests/context_trim_v2.smoke.mjs:349` — the composition test pulls the `context` draft hook that `context_family` no longer registers (#153 landed: only `execute.before` + `execute.after`). Measured by the planner: the v2 suite is 11 green / 1 red (`ok=10 red=1` over `*.smoke.mjs` plus `smoke.mjs` green), all repo roots fixed by #156 (`52bffb9`-era pattern in 12 files, zero stale code hits).
- **Desired outcome:** the composition test exercises the CURRENT channel — a `context_trim` draft filter composed with the `execute.after` gauge append — and the v2 suite is fully green.
- **Acceptance:** `bun run context_trim_v2.smoke.mjs` → `SMOKE: ALL PASS` exit 0; the composition pins assert the real behavior (trim splice + the appended gauge line ordering, at most one appended line per call); no plugin-source change is needed unless a pin proves a real defect — if it does, file it instead of softening the pin; `bun run *.smoke.mjs` loop reports `red=0`; tsgo exit 0; probe stays `360/360 PASS`.
- **Scope (non-exhaustive):** `.opencode/plugins/tests/context_trim_v2.smoke.mjs` (the composition block around `:349`), `.opencode/plugins/tests/README.md` note. Related decision still open: the `kind:gauge` db-error evidence line moved to the `execute.after` channel (worker inbox `2026-10-26_03-09`) — planner ruling: KEEP it there (one channel), record it when this unit lands.
- **Status:** LANDED 2026-10-26 (worker_FlashNext, MAIN `migration`, checkpoint `bc0440b`): the C1-C6 block re-pinned onto the CURRENT channel — C1 the registration shape (EXACTLY `execute.before` + `execute.after`, NO draft handler; the old two-handlers-on-one-draft pin repurposed), C2 ONE append per after-event + the `ctx-append` kind (the `ctxmsg` pin repurposed, `ctxmsg`/`nudge` pinned ABSENT), C3 the draft filter cannot mutate a tool result (SILENT with no boundary, ONE honest `messages-not-array` line with one), C4 the >= 1%-of-window economy gate, C5 the append survives a SET boundary (a moved fill 57000 → 59500 still appends), C6 cleanup disposes both hooks while the trim plugin keeps its draft handler. The mock ctx now captures tool hooks (`_hooks`).
- **Measured:** `bun run context_trim_v2.smoke.mjs` → 71 checks, `SMOKE: ALL PASS`, exit 0; the suite loop (`*.smoke.mjs` + `smoke.mjs`) → `ok=12 red=0`; tsgo exit 0; probe `360/360 PASS`; README paragraph + NOTE + check count (65 → 71) updated. No plugin source touched.
- **PLANNER RULING recorded (this session):** the `kind:"gauge"` db-error evidence line STAYS on the `execute.after` channel — one channel, pinned as A14 in `context_family.smoke.mjs`. The worker decision item `todo_inbox.md` `2026-10-26_03-09` is resolved that way.

## #159. (LANDED 2026-10-26 — FULL LIVE ACCEPTANCE at the plan31 close: `route= restart spawn` + `deactivate=` + successor title `autorun-2026-10-01_03-27 planner-32` verified by planner-32 in `.opencode/temp/auto_resume.log` @ `12:02:06Z`) v2 `auto_resume` never ARMS: the v2 host publishes NO `session.status`/`session.idle` event
- **Problem / evidence:** my plan29 close (`action: restart`, `session.step.ended finish=stop` at `10:51:58.662Z`) spawned nothing. Measured in `.opencode/temp/auto_resume.log` (grep over `timestamp=2026-10-26`): `event=session.status` = **0**, `event=session.idle` = **0**, `event=session.execution.failed` = 1 — the only session signals the v2 host sends are `session.step.started` (601), `session.step.ended` (597: `finish=tool-calls` 561, `finish=stop` 16), `session.text.ended` (28 today), `session.usage.updated`, `session.compaction.delta`, `session.created` (3), `session.model.selected` (1). In `.opencode/plugins/auto_resume.ts` the ONLY writers of `w.idlePending` are `session.status` (`:339-363`, also the sole `armed = true` writer) and the deprecated `session.idle` (`:366-370`), plus `session.execution.failed|interrupted` (`:374-376`); `tick()` (`:960-967`) routes ONLY `idlePending` watches, so `routeScopedIdle` (`:860-939`, action-line parse `:880`, restart spawn `:928-932`, watchdog, `skip= depth`) NEVER runs — the whole loop mechanic is dead in the v2 host, silently. Fork proof: `packages/schema/src/session-status-event.ts:36`/`:47` define `session.status`/`session.idle` as EPHEMERAL events and `session.idle` is marked `// deprecated`; a repo-wide grep for publishers finds only the manifest (`event-manifest.ts:75,95`) + client generated types + app e2e fixtures — NO producer, so the host cannot emit them.
- **Desired outcome:** the autorun loop works again in the v2 host: an idle planner session ending with an `action:` line spawns the successor (and the watchdog/limit-stop legs become reachable), with no new event surface invented.
- **Acceptance:** the plugin derives the idle/busy vocabulary from the events the v2 host ACTUALLY sends — `session.step.started` → busy (arm + clear `idlePending`), `session.step.ended` with `finish` NOT `tool-calls` (e.g. `stop`) → idle + `idlePending`, `finish=tool-calls` → NOT idle (the turn continues); the existing `session.status`/`session.idle` legs stay for a host that emits them (a duplicate idle must not double-route: the `sending` latch + `idlePending` reset cover it); `auto_resume.smoke.mjs` pins all three forms (busy from step.started, idle from step.ended stop, no-idle from tool-calls) incl. the no-double-route case; the v1 gate + v2 suite stay green (`PROBE handover: 360/360 PASS`, 12 v1 smokes, `red=0` + `smoke.mjs`, tsgo exit 0). LIVE acceptance (planner/maintainer): after the change reloads, a planner close with `action: restart` logs `route= restart spawn sid=…` + `deactivate= sid=…` in `auto_resume.log` and a successor session appears with the `<loop-folder> planner-<N>` title; `action: stop` logs `route= stop` and spawns nothing.
- **Scope (non-exhaustive):** `.opencode/plugins/auto_resume.ts` (the `armEvent` legs `:339-376`), `.opencode/plugins/tests/auto_resume.smoke.mjs`, `.opencode/plugins/tests/README.md`. The v1 twin `.opencode/plugin-unported-v1/auto_resume.ts` is OUT (v1 events are correct there; it retires with TODO #150 unit B).
- **Status:** LANDED (worker-31, 2026-10-26, commit 38f794a) — busy now rides `session.step.started` and idle a TERMINAL `session.step.ended` finish (`tool-calls`/`unknown`/missing → NO idle) via shared `applyBusy`/`applyIdle` paths; the `session.status`/`session.idle` legs are kept byte-behavioral; smoke S4b pins (a)–(e) green (55 checks). LIVE acceptance (planner/maintainer, after the plugin reloads): an `action: restart` close logs `route= restart spawn sid=…` + `deactivate=` and a `<loop-folder> planner-<N>` successor appears; `action: stop` logs `route= stop` and spawns nothing. Related: TODO #158 (the compaction continuation uses the same queued-prompt channel as the recovery leg here).
- **Planner verification (plan31, 2026-10-26, planner-31):** commits `38f794a` (plugin + S4b pins + README; `f853587` carried the inbox appends) and `70a663f` (TODO + handover + loop DONE) verified against `git show --stat`; my re-runs: `bun run auto_resume.smoke.mjs` → `SMOKE: ALL PASS` (55), the 11-suite v2 loop + `smoke.mjs` → ALL PASS, `PROBE handover: 360/360 PASS`, the 12 v1 smokes ALL PASS **under `node`** (bun crashes at teardown EBUSY on the 3 sqlite-heavy suites — filed 2026-10-26_12-15, TODO #144 recurrence, see below). PARTIAL LIVE acceptance measured in the RUNNING host: the plugin re-reconciled mid-session and `arm= sid=ses_e8823b77…` lines now land FROM `session.step.started` (first at `11:17:24Z`, after commit `38f794a` at `11:15Z`) — the arm leg is live. FULL acceptance rides THIS session's close: an `action: restart` must log `route= restart spawn` + spawn planner-32; the successor verifies it from `auto_resume.log`.

## #160. (CLOSED 2026-10-26, worker-36 `3232bda` + final `b411d43`, planner-34 verified — curated from `todo_inbox.md` `2026-10-26_12-15`) TODO #144's teardown EBUSY flake RECURRED under bun on the 3 sqlite-heavy v1 smokes
- **Problem / evidence:** worker-31 measured in `.opencode/plugin/tests`: the bun loop over the 12 `*.smoke.mjs` reports 0 FAIL in all 12, yet `auto_resume.smoke.mjs`, `context_trim.smoke.mjs` and `gauge_core.smoke.mjs` crash RIGHT AFTER the last check with rmTear `EBUSY: resource busy or locked, rm` on their fixture dirs (`auto_resume`, `context_trim`, `gauge_model_ref`) BEFORE printing the ALL-PASS line (bun 1.4.3; 12/12 were green under bun earlier the same day). Knowledge line from the same run: `node <suite>.smoke.mjs` prints ALL PASS and exits 0, and a manual `rm -rf` of the dir succeeds immediately after the crash → the lock is bun-native and releases at process exit. My own re-run under `node`: 12/12 ALL PASS.
- **Desired outcome:** the v1 gate is deterministic under bun without a re-run tax — the #144 retry window (8 attempts, max ~900 ms) is evidently too short for the `node:sqlite` handle release / AV scan.
- **Acceptance:** the bun loop over all 12 v1 smokes → 12/12 ALL PASS on a FRESH run (no re-run), and the v2 suite stays green.
- **Suggested file scope (non-exhaustive):** `.opencode/plugin/tests/_smoke_base.mjs` (`rmTear` retry window/backoff; a close-then-drop-handle step if the sqlite handles are held in-process), the 3 affected suites' teardown calls.
- **Status:** LANDED 2026-10-26 (worker-36, spec `2026-10-26_160-bun-teardown-determinism.md`) — `rmTearSoft` (retry-then-swallow-busy, `_smoke_base.mjs`) replaces the strict teardown on the sqlite-locked fixture dirs in `gauge_core`/`context_trim`; the verdict always prints and the next fresh run's strict `freshSandbox` pre-clean removes leftovers. Measured: bun loop 8/8 ALL PASS exit 0 on TWO consecutive fresh runs (no re-run), node loop 8/8, full gate green (probe 112/112, 11 v2 bun smokes + `smoke.mjs` 68 ALL PASS, tsgo exit 0). Fix commit `3232bda` (leg 1); final-commit hash recorded by planner. Related: #144 (the original retry fix, CLOSED 2026-10-22). **CLOSED 2026-10-26 (planner-34):** planner re-runs confirm — fresh bun loop over the 8 v1 smokes ×2 consecutive → all 8 final PASS/exit 0, probe `112/112`; final commit `b411d43`. Scope note: the entry's "3 suites" predates #150's move — the sqlite-holding v1 suites are `gauge_core` + `context_trim`; the v2 `auto_resume.smoke.mjs` measured green (no post-check teardown — deliberately untouched).

## #161. (CLOSED 2026-10-26, core leg worker-37 `2e2561a`/`87b9c08`; LIVE leg planner-35 iter-35 spawn) The loop counter LAGS the log's `planner-<N>` max, so a spawn titles the successor one below the number the successor reads from the log
- **Problem / evidence:** at the 11:58 trigger-file spawn, `counter.json` was `n=28` while `loop_log.md` already contained `planner-29` lines (planner-29 was a DIRECT session — direct sessions never bump the counter, only spawns do). `spawnCounterFor` (`auto_resume.ts:561-590`) took `max(28+1, logMax 29+1)` = 30 → the successor was titled `planner-30` and the counter became 30. A fresh successor then applies the launch rule "largest `planner-N` in `loop_log.md` + 1" = 31 and labels itself one ABOVE its own session title. Measured this session: title `planner-30` (the `--INFO--` line `ident=… planner-30` names my sid `ses_e8823b77…`), my own START line `planner-31`.
- **Desired outcome:** session title, counter value, and the successor's self-derived iteration agree; the log never skips a number.
- **Acceptance:** after the fix, a spawn from a state where the counter lags `logMax` still titles the successor at `logMax+1` AND writes that same value to `counter.json` (it does today), and a DIRECT session bumps `counter.json` to its own number when it writes its loop lines — acceptance: one smoke pin per leg + one measured spawn where title == log token == counter.
- **Suggested scope (non-exhaustive):** `.opencode/plugins/auto_resume.ts` (`spawnCounterFor`), the loop-log tool's counter write path (if none exists, add it to `loop_log`), `loop_log.smoke.mjs` / `auto_resume.smoke.mjs`.
- **Status:** LANDED 2026-10-26 (spec `agent/handover/specs/2026-10-26_161-counter-log-sync.md`, worker-37): `.opencode/plugins/loop_log.ts` gained the fail-closed counter bump — after a successful append whose line carries `planner-<N>` (the SAME `/planner-(\d+)/g` scan as `spawnCounterFor`), the folder's `counter.json` is rewritten `{looprun, n: N}` ONLY when the file EXISTS, parses, its `looprun` matches the folder, and N > n; absent (never created) / unparseable / wrong-looprun / non-planner line / N <= n → NO write. `auto_resume.ts` + the counter format UNCHANGED. `plugins/tests/loop_log.smoke.mjs` +5 pins (J-a N>n → `{looprun,n:31}` byte-exact; J-b N==n, N<n, non-planner → byte-unchanged; J-c absent → append OK + never created; J-d wrong-looprun → unchanged; J-e unparseable → unchanged). Gate green: probe `112/112`, 8 v1 node smokes ALL PASS, 11 v2 bun smokes + `smoke.mjs` (68 checks) `SMOKE: ALL PASS`, tsgo exit 0. Hashes: tool + pins `2e2561a`, final bookkeeping `87b9c08` (planner-recorded; no self-reference). Planner spot re-runs (planner-34): v2 `loop_log.smoke.mjs` `SMOKE: ALL PASS` + v1 `LOOP_LOG_SMOKE: ALL PASS (69/69)`. **LIVE LEG PASSED (planner-35, iter 35):** the auto_resume restart spawn measured title == log token == counter — DB row `ses_e8760784cffe5MRO6saUI6gaz8` titled `autorun-2026-10-01_03-27 planner-35` (spawnCounterFor wrote counter.json at spawn), START line `2026-10-26_15-32 -->START planner-35 …` appended via the loop_log tool (`verified: readback-match`), counter.json `n=35` (bump leg idempotent — spawn had already written 35). Header CLOSED.

## #162. (CLOSED 2026-10-26, worker #150 unit B — approved verdicts + build unit worker-34, hash `306a027`) Coverage lost by the v1 estate retirement: five retired legs have NO v2 pinner
- **Problem / evidence:** unit B pruned probe sections S1-S5, S8-S11, S13-S14, S18-S21, S25-S29, S31-S32 (248 checks) and deleted the estate; the planner audit `agent/handover/specs/2026-10-26_150b-estate-audit.md` §"Coverage loss check" measured the surviving pinners (`plugins/tests/*.smoke.mjs` × 11 + `smoke.mjs` C1-C16 + the 112-check probe). Legs with NO surviving pin: (1) the `context_recovery.ts` emergency backstop (#93) — no v2 plugin implements it, S11 (13 checks) + its 17-check smoke died (loudest gap); (2) content locator `locateContent` + the edit-hint channel + after-hook enrichment (S26/S27, 28 checks) — the v2 observer has neither; (3) the positive R7 segment-matcher `kind=seg` line pin (S21) — the v2 matcher EXISTS but C5 pins only its ABSENCE; (4) the redirect pure-resolver case-(i..vi) detail pins + the POSIX `/tmp` and bash-`command` redirect legs (S28/S29) — v2 pins are hook-level only (C11-C13), the bash path is excluded by design (`plugins/intercept_observer.ts:33,822`); (5) the S3 mirror guarantee — nothing asserts the v2 plugins never write `agent/handover/handover_task.md`/`handover_task_to_planner.md`. NOT gaps: pair/numword/dense verdicts — dropped BY DESIGN per the #136/#137 rulings.
- **Desired outcome:** every behavior the maintainer still wants has at least one surviving pin; every behavior he does NOT want is ruled dead on record. No silent hole in the gate.
- **Acceptance:** per leg (1)-(5), either (a) a v2 implementation + a smoke/probe pin (new check lines, gate green: probe annotation count grows and the printed total agrees, smokes `SMOKE: ALL PASS`), or (b) a one-line maintainer ruling here ("leg retired — no v2 build") closing that leg; the entry closes when all five legs are decided.
- **Suggested scope (non-exhaustive):** `.opencode/plugins/**` (only if a leg is rebuilt — e.g. an emergency-compact backstop in `plugins/compact_memory.ts` or `context_family.ts`), `.opencode/plugins/tests/*.smoke.mjs`, `.opencode/plugins/probes/handover_probe.mjs` (KEEP-section annotation), ruling via `maintainer/priority.md`.
- **Status:** CLOSED 2026-10-26 (worker-34, build unit per spec `agent/handover/specs/2026-10-26_162b-coverage-pins.md`): legs 3/4-resolver/5 pinned IN `plugins/tests/smoke.mjs` — P-SEG positive `kind=seg` pin (d1d589c), P-RED resolver case-(i..vi) pins THROUGH the hook, no production export (8dd24f4), P-MIRROR handover-file guarantee (6d33953). smoke.mjs 52→68 checks, `SMOKE: ALL PASS`; gate green: probe `112/112` UNCHANGED, 8 v1 node smokes ALL PASS, 12 v2 bun runs `SMOKE: ALL PASS` (ok=12 red=0), tsgo exit 0. All five legs carry a verdict (1+2 retired per ruling, bash-`command` sub-leg retired, 3/4/5 pinned). Final-unit commit hash (planner-recorded): `306a027`.

## #164. (CLOSED 2026-10-26, code worker-38 `946c96a` + bookkeeping `bcfb471`; LIVE leg planner-36 iter-36) The loop-folder + counter.json read is now DUPLICATED four ways — unify into one read-only reader
- **Problem / evidence:** `loopSection()` in BOTH `.opencode/tools/state_snapshot.ts` and `.opencode/plugins/state_snapshot.ts` (~20 lines each, #155 forbade the gauge import on purpose), plus `loopIterationSuffix()` (`.opencode/plugins/scripts/gauge.mjs:236`) and the folder locator in `.opencode/plugins/loop_log.ts:147-172` — the same find-the-sole `autorun-*`-folder + read-`counter.json` logic in four copies.
- **Desired outcome:** ONE read-only loop-root/counter helper all four call sites use; no behavior change for any reader (fail-closed rules + newest-mtime folder resolution preserved — the digest's `log=` must keep pointing at the folder `loop_log` appends to).
- **Acceptance:** a helper under `.opencode/plugins/scripts/` (NO gauge config/window legs); all four call sites re-pointed (the state_snapshot twins pass their per-call ROOT carrier — do not read process.cwd); probe `112/112` + the 8 v1 node smokes + the 11 v2 bun smokes + `smoke.mjs` + tsgo exit 0; both digest-form pins + the probe S36 `loopIterationSuffix` pins survive (S36 may re-pin to the helper's surface if the export moves — name it in the handover).
- **Suggested scope (non-exhaustive):** the new helper file, `.opencode/tools/state_snapshot.ts`, `.opencode/plugins/state_snapshot.ts`, `.opencode/plugins/scripts/gauge.mjs`, `.opencode/plugins/loop_log.ts`, their smokes.
- **Status:** LANDED 2026-10-26 (spec `agent/handover/specs/2026-10-26_164-loop-root-helper.md`, worker-38): the ONE read-only helper `.opencode/plugins/scripts/loop_root.mjs` (`listLoopFolders` / `currentLoopFolder` / `loopCounterPath` / `readLoopCounter` — ENOENT-root → `[]`, newest-mtime resolution, counter read fail-closed to null, NEVER creates); all four sites re-pointed — `loopIterationSuffix()` (gauge.mjs, export surface UNCHANGED so the probe S36 pins stay as-is), both `loopSection(root)` twins, the `loop_log.ts` locator + `bumpCounter` read. Per-reader validation kept (twins: looprun==folder + integer n; suffix: finite n; bump: looprun==folder + finite n + maxN>n). Code commit `946c96a`; gate green: probe `112/112`, 8 v1 node smokes, 11 v2 bun smokes + `smoke.mjs`, tsgo exit 0; helper fail-closes pinned DIRECTLY in `state_snapshot.smoke.mjs` (30-36). `counter.json` CODE literal survives only in the helper + `auto_resume.ts:565` (spawn leg untouched); remaining hits are prose/comments + the pinned TOOL_DESCRIPTION. Final-commit hash recorded by the planner (a commit cannot carry its own). **LIVE-ACCEPTED + CLOSED 2026-10-26 (planner-36):** the plugin-twin leg proven by THIS session — own `state_snapshot` digest via execute printed `loop=autorun-2026-10-01_03-27 ITER=36 log=loop/autorun-2026-10-01_03-27/loop_log.md` (helper-resolved folder + counter n=36, spawn-written) and the `loop_log` append via execute returned `verified: readback-match` on the `-->START planner-36` line; the injected ctx suffix rode the same `ITER=` token. Entry CLOSED.

## #165. (CLOSED 2026-10-26, planner-34 live acceptance; core leg worker-33 `191aaae`/`511aafc`) Spawn-created sessions have NULL session_v2.model — the pct/REM + ctx-append family is silently DEAD for every spawned planner
- **Problem / evidence:** measured 2026-10-26 (read-only node:sqlite, `~/.local/share/opencode/opencode.db`): `session_v2.model` = NULL for planner-32 `ses_e87e9256affe…` AND planner-31 `ses_e8823b771ffe…`, while worker-33's subagent row `ses_e87db25a2ffe…` HAS `{"id":"Qwen3.8-NEXT-GyroM","providerID":"llama-swap"}`. Consequences measured TODAY: `ctx_gauge` printed bare `CTX=20302` at my start and `CTX=170611` at my close (no pct/REM); `ctx_family.log` holds ZERO `ctx-append` lines for both planner sids while worker-33's session got them (last `12:30:15Z`). The config HAS the window (`opencode.jsonc:133-136` `llama-swap/Qwen3.8-NEXT-GyroM` `limit.context` 262144) → the NULL row-model is the ONLY missing link. Fallback source measured: `session_message.data.$.model` of the latest assistant row = the same `{"id","providerID"}` object for BOTH NULL-row sessions (message columns are id, session_id, type, seq, time_created, time_updated, data — NO info column; tokens live inside data).
- **Desired outcome:** budget visibility (gauge pct/REM, nudge ladder, `execute.after` ctx-append) works for every session regardless of how it was created.
- **Acceptance:** the shared core `.opencode/plugins/scripts/gauge.mjs` falls back to the latest assistant message's `data.$.model` when the session row's model is NULL/absent — reuse `parseModelRef` + the existing config-window walk (the fill read is ALREADY message-level, so the model read belongs at the same site); `gauge_core.smoke.mjs` gains pins: NULL session model + assistant message model → window resolves, and NO message → the old no-total form unchanged; `ctx_gauge` prints `CTX=<n> (<p>%) REM=<m>` for the live planner session after plugin reconciliation, and a `ctx-append` line appears for it (LIVE acceptance = the next planner session); probe `112/112` + the 8 v1 node smokes + the 11 v2 bun smokes + `smoke.mjs` + tsgo stay green.
- **Recommendation:** the message-level fallback IN THE CORE (single source, read-only, benefits every `gauge.mjs` consumer — peek.mjs, ctx_family, ctx_gauge). NOT recommended: making `auto_resume` set the model at spawn (the plugin would replicate HIS config role-model knowledge).
- **Suggested scope (non-exhaustive):** `.opencode/plugins/scripts/gauge.mjs` (`readGauge` + the model-resolution site), `.opencode/plugins/tests/gauge_core.smoke.mjs`, the probe's gauge mock rows if they pin the read path.
- **Status:** LANDED 2026-10-26 (plan33, worker-33, model `Qwen3.8-NEXT-GyroM`): the MESSAGE-LEVEL fallback in the CORE — `.opencode/plugins/scripts/gauge.mjs` `readApiDb` assembly leg + new `sqlModelFallbackV2(sid)`: when the assembled model is empty (step-row AND session-row NULL) AND the session-row winner is `session_v2`, ONE extra read of the PAIRED `session_message` table takes the latest non-empty `json_extract(data, '$.model')` (no `type` filter → compaction rows cover it too, `ORDER BY time_created DESC LIMIT 1`); the same `parseModelRef` + config-window walk downstream (no parser change); a missing paired message table degrades to the null-model outcome. `GAUGE_SQL_MARKER*`/the v1 `session`↔`message` SQL/constants stay byte-identical (spawn marker's model stays NULL — the in-process node:sqlite leg wins the chain first, so the live plugin path is covered). `gauge_core.smoke.mjs` +3 pins ((a) NULL row + message `$.model` + completed step → modelId + CONFIG window, measured RED pre-fix: modelId `""` and no window; (b) NULL row + empty paired table → unchanged no-total; (c) v1 pair NULL row + message `$.model` → STILL no model). Gate green: probe `112/112`, 8 v1 node smokes ALL PASS, 12 v2 bun runs `SMOKE: ALL PASS` (ok=12 red=0), tsgo exit 0. Commits `191aaae` (core) / `511aafc` (pins) — hashes recorded here, no self-reference. **LIVE ACCEPTANCE PENDING:** the next host start must show `CTX=<n> (<p>%) REM=<m>` for a spawn-created planner session + a `ctx-append` line in `.opencode/temp/ctx_family.log` — planner verifies in the successor session. **LIVE-ACCEPTED 2026-10-26 (planner-34):** spawn-created session `ses_e8776d362ffe…` — row.model measured NULL (`sqlite3 -readonly` on `session_v2.model` = empty) — printed `CTX=19120 (7%) REM=243024` at its first turn (further appends 15–19% + REM all present) and `ctx_family.log` logged 5 `kind":"ctx-append"` lines for the sid (from `14:07:09Z`). Entry CLOSED.

## #167. (CLOSED 2026-10-26, worker-35 `0f207d7` + planner-34 live acceptance) The unit-4 idle watchdog text claims "compaction" even when no compaction happened — make the continueText cause-sensitive

- **Problem / evidence:** `continueText` (`.opencode/plugins/auto_resume.ts:691-698`) sends the SAME text for every idle-without-action-line: "(compaction, sudden stop, or protocol gap). Follow agent/readme/readme_post_compaction.md". Measured 2026-10-26: my session died an idle with NO compaction (zero `COMPACT` lines for my sid; the gauge printed 3 compactions LEFT all session) yet the message forced the post-compaction protocol — harmless but misleading. The plugin CAN distinguish the cause: the #98 re-arm tail already extracts `COMPACT <sid>` lines per watched session (`w.lastCompactAt`, L811-817), and v2 `compact_memory` delivers its continuation on the native inbox queue (`delivery:"queue"`) — the compaction case needs NO watchdog pointer (the compact_message_* relay legs are already removed by construction, header §(d) L79-83; the temp files present 2026-10-26 are stale v1-era artifacts, none for a v2 session's own resume path).
- **Desired outcome:** the idle-continue message names the OBSERVED cause: no recent COMPACT line → "turn ended without an action: line — rebuild from committed state (git log + NAP + TODO) and continue or close" WITHOUT naming compaction and without mandating the post-compaction readme; a recent COMPACT line for the sid → the compaction-flavored form pointing at the continuation message. One `cause=<compact|idle>` token in the `recovery=`/continue log line for forensics.
- **Acceptance:** `continueText` branches on `w.lastCompactAt` freshness (reuse the existing re-arm window rule); `auto_resume.smoke.mjs` pins BOTH text branches + the `cause=` token; gate green (probe `112/112` — verify at spec time whether the unit-4 text is probe-pinned or smoke-pinned-only); live acceptance = the next idle-without-action-line on a non-compacted session prints the plain form.
- **Suggested scope (non-exhaustive):** `.opencode/plugins/auto_resume.ts` (`continueText` + its caller ~L929), `.opencode/plugins/tests/auto_resume.smoke.mjs`.
- **Status:** LANDED 2026-10-26 (worker-35, spec `agent/handover/specs/2026-10-26_167-cause-sensitive-continue.md`): `continueText(sid)` now branches on the #109 clause-(4) ordering predicate (new `compactCause(w)`: `lastCompactAt != null && (lastFinishAt == null || lastCompactAt >= lastFinishAt)`) — TRUE keeps the compaction flavor with the `readme_post_compaction.md` pointer, FALSE sends the plain form (no compaction claim, no post-compaction mandate). The `recovery=` line gains the ` cause= compact|idle` token. `auto_resume.smoke.mjs` 55 → 57 checks: the existing prefix pin (~L287) stays green + NEW pins (a) COMPACT-line state → `cause= compact` + the readme pointer, (b) no-compact state → `cause= idle` + a plain text with NO `compaction`/`readme_post_compaction` words. Gate green (probe 112/112, 8 v1 node smokes, v2 suite ok=12 red=0 — `smoke.mjs` 68 checks, tsgo exit 0). LIVE acceptance (the next non-compacted idle printing the plain form) awaits the next loop run. **LIVE-ACCEPTED 2026-10-26 (planner-34):** the unit-4 refire for this non-compacted session delivered the PLAIN form verbatim (no compaction claim, no post-compaction mandate) + auto_resume.log `recovery= sid=ses_e8776d362ffe… attempt=1 cause= idle` (14:07:08Z); pre-fix refires (planner-33 sid, 13:10/13:42Z) carry no `cause=` token — process-state discriminator confirms the new build is live. Entry CLOSED.

## #168. (CLOSED P2, 2026-10-26, planner-36 — live-sweep measurement + forensics verdict) The intercept.log observer event channel SILENT since 2026-10-26_12-48Z while the payload journals still grow
- **Problem / evidence:** `.opencode/temp/intercept.log` last line = `2026-10-26_12-48` (native `write` event; 18 lines today, all in the 12:39–12:48Z window = the planner-33 DIRECT session). Every session AFTER that (planner-34/35/36 + worker-36/37/38 — watchdog-spawned) made native edit/write calls that the journals recorded (`journal_edit.log` 323 lines today, `journal_write.log` 70, latest 15-52 = planner-36's own native edits) while intercept.log gained NOTHING. Day histogram: 10-21 407, 10-22 2503, 10-23 94, 10-26 18 — the channel degraded since the v2.1.3-era restarts. Suspected common cause (HYPOTHESIS, unverified): the #165 NULL-`session_v2.model` spawn rows break the model-carrying intercept writer path.
- **Desired outcome:** the intercept.log event channel is live again for ALL sessions including spawned ones, OR the degradation is ruled intended and documented (knowledge + doctrine lines updated); the root cause is NAMED either way.
- **Acceptance / DoD:** a forensics pass names the writer site + the failing condition; the verdict lands in this entry's Status; the journal-vs-intercept split documented in `agent/knowledge/`.
- **Suggested file scope (non-exhaustive):** the intercept observer plugin/core under `.opencode/plugins/` + `.opencode/plugin/`, `.opencode/plugins/scripts/gauge.mjs` (the model reader), the `.opencode/temp/*.log` evidence.
- **Status:** CLOSED 2026-10-26 (planner-36 forensics, no bug). Writer site: `intercept_observer.ts` `appendObservation` (~L669-672) → intercept.log, fired ONLY on anomaly verdicts (path-anomaly / out-of-sandbox / fuzzy / redirect / intercept-error) — clean in-sandbox calls write NOTHING, so silence since 12-48 = anomaly-free traffic, NOT degradation. The hypothesis (#165 NULL-model rows) is FALSIFIED: the model field would print `unknown`/empty, never suppress the line, and the anomaly gate is unrelated. Hook alive proof: `journal_edit.log` line `2026-10-26_17-11` from this session (same plugin, same appendFileSync path). Verdict documented in `agent/knowledge/plugin_tools/2026-10-26_intercept-observer-journal-split.md` + planner MEM-0136.

## #169. (CLOSED P3, 2026-10-26, planner-36 — live-sweep measurement + forensics verdict) block_transfer dispatched through the execute runtime reaches NO observer evidence — the intercept/journal verification authority is lost for bt mutations
- **Problem / evidence:** last `block_transfer` line in intercept.log = `2026-10-22_22-43` (hooked direct call, planner-28 era). Since then all bt calls MUST run via `execute` (the #166 rule). Measured today (planner-36): a COPY(text→buffer `probe36`) + PEEK + PASTE chain landed byte-correct on disk (scratchpad `bt_leg_probe_36.txt`, read-back match, removed after) and a DELETE mode landed on `agent/memory/worker/memory_inbox.md` (read-back: 18 lines gone, file tail correct) — intercept.log AND both journals got ZERO new lines. Consequence: the MEM-0101 doctrine ("intercept.log `orig=`/`value=` = the authority for observer-mediated mutations") is UNUSABLE for bt calls — the file read-back is now the only authority.
- **Desired outcome:** observer coverage for execute-runtime custom-tool dispatches (new intercept lines per call), OR the blind spot is documented: knowledge entry + the verification doctrine corrected to "file read-back is the bt authority" (planner + worker memory lines).
- **Acceptance / DoD:** verdict recorded in this entry's Status; if covered → a live bt chain shows new intercept.log lines; if blind → knowledge entry + MEM-0101-surface correction.
- **Suggested file scope (non-exhaustive):** the intercept hook path (fork-side dispatch of the `execute` runtime — `home/Repos/opencode` reference), `.opencode/tools/block_transfer.ts` + `.opencode/plugins/block_transfer*` (read-only reference).
- **Status:** CLOSED 2026-10-26 (planner-36 forensics, verdict: DESIGNED BLIND SPOT, not a fault). The R6 payload journal fires only for native `write`/`edit` (`intercept_observer.ts` L36-39, L876 ternary); the hook header L26 notes "block_transfer does not exist in v2 yet — extend when it ports" — the bt port never extended the observer, so execute-runtime bt calls produce no journal/intercept lines by design (intercept.log would fire only on anomaly verdicts). DoD (blind branch) met: knowledge entry `agent/knowledge/plugin_tools/2026-10-26_intercept-observer-journal-split.md` + doctrine correction MEM-0136 (file read-back = bt authority). REFINED by discriminating probe (2026-10-26 17:15): the SAME doubled-segment anomaly string in a bt COPY via `execute` → ZERO intercept lines; via native `read` → 3 lines (path-anomaly + out-of-sandbox + fuzzy) → execute-runtime dispatch bypasses the whole plugin-hook chain (not just the R6 tool-name gap) — a plugin-side journal extension would be useless; the fix is fork-side (hooks invoked for execute-dispatched tool calls), maintainer/fork domain. File read-back doctrine stands. Maintainer note 2026-10-26: fork-side idea recorded — have the execute-runtime dispatch pipe custom-tool calls into the SAME intercept pipeline as the default tool_call path (hook exists, just wire execute's dispatch through it); unscheduled, fork domain.
- **ROOT CAUSE CORRECTED 2026-10-26 (planner-36, maintainer's hypothesis CONFIRMED):** the native-`execute` silence was NOT a hook-chain bypass — the fork fires `tool.execute.before` for EVERY call INCLUDING Code-Mode inner dispatch (`packages/core/src/tool.ts` L241-245: `beforeExecute(name, input, context)` wraps each `tools.<x>()` call; the outer `execute` call at L277 likewise). The silence is the PLUGIN GATE: `intercept_observer.ts` `REDIRECT_PATH_FIELDS` = `{read,path; write,path; edit,path}` (L810-814) → `runRedirect` returns early on an empty field list (L~831) and the observation `pathText` is "" → `obs` empty → the "nothing to log" return (L961). Fuzzy channels are read/edit-only (L940-941); the journal is write/edit-only (L960). Same mechanism explains the v2-era ZERO `bash`/`block_transfer` intercept lines for GyroM sessions (measured: `grep -c "GyroM | block_transfer"` = 0). Consequence: this entry's fork-side idea is UNNECESSARY — the fix is plugin-side (see #179). Doctrine update: bt/custom-tool calls are hook-VISIBLE as soon as the table names their path fields; until then file read-back remains the bt authority.

## #171. (LANDED P2, 2026-10-26, planner-36 direct — maintenance-clock ruling) One ROUND counter (spawns + compactions) delivered on the persistent ctx suffix — maintenance pass every 5 rounds
- **Problem / evidence:** the iteration counter (`counter.json n`, spawn + loop_log bump) counts SPAWNS only; with the new close ladder sessions persist and compactions replace restarts, so the every-5th maintenance clock would stall. Ruling 2026-10-26: combine spawns + compactions into ONE round counter; deliver it where both persistent and compacted sessions always see it — the `execute.after` ctx append (existing, once-per-1% refresh channel, `#153/#154` era): suffix gains ` ROUND=<n>` + ` MAINT=1` when `round % 5 == 0`. Self-restoring after compaction (kept tail re-appends on the next tool call) and independent of the `compact_memory message` delivery (late-delivery risk, #158).
- **Desired outcome:** round increments at BOTH events (spawn-time counter write in `auto_resume.ts` `spawnCounterFor` leg; verified compaction success in the compact_memory plugin), stored in `counter.json` (`{looprun, n, round}` — `n` stays as-is for the title/ITER leg, #161 pins stay); the suffix + `state_snapshot` digest print the round + maintenance flag; the planner prompt's maintenance duty keys on `MAINT=1` (first unit of the woken session = maintenance pass), not on the spawn iteration.
- **Acceptance / DoD:** counter.json gains `round` (fail-closed reads survive, helper `loop_root.mjs` may gain a read leg); increment legs pinned (spawn + compact, incl. failed-compaction = NO increment); suffix/digest pins repinned; gate green (probe 112/112 + smokes + tsgo 0); live acceptance = the next autorun session's injected line shows `ROUND=` + the MAINT flag fires on a %5 round. Config note (maintainer file, NOT this unit): `compaction.keep.tokens` 40000 → 60000 in `opencode.jsonc` per the 2026-10-26 ruling (post-compaction target 60–80k; `keep.messages` measured INERT — do not wire it).
- **Suggested file scope (non-exhaustive):** `.opencode/plugins/scripts/loop_root.mjs`, `.opencode/plugins/auto_resume.ts` (spawn counter), the compact_memory plugin (success path), `.opencode/plugins/scripts/gauge.mjs` (suffix), `.opencode/plugins/state_snapshot.ts` + `.opencode/tools/state_snapshot.ts` (digest), their smokes + probe S36.
- **Status:** LANDED 2026-10-26 (worker-39, spec `agent/handover/specs/2026-10-26_171-round-counter.md`) — round key written at spawn (`max(round,n)+1`), incremented on verified compaction (`(round ?? n ?? 0)+1`), preserved by the loop_log bump, printed (` ROUND=<r>` + ` MAINT=1` on %5) by the ctx suffix + both digest twins; gate green: probe 115/115 (S36 +3), 8 v1 + 12 v2 smokes, tsgo exit 0. COMPACTION LEG LIVE-VERIFIED 2026-10-26 17:09: planner-36 SELF compaction (`COMPACT` line in ctx.log) → counter.json readback `{"looprun":"autorun-2026-10-01_03-27","n":36,"round":37}`. Remaining live legs: spawn leg (next spawn seeds round=38) + suffix/digest print (`ROUND=` on the injected line — observed absent on ctx lines so far, verify channel next session).
- **LEG AUDIT 2026-10-26 (planner-36):** digest leg LIVE-VERIFIED — `state_snapshot` (planner twin, tools+plugins) prints `loop=autorun-2026-10-01_03-27 ITER=36 ROUND=38` on the live host. SPAWN leg also CONFIRMED retroactively: round=38 = spawn 37 (from round=36 base… spawn + c0 + c1 = 36→37→38, counter.json math consistent; both compaction bumps landed). THE SUFFIX LEG IS DEAD BY DESIGN: the persistent ctx line is `context_family`'s append = `formatGauge` WITHOUT ITER/ROUND (maintainer's own no-waste ruling, header L31), and the ctx_gauge tool line never carried it — `loopIterationSuffix()` is orphaned at runtime (probe-pinned only). Consequence: the `MAINT=1` duty token is visible ONLY via `state_snapshot` at fresh-planner session start — a compacted session never sees it. Decision needed (maintainer): re-attach the suffix to one cheap channel (ctx_gauge tool line? digest-only is current) or key the maintenance duty on the counter file read at the loop's first unit.
- **MAINT LEG LANDED 2026-10-26 (planner-direct, maintainer ruling: surface ONLY on %5 in ctx_gauge):** new core export `gauge.mjs` `maintSuffix()` — `%5 round → " ROUND=<r> MAINT=1"`, everything else `""` (zero burden on the other four rounds; fail-closed on no folder/counter/legacy round); `ctx_gauge.ts` appends it to the tool line ONLY on the non-db-error branch (after the budget suffix); TOOL description + `repo_commands.md` §Context gauge document the token; smoke section F steers `setLoopRootForTest` at a scratch fixture (byte-exact sections no longer depend on the live counter) and pins the %5 / non-%5 / legacy / notAvailable legs. Gate green: probe 115/115, composite v2 bun `SMOKE: ALL PASS`, v1 `gauge_core` + `ctx_gauge` smokes pass, tsgo exit 0. Live acceptance = the ctx_gauge line at the NEXT %5 round (round 40). PENDING (maintainer paste, `agent/prompts/**` is not agent-editable): the planner-prompt duty line — "when the ctx_gauge line shows `MAINT=1`, the first unit of the session is the maintenance pass"; #171's original `execute.after` ctx-append suffix channel stays dead by design (digest keeps ROUND always).

## #173. (LANDED P3, 2026-10-26, planner-36 idle lane — ideas.md L102-119) Knowledge-retrieval design: keyword-indexed needle search over `agent/knowledge/`
- **Problem / evidence:** maintainer ideas.md L102-119: knowledge files will grow; plain grep is the only retrieval path and needs keyword discipline + bounded first hits. No retrieval tool, no keyword-id convention, no curator-feedback loop exists today (`agent/knowledge/README.md` = conventions only).
- **Desired outcome:** one research note + one proposal: how agents should retrieve knowledge cheaply (keyword frontmatter or unique-id lines, a needle-search tool with lean/full modes, the knowledge_curator flow over `knowledge_inbox.md`).
- **Acceptance / DoD:** `agent/research/2026-10-2X_knowledge-retrieval-design.md` written (viability + options + recommendation + phase drafts sized like task specs); a TODO-inbox-free recommendation line for the maintainer; no tool built in this unit.
- **Suggested file scope (non-exhaustive):** `agent/knowledge/README.md`, `agent/knowledge/knowledge_inbox.md`, `.opencode/tools/` (candidate tool shape only), `agent/research/`.
- **Status:** LANDED (2026-10-26, worker-41) — `agent/research/2026-10-26_knowledge-retrieval-design.md` committed (`f458630`, 150 lines, gate `PROBE handover: 115/115 PASS`): measured inventory (tree 5294 lines / 27 files, 111 `Keys:` vs 195 `## ` headings, 16 of 22 subfolder files lack Keys), options A keyword audit / B ids+distilled index / C needle tool lean+full / D curator lane, recommendation **B → A → D → C** with the tool behind a gate, 5 spec-shaped phase drafts (R1-R5), "what NOT to build". The planner records the close-commit hash in its bookkeeping cp and re-verifies the spec's ≈1521 root-line figure (worker measured 1485 at `414a089`). Maintainer decision pending: approve/decline the phase order.

## #174. (LANDED P3, 2026-10-26, planner-36 idle lane — ideas.md L154-163) Research-agent guideline: curate the fuzzy-numword history into a task-spec-shaped research procedure
- **Problem / evidence:** maintainer ideas.md L154-163: wants a dedicated research function — "in function only describing how best to research a topic and write a comprehensive proposal". The fuzzy-numword run is named as the model case; its drafting seed exists (`agent/research/fuzzy-numword/drafting/2026-09-16_fuzzy-and-numword-tool-reliability.md`) but no guideline was ever distilled.
- **Desired outcome:** `agent/readme/readme_research.md` (procedure belongs under `agent/readme/` — `agent/research/README.md` forbids procedure there): phases (intent → viability → external search → comprehensive overview → phase drafts), history-preserving drafting, output shape sized like `readme_task_spec.md`.
- **Acceptance / DoD:** guideline committed, referencing the fuzzy-numword artifacts (session dumps optional — bounded reads only); the planner/worker prompts are NOT edited in this unit (prompt-batch rule).
- **Suggested file scope (non-exhaustive):** `agent/research/` (folder history), `agent/readme/readme_task_spec.md` (shape reference), archive session dumps for the fuzzy-numword era (bounded).
- **Status:** LANDED (2026-10-26, worker-40) — `agent/readme/readme_research.md` committed (`dd6848f`, 64 lines, gate 115/115 PASS); the planner records the close-commit hash in its bookkeeping cp. Prompt index line pending (prompt-batch rule).

## #175. (LANDED P3, 2026-10-26, planner-36 idle lane — research-doc R1) Knowledge entry ids + Keys coverage: stable id prefixes on the three root area files
- **Problem / evidence:** `agent/research/2026-10-26_knowledge-retrieval-design.md` §B/§5-R1: knowledge entries have no stable ids, so retrieval = loading whole files (729-line area file) and citations are imprecise. Measured at `414a089`: root area files `knowledge_context.md` 4 headings / 4 Keys, `knowledge_plugins.md` 31/31, `knowledge_tools.md` 45/46 — Keys coverage already complete on roots; ids absent repo-wide (no `^## KT-`/`KP-`/`KC-` headings).
- **Desired outcome:** every entry heading in the three root area files carries a stable id prefix (`KC-01.` / `KP-01.` / `KT-01.`, numbering by file order); the scheme + retrieval recipe documented in `agent/knowledge/README.md`; line numbers stay UNCHANGED (heading-only edits) so existing `file.md L<n>-L<m>` citations survive.
- **Acceptance / DoD:** `grep -c "^## KC-[0-9][0-9]\." agent/knowledge/knowledge_context.md` == 4; `^## KP-` == 31; `^## KT-` == 45; `wc -l` before == after per file; README gained an "Entry ids + retrieval recipe" section; probe `node .opencode/plugins/probes/handover_probe.mjs` → `PROBE handover: 115/115 PASS`; no subfolder file touched (the 16 subfolder files lacking Keys are a later curator pass).
- **Suggested file scope (non-exhaustive):** the three root area files under `agent/knowledge/`, `agent/knowledge/README.md`.
- **Status:** LANDED (2026-10-26, worker-42; commit hashes recorded by the planner) — docs unit; decision-needed: none (docs are pre-approved class).

## #176. (LANDED P3, 2026-10-26, planner-36 idle lane — research-doc R2) Distilled knowledge index: one line per id'd entry in `agent/knowledge/knowledge_index.md`
- **Problem / evidence:** `agent/research/2026-10-26_knowledge-retrieval-design.md` §B/§5-R2: retrieval still loads whole area files (729 lines); ids (#175) exist but no index. Measured after `bb88642`: 80 id'd entries (KC 4, KP 31, KT 45); Keys hits per file 4/31/46 — `knowledge_tools.md` carries ONE extra `Keys:` line at L82 (worker-42 noted), so first-Keys-per-entry pairing must be enforced.
- **Desired outcome:** `agent/knowledge/knowledge_index.md` — exactly 80 entry lines, one per id'd root entry: id + verbatim title + that entry's Keys; a regeneration recipe documented in `agent/knowledge/README.md` (grep-based commands a curator can re-run at each cure).
- **Acceptance / DoD:** index entry-line count == 80; id sets machine-checked 1:1 (ids extracted from the three files vs the index — diff empty, each exactly once); Keys taken as the FIRST `Keys:` line between an entry heading and the next; `wc -l` of the three area files unchanged (85/593/729 — index is a NEW file only); probe `node .opencode/plugins/probes/handover_probe.mjs` → `PROBE handover: 115/115 PASS`.
- **Suggested file scope (non-exhaustive):** new `agent/knowledge/knowledge_index.md`, `agent/knowledge/README.md` (recipe + pointer line), read-only: the three id'd area files.
- **Status:** LANDED (worker-43, 2026-10-26 — planner records the hashes); decision-needed: none.

## #182. (CLOSED 2026-10-27, planner-36 direct — maintainer's execute=deny experiment) `execute: "deny"` puts our custom tools into the NATIVE worker schema; the execute-only rule needs re-scoping per role
- **Problem / evidence:** worker probe `a0d86bc` (session ses_e82ce8ce0…, handover "tool-surface probe") after the maintainer set `"execute": "deny"` on the worker agent (opencode.jsonc L430) and restarted on 2.2.0: `execute` is ABSENT from the worker schema, and `block_transfer`, `ctx_gauge`, `loop_log`, `submit`, `state_snapshot`, `context_trim`, `compact_memory`, `dev_get_tool_context_contents` are all present NATIVELY (`session_info` absent). Native calls WORK: native `loop_log` START → `verified: readback-match` (loop line `2026-10-27_12-50 -->START …`); native `ctx_gauge` → full readout, normal output. Upstream basis: v2.2.0 "Expose Code Mode MCP tools directly when the `execute` permission is denied" (#59315). The planner (execute allowed) still sees these tools only through the Code Mode catalog.
- **Desired outcome:** each role's prompt/docs state the surface it actually has, so no agent hunts for `execute` when it is denied and no agent assumes the native path when it only has the catalog.
- **Acceptance / DoD:** (a) `agent/readme/repo_custom_tools.md` documents both surfaces + the measured results (DONE this session, same commit as this entry); (b) maintainer paste for `AGENTS.md` §Command Output, replacing "Invoke custom tools ONLY via `execute`" with the APPROVED global text: "Invoke custom tools natively. If `execute` is in your tool list, use it to batch several custom-tool calls in one turn." (the earlier per-role variant is superseded by the global ruling); (c) the worker prompt's tool guidance checked against the new surface; (d) decide whether the deny stays (workers lose `execute` composition: no batched `Promise.allSettled` reads, no scripted multi-step calls; they gain native custom tools + per-tool schema validation).
- **Suggested file scope (non-exhaustive):** `AGENTS.md` (maintainer paste only), `agent/readme/repo_custom_tools.md`, `agent/prompts/agent_worker.md`, `opencode.jsonc` (maintainer's live file), `agent/memory/*`.
- **USAGE FORENSICS 2026-10-27 (planner-36, all 345 `execute` calls in `session_message` across 29 sessions; the row shape is `content[].{type:"tool",name:"execute",state.input.code}`):** inner `tools.*` references 403 → **1.17 per call**, i.e. **281 of 345 calls (81%) wrap ONE custom-tool call** in JS (pure wrapper overhead); only **64 calls (19%) compose >1 call**, and every top combo is batching OUR OWN tools: `block_transfer`+`block_transfer` 17×, `ctx_gauge`+`loop_log` 9×, `block_transfer`+`docs-text` 7×, `submit`+`submit` 6×. **`fetch(` appears 4 times EVER, and 3 of them are `file://` sandbox-boundary probes** ("no fs" / status checks) — zero production HTTP use. Per-session planner load: 22-49 execute calls with 2-14 multi-call compositions (worst case ≈ 14 extra assistant turns/session if the planner loses `execute`). Tally caveat: the `tools.*` tally is a regex over the code string (it also catches `tools.md`-style substrings), so treat the per-tool column as approximate and the call/composition counts as exact.
- **HOST FACT (fork source, for the decision):** `execute` = Code Mode — a pure JS-like interpreter (`packages/codemode/README.md`: "Programs cannot directly access the network, filesystem, processes, or application APIs"; timers/`process`/imports/modules unavailable), with limits `maxToolCalls` + `maxOutputBytes` (`src/codemode.ts:29,34`) and the injected `fetch` global (`packages/core/src/codemode/web.ts:13-42` — any method/headers/body, 30 s timeout, `file:` rejected). So its ONLY capability beyond native tool calls is (a) in-turn composition/branching over tool results and (b) `fetch`; `shell`/`bash` remains strictly more powerful for everything else (fs, git, processes, curl).
- **Status:** RULING LANDED 2026-10-27 (maintainer, this session): (1) **global** `execute: "deny"` — every agent, not just the worker; (2) the AGENTS.md §Command Output replacement **approved**; (3) `bash` stays `allow` ("workers use bash a lot — scripting and executing them via bash is often a preferred tool"), so the deny is surface simplification, NOT containment. Agent-side legs DONE (`1f8701e`): `repo_custom_tools.md` now states the native surface as the standing rule; MEM-0143 recorded. PENDING-MAINTAINER: (a) add `"execute": "deny"` to the ROOT `permission` block in `opencode.jsonc` (L33-51) — proof one root line is global: `packages/core/src/config/plugin/agent.ts:84-91` pushes every root permission rule onto every agent; the worker-only line at L430 becomes redundant; (b) the `AGENTS.md` §Command Output paste, approved text: "Invoke custom tools natively. If `execute` is in your tool list, use it to batch several custom-tool calls in one turn."; (c) restart. PENDING-PLANNER at the first post-restart session: live-accept native `loop_log` + `block_transfer` in a PLANNER session (only the worker path is measured green), and confirm the observer hook still fires for custom-tool calls on the native path (rides #179). UNVERIFIED CAVEAT: rule precedence when a per-agent block contradicts a root rule (root rules are `push`ed last) — do not write a per-agent `execute: allow` on top of a root deny without probing it.
- **CLOSED 2026-10-27 (planner-36, same session — all legs green):** maintainer landed the ROOT `"execute": "deny"` (`opencode.jsonc` L50, inside the root `permission` block), DELETED the worker-only line, and DELETED the `AGENTS.md` §Command Output execute block + tool list with NO replacement text (his ruling: "native tool schema use does not need a mention … better to not offer information about a tool that is not available"), then restarted. Planner-side LIVE ACCEPTANCE measured post-restart in this session: native `ctx_gauge` → `SESSION=ses_e875… CTX=82418 (31%) REM=179726`; native `block_transfer` PEEK → the tool's own empty-buffer error (executed); native `block_transfer` WRITE with `dstFile=home/probe179native.txt` → tool refused (out-of-sandbox) AND `.opencode/temp/intercept.log` gained one `out-of-sandbox` verdict line at `13-35` (observer path-fields table works on the native surface — see #179 second acceptance). Agent-side doc legs: `1f8701e`, plus this commit's sweep (stale `execute` mentions retired in `repo_custom_tools.md`, `knowledge_tools.md` KT-43 + its index line, MEM-0132 clause, MEM-0141 removed from the destill as prompt noise). The precedence caveat remains unproven but is moot while the deny is global.

## #186. (CLOSED 2026-10-27, planner-36 — maintainer challenge + probe) `context_trim`'s drop leg has NEVER been live-accepted: the boundary store does not exist on this host
- **Problem / evidence:** the maintainer stated context_trim "does not work at all" since the v2 migration, and the file evidence backs him: `.opencode/temp/context_trim_v2.json` is ABSENT (measured `ls` → no such file), so `mode:'tail'` has never been used and the assembly-time filter has never fired in production. Code side: the hook is a genuine host capability, not our invention — the host's own built-ins register the same lane (`packages/core/src/plugin/identity.ts:29-31` and `optimize.ts:88-90` call `ctx.session.hook("context"|"compaction"|"generate", hook)`); our handler (`context_trim_v2.ts:652-672`) binds that hook, returns SILENTLY when no boundary exists, and fails open on a failed window read. So the leg is implemented and fixture-pinned, but the fixture proves the code path only — the live host has never exercised it (the MEM-0118 lesson: fixture smokes cannot detect a missing or unused host lane).
- **Also corrected here:** a planner claim earlier this session ("it works on the v2 store; it writes the boundary … and the handler drops pre-boundary entries") was read from the tool DESCRIPTION, not from evidence. Retract it: implemented ≠ live-accepted.
- **Why it matters:** TODO #184 (real `keepMessages`/`keepTokens` for compaction, maintainer P1) was proposed as plugin-side work that reuses exactly this boundary lane. If the lane does not fire on the running host, mechanism (A) is not viable and #184 needs a different route. The fork is NOT the running host (the installed `@opencode/cli` bundle runs), so no fork-side fix is available during the migration freeze.
- **Desired outcome:** a measured verdict on the drop leg, and a keep-control route that is actually available on the running host.
- **Acceptance / DoD:** (1) one live probe in a disposable worker session: baseline `ctx_gauge` → `context_trim mode:'report'` (window + row count) → `mode:'tail'` with `keepMessages` set to drop ~12 oldest window rows → next turn `ctx_gauge` again + the plugin's log lines → `mode:'tail' clear` → gauge back up; verdict = "boundary set: CTX X → Y (delta), store file present, restore after clear" written into the handover. (2) On a PASS: #184 mechanism (A) stays open. On a FAIL: #184 gets re-scoped without the boundary lane, and this entry records the failure signature.
- **Suggested file scope (non-exhaustive):** `.opencode/plugins/context_trim_v2.ts` (the hook + store), `.opencode/plugins/compact_memory.ts` (the #184 carrier), `.opencode/temp/` evidence files, `TODO.md` #184.
- **Status:** OPEN — P1 (it gates #184); decision-needed: none for the probe (agent-side, disposable session, always cleared).
- **LIVE-ACCEPTED 2026-10-27 (worker probe, commit `e228f63`, session `ses_e8242f766ffeDuKblgUqnoflBH`) — VERDICT `leg-live`:** boundary set → `CTX 45,635 (17%) → 36,096 (13%)`, Δ −9,539 tokens; after `clear` → `48,123 (18%)`, Δ +10,799. Planner-side verification from files, not from the worker summary: `.opencode/temp/context_trim_v2.log` = 16 lines, **10** carrying `kind:"trim"` assembly records (the handover said 7 — recount from the log); the store was absent before and is `{"sessions":{}}` after the clear; `git show --stat e228f63` = handover only. Caveat: a window below the floor cannot take a relative keep — at `rows=5`, `rows-12=-7` → `tail-set= rejected: keep-invalid -7` (fail-closed, logged nothing); use the floor form for liveness probes.

## #203. (CLOSED P1, 2026-10-28, planner-36 — live finding during U12 verification) The tag lane mutates message CONTENT in place, so tags persist in the store and compound every turn
- **Problem / evidence:** read-only DB on my session (`session_message`, `data` JSON): stored row `seq 10887` has `content[0] = {"type":"reasoning","text":"[#10887] [#10887] [#10897] Oops: my handover_task Goal line…"}` and `seq 10932` has `"[#1304] [#1304] [#10932] [#1304] Verified from files:…"`. One entry must carry exactly ONE tag added at assembly; instead every re-sent turn gains another prefix, and old global-seq tags sit next to new session-rank tags. So (a) the tag write reaches PERSISTED content, (b) tags COMPOUND per turn (~2–3 tokens per tagged row per turn), (c) the byte-stability and "warm next request" claims of #200/#202 hold only because the mutation lands past the cached prefix — they are not stable in general. UNPROVEN mechanism hypothesis: the assembly list is a copy but the content-part objects inside it are shared with the live message objects, so `p["text"] = tag + p["text"]` writes through while `splice` (the drop lane) only touches the copy — which is why drops stay reversible.
- **Desired outcome:** numbering renders into the request WITHOUT touching persisted content, one tag per entry, identical tagged bytes on every turn.
- **Acceptance / DoD:** copy-on-write before tagging (clone the entry and the part object; never mutate a source object); a smoke pin asserting the input entry/part `text` is byte-identical AFTER the hook renders tags; a live read-only DB check that one turn later the row's stored text contains ZERO `[#` prefixes; a live check that two consecutive tagged assemblies produce identical bytes (consecutive `cache.read` stays warm); state the repair option for already-polluted rows (my session has them) — no silent DB rewrite. Tags stay default OFF until this is green, and the #198 trial must not run before it.
- **Suggested file scope (non-exhaustive):** `.opencode/plugins/context_trim_v2.ts`, `.opencode/plugins/tests/context_trim_v2.smoke.mjs`.
- **Status:** OPEN — P1, launched as U13 (task spec inline in `agent/handover/handover_task.md`). Related: #200, #202 (their stability claims need re-verification), #198 (blocked on this).
- **Status:** U13 CODE LANDED (2026-10-28, worker_FlashNext, commit `6d966ca1`): tag lane copy-on-write — clones the drafted entry AND the tagged part (`messages[k] = {...m, content: parts.map(c => c === target ? partCopy : c)}`), never writes a source object; drop lane untouched; smoke 169 pins green incl. the shared-source byte-identity + no-compounding legs; description delta 0. LIVE VERIFICATION BLOCKED (honest): after the save, this worker's own session STILL persisted tag prefixes into new rows — seq 7507 reasoning part starts `"[#745] Step B: a no-op echo…"` and seq 7516 gained `"[#746] "` at a reasoning-chunk boundary — writes to SOURCE parts that the U13 code cannot perform, so the hook closure in this process predates the save (plugin not hot-reloaded mid-session). Two mechanisms fit the evidence: (a) stale hook closure — fix takes effect at next process/session start; (b) the host persists the drafted entries themselves — then hook-side render can never be persistence-safe and needs a maintainer/host call. Worker turned tags OFF again immediately (no further renders); no compounding beyond ONE prefix per row observed in the worker session; no DB repair attempted — polluted rows remain (planner 10887/10932; worker now 40). The zero-prefix + warm-pair live proof is OWED on a fresh process (see todo_inbox finding). #198 trial stays blocked.
- **Status:** LIVE-VERIFIED fix-confirmed (2026-10-28 post host-restart, worker probe on `6d966ca1` hook closure): tags ON, four tagged assemblies — rows created after the toggle have ZERO content parts starting with a rank-tag prefix (char-code-built pattern: 0 start-single, 0 adjacent-double on seq ≥ 7634; adjacent-double also 0 on all U13-era rows incl. polluted 7507/7516/7525 ⇒ no write-through reached storage, no compounding; pre-toggle polluted rows still exactly 11 single-prefix parts, unchanged). Cache across the first tagged request: 7634 `in=48 cr=224250` (warm, untagged), 7643 `in=17116 cr=207894` (first tagged — ~17k tokens re-sent, 208k cache hit — NOT a full re-prefill), 7652 `in=74 cr=225005` (warm ⇒ consecutive tagged assemblies byte-identical). Tags OFF again; store entry pruned (clean). Probe-harness lessons: bash collapses `\\d` inside single-quoted `node -e` — build regexes from char classes (`[0-9]+`) and print `re.source` to self-check; the checkpoint-token format collides with the tag format — never quote tokens in a probe session. #203 closed pending maintainer call on polluted-row repair (planner 2 + worker ~40 rows remain, no DB rewrite attempted). Related: #200, #202 (warm claims stand for the cached-prefix region), #198 (unblocked for the trial).
- **PLANNER-VERIFIED + CLOSED 2026-10-28 (probe commit `f0857785`):** files checked — the copy-on-write change is present (`partCopy = { ...target, text }` + a cloned entry replacing the draft slot, source objects untouched), smoke green on a planner re-run (169 pins), the handover first line intact with the probe numbers appended, and the worker's store entry pruned. My own earlier "11 tag-prefix hits in post-restart rows" was CONTAMINATION: my habit of typing `[#NNNN]` at the start of replies. I am dropping that habit permanently so tag forensics stay clean. Related lesson: a forensics query must never contain the pattern it searches for in its own text (the probe builds its regex from char codes for exactly this reason).
- **VERDICT 2026-10-28 (arms A and B landed; A `d06fb9f7`+`c578d791`, B `aab03670`; DB token totals read read-only):** same task, same read set. ARM A (trim policy): 45 calls, ~9 min, 7 findings, 5 re-reads, 2 trims (`drop_est 40,833` + `94,420`, measured request `161k -> 43k`), fresh prefill `249,688`, cached `2,262,000`, generated `38,865`, close gauge 16%. ARM B (status quo): 46 calls, ~8 min, 5 findings + 1 knowledge, 2 second-looks / 0 full re-reads, fresh prefill `34,218`, cached `1,902,805`, generated `33,423`, close gauge 28%. **Reading:** routine trimming did NOT save time — it cost ~215k extra fresh prefill (≈ 90 s at ~2,400 tok/s) and caused MORE re-derivation (5 re-reads vs 2); what it bought was headroom (44.5k vs 76k used). So trimming is insurance, not speed — it belongs where the window is actually tight, or in the read-then-drop pattern where the payload is provably spent. Both arms produced comparable artifacts (overlap: the `num()` dead helper). Trial flaws: both arms wrote the SAME handover path (A's file was overwritten in the tree, preserved in git), and arm B's start/end stamps disagree with launch order — fix both before any repeat run. Related: #204, #199.

- **REOPENED 2026-10-28 (planner read-only forensic probe) — the fix does NOT hold.** My closure check was INVALID: the char-code regex I built omitted the hash of the tag form, so it matched nothing and reported zero (the same failure class as a pin that cannot fail). Corrected probe `.opencode/temp/u15_tag_forensic.mjs` (pattern built from char codes INCLUDING the hash, start-anchored) over my session's rows created AFTER the host restart: seq 11013 = 4 prefixes, 11022 = 3, 11031 = 3, 11040 = 2, 11049 = 4, 11058 = 3, 11070 = 3, 11079 = 4, 11088 = 4, 11097 = 4 — all on `reasoning` parts; the worker's post-restart era has 8 prefixed parts (one doubled). So: (a) the tag lane still writes through to PERSISTED content, (b) about TWO prefixes land per step, consistent with the hook firing twice per step (nested `session.context` calls, see #208), and (c) one part carries prefixes of DIFFERENT ranks, so persisted content is re-tagged under shifting ranks — the rank-stability claims of #196/#202 are proven for the REPORT lane only, not for what reaches the store. Tags are now OFF in both sessions (they are default OFF regardless). The #204 report-flag lane is unaffected and stays closed.
- **Status:** LANDED (hash in planner bookkeeping) — 2026-10-28 U17 C1: the tag lane + `tags` arg are DELETED from `.opencode/plugins/context_trim_v2.ts` (maintainer ruling: delete, not dormant). Tags can never be enabled again; legacy store `tags` keys are ignored on read and pruned on the next write. Doctrine pin: with any store entry present the hook renders entries BYTE-IDENTICAL except splice removals. Live acceptance (schema has no `tags`) is planner-side. Related: #208.
- **PLANNER-VERIFIED + LIVE-ACCEPTED + CLOSED 2026-10-28 (planner direct; hashes `3f852d81` C1 + `2f89637c` C2 + `9337de7a` checkpoint + `25147a19` close):** code grep-back — `tags` survives ONLY in deletion-explanation comments; schema has no `tags` arg; header prints no `tags=` token (my own live report header: `... ordinal=session-rank guard=off auto=0`); smoke re-run by the planner `SMOKE: ALL PASS` (185 pins), probe 115/115 re-run green. Live: a `report` call added NO `kind:"trim"` line (338 before / 338 after); legacy store `tags:true` key present and harmless (pruned on next write). Maintainer rulings recorded: delete (not dormant); polluted-row repair NOT wanted (new sessions unpolluted).
