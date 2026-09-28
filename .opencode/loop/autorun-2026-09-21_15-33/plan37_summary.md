# plan37 summary — autorun iter 37 (2026-09-28, planner-37, ses_f191a6cb5ffeq4noDPvOTFNkxM)

Unit-4 restart branch after planner-36 `action: restart`. The iter-37
queue (live-acceptance battery / #113 venv / repo-split / detector-
dispatch / #116 / tail-trim call) is ALL maintainer-blocked → idle lane.

## Done
- #114/#115 7th live data point recorded: fresh-session injected ctx
  line "CTX=notAvailable | 1 compactions left" (live build) vs
  self-gauge "CTX=149101 (60%) REM=95899 | 5 compactions left" (disk
  build, window 245000) — the live host process still predates 12e3262
  (#114) + 0c90abe (#115); both live acceptances remain pending the
  maintainer's restart.
- Tail-trim tool PROPOSAL filed: `.opencode/proposals/
  2026-09-28_context-trim-tool.md` — the decision package for the
  plan36 research follow-up (which the research doc left as a
  MAINTAINER CALL, §effort/approval): build `report` + `tail`
  (the `tail_start_id` rewrite — non-destructive, reversible,
  validation against the host's own window guard) first; the
  destructive `turns` (row-deletion) mode as a follow-up; approval
  question = whether a live-DB write tool is wanted at all.
- Baseline re-verified (plan37 gate run, outputs in
  $TMP/opencode/plan37_*): all 10 smokes green at baseline
  (auto_resume 146/146, block_transfer 131/131 + sandbox 64/64,
  compact_memory 78/78, context_recovery 17/17, intercept_observer
  78/78, loop_log 69/69, submit 23/23, ctx_gauge 3/3, gauge_core ALL
  PASS) + probe 346 = 335 PASS + the 11 #113 environmental failures
  (136-146, `No Python at python312`) + ruff F=0; pytest still
  UNRUNNABLE (#113 venv break — not attempted, not a regression).
- Inbox review (idle lane): agent_feedback.md + agent_ideas.md fully
  triaged (nothing new since plan35/36 — last entry planner-36's own
  09-22); maintainer ideas.md unchanged; maintainer inbox empty;
  markers sweep clean (no live additions).
- NAP: plan36 section compressed to the archive one-liner; Standing
  baselines re-verified note updated to the plan37 gate run.

## Not done (all maintainer-blocked — the iter-38 queue, unchanged)
- Live-acceptance battery: #114/#106/#109/#115 (need his host restart).
- #113 venv fix (MAINTAINER CALL).
- Repo split (his domain; the phase-1 proposal is at root awaiting his
  ruling).
- The #109 detector-dispatch part (his call).
- #116 real-time-gauge capture (post-restart + plugin registration).
- The tail-trim tool build (his ruling — the new proposal at root).

## Close
`action: restart` (the 2026-09-27 idle-close policy: no actionable
item remains — every queue entry is a maintainer call; the maintenance
scope of this iteration is done).
