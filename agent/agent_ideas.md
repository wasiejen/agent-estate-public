# agent_ideas.md — the agent-side ideas inbox (append-only)

Purpose: machine-stamped improvement IDEAS from the agents — what is
missing or could be done differently to improve something generally
(process, toolset, general function, design, interaction of parts).
Distinct from `agent_feedback.md` (friction: what slowed an agent) and from
the maintainer's personal stream `.opencode/maintainer/ideas/ideas.md`
(his thought-gathering file — the agents read it for inspiration, never
write to it).

Format: `### <YYYY-MM-DD_HH-MM> <role> <session>` + the raw idea text
(appended by the `submit` tool, `ideas` channel). No markers, no IDs, no
priority — the maintainer picks up what he likes, the planner's
maintenance pass reviews it (inline fix / proposal / knowledge / TODO).

Entries:
### 2026-09-28_01-22 planner_Q3S_245K_slow ses_f1b04ea20ffeo9jTAs1IEvAGjg
From the plan28 ideas.md scan (maintainer file, read-only) — 4 improvement ideas: (1) ctx_gauge window source: derive the context limit from opencode.jsonc (the context field / a ctx-object field) instead of the model-ID name — would let the model be renamed freely without syncing name→limit in backend+config (ideas.md 2026-09-23_04-53 + 2026-09-22_17-41); related: the gauge/ctx.log lines should carry session_id + role (modelID implied by role) to attribute measurements + track worker sessions (ideas.md 2026-09-22_12-03 ctx block). (2) A context-erase / tail-trim tool: remove the tail up to a specific message and replace it with a summary, or remove messages by messageID — on ingestion of large files (webfetch, log/dump reads) summarise the useful parts then remove them from context; a big context-space lever (ideas.md "tool erase message from session" block — open question there: whether ctx.session messages ARE the context and removal recompiles it). (3) A `submit` memory channel: a submit section that explains memory usage and auto-appends to the agent role's memory inbox (inbox_memory.md) — closes the knowledge-gain loop (gain → confirm → inbox → curation) with retrieval-feedback signals (ideas.md 2026-09-23_00-20 + "codify knowledge gain" block). (4) Real-time context gauge via the `messages.updated` event hook (the way the TUI does it) instead of post-hoc DB reads — check the hook surface first (ideas.md 2026-09-22).

