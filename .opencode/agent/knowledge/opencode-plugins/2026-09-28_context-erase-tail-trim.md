# opencode-plugins knowledge — context-erase / tail-trim (installed host internals)

## Model context is re-derived from the DB every loop step — row deletion changes it (2026-09-28)
- **Do:** To trim a session's model context: (a) delete only COMPLETE
  finished old turns (user + assistant rows) strictly BEFORE the last user
  message AND outside the compaction "marker quartet" — or, preferred where
  a marker exists: rewrite the compaction part's `tail_start_id` in place
  (single-field JSON edit of ONE part row — the host itself does exactly
  this, compaction.ts:461-466). Never delete the last user row (re-runs the
  oldest surviving turn as the active one) or any marker-quartet member
  (window degenerates to the FULL pre-compaction history → overflow; this
  host has `compaction.auto = false`, no backstop).
- **Why (evidence):** `runLoop` re-reads `MessageV2.filterCompactedEffect`
  at the top of EVERY step (prompt.ts:1092-1094) → fresh SQL select on the
  `message` table (message-v2.ts:433-446/473-494) → parts joined by
  `message_id` → `toModelMessagesEffect` → `llm.stream` (processor.ts) —
  no in-memory history, no cached prompt. The marker quartet = compaction
  user row + compaction part carrying `tail_start_id` + summary row + the
  `tail_start_id` target; the sent window = the slice composition at
  message-v2.ts:549-573. FK cascade `part.message_id → message.id
  onDelete cascade` (sql.ts:82-89, `PRAGMA foreign_keys = ON` database.ts:31)
  — deleting a message row removes its parts with it. All refs verified
  against the opencode-dev v1.18.32 source copy.
- **Ref:** research doc `.opencode/agent/research/2026-09-28_context-erase-
  tail-trim.md` (211 lines, commits 4591cd0/c32c5eb; explorer-36
  ses_f192da65effe5No7efgj5VFbb1, plan36); all 4 key refs planner-36
  spot-verified against the source copy 2026-09-28.
- **Keys:** tail_start_id, filterCompactedEffect, marker quartet, context-
  erase, DB row deletion, message-v2.ts, compaction window, trim tool
