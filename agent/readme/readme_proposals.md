# readme_proposals.md — the proposal channel

Read this file when you propose, revise, or land a design change.

## Folder flow
1. **Draft** at the `proposals/` root: `proposals/<date>_<slug>.md`.
2. **Maintainer comments** in place: add them under a `comment:` block in
   the same file.
3. **`proposals/commented/`** — move the commented file here. The planner
   revises it there.
4. **Planner revises** — append replies in-file under
   `Planner replies (<date>, <context>):`. NEVER edit the maintainer's text.
5. **Back to the `proposals/` root** — for the maintainer's decision.
6. **`proposals/approved/`** — move it here after maintainer approval. The
   approval line stays at the bottom of the file.
7. **`proposals/implemented/`** — move it here after the change lands. The
   planner adds a verdict note: what shipped, commit, deviations.
8. **`proposals/rejected/`** — move rejections here.
9. **`proposals/superseded/`** — move a proposal here when a newer proposal or
   a ruling replaces it. Name the replacing file in a one-line note.

## What a proposal contains
- **Problem** — the pain, with evidence. Measure where possible.
- **Design** — the concrete change. Split it into independently approvable parts.
- **Acceptance** — how to verify it worked.
- **Status** — current state: awaiting approval / approved / implemented.

## maintainer/ — the reverse direction (maintainer→agent, P10)
It lives at `maintainer/`: a SIBLING of `proposals/`, not under it. It moved
out 2026-09-12; see its README for usage.
- `inbox_planner/` and `inbox_worker/` — each role scans its own inbox at
  session start, BEFORE planning or executing. Handle an item, then move
  it to `done/` with content UNTOUCHED. The move is the read-receipt.
  Record the handling in the NAP, summary, or TODO as usual.
- `inbox_planner/draft/` is his drafting scratch. Scan it only when nothing
  else is open.
- `priority.md` — his standing task ordering. The planner reads it at
  session start. Planning follows its order. Agents may only REMOVE a line
  they have fully handled. Append a one-line reply to `_past_priorities.md`;
  that file documents the convention.
- `feedback/` — his notes on agent behavior. Read them as input in the next
  session.
- NEVER edit his text.
- `maintainer/draft/` is the maintainer's drafting scratch — READ-ONLY unless a
  task explicitly says otherwise. (`proposals/` has NO draft-scratch folder;
  the old `proposals/files/` name is dead — measured absent 2026-10-26.)
