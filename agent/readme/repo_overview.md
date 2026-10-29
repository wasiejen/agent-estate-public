# repo_overview.md — repo-specific map for the agent repo (READ FIRST)

This repo holds the agent-estate bookkeeping: the shared protocol
(`AGENTS.md`), role prompts (`agent/prompts/`), custom plugins/tools
(`.opencode/plugins/`, `.opencode/tools/`), the live loop plus the
handover/NAP files (`loop/`, `agent/handover/`), and per-project
bookkeeping (`projects/<name>/`). No FST product code lives here; its
bookkeeping and repo docs sit in `projects/Free-Snap-Tap/`. The map is split
into the parts in THIS folder. Read the part you need, not the whole set.
The architecture-first identity of the whole repo is the root `README.md`.

The maintainer and the agents maintain these parts (ruling 2026-10-26:
agents may edit them — they exist for agent work, not for the maintainer's
screen). The code wins over a part. Fix the discrepancy, or flag it in your
summary or `TODO.md`.

Parts (read when …):
- `repo_commands.md` — read when you run shells, the node-probe gate, or the
  gauge; also for the handover, archive, and NAP file paths.
- `repo_custom_tools.md` — read when you use or delegate the host-specific
  opencode tools (block_transfer, ctx_gauge, loop_log, context_trim), or
  when one of their behaviors surprises you.
- `repo_opencode.md` — read for opencode host specifics: install, log, and
  SDK paths, plugin registration, or behavior absent from the knowledge base
  (index → `agent/knowledge/opencode-plugins/`).
- `readme_research.md` — read when you start a research pass (idle lane or a
  delegated unit): phases, bounded reads, output placement.
Per-project doc sets live under `projects/<name>/repo/`. Example:
`projects/Free-Snap-Tap/repo/` (repo_map, repo_testgate, repo_gotchas,
repo_commands).

## Safety limits
- **Backend inference server** (llama-swap, SINGLE model slot —
  local-inference-host as of 2026-09-24, the address may move): agents NEVER
  launch requests at it — not for tests or probes, not even enumeration
  (GET /v1/models). A direct request evicts whatever model the live session
  uses (measured 2026-09-24: an 80k prefill probe kicked the planner's own
  model out of the backend mid-session). All model traffic goes through
  opencode sessions only. The maintainer alone touches the backend (for
  example, moving the context limit there — no opencode.jsonc change needed).
- **Startup load errors — NO LONGER PRESENT (re-measured 2026-10-27, CLI
  2.2.0):** the old claim that every start logs `failed to load plugin` for
  the retired compact plugin ("paths[0]" type error) and `intercept_observer_core.ts`
  ("Plugin export is not a function") is STALE. Last occurrence of both:
  2026-10-22. Today's start: zero load-error lines; the host logs
  `plugin reconciliation completed … plugins=14`. One transient case remains
  worth knowing: a plugin file saved mid-edit can be hot-reloaded in an
  incomplete state (2026-10-26 17:46Z `auto_resume` `ReferenceError:
  storeScopeOf is not defined` — the symbol exists in the committed file); the
  next start loads clean. The host hot-reloads `.opencode/plugins/**` on
  change, so a plugin edit takes effect without a restart.
