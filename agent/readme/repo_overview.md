# repo_overview.md — repo-specific map for the agent repo (READ FIRST)

The opencode agent bookkeeping repo: shared protocol (`AGENTS.md`), role
prompts (`agent/prompts/`), custom plugins/tools (`.opencode/plugin/`,
`.opencode/tools/`), the live loop + handover/NAP (`loop/`, `agent/handover/`),
and per-project bookkeeping (`projects/<name>/`). No FST product code lives in
this repo — its bookkeeping + repo docs sit in `projects/Free-Snap-Tap/`.
The repo map is split into the parts in THIS folder; read the part(s) you need,
not the whole set.

Maintained by the maintainer and the agents (ruling 2026-10-26: agents may edit
these parts — they exist for agent work, not for the maintainer's screen). If a
part conflicts with the code, the code wins — fix or flag the discrepancy in
your summary or `TODO.md`.

Parts (read when …):
- `repo_commands.md` — read when running shells, the node-probe gate, or the
  gauge, or when you need the handover / archive / NAP file paths.
- `repo_custom_tools.md` — read when using (or delegating) the
  host-specific opencode tools (block_transfer, ctx_gauge, loop_log,
  compact_memory) or when one of their behaviors surprises you.
- `repo_opencode.md` — read when you need opencode host specifics:
  install/log/SDK paths, plugin registration, or opencode behavior not in
  the knowledge base (index → `agent/knowledge/opencode-plugins/`).
- `readme_research.md` — read when starting a research pass (idle lane or a
  delegated research unit): phases, bounded reads, output placement.
Per-project doc sets live under `projects/<name>/repo/` — e.g. Free Snap Tap:
`projects/Free-Snap-Tap/repo/` (repo_map, repo_testgate, repo_gotchas,
repo_commands).

## Safety limits
- **Backend inference server** (llama-swap, SINGLE model slot —
  local-inference-host as of 2026-09-24, the address may move): agents
  NEVER launch requests at it — not for tests or probes, not even
  enumeration (GET /v1/models). A direct request evicts whatever model
  the live session is using (measured 2026-09-24: an 80k prefill probe
  kicked the planner's own model out of the backend mid-session). All
  model traffic goes through opencode sessions only; the maintainer
  alone touches the backend (e.g. moving the context limit there —
  no opencode.jsonc change needed).
- **Permanent startup load errors (measured 2026-09-24):** every
  process start logs `failed to load plugin` for `compact_memory.ts`
  ("The \"paths[0]\" property must be of type string, got object") and
  `intercept_observer_core.ts` ("Plugin export is not a function") —
  yet the compact_memory tool WORKS (a self-compact ran under the same
  failing start) and the observer intercepts live (intercept.log
  grows). The maintainer confirmed no alternative plugin versions
  exist — the files load despite the errors. FIX PENDING (separate
  item; the maintainer flagged it 2026-09-24).
