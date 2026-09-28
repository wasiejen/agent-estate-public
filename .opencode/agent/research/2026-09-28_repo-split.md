# repo-split research — FST product vs. opencode/agent part (2026-09-28)

explorer-33, plan32 unit 3 — RESEARCH ONLY (no code, no config, no moves).
Contract: `.opencode/maintainer/priority.md:40-49` (section `# repo split research/proposal`,
incl. his idle-lane "each research should be at least a single run").

## 1. Inventory
Tracked total: 808 files (`git ls-files | wc -l`); 739 under `.opencode/`, 69 at the root
(`git ls-files -- . ':(exclude).opencode' | wc -l`).
- `.opencode/` breakdown (`git ls-files .opencode | cut -d/ -f2 | sort | uniq -c`):
  agent 114, archive 339, loop 103, maintainer 87, plugin 36, proposals 46, tools 13, `.gitignore` 1.
- Root, (a) **FST product**: 8 `.py` (free_snap_tap, fst_data_types, fst_keyboard,
  fst_manager, fst_overlay, fst_save_file_handler, fst_tasks, vk_codes), `tests/` (26),
  `icons/` (5 — tracked despite `/icons` in `.gitignore:1`; ignore does not untrack),
  `playground/` (5), `built_nuitka.bat`, `built_pyinstaller.bat`, `example_batch_file.bat`
  (`test_batch.bat` untracked, `.gitignore:12`), `requirements*.txt` (3), `pytest.ini`,
  `.github/workflows/ci.yml` (windows-latest: checkout → requirements.txt/-dev.txt → tests;
  `tests/conftest.py` pins QT offscreen per the CI header), `FSTconfig.txt`,
  `README.md`, `WIKI.md`, `SPEC_FEATURES.md`, `LICENCE`, `.gitattributes`, root `.gitignore`.
- Root, (b) **agent side**: `opencode.jsonc` (opencode workspace config: providers/agents/
  permissions — zero product use), `AGENTS.md`, `TODO.md`, `todo_inbox.md`, `todo_records.md`,
  `SCRATCH_PAD.md`, `export-planner-session-*.md` / `export-worker*-session-*.md` (3).
- Untracked agent runtime (`.opencode/.gitignore`): `node_modules`, `package.json`,
  `package-lock.json`, `bun.lock`, `plugin.log`, `temp/`; root ignores (root `.gitignore`):
  `.venv/`, `__pycache__/`, `fst.log`, `coverage*`, `.pytest_cache/`, `*.exe`/`*.dll`/build dirs.
- Machine state OUTSIDE the repo: session DB `home/.local/share/opencode/opencode.db`
  (~1.9 GB — `agent/scripts/db/README.md` header), log `…/opencode/log/`, opencode CLI npm
  install `home/AppData/Roaming/npm` (`.opencode/agent/prompts/repo/repo_opencode.md:8`),
  scratchpad `home/AppData/Local/Temp/opencode`.
- Discrepancy vs the task spec: the spec's fact-source list says root `package.json` — there is
  NO root package.json (`ls -aF`); the only one is `.opencode/package.json` and it is git-ignored
  (`.opencode/.gitignore`).

## 2. Reference map — where the single-repo layout is pinned
S = same-folder pin (workspace-root-relative — binds the agent part to its `.opencode/` and to
the opencode workspace root); A = absolute pin (breaks on a physical move; machine-level A
pins survive any repo change).

| # | pin | file:locator | kind / assumption |
|---|-----|--------------|-------------------|
| 1 | opencode workspace config at the repo root | root `opencode.jsonc:1-492` (agent `{file:./.opencode/agent/prompts/…}` refs :347-488) | S — workspace root must contain `.opencode/` |
| 2 | external-directory allow-list | `opencode.jsonc:26` | A — hardcodes `home/Projects/OpenCodeProjects/Free-Snap-Tap/Free-Snap-Tap`; breaks on move |
| 3 | scratchpad reference | `opencode.jsonc:35-39` | A machine (survives); the `references` mechanism — reusable cross-link |
| 4 | SCRATCHPAD_ROOT constant | `plugin/intercept_observer_core.ts:507` | A machine — `home/AppData/Local/Temp/opencode`, hardcoded |
| 5 | repo-root derivation | `plugin/compaction_core.ts:241-242`; `tools/loop_log.ts:149`; `tools/submit.ts:103`; `tools/block_transfer.ts:345` | S — `context.directory ?? process.cwd()` = opencode workspace root; no code hardcodes the repo's absolute root |
| 6 | loop folder | `tools/loop_log.ts:42` + `tools/loop_log.md:14` | S — `.opencode/loop/` against #5 |
| 7 | inbox/handover targets | `tools/submit.ts:22` | S — `.opencode/agent/…` against #5 |
| 8 | session DB | `plugin/scripts/gauge.mjs:157` | A machine, outside the repo (survives) — `~/.local/share/opencode/opencode.db` |
| 9 | script host defaults | `agent/scripts/db/README.md` (env `OPENCODE_DB` > host default), `agent/scripts/log/README.md` (env `OPENCODE_LOG` > `home/.local/share/opencode/log/opencode.log`), `agent/scripts/binary/binhits.cjs:12` (+ README, env `OPENCODE_EXE` > npm path) | A machine, env-overridable |
| 10 | dump OUT_DIR | `agent/scripts/db/dump_session.cjs:43` | S internal geometry — `path.resolve(__dirname, "../","..","..","archive","sessions")` |
| 11 | smoke-test geometry | `plugin/tests/compact_memory.smoke.mjs:43` (`__dirname` → `archive/sessions`); `agent/scripts/log/tests/summarize_intercept.smoke.cjs:18` (ROOT = 5 `..`) | S internal geometry |
| 12 | probe gate | `plugin/probes/handover_probe.mjs` — self-annotating header (section check ranges, last annotated check 345, see header lines 1-85); imports plugin/tool files directly, type-stripped; drives tools with `context.directory` sandboxes (:3625, :4023, :5780, :7159) | S — layout-agnostic but needs the `.opencode/plugin`+`tools` tree co-located |
| 13 | product test/CI config | root `pytest.ini` (`testpaths = tests`); `.github/workflows/ci.yml` | S product — root-relative, no cross-repo pin |
| 14 | ignores | root `.gitignore` (product-only, no `.opencode` entries) + `.opencode/.gitignore` (agent runtime) | split cleanly, one per repo |
| 15 | ruff | NO config file at the root (no `pyproject.toml`/`ruff.toml`/`.ruff.toml`/`setup.cfg` — verified by `ls`) | ruff defaults; product side, nothing pinned |
| 16 | docs naming the layout | `.opencode/agent/prompts/repo/repo_commands.md:36` (scratchpad path); `repo_opencode.md:8` (npm path); `AGENTS.md` → `repo_overview.md` (relative pointer) | doc pins — update with the move |

Takeaway: the code pins the layout, not the location — everything repo-relative resolves from
`context.directory` (the opencode workspace root), so the agent part may live in ANY folder as
long as that folder is the opencode workspace root and contains `.opencode/` with the same
internal geometry (#10-12). The only repo-root ABSOLUTE pin in the whole agent part is
`opencode.jsonc:26` (#2).

## 3. Options
### A. Sibling repos (the maintainer's sketch)
`Projects\Repos\Free-Snap-Tap` (product only) + `Projects\Repos\Opencode|Free-Snap-Tap`
(agent part = §1(b) root files + `.opencode/**`).
- Cross-link: the only real cross-repo need is "where the FST product lives" (pin #2 + docs
  #16). Recommendation among candidates: an EXPLICIT DIRECTORY VARIABLE — a `references`
  entry in the agent repo's `opencode.jsonc` (native opencode feature, already used for the
  scratchpad, #3), e.g. `references: { fst: { path: "home/Projects/Repos/Free-Snap-Tap" } }`
  plus the `external_directory` allow for it; env vars follow the established
  `OPENCODE_DB/LOG/EXE` pattern. No agent code needs the FST path — nothing in
  `.opencode/plugin/**` or `.opencode/tools/**` reads product files.
- History: fresh init for both (agent history's content lives on in the
  `.opencode/archive/**` corpus + session dumps); OPTIONALLY `git filter-repo --invert-paths`
  on a clone for the FST repo to preserve product history (multi-theme commits touching both
  parts keep a copy in both repos — filter-repo retains commits touching remaining paths).
  Tradeoff: rewrite + verification cost for product-history value.
- Pros: clean FST (the stated goal), both repos independently trackable, no submodule
  ceremony, opencode's workspace model unchanged (workspace root = agent-repo root, `.opencode/`
  at its root → pins #1/#5/#6/#7 survive as-is).
- Cons: two clones/two remotes to manage; FST GitHub continuity only via the maintainer's
  GitHub-copy step.
### B. Submodule / subtree
Agent part as a submodule inside the FST repo (or vice versa).
- If the agent part is a submodule AT THE FST REPO ROOT, `.opencode/` still sits at the
  workspace root — the geometry holds. But then every agent-side edit needs an inner commit +
  a submodule-pointer bump in the FST repo — continuous two-repo ceremony IN THE LIVE LOOP;
  cloning FST does not carry the agent content; FST's status/diffs are polluted by the pointer.
- Subtree copies rather than tracks (no independent tracking; divergence to re-merge).
- Verdict: buys nothing Option A does not already give, at higher per-commit cost.
### C. Status quo + git worktrees/sparse
No split: one history, one remote, the .gitignore interplay unchanged. Worktrees buy branch
convenience; sparse-checkout buys checkout size — NEITHER buys independence between the two
parts (the FST repo would still contain `.opencode/**`, AGENTS.md, the agent TODO files).
Cannot meet the goal; stopgap at best.

## 4. Recommendation + migration steps
Chosen: **Option A, DEFERRED-MOVE variant** (git-level split first, physical move later —
his explicit allowance).
- Phase 0 — prep (agent, no observable change): this doc + the exact file lists (§1) + a
  prepared extraction script and pin-diff, unexecuted. Baseline: branch `opencode_test` @
  b9e75cf, 36 ahead of `origin` (`git branch -v`).
- Phase 1 — git-level split, OLD LOCATION UNTOUCHED:
  1. create `Projects\Repos\Free-Snap-Tap` — copy of product files only (§1a), fresh init
     (or filter-repo variant — maintainer call);
  2. create `Projects\Repos\Opencode|Free-Snap-Tap` — copy of agent files (§1b + `.opencode/**`),
     fresh init, IDENTICAL internal geometry (pins #10-12 unchanged);
  3. in the agent repo: `opencode.jsonc` — point the `external_directory` entry (pin #2) + a
     `references.fst` entry at the FST repo; update docs (#16). Nothing in
     `plugin/**`/`tools/**` code changes (#2 takeaway).
  4. the old folder keeps operating as the live opencode workspace — the live loop, session
     DB (#8) and scratchpad (#3/#4) all untouched; both new repos sit inert.
- Phase 2 — physical move (maintainer, deferred, between sessions):
  5. open opencode from `Projects\Repos\Opencode|Free-Snap-Tap` (the agent repo becomes the
     workspace root); the live loop must be idle — sessions hold `context.directory` to the
     old root (#5);
  6. move/replace the old FST product files into `Projects\Repos\Free-Snap-Tap`; point that
     repo's origin at the maintainer's GitHub copy;
  7. rebuild untracked runtime state at the new locations: `.venv`, `.opencode/node_modules`
     (npm install), caches (§1 untracked list) — a naive copy loses them;
  8. final pin sweep per §2: update #2 (absolute path) + #16 (docs); #4/#8-9 are machine-level
     (unchanged); #10-12 are internal geometry (unchanged).
- In between phases: the live loop keeps working (old workspace untouched), the session DB +
  scratchpad live outside both repos, the probe gate (#12) is self-contained in its tree,
  both new repos are read-only inert.
- Reference-update list (from §2): `opencode.jsonc:26` (+ new `references.fst` entry),
  `.opencode/agent/prompts/repo/repo_commands.md:36`, `repo_opencode.md:8`, and any layout
  wording in `AGENTS.md`/`repo_overview.md` if the move happens.
- Risk list: (1) the LIVE LOOP — a mid-flight session's `context.directory` still points at the
  old root; the move must land between sessions with a committed handover; (2) the ROOT
  `opencode.jsonc` — the opencode workspace config must travel with the agent part (leaving it
  in the FST repo breaks "clean FST", and opencode auto-discovers `opencode.jsonc` at the
  workspace root); (3) GIT-IGNORED RUNTIME STATE — `.venv`, `.opencode/node_modules`, `temp/`,
  caches are untracked → lost on a naive copy, rebuild needed; (4) the SESSION DB PATH —
  outside the repo (safe), but the `external_directory` allow-list must keep
  `home/.local/share/opencode/log` (`opencode.jsonc:28`) or log access is denied;
  (5) the SCRATCHPAD PATH — machine-level (`intercept_observer_core.ts:507`, #4) — unchanged,
  but any `/tmp`-form redirection assumes it; (6) the GITHUB-REMOTE STEP — FST origin is
  currently `wasiejen/Free-Snap-Tap` (`git remote -v`); the new FST repo only gets the GitHub
  copy when the maintainer creates it, and the agent repo stays local-only until he decides.

## 5. Effort + approval boundary
- Phase 0: small (~this doc + file lists + prepared script/diff). PRE-APPROVED agent-usage
  class — research/prep, no observable change.
- Phase 1: small–medium — copying ~740 agent + ~60 product files, 2 fresh inits, ~5-10 pin edits
  (`opencode.jsonc` + 2 repo docs); wall-time tens of minutes. Creating new repos on the
  maintainer's machine is OBSERVABLE → MAINTAINER'S DOMAIN; the agent may prepare the exact
  script + diff, execution is his call.
- Phase 2: medium — live-loop window, venv/node_modules rebuild, remote re-pointing;
  entirely the MAINTAINER'S DOMAIN (physical move, GitHub copy/remote, live-machine state).
- Optional filter-repo history preservation: medium (history rewrite + verification) — only
  if the maintainer wants product history in the new FST repo.
- Pre-approved without a maintainer call: research, doc updates, prepared-but-unexecuted
  pin diffs. Everything that moves files, creates repos, or touches live sessions: maintainer.
