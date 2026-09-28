# Worker summary — plan36 unit 1: context-erase / tail-trim research

explorer-36 (ses_f192da65effe5No7efgj5VFbb1, Qwen3.8-27B-Q3S-245K-slow),
2026-09-28. Status: **LANDED**.

## What changed

- ONE new doc: `.opencode/agent/research/2026-09-28_context-erase-tail-trim.md`
  (211 lines — slightly over the ~150–200 target; kept rather than cut content).
- No code, no config, no prompt, no TODO, no live-DB touch, no model traffic,
  no FST run (all constraints honored).

## Doc commit

`4591cd0` — "research: context-erase/tail-trim — model context is re-derived
from DB per step" (doc only).

## The ONE question — answer

**YES — the context changes.** The model's message list is re-derived from the
DB at the top of EVERY loop step: `runLoop` re-reads via
`MessageV2.filterCompactedEffect(sessionID)` (prompt.ts:1092-1094) →
`stream()/page()` fresh SQL select on the `message` table (message-v2.ts:433-446,
473-494) → parts joined by `message_id` (message-v2.ts:98-120) →
`toModelMessagesEffect` (message-v2.ts:131+, called at prompt.ts:1262) →
`llm.stream(streamInput)` (processor.ts:641-654). No in-memory history, no
incremental list, no cached prompt — no cache to invalidate. (All refs vs the
opencode-dev v1.18.32 source copy; the doc carries the full pin list.)

## Verdict (doc §5)

Row-deletion is a **VIABLE** context-trim channel — with a narrow safe zone:

- Safe: complete finished turns (user + assistant rows; FK cascade
  `part.message_id → message.id onDelete cascade`, sql.ts:82-89, with
  `PRAGMA foreign_keys = ON` at database.ts:31) that are strictly BEFORE the
  current last user message AND outside the compaction "marker quartet"
  (compaction user row + compaction part with `tail_start_id` + summary row +
  the `tail_start_id` target — message-v2.ts:549-573).
- Hazardous: deleting the last user row re-runs the OLDEST surviving user
  message as the active turn (`MessageV2.latest`, message-v2.ts:586-602, fed at
  prompt.ts:1096/1273); deleting anything in the marker quartet degenerates the
  window to the FULL pre-compaction history (guard at message-v2.ts:568) →
  overflow, and this host has `compaction.auto = false` (no auto-compact
  backstop); part-only deletion leaves phantom rows in session surfaces
  (skipped at model level by message-v2.ts:200).
- **Cleaner lever discovered**: the host itself rewrites the compaction part's
  `tail_start_id` IN PLACE (`compaction.ts:461-466`, `session.updatePart`) — a
  single-field JSON edit of one part row trims/extends the retained tail
  (the `result.slice(tailIndex, compactionIndex)` window, message-v2.ts:567-571)
  without any deletion. Where a marker exists, that edit is strictly safer than
  row surgery; where no marker exists, the options are old-turn deletion or
  creating a marker (needs a summarizer model request — forbidden on this host).

## Suggested follow-ups (planner's call — NOT done by this unit)

1. Maintainer call: is a live-DB write tool (tail-trim / tail_start_id editor)
   wanted at all? Production use needs live-DB write coordination (WAL; the
   host holds an open connection; reads are per-step so no restart needed).
2. If yes: a worker task to design + implement the trim tool with a dry-run
   mode, against a COPY of the DB first (never the live one).

## TODO entries

None appended (no discrepancies beyond the doc content; the doc's
"Effort / approval" section carries the follow-up design).

## What was deliberately NOT done

- No live-DB reads or writes (constraint), no model/provider requests,
  no FST run.
- No code/plugin/config/TODO changes.
- The v2-generation SDK surface (`session.context`/`session.history`) was
  cited from the host-map (sdk.gen.d.ts:1718/1726) — not re-traced in source
  (the installed live client is v1-generation, host-map L96-97; the v1 path
  is the runtime path and was fully traced).

## Friction

Logged via `submit(feedback=...)` (one line, before this handoff).
