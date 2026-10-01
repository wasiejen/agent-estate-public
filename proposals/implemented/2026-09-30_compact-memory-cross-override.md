# Proposal — compact_memory: the caller-scoped compaction override (maintainer idea #4)

Date: 2026-09-30 (plan49, idle lane). Origin: `maintainer/ideas/compaction_related.md`
§#4 "emergency overwrite of max compact per session option" — "a planner should be
able to overwrite the limit for the sessionid of a worker ... if sessionID given
into the tool is not the current ctx.sessionID then the limits do not apply? or
raised by one temporarily? ... it is an emergency tool, to be there when needed."

## Problem

The rescue use case (the tool description's own wording: "before a task_id resume
of a session that died at its limit (cross)") has a hole. A worker that dies at
the context wall ends at:

- `count == cap` (it died before spending its one emergency), or
- `count == cap + 1` (it spent the emergency, refilled, died again).

The budget gate (`compact_memory.ts:422-440`, `count >= cap` → refuse unless
`count === cap && emergency`):

- CROSS at `count == cap`: allowed ONLY with `emergency: true` — and that
  consumes the target's one emergency (count → cap+1), after which the target
  itself can never self-rescue.
- CROSS at `count == cap + 1`: **REFUSED** ("the budget is fully exhausted").
  The planner has no rescue path left; the only option is handover + a fresh
  session (the expensive path — full re-derivation).

The maintainer's parenthetical bounds the design: tracking who-spawned-whom is
too much managerial effort — the fix must need NO per-caller tracking.

## Design (parts independently approvable)

**Part 1 — the caller-scoped override (core).** A CROSS call (the target
`sessionID` ≠ the calling session `c.sessionID`) gets an effective cap of
`cap + 1`:

- `isCross = explicitID != null && sessionID !== c?.sessionID` (both already
  resolved at `compact_memory.ts:384-391`).
- `effCap = isCross && cap >= 1 ? cap + 1 : cap` — CPU targets (cap 0) stay
  denied for EVERYONE (the safety invariant).
- Gate: allow when `count < effCap`; at `count == effCap` the `emergency` arg +
  `emergency_budget >= 1` still applies (count → effCap+1); above that: refuse.
- The SELF path is UNCHANGED (self still: cap + one emergency, then exhausted).
- NO store-schema change — the shared `count` tracks it, exactly like the
  EMERGENCY-1 item (2026-09-24).

Why this is caller-scoped by construction (no tracking): a SELF call can never
compact at `count == cap + 1` (the self emergency fires only at exactly
`count == cap`), so the extra slot (`cap+1 → cap+2`) is reachable ONLY through
a cross call. The target's own budget is never silently enlarged — the extra
compaction exists only because a different session initiated it, and at most
ONE such override ever lands per target (a second cross at `count == cap+2` is
refused). Cross callers may still use the `emergency` arg at `count == cap`
(accepted, same store state as the now-arg-less cross pass — no
double-consumption; `count` is the single source of truth).

Net per-target totals: self-only sessions reach `cap + 1` (unchanged); a
rescued session can reach `cap + 2`; `count > cap + 1` = genuinely exhausted →
handover + fresh session (the correct terminal state, preserved).

**Part 2 — description + docs.** One sentence in the tool description
(`compact_memory.ts:348`): a cross caller (target ≠ calling session) gets one
extra compaction beyond the target's cap+1 — the caller-scoped override,
reachable only via a cross call, CPU targets still denied. Doc updates riding
the build commit: the `compaction_core.ts` budget header comment, the AGENTS.md
Compaction Guidelines "Budgets" block (STAGED copy for his paste — the
AGENTS.md live-file protocol), and the planner-prompt budget line (cross caller
= +1 beyond the cap).

**Part 3 — audit (optional).** When a dispatch consumes the override slot
(pre-dispatch `count == cap + 1`), the verified-success COMPACT line
(`compaction_core.ts:319-332`) gains one token — e.g. `ovr` next to the existing
`emergency` suffix — so the ctx.log + budget file together show WHO-spent-what
without any caller tracking.

**Part 4 — smoke + probe.** New pins in
`compact_memory.smoke.mjs` (the existing gate block, ~line 422, `Gate-M` cap 2):

1. CROSS at `count == cap`, NO emergency → dispatched (new effCap behavior).
2. CROSS at `count == cap + 1`, `emergency: true` → dispatched, count → cap+2
   (the override).
3. CROSS at `count == cap + 2` → refused, names the override as consumed
   (fully exhausted).
4. SELF at `count == cap + 1` → refused (regression — self unchanged).
5. CROSS on a CPU target (cap 0) → refused (the safety invariant holds).

Refusal-response text updated accordingly; probe re-pin if the compact section
pings the gate wording. Live acceptance = his domain: the next real
cross-override dispatch (COMPACT line + budget count cap+2 in
`compact_budget.json`).

## Pushback (before refinement)

His option (a) — "the limits do not apply" for cross (fully exempt) — I
disagree with: an UNBOUNDED cross compaction invites a compact → refill →
compact loop on a worker that keeps dying at the wall (each cycle costs a
same-model flush + a full re-prefill, ~3-4 min, and nothing in the loop breaks
the cycle — the planner's own stop-line logic compacts, so an auto-resume-driven
planner could keep rescuing a session that never recovers). Option (b)
("raised by one temporarily") keeps the exhaustion invariant intact while
covering the real rescue case from BOTH death states (count==cap via the plain
cross pass, count==cap+1 via the override). **Recommendation: approve Part 1 +
2 + 4 as one unit; Part 3 in or out your call** (audit token only, zero behavior).

## Acceptance

- Smoke: the existing 82/82 pins + the ~5 new gate pins green; no other smoke
  touched; probe re-pinned green.
- Invariants preserved: denial has zero side effects; CPU cap 0 denied for all
  callers; increment-on-success only; the budget store schema unchanged.
- Live acceptance pending a real cross-override dispatch (his domain).

## Status

APPROVED 2026-09-30 (maintainer ruling in the comment below — option (b)
with the cap clarification: the cross spendable total ≤ model_budget +
emergency_budget, "the same as when self-compacting" → Part 1 ADJUSTED: the
cross total is cap+1, NO second slot at count==cap+1; Part 3 EXCLUDED — no
ruling). Build spec:
`agent/handover/specs/2026-09-30_compact-memory-cross-override.md` (TODO
#128), queue order after #127. The verified-fact correction (cap-0 self
emergency is ALREADY allowed today — the "CPU denied for all" line was
inaccurate) is recorded in the spec. Part 3 INCLUDED per his live comment
(2026-09-30: "part 3 can be implemented as well") — the spec carries it.

comment:
in favor of Option (b) ("raised by one temporarily"). "the limits do not apply" might have been adressed to model_budget. but to keep in in line only up to model_budget + emergency_budget can be spend via cross. the same as when self-compacting.

comment: part 3 can be implemented as well.

## Verdict (2026-10-01, plan3 bookkeeping)
LANDED (2026-10-01, #128 worker, code 5c1af35): the `isCross`/`effCap` gate
(emergency branch SELF-only — the cross spendable total = cap+1, no second
slot at cap+1) + the Part-3 `ovr` budget token + Part-2 worker-part docs;
compact_memory smoke 89/89 (82 + 7 pins), probe 352/352 (S13/S32 cross-shape
pins re-pinned), all 11 smokes green. Planner-verified (spot re-run
compact_memory 89/89). Live acceptance pending: his next real cross-
override dispatch (the `ovr` token on the budget line is the detector) +
the AGENTS.md Budgets paste (staged at the repo root
`AGENTS_pending_2026-10-01.md` — his domain).
