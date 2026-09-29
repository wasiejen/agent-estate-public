# agent/prompts/ — the live agent instruction set (read-mostly)

Purpose: the instruction text agent sessions load — role prompts + on-demand
instruction files. `agent_*.md` (live role prompts, wired in
`opencode.jsonc`), `additions/` (additional prompts to customize agents for a particular role/task).

DOES NOT go here: task/handover state (`agent/handover/`), knowledge findings
(`agent/knowledge/`), phase plans (the NAP). Edits here are protocol changes —
a host restart activates prompt/config changes, and the probe gate must stay
green after.
