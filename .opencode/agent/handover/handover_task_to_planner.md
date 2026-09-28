# Worker summary — plan31: TODO #114 fix — the gauge budget suffix must agree for a no-total read (worker-31)

## What changed

One verified unit, committed as **`12e3262`** (code + pins together — the
probe can only be green with both; splitting would commit a red gate):

1. **`.opencode/plugin/scripts/gauge.mjs`** (the fix — per the settled
   design, no re-derivation):
   - `SQL_NEWEST_SESSION` + `SQL_SESSION_BY_ID`: now `SELECT id, model …`
     (the session row's own `model` column).
   - `readApiDb`: `model` precedence = finished-step row's model (unchanged
     when present) → ELSE the session row's `model` → ELSE null.
   - Spawn backend: `GAUGE_SQL_MARKER` + `sqlMarkerForSession` S statements
     now `SELECT 'S', id, model …`; `readSpawnSqlite3` parses the S row as
     `sid | model…` (split on the FIRST bar — a `|` in the model id stays
     safe); the S-row model fills in ONLY when model is still null (the M
     row prints first and keeps precedence — verified, it cannot be
     clobbered).
   - `compactionsLeftSuffix`: NO logic change (per spec).
   - Two comment updates (the QUERIES header block; the suffix doc — the
     no-total read now carries the session-row model).
2. **Pins (byte-exact, established pattern):**
   - `handover_probe.mjs`:
     - FX_NOTAL fixture gains `ses_fx_nomodel` (session-row model NULL, no
       messages, `time_updated` below 3000 so the newest-session default
       read stays on `ses_fx_empty`); added to the S5 FINGERPRINT.
     - S6 check 23 re-pinned: the no-total read's `modelId` is now the
       session-row model (`probe-model-120K_MTP`), not `""`.
     - S6b check 28.6 re-pinned to exercise the NEW behavior with a
       path-discriminating budget fixture (row model cap 3 vs entry model
       cap 2 vs default 1 → ` | 3 compactions left` proves the row-model
       path; the pre-fix fallback would have read 2).
     - S6b NEW check 28.7: no-total + model NOWHERE (row model NULL + no
       budget entry) → `default 1` → ` | 1 compaction left` (the old
       fallback still holds).
     - S7 check 36 re-pinned: the real-exe spawn no-total read now asserts
       `modelId === "probe-model-120K_MTP"` (the S row carries the model).
     - Header: S6b description + the section-sum tally (`S6b=7`, total
       `346/346`) — matches the machine.
     - S4 t3 pin (`ctx: SESSION=ses_fx_empty CTX=notAvailable`) stays
       byte-exact as-is — the probe's default budget file is
       never-created (fail-open → no suffix); verified PASS.
   - `gauge_core.smoke.mjs`: the existing entry-model-fallback pin kept
     (still valid) + one new check: a no-total result carrying the
     session-row modelId → the model_budget key's cap.

## Verification (measured)

- **Probe** (before change): 345 total, 11 FAIL — exactly 136-146
  (environmental, #113 venv: `No Python at …python312\python.exe`).
- **Probe** (after change): 346 total, 335 PASS, 11 FAIL — the SAME 136-146
  environmental failures only; checks 23 / 28.6 / 28.7 / 36 / 15 / 43 all
  PASS (explicitly re-read from the run log). Header tally `346/346` agrees
  with the machine.
- **gauge_core smoke**: ALL PASS (19 checks, incl. the 2 new no-total pins).
- **All other smokes unchanged**: auto_resume 140/140, block_transfer 131/131
  + sandbox 64/64, compact_memory 78/78, context_recovery 17/17, ctx_gauge
  3/3, intercept_observer 77/77, loop_log 69/69, submit 23/23.
- **ruff F=0** (`./.venv/Scripts/ruff.exe check --select F .` → "All checks
  passed!").
- **pytest UNRUNNABLE (#113)** — not attempted, per the spec's DoD.
- **Targeted scratchpad verification** (both backends, incl. the REAL
  sqlite3.exe spawn end-to-end): no-total per-session + newest-session
  reads carry the row model; model-nowhere reads default-1; finished-step
  reads unchanged (M-row precedence intact); fail-open no-suffix intact.

## Commits

- Code + pins: **`12e3262`** (the single verified unit).
- This file + `TODO.md` #114 status ride the FINAL commit (bookkeeping).
  Per the spec, the TODO #114 status says `LANDED (hash recorded in the
  planner's follow-up bookkeeping commit)` — that final commit hash is the
  one to record there (a commit can never contain its own hash).

## TODO entries

- `TODO.md` #114: status → `LANDED (… hash recorded in the planner's
  follow-up bookkeeping commit)` — on the FINAL commit.
- `todo_inbox.md`: one line — the spec's submit-smoke baseline is stale
  (DoD said 20/20; the current committed smoke is 23/23, green, untouched
  by this task).

## Deliberately not done

- `auto_resume.ts`, `compactionsLeftSuffix` logic, ctx_watchdog nudge
  ladder, `ctx_gauge.ts` (verified it passes through `formatGauge` — no
  change needed), FST code, maintainer files, the committed knowledge
  entry — all per the DO-NOT-touch list.
- **LIVE acceptance stays PENDING the maintainer's host restart** (the
  live opencode process predates the change). The durable evidence is the
  pins (probe 23/28.6/28.7/36, smoke no-total modelId check) + the
  committed knowledge entry. After a host restart, a fresh session's
  injected `ctx:` line should show ` | 5 compactions left` for this
  245K-slow model, agreeing with the `ctx_gauge` self-read.

## Discrepancies / notes

- Spec DoD baseline `submit 20/20` vs the committed smoke's 23/23 — stale
  number in the spec, not a regression (logged in todo_inbox).
- `.opencode/loop/autorun-2026-09-21_15-33/loop_log.md` carried 2 uncommitted
  planner-31 lines (START/INFO) when I started; the close-out commit lands
  the whole append-only activity log (the established pattern — cf.
  d1debcc), planner lines included.
- Loop log: START + DONE lines written via the `loop_log` tool (both
  verified readback-match; the iter-31 planner START line 03-50 already
  covers the iteration start).
