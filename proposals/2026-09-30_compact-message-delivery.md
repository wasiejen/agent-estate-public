# Proposal: compact-message delivery fixes (2026-09-30, planner-41)

Your observation `maintainer/done/compact_message_worker.md` is confirmed and
root-caused — research doc: `agent/research/2026-09-30_compact-message-
delivery.md` (read that first; this is the short form).

**The mechanism in one line:** a queued `compact_memory` message is written
at dispatch time (unconditionally) and is delivered ONLY by the auto_resume
unit-4 recovery path — so scope-none sessions (all Task-tool workers +
direct sessions) NEVER get their queued message, an in-scope session that
closes with an `action: line after compaction strands it (the restart
branch never reads it), and a failed dispatch leaves a zombie file the
relay delivers without checking that a compaction actually happened.

Measured on disk: 3 of 4 queued messages unconsumed (both workers + the
direct session); the only consumed one is planner-39's (recovery path).

## Recommendation (one unit, ranked)

1. **Protocol-side delivery (zero code):** `agent/readme/readme_post_
   compaction.md` instructs every session on resume — whatever the scope —
   to read its own `.opencode/temp/compact_message_<sid>` first (if
   present) and rename it `.consumed`. Covers workers + direct sessions
   (their resume channel bypasses the plugin — the protocol is their only
   channel). The relay stays as the in-scope recovery backstop.
2. **Zombie guard (small code):** the relay delivers only if a `COMPACT
   <sid>` line exists in ctx.log since the file's mtime (OR compact_memory
   deletes the queue file on verified dispatch failure).
3. **Cleanup sweep (small code, your Q1):** at plugin init, delete
   `compact_message_*.consumed` older than N days + orphaned unconsumed
   files (sid gone / older than N days). Keep `.consumed` tombstones until
   swept — they are the evidence for your Q2.
4. **Follow-up, separate decision (your B-case):** the restart branch
   appends the CLOSING session's queued message to the successor's
   restartText (the successor inherits the closing intent). Changes what a
   spawned successor receives — your call.

Items 1-3 = pre-approved agent-usage class (my build + your review); item 4
needs your ruling.

## Status (2026-09-30, planner-42)
Items 1-3 LANDED: item 1 = `f96a39c` (readme_post_compaction.md STEP 0 —
protocol-side delivery for the scope-none resume channels); item 2 =
`b025159` (zombie guard — `deleteQueuedMessage` on a verified dispatch
failure, both the v1 summarize + v2 compact paths, + 2 smoke pins); item 3
= `0a89e7c` (init age-sweep of `compact_message_*`, `queueSweepDays`
factory option default 3, + 1 smoke pin). Gate: compact_memory smoke
82/82, auto_resume smoke 147/147, probe 352/352, all other smokes green.
The new behavior takes effect from the next host restart (the live process
is the pre-context_trim build). Item 4 (restart-branch inheritance) =
still awaiting your ruling.

## Your Q2 answer (in the doc, one line)

COMPACT line + queue file = deliberate self-compact; COMPACT line without
file = limit-driven/auto; file without COMPACT line = failed dispatch
(zombie, the compaction never happened). Signal, not proof (a self-compact
without a `message` arg leaves no file).
