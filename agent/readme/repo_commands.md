# repo_commands.md — repo commands part of `repo_overview.md` (split 2026-09-11)

Sections moved verbatim from the former root file; the overview (`repo_overview.md`, this folder) is now a
thin index pointing at the parts. The FST project's commands (venv, pytest, ruff)
live in `projects/Free-Snap-Tap/repo/repo_commands.md` (#117 split).

## Environment & shell
The `bash` tool = **Git-Bash (bash 3.6, MINGW64)** — `opencode.jsonc` pins
`shell` = `C:/Program Files/Git/bin/bash.exe` (switched from pwsh 2026-09-15,
verified live in a direct session). Unix idioms work natively: `ls -la`,
`uname`, `grep x f`, `cat > f <<EOF`, GNU flags.
- **Invoke**: plain PATH commands (`git`, `node`); quote paths with spaces;
  chain `a && b` (respects status), `;` ignores status.
- **Paths**: `pwd` prints unix form (`/c/Users/...`) — fine INSIDE bash;
  file tools still want Windows form (`C:\Users\...`); the tool's `workdir`
  param accepts Windows paths and resolves them.
- **Vars**: `$v='x'`; `"$v"` interpolates; single quotes verbatim.
- **Output**: `NO_COLOR=1` stops most ANSI baking; prefer `-N`/scalar forms
  where a table would add noise.
- **Writes**: file tools only — no `>` / `cat >` except deliberate stdin
  piping.
- **Host tooling caveat (TODO #74, 2026-09-21):** tool calls can fail with
  server-side JSON parse errors (`JSON parsing failed: Text: {.` /
  `Expected '}'`) — payload length is NOT a reliable predictor (short args
  have failed too); it is host-side, not our intercept. On a hit: retry once;
  if it persists, create the content via a bash heredoc (deliberate stdin
  piping) + small edit-append batches (covers ALL roles, incl. planner spec
  authoring).
- **Timeout**: tool default 120s — pass `timeout` (ms) for heavy ops.
- **Temp**: git-bash `$TMP` = the user Windows temp dir (unix form) — the
  pre-approved scratchpad for work outside the repo is `$TMP/opencode`
  (= `home/AppData/Local/Temp/opencode`).
- **pwsh** 7.6 is still on PATH (`pwsh`) if ever needed — its old guidance
  (cmdlets, here-strings, `&` invocation) no longer applies to the default
  shell.

## Run / test
- Gate probe: `node .opencode/plugin/probes/handover_probe.mjs` (repo root; plain
  system `node`, no venv; one `MODULE_TYPELESS_PACKAGE_JSON` warning on stderr is
  expected and harmless — `.opencode/package.json` must NOT gain a "type" field,
  TODO #51). **The "standard gate" in THIS repo = this probe + the smoke suite**
  (no pytest — no FST product code in this repo, #117; the FST gate = pytest +
  ruff, see `agent/readme/repo_commands.md`). The probe
  self-annotates its total: the output line `PROBE handover: <t>/<t> PASS` must
  agree with the header annotation (the section-sum line) — the annotation is
   the source; NO duplicated moving number lives here (curate-don't-duplicate,
   per #58/#64; refreshed 2026-09-17, planner-allowed per maintainer ruling for
   #71).
- Smoke suite commands: v1 = from the repo root, `node .opencode/plugin/tests/<f>.smoke.mjs`
  (12 files; final line `<n>/<n>` or `SMOKE: ALL PASS`). v2 = from `.opencode/plugins/tests`,
  `bun run <f>.smoke.mjs` (final line `SMOKE: ALL PASS`) + typecheck
  `home/Repos/opencode/node_modules/.bin/tsgo.exe -p .opencode/plugins/tests/tsconfig.json`
  (repo root; exit 0, no output). The node-dir trio gauge_core/context_trim/auto_resume
  can hit the Windows teardown `fs.rmSync` EBUSY flake (0 FAIL) — green on re-run.

## Marker sweep

The ready-made marker sweep (the planner prompt §Maintainer markers uses
this — do not recreate the pattern). The same command is embedded verbatim
in `.opencode/tools/state_snapshot.ts` (`MARKER_SWEEP`):

```bash
grep -rn --include="*.md" -e "--main\|--now\|--info\|--todo\|--defer\|--wip\|--comment" \
  .opencode/ agent/ maintainer/ loop/ proposals/ TODO.md README.md WIKI.md 2>/dev/null \
  | grep -v "_past_priorities\|/done/\|agent_feedback\|nap_direct\|archive/"
```

`--main` also matches `--maintainer`, and `--defer` also matches
`--deferred` (deliberate substring behavior). `2>/dev/null` keeps missing
target files from poisoning the output.

The digest's `## markers` section (`state_snapshot.ts`) re-orders this sweep's
OUTPUT only: LIVE-CLASS paths first (`maintainer/`, `.opencode/`, TODO.md/README.md/WIKI.md), then DOC-CLASS, each group sorted by the line string. The ready-made command above is unchanged.

## Handover file paths
Channel semantics (who writes/reads, canonicality) live in the `AGENTS.md`
interaction-contract table — this section keeps only the concrete repo facts:
- The plan-state file `agent/handover/handover_planner.md` is what the
  maintainer calls the **NAP** (**N**ext **A**gent **P**rompt) — "NAP"/"write a
  NAP" means this file. Phase close moves it to
  `archive/<YYYY-MM-DD>-<slug>.md` with a STATUS header. All handover
  files live in `agent/handover/`.
- Context gauge (self-gauge): prefer the `ctx_gauge` tool when it is in your
  toolset (same readout, in-band — no shell-out); the command below is the
  fallback (the tool is registered host-side and takes effect at the
  maintainer's next process restart): run
  `node .opencode/plugin/scripts/peek.mjs` from the repo root, read-only →
  `SESSION=… CTX=n (p%) REM=m` (window unknown → `CTX=n` only; no finished
  step → `CTX=notAvailable`).
  **Margin rule (maintainer 2026-09-14):** the readout UNDER-reports actual
  usage (a compaction fired at a 95 % nudge landed at 119.6 K of the ~120 K
  window) — add a 5 % margin to the gauge/nudge numbers when making budget
  decisions. A first-ever gauge in a FRESH session can return
  `CTX=notAvailable` (no finished step yet) — the next call reads fine.
- Durable maintainer TODOs: `TODO.md`.
