# plan26 summary (autorun-2026-09-21_15-33, iteration 26)

Session: ses_f1d4258efffeFUXLn6PTolcHsB (planner-26, Qwen3.8-27B-Q3S-245K-slow),
unit-4 restart branch after planner-25 `action: restart`.

## Unit: #92 build — the pre-compaction dump saves BOTH artifacts (md + raw --json)
- Spec staged + committed first (`a17da71`; the committed copy: `plan26_ho_task.md`),
  written against the measured state (the dump script's `--json` mode already exists
  from #78 and keeps an already-extended rel VERBATIM — the hook passes the `.json`
  name itself; the rel-driven fake-dump stubs serve both artifacts unchanged).
- Worker-26 `worker_Q3S_245K_slow` ses_f1d2ea77fffet94z6jtoZUD7z1 — LANDED:
  - `11f4a12` — compact_memory.ts: two-artifact dump (md first, then json; each
    independently: attempt → DUMP-RETRY=1 → one retry → DUMP-FAIL, the #78 120 s
    budget + stderr capture on both); DUMP-RETRY=/DUMP-FAIL lines gain the
    artifact relFile (DUMP-OK format unchanged — two lines per dump); the hook
    returns `{ ok, files, error }` (files md-first; error = `<md|json>: <detail>`,
    joined by " | "); the 3-arg `preCompactionDumpName` calls byte-identical
    (new optional `format` arg); the no-overwrite stamp stays MD-base-driven
    (both share the stamped base); the dispatch call site unchanged (reads
    only ok/error).
  - `5a6e842` — probe: S14 checks 104-107 re-pinned (two DUMP-RETRY=1 + two
    DUMP-FAIL per rel; the {ok, files} shape; the shared stamped base; both
    file #1s byte-identical) + NEW check 345 (the json naming byte-exact);
    header self-annotated 344→345, S14 (7)→(8).
  - `e2a1a52` — compact_memory smoke: exactly +2 (the json artifact exists +
    the json DUMP-OK line byte-exact) — 76→78; the stubs unchanged.
  - `86bda25` — TODO #92 → LANDED + handover + the worker's friction entry
    (glob skips gitignored paths).
- Planner-verified (own re-run, not the worker's numbers): probe **345/345 PASS**
  + compact_memory smoke **78/78 ALL PASS** (both exit 0); commit scope clean
  (3 task files + bookkeeping; the maintainer's live `priority.md` edit left
  uncommitted, untouched).
- Worker's full gate (measured, in the handover): all smokes green
  (auto_resume 139, bt 131+64, context_recovery 17, ctx_gauge 3, gauge_core,
  intercept_observer 77, loop_log 69, submit 20), pytest 459 passed + 1 warning
  (the known #10), ruff F=0.

## Live acceptance (pending, natural)
The next real compaction must show BOTH artifacts in
`.opencode/archive/sessions/compaction_dumps/` + the two DUMP-OK lines in
ctx.log (same for the plan25 bt live-channel items — the maintainer's next
restart covers both).

## NEXT (planner-27)
The #99 follow-up research — the flexible per-dispatch keepTokens (trace where
the installed host reads `preserve_recent_tokens` — config vs per-call body;
source `home\AppData\Local\Temp\opencode\opencode-dev`, dev branch
1.18.32; the N=10 discriminator + the summarize-scope probe ride it; his
fork-test matrix = the decider; wire it if found, the config knob the
fallback). Then #104 (maintainer call), #103 on GO, #86 tail.

## Bookkeeping this session
- plan25 session (direct ses_f20d1b39 + its plan25 continuation) compressed to
  the archive line; excess → `plan25_nap.md`.
- Baselines updated in place (probe 345, compact_memory smoke 78/78).
- Per-session NAP backup: `.opencode/archive/nap_backup_2026-09-27_ses_f1d4258efffe.md`.
- Friction check (planner): no friction of mine this session — the worker's
  glob/gitignored observation already filed by it via submit.
