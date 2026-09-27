# TASK SPEC — plan26: TODO #92 — the pre-compaction dump saves BOTH artifacts (md + raw json)

Worker: `worker_Q3S_245K_slow`. Approval: PRE-APPROVED (maintainer ruling 2026-09-27
direct, ses_f20d1b39…: "YES — save both" — the spec is the entry's acceptance criteria).
No new maintainer call is needed.

## Goal
Every pre-compaction dump writes TWO artifacts — the lossless full markdown (current)
AND a raw JSON snapshot (the lossless master) — each with the #78 diagnostics (120 s
budget, stdio pipe, ONE retry, stderr on DUMP-FAIL), producing two DUMP-OK lines per dump.

## Verified current state (planner-measured 2026-09-27 — build on these; do NOT re-derive)
- The hook lives ONLY in `.opencode/plugin/compact_memory.ts` (the tool entry point —
  `compaction_core.ts` is the shared config/keepTokens module, `context_recovery.ts` has
  NO dump). Call site L380-381 (the dispatch WARNING uses `dump.ok` / `dump.error` only).
- `preCompactionDumpName(sessionID, count, stamp)` (L114) → `compaction_dumps/<sid>_c<n>[_stamp].md`.
- `preCompactionDump` (L183-207): the no-overwrite stamp is decided by the MD base
  existence (L188); one attempt → DUMP-RETRY=1 → one retry → DUMP-FAIL (L191-206).
- `runDumpSpawn` (L219-230): `execFileSync(resolveNodeExe(), [scriptPath, sessionID, "--out", name],
  { timeout: 120_000, stdio: "pipe" })`.
- Line formats (L124-160): DUMP-OK `<stamp> DUMP-OK <sid> <relFile> ms=<ms>`; DUMP-RETRY=
  `<stamp> DUMP-RETRY=1 <sid> ms=<ms> err=<one-line>`; DUMP-FAIL `<stamp> DUMP-FAIL <sid> <detail>`.
- The dump script `.opencode/agent/scripts/db/dump_session.cjs` ALREADY has `--json` (raw
  mode, #78): `--out <rel> --json` writes to `jsonOutRel(rel)` — a rel that ALREADY carries
  an extension (e.g. `x_c0.json`) is used VERBATIM; a rel without an extension gets `.json`
  appended. → the hook must pass the `.json` NAME itself (`--out compaction_dumps/<base>.json --json`).
- The probe/smoke FAKE dump stubs (probe `QC_FAKE_DUMP` L2920-2935; smoke `FAKE_DUMP` L37-53)
  are rel-driven (`--out <rel>` → writes OUT_DIR/rel) and ignore `--json` → they serve BOTH
  artifacts UNCHANGED.
- Pins in force: probe S14 checks 101-107 (L3415-3521) + S25 check 255 (L5974-5981, `.find`
  the FIRST DUMP-OK line); smoke DUMP-OK pin (L201-208, `.find` the FIRST DUMP-OK line).
- Counts: probe 344/344 (header annotation L940, `S14=7`); compact_memory smoke 76/76.
- The probe's `qcMod` imports compact_memory.ts (`QC_PLUGIN_TS` L2868).

## Changes (WHAT — the HOW is yours inside the DoD)
1. `preCompactionDumpName(sessionID, count, stamp, format = "md")` → `…<format>` — the
   3-arg calls must stay BYTE-IDENTICAL (checks 101/102 stay green).
2. `preCompactionDump(root, sessionID, count)` runs BOTH artifacts — md first, then json —
   each INDEPENDENTLY (one's failure does not skip the other): the same attempt →
   DUMP-RETRY=1 → one retry → DUMP-FAIL pattern per artifact; the json spawn passes
   `[scriptPath, sessionID, "--out", jsonName, "--json"]` (jsonName = the json form from
   #1). The no-overwrite stamp is STILL decided by the MD base existence (unchanged);
   both artifacts share the stamped base.
3. Line formats: the DUMP-OK format is UNCHANGED (the relfile already distinguishes — two
   lines per dump: the `.md` line first, then the `.json` line); DUMP-RETRY= and DUMP-FAIL
   gain the artifact relfile right after `<sid>`: `<stamp> DUMP-RETRY=1 <sid> <relFile>
   ms=<ms> err=<…>`, `<stamp> DUMP-FAIL <sid> <relFile> <detail>` (the existing substring
   pins stay green).
4. Return shape: `{ ok, files, error }` — ok = BOTH landed; files = the landed paths, md
   first (0/1/2 entries); error = `<md|json>: <detail>` per failed artifact, joined by
   " | " when both failed. The dispatch call site keeps `dumpWarning` as-is (it reads
   only ok/error — L380-381).
5. `runDumpSpawn` keeps its `execFileSync(resolveNodeExe(), …)` shape (the smoke source
   pin L563-574 stays green) — just extend its args.

## Pins
- Probe S14: RE-PIN 104 (no script: exactly two DUMP-RETRY=1 + two DUMP-FAIL lines for
  `ses_pc_noscript`, one per rel; `r.ok === false`; `r.error` names BOTH artifacts), 105
  (both files created with the marker content; `r.files` = the [md, json] paths), 106
  (stamped: BOTH basenames match the stamp regex), 107 (no-overwrite: BOTH file #1s
  byte-identical). NEW check **345** (appended in the S14 block): the json naming
  byte-exact — `preCompactionDumpName("ses_pc_name", 0, null, "json") ===
  "compaction_dumps/ses_pc_name_c0.json"` AND `("ses_pc_name", 3, "20260915T131530",
  "json") === "compaction_dumps/ses_pc_name_c3_20260915T131530.json"`. Section header
  `S14 (7)→(8)`; header annotation L940 `S14=7`→`S14=8` + total 344→345 (self-annotate
  per the probe convention); the check-ID comment list gains (345).
- Probe S25 check 255: NO change needed (the md line is written first — the pin stays green).
- Smoke: add EXACTLY two checks in the self case (after L208): (a)
  `compaction_dumps/ses_sm_self_c0.json` exists; (b) the json DUMP-OK line byte-exact
  `^<DT> DUMP-OK ses_sm_self compaction_dumps/ses_sm_self_c0.json ms=<ms>`. The md
  DUMP-OK pin stays (its `.find` returns the md line — the first). No other smoke changes
  (the stubs serve both artifacts).
- Header comments (smoke L21-34, probe L18-19 + L395-411): update to state the
  two-artifact behavior (the #92 pointer).

## DoD (measured end states)
- probe **345/345** (344 + 1 new; header self-annotated); compact_memory smoke **78/78**
  (76 + 2); all other smokes unchanged-green; pytest **459 passed + 1 warning** (the known
  #10 coroutine warning); ruff **F=0**.
- Checkpoint commits per verified unit (code only); TODO #92 status → `LANDED` (the commit
  hash is recorded by the PLANNER in the follow-up bookkeeping — no self-reference) + the
  worker handover `.opencode/agent/handover/handover_task_to_planner.md` in the FINAL
  commit. Append any discrepancy to TODO.md per the commit routine.

## DO-NOT-TOUCH
- `.opencode/agent/scripts/db/dump_session.cjs` (its `--json` mode already exists — no
  change needed), `compaction_core.ts`, `context_recovery.ts`, `auto_resume.ts`, all other
  plugins/tools, the FST code, `.opencode/maintainer/**`, the live `opencode.jsonc`.
