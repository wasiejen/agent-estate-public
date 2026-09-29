# repo-split carve — execution plan (prepared 2026-09-29; GO per direct ruling)

**Status:** approved ("yep carve go" — 2026-09-29 direct session).
Prepared by the planner (read-only prep only). **Execution = maintainer
domain** (creates/rewrites repos on his machine — research doc §5
approval boundary). Companions: `2026-09-28_repo-split.md` (inventory +
16-pin map), `extract_dryrun.mjs` (re-runnable read-only partition
check).

## Source of truth
The old workspace (the current live repo) at its committed HEAD at
execution time (prepared state: branch `opencode_test` @ 3c6fefb, clean
tree). Both sides are carved from a FRESH CLONE of this repo. The
current new-location copies are STALE and get replaced — their state is
subsumed (the the estate (former name) folder's unique commit 76bf2e1 = the
opencode.jsonc reference edits already present in the source HEAD —
verify at execution: `git -C repo-root
show 76bf2e1 --stat`).

Current partition (dry-run, 2026-09-29): **835 tracked = agent 775
(`.opencode/` 767 + root 8) + product 60**.

## Carve boundary — the agent-side paths (8 root + .opencode)
```
.opencode/
AGENTS.md   TODO.md   todo_inbox.md   todo_records.md
opencode.jsonc
export-planner-session-ses_f5b1.md
export-worker-session-ses_f5ae.md
export-worker2-session-ses_f5a2.md
```
(Product side = everything else = 60 tracked entries.)

## Tool
`home/Repos/git-filter-repo` = the single-file script
(212 KB, downloaded 2026-09-29) — invoke as
`py -3.12 home/Repos/git-filter-repo --version` (rename to
`git-filter-repo.py` if the extension-less form misbehaves). filter-repo
requires a FRESH clone (it refuses otherwise) and STRIPS the origin
(re-add below); ALL refs/branches are rewritten.

## Side A — FST product repo → home/Repos/Free-Snap-Tap
1. `git clone <old-workspace-path> %TMP%\fst-carve` (fresh clone)
2. `cd %TMP%\fst-carve`
3. Carve:
   ```
   py -3.12 home/Repos/git-filter-repo --invert-paths ^
     --path .opencode --path AGENTS.md --path TODO.md ^
     --path todo_inbox.md --path todo_records.md --path opencode.jsonc ^
     --path "export-*session-*.md"
   ```
4. `git remote add origin https://github.com/wasiejen/Free-Snap-Tap.git`
5. Verify: `git ls-files | wc -l` = 60; `git log --oneline -5` (history
   intact); `git show HEAD:TODO.md` must FAIL; `git show
   HEAD:tests/conftest.py` must SUCCEED.
6. Move the carved clone into the Free-Snap-Tap slot (replacing the
   stale clone).
7. Runtime: copy `.venv` (same machine → the pyvenv.cfg absolute paths
   stay valid) or rebuild; `__pycache__` & friends regenerate.
8. **HIS CALL:** force-push the carved history to GitHub (the current
   remote history is mixed — `.opencode/` is tracked there) or push a
   fresh remote; branch pruning (keep `opencode_test` as the dev
   channel, drop the rest).

## Side B — agent repo → repo-root
9. `git clone <old-workspace-path> %TMP%\agent-carve` (fresh clone)
10. `cd %TMP%\agent-carve`
11. Carve:
    ```
    py -3.12 home/Repos/git-filter-repo ^
      --path .opencode --path AGENTS.md --path TODO.md ^
      --path todo_inbox.md --path todo_records.md --path opencode.jsonc ^
      --path "export-*session-*.md"
    ```
12. Verify: `git ls-files | wc -l` = 775; `git show
    HEAD:free_snap_tap.py` must FAIL; `git show
    HEAD:.opencode/agent/prompts/repo/repo_map.md` must SUCCEED.
13. Move the carved clone into the the estate (former name) slot (replacing the
    stale copy — its unique 76bf2e1 is subsumed, see Source of truth).
14. Runtime: `npm install` at the repo root (`.opencode/node_modules`);
    the `.opencode/temp/` state files (compact_budget.json,
    lineage_max_depth) ride the clone — they are git-tracked now.
15. Config: the root `opencode.jsonc` inside the agent repo already
    points its `references` at home/Repos/Free-Snap-Tap
    (correct post-carve); the old workspace path is already commented
    out; keep the session-log allow-list entry (pin #28 / doc risk 4).

## After both sides land
- The old workspace keeps operating as the live opencode workspace —
  the Phase-2 physical move remains a separate between-sessions window
  with a committed handover (research doc §4 steps 5-8 unchanged).
- Per-project bookkeeping reorg (`projects/<name>/` folders — the
  2026-09-29 ruling, no submodules) = **TODO #117**, a separate unit
  (needs a spec pass; ideally inside/before the Phase-2 window).
- Gate verification: FST clone → pytest + ruff (venv); agent repo →
  the full standard gate (smokes + probe + pytest + ruff).
- From then on the two repos evolve independently (bookkeeping commits
  → agent repo, code commits → FST repo); nothing auto-syncs between
  them (by design).
