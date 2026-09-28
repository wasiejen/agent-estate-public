# Worker summary — plan31 unit 2: TODO #106 — edit-hint / edit-fuzzy outcome tokens (worker-31)

## What changed

One verified unit (code + pins — the probe can only be green with both),
all in this session's final commit (hash recorded in the planner's
follow-up bookkeeping commit, per the spec):

1. **`.opencode/plugin/intercept_observer.ts`** (the settled design, no
   re-derivation — the evidence strings are the single source; the log
   line and the delivered hint share them):
   - **APPLIED**: the mutating edit-fuzzy evidence is now
     `fuzzy-edit applied orig=<t40> len=<n> d=<0|1> value=<t40>` (the
     token right after `fuzzy-edit`), and the after-hook now STORES +
     DELIVERS this line on the (successful) tool result — the delivered
     edit-hint line is no longer failure-only (the old
     `hint.verdict !== "fuzzy-edit"` store gate at the former
     L1457-1459 is gone — every hint outcome is stored).
   - **REJECTED**: every fail-closed / ambiguous hint evidence now
     carries `rejected` right after `hint` (same shape otherwise):
     `hint rejected lines=<starts…>`, `hint rejected line=<n> d=0
     gap=inf snippet=<…>`, `hint rejected line=<n> d=<d>
     gap=<g|inf> snippet=<…>`, `hint rejected lines=<n1,…>`,
     `hint rejected cands=<…>`, `hint rejected reason=<…>[ best-d=<d>]`.
   - Header doc block (5) + (6) + the `runEditFuzzy` / `onToolAfter` /
     `onToolBefore` comment blocks updated (doc-only).
   - NO verdict-table change (the core `VERDICTS` list + counts stay —
     the `fuzzy-edit` VERDICT is unchanged; the token is evidence-only).
     `locateContent` / `resolveEditOldString` untouched.
   - `intercept_observer_core.ts` untouched (the hint construction lives
     in the wrapper's `runEditFuzzy` — the spec's core-file mention did
     not apply; see "spec/code disagreement" below).

2. **`.opencode/plugin/tests/intercept_observer.smoke.mjs`**: the
   R6/edit-fuzzy pins re-pinned ((10e)/(10f)/(10g)/(10h) + (11a)–(11f));
   **ONE new check (10h2)**: a mutating edit-fuzzy delivers the
   `fuzzy-edit applied` line on the (successful) tool result (consumed
   once). Smoke total 77 → 78.

3. **`.opencode/plugin/probes/handover_probe.mjs`**: re-pinned byte-exact
   — S26 checks 271–276, S27 checks 277–284, plus S20 check 203 (the
   content-scope-guard edit pin OUTSIDE the S26/S27 sections — it also
   carries a `hint …` line and was found by the spec's grep scope).
   Check count UNCHANGED → the header tally stays 346 (re-pins only, no
   new checks). S26/S27 section headers + the header summary shape lines
   updated (doc-only).

## Measured verification (gate green)

- intercept_observer smoke: **ALL PASS (78/78)** (77 baseline + 1 new check).
- Full probe run: **346 checks = 335 PASS + 11 FAIL** — the 11 are the
  pre-existing ENVIRONMENTAL numword-python failures 136–146 (#113:
  missing `python312` interpreter), NOT regressions. The probe
  self-annotation agrees (346).
- All other smokes unchanged: auto_resume 140/140, compact_memory 78/78,
  context_recovery 17/17, block_transfer 131/131 + sandbox 64/64,
  gauge_core ALL PASS, ctx_gauge 3/3, loop_log 69/69, submit 23/23.
- ruff F=0 (`./.venv/Scripts/ruff.exe check --select F .` → "All checks
  passed!").
- pytest UNRUNNABLE (#113) — not attempted, per the spec.

## Spec/code disagreement (recorded per the contract)

None on behavior — but one scope note: the spec/TODO suggested scope
names `intercept_observer_core.ts` "the hint construction"; the hint
evidence strings are actually built in `intercept_observer.ts`
(`runEditFuzzy`), and the core file needed no change (the verdict table
and locators are untouched by design). The spec's own change list
agrees — the core file was not touched.

## Edge case (per the spec — recorded, not hidden)

A stored fail-closed hint + a SUCCESSFUL edit can only co-occur on a
between-hooks file race (fail-closed ⟺ 0 raw occurrences at before-hook
time). If it happens, the delivered `hint rejected …` line next to a
success is the VISIBLE race signal (exactly the #106 pain, now
detectable) — no special-casing was added.

## Observed detail worth knowing (not a defect)

The DELIVERED hint carries the RAW evidence string: for a MULTI-LINE
oldString the delivered `fuzzy-edit applied` line contains real
newlines/CRLF (pinned byte-exact in probe 283:
`orig=alpha one\nbeta two\ngamma three … value=alpha one\r\nbeta two\r\ngamma three`).
The LOG line of the same call is the FLATTENED one (newlines → spaces —
pinned in probe 277/284). Both derive from the same evidence string;
flattening happens at log-write time. Any future multi-line pin must be
taken from the actually delivered output.

## Live acceptance / canary caveat

Standard caveat: the tokens are observable in intercept.log + on tool
results of any later edit, but the RUNNING opencode process loaded the
plugin at startup — the new line forms take effect from the next
process restart (no other restart dependency). The smoke/probe pins
exercise the module directly and are the machine-verified evidence.

## TODO entries

- `TODO.md` #106 → LANDED (status line updated; the commit hash is
  recorded in the planner's follow-up bookkeeping commit — a worker
  commit cannot carry its own hash, per the spec).

## Deliberately NOT done

- The pair/fuzzy/segment channels, the R8 redirect notes, the journal,
  `locateContent` / `resolveEditOldString` internals, auto_resume,
  compact_memory, the gauge family, the FST code, `.opencode/maintainer/**`,
  the #114 gauge.mjs change (12e3262) — all untouched per the DO-NOT-touch
  list.
- pytest not attempted (#113).

Lessons: the delivered after-hook hint preserves the RAW (unflattened)
evidence string while the log line is flattened at write time — byte-pins
for multi-line oldStrings must be taken from the actually delivered
output (probe 283 re-pin).
