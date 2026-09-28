# plan36 summary (iter 36, ses_f1938fbf7ffezxbBZE47haZsdS, planner-36)

## Outcome
- **#114/#115 6th live data point:** injected ctx line "CTX=notAvailable |
  1 compactions left" (live build) vs self-gauge "CTX=69115 (28%) REM=175885
  | 5 compactions left" (disk build, window 245000) — the live process
  still predates 12e3262 (#114 fix) and 0c90abe (#115 fix). Live
  acceptances for both remain pending the maintainer's restart.
- **Unit 1 — context-erase / tail-trim research LANDED** (explorer-36
  ses_f192da65effe5No7efgj5VFbb1; doc `.opencode/agent/research/2026-09-28_
  context-erase-tail-trim.md` 211 lines, commits 4591cd0 doc / c32c5eb
  handover):
  - ANSWER: YES — the model context is re-derived from the DB at the top of
    every loop step (prompt.ts:1092 `filterCompactedEffect` → fresh SQL
    select message-v2.ts:433-446/473-494 → `toModelMessagesEffect` →
    `llm.stream` processor.ts — no in-memory history, no cached prompt).
  - VERDICT: row deletion is a VIABLE trim channel, narrow safe zone
    (complete finished old turns strictly before the last user message,
    outside the marker quartet). CLEANER lever: the host's own in-place
    `tail_start_id` rewrite (compaction.ts:461-466) — a single-field JSON
    edit of one part row trims the retained tail without deletion.
  - Planner verified: all 4 key ref pairs spot-checked against the
    opencode-dev v1.18.32 source copy (prompt.ts:1092-1094,
    message-v2.ts:433-446, message-v2.ts:549-573, compaction.ts:458-468) —
    all confirmed.
  - Follow-up (tail-trim tool design) = MAINTAINER CALL (doc §effort/
    approval) — queued in the NAP, no TODO filed (observation triage).
- **Knowledge:** entry filed `opencode-plugins/2026-09-28_context-erase-
  tail-trim.md` (the actionable distill + ref to the research doc).
- **Channels:** maintainer inbox empty; priority.md active list empty;
  markers clean; proposals unchanged (repo-split-phase1 + submit-memory-
  channel at root awaiting his ruling; fst-rebind-repeat stays approved/
  --deferred).
- **Baselines:** unchanged (no code touched; probe 346 / smokes per
  Standing; venv still broken #113).

## Friction (submit entries)
- Planner: block_transfer WRITE `regions` applies the SAME single `text` to
  every region (I expected per-region text) — the NAP write duplicated a
  24-line block; repaired with a DELETE (one extra verification cycle).
- Explorer (its own entry): the spec's 2-commit structure ("ONE checkpoint
  commit (doc only)" + handover rides the FINAL commit) is fine but the
  wording forces the 2-commit reading — noted for spec wording.

## Queue (iter 37)
Live-acceptance battery (#114/#106/#109/#115 — his restart); #113 venv
(MAINTAINER CALL); repo-split (his domain); detector dispatch (his call);
#116 capture (post-restart); tail-trim tool (MAINTAINER CALL). Next
maintenance pass: iter 40 (counter trigger).

## Close
Closed at CTX=121999 (49%) — well under the stop line. action: restart.
