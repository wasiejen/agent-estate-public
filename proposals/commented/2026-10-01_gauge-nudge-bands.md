# Proposal — usage-band nudges on the ctx line (Magic Context candidate 4)

Date: 2026-10-01 (planner-9, autorun looprun autorun-2026-10-01_03-27).
Status: draft — awaiting maintainer decision.
Source: candidate (4) in `agent/research/2026-10-01_magic-context-plugin.md`
(§Adoption implications; their `{U, T}` nudge bands, `docs/architecture/
nudges.md` — quiet <0.20 / gentle ≥0.20 / firm ≥0.40 / urgent ≥0.60 /
Channel 2 at ≥0.75 and U ≥50k, one-shot with re-fire gating).

## Problem

Our passive ctx-line nudge (auto_resume Unit 2) is a single late ladder:
silence below 0.95, then "self-compact now (ratio=…)" at ≥0.95 and the
`--maintainer`-flagged line at ≥0.98. The whole 80–95 % zone — where the
planner's triage rule already says "estimate the remaining calls, stop
at the last checkpoint and compact if the unit won't fit" — is silent in
the passive channel; the rule lives only in the prompt and is only as
reliable as the session's memory of it near the stop line (exactly where
gauge lag + context rot make the estimate optimistic by construction).
Their scheme's lesson: EARLY deterministic bands, one-shot, stating what
is droppable — the timing pressure is the plugin's, the keep decision
stays the agent's.

## Design

Additive rung(s) on the existing per-call nudge leg (the ratio, the
config read, the scope gate, and the one-shot-per-busy-cycle dedup all
exist):

- **Part 1 (the triage band):** a config-gated rung at a low ratio
  (default 0.80, matching the prompt's triage threshold): when met and
  no higher rung has fired this busy cycle, the ctx-line suffix gains a
  gentle line — "triage line: estimate the tool calls left in the
  current unit; if it will not finish, stop at the last checkpoint and
  compact before starting the next." One-shot per busy cycle (same
  dedup semantics as the existing nudge); the 0.95/0.98 ladders are
  unchanged and still beat it (highest rung met fires).
- **Part 2 (config + docs):** a key in `compact_budget.json` (absent =
  no line — today's behavior, zero drift; present = the threshold
  value), the auto_resume.md units table line + a knowledge one-liner.
- **Follow-up (NOT in this build):** their richer `{U, T}` droppable-mass
  variant — per-message token mass from `context_trim report` feeding
  "how much is droppable, which are the oldest heavy outputs" — a
  separate S–M unit once this base rung proves useful.

## Acceptance

- auto_resume smoke: the new rung pins (band met + no higher rung → the
  gentle line once per busy cycle; a higher rung met → only the higher
  line; config key absent → the line never appears; Direct/scope-none →
  suppressed by the existing scope gate).
- Existing pins unchanged (auto_resume 155/155 stays green); standard gate
  green (probe 355/355 + all 11 smokes).
- Live acceptance = his restart + one watched session crossing 0.80 %.

Effort: **S** (one band comparison + one line template + config + pins on
a leg that already resolves the ratio and the config per call).

## Recommendation

GO (Parts 1+2 as one small worker unit), config key absent by default —
zero observable change until enabled, so the call is about the new
prompt-visible line itself (per the research doc's borderline note), and
the live acceptance is a config flip + one crossing. It codifies the
existing 80 % triage rule into the passive channel at exactly the point
where prompt-memory is weakest, without touching the late ladder.


--comment: need feedback
- need information first what our current nudges actually do show and what the settings in the compact_bugget.json actually control:
-  "autoCompact": true,
  "saturationThreshold": 0.85,
  "outputReserve": 0,
- i was of the opinion that this controls when the nudges start. so at these settings above at 85%
- not sure how much this crosses with the already existing functionality. also i have not seen any real problems with compaction ignored on close to context limit anymore.
