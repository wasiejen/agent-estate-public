# Role-memory lanes — load or document (#224, #238)

Status: awaiting approval. One ruling covers both entries.

## Intention
Make role memory actually reach the agent that needs it, and keep the
loaded lane inside its size budget — so cured experience is not silently
ignored, and the always-rendered memory block stays small.

## Problem
- `opencode.jsonc` loads `agent/memory/planner/destilled_mem.md` into the
  planner roles; worker/explorer memory lanes are NOT loaded
  (`opencode.jsonc` agent defs; TODO #224). Cured worker memories (WM-xx)
  therefore only help when a worker happens to read the file.
- Planner destill currently measures **19,999 B** — above the 16 KB budget
  in `agent/memory/README.md` (MEM-0142 figure, TODO #238). Every byte of
  it renders into EVERY planner request (PAID surface).
- Deferred destill lines are queued for the next cold batch (U36 shipped
  WM-34 only; `agent/handover/maintenance_pass_3.md` §DEFERRED-DESTILL).

## Options
1. **RECOMMENDED — document + condense, load nothing new.** State the
   on-demand contract in `agent/memory/{worker,explorer}/README.md` headers
   (workers read their lane at task start via the role prompt pointer), and
   condense planner destill to ≤ 16 KB at the next cold pass (#238 / U36
   G5). Cost: no PAID growth; loss: cured worker lessons need a prompt
   pointer line (small, prompt surface = PAID, rides same cold pass).
2. **Load the lanes.** Append `{file:./agent/memory/worker/destilled_mem.md}`
   (+ explorer) to the respective agent defs. Measured sizes (2026-10-29):
   worker 7,931 B, explorer 713 B — ~2 K tokens added per worker request,
   and every cure then busts that role's prompt cache.
3. **Defer everything** — keep status quo, entries stay OPEN.

## Acceptance
- Option 1: folder headers state the contract; destill size ≤ 16,384 B with
  the retire-list moved to `memory.md`; role-prompt pointer line reported.
- Option 2: jsonc appends land in the same cold pass; a fresh worker names
  one WM-id from its lane without being told to read it.
