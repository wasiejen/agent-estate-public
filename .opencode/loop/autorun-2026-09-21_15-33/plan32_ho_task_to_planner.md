# Worker handover — worker-32 (plan32 unit 1: TODO #110 + #112, the plugin-docs batch)

## What changed (docs-only, pre-approved)

**Goal A (TODO #110) — committed in `3a5de39` (unit-A checkpoint):**
- 9 new per-plugin/per-tool READMEs, each next to its source, each ≤ 60 lines
  (`wc -l` measured):
  - `.opencode/plugin/auto_resume.md` (30) — units 1-4: event log, passive
    nudge suffix, spawn helper, liveness watchdog + scope toggle
  - `.opencode/plugin/compact_memory.md` (31) — the tool + what
    `compaction_core.ts` is and who imports it (tool + hook, T5 constraint)
  - `.opencode/plugin/context_recovery.md` (29) — the event-hook backstop +
    the `emergencyRecovery` flag in compact_budget.json
  - `.opencode/plugin/intercept_observer.md` (33) — the observer + core;
    channels one line each (observe, pair R1/R2, fuzzy, git refs, edit R6 +
    edit-fuzzy, R3 arg-scope, R8 redirect, journal, after-hook)
  - `.opencode/plugin/ctx_watchdog.md` (29) — the gauge/ctx-nudge family:
    v2.8 readout trio, the nudge ladder, the chat.message ctx: line, gauge.mjs
    + peek.mjs
  - `.opencode/tools/block_transfer.md` (25) — 11 modes + the unified anchor
    rule (one line + pointer to the knowledge notes)
  - `.opencode/tools/loop_log.md` (25) — the 8-char status tokens + auto-fill
    slots
  - `.opencode/tools/submit.md` (29) — the 4 inbox channels + stamping
  - `.opencode/tools/ctx_gauge.md` (23) — the readout form, the #103 lag
    semantics, the #114 budget suffix
- `.opencode/plugin/README.md` + `.opencode/tools/README.md` each gain a short
  "Per-file docs:" index line-list (existing content untouched); the tools
  README also carries the two minor-tool one-liners (`session_info.ts`,
  `dev_get_tool_context_contents.ts` — "minor host-bridge tool, see its
  header").

**Goal B (TODO #112) — in this final commit:**
- NEW `.opencode/agent/knowledge/opencode-plugins/2026-09-28_auto-resume-
  units-explainer.md` (61 lines ≤ ~80) — per-unit what/trigger/log-lines
  table + the unit-4 routing itemization; all 14 real log tokens named from
  the code (`arm= scope= nudge= rearm= route= recovery= relay= skip= spawn=
  spawn-fail= deactivate= budget= send-fail= err=`); pointer-only to the
  surface report, deep-dives A/B/C, auto-resume-map, host-map; the
  compaction-handout inclusion is noted as the MAINTAINER's paste (NOT done
  here — his draft file).

## Hook-surface spot check (spec DoD — the table)

Raw `grep -c` per named string in the named source file (counts include
header/comment mentions; the live hook keys were also verified in each file's
hooks object, e.g. auto_resume.ts L1729-1734):

| README | hook / entry-point string named | source file | grep -c |
|---|---|---|---|
| auto_resume.md | `tool.execute.after` | auto_resume.ts | 3 |
| auto_resume.md | `event:` (the hooks key) | auto_resume.ts | 2 |
| compact_memory.md | `tool({` (tool registration) | compact_memory.ts | 1 |
| compact_memory.md | `export function` (the core's named surface) | compaction_core.ts | 15 |
| context_recovery.md | `event:` (the hooks key) | context_recovery.ts | 3 |
| intercept_observer.md | `tool.execute.before` | intercept_observer.ts | 2 |
| intercept_observer.md | `tool.execute.after` | intercept_observer.ts | 2 |
| ctx_watchdog.md | `tool.execute.before` | ctx_watchdog.ts | 4 |
| ctx_watchdog.md | `tool.execute.after` | ctx_watchdog.ts | 11 |
| ctx_watchdog.md | `chat.message` | ctx_watchdog.ts | 9 |
| ctx_watchdog.md | `event:` (the hooks key) | ctx_watchdog.ts | 1 |
| block_transfer.md | `export default tool` | block_transfer.ts | 1 |
| loop_log.md | `export default tool` | loop_log.ts | 1 |
| submit.md | `export default tool` | submit.ts | 1 |
| ctx_gauge.md | `export default tool` | ctx_gauge.ts | 1 |

No zero-count claims. No README contradicted the code (headers read as the
contract; no stale hook names found) — no discrepancy todo filed.

## Verification (measured)

- `wc -l`: all 9 A-READMEs ≤ 60 (23-33); the B entry = 61 ≤ 80.
- `git status` after the unit-A commit: only the 9 READMEs + 2 folder READMEs
  (+ the loop log). After this final commit: + the B entry, `TODO.md`, this
  handover, the loop log. NO `.ts`/`.mjs`/`.py`/`.jsonc` file changed (checked
  per commit; the DO-NOT-touch list was respected).
- No gate run — docs-only per the spec (no probes/smokes/pytest run).

## TODO entries

- #110 → `LANDED`, #112 → `LANDED` (status text updated; hashes recorded in
  the planner's follow-up bookkeeping commit — unit A = `3a5de39`, unit B =
  this handover's commit).

## Deliberately NOT done

- The `knowledge/opencode-plugins/README.md` was LEFT UNCHANGED: it is not a
  file list (a descriptive paragraph whose named files are all copied-repo
  derivations; our dated explainer is derived from our own code) — per the
  spec's conditional, no line added. Flagged for the planner if a line is
  wanted anyway.
- The compaction-handout paste — the maintainer's domain (noted in the B
  entry).
- No `todo_inbox.md` entries — nothing found that is a real doc/code bug
  (the headers are current).

## Lessons

- The spec's "first ~40-60 lines" header assumption underestimates the two
  longest headers (ctx_watchdog.ts runs to ~L188, intercept_observer.ts to
  ~L170) — a docs task over them needs reads past 80 lines to cover v2.8 /
  R3 / R8. (Also fired to the feedback channel.)
