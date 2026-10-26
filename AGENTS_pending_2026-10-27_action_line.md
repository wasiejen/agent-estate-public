# AGENTS.md PENDING CHANGE (copy for the maintainer — he applies it himself)

Ruling session 2026-10-26 (planner-36, direct): the close keys on the gauge,
not on queue state. Compaction costs 40–60 s. A restart costs 240–300 s plus
re-derivation. The slow-context penalty is mild: 90 → 65–70 tok/s at 200k+.
Two replacement blocks, conformed to §Writing and Output Rules.

## Block 1 — §Interaction Contract, "Action-Line State Machine" section

Replace the section body with:

- `action: continue` keeps the current session alive.
  The plugin wakes the same session. It spawns nothing and stops nothing.
  Use it in autorun when the queue is blocked and context is healthy.
- `action: restart` starts a fresh planner session.
  Use it only when the compaction budget is exhausted,
  or when the maintainer requests a fresh session.
- `action: resume` resumes a last subagent session through `task_id`.
- `action: ask_maintainer` pauses the loop until the maintainer responds.
- `action: stop` ends the loop after goal completion or unrecoverable failure.
- A missing action line means an intentional session pause.
  Compaction budget remains: treat it as `action: continue`.
  Budget exhausted: treat it as `action: restart`.

Plugin-side note (NOT part of the AGENTS.md paste):

- `auto_resume.ts` needs the `continue` token in `ACTION_RE`.
- Add a `route= continue` branch, exempt from `MAX_RECOVERY_ATTEMPTS`.
  Recovery stays reserved for real deaths.
- Today `action: resume` lands in the self-continue branch (L934).
  That branch belongs to `continue`. Tracked as TODO #170.

## Block 2 — §Context Budget, stop-line condition

Replace the stop-line bullet with:

- `REM ≤ 20k`

Reason:

- The compaction step runs on the full context.
  The summary thinking plus the summary text must fit the remaining window.
  That step is approximately 5–6k tokens.
  The gauge lags one in-flight step, approximately 5k.
  15k was tight. 20k is the prudent headroom line.

## Rationale (for his decision, not for the file)

- `agent/prompts/agent_planner.md` got the matching ladder edits in the same
  unit (planner-owned file, his review/adopt).
- The ROUND counter + ctx-suffix maintenance delivery is TODO #171.
