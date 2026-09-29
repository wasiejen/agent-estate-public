# TASK SPEC — #117 post-split reorg (planner-verified 2026-09-29, ses_f130ae200ffeDRuhAMKmw0N1qE)

Worker: `worker_Q3S_245K_slow`. Branch: stay on the current checkout (`opencode_test`, spec @ 0404efb).

## Goal
Move the five bookkeeping folders out of `.opencode/` to the repo root, leave only
opencode-native content in `.opencode/`, split the FST bookkeeping into
`projects/Free-Snap-Tap/`, update ALL active code/doc references in one pass, and
stage the two maintainer-file replacements. Final state: gate green, old paths
surviving only in historical records.

## Target layout (settled design — do not deviate)
- Root gains: `agent/` `archive/` `loop/` `maintainer/` `proposals/` `projects/Free-Snap-Tap/`
- `.opencode/` keeps ONLY: `node_modules/` `plugin/` `tools/` `temp/` `package.json`
  `package-lock.json` `.gitignore` `plugin.log`

## Units (ordered; ONE green checkpoint commit per verified unit; TODO + handover ride the FINAL commit)

**U1 — MOVE.** `git mv` each: `.opencode/agent`→`agent`, `.opencode/archive`→`archive`,
`.opencode/loop`→`loop`, `.opencode/maintainer`→`maintainer`, `.opencode/proposals`→`proposals`
(content-neutral renames, zero content edits). Verify: `git status --short` shows
R-status renames only; no root-name clash. NOTE: this spec file itself moves to
`agent/handover/handover_task.md` — fine, you hold the content.

**U2 — CODE** (planner-verified constant list; update constant AND description strings):
- `.opencode/tools/submit.ts` L74-77 `rel` paths → `agent/agent_feedback.md`,
  `agent/knowledge/knowledge_inbox.md`, `agent/agent_ideas.md` (+ description L82)
- `.opencode/tools/loop_log.ts` L150 `path.join(dir, ".opencode", "loop")` → `path.join(dir, "loop")` (+ description L118)
- `.opencode/plugin/auto_resume.ts` L665/L684/L1498 loop root → root `loop/`; message strings L824/L841 → `agent/prompts/agent_readme_post_compaction.md`, L899 → `agent/scripts/db/dump_session.cjs`
- `.opencode/plugin/ctx_watchdog.ts` L222 `HANDOVER_SPEC_PATH` → `agent/handover/handover_task.md` (the handover-detection string follows the constant)
- `.opencode/plugin/intercept_observer.ts` numwords map path (refs L155/L245 + code) → `agent/scripts/numword/numwords.json`
- `.opencode/plugin/compact_memory.ts` L115 `DUMP_ARCHIVE_REL` → `archive/sessions`; L201 dump script → `agent/scripts/db/dump_session.cjs` (+ description strings naming moved paths)
- Smokes that build a sandbox project tree mirroring the layout: `tests/{submit,loop_log,auto_resume,compact_memory,intercept_observer,block_transfer.sandbox}.smoke.mjs` — update fixture geometry where it mirrors moved folders.
- `tests/../probes/handover_probe.mjs`: re-pin any check that pins a moved path string (byte-exact pins).
Temp paths (`.opencode/temp/…`) do NOT move — leave them.

**U3 — DOCS (active files only — see DO-NOT-TOUCH).** Update `.opencode/{agent,loop,archive,maintainer,proposals}` references to the new root paths in:
- `agent/prompts/**` (role prompts, `agent_readme_*.md`, `roles/`, `skill/`, `repo/` parts, `memory/planner/destilled_mem.md`) — incl. the planner marker-sweep command line and the loop-folder paths in `agent_readme_loop.md`
- `agent/orientation.md`, `agent/knowledge/**` (area files + README), `agent/scripts/README.md` + `INVENTORY.md`
- `.opencode/plugin/*.md` + `.opencode/tools/*.md` (active docs)
- Root `TODO.md`: OPEN entries only (status open/landed/in-progress). Closed one-line records stay untouched.

**U4 — PER-PROJECT.** Build `projects/` (new root folder):
- `projects/README.md` (≤20 lines: per-project bookkeeping home; what goes here: a TODO trio + `repo/` doc set per project; what does NOT: the live loop/handover/NAP — those stay central at root/`agent/`).
- `projects/Free-Snap-Tap/README.md` (≤10 lines: same conventions for this project).
- `projects/Free-Snap-Tap/TODO.md`: the FST entries moved out of root `TODO.md`. Classify per entry (FST product behavior / FST code / FST env vs agent infra). First map the entries: `rg -n "^## " TODO.md | head -80`, then read only the ranges you move.
- `projects/Free-Snap-Tap/todo_records.md`: the CLOSED FST records moved out of root `todo_records.md` (2064 lines — map headers first: `rg -n "^## " todo_records.md | head -80`, read ranges only).
- `projects/Free-Snap-Tap/repo/`: the FST repo-doc parts out of `agent/prompts/repo/` (`repo_map.md`, `repo_testgate.md`, `repo_gotchas.md`, the FST half of `repo_commands.md`). Agent-repo parts stay in `agent/prompts/repo/`. Rewrite `agent/prompts/repo/repo_overview.md` for THIS repo (agent-repo map; parts index updated; pointer to the FST parts at `projects/Free-Snap-Tap/repo/`).
- Numbering stays GLOBAL: root `TODO.md` header keeps the counter (up to #118, start #119); add a one-line pointer in root `TODO.md`: "FST project entries: `projects/Free-Snap-Tap/TODO.md`"; add a header note in the project TODO: "IDs continue the global sequence — counter in root `TODO.md`".

**U5 — STAGE + VERIFY.**
- Stage full replacements at root (copy the live file, then edit the COPY — never re-emit): `opencode_reorg_2026-09-29.jsonc` (all `{file:.` pointers `.opencode/agent/…` → `agent/…`; worker/explorer permission paths `.opencode/agent/prompts/**` → `agent/prompts/**` and `.opencode/agent/handover/handover_planner.md` → `agent/handover/handover_planner.md`; the commented looprunner block's paths likewise; `destilled_mem` pointers) and `AGENTS_reorg_2026-09-29.md` (the ~7 path refs).
- Verification grep gate — old-path hits allowed ONLY in: `todo_records.md`, `todo_inbox.md`, `proposals/**`, `archive/**`, `agent/handover/specs/**` (finished specs), `agent/research/**`, `agent/handover/handover_planner.md` (archived lines):
  `rg --hidden -l -e "\.opencode/(agent|loop|archive|maintainer|proposals)"` → zero hits in `.opencode/plugin/*.ts`, `.opencode/tools/*.ts`, `.opencode/plugin/*.md`, `.opencode/tools/*.md`, `agent/prompts/**`, `agent/knowledge/**`, `agent/memory/**`, `agent/orientation.md`, `agent/scripts/{README,INVENTORY}.md`, `agent/handover/handover_task*.md`, and root `TODO.md` open entries.
- Run this repo's standard gate per `agent/prompts/repo/repo_commands.md` (probe + smoke suite; re-pins from U2) → green, numbers in the handover.

## DO-NOT-TOUCH
- `opencode.jsonc`, `AGENTS.md` (live files — staged copies only), everything under `maintainer/` except the U1 `git mv` (content-neutral; never edit his files' content).
- Historical records: `todo_records.md` body, curated `todo_inbox.md` notes, `proposals/**`, `archive/**`, finished specs (`agent/handover/specs/**`), `agent/research/**`, compaction dumps — no path rewrites in records.
- `agent/handover/handover_planner.md` (the NAP — planner-owned; the live edit-deny no longer covers the new path, the prompt rule still binds).
- `playground/`. No FST product code exists in this repo — do not run pytest; the gate is probe + smokes.
- No `git push`.

## Definition of done
1. Five folders at root (git R-rename history kept); `.opencode/` contains only the seven native entries.
2. Grep gate per U5: zero old-path hits outside the allow-list.
3. `projects/Free-Snap-Tap/` complete (README, TODO.md, todo_records.md, repo/); root `TODO.md` = agent entries + global counter + pointer line.
4. Both staged replacements at root, complete files, diff = path changes only.
5. Gate green (probe total = header tally + all smokes; measured numbers in the handover).
6. Checkpoint commits per unit; `TODO.md` (#117 status → LANDED, hash recorded in the planner's follow-up bookkeeping commit) + `handover_task_to_planner.md` in the final commit.
7. New TODO entries: none expected — but file any doc/code discrepancy you hit via `submit.todo` (never block on it).

## Context discipline
`TODO.md` (1015 lines) and `todo_records.md` (2064 lines): NEVER read whole — map entry
headers first, read only the ranges you move. All greps bounded (`| head -30`).
If interrupted after U1 before U2: the tree is half-moved (folders at root, code on old
paths) — resume = continue at U2; your U1 checkpoint + handover record the state.
