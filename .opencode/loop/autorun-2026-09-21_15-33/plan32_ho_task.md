# Task spec — plan32 (unit 1): TODO #110 + #112 — the plugin-docs batch (per-plugin READMEs + the auto-resume explainer)

Worker: `worker_Q3S_245K_slow`.

Docs-only task, TWO deliverables, pre-approved (no behavior change). No code,
no test, no probe work. Checkpoint commits per verified unit (A, B);
`TODO.md` + your handover ride the FINAL commit.

## Goal A — TODO #110: one README per our plugin/tool, next to its source

Naming: `<source-stem>.md` in the SAME folder as the source file. Nine files:

| README | covers |
|---|---|
| `.opencode/plugin/auto_resume.md` | auto_resume.ts (units 1-4: nudge suffix, spawn, watchdog, scope toggle) |
| `.opencode/plugin/compact_memory.md` | compact_memory.ts + the shared compaction_core.ts (what the core is, who imports it) |
| `.opencode/plugin/context_recovery.md` | context_recovery.ts (the event-hook backstop, its flag in compact_budget.json) |
| `.opencode/plugin/intercept_observer.md` | intercept_observer.ts + intercept_observer_core.ts (channels: observe/pair/R1-R2, edit-fuzzy R6, R3 arg-scope, R8 redirect, journal — one line each, pointer-only) |
| `.opencode/plugin/ctx_watchdog.md` | the gauge/ctx-nudge family: ctx_watchdog.ts + `.opencode/plugin/scripts/gauge.mjs` (+ peek.mjs one-liner) |
| `.opencode/tools/block_transfer.md` | block_transfer.ts (11 modes, anchor semantics — one line + pointer to the knowledge note) |
| `.opencode/tools/loop_log.md` | loop_log.ts (the 8-char status tokens, the auto-fill slots) |
| `.opencode/tools/submit.md` | submit.ts (the 4 inbox channels, stamping) |
| `.opencode/tools/ctx_gauge.md` | ctx_gauge.ts (the readout format, the lag semantics per #103, the budget suffix per #114) |

Each README ≤ ~60 lines, this shape:
1. **What it does** — 1-2 short paragraphs.
2. **Implementation sketch** — the hook surface / entry points + key files
   (pointer-only; line ranges are optional and go stale — prefer names).
3. **Gotchas / lessons** — the important ones, each ONE line pointing at the
   knowledge entry / TODO / loop summary it came from (no restating).
4. **Tests** — one line: the smoke file name(s) + the probe section if any.

Minor tools (`session_info.ts`, `dev_get_tool_context_contents.ts`): NO own
README — add a one-line pointer each in the `.opencode/tools/README.md` index
("minor host-bridge tool, see its header").

Index: `.opencode/plugin/README.md` + `.opencode/tools/README.md` each gain a
short "Per-file docs:" line-list naming the new READMEs (existing content
untouched, insert cleanly).

## Goal B — TODO #112: the auto-resume explainer (knowledge entry)

One NEW dated file:
`.opencode/agent/knowledge/opencode-plugins/2026-09-28_auto-resume-units-explainer.md`
(≤ ~80 lines) — "what our auto_resume plugin does, unit by unit, in one
page":
- unit 1 (skeleton/logging) — what it does, triggers, log lines
- unit 2 (context-limit nudge — the PASSIVE ctx-line suffix; what the
  threshold gates, the Direct suppression)
- unit 3 (new-planner spawn helper — trigger file, naming/ident, deactivation)
- unit 4 (liveness watchdog — restart→spawn branch, recovery-continue,
  compaction re-arm per #98, lineage cap, scope toggle)
Each unit: what it does / what triggers it / the log lines it emits
(`arm=`/`route=`/`spawn=`/`recovery=`/`skip=`/`deactivate=` — name the real
ones from the code). Pointer-only to the deep-dives (
`knowledge/opencode-plugins/auto-resume-deepdive-A/B/C.md`, host-map.md) +
the unit-1 surface report for detail — no restating. The folder README
convention: dated file + its name appears nowhere else (the knowledge folder
is flat-indexed — no README change needed unless the folder README lists
files; check `.opencode/agent/knowledge/opencode-plugins/README.md` and add
the one line only if it is a file list).
NOTE for your handover: the compaction-handout inclusion is the MAINTAINER's
paste (his draft file) — NOT your task.

## Fact sources (bounded reads — do not read whole files)
- Each source file's HEADER block (the first ~40-60 lines carry the usage
  note / channel list / verdict vocabulary) — headers are the contract.
- `.opencode/plugin/README.md` + `.opencode/tools/README.md` (short, read both).
- `.opencode/agent/knowledge/knowledge_plugins.md` — the gotcha source; grep
  by plugin name (`auto_resume`, `intercept`, `compact`, `gauge`, `block_transfer`),
  bounded (`| head -30`).
- The smoke/probe file NAMES for the Tests line: `ls .opencode/plugin/tests/`
  (names only — no read).
- TODO #110 + #112 entries in `TODO.md` (the contract text).
- For Goal B: `auto_resume.ts` headers + grep the log-line tokens
  (`route=`, `spawn=`, `recovery=`, `skip=`, `deactivate=`, `arm=`, `scope=`)
  with bounded output to name the real lines.

## Definition of done
- 9 A-READMEs + 1 B-entry exist; each A-README ≤ 60 lines, B ≤ 80 lines
  (`wc -l` — report the counts).
- Hook-surface spot check, REPORTED in your handover as a table: per README,
  the hook/entry-point string(s) you named + the `grep -c` count in its source
  file (e.g. `tool.execute.before` in intercept_observer.ts). Zero-count claim
  = wrong claim — fix the README, not the count.
- Both folder READMEs carry the index lines; the tools README carries the two
  minor-tool one-liners.
- `git status` shows ONLY: the 9 A-READMEs, the 2 folder READMEs, the B-entry
  (+ the knowledge folder README if it needed a line), TODO.md, your handover.
  NO .ts/.mjs/.py/.jsonc file changed.
- TODO #110 + #112 status → `LANDED` (hash recorded in the planner's
  follow-up bookkeeping commit) + your handover in the FINAL commit.
- If a README claim contradicts the code (stale header, renamed hook): fix
  the README to match the code + note the discrepancy in your handover
  (file a todo_inbox item only if it is a real doc/code bug).

## DO-NOT-touch
- ALL `.ts` / `.mjs` / `.py` / `.jsonc` / `.exe` files; `.opencode/maintainer/**`;
  `.opencode/agent/prompts/**`; `.opencode/loop/**`; existing knowledge entries
  (append nothing); `TODO.md` entries other than #110/#112.
- No gate run is required (docs-only) — do not run probes/smokes/pytest.
