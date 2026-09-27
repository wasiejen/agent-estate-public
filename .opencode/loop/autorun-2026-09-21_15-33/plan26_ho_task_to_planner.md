# HANDOVER — worker-26 (plan26): TODO #92 — the pre-compaction dump saves BOTH artifacts (md + raw json)

## What changed (per the spec, all pre-approved)
1. `.opencode/plugin/compact_memory.ts` (commit 11f4a12):
   - `preCompactionDumpName(sessionID, count, stamp, format = "md")` — the 4th arg
     ("md" | "json"); the 3-arg calls stay BYTE-IDENTICAL (probe 101/102 green).
   - `preCompactionDump(root, sessionID, count)` now returns
     `{ ok, files, error }`: ok = BOTH landed; files = the landed paths, md first
     (0/1/2 entries); error = `<md|json>: <detail>` per failed artifact, joined by
     " | " when both failed. The no-overwrite stamp is STILL decided by the MD base
     existence; both artifacts share the stamped base. Each artifact runs the SAME
     #78 pattern independently (one attempt → DUMP-RETRY=1 → one retry → DUMP-FAIL)
     via a new `dumpOneArtifact` helper — one's failure does not skip the other.
   - The json spawn passes the extra `--json` flag:
     `[scriptPath, sessionID, "--out", jsonName, "--json"]` (jsonName = the json
     form from the name fn — the dump script's verbatim-extension rel rule, no
     script change).
   - `runDumpSpawn` gained an `extraArgs: string[] = []` param — the
     `execFileSync(resolveNodeExe(), …)` shape kept (smoke source pin L563-574
     green).
   - DUMP-RETRY= / DUMP-FAIL lines gain the artifact relFile right after `<sid>`:
     `<stamp> DUMP-RETRY=1 <sid> <relFile> ms=<ms> err=<…>`,
     `<stamp> DUMP-FAIL <sid> <relFile> <detail>`. The DUMP-OK format is UNCHANGED
     (two lines per dump: the .md line first, then the .json line).
   - The dispatch call site (L380-381) is UNCHANGED — it reads only `dump.ok` /
     `dump.error`.
2. `.opencode/plugin/probes/handover_probe.mjs` (commit 5a6e842):
   - S14 checks 104/105/106/107 RE-PINNED: 104 = exactly two DUMP-RETRY=1 + two
     DUMP-FAIL lines (one per rel, counted by full rel substring), `r.ok === false`,
     `r.error` names BOTH artifacts ("md:" + "json:"); 105 = both files created with
     the marker content, `r.files` = [md, json] paths; 106 = BOTH basenames match
     the stamp regex (the shared stamped base); 107 = BOTH file #1s byte-identical
     (md + json).
   - NEW check **345** (appended in the S14 block): the json naming byte-exact —
     `preCompactionDumpName("ses_pc_name", 0, null, "json") ===
     "compaction_dumps/ses_pc_name_c0.json"` and the stamped c3 case.
   - Header self-annotated: S14 (7)→(8) (section header + the EXPECTED block),
     `S14=7`→`S14=8` + total `344/344`→`345/345`, the EXTENDED list gains the #92
     line, the S14 header mentions (345). S25 check 255 UNCHANGED (the md line is
     written first — the `.find` still returns the md line).
3. `.opencode/plugin/tests/compact_memory.smoke.mjs` (commit e2a1a52):
   - EXACTLY two new checks in the self case (after the md DUMP-OK pin): (a)
     `compaction_dumps/ses_sm_self_c0.json` exists; (b) the json DUMP-OK line
     byte-exact `^<DT> DUMP-OK ses_sm_self compaction_dumps/ses_sm_self_c0.json ms=<ms>`
     (matched by the anchored regex itself — only the json rel can satisfy it).
   - Header comments (L21 + the stub block) updated to state the two-artifact
     behavior (#92 pointer); the FAKE_DUMP stub is UNCHANGED (rel-driven, ignores
     --json → serves both artifacts).
   - The md DUMP-OK pin stays (its `.find` returns the first = md line).

## Measured verification (final gate, post-all-commits)
- **probe 345/345 PASS** (344 + 1 new check 345; header self-annotated 345/345) —
  `node .opencode/plugin/probes/handover_probe.mjs`, exit 0.
- **compact_memory smoke 78/78** (76 + 2).
- All other smokes green: auto_resume 139/139, block_transfer.sandbox 64/64,
  block_transfer 131/131, context_recovery 17/17, ctx_gauge 3/3, gauge_core
  ALL PASS, intercept_observer 77/77, loop_log 69/69, submit 20/20.
- **pytest 459 passed, 1 warning** (the known #10 coroutine warning).
- **ruff F=0** ("All checks passed!").

## Commits (per verified unit, code only)
- `11f4a12` — plugin code (compact_memory.ts, the two-artifact dump)
- `5a6e842` — probe S14 re-pins + check 345 + header annotations
- `e2a1a52` — smoke +2 + header comments
- FINAL commit: this handover + TODO.md #92 status → LANDED (the commit hash is
  recorded by the planner in the follow-up bookkeeping — no self-reference).

## TODO entries
- #92 status → LANDED (no commit hash in the entry — planner records it).
- No discrepancies found; nothing appended to todo_inbox.md.

## Deliberately NOT done (per the spec's DO-NOT-TOUCH)
- `.opencode/agent/scripts/db/dump_session.cjs` (its `--json` mode already exists —
  unchanged), `compaction_core.ts`, `context_recovery.ts`, `auto_resume.ts`, all
  other plugins, the FST code, `.opencode/maintainer/**` (note: `.opencode/maintainer/
  priority.md` showed a pre-existing maintainer modification in git status — NOT
  touched by me, NOT committed), the live `opencode.jsonc`. Stayed on
  `opencode_test` (no branch switch).

## Notes
- The dispatch WARNING text is UNCHANGED (`dumpWarning` reads only ok/error) — a
  partial failure (e.g. md landed, json failed) now reports `ok: false` with an
  error naming only the failed artifact; both DUMP-OK/DUMP-FAIL lines land in the
  ctx.log regardless.
