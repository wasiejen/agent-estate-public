# Context-survival lane — death trip + emergency-lite trim (#220, #221)

Status: awaiting approval. Split into parts A and B, independently approvable.

## Intention
Make a context death a routine, machine-handled event instead of a
maintainer interruption: the session notices it is dying, frees its own
context, and continues from committed state.

## Problem
- The wall guard (#205) prevents provider rejections by dropping heavy rows
  pre-emptively, but it does NOT notice *behavioral* degradation: a session
  near full keeps re-deriving, repeating tool calls, and producing sloppy
  work long before the guard fires (`agent/handover/maintenance_pass_5.md`,
  #220 evidence; TODO.md #220).
- When a session does die or degrade, recovery today is planner-side only:
  an external `free` on the child, then a resume (`AGENTS.md` §Context Trim).
  There is no session-side trip action and no ruleset telling a dying
  session what to drop first (#221).
- Related parked design: `internal proposal`
  (rejected-by-calibration: the guard prevented rejections, so the reactive
  arm had no trigger).

## Part A (#220) — degradation trip signal
Carrier note (measured 2026-10-29): the rung tokens (`triage`/`stop`/
`emergency`/`maintainer`) appear NOWHERE in this repo's plugins or in the
fork checkout — the injected nudge lives outside both trees (host-side or a
plugin not in this estate). Locating that carrier is the FIRST step of A.
Options:
1. **RECOMMENDED: gauge-derived trip rung on that existing nudge** — one
   rung above `stop` (e.g. `dying`), computed from request growth over the
   last N steps. Reuses a channel the roles already obey; cost is unknown
   until the carrier is found.
2. Repo-side detector: similarity check over recent tool-call targets
   (reuse the `edit` tool's Levenshtein machinery as inspiration, or
   `agent/scripts/` helper) surfacing a warning line. Stronger signal, but
   new detection logic + tuning risk.
3. Nothing — keep human detection.

Intention of A: give the session a *named* signal so the prompt ladder can
react deterministically instead of the model self-assessing quality.

## Part B (#221) — emergency-lite ruleset
Options:
1. **RECOMMENDED: documented drop ORDER for the dying session** in
   `AGENTS.md` §Context Trim (own tool outputs → oldest distilled reads →
   thoughts last), plus role-prompt one-liners that call
   `context_trim free` at the new rung. No new code.
2. New `context_trim mode:'emergency'` implementing that order internally
   in one call. Cleaner ergonomics, more code + pin work.
3. Skip B, rely on the wall guard alone.

## Acceptance
- A: one rung name appears in the injected line at a real near-full moment;
  a session reacts per the ladder without maintainer intervention.
- B: a walled/degraded session frees context itself, continues, and the
  trim log shows the drop order matching the documented ruleset.
