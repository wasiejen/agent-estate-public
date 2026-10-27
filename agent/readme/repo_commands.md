# repo_commands.md — repo commands part of `repo_overview.md` (split 2026-09-11)

Sections moved verbatim from the former root file. The overview in this folder, `repo_overview.md`,
is now a thin index pointing at the parts. The FST project keeps its commands
(venv, pytest, ruff) in `projects/Free-Snap-Tap/repo/repo_commands.md`, split per #117.

## Environment & shell
The `bash` tool is **Git-Bash (bash 3.6, MINGW64)**. `opencode.jsonc` pins
`shell` to `C:/Program Files/Git/bin/bash.exe`. The switch from pwsh landed
2026-09-15, verified live in a direct session. Unix idioms work natively:
`ls -la`, `uname`, `grep x f`, `cat > f <<EOF`, GNU flags.
- **Invoke**: run plain PATH commands (`git`, `node`). Quote paths with spaces.
  Chain with `a && b` to respect status; `;` ignores status.
- **Paths**: `pwd` prints unix form (`/c/Users/...`), fine inside bash.
  File tools want Windows form (`C:\Users\...`). The tool's `workdir`
  param accepts Windows paths and resolves them.
- **Vars**: set a var with `$v='x'`. `"$v"` interpolates; single quotes stay
  verbatim.
- **Output**: `NO_COLOR=1` stops most ANSI baking. Prefer `-N` or scalar forms
  where a table would add noise.
- **Writes**: write files with the file tools only. Use `>` or `cat >` only for
  deliberate stdin piping.
- **Host tooling caveat (TODO #74, 2026-09-21):** tool calls can fail with
  server-side JSON parse errors (`JSON parsing failed: Text: {.` /
  `Expected '}'`). Payload length is NOT a reliable predictor; short args
  failed too. The fault is host-side, not our intercept. On a hit, retry
  once. If it persists, create the content via a bash heredoc — deliberate
  stdin piping — plus small edit-append batches. This covers ALL roles,
  incl. planner spec authoring.
- **Timeout**: the tool default is 120s. Pass `timeout` in ms for heavy ops.
- **Temp**: git-bash `$TMP` is the user Windows temp dir in unix form. Work
  outside the repo goes in the pre-approved scratchpad `$TMP/opencode`
  (`home/AppData/Local/Temp/opencode`).
- **pwsh** 7.6 stays on PATH (`pwsh`) if ever needed. Its old guidance —
  cmdlets, here-strings, `&` invocation — no longer applies to the default
  shell.

## Run / test
- Gate probe: run `node .opencode/plugins/probes/handover_probe.mjs` from the repo
  root. Use plain system `node`; no venv. One `MODULE_TYPELESS_PACKAGE_JSON`
  warning on stderr is expected and harmless. `.opencode/package.json` must NOT
  gain a "type" field (TODO #51).
- **The "standard gate" in THIS repo = this probe + the smoke suite.** No pytest:
  this repo has no FST product code (#117). The FST gate is pytest + ruff — see
  `projects/Free-Snap-Tap/repo/repo_commands.md`.
- The probe self-annotates its total: the output line `PROBE handover: <t>/<t> PASS`
  must agree with the header annotation, the section-sum line. The annotation is
  the source. NO duplicated moving number lives here (curate-don't-duplicate,
  per #58/#64; refreshed 2026-09-17, planner-allowed per maintainer ruling for
  #71).
- Smoke suite: run a v1 file from the repo root with
  `node .opencode/plugins/tests/v1/<f>.smoke.mjs` (8 files; final line `<n>/<n>`
  or `SMOKE: ALL PASS`). Run a v2 file from `.opencode/plugins/tests` with
  `bun run <f>.smoke.mjs` (11 files + the composite `smoke.mjs`; final line
  `SMOKE: ALL PASS`). Typecheck from the repo root with
  `home/Repos/opencode/node_modules/.bin/tsgo.exe -p .opencode/plugins/tests/tsconfig.json`
  (exit 0, no output). The node-dir trio gauge_core/context_trim/auto_resume
  uses the `rmTearSoft` retry teardown (#160, worker-36). Both node and bun
  runners are deterministic; the old `fs.rmSync` EBUSY re-run tax is gone.
- Line endings (planner-direct, 2026-10-27): there is NO `check_line_endings.mjs`
  in this repo — the working check is this CR count, which must print 0:
  `node -e 'for (const f of process.argv.slice(1)) console.log(f, (require("fs").readFileSync(f,"utf8").match(/\r/g)||[]).length)' <files>`.
  The tracked docs are LF; a broad `git add -A` can rewrite them to CRLF (measured
  2026-10-27: 297 `TODO.md` lines flipped). Commit named paths only.

## Marker sweep

The planner prompt §Maintainer markers uses this ready-made sweep — do not
recreate the pattern. `.opencode/tools/state_snapshot.ts` embeds the same
command verbatim (`MARKER_SWEEP`):

```bash
grep -rn --include="*.md" -e "--main\|--now\|--info\|--todo\|--defer\|--wip\|--comment" \
  .opencode/ agent/ maintainer/ loop/ proposals/ TODO.md README.md WIKI.md 2>/dev/null \
  | grep -v "_past_priorities\|/done/\|agent_feedback\|nap_direct\|archive/\|^agent/prompts/\|^agent/readme/\|^agent/knowledge/\|^agent/memory/\|^agent/research/\|^agent/scripts/\|^agent/handover/\|^loop/\|^proposals/implemented/\|^proposals/superseded/\|^\.opencode/\|^maintainer/feedback/"
```

`--main` also matches `--maintainer`; `--defer` also matches `--deferred`.
Both substring matches are deliberate. `2>/dev/null` keeps missing target
files from poisoning the output.

The digest's `## markers` section (`state_snapshot.ts`) re-orders this sweep's
OUTPUT only. LIVE-CLASS paths come first (`maintainer/`, `.opencode/`,
TODO.md/README.md/WIKI.md), then DOC-CLASS; each group sorts by the line
string. The ready-made command above stays unchanged.

## Handover file paths
Channel semantics — who writes, who reads, canonicality — live in the
`AGENTS.md` interaction-contract table. This section keeps only the concrete
repo facts:
- The plan-state file `agent/handover/handover_planner.md` is what the
  maintainer calls the **NAP** (**N**ext **A**gent **P**rompt). "NAP" and
  "write a NAP" mean this file. Phase close moves it to
  `archive/<YYYY-MM-DD>-<slug>.md` with a STATUS header. All handover files
  live in `agent/handover/`.
- Context gauge (self-gauge): prefer the `ctx_gauge` tool when your toolset
  has it — same readout, in band, no shell-out. The command below is the
  fallback; the tool is registered host-side and takes effect at the
  maintainer's next process restart. On every 5th round the tool line gains
  ` ROUND=<n> MAINT=1` (#171) — run the maintenance pass as the first unit
  then; other rounds add nothing. The peek fallback: run
  `node .opencode/plugins/scripts/peek.mjs` from the repo root; the read is
  read-only and prints `SESSION=… CTX=n (p%) REM=m`. An unknown window
  yields `CTX=n` only; a session with no finished step yields
  `CTX=notAvailable`.
  **Margin rule (maintainer 2026-09-14):** the readout UNDER-reports actual
  usage. A compaction fired at a 95 % nudge landed at 119.6 K of the ~120 K
  window. Add a 5 % margin to the gauge and nudge numbers when making budget
  decisions. A first-ever gauge in a FRESH session can return
  `CTX=notAvailable` — no finished step yet; the next call reads fine.
- Durable maintainer TODOs: `TODO.md`.
- Session DB forensics (v2 store): `node agent/scripts/db/dump_session_v2.mjs <sid> --lite`
  reads `session_message` (the live v2 shape). `sesinspect.cjs` and `sesdata.cjs` still read the
  frozen v1 `message` table — do not use them for v2 state. Per-step request sizes come from
  `context_trim mode:'report'` (`req-at=` per row), not from an invented DB query path.
