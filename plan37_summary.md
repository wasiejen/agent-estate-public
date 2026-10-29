# plan37 summary — planner-36c continuation (2026-10-28 late → 2026-10-29 early)

Scope: trim-world hardening + maintenance pilot + retirement step-1.
State of truth: `agent/handover/handover_planner.md` (Standing + session block),
`TODO.md` #210-#227, commits below.

## Landed and verified this stretch
- U29 (#225 assembly-authority trim, guard projection + session-report):
  worker `967c54d1` → G7 cold acceptance `b1028569` (full re-prefill
  `in=217,821` = the cold moment; report shows 3 hook fires 517→520).
  #225 CLOSED.
- U31 (#227 hard safety leg): `9dfb9e82`; planner-verified (smoke 248 pins,
  probe 115/115 re-run); LIVE-ACCEPTED via the planner-session ceiling
  equilibrium: 10 `auth=assembly-hardleg` fires, micro-drops hold request
  ≈ 240k vs bound 241,172, zero provider rejections. #227 CLOSED (`4335d741`).
- #222 CLOSED; #220 CLOSED (pilot verdict); #206 CLOSED (`d9486a69`).
- Maintenance pilot 1 green (`28769464`): foreground planner sub-agent;
  curator model preference; `maintenance_trip_tokens` 1M budget-file key
  (`9b6f03c1`); gauge `ROUND=` suffix live (no MAINT token).
- #215 step-1 DONE: root `"compact_memory": "deny"` verified live — call
  rejected BEFORE execute, zero side effects.
- AGENTS.md §Context Trim paste (maintainer) + `readme_post_trim.md` (`71531164`).
- Knowledge/memory lanes: KP-41..44, KT-47, WM-22, MEM-0151..0153 cured;
  inbox triage 21 entries → new TODOs #221-#227 (`91b6f70c`).

## Key measured facts
- Guard as-built (last-req projection) MISSED the U20 single-step overshoot
  (284,070 rejected); the hard leg restores the in-flight property (#214
  caveat cleared by U31).
- Equilibrium micro-fire regime at the ceiling: per-step n=1 drops, notice
  per fire, cache-slot bust per drop (~100 s re-prefill); gauge CTX= reads
  the trimmed assembly while the provider request rides the ceiling —
  filed for the #222-class polish pass (feedback + todo_inbox, `4335d741`).
- `free target=40` on a pinned session echoed `short=yes` (1 pick) —
  droppable pool exhausted by the guard's sticky picks; confirms the
  handover signal in the pinned regime.

## Watch list (no claims)
- Watchdog `ROUND=` suffix + counter `round` key live-legs (#171).
- Compaction-row deletion (3 dead specimens incl. planner's own) — inert,
  verify report/window behavior next trim unit.
- U30 spec ready (`1c68341f`) — PAID-surface, launch at cold moment only.

## Queue (NAP NEXT)
#216 triage (agent-vs-host) → #215 step-2 verdict (≥1 trim-only cycle —
this session qualifies; step-3 removal proposal with the stale-knowledge
candidates) → #226/#222 → #213 ruling. No maintainer item open.

action: restart
