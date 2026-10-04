# Proposal: the loop iteration counter (single machine source of truth)

Filed 2026-10-01, planner-9 (direct session ses_f0999d65dffeFxiJylRzecRbhu) —
in response to `maintainer/inbox_planner/2026-10-01_loop_iteration_numbers.md`
("make a proposal pls").

## Problem
The loop iteration number is DERIVED, not STORED. Measured current
mechanism: `auto_resume.ts` L691-735 computes each autorun spawn's title as
`<loop-folder> planner-<N>` where N = the largest `planner-<N>` found in the
loop folder's `loop_log.md` + 1 (regex scan of the log); the launch message
re-derives it ("the largest `planner-N` in the loop folder's loop_log.md
plus one — verify from the log; the counter-mismatch rule applies").
Consequences (his observation: "struggly to find and use the right
iteration number … doubled naming of sessions"):
- a session that dies BEFORE writing its START line leaves no `planner-N`
  line — the log max never advances → the next spawn REUSES the dead
  session's N (doubled naming; the loop log then carries two `planner-N`
  identities);
- the planner re-verifies the number with a bounded grep (read cost — the
  #89 title mechanism exists to avoid exactly this) and detects
  counter-mismatch itself (the "use the bigger number" rule is implicit and
  error-prone);
- the "starting condition" is always slightly unclear (which max, which
  folder, before/after my own START line).

## Design (independently approvable parts)
**Part 1 — the counter file (root-cause fix, effort S):**
`loop/<folder>/counter.json` = `{ "looprun": "<folder>", "n": <N> }`,
written by the `auto_resume` plugin AT SPAWN (machine-side — no agent action,
a dead session can never leave the counter behind):
1. on each autorun spawn: read the counter of the CURRENT loop folder;
   if absent or `looprun` != the current folder (rollover) → candidate n = 1;
   else candidate n = counter.n + 1;
2. cross-check against the loop log: N_final = max(candidate, largest
   `planner-<N>` in the loop log) — "when in doubt, the higher one" (his
   rule, made machine-side);
3. write the counter with N_final; title = `<folder> planner-<N_final>`;
   launch message: "your iteration number is N_final (the authoritative
   counter — the log grep stays the fallback verification only)".
The counter rides in the loop folder (survives host restarts with the rest
of the folder state; archived with the folder at rollover).

**Part 2 — surface the number in the session context (effort S, optional):**
the `session_info` tool is host-side (not plugin-extensible) — the
plugin-side equivalent is the injected `ctx:` line (the gauge plugin's
injection): when a counter file exists for the current loop folder, append
` ITER=<N> <loop-folder>` to the line, so every session sees its iteration
without any grep. (His "what else could we add to session_info?" — the
counter + looprun folder are the two fields the loop protocol needs;
lineage depth already lives in `auto_resume.log` and surfacing it is
optional.)

**Part 3 — docs (follows 1+2):** `readme_loop.md` §Self-identification +
§Iteration semantics: the counter file is the authoritative state, the
title stays the in-session identifier, the bounded grep stays the fallback;
the counter-mismatch rule is replaced by the machine-side max() (the planner
no longer detects mismatches).

## Acceptance
- Part 1 (auto_resume smoke pins): (a) counter n=4 + log max planner-4 →
  spawn N=5; (b) counter n=4 + log max planner-6 (dead session wrote its
  line, counter behind) → N=7 (the higher one); (c) counter n=5 + NO
  planner-5 log line (a dead session) → next spawn N=6, never 5 (no doubled
  naming); (d) counter of a DIFFERENT looprun (post-rollover) → N=1.
- Part 2: the ctx line carries ` ITER=<N> <folder>` when the counter exists
  (gauge/ctx smoke pin), absent otherwise.
- Standard gate green (probe + all 11 smokes).

## Status
Awaiting approval. Recommendation: Part 1 first (small, removes the root
cause); Part 2 optional; Part 3 rides along.

--comment:
approved including optional Part 2
