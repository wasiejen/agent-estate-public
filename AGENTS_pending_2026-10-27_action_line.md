# AGENTS.md PENDING CHANGE (copy for the maintainer — he applies it himself)

Direct-session ruling 2026-10-26 (planner-36): close ladder keys on the gauge,
not queue state. Compaction (40–60 s) is cheaper than restart (240–300 s incl.
re-derivation); slow-context penalty is mild (~25–30%, 90 → 65–70 tok/s at
200k+). Two replacement blocks.

## Block 1 — §Interaction Contract, "Action-Line State Machine" section

Replace the section body with:

- `action: continue` keeps the CURRENT session alive: no spawn, no stop. The
  auto-resume plugin wakes the session with a continue instruction. Use it in
  autorun when the queue is momentarily blocked and context is healthy.
- `action: restart` starts a fresh planner session. Use it only when the
  compaction budget is exhausted or the maintainer requests a fresh session.
- `action: resume` resumes a named subagent session through `task_id`.
- `action: ask_maintainer` pauses the loop until the maintainer responds.
- `action: stop` ends the loop after goal completion or unrecoverable failure.
- If the action line is missing, treat it as an INTENTIONAL close of a
  work session: `action: continue` while the compaction budget remains,
  `action: restart` when it is exhausted.

Plugin-side note (NOT in AGENTS.md): `auto_resume.ts` needs the
`continue` token in `ACTION_RE` + a `route= continue` branch exempt from
`MAX_RECOVERY_ATTEMPTS` (recovery stays for real deaths). Today
`action: resume` wrongly lands in the self-continue branch (L934) —
that branch belongs to `continue`. Tracked as TODO #170.

## Block 2 — §Context Budget, stop-line condition

Replace the stop-line bullet:

- `REM ≤ 20k`

Reason: the compaction step runs on the FULL context and must fit the summary
thinking + summary text in the remainder (~5–6 k); the gauge lags one
in-flight step (~5 k). 15k was tight; 20k is the prudent headroom line.

## Rationale (for his decision, not for the file)

- The planner prompt (`agent/prompts/agent_planner.md`) got the matching
  closing-ladder + budget edits in the same unit (planner-owned file, his
  review/adopt).
- The ROUND counter + ctx-suffix maintenance delivery is TODO #171.
