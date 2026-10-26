# readme_todo.md — the TODO system

Read this file when you write, curate, or reference TODO entries or IDs.

## Entry contract
AGENTS.md §TODO.md-entry-contract governs every entry. Keep each entry
self-contained: a planner must delegate it by unique ID alone. Each entry
carries: title / problem + evidence, desired outcome (not implementation
steps), acceptance criteria and definition of done, suggested file scope
(non-exhaustive), status and the decision-needed flag.

## Who writes where
- **Worker / explorer — APPEND to `todo_inbox.md`** (repo root). Use the
  loose format: dated + role-tagged blocks, **no numbering**, no curation,
  no renumbering. Use it for findings — NOT for `TODO.md`.
- **Planner — curates** the inbox into the ledger: `todo_inbox.md` →
  `TODO.md`. Assign the stable ID at curation time. Enrich the entry to
  the contract, then trim the inbox.
- Bare-ID handoffs reference **curated** IDs only.

## Curation rules (planner)
- Close or condense solved and stale entries with a one-line record. Move
  the full text of a closed entry to `todo_records.md`.
- Keep IDs unique; NEVER reuse one. Record the next ID in the `TODO.md`
  header line.
- Never delete open or unresolved content. When a fix lands, flag the
  entry it closed.

## Files
- `TODO.md` — curated open items + one-line records of fixed issues.
- `todo_inbox.md` — raw drop zone; worker/explorer append only.
- `todo_records.md` — full text of closed entries.
- Per-project twins live in the project folder: `projects/<name>/TODO.md` and
  `projects/<name>/todo_records.md` (example: `projects/Free-Snap-Tap/`).
