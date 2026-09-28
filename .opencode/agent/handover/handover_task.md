# Task spec — plan32 (unit 2): TODO #109 — silent context-limit-stop detector (RESEARCH ONLY)

Explorer: `explorer_Q3S_245K_slow`. RESEARCH task — NO code, NO plugin
changes, NO TODO edits. One deliverable: one research doc.

As your first action after reading this spec, write your loop-log START
line via the `loop_log` tool (status: start; role: explorer-32; session +
model from your own context; content: a task oneliner). Write your own
DONE line (final gauge readout) before you finish.

## Goal (from TODO #109 — read the entry, it is the contract)
A worker session that stops at the context wall WITHOUT self-compacting
returns an EMPTY Task result — no error, no Work State, no loop-log line
(measured 2026-09-25_18-01; the message-carrier deaths are MEM-0104/0109 —
the silent variant has not even that). Design the cheapest RELIABLE plugin-
side detector that makes a silent limit-stop visible, with the false-
positive risk analyzed.

## The research doc
`.opencode/agent/research/2026-09-28_silent-limit-stop-detector.md`
(≤ ~150 lines) with these sections:
1. **Death-class taxonomy** — the three limit deaths: (a) SILENT (empty
   result, no failure message — the one to detect), (b) failure-message
   deaths (`context_length_exceeded` / `request exceeds the available
   context size` — MEM-0104/0109), (c) normal completion / in-progress.
   For each: what the DB shows at the moment of death (the last step's
   finish meta — verify the EXACT field names against the live DB,
   read-only: `reason`/finish value, `tokens.total` vs the window limit;
   cite the helper script + the field path).
2. **Detector design** — where it hooks, what it reads:
   - Recommended candidate: the auto_resume 5s tick (it already
     tail-reads `.opencode/temp/ctx.log` with a cursor —
     `ctxLogOffset`, auto_resume.ts ~L306 + the tail-read block
     ~L1390-1430; READ-ONLY reference).
   - The silent signature, as a conjunction: the session's last DB state
     shows a step that finished at the wall (finish reason = the
     length/value you measured + `tokens.total` ≥ ~the window) AND no NEW
     `COMPACT <sid>` line in ctx.log since that step AND the session is
     in the watched scope (scopeVerdict — it exists in auto_resume.ts).
   - State the time-gate needed to distinguish "at the wall" from
     "mid-turn streaming" (your analysis, with a concrete value).
3. **False-positive analysis** — each candidate FP (a streaming session,
   a session compacted between the step finish and the tick, a
   maintainer-killed session, a Direct session out of scope, a session
   whose last step died of a NON-context error) + how the design
   excludes or gates it.
4. **Visibility channel** — the detection must land somewhere a planner
   (or the loop log) sees it WITHOUT a user message: analyze the options
   (the plugin appends a line DIRECTLY to the looprun's
   `loop_log.md` in the 8-char format — note the `loop_log` TOOL is
   agent-facing, the plugin would write the file itself; vs auto_resume.log
   only + planner surfaces it at its next start). Pick one, justify it.
5. **Build spec sketch** — the small follow-up build (files, the new
   tick leg, the log-line format, the smoke pins, the DoD) at outline
   level — plus the approval-boundary note: which parts are the
   pre-approved agent-usage class (a `-WARNING` line) vs any part that
   would dispatch a compaction itself (a behavior change → maintainer
   call). Effort estimate (line-count / wall-time class).

## Fact sources (bounded — read ONLY these areas)
- `TODO.md` #109 (the contract).
- `.opencode/agent/memory/planner/memory.md` — MEM-0104 / MEM-0107 /
  MEM-0109 (grep `MEM-010`, bounded) — the limit-death forensics precedents.
- `.opencode/agent/knowledge/opencode-plugins/host-map.md` — the
  session/message/part DB schema (grep `message` / `tokens` / `finish`,
  bounded) — locator for the step-meta fields.
- `.opencode/agent/scripts/db/README.md` + `probe_schema.cjs` /
  `sesdata.cjs` / `sesinspect.cjs` — the curated read-only DB helpers;
  RUN them (read-only) to verify the last-step meta shape on a real
  limit-death session (any session in the DB with the finish reason —
  find one by scanning message info, bounded).
- `.opencode/temp/ctx.log` — the `COMPACT` line shape (grep, bounded).
- `.opencode/plugin/auto_resume.ts` — the tick area only (grep
  `ctxLogOffset` / `readCtxLog` / `scopeVerdict` + the ~L1390-1430 block).
  READ ONLY — no edits.
- The loop-log format: `.opencode/agent/prompts/agent_readme_loop.md`
  §Loop log (the 8-char tokens) — READ ONLY.

## Definition of done
- The doc committed at the path above (one checkpoint commit: doc + loop
  log lines); `git status` shows ONLY that doc + the loop log after the
  commit.
- Every DB-field claim in the doc carries its evidence (the helper
  script run or the host-map locator); no unverified field name.
- The doc ends with the build spec sketch + the approval-boundary note
  (what is pre-approved vs maintainer-call).
- NO edits to `.ts`/`.mjs`/`.cjs`/`.py`/`TODO.md`/`.opencode/maintainer/**`/
  `.opencode/agent/prompts/**`.
- Your summary goes to `.opencode/agent/handover/handover_task_to_planner.md`
  (the doc path + the key design decision + the FP verdicts in 5 lines).
