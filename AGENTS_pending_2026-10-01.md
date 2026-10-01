# AGENTS.md staged change (2026-10-01, plan2, #128) — for the maintainer's paste

Replaces ONLY the `## Budgets` block of AGENTS.md §Compaction Guidelines (the
block starting "- `normal`: 5 self-triggered compactions"). Everything else
in AGENTS.md is unchanged. The matching planner-prompt line already landed in
`agent/prompts/agent_planner.md` (this session's bookkeeping commit).

## Budgets (per model, per session — check your own, don't hardcode)
- `normal`: 5 self-triggered compactions (keepMessages-capable).
- `emergency`: 1 — consumed ONLY after the 5 are drained (total 6); usable by either system
  (self via the `emergency` arg, or the auto one at the limit), once.
- Cross-override (#128, 2026-10-01): a CROSS caller (the `compact_memory`
  tool against ANOTHER session — an explicit sessionID ≠ the caller) gets an
  effective cap of `cap + 1`; the cross spendable total (cap + 1) stays
  THE SAME AS SELF. A cross at `count == cap + 1` stays REFUSED (no second
  slot). A successful cross-override dispatch (pre-dispatch `count == cap`)
  is marked with the `ovr` token on the verified-success COMPACT line.
- Both exhausted → the next limit hit forces a clean NEW session (new planner + directive to
  scan the last session's dump). You are never hard-killed at the wall.
