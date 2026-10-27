# orientation.md — preliminary orientation: where this repo / agentic workflow is going

Planner-authored distillation (2026-09-25, planner-18) of the maintainer's
goal sketch across the direct sessions — a working orientation, not a
protocol. The NAP owns the CURRENT state; this file owns the DIRECTION.
Explicit maintainer instructions override both.

**North star (the maintainer's own words, 2026-09-26):** "I want you to learn.
Simple as that." Everything below serves that goal — the tools, knowledge,
and prompts exist so the system (and I) keep getting better.

## What this repo is (two products in one tree)
1. **FST** — the snap-tap / rebind / macro tool (the product code; stable,
   gates green, waiting for the new-project phase).
2. **The agentic workflow** — the opencode meta-layer: the loop protocol,
   compaction/flush machinery, custom tools (block_transfer, loop_log,
   submit, ctx_gauge, compact_memory), plugins (intercept_observer,
   auto_resume, context_recovery), prompts, the knowledge base. The
   workflow is currently the more active product.

## Direction (the goal sketch, in planner words)
- **Toolify the bookkeeping.** Every manual fiddle (loop lines, inbox
  entries, friction entries, gauge peeks) gets a dedicated tool or is
  eliminated. Net-zero standing duties: a new standing duty is added only
  when an existing one is retired or automated.
- **A self-maintaining loop.** The counter-triggered maintenance unit
  (every 5th iteration) cures the knowledge inbox, compresses the NAP,
  retires stale TODOs, and keeps baselines current. TODOs must be able
  to shrink as well as grow.
- **block_transfer becomes the file-manipulation workhorse** — versatile
  like edit, robust to oldstring mismatch (v2 approved 2026-09-25:
  unified anchor semantics, line-number refs, buffers, PEEK/MAP,
  description rework). Test doctrine: a PURE-SCRIPT version for worker
  runs + "new-hire" tests — a worker uses the tool from its description
  WITHOUT reading the code; deliberately file-blind tasks find friction
  points by design.
- **The fuzzy-numword track stays observation-first** — pair channel
  (R1/R2), R6/R7 logging, R8 sandbox redirect + return info; the escape
  channel is GONE (bit-drift retired backend-side, #100).
- **Accumulate knowledge instead of re-deriving** — the one-time host map
  (#101), delegated upstream research (explorer + webfetch; cost lands in
  its context), knowledge curation with a retirement target, and — as an
  open area — a real "find anything" search layer over the knowledge base.
- **Evidence first, files over memory** — rebuild from git/DB/logs; the
  gauge is a lower bound; the first readout after compaction is the
  summarizer's gauge; live acceptance for observer-mediated mutations.
- **The new-project phase (later)** — the programmer role (worker prompt +
  quality floor + greenfield design block; draft exists at
  `prompts/agents/addition/programmer.md`), the quality-handout
  distill becomes mandatory on activation, first commits become the
  conventions, and possibly the FST-vs-opencode split into two
  trackable repos (his research item).

## Standing rules that shape autonomy (the calibration)
- Pushback over accommodation: disagreement stated BEFORE the refinement;
  "your call" is never a substitute for "I disagree".
- Observation triage: an unmarked maintainer remark → NAP only, no action;
  action requires a marker / inbox item / explicit instruction.
- Serial loop, single slot: same-model delegation (the cache rule),
  compaction over re-fill, never a direct request to the inference server.
- The maintainer's live files (opencode.jsonc, `maintainer/**`)
  are never edited or staged by agents; registration is his domain.

## Idle / autonomous initiative (per his standing --maintainer block)
When no actionable item remains — idle is PRODUCTIVE work, never a stop
(2026-09-27 ruling: the agent is always active in some form; an idle
autorun session closes with `action: restart`, NEVER `action: stop` — stop
is reserved for unrecoverable states or direct maintainer interaction in
autorun mode): the maintenance scope (inbox review — `agent_feedback.md` +
`agent_ideas.md` + the maintainer's `ideas.md` read-only → inline fix /
proposal / knowledge / TODO; curation; baselines), write proposals (always
allowed), research (ideas/feedback/maintainer-files/archive → per-research
folder when worthwhile — incl. bounded ONLINE research via the explorer:
one question per run, findings → TODO/knowledge/proposals), pathfinder
passes over code (fix small inline, file bigger), bookkeeping-reducing
tools, prompt improvements, the contact-surface hygiene pass (#183 — trim agent-facing
text to currently-actionable information, ranked by cost class), and the pure-script /
new-hire test ideas above. This file is the standing orientation for those sessions.

## Idle and maintenance units — menu, minimum output (added 2026-10-27)

Why this section exists: idle rounds historically ended early. The scope line
above is one run-on sentence with no cost class, no required artifact, and no
minimum, so a session that only curates the inbox can plausibly call itself
done. Fix both ends: the menu, plus the minimum rule.

Minimum output rule: an idle or maintenance round is NOT done until either one
`L` unit is closed or at least three menu items are closed. Every closed item
must leave an artifact — a commit, a knowledge entry, a TODO entry or status
change, a proposal, or a feedback/idea entry. Stop earlier only when the gauge
shows `REM <= 20k`, a maintainer or queue item takes priority, or one unit went
red twice.

Menu, cost class measured in your own calls (`S` under 10, `M` 10-25, `L` 25+):
- `S` Inbox curation: `agent_feedback.md`, `agent_ideas.md`, `todo_inbox.md`,
  the knowledge inbox → inline fix / TODO / knowledge / proposal.
- `S` Stale-baseline re-pin: gate totals, verification commands, storage-shape
  facts (example: the `part` table froze 2026-10-26T11:21Z; tool parts now live
  in `session_message`). Artifact: doc or knowledge diff.
- `S` Contact-surface hygiene (#183): pick ONE surface, drop instruction text
  about tools or behaviors that no longer exist, move dated narration to
  `archive/` with a one-line index stub. Artifact: before/after byte counts.
- `M` Forensics → knowledge: answer one measurable question from
  `session_message` (per-tool error rate, prompt-cache bust count,
  first-request prompt tokens per role) and land the answer as a knowledge
  entry with the query written down.
- `M` Pathfinder code review of one plugin or tool: dead code, stale comments,
  missing pins, misleading return messages. Fix small items inline, file the rest.
- `M` Proposal status sweep: for each file in `proposals/` and `proposals/approved/`,
  record whether its premise still holds; move stale ones to `superseded/` with
  a one-line reason.
- `M` New-hire probe battery: launch the `newhire` agent (or a worker on a
  deliberately naive prompt) on a fixed task set whose ONLY guidance is the tool
  description. Harvest friction → feedback + description fixes. Mandatory
  whenever a tool description is trimmed.
- `M` TODO/spec-library shrink: close or condense solved entries; every open
  entry must be delegable by ID alone.
- `L` Retirement units: the v1 plugin twin (TODO #150 unit B); an archive
  retention rule for the ~50 MB of tracked compaction dumps.
- `L` Tool-description work: only on his ranking (the 2026-10-15 2-tier proposal
  is held for migration interference — read its re-baseline section first).

Blank-agent note: the cleanest instrument for "what does an uninformed agent
struggle with" is a dedicated agent definition whose prompt is `AGENTS.md` ONLY
(no role prompt, no destill). A second variant with no instructions at all
measures how much of our guidance is load-bearing. Both bust the prompt cache
of every live session once, because the `subagent` tool description lists the
available agents: land such config additions on a cold turn.
