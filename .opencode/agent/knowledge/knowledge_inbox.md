# knowledge_inbox.md — append-only inbox for new knowledge (his #5, 2026-09-15)

Unsorted, verified, actionable knowledge entries that do not yet have an
obvious area file. APPEND ONLY — the planner cures entries into the area
files (`knowledge_tools.md` / `knowledge_plugins.md` / ...) at session
close or when the placement becomes obvious. Format per the folder README
(Do / Why (evidence) / Ref / Keys) + a date + role tag.

_Curation log (planner):_
- 2026-09-21: "Edit tool chokes on non-ASCII chars" → `knowledge_tools.md`; "single slot serial / half-prefill / cost = time" → `knowledge_tools.md` (model-config facts; the serial-slot half was already covered by the single-slot entry); "tool descriptions = agent-facing surface" → merged into the `description` entry in `knowledge_tools.md` (new-hire test); "plugin repo test( vs it( layout" → `opencode-plugins/auto-resume-map.md` test-layout note.
- 2026-09-21 (plan2): worker's 3 auto-resume SDK/event/live-log facts → `opencode-plugins/auto-resume-unit1-surface-report.md` §UNIT 2 supplement.
- 2026-09-23 (plan11): "auto_resume smoke module-level client pitfall" → `knowledge_plugins.md` (new entry); "compact_memory SELF-path race (measured + fixed 0f192e5)" → `knowledge_tools.md` cross-session contract entry; "post-compaction gauge first readout = compacting model's fill" → `knowledge_tools.md` ctx_gauge lag entry.
- 2026-09-24 (planner, direct): "Post-compaction planner self-resume = the auto-resume plugin (#91: restart spawn carries the real planner agent, the compaction summary is skipped; #90 spawn-tail). The `action:` line is read by the plugin even in Direct sessions — acting on it is DEACTIVATED there (maintainer confirmation 2026-09-24)." → `knowledge_plugins.md`.
- 2026-09-26 (plan23): "R3 live re-test — the bt anchor-marker PAIR channel live-accepted (the pair form reached the hook verbatim; the log is the authority, not self-perception) + the section-anchor channel schema-shadowed (read.offset integer + constrained decoding)" → `knowledge_plugins.md` (2 entries: the pair-channel live-acceptance lesson + the dormant section-anchor channel).

## 2026-09-26_22-33 planner_Q3S_245K_slow ses_f20b3bf14ffedWHp2HGajHmGLN
Opencode DB token forensics (verified 2026-09-26, fork compaction test, ses_f20b3bf14ffedWHp2HGajHmGLN): (1) `message.data` column IS the message info object itself — role/tokens at top level (tokens.input/output/reasoning), no `.info` wrapper; (2) `part` table has NO `type` column — part type is inside `part.data` JSON; (3) per-message token fields are SPARSELY populated (many rows in=0, tiny in for big turns) — for reliable per-call input use the compaction/assistant rows that DID record (e.g. the first post-compaction call row) or the gauge; (4) compaction boundary = a user message carrying a `compaction`-type part (tiny marker); the summarizer's own step is recorded as an assistant message with agent=compaction, mode=compaction (its text part = the summary, its recorded input = the summarize request size — here 32,507, i.e. the summarize body is much smaller than the full context: head text mass excl. tool outputs); (5) rough token estimate for raw part bytes: /4 to /4.5 (bytes/3.5 overestimates); (6) retention after compaction is NOT visible in DB rows (all rows persist) — measure it from the first post-compaction assistant call's recorded input (the prefill).

