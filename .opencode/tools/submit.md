# submit.ts — the agent-inbox append tool

#53 Part B (approved 2026-09-17_agent-feedback-closedown.md). ONE unified append tool for the agent-inbox channels: the agent supplies the TEXT only; the tool machine-stamps each entry (date + role + session) and appends it — no hand-formatting, no file fiddling, no accidental reads.

## What it does

Appends ONE dated, role-tagged entry per provided channel arg, to each channel's HARDCODED target (the hardcoded targets ARE the sandbox — there is NO path parameter).

## Implementation sketch

- Entry: `export default tool({ description, args, execute })`.
- The 4 inbox channels (the header depth is the established form of each channel):
  - `feedback` → `.opencode/agent/agent_feedback.md` (### — friction: what slowed/confused the session)
  - `knowledge` → `.opencode/agent/knowledge/knowledge_inbox.md` (## — verified, actionable knowledge for the curator)
  - `todo` → `todo_inbox.md` (repo root, ## — a loose finding; the planner assigns IDs at curation)
  - `ideas` → `.opencode/agent/agent_ideas.md` (### — gaps/improvements; 2026-09-27 ruling: a FOURTH channel distinct from feedback)
- The entry: `<header> <YYYY-MM-DD_HH-MM> <role> <session>` + the raw text + one trailing blank line. The stamp is MACHINE-COMPUTED (minute resolution; never retyped); role/session are AUTO-FILLED from the tool context (role = context.agent else `agent`; session = context.sessionID else `unknown`) — there is NO role/session parameter.
- At least one arg required (an EMPTY string counts as NOT provided — none → an error string, no file touched); a missing target file (or its parent dir) is CREATED carrying only the entry (no header invention).

## Gotchas / lessons

- feedback = friction vs ideas = improvements (the 2026-09-27 maintainer ruling — fire both channels when both apply; never mix them).
- The `ideas` target is the AGENT-SIDE file — NOT the maintainer's live `.opencode/maintainer/ideas/ideas.md` (his personal thought stream, read-only inspiration).
- The `todo` target deliberately sits at the repo root (the AGENTS.md Discovery contract file) — a deliberate deviation from the proposal's ".opencode/ subtree" wording, ratified by the 2026-09-18 task spec.
- Registration is the maintainer's domain (the live opencode.jsonc + the per-agent tool-access grant — this file is deliberately NOT registered in any repo config).

## Tests

`tests/submit.smoke.mjs`.
