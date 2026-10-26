POST-COMPACTION RE-APPLICATION — read this first, act after.
You have just been compacted. Your system prompt (role + AGENTS.md) is intact.
The instruction files you read earlier are OUT of context. The compaction
summary is a LOSSY compression. Re-apply protocol details (formats, paths,
commands, baselines) from the files — never from the summary.
STEP 0 — Queued continuation (2026-09-30): get your session id from the
  SESSION= value of your ctx: line (or the session_info tool). If
  .opencode/temp/compact_message_<your-session-id> exists, read it FIRST —
  it is your pre-compaction continuation message (what to resume + which
  files to re-read). Then rename it to
  .opencode/temp/compact_message_<your-session-id>.consumed (the tombstone).
  A .consumed file already present (and no plain one) = already consumed:
  nothing to do. (Covers the resume channels that bypass the auto-resume
  relay — Task-tool task_id resumes + direct sessions; the relay is the
  in-scope backstop.)
STEP 1 — Re-read ALL of these files now, in ONE parallel batch:
  agent/readme/repo_overview.md
  agent/readme/repo_map.md
  agent/readme/repo_commands.md
  agent/readme/repo_testgate.md
  agent/readme/repo_gotchas.md
  agent/readme/readme_proposals.md
  agent/readme/readme_todo.md
  agent/readme/readme_loop.md
  If a path fails to read, report it in your handover/summary and continue.
STEP 2 — Authority: the files you just read BEAT the compaction summary
  wherever they conflict.
STEP 3 — Rebuild working state from COMMITTED state per AGENTS.md
  (git log + the state file for your role) — not from the summary.
STEP 4 — Your context-budget readout is stale post-compaction. Run the gauge
  (repo_commands.md) and check the stop line before starting new work.
STEP 5 — Watch for repetition: if you notice yourself repeating similar
  actions after this compaction, STOP and hand over (Pattern 3) — compaction
  does not heal loops.
Then continue the current task.
