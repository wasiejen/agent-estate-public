# Compaction retirement — step 3: tool-surface removal (#215)

## Problem
`compact_memory` is DENIED live (step-1, `opencode.jsonc` root permission —
verified 2026-10-29: call rejected before execute, zero side effects) and
every flow survived a full trim-only day (step-2 verdict, TODO: zero
`COMPACT` lines in `.opencode/temp/ctx.log` since `2026-10-28_23-13`). The
tool surface still loads, still carries a PAID description in every prompt,
and still implies a lane that no longer runs. The A1 audit
(`agent/research/2026-10-28_compaction-dependency-map.md`, 21 dependents)
mapped every replacement; the trim world (guard wall-brake #214/#225/#227 +
`mode:'free'` #209 + self-summary file + informed trim) is proven — two real
recoveries, live guard FIRE, zero provider rejections at the ceiling.

## Design — three independently approvable parts
- **Part A — tool-surface removal (PAID, one cold pass):** delete
  `.opencode/plugins/compact_memory.ts`, `agent/scripts/compaction_core_v2.mjs`,
  and the plugin's dump-hook registration. KEEP
  `agent/scripts/db/dump_session_v2.mjs` (on-demand forensics, map row 9).
  The description leg is cache-paid → lands in the SAME cold-moment pass as
  #223 (vocabulary) + #224 (jsonc lane decision) + the #226 schema addition
  if U30 reports a blocker — one save per file, byte delta reported (MEM-0142/
  0152). The `permission` deny line stays (defense-in-depth; reversible).
- **Part B — doc/prompt/code residue sweep:** remove the dormant `§compact`
  wording in `repo_custom_tools.md`; repoint the H-class trim-plugin anchors
  still keyed on compaction rows (map rows 1-4: `WINDOW_SQL`,
  `isHeadCompaction`, stale rule, `byteBytesOf` — verify current state first,
  U17 `2f89637c` may have landed row 1); legacy `type='compaction'` store
  rows stay untouched (75 v1-era rows, excluded by #201). Prompt destill
  compaction lines = historic scope notes, KEEP (ruling on #215).
- **Part C — the proposal trail:** move
  `internal proposal` per its own gate
  (build only after a rejection lands DESPITE calibration — currently zero
  rejections; it stays PARKED, not superseded).

## Acceptance
Grep sweep shows no live surface dispatches compaction; gates green
(probe 115/115, composite smoke, tsgo 0); ONE cold pass carries every PAID
save; description byte delta reported in the handover; fresh-session tool
list lacks `compact_memory`.

## Recommendation
Approve A+B together in one cold pass; keep Part C parked. Removal is
recoverable via git; the deny line already makes removal behavior-neutral.

## Priority
After U30 (trim free-surface batch) and U32 (action-scan fix) land; the cold
pass = next session start or first `cache.read=0` readout.

## Status
AWAITING APPROVAL — maintainer call required (feature removal, AGENTS.md
§Approval Boundaries). Steps 1-2 DONE (deny live-verified; trim-only cycle
verdict on TODO).
