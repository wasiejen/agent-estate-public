# agent-estate — a self-maintaining agent estate

This repository holds an agent system, not an application. Three agent roles run
an autonomous loop around one shared protocol, keep their own bookkeeping, and
exchange decisions with the maintainer through committed files. This README
explains the shape. The detailed map lives in `agent/readme/repo_overview.md`.

## What this is

The active product is the agentic workflow itself (`agent/orientation.md`). Its
parts:

- `AGENTS.md` — the universal protocol: roles, channels, commit routine,
  context budget. The host loads it into every session.
- `agent/prompts/` — role prompts: `agent_planner.md`, `agent_worker.md`,
  `agent_explorer.md`.
- `.opencode/plugins/` — 11 `.ts` plugins: the custom tools plus the loop
  machinery (`auto_resume.ts`, `intercept_observer.ts`, `context_family.ts`).
- `agent/knowledge/` — verified repository knowledge. `agent/memory/` —
  per-role memory under its own convention (`agent/memory/README.md`).
- `agent/readme/` — instruction parts, indexed by `repo_overview.md`.
- `loop/` + `agent/handover/` — the current looprun's records and the handover
  files.
- `maintainer/` + `proposals/` — both exchange directions with the maintainer.
- `projects/Free-Snap-Tap/` — the product repo's bookkeeping; that product's
  code lives elsewhere (`agent/readme/repo_overview.md`).
- `TODO.md`, `todo_inbox.md`, `todo_records.md` — open items, loose findings,
  closed records.

North star, quoted in `agent/orientation.md` from the maintainer: "I want you
to learn." The tools, knowledge, and prompts exist so the system keeps getting
better.

## Architecture: roles and control flow

Three roles, defined in `AGENTS.md` §Role and Interaction Model, prompted in
`agent/prompts/`:

- planner — plans, delegates, verifies; owns the plan state (the NAP,
  `agent/handover/handover_planner.md`).
- worker — implements one delegated task to green state, commits checkpoints,
  writes the summary.
- explorer — audits and maps; files prioritized `TODO.md` entries.

One round runs in this order:

1. The maintainer states what he wants next in `maintainer/priority.md`; his
   messages sit in `maintainer/inbox_planner/` and `maintainer/inbox_worker/`.
2. The planner scans them and writes a task spec: goal, definition of done,
   approval boundary. Specs sit under `agent/handover/specs/`; the working
   pointer is `agent/handover/handover_task.md`.
3. A delegation runs the worker or explorer as a subagent on that spec.
4. The worker commits green checkpoints and writes
   `agent/handover/handover_task_to_planner.md`; the planner reads it.
5. The planner closes the round with an `action:` line — `continue`, `restart`,
   `resume`, `ask_maintainer`, or `stop`. `.opencode/plugins/auto_resume.ts`
   parses that line (its `ACTION_RE` regex) and keeps the loop alive.
6. Each round leaves a record: `loop_log` appends one stamped event line to
   `loop/<run>/loop_log.md`; `loop/<run>/counter.json` holds the iteration
   number.

Two standing constraints shape autonomy: the backend is a serial single-slot
inference pipeline, so every delegation runs in the foreground and parallel
launches are forbidden (`agent/orientation.md` §Delegation rule). Agents never
send requests directly to the inference server
(`agent/readme/repo_overview.md` §Safety limits).

## Contract design

`AGENTS.md` §Interaction Contract holds the channels table: one row per file,
naming the writer, the reader, and when the file is canonical. The
load-bearing rules, from its §Surface Rules:

- A committed file is the resume contract. A fresh session rebuilds state from
  files and `git log`, never from memory.
- The summary file is the single summary channel. The final message points at
  it and does not repeat it.
- A worker never edits the NAP; a planner never implements a worker's task.
- Every `TODO.md` entry is delegable by its ID alone (§TODO.md Entry
  Contract). The planner curates `todo_inbox.md` into `TODO.md`.

## Custom tools (friction reducers)

Each tool exists because a manual step cost effort or caused errors. Only
`.opencode/plugins/**` register custom tools — via `ctx.tool.transform` +
`editor.add` (`.opencode/plugins/block_transfer.ts` L1267). `.opencode/tools/`
is the legacy v1 lane: docs and `.md` pairs only; its `.ts` twins sit in
`.opencode/tools/deactivated/` (TODO/#240). The live registered set, as a
worker session sees it in its own tool list:

| Tool | What it replaces |
|---|---|
| `block_transfer` | hand-copied multi-line moves — line-anchored block MOVE/COPY/CUT/PASTE/REPLACE/WRITE with named clipboards, sandboxed to the repo and the temp dir |
| `context_trim` | the denied compact lane — self-managed informed dropping (§Context survival) |
| `ctx_gauge` | a gauge shell-out — read-only readout `CTX=… (p%) REM=… ROUND=…`, lagging one step, so treat it as a lower bound |
| `loop_log` | hand-formatted loop lines — appends one stamped line and confirms the read-back |
| `state_snapshot` | the planner's 6–8-call session-start read — one capped digest, planner-only |
| `submit` | manual inbox edits — appends to five channels: feedback, knowledge, todo, ideas, memory (`.opencode/plugins/submit.ts`) |

Plugins without a tool still reduce friction: `intercept_observer.ts` logs path
anomalies and fail-closed fuzzy path resolution (mistyped `read` paths d≤2,
`edit` paths d≤1) with verdicts to `.opencode/temp/intercept.log`;
`auto_resume.ts` drives the action-line state machine; `context_family.ts`
carries the gauge readout and the injected ctx nudge lines. `agent/scripts/`
holds forensics helpers (`git/history_probe.mjs`, the `db/` session-dump
lanes). The gate for this surface: `node .opencode/plugins/probes/handover_probe.mjs`
prints `PROBE handover: <t>/<t> PASS` (`agent/readme/repo_commands.md`).

## Context survival

The host runs no automatic compaction, and the compact lane is denied (root
permission, 2026-10-29 — `agent/readme/repo_custom_tools.md`). Sessions manage
their own context through `context_trim` instead (`AGENTS.md` §Context Trim;
`.opencode/plugins/context_trim_v2.ts`):

- Lanes: `report` (read-only window map), `mark` + `apply` (informed drops
  behind a fit bound), `free target=N` (one call frees ~N % of the window),
  `tail` (keep-boundary), `clear`.
- Drop state lives in `.opencode/temp/context_trim_v2.json`. Drops land at the
  next assembly; a dropped tool output is recoverable only from committed
  files, so the protocol orders: commit state before dropping.
- The wall guard fires near the ceiling and drops the heaviest completed
  outputs first, never the head or the newest step. `TODO.md` entry #227
  records zero provider rejections while a session sat pinned at the ceiling
  (evidence: `.opencode/temp/context_trim_v2.log`).
- `context_family.ts` injects the ctx nudge lines; role prompts map each rung
  (`triage`, `stop`, `emergency`, `maintainer`) to its actions.

## Communication lanes

- maintainer → agents: `maintainer/inbox_planner/` and `maintainer/inbox_worker/`.
  Handling an item means moving it to `maintainer/done/` — the move is the
  receipt (`maintainer/README.md`). `priority.md` is persistent;
  `_past_priorities.md` logs handled items.
- agents → maintainer: `proposals/` — the file's location is its state:
  root → `commented/` → `approved/` → `implemented/` (`proposals/README.md`).
  Actions only he can run go to `maintainer/inbox_maintainer/`, one file per
  owner action (its README).
- agent bookkeeping: the `submit` channels feed the knowledge, feedback, ideas,
  todo, and memory inboxes; each role curates its own
  `agent/memory/<role>/memory_inbox.md` (`agent/memory/README.md`).
- loop records: `loop/autorun-<stamp>/` holds `loop_log.md`, per-delegation
  spec/summary copies, `plan<N>_summary.md`, and wake digests
  `plan<N>_wakes_<sid>.md` (`agent/readme/readme_loop.md` §Session wake
  digest). A finished run moves frozen to `archive/loop/` (`loop/README.md`).

## Naming note

The estate is named `agent-estate` (ruled 2026-10-29). The host product is
mentioned only as "the host (opencode CLI)" — this repository is not part of
that project and does not carry its name. The origin remote, the local folder,
and the tracked-text sweep landed 2026-10-29; historical mentions in archived
records keep their original names.

## Pointers

- Protocol: `AGENTS.md`. Direction: `agent/orientation.md`.
- Repo map: `agent/readme/repo_overview.md` and its parts.
- Tool usage traps: `agent/readme/repo_custom_tools.md`.
- Open decisions: `TODO.md`. Loose findings: `todo_inbox.md`.
- Current run state: `agent/handover/handover_planner.md` and `loop/`.
