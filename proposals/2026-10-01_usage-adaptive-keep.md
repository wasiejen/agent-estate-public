# Proposal — usage-adaptive keep at compaction (Magic Context candidate 1)

Date: 2026-10-01 (planner-9, autorun looprun autorun-2026-10-01_03-27).
Status: draft — awaiting maintainer decision.
Source: candidate (1) in `agent/research/2026-10-01_magic-context-plugin.md`
(§Adoption implications; their protected-tail formula, `historian.md`
"Protected-tail boundary").

## Problem

Our keep at compaction time is STATIC per call: `keepMessages` (a message
count) or the #99 computed keepTokens (the provider-token mass of the
last N messages). Both are independent of how full the window is — so a
compaction fired at 60 % usage and one fired at 90 % keep the same
absolute mass, and a near-full session keeps the very raw history that
slows its remaining generation (the ~2-3x slowdown as context fills is
the measured double cost: it eats the window AND slows every token
after it). Their scheme sizes the never-summarized tail as a function of
usage: `N = clamp(round(usable × 0.3 × (1 − usage)), floor, ceiling)` —
floor 8 % of usable (bounded 2,000–12,000), ceiling min(96,000, 40 % of
usable, usable − headroom reserve). Near-full sessions keep less raw
history by construction, leaving headroom for in-turn growth.

## Design

Scale our keep computation by the same factor — additive, config-gated:

- **Part 1 (the formula):** in the keep computation of the compact path
  (the #99 `computeKeepTokens` in `compaction_core.ts` + the keepMessages
  fallback), an optional usage-adaptive clamp: when enabled, the keep
  budget is capped at `usable × K × (1 − usage)` (K a config constant,
  default 0.3 per their formula; floor/ceiling config or their
  8 %/2,000–12,000 bounds as the starting values), computed at dispatch
  time from the gauge-known usage (the same ratio the auto_resume
  nudge leg already resolves per call). The floor guarantees the
  post-compaction protocol's re-read head never starves (the 6-message
  floor of the tail rewrite is a DIFFERENT guard — unchanged).
- **Part 2 (config + docs):** an optional key in `compact_budget.json`
  (absent = today's static behavior — zero drift until enabled), the
  probe gate pins re-derive the machine-computed keep values (the
  #99 pin style), the gauge/core docs one-liner.

## Acceptance

- compact_memory smoke: the adaptive clamp pins (a disabled = byte-identical
  to today's keep; b enabled at 60 %/90 % usage fixtures → the capped
  keep, machine-recomputed; c floor hit at a near-zero budget).
- Standard gate green (probe 355/355 + all 11 smokes); with the config
  key absent, every existing keep pin stays byte-exact (the no-drift
  guarantee is a PINNED fact, not an assumption).
- Live acceptance = his: enable the key + one real compaction.

Effort: **M** (one formula + clamp in the keep path + config + pins;
no new surface, no fork — the usage ratio is already resolved per call
by the auto_resume nudge leg).

## Recommendation

GO (Parts 1+2 as one worker unit), config key OFF by default — the
build changes zero observable behavior until he enables it, so the
approval call is about the feature itself, and the live acceptance is a
one-line config flip followed by a real compaction. It is the only
Magic Context candidate that attacks our measured speed cost (context
fill slowdown) at its source, reuses per-call machinery that already
exists, and composes with the pending keep-N surface proposal
(`2026-10-01_explicit-keep-N-surface.md`) — the adaptive formula sets
the default, the keep-N surface is the explicit override.
