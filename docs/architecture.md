# Architecture — the estate in detail

Public face: `README.md`. This document is the technical map. Paths are
relative to the repository root.

## Roles and control flow

Three roles, defined in `AGENTS.md` §Role and Interaction Model, prompted in
`agent/prompts/`:

- planner — plans, delegates, verifies; owns the plan state (the NAP,
  `agent/handover/handover_planner.md`).
- worker — implements one delegated task to green state, commits checkpoints,
  writes the summary.
- explorer — audits and maps; files prioritized `TODO.md` entries.

One round:

1. The maintainer states standing direction in `maintainer/priority.md`; his
   messages sit in `maintainer/inbox_planner/` and `maintainer/inbox_worker/`.
2. The planner writes a task spec: goal, definition of done, approval
   boundary. Specs sit under `agent/handover/specs/`; the working pointer is
   `agent/handover/handover_task.md`.
3. A delegation runs the worker or explorer as a subagent on that spec.
4. The worker commits green checkpoints and writes
   `agent/handover/handover_task_to_planner.md`; the planner verifies it
   against `git log` and the changed-file list, not against its prose.
5. The planner closes the round with an `action:` line — `continue`,
   `restart`, `resume`, `ask_maintainer`, or `stop`.
   `.opencode/plugins/auto_resume.ts` parses that line and keeps the loop
   alive (`continue` wakes the same session; `restart` spawns a fresh one).
6. Each round leaves a record: `loop_log` appends one stamped event line to
   `loop/<run>/loop_log.md`; `loop/<run>/counter.json` holds the iteration
   number; digests per session live beside them.

Two standing constraints shape autonomy: the backend is a serial single-slot
inference pipeline, so delegations run in the foreground and parallel launches
are forbidden; agents never send requests directly to the inference server.

## Contract design

`AGENTS.md` §Interaction Contract holds the channels table: one row per file,
naming the writer, the reader, and when the file is canonical. The
load-bearing rules:

- A committed file is the resume contract. A fresh session rebuilds state
  from files and `git log`, never from memory.
- The summary file is the single summary channel; the final message points at
  it and does not repeat it.
- A worker never edits the plan state; a planner never implements a worker's
  task.
- Every `TODO.md` entry is delegable by its ID alone (§TODO.md Entry
  Contract): problem and evidence, desired outcome, acceptance criteria,
  suggested scope, status. Loose findings arrive through the `submit` tool
  and the planner curates them into numbered entries.

## Custom tools

Each tool exists because a manual step cost effort or caused errors. Only
`.opencode/plugins/**` register custom tools (via the host's tool-transform
editor); `.opencode/tools/` is the legacy lane with docs only. The live set:

| Tool | What it replaces |
|---|---|
| `block_transfer` | hand-copied multi-line moves — line-anchored block MOVE/COPY/CUT/PASTE/REPLACE/WRITE with named clipboard buffers, sandboxed to allowed roots; short unique line-prefix anchors instead of exact-string matches |
| `context_trim` | the denied compaction lane — self-managed informed dropping (§Context survival) |
| `ctx_gauge` | a gauge shell-out — read-only readout `CTX=… (p%) REM=… ROUND=…`, lagging one step, so it is a lower bound |
| `loop_log` | hand-formatted loop lines — appends one stamped line, reads the file back and byte-compares |
| `state_snapshot` | the planner's 6–8-call session-start read — one capped, deterministic digest |
| `submit` | manual inbox edits — appends to five channels: feedback, knowledge, todo, ideas, memory |
| `dev_get_tool_context_contents` | debug introspection of the host tool context |

Plugins without a tool still reduce friction: `intercept_observer.ts` logs
path anomalies and fail-closed fuzzy path resolution (edit-distance thresholds
per tool) with verdicts to `.opencode/temp/intercept.log`; `auto_resume.ts`
drives the action-line state machine; `context_family.ts` carries the gauge
readout and the injected context nudge lines. `agent/scripts/` holds forensics
helpers (git history probe, session-dump lanes). The gate for this surface:
`node .opencode/plugins/probes/handover_probe.mjs` prints
`PROBE handover: <t>/<t> PASS`; smoke suites sit in
`.opencode/plugins/tests/`.

## Context survival

The host runs no automatic compaction, and the compact lane is denied.
Sessions manage their own context through `context_trim`
(`AGENTS.md` §Context Trim; `.opencode/plugins/context_trim_v2.ts`):

- Lanes: `report` (read-only window map with per-row weights and flags),
  `mark` + `apply` (informed drops committed behind a fit bound),
  `free target=N` (one atomic call frees ~N % of the window, heaviest and
  oldest first), `tail` (keep-boundary), `clear`.
- Drop state lives in `.opencode/temp/context_trim_v2.json`. Drops land at
  the next assembly; a dropped tool output is recoverable only from committed
  files, so the protocol orders: commit state before dropping.
- The wall guard fires near the ceiling and drops the heaviest completed
  outputs first, never the head, user rows, or the newest step. Measured:
  zero provider rejections while sessions ran pinned at the ceiling.
- The injected nudge lines name rungs (`triage`, `stop`, `emergency`,
  `maintainer`); each role prompt maps its rungs to concrete actions.
- Recovery of a walled child session: report → free → resume the same session
  (never relaunch — the work is usually staged in its tree).

## Communication lanes

- maintainer → agents: `maintainer/inbox_planner/`, `maintainer/inbox_worker/`.
  Handling an item means moving it to `maintainer/done/` — the move is the
  receipt. `priority.md` is persistent; `_past_priorities.md` logs handled
  items.
- agents → maintainer: `proposals/` — the file's location is its state:
  root → `commented/` → `approved/` → `implemented/`. Actions only the
  maintainer can run go to `maintainer/inbox_maintainer/`, one file per owner
  action.
- agent bookkeeping: the `submit` channels feed the knowledge, feedback,
  ideas, todo, and memory inboxes; each role curates its own
  `agent/memory/<role>/memory_inbox.md` into role memory (`agent/memory/`).
- loop records: `loop/autorun-<stamp>/` holds `loop_log.md`, per-delegation
  spec/summary copies, round summaries, and per-session wake digests.
  A finished run moves frozen to `archive/loop/`.

## Naming note

The estate is named `agent-estate` (ruled 2026-10-29). The host product is
mentioned only as "the host" — this repository is not part of that project
and does not carry its name. The public history is a filtered extract of the
private estate: personal paths and internal bookkeeping were removed from it.
