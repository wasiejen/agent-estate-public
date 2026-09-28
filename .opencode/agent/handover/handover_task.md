# Task spec — plan32 (unit 3): the repo-split research (MAINTAINER'S idle-lane research — RESEARCH ONLY)

Explorer: `explorer_Q3S_245K_slow`. RESEARCH task — NO code, NO config, NO
TODO edits, NO physical moves. One deliverable: one research doc.

As your first action after reading this spec, write your loop-log START
line via the `loop_log` tool (status: start; role: explorer-33; session +
model from your own context; content: a task oneliner). Write your own
DONE line (final gauge readout) before you finish.

## Goal (the maintainer's standing research — his priority.md lines 40-49,
the section `# repo split research/proposal`, read it — it is the
contract, plus his idle-lane `--maintainer` block: "each research should
be at least a single run")
Answer: how best to separate the FST product and the opencode/agent part
of this single repo (branch `opencode_test`) into TWO independently
trackable git repos — with the FST repo containing ONLY the files that
concern the product (no agents, no opencode) — and evaluate his sketch:
a parallel folder `home\Projects\Repos\Opencode|Free-Snap-Tap`
("Opencode" = the current structure WITHOUT the FST files; an explicit
directory / path variable for generality; a GitHub copy of FST cloned
into the new folder; the old FST moved into
`home\Projects\Repos\Free-Snap-Tap` — he explicitly allows
DEFERRING the physical move "to not have to update all the references at
once").

## The research doc
`.opencode/agent/research/2026-09-28_repo-split.md` (≤ ~150 lines),
these sections:
1. **Inventory** — the current repo layout split into: (a) the FST
   product files (source, tests, assets, build/config that belongs to the
   product), (b) the opencode/agent part (`.opencode/**`, AGENTS.md, the
   root config, anything else agent-side), with counts per top-level path
   (bounded scans only).
2. **The reference map** — every place the single-repo layout is PINNED:
   repo-root resolution in the plugins/tools (grep the `repoRoot` /
   `__dirname` / `process.cwd()` / absolute-path patterns in
   `.opencode/plugin/*.ts` + `.opencode/tools/*.ts`), the curated scripts
   (`.opencode/agent/scripts/**`), the test/lint/gate configs (pytest /
   ruff / the probe gate's path assumptions), `opencode.jsonc`,
   `.gitignore`, and the docs (AGENTS.md, repo docs) that name the layout.
   Each pin: file + locator + what it assumes (same-folder vs absolute).
3. **Options** — analyze at least:
   - **A. Sibling repos** (his sketch): `Projects\Repos\Free-Snap-Tap`
     (clean FST) + `Projects\Repos\Opencode|Free-Snap-Tap` (the agent
     part) — the cross-link mechanism (a config pointer / path variable /
     env, your recommendation among the candidates), history treatment
     (fresh init vs `git filter-repo` subtree extraction — tradeoffs).
   - **B. Submodule/subtree** (the agent part as a git submodule inside
     the FST repo or vice versa) — why it helps / why it doesn't.
   - **C. Status-quo + git worktrees/sparse** (no repo split; the cheapest
     option that buys SOME independence) — what it covers, what it
     cannot.
4. **Recommendation + migration steps** — the chosen option, ordered
   steps, INCLUDING his DEFERRED-MOVE variant (git-level split first,
   physical folder move later — spell out what each phase updates and
   what stays working in between), the reference-update list (from §2),
   and the risk list (the live loop, the root `opencode.jsonc` location,
   git-ignored runtime state, the session DB path, the scratchpad
   path, the GitHub-remote step).
5. **Effort + approval boundary** — per-phase effort class (line-count /
   wall-time), what is the pre-approved agent-usage class vs what is
   the maintainer's domain (the physical move, the GitHub copy/remote,
   anything touching his live machine state).

## Fact sources (bounded — read ONLY these areas)
- `.opencode/maintainer/priority.md` lines 40-49 (the contract) — READ
  ONLY.
- Repo root: `ls` at top level + `ls .opencode` (names, bounded).
- `.gitignore`, `opencode.jsonc`, `package.json` (read — short files).
- Path pins: greps (bounded, `| head -30`) for `repoRoot`, `__dirname`,
  `process.cwd()`, `Projects`, `AppData` in `.opencode/plugin/*.ts`,
  `.opencode/tools/*.ts`, `.opencode/agent/scripts/**` (the .md READMEs
  name the cjs helpers — read their headers).
- Test/gate config: the pytest/ruff config file NAMES at the root + the
  probe gate definition (`.opencode/plugin/probes/handover_probe.mjs`
  HEADER ONLY — it self-annotates the total).
- `git branch -v`, `git remote -v` (bounded).
- `AGENTS.md` (repo-agnostic protocol — skim the repo pointers) +
  `.opencode/agent/prompts/repo/repo_overview.md` (the repo-specific map —
  READ ONLY, it names the layout facts).

## Definition of done
- The doc committed at the path above (one checkpoint commit: doc + loop
  log lines); `git status` shows ONLY that doc + the loop log after the
  commit.
- Every path/claim in the doc carries its evidence (the file + locator);
  no unverified pin.
- The doc ends with the recommendation + the approval-boundary note.
- NO edits to any `.ts`/`.mjs`/`.cjs`/`.py`/`.jsonc`/config file, NO moves,
  NO TODO/`.opencode/maintainer/**`/`.opencode/agent/prompts/**` edits.
- Your summary goes to `.opencode/agent/handover/handover_task_to_planner.md`
  (the doc path + the recommendation + the top 3 risks, in 5 lines).
