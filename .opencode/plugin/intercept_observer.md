# intercept_observer.ts — the 5.3/5.4 intercept observer (+ intercept_observer_core.ts)

Lane 5.3 (log-only observer) + 5.4 (read-scoped fuzzy resolution), approved 2026-09-16; design source: research `2026-09-16_fuzzy-and-numword-tool-reliability.md` §2 + addendum C6/C7.

## What it does

A SEPARATE plugin (maintainer ruling — functionally separate from `ctx_watchdog.ts`) with a `tool.execute.before` hook active for ALL tools. It observes and LOGS suspicious dense-digit / numword / redundancy / path anomalies, and mutates PATH args ONLY under strict gates — it NEVER blocks, and both outcomes are always logged.

## Implementation sketch

- Entry: DEFAULT-ONLY factory export (the loader normalizes `Object.values(module)` — every value must be a function; a named export = `Plugin export is not a function` at load — the 2026-09-16 export fix).
- The pure core `intercept_observer_core.ts` (types, constants, regexes, pure functions, the fuzzy matchers, the 12 VERDICTS — byte-identical vocabulary); never loaded by the host loader directly.
- Channels (one line each — details in the header + the research doc):
  - OBSERVE: log suspicious args to `.opencode/temp/intercept.log` (8-field pipe-separated line shape; never mutates, never blocks — the incident data stream is its value, C7).
  - PAIR (R1 + write-scope R2a): `[left:right]` pair resolution on read/write path fields — right-wins canonical, strict existence gate (mutate only when the canonical EXISTS and the pair form does not); the other string fields log-only (mutation is scope, not grammar — `args[1:one]` collides with the python slice form).
  - FUZZY (R1 read / R2b write): Levenshtein over the bounded corpus — read d<=2 gap>=2; write d<=1 (`scope=write` evidence); the `write` tool is EXCLUDED from write-fuzzy (M1, #72 — "new file" is a legal write intent).
  - GIT REFS (R2c, bash `command`): pair → digit (right-wins), gated on ref existence via `git for-each-ref` (NOT rev-parse — measured 2026-09-17); mutation all-or-nothing across the command's pairs.
  - EDIT (R6 + the mutating edit-fuzzy, #95/#106): edit only, on the EFFECTIVE args — exact-1 `oldString` silent; >1 → `edit-ambiguous`; 0 → the mutating edit-fuzzy matcher (exactly-one candidate d<=1 → `fuzzy-edit applied`) or the R6 content-locator HINT (`edit-hint` / `no-candidate`); outcome tokens `applied`/`rejected` (#106). NEVER auto-retries.
  - R3 ARG-SCOPE (2026-09-26): the field-parameterized channels — the bash QUOTED-FORM pair channel, the block_transfer ANCHOR-marker channel (owned by R3, never by the path channels), the glob/grep pair channel.
  - R8 REDIRECT (#97, 2026-09-25): the 1:1 allowed-root redirect for out-of-sandbox TYPED path fields + bash command spans (allowed roots resolve ONCE at init from opencode.jsonc; one `kind=redirect` line per mapped span; a fuzzy-resolved in-sandbox path is never redirected).
  - JOURNAL (R6, 2026-09-25): EVERY write/edit/block_transfer appends ONE line to `.opencode/temp/journal_write.log` / `journal_edit.log` (best-effort, NEVER fails the call; the payload is JSON; the journal's edit `old` field is the ORIGINAL pre-mutation oldString — the recovery fallback).
  - AFTER-HOOK: `tool.execute.after` appends the stored hint line to the result's `output.output` (per-callID cache, TTL 10 min, cap 100 FIFO, consumed once — the log-only fallback always stands).

## Gotchas / lessons

- FAIL-CLOSED everywhere (addendum C6: conservative + both outcomes logged) — a gate mismatch mutates NOTHING and lets the honest error surface.
- HOUSE RULE: best-effort, never-throw (any internal error → at most ONE `intercept-error`-style line, the hook returns silently).
- SINGLE NUMWORD MAP HOME (C3): the plugin reads `.opencode/agent/scripts/numword/numwords.json` at start (NO embedded second copy); a failed read silently disables only the numword checks.
- The mutation surface is PATH fields ONLY — content / oldString / newString / buffer fields are observation-form.

## Tests

`tests/intercept_observer.smoke.mjs` (from section (12f) on the module state points at proj2 — only `before2`/`read2` may be used; the header note).
