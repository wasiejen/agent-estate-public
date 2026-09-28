# repo-split — Phase 1 (git-level split, old location untouched)

**One idea:** approve Phase 1 of the repo split — create the two sibling repos
(FST product / the estate (former name)) as fresh inits on `Projects\Repos\…`, with the
OLD folder continuing to operate as the live workspace, and the physical move
(Phase 2) deferred to a between-sessions window. Your priority.md sketch and
explicit allowance of a deferred move; the research is one full run (plan32
unit 3, explorer-33).

## Where the substance is
- Research doc (inventory, 16-pin reference map, options A/B/C, steps, effort):
  `.opencode/agent/research/2026-09-28_repo-split.md` — §4 carries the exact
  Phase 1 steps.
- Prepared Phase-0 artifact (read-only verified, UNEXECUTED):
  `.opencode/agent/research/repo-split/extract_dryrun.mjs` — partitions the
  tracked files (812 total: 752 agent side = `.opencode/` 743 + 9 root agent
  files; 60 product side), verifies the doc's counts, and prints the pin diff
  as a checklist. Run: `node .opencode/agent/research/repo-split/extract_dryrun.mjs`.

## Recommendation
**Option A, deferred-move variant (doc §4), plain fresh inits — no
filter-repo history rewrite** (the FST GitHub copy at Phase 2 carries the
history; a rewrite adds medium effort for no Phase-1 benefit). Phase-1 work is
small–medium (2 fresh inits, ~5-10 pin edits: `opencode.jsonc:26` + a new
`references.fst` entry + 2 repo docs; **zero plugin/tool code changes** — the
only machine-absolute repo-root pin in the whole agent part is
`opencode.jsonc:26`). Between phases the live loop keeps working: old workspace
untouched, session DB + scratchpad live outside both repos, both new repos
inert.

## Decisions for you (ordered by priority)
1. **Phase-1 GO** (and: plain fresh inits vs the filter-repo variant — my
   recommendation above). Execution stays yours (creating repos on your
   machine is observable — doc §5); the script + pin checklist are ready.
2. **The FST GitHub copy** (Phase 2, your domain — origin re-point).
3. **Phase-2 timing** — the move must land between sessions with a committed
   handover (live `context.directory` stalency, doc risk 1); plus the
   untracked-runtime rebuild (`.venv`, `.opencode/node_modules` — the dry-run
   lists 15,088 ignored paths, doc risk 3).

## Open notes (no decision needed)
- Keep `opencode.jsonc:28` (the session-log allow-list) in the agent repo's
  config (doc risk 4).
- Doc pins #16 (`repo_commands.md:36`, `repo_opencode.md:8`) + layout wording
  in `AGENTS.md`/`repo_overview.md` update ONLY if the physical move happens.
