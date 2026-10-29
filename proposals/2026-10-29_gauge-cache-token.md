# `ctx_gauge` cache-state token (#236)

Status: awaiting approval. Small unit, free surface (tool text only).

## Intention
Make the one decision that costs real money visible in the signal you
already read: whether the next write to a PAID surface will force a full
re-prefill or ride the warm cache. Today that state is inferred from the
gauge delta or from reading provider rows by hand.

## Problem
- PAID surfaces (`AGENTS.md`, role prompts, destill, tool schemas) bust the
  prompt cache on every save when the session is WARM — measured 216,703
  input tokens with `cache.read=0` on a cold turn vs 92-498 input with
  200-215k `cache.read` when warm (`agent/knowledge/knowledge_context.md`
  KC-11, MEM-0142).
- `ctx_gauge` prints `SESSION=… CTX=… (…%) REM=… ROUND=…` — no cache state,
  so the batch-or-park decision is made blind (`agent/scripts/db/` lanes
  exist but cost extra calls).

## Options
1. **RECOMMENDED — append `CACHE=warm|cold`** to the gauge line, read from
   the last finished step's provider row (`cache.read > 0` → warm). One
   token, ~15 B of tool description; worker/doc text states "read the last
   request's `cache.read`". Cold = land all PAID edits at once; warm = park
   in a free channel.
2. Print the numeric `cache.read` value instead (`CACHE=read=215,123`) —
   more informative, slightly more bytes, same mechanism.
3. Leave it; keep the manual sqlite lookup (`agent/scripts/db/` lanes).

## Acceptance
- Correct on both states: one warm session and one fresh session each show
  the matching token, verified against the provider row in the same call.
- Smoke/pin coverage: one gauge pin updated; description delta ≤ 40 B.
