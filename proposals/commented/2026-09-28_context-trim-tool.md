# context-trim tool: surgically shrink a live session's model context (2026-09-28, planner-37)

## Overview

A new agent-facing tool (`.opencode/tools/context_trim.ts`, registered in
`opencode.jsonc` — your domain) that reduces the model context of a live
session WITHOUT compaction, by writing to the live opencode DB
(`~/.local/share/opencode/opencode.db` — the gauge's `DEFAULT_DB_PATH`,
`.opencode/plugin/scripts/gauge.mjs` L157, existing path resolution reused).

Evidence base: the research doc
`.opencode/agent/research/2026-09-28_context-erase-tail-trim.md`
(explorer-36, plan36 unit 1): the model context is re-derived from the DB at
the top of EVERY loop step (prompt.ts:1092 `filterCompactedEffect` → fresh
SQL select message-v2.ts:433-446 → toModelMessagesEffect → llm.stream) —
no in-memory history, no prompt cache. A DB write therefore changes the next
prompt with zero restart, zero invalidation, zero host cooperation.

## The two levers (research doc §5)

1. **tail** (preferred, non-destructive): rewrite the compaction part's
   `tail_start_id` — the host does exactly this itself on compaction
   (compaction.ts:461-466). One JSON field on one part row trims or extends
   the retained tail precisely (`result.slice(tailIndex, compactionIndex)`,
   message-v2.ts:567-571). Reversible (point it back at the old id). Only
   usable when a compaction marker exists.
2. **turns** (destructive): delete complete finished old turns (user row +
   its assistant rows; parts cascade via FK, `PRAGMA foreign_keys = ON`)
   strictly BEFORE the current last user message and strictly OUTSIDE the
   compaction-marker quartet (compaction user row + compaction part +
   summary row + `tail_start_id` target). The only lever for sessions with
   NO marker.

## Proposed surface

- `report <session> <target>` — DRY RUN (default mode): what a trim to the
  target would remove (message count + token mass via the gauge's S metric
  or bytes/4 fallback) and what would remain; no write.
- `tail <session> <messageID>` — apply the `tail_start_id` rewrite after
  validating the id exists, sits before the compaction user row, and keeps
  the window guard (message-v2.ts:568) satisfiable; single transaction.
- `turns <session> <target|count>` — apply the old-turn deletions after
  validating every row against the safe-zone rules (no last user message,
  no quartet, no in-flight rows); single transaction.

Validation mirrors the window guard exactly; fail-closed on any doubt.
WAL coordination: a brief write lock; the host reads on its own connection
(SQLite WAL = concurrent read, single writer).

## Hazards (research doc §4-5)

- Deleting the last user message makes the next prompt re-run the OLDEST
  surviving user turn (MessageV2.latest, message-v2.ts:586-602).
- Deleting ANY marker-quartet member degenerates the window to the FULL
  history → overflow, and this host has NO auto-compact backstop
  (`compaction.auto = false`).
- Row surgery near the session tail or the marker is structurally load-bearing.
- `turns` is irreversible (the pre-compaction dumps only cover compacted
  sessions).

## Effort

- Tool ~150-250 lines + DB write coordination; smokes against a FIXTURE DB
  (never the live one); probe pins per the established pattern; registration
  in `opencode.jsonc` (you); live acceptance on a dedicated throwaway session
  (report first, never trim a working session blind).
- ~0.5-1 day worker time (one unit) + one post-restart live-acceptance cycle.

## Approval needed

Live-DB writes + a new tool surface = observable behavior change → your
call. The specific question: is a `turns` (row-deletion) mode wanted, or
only `report` + `tail`?

## Recommendation

Build `report` + `tail` first (non-destructive, reversible, validation
against the host's own guard semantics), and keep `turns` as a follow-up
until a `report` run shows real savings in a long never-compacted session.
If you want no live-DB write tool at all: the research doc stands as the
evidence record, no code needed.

--comment 2026-09-29_19-15: (replace "--comment" with just "comment" on read and acted on it - to not let the maintainer search be uncomment - that you can see as a general ruling and would need to be updated whereever the concention for this stands. only apply this instead of removing the comment to all documents that document the development/history or idea exchange)

mh so the tail approach in general does exactly the same as the compaction - setting a marker from which the tail will start to load, but which only functions when a compaction marker is there? did i understand that correctly? so we could use it to customize our compaction not based on keepToken (which is not working due to non exposure of this function) but on real keepMessages. we could, after the compaction and before the prefill, set the marker to the keepMessages of compact_memory indicated position and thus keep the tail we want to keep.

and i would prefer not to do any destructive measures on the DB in general.

we have a fork of opencode in the:
"opencode": {
  "path": "home/Repos/opencode",
  "description": "forked opencode repo"
}
and could thus customize the message pruning idea. why not change the way the current context "gathering" does. so instead of, using the full session in db and when a compaction was done the marker to indicate the start of the tail from which on to built the context of, we could have our own json or marker file that is the base of the context built up in which each message has an entry, a number, tool, #token, #token to current "tailhead" and a toggle to turn on and off (message-state-list). and we assemple the context based on this json file or equivalent in-memory state? so we could write a tool to manage this message-state-list and to modify this instead of the DB. and on removing a message we just toggle it of and it will no longer be built into the context. on compaction we could just overwrite the marker for the tail_start_id with the appropiate placement of our keepMessage of our compact_memory tool or completely replace it via the message-state-list and turn off all previous messages.
- would need a map or peek functionality to let the agent know what is in the current context and to decide what to drop.
- we could also complety remove compaction as a seperate tool and only use the pruning of messages: before a self-prune the agent would get the instruction to create the summery for himself (no loading times of the compaction agent and also reduced cache usage because this compaction model would never run)


see agent\research\2026-09-28_keeptokens-fork-effort.md for the current idea on how to change the fork to make a simpler version of tail of it but with less control.

but no idea how exactly after changing the fork i can create the bun exe opencode is actually running on.
- so feedback to this please
