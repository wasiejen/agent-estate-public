# repo-split/ — prepared Phase-0 artifacts for the FST-vs-agent repo split

The research doc lives at `../2026-09-28_repo-split.md` (inventory, the 16-pin
reference map, options, the deferred-move recommendation, effort + approval).
This folder holds the PREPARED, UNEXECUTED Phase-0 artifacts (doc §4-§5):

- `extract_dryrun.mjs` — dry-run extraction plan: partitions the tracked files
  into the FST side and the agent side, verifies the doc's counts, prints the
  pin diff. READ-ONLY by construction (no copies, no git init, no pin edits).
  `node .opencode/agent/research/repo-split/extract_dryrun.mjs`

What does NOT go here: anything executable against the machine (creating repos,
copying files, editing `opencode.jsonc`, the GitHub remote — all Phase 1/2,
the maintainer's domain), and no FST product files. The proposal in
`.opencode/proposals/2026-09-28_repo-split-phase1.md` is the decision channel.
