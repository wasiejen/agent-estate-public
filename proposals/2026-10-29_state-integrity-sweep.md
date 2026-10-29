# State-file integrity — closure in headers + summary fabrication guard (#228)

Status: awaiting approval. Two parts.

## Intention
Make the bookkeeping files safe to read *out of order*: a maintainer
grepping `TODO.md` headers, or a fresh session rebuilding from a closing
summary, must not be misled.

## Part A — closure state lives in two places
- Evidence (measured 2026-10-29, this session): a header grep
  `(OPEN|PENDING|HELD)` reports #230/#231/#235/#240 as OPEN although their
  status lines say CLOSED — the worker-era closures updated only the status
  line, and pass-4-era closures updated only status lines too. My own
  digest build needed a status-line pass to get the truth.
- Options:
  1. **RECOMMENDED — normalize headers: `## #N. (CLOSED <date>, …)`** for
     closed entries, one-time sweep of the ~10 inconsistent headers, and a
     `handover_probe.mjs` check asserting header/status agreement
     (header first token ∈ {OPEN, CLOSED, LANDED, HELD, PENDING-CURATION,
     DEFERRED}). Free surface, cheap, self-enforcing afterwards.
  2. Keep status lines authoritative, fix only the docs convention
     (`AGENTS.md` §TODO Ownership note) — no sweep; header greps stay
     unreliable.
  3. Move closed entries to `todo_records.md` immediately (contract already
     names that file) — cleanest reader view, but loses in-place history and
     costs more sweeps.

## Part B — closing summaries carry fabricated references
- Evidence: TODO #228 (plan37 summary invented hashes/closure claims);
  recurred in this session at wake-12/13 (invented fork paths, invented
  mini-pass) — caught only by `git show` / file-state checks. Knowledge
  entry KP-50-class + planner memory entries exist; the guard is manual.
- Options:
  1. **RECOMMENDED — machine-check the summary channel:** extend
     `handover_probe.mjs` (it already gates handover files, 115 checks) with
     a check that every `git <hash>` token and every `#N` closure claim in
     the newest `plan*_summary.md` resolves against `git log` / TODO status
     lines. Red = fix the summary before committing it.
  2. Prompt-only rule (planner prompt = PAID, cache cost, weakly enforced).
  3. Accept it; rely on the reader verifying.

## Acceptance
- A: header grep alone gives the true open set; probe check fails on a
  deliberately inconsistent header (negative control).
- B: probe fails on a summary citing a nonexistent hash (negative control);
  the wake/close flow runs it before the closing commit.
