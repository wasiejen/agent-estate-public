# proposals/ — the agent→maintainer decision channel

The agent proposes; the maintainer decides asynchronously by MOVING the file —
location IS the state. This tree is the channel to the maintainer (ruling
2026-09-12: no fine-grained maintainer inbox for agent output). One file per
proposal, one idea, named `YYYY-MM-DD_<slug>.md`.

## Flow
root = pending → `commented/` (in-file comments; the planner revises, never
edits his text; back to root) → `approved/` (a task; the `--maintainer:` block
is the ruling) → `implemented/` (verdict note in-file; he removes eventually).
`rejected/` + `superseded/` = closed; a newer proposal or a ruling sends a file
to `superseded/`. His drafts are NOT here — they live in `maintainer/draft/`.

## Not here
maintainer→agent traffic lives one level up in `maintainer/` (his outbox:
inboxes, feedback, `priority.md` — see its README). Also NOT for: repo
code bugs (`TODO.md`), product ideas, anything needing no decision.
