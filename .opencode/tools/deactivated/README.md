# deactivated/ — unregistered tool-file holding lane

Purpose: hold custom-tool files that are NOT in the live tool list (verified
against a real session's registered tools), so their code stays readable
without rendering description bytes into every request.

Allowed: tool files with a recorded registration verdict (absent from the
live list) + provenance comment naming the TODO that moved them.
Excluded: files still registered or hook-bearing (e.g. denied-plugin files —
those ride their removal proposal); anything PAID-rendered.

Usage: `git mv` in, `git mv` out to reactivate. Register by filename only
when reactivating. Moved here: `session_info.ts` (TODO #239, 2026-10-29 —
no twin, no registration) + wake-15 batch `block_transfer.ts`,
`context_trim.ts`, `ctx_gauge.ts`, `dev_get_tool_context_contents.ts`,
`loop_log.ts`, `state_snapshot.ts`, `submit.ts` (+ pre-existing `dev/` copies)
— all inert legacy twins of live plugin files (TODO #240 verdict).
