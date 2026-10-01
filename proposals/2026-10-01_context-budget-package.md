# Proposal — context budget package (the unit-3 per-message filter as core)

Date: 2026-10-01 (planner-9, direct session ses_f0999d65dffeFxiJylRzecRbhu).
Status: draft — awaiting maintainer decision.
Source: the design exchange (this session) regrouping three commented
proposals — `2026-10-01_explicit-keep-N-surface.md` (U0, its P1+P2 already
approved there), `2026-10-01_usage-adaptive-keep.md` (parked; its self-marker
idea → U3, its informed-default idea → U1), `2026-10-01_gauge-nudge-bands.md`
(U4) — plus the maintainer's 2026-10-01 rulings: **no destructive DB
actions** (the filter is a fork change), one config key per nudge rung, a
build/swap bat for the fork unit, and the session-dump update per filter
change.

## Problem

1. **Compaction is slow and uncontrolled**: 3–4 min per compaction (backend
   prefill of the compaction model's session + a RAM cache checkpoint), a
   static keep (the agent's explicit keep is the only lever at dispatch; the
   auto-at-cap keep is blind), and the head is always summarized (the raw
   session start leaves the window).
2. **No informed keep choice**: choosing a boundary is a heavy
   report → find-id → tail round trip; there is no cheap "what would I keep
   / drop" read.
3. **Budget policy is static prompt text**: the 80/90/95 ladders live in the
   prompts — exactly where prompt memory is weakest (near the stop line,
   gauge lag + context rot make estimates optimistic by construction).
4. **No fine-grained control**: dropping one heavy read / webfetch requires a
   whole-head summary (loses all surrounding raw context, including the
   session start).

Measured mechanics the build rests on (verified 2026-10-01):
- The window is re-derived from the DB at every step (zero restart, zero
  invalidation — plan36 research; `context_trim tail` live-accepted).
- The compaction **marker quartet** = compaction user row (part
  `{type:"compaction", tail_start_id}`) + first assistant row after it with
  `info.summary` + the tail target (host guard message-v2.ts:568; mirrored in
  our `context_trim.ts`); the retained slice =
  `result.slice(tailIndex, compactionIndex)`.
- The assembly skip channel for the filter = a host-side change (fork) — the
  DB stays untouched (reversibility by construction).

## Design (independently approvable units; suggested order)

### U0 — keep-N surface (S, plugin; P1+P2 already approved in the source
proposal)
- A `keepMessages` argument on `context_trim` `tail` mode (mutually exclusive
  with `target`), delegating to the existing pinned `tailSetKeep` core export
  (validation + rejections already exist: keep-invalid, keep-exceeds-
  history, floor 6, no-completed-compaction, session-not-found).
- The keep form is primarily a **shrink lever** (the emergency-keep=18 fix
  case); growing stays available, documented as "you are re-reading raw
  messages you no longer remember" (nothing is lost — the DB keeps them; the
  report restores the knowledge). keep=0 stays rejected by the floor (the
  post-compaction protocol needs a raw tail); at dispatch keep=0 already
  exists (the 25.8k floor).
- Acceptance: tool-surface keep-form pins (valid → the `tail=` line identical
  in shape to the messageID form; rejections → no DB write); existing pins
  unchanged; standard gate green.

### U1 — the recommendation leg (M, plugin, on `context_trim report`)
- A cut-down, token-efficient report form: **numbered rows** (1..N from the
  window start; the plugin maps number → messageID internally — the agent
  never types dense ids), **tool-target detail only** (read filePath / bash
  command / webfetch url — the report already carries it), `last: N`.
- A **recommendation block**: **3 retention options — low / medium / high —
  each anchored at a messageID** (stable across pre/post-compaction
  deliberation), each with the **read / thought / shell mass split** of what
  would be retained vs dropped + the **oldest-kept message's one-line hint**.
- A **biggest-droppable list**: top-N heavy finished turns / call-result
  pairs (turn number + mass) — the target list for U2.
- Acceptance: byte-exact pins, machine-recomputed (the #99 pin style);
  the full report stays available (the cut-down form is the cheap default).

### U2 — the per-message context filter (L, FORK — the core of the package)
- **Fork change**: context assembly (message-v2.ts) consults a per-session
  filter — messages toggled OFF are skipped from assembly. **Non-destructive:
  the DB is never touched** (reversible by toggle-on; the host guard's
  quartet / last-turn protection is enforced at the plugin's write time —
  fail-closed validation mirroring the plan36 safe zone: never the current
  last turn, never the marker quartet rows).
- **Filter state** (maintainer ruling 2026-10-01: DB, not a file — the
  canonical location, works for later-retrieved sessions): a small JSON
  field on the existing message row's `data` blob (e.g. `data.included:
  false`) — NO schema change, no new table; a non-destructive additive
  annotation (same class as the live `context_trim tail` in-place JSON
  field edit). Mainline opencode ignores unknown blob fields (key access,
  no schema validation — the field is inert outside the fork); fork smoke
  pins the spread-survival caveat (`updatePart` `{...part}` preserves it).
- **Plugin surface**: `context_trim filter <session> <targets…>` (toggle
  on/off by U1 row numbers — per finished turn or per call-result pair) + the
  report shows the filtered state.
- **The build/swap bat for the maintainer**: one script that runs the bun
  build in the fork (`home\Repos\opencode`) and replaces the
  installed exe — he runs it; the unit is not live until his run.
- **Session dump update on every filter change**: ONE current dump file per
  session (the DB is not destructively changed, so a single updated dump
  suffices — no `_c<N>` version chain needed for filter changes).
- **Fallback (documented, NOT built)**: if the fork fails or is too much
  hassle → the destructive safe-zone drop channel (plan36 §5 — complete
  finished turns + per-part from old assistant rows, tombstone archive)
  reconsidered as a separate proposal.
- Acceptance: fork-level smoke (toggle OFF → the assembly excludes the
  message, the guard passes, toggle ON → full restore, quartet/last-turn
  targets rejected fail-closed); plugin-surface pins; the bat script verified
  by his run; standard gate green after the exe swap (probe + all 11 smokes
  re-measured on the new build).

### U3 — marker compaction, the cap backstop (S–M, plugin)
- A `compact_memory` mode: the agent writes the summary itself (compaction
  style, the current model, at its chosen moment — we have the original
  prompt) + a boundary; the tool writes the **marker quartet** via sqlite
  (same access `context_trim tail` uses) and runs the FULL protocol: budget
  increment + ctx.log COMPACT line + the session dump + queued-message
  relay. It **consumes one budget compaction** (it is a compaction — pacing
  stays; no infinitely running session).
- The window re-derives at the NEXT STEP (zero restart — his restart step is
  unnecessary; live-verified by the landed `tail`).
- Role: the cap / full-window case — when the filter (U2) can't free enough
  mass (many medium-weight messages) or a summary handover is wanted. The
  vanilla host compaction stays as the auto-at-cap path.
- Acceptance: fixture-DB pin (write the quartet, the guard passes, the window
  re-derives) + one live throwaway-session test.

### U4 — nudge policy reframe (S, plugin)
- **ONE CONFIG KEY PER RUNG** in `compact_budget.json` (absent = that rung
  off — zero drift until enabled): `nudge_triage: 0.80`, `nudge_stop: 0.90`,
  `nudge_emergency: 0.95`, `nudge_maintainer: 0.98` (names/values adjustable).
- The **triage rung's line carries the recommendation one-liner** (the U1
  options in compact form: "options: keep from 214 ≈42k | 180 ≈68k | 120
  ≈120k; drop turn 14 (≈18k read)").
- The prompt's static 80/90/95 ladders are **mostly replaced** by these live
  nudges; the prompt keeps only the SEMANTICS (what a rung means to do) as
  fallback for Direct/suppressed sessions (the nudge is suppressed there by
  the existing scope gate).
- Acceptance: one pin per rung (band met + no higher rung → its line once per
  busy cycle; higher rung beats it; config key absent → never; Direct →
  suppressed); existing pins unchanged; standard gate green.

### Suggested order
U0 (S, approved) → U1 (M) → U2 (L, the long pole — the core) → U3 (S–M) →
U4 (S). U0/U1/U4 are independent plugin work and may land around U2 in any
order the maintainer prefers.

### Parked
- **Adaptive-keep formula** (source proposal 1): parked — the informed
  choice (U1) supersedes the blind adaptive default; revisit only if the
  auto-at-cap keep proves bad in practice.
- **Destructive drop channel**: fallback only (the U2 fallback note).
- The session-dump versioning observation (the `_c<N>` files duplicate
  pre-compaction content; dump-restore only works under the window) — noted,
  no action (TMI per the maintainer).

## Cross-cutting notes
- The unit-naming collision across plugins (auto_resume units vs context_trim
  units vs the auto-resume proposal units) — candidate for the next docs
  pass (NAP-only here).
- `compact_memory.message` relay (auto_resume revival branch) stays as
  recovery machinery — mid-session trims/marker-compactions need no resume
  message (the session continues unbroken); expect rare use.

## Status
Awaiting approval. U0 already approved in the source proposal; U2 = fork →
effort L acknowledged + his bat-script run is the live gate.
