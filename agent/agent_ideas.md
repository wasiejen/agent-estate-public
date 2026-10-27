# agent_ideas.md — the agent-side ideas inbox (append-only)

Purpose: machine-stamped improvement IDEAS from the agents — what is
missing or could be done differently to improve something generally
(process, toolset, general function, design, interaction of parts).
Distinct from `agent_feedback.md` (friction: what slowed an agent) and from
the maintainer's personal stream `maintainer/ideas/ideas.md`
(his thought-gathering file — the agents read it for inspiration, never
write to it).

Format: `### <YYYY-MM-DD_HH-MM> <role> <session>` + the raw idea text
(appended by the `submit` tool, `ideas` channel). No markers, no IDs, no
priority — the maintainer picks up what he likes, the planner's
maintenance pass reviews it (inline fix / proposal / knowledge / TODO).

Entries:
### 2026-09-28_01-22 planner_Q3S_245K_slow ses_f1b04ea20ffeo9jTAs1IEvAGjg
From the plan28 ideas.md scan (maintainer file, read-only) — 4 improvement ideas: (1) ctx_gauge window source: derive the context limit from opencode.jsonc (the context field / a ctx-object field) instead of the model-ID name — would let the model be renamed freely without syncing name→limit in backend+config (ideas.md 2026-09-23_04-53 + 2026-09-22_17-41); related: the gauge/ctx.log lines should carry session_id + role (modelID implied by role) to attribute measurements + track worker sessions (ideas.md 2026-09-22_12-03 ctx block). (2) A context-erase / tail-trim tool: remove the tail up to a specific message and replace it with a summary, or remove messages by messageID — on ingestion of large files (webfetch, log/dump reads) summarise the useful parts then remove them from context; a big context-space lever (ideas.md "tool erase message from session" block — open question there: whether ctx.session messages ARE the context and removal recompiles it). (3) A `submit` memory channel: a submit section that explains memory usage and auto-appends to the agent role's memory inbox (inbox_memory.md) — closes the knowledge-gain loop (gain → confirm → inbox → curation) with retrieval-feedback signals (ideas.md 2026-09-23_00-20 + "codify knowledge gain" block). (4) Real-time context gauge via the `messages.updated` event hook (the way the TUI does it) instead of post-hoc DB reads — check the hook surface first (ideas.md 2026-09-22).

### 2026-09-30_03-50 planner_Q3S_slow (curation note, plan42)
All 4 items addressed — (1) ctx_gauge window config-first = TODO #115 LANDED (0c90abe; the live readout now resolves config-first); (2) context-erase / tail-trim = TODO #120 (Unit 1 LANDED 2d4480e/48aab9f — report + tail; Unit 2 pending the maintainer's Unit-1 live acceptance); (3) the `submit` memory channel LANDED (d2cad69 — the `memory` arg on submit.ts, smoke 31/31); (4) the real-time gauge = TODO #116 research DONE (plan38 — verdict leans (a) feasible plugin-side; the live capture still needs the maintainer's restart + registration).
### 2026-10-22_00-36 planner_FlashNext ses_e9fb4e611ffeQmrH3PkDK6r4Ct
A curated read-only helper for `.opencode/temp/intercept.log` (e.g. `agent/scripts/intercept_sweep.mjs`: filters by date/session/verdict, prints bounded fields, defaults to the last N lines) — every live-acceptance sweep and path-anomaly hunt re-reads that log through raw greps, and the field widths blow the context budget.

### 2026-10-22_04-38 planner_FlashNext ses_e9ec78ee4ffe9Nu75F5iRfdtl6
state_snapshot's ## markers digest is capped (20 lines) and the ready-made sweep output is dominated by self-referential doc noise (measured this session: 143 sweep hits, only 1 standing block live) — extend the MARKER_SWEEP filter to exclude the files that QUOTE the markers table (agent/prompts/, agent/readme/, specs/, loop summaries, knowledge) so the digest surfaces live markers without a bash re-run.

### 2026-10-22_05-23 planner_FlashNext ses_e9e860260ffeKO6KiJbGss5pwy
An aggregate clone-gate runner script (probe + the 12 node smokes + the 2 bun v2 smokes + tsgo, printing `green=N red=0` per unit) — the worker hand-rolled a scratchpad runner to measure the 15-unit clone gate; a committed `agent/scripts/` runner would save calls in every future clone unit.


### 2026-10-22 (planner-25, ITER-25 maintenance pass) review note
- 00-36 (intercept.log per-event filter helper) → filed as TODO #145.
- 04-38 (markers digest doc-noise) → plan24 landed LIVE-first ordering only; the
  sweep-filter half IS being implemented this pass (marker unit, plan25).
- 05-23 (aggregate clone-gate runner) → NOT filed: LOW value now (the §4 clone
  wave is COMPLETE; recorded in the NAP queue).
### 2026-10-22_20-34 planner_FlashNext ses_e9b246abdffesGhYjB50ymiwqy
block_transfer mode-guard teaching errors: when a mode receives an argument that belongs to a neighbouring mode (REPLACE with `text`; COPY with `regions`; WRITE with `bufferName`-only content), REJECT with "did you mean <mode>?" rather than the generic missing-buffer/missing-marker error — cheap, agent-facing only, both trees (2026-10-22, direct planner-28).

### 2026-10-27_13-40 planner_FlashNext ses_e8751597bffejGI7kRg4wAu6db
ctx_gauge could surface PAID-file dirtiness: the gauge line knows nothing about whether a system-prompt component (AGENTS.md, the agent `prompt` pair in opencode.jsonc, role destill) is already modified-but-uncommitted. Appending one token (e.g. ` PAID=2`) would let every role batch prompt edits into one re-prefill instead of paying several. Measured cost of not having it: this session paid two full re-prefills (~100k each) because destilled_mem.md was edited in two separate steps.

### 2026-10-27_13-57 planner_FlashNext ses_e8751597bffejGI7kRg4wAu6db
Refinement of my 13-40 idea (the `PAID=<n>` form was weak — it tells the agent nothing it can act on, since the bust lands at the next request regardless of when the edit is made). The actionable signal is the cache STATE: `ctx_gauge` could append `CACHE=warm|cold` (from the last completed request's `tokens.cache.read` >0 / =0 in `session_message`) plus the current context size, which converts the decision into a rule: if COLD, land every prompt/tool-description/config edit now at zero marginal cost; if WARM, park the change in a free channel until the next natural cold point. Related cost already researched and proposed: `proposals/2026-10-15_2tier-tool-descriptions.md` (tool definitions ≈48k chars ≈13.5k tokens of the 23,040-token initial prompt — the largest single block, still unranked since 2026-10-15).

### 2026-10-27_15-05 planner_FlashNext ses_e8751597bffejGI7kRg4wAu6db
Add a small history helper under `agent/scripts/git/` (e.g. `history_probe.mjs`): takes a string, runs `git --no-pager log --all --oneline -S<str>` across BOTH known config names, then for each hit prints that commit's file list (`git show --stat --name-only`) and the matched lines via `git show <sha>:<found-path>` — so a human gets the old text directly, without learning the pager and path-as-of-commit rules. Follow the existing `agent/scripts/` README contract and list it in `INVENTORY.md`.

### 2026-10-27_15-47 planner_FlashNext ses_e8751597bffejGI7kRg4wAu6db
[VOID 2026-10-27, same session — premise disproved by measurement: `ctx_gauge` equals the backend readout exactly (145,698 cache.read + 238 input + 1,079 output = 147,015 = `session_message` row `seq 8049`; the gauge lagged one step at 144,675 = `seq 8040`). Do not add a window-row token to the gauge. The real gap is that a role cannot see the RETAINED size right after a compaction, because the gauge lags one step — that is a compaction-report question, not a gauge question.]
The context gauge reports the wrong quantity after a compaction. `ctx_gauge` CTX sums provider-reported token counts over the window rows, so the turn that generated the compaction summary (105,091 provider tokens) keeps the readout near 43% even though the real window is 3 rows (summary + 2 turns). Two cheap fixes in our own plugin: (A) append a `WIN=<rows>` token read from the v2 window (`session.context` rows from the last completed compaction part, the same source `context_trim mode:'report'` already reads); (B) or append `CTXPART=<chars/4 of the compaction part>` so a role can see the retained summary mass instead of the historical request cost. Without it, every role that compacts will mis-plan its remaining call budget right after the compaction — the moment where planning matters most.

### 2026-10-27_19-36 worker_FlashNext ses_e8174a794ffe1Noetk8NJeDKVl
context_trim's rows_dropped_est sums per-row tokens which all count the same shared cache.read — it overstates the provider-visible drop ~20x (est 124,615 vs measured −5,838). If the est is used for decision-making (U7 composer token caps), add a caveat or derive est from content bytes/4 instead of the tokens sum.

