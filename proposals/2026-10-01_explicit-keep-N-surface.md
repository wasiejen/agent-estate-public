# Proposal — explicit keep-N surface for the post-compaction tail-set (Magic Context candidate 2)

Date: 2026-10-01 (planner-8, autorun looprun autorun-2026-10-01_03-27).
Status: draft — awaiting maintainer decision.
Source: candidate (2) in `agent/research/2026-10-01_magic-context-plugin.md`
(§Adoption implications — "the one where a concrete build most clearly emerges
from existing machinery — flagged for planner triage as a maintainer call").

## Problem

The agent controls the retention AT compaction time (`compact_memory`
`keepMessages`, the #99 computed keepTokens) and the post-compaction tail-set
is AUTOMATIC (the #120 U2 auto_resume tail-set leg rewrites `tail_start_id` to
the keep boundary on every ctx.log COMPACT line). But there is no explicit
agent-facing surface to ADJUST the retained tail after a compaction WITHOUT a
new compaction: to trim the tail from 18 messages to 10 (e.g. after an
emergency auto-compaction that used keep=18 blindly), the agent must
`context_trim report` → find the target id in the report rows → `context_trim
tail <session> <id>` — a three-step round trip over a potentially heavy
report read. Live precedent: the maintainer ran exactly that round trip in the
#126 live acceptance (report ×2 + tail + floor refusal in one session).

The at-compaction analogue of their `/ctx-wrapup [messages_to_keep]` already
exists here (`compact_memory keepMessages=N` triggers the compaction with N
messages kept raw). What is missing is the post-compaction half — the
explicit, agent-requested tail-set with no summarization call.

## Design

The mechanics already exist and are fully pinned: the `context_trim` core
exports `tailSetKeep` (#120 U2, commit `ad7db12` — computes the keep-th
message STRICTLY before the compaction user row and delegates the validated
write to the EXISTING `tailSet` path; rejections: keep-invalid,
keep-exceeds-history, floor 6, no-completed-compaction, session-not-found;
pinned by the context_trim smoke 29/29). The tool surface
(`.opencode/tools/context_trim.ts`) exposes only the messageID form today.

- **Part 1 (surface):** a `keep: N` argument on `tail` mode (mutually
  exclusive with `target`), delegating to the existing `tailSetKeep` core
  export — zero new validation logic, zero new rejections; the `tail=`
  return-line prefix is already remapped by the core.
- **Part 2 (docs):** the tool description gains the keep form (MODES line +
  the tail-mode parameter note) + a knowledge one-liner.

## Acceptance

- context_trim smoke: keep-form pins THROUGH THE TOOL SURFACE (valid keep →
  the `tail=` return line identical in shape to the messageID form;
  keep-invalid / keep-exceeds-history / no-completed-compaction → rejection,
  no DB write); fixture DB only — the live opencode.db is NEVER written.
- Existing pins unchanged (context_trim 29/29 stays green); standard gate
  green (probe 355/355 + all 11 smokes).

Effort: **S** (surface wiring + smoke checks + docs; the core, its
validation, and its rejections exist and are pinned).

## Recommendation

GO (Parts 1+2 as one small worker unit). It turns the post-compaction tail
trim into a one-argument call, reuses fully-pinned mechanics (no new
validation surface), and closes the only real gap of the Magic Context
adoption list that our machinery already covers. No model-facing surface; no
behavior change beyond exposing already-pinned mechanics — hence the call is
about the new agent-facing control surface itself, per the research doc.
