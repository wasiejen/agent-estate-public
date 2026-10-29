# Public extract — how the public face is produced

Status: procedure, awaiting the maintainer's go. Decided parts: repo renamed
`agent-estate` on origin (2026-10-29); MIT license (`LICENSE`).

## Why not "hide part of the repo"
Git has no hidden content. Everything ever committed is readable to anyone
with repo access — `.gitignore` only prevents NEW tracking, it does not hide
committed history. Private content in this estate: `maintainer/**`,
`loop/**` logs, `TODO.md` / `todo_inbox.md`, `agent/knowledge/**` +
`agent/memory/**` (personal run history), `agent/handover/**`, plus LAN
backend addresses (`local-inference-host…` in 263 files) and the operator's Windows
username/path (`operator` in 134 files).

## The two viable shapes
1. **Filtered sibling repo (RECOMMENDED).** A second repo built FROM this
   one, history filtered so private paths and personal strings never exist
   in it. Keeps the commit-history story (~1,800 commits, 2026-09-06→).
   One-way flow: estate → public, never merged back. The private estate stays
   the working repo.
2. **Fresh single-commit public repo.** Simplest, zero leakage risk, but the
   history signal is lost. Use only if filtering proves messy.

## Procedure (shape 1)
`git filter-repo` is NOT installed here (no python module, no git subcommand).
Two routes:
- A. Maintainer installs it once: `pip install git-filter-repo` (or download
  the single script into PATH). Then agents run the filter.
- B. Built-in `git filter-branch` (deprecated, slower, works without install).

Steps (route A):
1. `git clone` the estate into a scratch dir (never filter the live repo).
2. Strip private paths:
   `git filter-repo --invert-paths --path maintainer --path loop --path TODO.md --path todo_inbox.md --path agent/knowledge --path agent/memory --path agent/handover --path agent/research --path .opencode/temp --path projects --path-force`
3. Rewrite personal strings across the kept history:
   `git filter-repo --use-result-message-prefix... ` + a callback replacing
   `operator` → `operator`, `home\...` → repo-relative paths,
   `local-inference-host` → `local-inference-host`.
4. Add the public face: rewrite `README.md` (purpose-first, measured numbers)
   and move the technical text to `docs/architecture.md` (see split below).
5. Verify the extract: `grep -r "operator\|192\.168\|agent-estate" .`
   must be empty; `git log --oneline | wc -l` reported in the README.
6. Push to the public remote (maintainer pushes; agents do not).

## Public / private split (content ownership)
- Public `README.md`: purpose first — problem, what it does, numbers, ASCII
  flow diagram, engineering decisions (context survival, commit-as-state),
  tools table, quickstart stub, disclaimer, ONE pointer to `docs/`.
- Public `docs/architecture.md`: the current technical README text, with
  internal references removed (no `TODO #N`, no `proposals/…`, no line
  numbers, no `.opencode/temp/*.log`).
- `agent/readme/repo_overview.md` stays AGENT-facing (read-first map). It
  does NOT receive the public text.
- Private only: everything else (protocol inboxes, NAP, loop logs, TODO,
  knowledge/memory lanes, maintainer files).

## Numbers available for the public README (measured 2026-10-29)
- Iterations 38, rounds 56 (`loop/autorun-2026-10-01_03-27/counter.json`).
- Commits 1,819; history 2026-09-06 → 2026-10-29.
- 11 plugins, 7 custom tools, 11 smoke suites, 115-check handover probe.
- One trim call freed 65,700 tokens; cold re-prefill 216,703 input tokens vs
  92-498 warm; wall guard: zero provider rejections since activation.
- Honest gaps (state, do not fabricate): no edit success-rate metric, no
  latency benchmark, no A/B trial run yet.

## Open items for the maintainer
1. Install `git-filter-repo` (route A) or approve route B.
2. DONE 2026-10-29 (maintainer): folder renamed `Repos/the estate (former name)` →
   `Repos/agent-estate`, session DB repointed via `repath_sessions.sh`
   (82 sessions rebound; WAL caveat: SQLite leaves a non-empty WAL after a
   clean exit on this host — the script guard now keys on the `-shm` file).
   Text sweep agent-side (same day): 88 tracked files, `the estate (former name)` →
   `agent-estate`; archive/history mentions kept intentionally.
3. Create the PUBLIC remote (the private estate keeps `agent-estate.git`);
   the filtered sibling pushes there.
