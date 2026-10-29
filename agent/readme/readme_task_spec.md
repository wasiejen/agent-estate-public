### Task-spec discipline — reduce scope, not research
- **Decompose before delegating:** one task = one focused change. Give it
  ONE goal and a measurable definition of done. A build spanning several
  layers or files is a LIST of ordered tasks, never one big spec. Each task
  must be completable and verifiable in a comfortable fraction of the
  worker's context.
- **Never mandate broad research in a spec.** A shape demonstrated in the
  repo is a build-on reference: a maintainer prototype, existing code, or
  a committed reference file. The spec then says "build on that shape" —
  never "verify the SDK from the npm type defs". A verification step is
  either small + bounded (one named file, one question) or a separate
  task. Extensive re-research of settled facts is what burned the previous
  worker run (5–6 context cycles, zero work done).
- **The spec is a contract, not an essay:** exact scope, exact DoD
  (measurable end states — probe count, grep-clean, byte-exact format),
  and an explicit **DO-NOT-touch** list (including the maintainer's live
   files and anything under `maintainer/`). Pin the WHAT and the end
  state. The HOW is the worker's call inside the DoD.
- **Spec size is context.** Keep specs short (usually < 100 lines). Every
  spec line competes with the work for the worker's window.
- **Order + green state:** order tasks so each one leaves the repo green.
  Write each spec against the just-verified state (fresh line numbers /
  reference sets / baselines). COMMIT the spec BEFORE the launch — a spec
  is never launched uncommitted.
- **Spec wave (approved 2026-09-24, maintainer ruling — recommended
  method):** when context allows, pre-write a QUEUE of committed specs as
  MULTIPLE files (e.g. `handover/specs/` + a README naming each spec +
  the queue order) instead of one spec at a time. Each spec still follows
  every rule above (committed before launch, written against the
  just-verified state). The launching planner — fresh or post-trim —
  launches from the committed files. Rationale: generating many specs at
  once is cheaper than re-deriving them later; adapting a committed spec
  costs less context than re-deriving it for the next or a trimmed
  planner. Use it after a design session that settles a multi-item build.
- **Tool-surface files edit via scratch copy + ONE live apply (2026-10-28 ruling):**
  files whose parts sit in the live system prompt (plugin/tool exports,
  prompts, destill memory) hot-reload on save; every live edit busts the
  prompt cache for ALL live sessions (measured: 9 full re-prefills in one
  worker run). Specs for such files MUST mandate: develop on a scratch
  copy, apply the final content to the live path in ONE write per
  checkpoint, never piecemeal live edits.
- **The rule covers planner-direct edits too (2026-10-29 correction):**
  multi-region prompt/doc edits assemble on a scratch copy (copy the live
  file, apply all regions there, verify), then ONE live save — sequential
  `edit`/WRITE calls on the live file each cause a separate re-prefill
  (measured: 5 busts in one planner-prompt pass).
- **Claims in a spec are the planner's verified facts** — measured at
  spec time. They are not assignments for the worker to re-derive.
- **Flag behaviour-pinning tests explicitly.** The spec's verified-facts
  section names the existing tests that pin the OBSERVABLE behaviour the
  change alters. It states that repurposing them is in-scope. Friction
  behind the rule (worker-40, 2026-09-30): a "zero test grep hits" fact
  missed a test pinning the old rebind-repeat behaviour — the worker had
  to infer the scope.
- **Full repo-relative paths for file references:** name proposal / spec /
  knowledge files by their FULL repo-relative path. The failure mode this
  rule targets is a bare or truncated name (`approved/…`) where the full
  path belongs (`proposals/approved/…`): it costs the worker a find/glob
  call (2026-09-26/27 frictions).
- **Probe line refs point at the CODE block, re-verified at authoring:**
  when the spec cites a probe case by line range, point at the case's code
  block (never the header annotation). Re-verify the range + the baseline
  counts against the probe's header tally at spec time (28-line-short
  ranges + a stale baseline count cost worker calls, 2026-09-26/27).
- **Live-acceptance specs open with a cheap build canary.** Before the
  acceptance battery, trigger one known current-behavior line. Confirm it
  appears in intercept.log. The live process can LAG HEAD after a
  mid-incident restart (the 2026-09-26_14-26 case burned ~12 attempts).
  The planner re-verifies the live process state after ANY mid-incident
  restart, not just at session start.
- **No "no new TODO entry expected" DoD assumptions:** state the
  expectation, never promise it. A fix may legitimately surface a
  doc/code discrepancy that gets filed (plan25 friction, 2026-09-27).
- **Commit hash in the DoD (codified 2026-09-22 after two worker
  stumbles):** a worker's commit can NEVER contain its own hash. The hash
  exists only AFTER the commit, and the TODO/handover files ride in that
  same commit. A DoD that needs the hash says: status → `LANDED` (hash
  recorded in the planner's follow-up bookkeeping commit). The planner
  records the hash in its own bookkeeping commit (the #80 precedent:
  1fd3726 recorded 4098253). Never write "LANDED (commit hash)" as a
  same-commit requirement — it is unsatisfiable by construction.
- **One-line shape notes for nested fields:** when the spec names a data
  shape, state the nesting explicitly (e.g. `info.tokens: {input, output,
  cache.read}` — the tokens live INSIDE entry.info, not at the entry top
  level). This prevents double-drafted wrong-shape fixtures
  (knowledge_inbox 2026-09-27_00-15 lesson).
- **Checkpoint commits (approved 2026-09-25 — the one-commit loosening,
  his #2026-09-24_22-47):** the worker commits ONE green checkpoint per
  verified unit (code only — the commit routine's append-discrepancies
  rule still applies to each). An interrupted session then loses at most
  one unit. `TODO.md` + the handover file ride the FINAL commit (carrying
  the code commits' hashes, never their own). Spec DoDs state "checkpoint
  commits per verified unit; TODO + handover in the final commit" — never
  "ONE commit" for the whole task. AGENTS.md §Commit-routine step 1 carries
  the same rule ("Commit one verified unit at a time" — the paste LANDED).
- **Verified facts are verified at authoring time (2026-10-01 feedback
  cluster — #128/#129/#131 specs):**
  - (a) API signatures cited in the verified-facts section are verified
    with one import/inspect call at authoring time, never asserted. The
    #129 `QContextMenuEvent(QPoint)` ctor does not exist in PySide6
    6.11.2 — the worker needed a discovery step.
  - (b) Counts claimed as measured cover ALL forms: grep both `logging.`
    and `logger.`. The #131 "4 logging calls" fact was actually ~14 —
    one grep form undercounted.
  - (c) The pin-audit scope names EVERY pin surface the change touches:
    smoke blocks AND probe sections. The #128 spec named only the smoke
    Gate-M block; the probe's S13 gate checks + S32 340 also needed
    re-pins — a red probe round-trip.
  - (d) Baseline / env-fail / blocked-suite parentheticals carried from a
    PARENT TODO entry are re-verified against a fresh gate at authoring,
    never restated. The #120 U2 spec carried the #120 entry's "the 11
    #113 env-fails unchanged" + "pytest per #113 (blocked)" — #113 had
    been closed 2026-09-30; the worker flagged the discrepancy.
- **Pin-audit: probe registration-shape pins (2026-10-01, U3):** a tool
  mode that GAINS surface ARGS makes the probe's registration-shape check
  a pin surface (the exact args key list + NO `name` field). Name the
  check's LABEL, never its printed number: the numbers shift whenever a
  probe section is added (the 2026-10-01 run printed `86` / `346`; the
  2026-10-26 run prints `[355]` for the state_snapshot registration
  shape, total 115). The spec names it and the in-scope re-pin. The U3
  spec named only the smoke pins — the worker committed with the probe
  RED, then died at the wall before the fix (the planner re-pinned that
  check in place; the gate is green again).
