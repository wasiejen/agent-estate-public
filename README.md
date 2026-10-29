# agent-estate — keep long autonomous agent runs from falling over

Autonomous coding agents die the same three ways: they lose their state when a
session ends, they exhaust their context window mid-task, and a single
mistyped tool call sends them off a cliff. This repository is the operating
system around those failures: three agent roles run an autonomous loop under a
shared protocol, and every mechanism exists to make one more round survivable —
recoverable state, an explicit context budget the agents manage themselves,
and tools that remove the manual steps where errors crept in.

Everything is plain files and git history: no database you cannot read, no
orchestrator you cannot inspect.

## What it does

- Runs a **planner → worker/explorer** delegation loop unattended for weeks
  (56 rounds, 38 planner sessions since 2026-09-06).
- Keeps all working state in **committed files** — a dead session resumes from
  `git log` and three handover files, not from a lost conversation.
- Lets each session **manage its own context window**: measure, decide, drop
  spent tool output, keep going — instead of being compacted by surprise.
- Ships **seven custom tools** (block editing, context trim, context gauge,
  loop logging, session digest, inbox submit) plus plugins that intercept and
  log mistyped paths before they do damage.
- Talks to its human **asynchronously**: decision packets, inboxes, an
  action-line state machine — no chat required to keep the loop alive.

## Control flow

```text
 maintainer ── priority.md / inbox ──▶ planner
   ▲                                    │  writes task spec (goal, DoD,
   │  decision packets,                 │  approval boundary)
   │  action receipts                   ▼
   │                            worker / explorer (subagents)
   │                                    │  green commits + summary
   └── proposals/ ◀── planner verifies ─┘
                     │
                     └── action: continue | restart | resume | ask_maintainer | stop
                         (parsed by the resume plugin → the loop stays alive)
```

## The decisions worth reading

1. **A committed file is the resume contract.** Every handover is a file; a
   fresh session rebuilds reality from `git log`, never from memory. That is
   why the history is the proof of what the system does.
2. **Context survival is self-managed and informed.** The host offers no
   automatic compaction here, so a `context_trim` lane lets a session see its
   own window (`report`), stage drops (`mark`/`apply`), or free a target
   percentage in one call — after committing, because dropped output is only
   recoverable from files. One call frees ~65k tokens; the wall guard kept
   provider rejections at zero while sessions ran near the ceiling.
3. **Delegation is bounded by a spec, not a prompt.** Goal, definition of
   done, approval boundary, suggested scope — written once, readable by a
   fresh worker, verifiable by a stranger.
4. **Friction gets a tool, then a gate.** Each custom tool replaced an error-
   prone manual step; each one ships with smoke suites and a probe (115
   checks) that pins its observable behavior.

## Numbers

| Metric | Value |
|---|---|
| Autonomous rounds / planner sessions | 56 / 38 |
| Commits in this public history | 1,362 since 2026-09-06 |
| Plugins / custom tools | 11 / 7 |
| Gate suites / pinned checks | 11 / 115 |
| Context freed by one trim call | ~65,000 tokens |

Honest gaps: no edit success-rate metric, no latency benchmark, no A/B study
against a non-instrumented baseline.

## Quickstart

This is a research prototype that runs against a local inference backend.

1. Copy `.opencode/` (plugins + tools) and `AGENTS.md` into your own repo.
2. Register the roles (`opencode.jsonc` agents block) pointing at
   `agent/prompts/`.
3. Run a planner session; close it with an `action:` line and let the resume
   plugin wake it.
4. Verify the tool surface: `node .opencode/plugins/probes/handover_probe.mjs`.

## Notes

- Status: research prototype, non-commercial. MIT licensed (`LICENSE`).
- Naming: "the host" is the CLI this estate wraps; this project is not
  affiliated with it and does not carry its name.
- Deep docs: `docs/architecture.md` (roles, channels, tools, context design).
