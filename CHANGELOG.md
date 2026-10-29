# Changelog

Personal, self-directed project; no commercial or production use is claimed.
Every entry below points at files in this repository.

## v0.1.0 — 2026-10-29

First public release: a filtered extract of the private working estate
(1,362 commits of history preserved, private paths and personal data removed).

### Added
- Protocol layer: `AGENTS.md` (roles, channels table, commit routine, context
  budget) and role prompts in `agent/prompts/`.
- Autonomous loop: planner/worker/explorer delegation with an `action:` line
  state machine driven by `.opencode/plugins/auto_resume.ts`.
- Context survival: `context_trim` lanes (`report`, `mark`/`apply`, `free`,
  `tail`, `clear`), the wall guard, and injected nudge rungs
  (`.opencode/plugins/context_trim_v2.ts`, `context_family.ts`).
- Custom tools: `block_transfer`, `context_trim`, `ctx_gauge`, `loop_log`,
  `state_snapshot`, `submit`, `dev_get_tool_context_contents`
  (`.opencode/plugins/`).
- Observation: `intercept_observer.ts` — path-anomaly logging with fail-closed
  fuzzy path resolution.
- Async maintainer communication: inboxes, proposals whose folder is their
  state, owner-action queue (`maintainer/README.md`, `proposals/README.md`).
- Gate: handover probe (115 checks) + 11 smoke suites
  (`.opencode/plugins/probes/`, `.opencode/plugins/tests/`).

### Notes
- Measured evidence lives in `docs/architecture.md` (tokens freed per trim
  call, guard behavior at the ceiling); no edit success-rate or latency
  benchmarks exist yet — stated in the README.
- History spans 2026-09-06 onward; private bookkeeping was excluded from the
  extract, so commit messages reference mechanisms, not incidents.
