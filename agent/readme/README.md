# agent/prompts/ — the live agent instruction set (read-mostly)

Purpose: Repo specific instructions `repo_*.md` (`repo_overview.md` + the parts) 
and `readme_*.md` (protocol readmes: loop / proposals / todo / post-compaction).

DOES NOT go here: task/handover state (`agent/handover/`), knowledge findings
(`agent/knowledge/`), phase plans (the NAP). Edits here are protocol changes —
a host restart activates prompt/config changes, and the probe gate must stay
green after.
