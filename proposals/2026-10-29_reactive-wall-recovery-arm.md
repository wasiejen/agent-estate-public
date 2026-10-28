# Reactive wall-recovery arm — watchdog auto-free on provider rejection

Status: awaiting approval (draft 2026-10-29, planner-36c, direct).

## Problem
Prevention (wall guard, U22-calibrated) plus manual recovery (planner
`free` → resume) are proven — but planner-side resume rejections cannot be
seen by the dead session's own guard: the overage was the caller's prompt.
Measured 2026-10-29: resumes of `ses_e7b96ab54ffe…` rejected at 281,589 and
276,350 while the session sat idle at its wall; recovery needed planner
manual `free target=45` (`agent/research/2026-10-28_u21-acceptance.md`).
Second gap: failure events carry NO cause (`session.step.failed` 18 rows,
`session.tool.failed` 45, none with a cause field — census `9e3432a7`), so
a watchdog cannot yet distinguish a wall-rejection from other failures
without a DB read. TODO context: #214, #216, #218, #215.

## Design (three independently approvable parts)
- P1 (host-domain, prerequisite): failure event payloads carry the error
  type (`provider.invalid-request` vs others) — fork event emission, NOT
  agent-domain. Alternative without fork change: the watchdog reads the
  failed row's `meta.error.type` from the session store (read-only), at
  detection time. Recommendation: the DB-read variant, no fork change.
- P2 (agent-domain): `auto_resume.ts` wall-recovery arm — on a detected
  `provider.invalid-request` for a session: run the SAME drop the planner
  runs (`context_trim mode:'free' target=45` on that sid, in-process via
  the trim lane's functions), log `kind:wallfree`, and wake the session
  with a short recovery text ("your window was trimmed externally;
  continue from committed state; report the rejection verbatim"). Only for
  sessions that finish with a wall-rejection row; never twice per session
  without a new rejection.
- P3 (deterrent accounting, optional): one `fires` counter per session in
  the trim store entry; notice text names the count; no compaction-budget
  coupling (ruling 2026-10-28: ledgers stay decoupled).

## Acceptance
- Fixture: synthetic failed row with `meta.error.type=
  provider.invalid-request` → arm logs one `kind:wallfree` line + free
  drops land in `auto` + one wake text; second identical rejection re-arms
  once; non-wall failure types → zero action.
- Live: next real wall-dead session recovers WITHOUT planner action; the
  worker resumes and commits its recovery record.
- Gate: auto_resume smoke re-pin + probe 115/115 + tsgo 0.

## Recommendation and order
Build P2+P3 only AFTER U22 lands and one full prevention cycle runs clean
(calibrated guard fires before the wall). If wall-rejections still reach
the provider despite calibration, P2 earns its keep. P1 is a decision for
the maintainer (fork-domain vs DB-read variant).
