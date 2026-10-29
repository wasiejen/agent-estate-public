// =============================================================================
// Persistent offline probe for the surviving gate subjects: the gauge core
// (.opencode/plugins/scripts/gauge.mjs), the custom tools
// (.opencode/tools/**), and the numword scriptlet
// (agent/scripts/numword/**) — v2.5 de-peek lineage (native session-gated
// context gauge, TODO.md #30/#35; backend chain node:sqlite → bun:sqlite →
// spawn-sqlite3, TODO #37).
// RETIRED 2026-10-26 (#150 unit B): the v1 estate (.opencode/plugin/ +
// .opencode/plugin-unported-v1/) is DELETED; the 22 v1 sections S1-S5,
// S8-S11, S13-S14, S18-S21, S25-S29, S31-S32 (248 checks) are pruned —
// coverage gaps recorded in TODO.md #150 unit B. The history below names
// retired sections as history; the live pin set is the 13 KEEP sections
// (115 checks — see EXPECTED OUTPUT).
// REBUILT 2026-09-10 (continuation 2) + EXTENDED 2026-09-10 (#37 S7 backend
// chain section) + EXTENDED 2026-09-10/11 (v2.8: S9 readout append / ctx log /
// deferred delivery + the S8 deferred-delivery ticks) + EXTENDED 2026-09-11
// (L1: the ctx log tool-name field — S9 checks 54/55 byte-shapes updated +
// new 65/66) + EXTENDED 2026-09-11 (L2: the compact_memory custom tool —
// the new S10 section, checks 67-75; the tool file is imported DIRECT,
// type-stripped, the same way the plugin loads) + EXTENDED 2026-09-11
// (T5 L4+L5: the emergency recovery plugin — the new S11 section, checks
// 76-81; the plugin file is imported DIRECT, type-stripped, the same way
// the probe loads the tool) + EXTENDED 2026-09-12 (T2 loop-tool-batch part
// 2: the ctx_gauge custom tool — the new S12 section, checks 82-85; the
// tool file is imported DIRECT, type-stripped, the same way the probe
// loads the tool) + EXTENDED 2026-09-15 (T4: the compact_memory
// pre-compaction dump hook, TODO #152 — the new S14 section, checks 101-107;
// the dump script's --out flag; the S13 preamble places a stub dump script so
// the byte-exact dispatch responses stay clean; #92 2026-09-27: BOTH
// artifacts per dump — the md + the raw json — checks 104/105/106/107
// re-pinned + the new check 345) + EXTENDED 2026-09-16 (#60:
// the block_transfer + loop_log probe pins — the new S15 section, checks
// 108-10.17, and the new S16 section, checks 10.18-123; both tool files
// imported DIRECT, type-stripped, the S12/S13 load pattern) + EXTENDED
// 2026-09-16 (lane 5.2: the numword scriptlet — the new S17 section, checks
// 124-149; the shared numwords.json map + the node CLI spawned via
// execFileSync + the python twin via the repo venv + the module required
// DIRECT via createRequire) + EXTENDED 2026-09-16 (lane 5.3: the log-only
// intercept observer — the S18 section, checks 150-181; the plugin file is
// imported DIRECT, type-stripped, the NAMED core is pinned from the SPLIT
// core file (intercept_observer_core.ts — the 2026-09-16 export fix: the
// host loader requires EVERY Object.values(module) entry to be a function,
// so the plugin file exports the default factory ONLY), the read-scope
// fuzzy resolution (lane 5.4) is pinned (matcher exact/normalize/d1/d2/
// gap<2/d>2/cand-shape + the hook mutation / fail-closed / exact flows),
// the numword map is the REAL shared file, the hook writes to a sandbox
// project dir) + EXTENDED 2026-09-16 (R1: the [left:right] pair pipeline —
// the new S19 section, checks 182-194: the grammar switch (adder-sum /
// right-wins / multi-pair / old-form-dead / form negatives / numword-left /
// fourty), the read-scope pair mutation (existence gate: mutated /
// fail-closed none-exist / fail-closed both-exist / right-wins mutation),
// the non-read log-only rule, the SCRATCHPAD_ROOT sandbox allowance; S18's
// pair pins 157-160/165/167 were switched to the new form and its VERDICTS
// pin grew to 9) + EXTENDED 2026-09-25 (R8, #97: the out-of-sandbox path
// redirect — the new S28 section, checks 285-296: the pure 1:1 resolver
// (case (i) span == root / case (ii) direct sibling / 0 or >=2 fail-closed
// / root dedupe / degenerate inputs) + the hook e2e over the FALLBACK roots
// [workspace root, SCRATCHPAD_ROOT] (read/write sibling, span == root,
// no-mapping note, nested non-sibling); the config-read path is smoke-
// pinned) + EXTENDED 2026-09-26 (#102: the POSIX temp-root → scratchpad
// prefix mapping — the new S29 section, checks 297-304: the pure resolver
// (/tmp/<rest> + /var/tmp/<rest> + bare root + double-slash/backslash
// forms + no-mapping fail-closed) + the hook e2e (typed /tmp + /var/tmp
// redirect, the BASH `command`-string redirect — two mapped spans, the
// unmapped-span fail-closed, the mixed mapped/unmapped command)) +
// EXTENDED 2026-09-26 (bt-v2 S3: block_transfer v2 Parts D+E+F — the new
// S30 section, checks 305-315: the WRITE mode (single span + the
// 'regions' LIST applied highest line first + the overlap teaching error
// + the absent-file creation detail + the input guards), the PEEK mode
// (the default head/tail shape with blank-skip + the from/count window
// capped at 25 + the guards), the unified Part F feedback for all modes,
// and the S1-deferred v2 teaching error switch (the non-unique error gains
// the match count + the first match line numbers; the end-before-start
// error gains the file reference — the S15 pins 108/110/111/115/116/117/
// 262/263 re-pinned in place) + EXTENDED 2026-09-26 (R3: the arg-scope
// extension beyond `read` — the new S31 section, checks 317-337: the pure
// core surface (matchAnchorPrefixLines / countFileLines /
// resolveSectionAnchor / quotedSpans / inQuotedSpan) + the drift-guard
// equivalence against the block_transfer tool's own matchAnchorLines /
// countLines (the S1 unified rule, 0d85a8c) + the hook pins: the glob/grep
// PAIR channel (the field-parameterized READ gate on the `path` field +
// the content-scope guard), the section-ANCHOR resolver (exactly-one /
// zero / multi / numeric-string / file-missing), the BASH QUOTED-FORM
// channel (the quoted-span ownership split + the mismatch fail-closed),
// the block_transfer ANCHOR-MARKER channel (the R2 write-scope gate
// branches: mutated / none-exist / both-exist / non-unique / fail-closed /
// the targetMarker-dstFile ownership)) + EXTENDED 2026-09-27 (#92: the
// pre-compaction dump saves BOTH artifacts — the lossless full markdown AND
// the raw JSON snapshot (the lossless master) — each INDEPENDENTLY (the same
// attempt → DUMP-RETRY=1 → one retry → DUMP-FAIL per artifact), the DUMP-
// RETRY=/DUMP-FAIL lines gain the artifact relFile, the hook returns
// { ok, files, error } (files = the landed paths, md first): the S14 checks
// 104/105/106/107 re-pinned + the NEW check 345 (the json naming byte-exact))
// + EXTENDED 2026-09-30 (plan39: the context_trim custom tool — the
// approved context-trim build, Unit 1): the new S33 section, checks
// 346-351: the tool's schema surface (type-stripped direct import, the
// S12/S15 load pattern) + the report/dry-run/tail contract pins on the
// probe's own fixture DB (the opencode-like session/message/part shapes
// from the bounded read-only live-DB inspection) + the 4 fail-closed
// rejection reasons + the no-marker full-history report + EXTENDED
// 2026-10-01 (TODO #120 Unit 2: the plugin-side post-compaction
// tail-set — the zero fork): the new S34 section, checks 352-353: the
// context_trim core's tailSetKeep keep-count boundary export on the
// probe's own fixture DB (a fresh ses_ct_k2 session — 10 messages
// before the marker, the marker quartet, 2 after): the valid rewrite
// (keep=8 → the 8th message STRICTLY before the compaction user row,
// the part row byte-exact — the EXACT tailSet write path reused) + the
// 5 fail-closed rejections (floor / keep-exceeds-history /
// no-completed-compaction / session-not-found / keep-invalid):
// + EXTENDED 2026-10-04 (p3-state-snapshot: the state_snapshot planner
// init tool — the approved proposal
// 2026-09-18_p3-state-snapshot-tool.md): the new S35 section, checks
// 354-356: the tool file's existence + the tool() default export shape
// (description a non-empty string + execute a function — imported DIRECT,
// type-stripped, the S12/S15 load pattern) + the registration-shape pin
// (the EMPTY args key list — the compact_memory check-86 / context_trim
// check-346 pattern — + NO `name` field: the host auto-detects
// .opencode/tools/*.ts, no registration anywhere) + the planner-only steer
// in the description; the digest BEHAVIOR is smoke-pinned
// (state_snapshot.smoke.mjs) — the probe pins the SURFACE only
// + EXTENDED 2026-10-05 (loop iteration counter Part 2 — the approved
// proposal 2026-10-01_loop-iteration-counter.md) + #171 (2026-10-26, ROUND
// counter): the S36 section, checks 357-361: the gauge core's
// `loopIterationSuffix()` (the injected chat.message ctx-line suffix — the
// ` ITER=<n> <folder>` field + the ` ROUND=<r>` / ` MAINT=1` tokens) pinned
// via the test hook (setLoopRootForTest — the setBudgetFileForTest
// pattern, steered at a sandbox fixture loop root at probe start so the
// pre-existing byte-exact ctx-line pins stay byte-identical): (i) a loop
// root without a counter → `""` (the line stays byte-identical), (ii) a
// fixture `autorun-X/counter.json` n=7 → ` ITER=7 autorun-X` (legacy, NO
// `round` key — the OLD form stays byte-exact), (iii) round=9 →
// ` ROUND=9` appended, (iv) round=10 → ` MAINT=1` rides (every 5th round),
// (v) a non-finite round → the OLD byte-exact form (fail-closed):
// the
// pre-rebuild
// probe
// (v2.2.1 era) targeted the DELETED handover.ts, the retired
// experimental.chat.system.transform hook, and the fake-$-shell S4 shapes —
// all void with the shell gauge. PERMANENT repo tooling: RE-RUN, never rebuild
// — exception: the plugin's hook surface changes.
//
// EXACT RUN COMMAND (from the repo root — the shell switched to Git-Bash on
// 2026-09-15, so the command is the bash form; this IS the run command, do
// not rediscover anything):
//     node .opencode/plugins/probes/handover_probe.mjs
//
// WHY THAT COMMAND:
//   - the probe runs under plain system `node` (v24.19.0 on this host — the
//     Node 24+ line): native TypeScript type-stripping (the .ts plugin is
//     imported directly, no compile step, no flags, no bun) AND flag-free
//     built-in `node:sqlite` (the probe BUILDS its temp fixture DBs with
//     DatabaseSync — NO python, NO live DB anywhere in the probe; the S7
//     backend-chain section additionally exercises the spawn backend
//     END-TO-END with the REAL maintainer-placed sqlite3.exe — READ-ONLY
//     URIs against the sandbox fixtures, never the live db). One
//     MODULE_TYPELESS_PACKAGE_JSON warning on stderr is expected and
//     harmless (`.opencode/package.json` has no "type" field and must not
//     gain one — that would change the plugin's module context).
//   - the probe runs under NODE, so the chain backends that need a different
//     host (bun:sqlite) are exercised by FORCING them via the core's
//     setBackends hook: backend 2's ADAPTER shape is verified with a
//     unit-mock module (the real bun:sqlite API was verified separately
//     against the system bun 1.4.2 — host proof 2, see the worker summary),
//     and backend 3 is verified end-to-end with the real exe.
//   - the gauge's source in EVERY S4/S6 shape is a temp fixture sqlite DB
//     built by this probe itself (opencode-like schema per the T1 spec fact 2:
//     `session`(id, time_updated, model JSON) + `message`(session_id,
//     time_created, data JSON with tokens+finish)) in the sandbox, pointed at
//     via the core's setDbPath / readGauge(path) — the core and the plugin
//     share ONE module instance (same resolved file), so the plugin's
//     chat.message read hits the same fixture.
//   - one file, self-contained, re-runnable from the repo root.
//
// WHAT IT RUNS:
//   The plugin is initialized with directory=<temp sandbox root> (os.tmpdir,
//   mkdtemp), so ALL its fs writes land in the sandbox: dummy
//   agent/handover/handover_task.md spec (non-empty sentinel), mirror file pre-filled
//   with STALE content, empty plugin.log. The real .opencode/ files are NEVER
//   touched (S5 verifies byte-identity + zero writes outside the sandbox).
//   S1 pre-flight warn (3): spec present → no warn; renamed away → exactly ONE
//      byte-exact warn + byte-exact restore; emptied → exactly one new warn +
//      byte-exact restore
//   S2 non-handover delegations invisible (4): task w/o spec in prompt;
//      non-task tool w/ spec-ish prompt; task w/ missing args (no throw);
//      cumulative tally
//   S3 mirror DISABLED (P02, v2.7) (5): the plugin NEVER touches the mirror file —
//      non-empty output / truncated:true / empty output all leave it byte-identical
//      to the pre-filled sentinel; exactly 3 tool.after log lines (logging is
//      unchanged); final mirror state == pre-filled sentinel
//   S4 chat.message shapes (8) — v2.5 native gauge, session-gated match-only
//      post (the v2.2.1 fake-shell shapes are GONE):
//      (t1) ok-match: the posted part is BYTE-EXACT
//          `ctx: SESSION=ses_fx_ok CTX=12345 (4%) REM=243655` (id prt-ctx-,
//          messageID from output.message.id, sessionID echo, prior part kept)
//          + chatmsg evidence carries sess=ses_fx_ok + ZERO gauge lines
//      (t2) unknown-window match: `ctx: SESSION=ses_fx_unk CTX=50` posted
//          (honest own-session result — information, not error)
//      (t3) notAvailable match: `ctx: SESSION=ses_fx_empty CTX=notAvailable`
//          posted
//      (t4) mismatch-silent: sid ses_fx_ok vs sessionID ses_other → NO post,
//          NO gauge line (the per-fire chatmsg evidence line is still logged —
//          with the sess field — a mismatch is a normal multi-session state)
//      (t5) db-error: missing fixture db → no throw, no post + ONE gauge line
//          {reason:db-error, session, preview = the core's own error text
//          capped 120} byte-exact
//      (t6) parts-not-array: match + parts not an array → no throw + ONE gauge
//          line {reason:parts-not-array, session}
//      (t7) invalid-messageID: match + a non-msg message id → no throw + ONE
//          gauge line {reason:invalid-messageID, session, message}
//      (t8) no-throw: hook called with empty {} / {} → resolves
//   S6 gauge core shapes (8) — direct core calls against the fixtures:
//      known-window byte-exact + field values / unknown-window byte-exact /
//      notAvailable byte-exact / missing-db db-error (no throw,
//      formatGauge = `SESSION=unknown CTX=notAvailable`) / SESSION= prefix on
//      every readout / parseWindow cases (256K, 210K, 1.5M, 120K_MTP, no-match,
//      non-string) / parseModelId (JSON id / plain / malformed / empty) /
//      setDbPath+getDbPath global plumbing with explicit-path override
//   S6b item 3 RETIRED (#212, U26, 2026-10-29) (8): the ` | N compactions
//      left` suffix is DROPPED — formatGauge reads NO budget store; the old
//      reader's states (count < cap / === cap / > cap, the emergency key
//      absent / explicit-0 legs, the fail-open missing file, the no-total
//      SESSION-ROW-model and model-nowhere reads, the silent cap-1 fallback
//      map shape with the old ` (unlisted)` marker) ALL land as the plain
//      readout form — regression guards for the drop
//   S7 backend chain (11) — the #37 chain IS contract: each backend is
//      FORCED via setBackends([...]) and verified against the sandbox
//      fixtures (the list is cleared/restored between sections):
//      (29) node:sqlite forced → byte-identical readout + fields
//      (30) bun:sqlite forced, module ABSENT on the node host → db-error
//           NAMING the backend, no throw
//      (31) failed import is memoized — NOT re-tried on subsequent fires
//           (per-process cache; importAttemptsForTest counter)
//      (32) bun:sqlite ADAPTER shape via a unit-mock module:
//           Database(path, {readonly:true,timeout:2500}) + PRAGMA exec +
//           prepare().get() ×2 (ordered) + close; readout byte-identical
//      (33) unit-mock bun:sqlite no-row (get() → null, bun's no-row value)
//           → no-total form byte-identical
//      (34-36) spawn-sqlite3 forced, END-TO-END with the REAL exe on the
//           fixtures: ok / unknown-window / no-total — all byte-identical
//      (37) full chain, missing db → db-error naming the DEEPEST failing
//           backend (spawn-sqlite3), notAvailable form
//      (38) fallback: a working backend whose module later fails falls
//           through to the next backend (spawn ok); the failed import is
//           not re-tried (attempts +1 total)
//      (39) hook restore: getBackends() back to the default chain order,
//           setDbPath/getDbPath plumbing intact, read byte-identical
//   S8 nudge ladder (8) — the v2.6 auto-nudge ladder (TODO #30/#33, the
//      APPROVED design of record), fired from tool.execute.after with a
//      PER-SESSION read against the fx_lad.db fixture (window 120K — one
//      session per rung + two delivery-failure sessions); the plugin is
//      re-initialized with a FAKE client that records every promptAsync
//      call; evidence = kind:"nudge" lines only (silent on every non-fire).
//      v2.8: delivery is DEFERRED (setImmediate + the busy check) — every
//      check awaits a ~25 ms tick() before asserting promptAsync calls:
//      (46) below the first rung (49%) → SILENT (no line, no call)
//      (47-51) rungs 1-5 each fire EXACTLY ONCE: byte-exact nudge line
//          {session, rung, readout} + promptAsync payload
//          {path:{id}, body:{parts:[{type:"text", synthetic:true, text =
//          readout + " — " + rung instruction}]}} (after the tick)
//      (52) per-rung dedup: a second fire at the same rung posts NOTHING
//      (53) delivery failures evidence-logged (delivery-threw /
//          delivery-rejected, preview capped) — never thrown
//   S9 readout + ctx log + deferred delivery (12) — the v2.8 build (the
//      re-scoped design of record — see the plugin's v2.8 header block): ONE
//      per-session gauge read per tool.execute.after feeds (1) the MINIMAL
//      readout appended to the tool result, (2) the ladder (unchanged), (3)
//      the single-file ctx log at SANDBOX/.opencode/temp/ctx.log (isomorphic:
//      an entry IFF the readout was appended). The ctx log line carries the
//      tool-name field (the tool.execute.after tool — OMITTED when the
//      payload has none, mirroring the model field; L1 of the
//      compaction-lifecycle proposal). Fixture fx_ro.db (window 120K
//      except where noted; ses_ro_absent deliberately NOT in the db); the
//      plugin is re-initialized with a status-aware fake client (a mutable
//      S9_STATUS drives the busy/idle check — direct-map and SDK fields-style
//      shapes):
//      (54) known window: output byte-exact `tool body\n(35% used, 78K left)` + ctx log
//          line 1 `<dt> probe-model-120K_MTP task (35% used, 78K left)`, below rung 1
//      (55) unknown window on a trailing-newline output `x\n`: direct concat
//          byte-exact `x\n(46K used)` + ctx log line 2 WITH the model + tool
//      (56) no-total (in-flight step, no finish): NO append / NO log /
//          no nudge line
//      (57) missing session (not in the db): per-session read no-total → same
//      (58) non-string output.output (defensive — the SDK declares string):
//          no throw, object untouched, NO log entry (isomorphism)
//      (59) DEFERRED delivery (rung 1, status unknown): after the awaited
//          afterFeed promptAsync NOT called synchronously (0 calls) while the
//          nudge evidence line IS synchronous; exactly 1 call after the tick
//          with the byte-shape synthetic payload (readout byte-exact)
//      (60) BUSY (direct-map status fake): 0 calls after the tick, evidence
//          line fired, readout append + log entry unaffected
//      (61) status ABSENT (fn returns undefined): the deferral alone still
//          delivers — exactly 1 call after the tick
//      (62) BUSY via the SDK fields-style fake `{data: {sid: {type:"busy"}}}`:
//          0 calls after the tick
//      (63) IDLE (fields-style): exactly 1 call after the tick
//      (65) ctx log tool-name field PRESENT: byte-shape
 //          `<dt> CPU-Qwen3-0.6B task (46K used)` (the fake tool name)
 //      (66) ctx log tool-name field OMITTED: payload without a `tool` key →
 //          byte-shape `<dt> CPU-Qwen3-0.6B (46K used)`
 //   S10 compact_memory v1 tool (9) — the L2 approved design (the
  //      compaction-lifecycle proposal): the RETIRED v1 tool file
  //      .opencode/plugin/deactivated/compact_memory_v1.ts is imported DIRECT
  //      from the repo path (type-stripped, the same way the plugin loads —
  //      the tool file
 //      MUST load that way) and driven with a FAKE client (records every
 //      session.compact call; a mutable FAIL switch) + a FAKE context
 //      (directory=SANDBOX steers ALL the tool's fs writes — the budget
 //      store + the COMPACT ctx.log line — into the sandbox; sessionId per
 //      the prototype's working shape, modelId/preReadout = the best-effort
 //      L1 fields):
 //      (67) the tool file imports and exposes the tool() default export
  //          (description + async execute + the prototype's arg names as a
  //          plain-object args of NAME → zod schema; the T3 prototype's
  //          default.tools.compact_memory shape is GONE — re-aligned
  //          2026-09-12 to the committed tool() form, T5 re-verify)
 //      (68) execute calls session.compact with the PASSED-THROUGH keep
 //          knobs (the fake client captures the call) + path.id
 //      (69) the sessionID arg ABSENT → the context.sessionId fallback
 //          targets the compact call
 //      (70) the COMPACT line is written after success — byte-shape
 //          `<dt> <model> COMPACT <sid> tokens=<t> messages=<m>
 //          (<pre-readout>)` (best-effort fields PRESENT when carried)
 //      (71) the same line with model + pre-readout ABSENT → BOTH fields
 //          OMITTED (the T2 omit-when-empty convention), never thrown
 //      (72) the budget allows EXACTLY 2 compactions per session id and
 //          REFUSES the 3rd with the hand-over note (NO compact call on
 //          the 3rd)
 //      (73) the budget state is PERSISTED to disk: compact_budget.json
 //          carries count==2 AND a FRESH module instance (cache-busted
 //          re-import) still refuses — persistence, not in-memory
 //      (74) a FAILING session.compact returns the error note (no throw)
 //          and does NOT consume the budget (the next call compacts)
 //      (75) the success return carries the re-application file pointer;
  //          the refusal return carries the hand-over note
  //   S11 emergency recovery plugin (13) — TODO #93: the 2026-09-25
  //      event-hook port of the T5 prototype (re-pin): the plugin file
  //      .opencode/plugin/context_recovery.ts is imported DIRECT from the
  //      repo path (type-stripped, the same way the plugin loads) and
  //      driven with a FAKE client (records every session.summarize /
  //      session.promptAsync / session.messages call) + FAKE SDK events
  //      (the current host's delivery shape: { type: "session.error",
  //      properties: { sessionID, error } } / { type: "session.idle",
  //      properties: { sessionID } }) + a sandbox root (directory=SANDBOX
  //      steers the flag read, the budget store, and the COMPACT ctx.log
  //      line into the sandbox); the activation flag is the top-level
  //      `emergencyRecovery` key in the SHARED compact_budget.json (the
  //      SAME file the S10/S13 tools use); the v2 budget gate (the
  //      model_budget map — default cap 1, the messages-resolved
  //      "smoke-model" UNLISTED):
  //      (76) the file imports and exposes a default factory whose
  //          returned hooks object carries the `event` hook (NO
  //          "session.error" key — that hook does not exist in the
  //          current SDK)
  //      (77) flag OFF (no emergencyRecovery: true key) + overflow
  //          event → no summarize, no promptAsync, no budget entry
  //      (78) flag ON + overflow event + fresh budget (cap 1) → the
  //          summarize body carries the messages-resolved pair + keep
  //          { messages: 12 } (tokens UNRESOLVED → tok=- none), NO
  //          prompt (2026-09-26 unification Part B: the hook compacts
  //          ONLY — it never resumes), budget count==1 ON DISK, the
  //          COMPACT line
  //          `<dt> smoke-model COMPACT ses_rc_ok keep=12m tok=- none`
  //      (79) the once-per-overflow guard: 3 more burst events for the
  //          same overflow → no-ops (exactly ONE compact), budget
  //          unchanged
  //      (80) EventSessionIdle clears the guard: the next overflow → the
  //          emergency slot (count 1 == cap 1): count → 2, the line
  //          carries the ` emergency` suffix, NO prompt (Part B)
  //      (81) budget exhausted (count 2 > cap 1) → CLEAN FAIL: no
  //          summarize, no promptAsync, no new COMPACT line, budget
  //          unchanged
  //      (257) flag ON + NON-overflow error → no-op
  //      (258) flag value `false` → OFF
  //      (259) keep override: keepMessages 7 in the budget file → body
  //          keep { messages: 7 } (tokens UNRESOLVED → tok=- none) + the
  //          line `keep=7m tok=- none`
  //      (260) config pair override: the sandbox opencode.jsonc
  //          agent.compaction.model → the summarize body carries the
  //          CONFIG pair + the line's model field (file removed
  //          afterwards)
  //      (261) unresolvable model pair (no session.messages) → the
  //          request is NOT sent (CLEAN FAIL)
  //      (285) keepTokens computed (S-diff, metric v2 2026-09-26):
  //          messages carry a token series (wrapper shape, last 12 = all
  //          2, S = 500 + 300 + 4000 = 4800, no assistant before the
  //          window) → body keep.tokens 4800 (computed) + the line
  //          `keep=12m tok=4800 computed`
  //      (286) keepTokens budget fallback: messages read FAILS + budget
  //          store keepTokens 42000 + sandbox config pair (deviation 1)
  //          → body keep.tokens 42000 (budget) + the line
  //          `keep=12m tok=42000 budget`
  //   S12 ctx_gauge tool (4) — the loop-tool-batch part 2 approved design
//      (the peek readout as a directly-fired tool): the tool file
//      .opencode/tools/ctx_gauge.ts is imported DIRECT from the repo path
//      (type-stripped, the same way the probe loads compact_memory.ts — the
//      tool file MUST load that way); the tool wraps the SAME gauge-core
//      module instance (its relative import resolves to the same file), so
//      the setDbPath steering below reaches its reads; the tool is READ-ONLY
//      (no fs writes, no plugin hooks — the sandbox stays clean):
//      (82) the tool file imports and exposes the tool() default export
//          (description string + the optional sessionID arg as a zod schema
//          — undefined parses, a non-string rejects + async execute, NO
//          name field — the host names the tool by filename)
//      (83) execute on the FX_OK fixture (steered via setDbPath): the
//          default newest-session read is BYTE-EXACT (the S4/S7 readout
//          form) and the sessionID arg is passed through (the per-session
//          read of the older fixture session)
//      (84) db-error (the never-created MISSING_DB): no throw, the line is
//          NEVER replaced — `SESSION=unknown CTX=notAvailable` + the
//          APPENDED ` — <error>` note (the in-band mirror of peek.mjs's
//          stderr addition)
//      (85) hook restore (cf. check 39): the global db path is back where
//          S12 found it; a global read and an explicit-path read of the
 //          restored path agree byte-exact (no drift left by S12)
//   S13 compact_memory plugin tool (21) — the approved v2 proposal + the
//      2026-09-14 maintainer adaptation (explicit pair override; SELF sync,
//      CROSS fire-and-forget dispatch — see the spec's revision note) (the
//      plugin-registered compact_memory, quant-class budget; supersedes the
//      v1 pinned by S10): the plugin file is imported DIRECT (type-stripped)
//      — no hook fires (S5 tallies unaffected); ALL fs writes steered into
//      the sandbox via directory=SANDBOX; fake client records
//      summarize/compact/messages; fresh ses_qc_* ids (in the FINGERPRINT):
//      (86) registration shape (4 args — the override pair is GONE, unit A); (87)
//      classifier fixtures incl. the trap; (88) summarize path (SELF sync) +
//          default response BYTE-EXACT; (89) keep retry-once (cross dispatch,
//          async-verified); (90) compact flat; (91) no-client error naming
//          both probes; (92) gate (cross: cap−1 + cap (the override)
//          dispatched, cap+1 denied, zero side effects); (93) CPU cap 0
//          plain SELF call always denied; (94) increment-on-verified-
//          success only (cross dispatch); (95) v2 store schema on disk (model
//          populated, count 4 — the override slot); (96) COMPACT line WITH
//          model; (97) message + dispatch
//          line (cross, NO trailer); (98) cross-session model read (the LAST
//          entry, pair-less); (100 REMOVED 2026-09-21 unit A — the explicit
//          pair override is GONE, the S25 section pins the config resolver);
//          (99) failing RPC (default cap + note, no throw);
//          (222) emergency-1 + cross override gate part 1 (item 10 +
//          TODO #128: fixture {Gate-M: 2} + emergency_budget 1 — calls 1-2
//          dispatched, call 3 no-arg CROSS DISPATCHED via the override
//          (count → cap+1, the COMPACT line carries `ovr`, the normal
//          lines carry NO suffix)); (223) call 4 emergency:true DENIED at
//          count == cap+1 (the override named consumed — no second slot,
//          no ` emergency` line); (224) call 5 emergency:true DENIED
//          (fully exhausted) + the state survives a FRESH module instance
//          (cache-busted re-import); (225) emergency_budget 0 → the CROSS
//          override is UNCONDITIONAL (dispatched at count == cap, the
//          `ovr` line, then DENIED); (226) key ABSENT (SELF shape) →
//          fail-open default 1 (the self emergency is consumed);
//          (287) keepTokens computed (S-diff, metric v2 2026-09-26, tool
//          path): messages carry a token series (wrapper shape, last 2,
//          S = 400 + 250 + 6000 = 6650, no assistant before the window) →
//          body keep.tokens 6650 (computed) + the line
//          `keep=2m tok=6650 computed`;
//          (288) keepTokens budget fallback (tool path): messages read
//          FAILS + store keepTokens 30000 + model_budget cap 3 → body
//          keep.tokens 30000 (budget) + the line `keep=4m tok=30000 budget`
//   S14 compact_memory pre-compaction dump hook (8) — TODO #152 (approved
//      2026-09-15): BEFORE ANY dispatch the hook dumps the target session's
//      full pre-compaction content into the corpus via the dump script
//      (<root>/agent/scripts/db/dump_session.cjs <sid> --out
//      <relpath>), BOTH artifacts (#92 2026-09-27: the md + the raw json —
//      the json spawn carries --out <rel>.json --json), each INDEPENDENTLY
//      (one's failure does not skip the other); NO-OVERWRITE naming keyed on
//      the budget count (the MD base decides the stamp — both artifacts share
//      the stamped base: compaction_dumps/<sid>_c<count>[<stamp>].{md,json});
//      best-effort — a failure appends DUMP-FAIL to the ctx.log + a WARNING
//      to the dispatch response (UNCHANGED on success):
//      (101) preCompactionDumpName byte-exact (the normal c0/c7 case — the
//          3-arg "md" default, byte-identical pre-#92);
//      (102) preCompactionDumpName byte-exact (the stamped fallback, fixed
//          stamp — NO clock inside the function);
//      (103) preCompactionDump is a function (the exported hook);
//      (104) sandbox root WITHOUT the script → no throw, {ok:false}, EXACTLY
//          two DUMP-RETRY=1 lines (one per rel) + two DUMP-FAIL lines (one per
//          rel, the captured stderr detail) appended to the sandbox ctx.log —
//          the error names BOTH artifacts;
//      (105) the FAKE script (mimicking the real one's __dirname OUT_DIR +
//          --out handling — rel-driven, serves BOTH artifacts): hook call #1
//          (count 0) creates BOTH compaction_dumps/<sid>_c0.{md,json} with the
//          marker content — {ok:true} + files = [md, json];
//      (106) hook call #2 (same count) → the MD base EXISTS now → the STAMPED
//          names (<sid>_c0_<YYYYMMDDTHHmmss>.{md,json}) are created instead —
//          BOTH basenames match the stamp;
//      (107) no-overwrite proof: BOTH file #1s are BYTE-IDENTICAL after
//          call #2;
//      (345) preCompactionDumpName byte-exact (the #92 json form: the c0 +
//          the stamped c3 case)
//   S15 block_transfer tool (12) — the #60 probe pin (part 1 of 2): the
//      named-clipboard block mover (.opencode/tools/block_transfer.ts,
//      post-#57) imported DIRECT (type-stripped, the S12/S13 load pattern);
//      ONE loaded instance drives the whole section (the in-memory
//      clipboardBuffers); all writes steered to the sandbox (directory=
//      SANDBOX, inside TEMP — the tool's own allowed root):
//      (108) registration shape: the tool() default export (description +
//          the 7 args in order — the mode enum, 6 optional strings — async
//          execute, NO name field);
//      (109) COPY: the inclusive anchor span + the byte-exact `Copied`
//          return + the source byte-identical;
//      (10.10) PASTE round-trip (fresh dst, EOF append): byte-exact return +
//          the dst carries the inclusive block byte-exact;
//      (10.11) PASTE with targetMarker: the block lands RIGHT AFTER the
//          target line (vs the EOF append of 10.10), byte-exact file;
//      (10.12) the #57 post-fix pin: MOVE without dstFile → the exact
//          `Error: 'dstFile' is required for MOVE mode.` + the source
//          byte-identical (the guard is hoisted pre-write);
//      (10.13) the sandbox guard: MOVE with an outside dst → the byte-exact
//          `Error: '<path>' is outside the sandbox (allowed: <roots>)`
//          BEFORE any fs access (source untouched, no file created);
//      (10.14) the missing start marker → the byte-exact error naming the
//          marker + the file;
//      (10.15) the end marker present ONLY before the start → the byte-exact
//          `... not found after start marker.` (the end search starts at the
//          start line);
//      (10.16) the buffer lifecycle end: the byte-exact CLEAR return + a
//          PASTE of the cleared buffer → the byte-exact empty-buffer error
//          (no file written);
//      (10.17) MOVE success: byte-exact `Moved` return + the source cut to
//          its byte-exact remainder + the dst carrying the inclusive block;
//      (262) TODO #94: REPLACE happy path: the anchored span of the existing
//          dst replaced IN PLACE by the buffer — byte-exact dst + byte-exact
//          `REPLACED` report + the buffer preserved (a later PASTE still
//          reports its 2 lines);
//      (263) TODO #94: REPLACE non-unique start anchor → the byte-exact
//          non-unique error + the dst byte-identical (no write)
//   S16 loop_log tool (6) — the #60 probe pin (part 2 of 2): the looprun
//      activity log as a directly-fired tool (.opencode/tools/loop_log.ts,
//      T3 loop-tool-batch part 3) imported DIRECT (type-stripped); driven
//      with sandbox roots (the created autorun-* folder + loop_log.md land
//      in the sandbox, never the repo's real loop/); the folder
//      stamp is local-clock — pinned by FORMAT only (the AGENTS.md
//      pattern-5 discipline):
//      (10.18) registration shape: the tool() default export (description +
//          the 5 args in order — role/model/content required strings, the
//          status ENUM of the five 8-char tokens, session optional — async
//          execute, NO name field);
//      (10.19) the empty loop root → auto-created
//          `autorun-<YYYY-MM-DD_HH-MM>` (stamp format pinned) + loop_log.md
//          (one line); the return is EXACTLY `folder: <name>\nline: <line>`
//          (no ANOMALY);
//      (120) the line format `<stamp> <status> <role> <session|unknown>
//          <model> <content>` (field order byte-exact) + the omitted session
//          → the literal `unknown`;
//      (121) the session passthrough (4th field) + append-only (the file
//          gains EXACTLY one line per call) + the single-folder reuse (no
//          ANOMALY);
//      (122) the empty-string session → the literal `unknown` (the
//          fallback covers omitted AND empty);
//      (123) the SEVERAL-folders anomaly: the most-recently-MODIFIED
//          folder is used + the byte-exact `ANOMALY:` note as the 3rd
//          return line (the other folder untouched)
//   S17 numword scriptlet (26) — the lane-5.2 pin (approved 2026-09-16): the
//      ONE shared map (numwords.json) + the node entry point (CLI spawned,
//      module required DIRECT) + the python twin (spawned via the repo venv
//      python — the fixture run is LIVE in the probe):
//      (124) the shared map is complete: units zero..nine, tens ten..ninety
//          incl. the `fourty` alias → 40, teens eleven..nineteen EXPLICIT;
//      (125-131) node CLI pass fixtures: nine→9, ninetyfour→94, fourty→40,
//          one-zero-one→101, two-zero→20, one-zero-six→106, eleven→11
//          (exit 0, digit string byte-exact);
//      (132-135) node CLI reject fixtures: twozero / two+zero / foour /
//          eleventy → exit 1 + `unknown` on stderr (loud, never guessed);
//      (136-142) python w2n pass fixtures: the same 7, byte-exact stdout;
//      (143-146) python w2n reject fixtures: the same 4 → ValueError (non-zero
//          exit);
//      (147) the module (node -e usable): w2n agrees with every pass fixture;
//      (148) the module: every reject fixture throws (loud);
//      (149) numword_check: AGREE 20 (code 0) / DISAGREE 9 (code 1) /
//          UNKNOWN eleventy (code 2) — machine-readable shell contract
//   S18 intercept observer (32) — the lane-5.3 log-only pin + the lane-5.4
//      read-scope fuzzy resolution (approved 2026-09-16): the NAMED core
//      (pure functions over arg strings + the ONE shared numword map —
//      addendum C3) from intercept_observer_core.ts + the C7 8-field line
//      shape + the never-mutates (observation channel) / never-throws hook
//      discipline + the read-scope mutation contract:
//      (150-151) the ONE shared map home: the REAL numwords.json loads; a
//          missing path → null (numword checks silently off);
//      (152-154) resolveNumword: every 5.2 pass fixture → value; every 5.2
//          reject fixture → unknown (loud, never a guess); a multi-split
//          word (synthetic map) → ambiguous WITH candidates;
//      (155-156) observeDense (>=6-digit run gate) + observeNumword (map hit
//          → value; twozero unknown → none; map null → none);
//      (157-160) observePairs: agree (dist=0) / mismatch (dist=1) / unknown
//          word (gate=word-unknown) — byte-exact evidence; a shell pipe
//          (spaces) and a word-first order are NOT pairs;
//      (161-163) observePathAnomaly (doubled segment) + observeSandbox
//          (outside/under/null root) + underRoot (JSON-escaped `\\` collapse,
//          case-insensitive);
//      (164) classifyContext: date / session-id / commit-ref / path / arg;
//      (165-166) observeArg: 5 firing classes → capped at 3 lines in
//          priority order; clean/empty arg → no line;
//      (167-169) the HOOK (real factory, sandbox project dir): output.args
//          byte-identical (observation channel never mutated); garbage input
//          → never throws; the log line is EXACTLY 8 " | " fields
//          (stamp/sid/model-unknown/tool/verdict vocabulary) + the LIVE log
//          untouched;
//      (170) the intercept log path is git-ignored;
//      (171) the EXPORT FIX: the plugin module exports the default factory
//          ONLY (every Object.values entry is a function — the host loader
//          contract; the ~16 named exports moved to the core file);
//      (172-178) the read-scope FUZZY MATCHER (core.resolveReadPath, pure
//          over a relative-path corpus — research §2.2/§2.5): exact (byte-
//          equal rel) → {exact}; normalize (case/backslash/trim) → {exact};
//          d=1 → {resolved,d:1,gap>=2}; d=2 (transposition) → {resolved,
//          d:2,gap>=2}; gap<2 (two close siblings) → {rejected,
//          reason:gap-too-small, top-3 cands [rel,d]}; d>2 → {rejected,
//          reason:d-too-high, top-3 cands}; empty corpus → {rejected,
//          reason:empty-corpus} (fail-safe: never resolves);
//      (179-181) the HOOK read-scope (real factory, sandbox project dir,
//          real corpus under a sub-root): a d<=2 mistyped read filePath is
//          MUTATED to the resolved absolute path + a fuzzy-resolved 8-field
//          line; a d>2 read is FAIL-CLOSED (args byte-identical) + a
//          fuzzy-rejected line (top-3 cands + reason); an exact existing
//          path → untouched + no fuzzy line + the LIVE log still untouched.
//   S19 [l:r] pair pipeline (13) — the R1 pin (approved 2026-09-16; design
//      source: research/fuzzy-numword/decision-record.md §2.4-§2.6): the
//      [left:right] grammar (no inner spaces, exactly one colon; left ∈
//      digits-as-seen | adder-sum | numword form incl. the `fourty` alias;
//      right = numword form ONLY; the OLD digit|word pipe form is dead) +
//      the read-scope pair mutation (existence gate, right-wins canonical)
//      + the non-read log-only rule + the SCRATCHPAD_ROOT allowance:
//      (182) adder-left [800+50+11:eight-six-one] → ok (the SUM is the left
//          value), byte-exact evidence;
//      (183) mismatch right-wins [121:one-two-zero] → redundancy-mismatch,
//          canon=120 (ALWAYS the right-derived value);
//      (184) multi-pair per arg → 2 independent ok lines (one per pair);
//      (185) form negatives: old pipe form (dead), inner spaces, 2-colon →
//          none;
//      (186) numword-left [four:four] → ok; unknown left [foour:four] →
//          no-candidate gate=left-unknown;
//      (187) the `fourty` alias on a pair side → [40:fourty] ok;
//      (188) HOOK read gate: canonical exists + pair path absent → filePath
//          MUTATED to the canonical + a pair-resolved 8-field line (exactly
//          ONE line — no double-logging);
//      (189) HOOK read gate fail-closed: canonical absent → NOT mutated +
//          pair line gate=none-exist + the fuzzy channel still runs on the
//          result (fuzzy-rejected — the fixed pipeline order);
//      (190) HOOK read gate both-exist (brackets legal on-disk) → NOT
//          mutated + pair line gate=both-exist;
//      (191) HOOK read right-wins mutation: [7:eight] mismatch → MUTATED to
//          file-8.txt + pair-resolved dist=1;
//      (192) HOOK non-read (bash): pair logged ONLY, args byte-identical;
//      (193) SCRATCHPAD_ROOT: constant pin + slash/backslash-case/deep
//          scratchpad paths → no out-of-sandbox; C:\Windows control fires;
//      (194) HOOK scratchpad: bash arg under the scratchpad → zero lines.
//   S20 write-scope pair/fuzzy (15) — the R2 pin (approved 2026-09-16) +
//      the M1 write-fuzzy exclusion (approved 2026-09-17, #72); design
//      source: research/fuzzy-numword/decision-record.md §2 + research doc
//      §2.3/§3.4): the strict existence gate at the MUTATING surface + the
//      mismatch fail-closed asymmetry + the d<=1 write-fuzzy bar on
//      edit/block_transfer ONLY (`write` excluded — "new file" is a legal
//      intent, the d=1 near-miss must not hijack; scope=write flag — the
//      nine verdicts stay byte-identical) + the content-scope guard + the
//      bash git-ref gate (git for-each-ref existence):
//      (195) HOOK write pair gate: canonical exists + pair-form absent →
//          filePath MUTATED + pair-resolved gate=mutated (byte-exact);
//      (196) HOOK write pair gate fail-closed: canonical absent → NOT
//          mutated + gate=none-exist + NO fuzzy line (M1: the write fuzzy
//          channel is gone — zero new lines beyond the pair line);
//      (197) HOOK write pair gate both-exist → NOT mutated + gate=both-exist
//          (one line, the fuzzy fast-paths the existing original);
//      (198) HOOK write MISMATCH ASYMMETRY: [7:eight] + file-8.txt exists →
//          NOT mutated + redundancy-mismatch gate=fail-closed (contrast the
//          read scope, S19 pin 191) + NO fuzzy line (M1);
//      (199) HOOK block_transfer: srcFile pair MUTATED + dstFile
//          byte-identical;
//      (200) HOOK write fuzzy d=1 (file-9.txt, single-sibling dir) → NOT
//          mutated + ZERO new log lines (M1, 2026-09-17, #72: no fuzzy
//          channel for write — the d=1 near-miss must not hijack);
//      (201) HOOK write fuzzy d=2 (file-56.txt) → NOT mutated + ZERO new
//          log lines (M1 — nothing is logged for a bare write miss);
//      (202) content-scope guard (write): pair in content → log line ONLY,
//          args byte-identical (the `args[1:one]` python-slice collision);
//      (203) content-scope guard (edit): pair in oldString → log line ONLY,
//          args byte-identical;
//      (204) HOOK bash git-ref gate PASS: 40-hex tag ref verifies → command
//          MUTATED + pair-resolved gate=ref-mutated run=<tag> (byte-exact);
//      (205) HOOK bash git-ref gate FAIL: 1-char-off ref unverified → NOT
//          mutated + gate=ref-rejected run=<failref>;
//      (206) HOOK bash git-ref mismatch → NOT mutated + bare mismatch line
//          (no gate attempt);
//      (207) HOOK bash git-ref no-candidate ([4:foour]) → gate=right-unknown,
//          NOT mutated (gate not attempted);
//      (208) HOOK edit fuzzy d=1 (file-9.txt, the wf fixture) → MUTATED to
//          file-4.txt + fuzzy-resolved scope=write d=1 gap=inf (edit KEEPS
//          the fuzzy channel — M1);
//      (209) HOOK edit fuzzy d=2 (file-56.txt) → NOT mutated +
//          fuzzy-rejected scope=write reason=d-too-high (edit keeps the
//          d<=1 bar — M1).
//   S21 R7 segment-level channel (12) — the R7 pin (2026-09-17; design
//      source: research/fuzzy-numword/decision-record.md §5 R7) + the #73
//      STRUCTURAL dedup-collapse pre-check (2026-09-17): a path is a
//      sequence of FOLDER UNITS (distance per segment; the doubled folder
//      = one INSERTION); the substitution bar (a segment substitution
//      counts as seg-d 1 ONLY when intra-segment lev <= 1 — a char-far
//      sub is non-substitutable); the >=2-segment hook gate (1-segment
//      args BYPASS the segment matcher — the char channel owns them, the
//      S18/S20 pins); the kind=seg / kind=dedup evidence flags (the
//      9-verdict vocabulary is untouched) + the M1 exclusion extends to
//      the segment + dedup channels. The dedup pre-check (before the
//      corpus matchers): an adjacent identical FOLDER pair in the
//      ABSOLUTE path → collapse one copy; the collapsed path EXISTS →
//      kind=dedup d=0 (NO gap field); absent → fail-closed fall-through:
//      (210) HOOK read doubled-seg → MUTATED + kind=dedup scope=read d=0
//          (the #73 collapse fires first — the collapse target EXISTS);
//      (211) HOOK edit doubled-seg → MUTATED + kind=dedup
//          scope=write d=0;
//      (212) HOOK write doubled-seg → NOT mutated + ZERO lines (M1);
//      (213) PURE lev-1 folder mismatch → resolved d=1 (the substitution
//          bar);
//      (214) HOOK char-far folder mismatch → NOT mutated + fuzzy-rejected
//          (seg-rejected → the char fallback also rejects — NO kind=seg);
//      (215) PURE seg-d=2 (two insertions) → rejected d-too-high;
//      (216) PURE tie at seg-d=1 → rejected gap-too-small;
//      (217) PURE 2-seg filename typo → resolved d=1 (the segment
//          channel subsumes the char-close name typo);
//      (218) HOOK read doubled-NESTED (the realistic shape, the collapse
//          target EXISTS) → MUTATED + kind=dedup scope=read d=0;
//      (219) HOOK edit doubled-nested → MUTATED + kind=dedup
//          scope=write d=0;
//      (220) HOOK read doubled-nested, collapse target ABSENT → NOT
//          mutated + fuzzy-rejected (NO kind=dedup — the fail-closed
//          fall-through);
//      (221) HOOK write doubled-nested → NOT mutated + ZERO lines (M1
//          extends to the dedup pre-check).
//   S22 submit tool (9) — the #53 Part B pin (2026-09-18; approved
//      2026-09-17_agent-feedback-closedown.md part 2): ONE unified append
//      tool for the three agent-inbox channels — the registration shape
//      (3 shape checks: the tool() default export (description + the 3
//      channel args IN ORDER) / NO stale name+parameters keys (the host names
//      the tool by FILENAME) / execute an AsyncFunction), the arg schema
//      (the 3 channel args feedback/knowledge/todo ALL optional-
//      accept: undefined AND a string — the at-least-one-required rule
//      is a RUNTIME rule, not a schema one), the no-params error ({} AND
//      all-empty-string args → the exact error string + NO target
//      created — nothing written), one append behavior per param (the
//      entry = <header> <stamp> <role> <session> + the raw text + one
//      trailing blank line, appended to the HARDCODED target; the stamp
//      is minute-resolution, pinned by FORMAT + the before/after trick;
//      the return per param = <param> + target: <rel> + entry: <exact
//      text>; feedback → agent/agent_feedback.md ### /
//      knowledge → agent/knowledge/knowledge_inbox.md ## /
//      todo → the PROJECT-ROOT todo_inbox.md ## — the no-path-parameter
//      IS the sandbox: the deliberate deviation from the proposal
//      (the proposal's quoted ".opencode/ subtree" wording — the quote
//      marks are literal file content), ratified by the spec), and the
//      never-read preservation (all three targets pre-seeded with
//      sentinels; ONE feedback append → the sentinel BYTE-EXACT before
//      the appended entry; the unprovided targets byte-identical — the
//      tool appends, it NEVER reads or rewrites):
//      (230) registration shape (1 of 3): the tool() default export
//           (description + the 3 channel args in order + an execute function);
//      (231) registration shape (2 of 3): NO stale name/parameters keys;
//      (232) registration shape (3 of 3): execute is an AsyncFunction;
//      (233) arg schema: all 3 channel args optional-accept (undefined AND a string);
//      role/session absent from the schema (auto-filled from the tool context);
//      (234) no-params error: {} and all-empty-string → the exact error string +
//           NO target created (nothing written);
//      (235) feedback append: target created carrying ONLY the entry (### stamp),
//           return byte-exact, the other two targets absent;
//      (236) knowledge append: target created carrying ONLY the entry (## stamp),
//           return byte-exact, the other two targets absent;
//      (237) todo append: project-root target created carrying ONLY the entry
//           (## stamp), return byte-exact, the other two targets absent;
//      (238) never-read preservation: pre-seeded sentinel byte-exact before the
//           appended entry + the unprovided targets byte-identical.
//   S25 compact_memory unit A (7) — 2026-09-21 (priority.md #1): the 3-key
//      args + the config-resolved summarizer + the DUMP-OK line (the
//      S13 check 100 explicit-pair override pin is REMOVED):
//      (250) the new exports: resolveCompactionModel + stripJsoncComments;
//      (251) config present: agent.compaction.model → the config pair,
//          source 'config';
//      (252) comment + URL-safe parse: a // inside a string literal does
//          NOT start a comment (JSONC string-state-aware strip);
//      (253) the fallback battery (absent / no-key / non-string / no-'/' /
//          empty halves / unparseable → the fallback pair UNCHANGED);
//      (254) block comments + the FIRST-slash split ('prov/one/two');
//      (255) the DUMP-OK line on a successful dump (the DUMP-FAIL prefix
//          style, the numeric ms field);
//      (256) tool integration: the sandbox opencode.jsonc config model →
//          the summarize body carries the config pair (3-key args).
//   S26 R6 edit hint channel + payload journal (20) — 2026-09-25 (TODO #95
//      sub-item 1; design source: research/fuzzy-numword/decision-record.md
//      §8): the CONTENT locator primitive (core — anchor/candidate +
//      d<=2 gap>=2 over file lines, fail-closed), the payload journal
//      (journal_write.log / journal_edit.log — a separate file, never an
//      intercept line), the edit hint channel (edit-hint / edit-ambiguous /
//      no-candidate), the after-hook enrichment:
//      (257-258) the locator: single-line exact; multi-line exact (anchor =
//          first + last line);
//      (259-260) the locator fuzzy bar: d=1 (gap inf); d=2 (gap 4);
//      (261) the locator ambiguous (two candidates, gap 0 < 2);
//      (262-264) the locator fail-closed: no-anchor-line / d-too-high /
//          empty-arg;
//      (265) the all-dense query: present dense line → exact; absent →
//          rejected d-too-high;
//      (266) the file-size cap: within → found; beyond → rejected;
//      (267) journal write: one line (JSON payload round-trips) + zero
//          intercept lines;
//      (268) journal edit: one line ({filePath, old, new}) + the exact-1
//          hint is silent;
//      (269) journal block_transfer: one line in journal_edit.log (the tool
//          field disambiguates; the anchors payload);
//      (270) the journal paths are git-ignored (check-ignore, both files);
//      (271) ((2) + #106) absent oldString, single candidate d=1 → now
//          MUTATES: fuzzy-edit applied line (byte-exact) + oldString
//          mutated to the file's exact bytes (stored + delivered on the
//          successful result — #106);
//      (272) hint multiple exact: two occurrences → edit-ambiguous
//          'hint rejected lines=1,3' (#106 token; shape unchanged);
//      (273) hint no candidate: anchor absent → no-candidate
//          'hint rejected reason=no-anchor-line' (#106 token — no
//          candidate → no best-d);
//      (274) hint fuzzy ambiguous: two candidates, same d → edit-ambiguous
//          'hint rejected cands=1 1,2 1' (#106 token — not exactly-one);
//      (275) after-hook enrichment ((2) + #106 re-pin): c271 a mutation
//          (the fuzzy-edit applied line delivered on the successful
//          result) + the fail-closed c273 (the rejected no-candidate hint,
//          consumed once; hint-less / non-edit untouched);
//      (276) DoD machine check ((2) re-pin): the fail-closed c273's no-
//          candidate line + journal payload (the journal's edit `old` = the
//          ORIGINAL pre-mutation oldString); the write payload cp check
//          stays.
//   S27 (2) the MUTATING edit-fuzzy oldString (8) — 2026-09-25 (TODO #95
//      sub-item 2; design source: research/fuzzy-numword/decision-record.md
//      §8.2 + spec_sub2_edit_fuzzy_oldstring.md): the 0-raw-occurrence case
//      resolves WITHOUT agent action (normalize-then-compare; d = the MAX
//      Levenshtein over the scored line-pairs) — exactly-one candidate at
//      d=0/d≤1 → oldString MUTATED to the file's exact unique bytes (the
//      `fuzzy-edit applied` line; STORED + DELIVERED on the successful
//      result — #106); else FAIL-CLOSED (the R6 hint verdict carrying the
//      best-candidate d — directive a — the `hint rejected …` line — #106;
//      the after-hook hint is stored); directive b: the feedback line is
//      truncated (first 40 chars + ...), the journal carries the FULL
//      original oldString:
//      (277) CRLF-drift: 0 raw → d=0 → MUTATE (line + exact-unique
//          substring);
//      (278) trailing-ws drift: 0 raw → d=0 → MUTATE;
//      (279) single typo: exactly one candidate d=1 → MUTATE;
//      (280) fail-closed near-miss: best d=3 → NOT mutated (the fail line
//          carries 'best-d=3' — directive a);
//      (281) ambiguous: two candidates d<=1 → NOT mutated (edit-ambiguous);
//      (282) directive (b): long oldString → the line is TRUNCATED (no full
//          oldString), the journal carries the FULL original;
//      (283) after-hook ((#106) re-pin): mutate → the fuzzy-edit applied
//          line is DELIVERED on the successful result; fail → the
//          rejected best-d hint is delivered (consumed once);
//      (284) the fuzzy-edit line shape byte-exact (8 fields).
//   S28 R8 the out-of-sandbox path redirect (12) — 2026-09-25 (TODO #97
//      unit 1): an out-of-sandbox TYPED path span that maps EXACTLY ONCE to
//      an allowed root (after root dedupe) is REDIRECTED (mutated) before
//      the call runs; 0 or >=2 → fail-closed (no mutation). The pure 1:1
//      resolver (case (i) span == root → the root as configured; case (ii)
//      direct sibling → root + separator + basename; the root dedupe; the
//      degenerate inputs) is pinned PURE; the hook-level e2e pins run over
//      the FALLBACK roots [workspace root (ioSandboxProj), SCRATCHPAD_ROOT]
//      (the probe's sandbox proj has no opencode.jsonc — the config-read
//      path is smoke-pinned via a second factory instance with a crafted
//      config):
//      (285) case (i): span == root (case/separator variant) → the root as
//          configured (exactly one match);
//      (286) case (ii): a direct sibling → root + '/' + the span's basename
//          (case preserved);
//      (287) no mapping (0 matches) → null (fail-closed);
//      (288) a sibling of TWO distinct roots (same parent) → null
//          (fail-closed — never picks one);
//      (289) root dedupe: 3 forms of ONE root → ONE match (the first
//          configured form wins);
//      (290) a child of the root and a two-levels-down sibling → null (not
//          a 1:1 mapping);
//      (291) degenerate inputs (empty span / empty root list) → null
//          (never throws);
//      (292) hook e2e READ sibling of the workspace root → MUTATED + the
//          kind=redirect line (byte-exact, cap-flattened) + NO out-of-
//          sandbox line (the note recomputes on the effective args);
//      (293) hook e2e WRITE sibling → MUTATED + EXACTLY ONE new line
//          (M1: write has no fuzzy channel);
//      (294) hook e2e span == root (case variant) → the root as configured;
//      (295) hook e2e no mapping (an existing out-of-sandbox path) → NOT
//          mutated + the out-of-sandbox NOTE fires (as today);
//      (296) hook e2e nested non-sibling (under the root) → NOT mutated +
//          NO kind=redirect line + no out-of-sandbox.
//   S5 hygiene (6): every sandbox plugin.log line is JSON.parse-able; <=2000
//      chars with an ISO ts + a string kind; exact kind tallies (warn==2,
//      tool.before==6, tool.after==24, chatmsg==8, gauge==3, event==0,
//      nudge==14); the
//      real handover files byte-identical to pre-run and zero CO-APPENDED live
//      lines (the real plugin.log may only grow — a line carrying a probe
//      fingerprint id s*/c*/d*/t*/e1–e9/f1–f14/ses_fx_*/ses_other/ses_lad_*/
//      ses_ro_* = the probe wrote out of the sandbox); zero new/changed files
//      outside the sandbox (.opencode listing + git status, before vs after);
//      the ctx log path is git-ignored (git check-ignore -q, REPO_ROOT).
//   S30 block_transfer v2 S3: WRITE + PEEK + unified Part F feedback (11)
//      — 2026-09-26 (the bt-v2 wave, S3 = proposal Parts D+E+F; the tool
//      file is imported DIRECT, type-stripped, the S12/S13/S15 load
//      pattern; the S15 pins 108/110/111/115/116/117/262/263 are re-pinned
//      in place to the new shapes):
//      (305) WRITE single span: byte-exact Part F feedback + the span
//          replaced IN PLACE (byte-exact dst);
//      (306) WRITE on an ABSENT file (flagged detail #2): no missing-file
//          guard — the marker refs resolve against the EMPTY state
//          (teaching not-found) + the number refs are out of range (the
//          file has 0 lines) + the file never created (no partial state);
//      (307) WRITE 'regions' LIST (2 regions): ALL refs resolve against
//          the PRE-call state, applied HIGHEST LINE -> LOWEST (no
//          shifting) — the 3-line feedback (per-op descending + summary)
//          + byte-exact dst;
//      (308) WRITE 'regions' with OVERLAPPING spans: the teaching error
//          with the ACTUAL line numbers + the dst byte-identical (no
//          write);
//      (309) WRITE input guards: missing-dstFile / missing-text /
//          'regions'+markers mutually exclusive / single-span needs both
//          markers — byte-exact errors;
//      (310) PEEK default: the line count + 3 head + 3 tail (byte-exact
//          shape) — the BLANK line is skipped when picking the echoed
//          lines;
//      (311) PEEK window: the from/count bounded window (byte-exact) +
//          the 25-line CAP (a 40-line request on a 30-line buffer echoes
//          exactly lines 1..25);
//      (312) PEEK guards: 'from'+'count' must be given together (either
//          side alone → the exact error) + the empty-buffer error (absent
//          buffer) + 'from' beyond the buffer → the ref-out-of-range
//          error (with the count);
//      (313) unified Part F feedback (buffer ops): byte-exact CUT line +
//          PASTE line (resolved range + first-line echo + the buffer
//          count AFTER) + the source cut byte-exact;
//      (314) unified Part F feedback (non-buffer + CLEAR): byte-exact
//          DELETE line + CLEAR line (the buffer count AFTER the op = 0);
//      (315) the v2 teaching error switch (the S1-deferred format):
//          byte-exact non-unique error (match count + the first match
//          line numbers) + byte-exact end-before-start error carrying
//          the file reference.
//   S31 R3 arg-scope extension (21) — 2026-09-26 (spec:
//      research/fuzzy-numword/spec_R3_arg_scope_extension.md; design
//      source: decision-record.md §2 + research doc §2.6/§3.5): the FOUR
//      channels beyond `read` — the pure core surface pinned from the
//      SPLIT core (the S18/S19 load pattern) + the hook pins over the
//      SAME real factory + sandbox project dir (the S19 pf/ corpus; the
//      anchor/bt fixtures join it):
//      (317) matchAnchorPrefixLines: CRLF-tolerant + leading
//          spaces/tabs stripped from line AND anchor (#104: mirrors the
//          tool's plan25 b trim) + verbatim case-sensitive prefix (a
//          longer line still matches) + 1-based; empty/all-whitespace
//          anchor → [];
//      (318) drift guard: the core's matchAnchorPrefixLines /
//          countFileLines EQUIVALENT to the block_transfer tool's own
//          matchAnchorLines / countLines (the S1 unified rule, 0d85a8c +
//          plan25 b trim — the anchor-trim dimension pinned via the
//          "  Dup" fixture, #104);
//      (319) resolveSectionAnchor: null file → absent; exactly-one →
//          resolved (line + scanned total); 0 → rejected matches=0;
//          >=2 → rejected matches=2 (FAIL-CLOSED);
//      (320) quotedSpans: double-quote (a backslash escapes) + single-
//          quote (no escape) + unterminated → to the end + empty span
//          contributes nothing + source order;
//      (321) inQuotedSpan: containment exact (inside / the exact
//          boundaries / straddling / outside / no spans);
//      (322) HOOK glob PAIR channel: the read `filePath` + the glob
//          `path` field share ONE READ gate — path MUTATED to the
//          canonical + pair-resolved gate=mutated (exactly one line);
//      (323) HOOK grep content-scope guard: a pair in the `pattern`
//          field → observation-form line ONLY (no gate token, never
//          mutated) + the `path` field untouched;
//      (324) HOOK section-ANCHOR resolver EXACTLY-ONE: the string
//          `offset` REWRITTEN to the 1-based line number (+ `limit`
//          clamped to the file end: 50 → 3) + the anchor-resolved line;
//      (325) HOOK anchor ZERO matches: FAIL-CLOSED — the offset runs
//          (byte-identical) + anchor-rejected matches=0;
//      (326) HOOK anchor MULTI (2) matches: FAIL-CLOSED — the offset
//          runs (byte-identical) + anchor-rejected matches=2;
//      (327) HOOK numeric-string offset: the SILENT type repair (the
//          string '3' → the number 3) + zero lines (line-offsets stay
//          the fallback);
//      (328) HOOK file MISSING: silent fail-closed (no anchor line, args
//          byte-identical) + the fuzzy channel still runs (fuzzy-
//          rejected);
//      (329) HOOK BASH QUOTED-FORM: a quoted pair → the command MUTATED
//          in place (the quotes stay) + pair-resolved kind=quoted (run
//          < 4 — no ref gate);
//      (330) HOOK quoted MISMATCH: FAIL-CLOSED (command byte-identical +
//          redundancy-mismatch gate=fail-closed — never "helpfully"
//          rewritten);
//      (331) HOOK OWNERSHIP SPLIT: one command with a quoted pair (the
//          quoted-form channel mutates) + an unquoted pair (the git-ref
//          channel, log-only) — two lines (the unquoted one first), the
//          unquoted pair untouched;
//      (332) HOOK block_transfer ANCHOR-MARKER MUTATED: the S1
//          startsWith+unique gate on the effective srcFile — the
//          startMarker MUTATED to the canonical + gate=mutated line=2 +
//          exactly ONE line (the anchor fields are EXCLUDED from the
//          content-scope loop — no double-logging);
//      (333) HOOK anchor gate NONE-EXIST: the canonical matches nothing
//          → NOT mutated + gate=none-exist;
//      (334) HOOK anchor gate BOTH-EXIST: raw + canonical both match →
//          NOT mutated + gate=both-exist (the on-disk pair form wins);
//      (335) HOOK anchor gate NON-UNIQUE: the canonical matches >=2 →
//          NOT mutated + gate=non-unique (the S1 uniqueness contract);
//      (336) HOOK anchor MISMATCH FAIL-CLOSED: the pair is a mismatch →
//          NOT mutated + gate=fail-closed (never a mutated anchor);
//      (337) HOOK targetMarker ownership: the targetMarker resolves
//          against the EFFECTIVE dstFile (not the srcFile) — mutated
//          line=1 arg=targetMarker.
//   S32 compaction unification equivalence (3) — 2026-09-26 (approved
//      proposal 2026-09-26_compaction-unification.md Part C — the drift
//      guard: both entry points route through the shared
//      compaction_core.ts, so they can never silently diverge again):
//      (338) the core module surface: type-stripped direct import + the
//          named exports are functions (+ SELF_ROOT) + NO default export
//          (the plain-module pattern);
//      (339) the EQUIVALENCE of the summarizer-pair + keep resolution:
//          the tool dispatch and the hook fire over the SAME session/
//          model fixture (no sandbox opencode.jsonc — the pair comes
//          from the session's OWN model, the 14-26 fix) → the SAME
//          summarize body (pair + keep);
//      (340) the EQUIVALENCE of the cap semantics: a cap-2 pinned model
//          — the tool allows 2 then refuses (no emergency arg, naming
//          the availability); the hook allows 2 normal, then auto-
//          consumes the emergency 1 (the ` emergency` line suffix),
//          then clean-fails — NO prompt (Part B).
//   S33 context_trim tool (6) — 2026-09-30 (plan39: the approved
//      context-trim build, Unit 1 — spec agent/handover/handover_task.md):
//      the tool file is imported DIRECT, type-stripped, the S12/S15 load
//      pattern; the CORE exports (reportWindow / tailSet) are driven over
//      the probe's own fixture DB (DatabaseSync — the opencode-like
//      session/message/part shapes from the bounded read-only live-DB
//      inspection; the smoke's fixture layout is the reference):
//      (346) the tool surface: the tool() default export (description +
//          the mode/session/target args + the async execute, NO name
//          field) + the core exports are functions;
//      (347) report (no target): the full text BYTE-EXACT (the header
//          fields + the 10 window rows with the read/bash/webfetch
//          targets + the tokens/bytes4 mass);
//      (348) dry-run: the exact remove/keep line (counts + token mass +
//          verdict=ok) — no write;
//      (349) tail rewrite lands: the return line byte-exact + the part
//          row's JSON tail_start_id = the target (single-field edit) +
//          the re-report retained=7;
//      (350) rejections (fail-closed, exact reasons):
//          no-completed-compaction / target-not-found /
//          target-not-before-compaction (AT + AFTER the marker) /
//          retained-tail-below-floor 5;
//      (351) the no-marker session report: byte-exact (marker=none,
//          window=full-history).
//   S34 post-compaction tail-set (2) — 2026-10-01 (TODO #120 Unit 2:
//      the plugin-side zero-fork tail-set — the context_trim core's
//      tailSetKeep, the auto-resume plugin's post-compaction leg write
//      path): keep=N → the N-th message STRICTLY before the compaction
//      user row (targetIndex = compactionIndex - keep), the EXACT
//      tailSet validation + the json_set single-transaction write
//      reused (delegated; the `tail= ` prefix remapped to
//      `tail-set= `) on a fresh ses_ct_k2 session in the probe's own
//      fixture DB:
//      (352) the valid rewrite + landed part row (byte-exact);
//      (353) the 5 fail-closed rejections (exact reasons).
//
// EXPECTED OUTPUT:
//   S6=8 S6b=8 S7=11 S12=4 S15=16 S16=6 S17=26 S22=9 S30=11 S33=6 S34=2 S35=3 S36=5  →  "PROBE handover: 115/115 PASS",
//   exit code 0. Anything else with THIS file = behavior drift or broken
//   environment — read the failures, do not "fix" the plugin for the probe.
//   On failure the sandbox root is KEPT (printed) for forensics.
// =============================================================================

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");



// ------------------------------------------------------------------ the probe

const results = [];
const check = (id, section, label, cond, detail = "") => {
  const ok = Boolean(cond);
  results.push({ id, section, label, ok, detail: ok ? "" : String(detail).slice(0, 500) });
  console.log(`${ok ? "PASS" : "FAIL"} [${id}] ${label}${ok ? "" : ` — ${String(detail).slice(0, 300)}`}`);
};

// temp sandbox root — the plugin is initialized with directory=SANDBOX, so every
// fs write it performs lands here, never in the repo. The fixture DBs live here too.
const SANDBOX = mkdtempSync(path.join(os.tmpdir(), "fst_handover_probe_"));
writeFileSync(path.join(SANDBOX, "sandbox_root_marker.txt"), "sandbox\n");


// ------------------------------------------------------- fixture DBs (node:sqlite)
//
// opencode-like schema per the T1 spec fact 2: `session`(id TEXT, time_updated
// INTEGER ms, model TEXT = JSON {"id":...}) + `message`(session_id TEXT,
// time_created INTEGER ms, data TEXT = JSON). NO python, NO sqlite3.exe, NO
// live DB. The gauge's finish marker is the `"finish"` field inside data JSON
// (the in-flight step carries none; user rows carry no tokens at all).
const FIN_OK = JSON.stringify({
  role: "assistant",
  finish: "stop",
  tokens: { total: 12345, input: 10001, output: 2345, reasoning: 0, cache: { write: 0, read: 0 } },
});
const FIN_UNKNOWN = JSON.stringify({
  role: "assistant",
  finish: "stop",
  tokens: { total: 50, input: 50, output: 0, reasoning: 0, cache: { write: 0, read: 0 } },
});
const INFLIGHT = JSON.stringify({ role: "assistant", tokens: { total: 0, input: 0, output: 0 } });
const USER_ROW = JSON.stringify({ role: "user", parts: [] });

function buildFixtureDb(p, sessions) {
  const db = new DatabaseSync(p);
  db.exec("CREATE TABLE session (id TEXT PRIMARY KEY, time_updated INTEGER, model TEXT); CREATE TABLE message (session_id TEXT, time_created INTEGER, data TEXT);");
  const insS = db.prepare("INSERT INTO session (id, time_updated, model) VALUES (?, ?, ?)");
  const insM = db.prepare("INSERT INTO message (session_id, time_created, data) VALUES (?, ?, ?)");
  for (const s of sessions) {
    insS.run(s.id, s.time_updated, s.model);
    for (const m of s.messages ?? []) insM.run(s.id, m.time_created, m.data);
  }
  db.close();
}
const FX_OK = path.join(SANDBOX, "fx_ok.db");
buildFixtureDb(FX_OK, [
  { id: "ses_fx_ok", time_updated: 3000, model: JSON.stringify({ id: "probe-model-256K_MTP", providerID: "fx" }),
    messages: [ { time_created: 200, data: FIN_OK }, { time_created: 100, data: USER_ROW } ] },
  { id: "ses_fx_old", time_updated: 1000, model: JSON.stringify({ id: "probe-model-120K_MTP", providerID: "fx" }),
    messages: [ { time_created: 50, data: FIN_OK } ] },
]);
const FX_UNKNOWN = path.join(SANDBOX, "fx_unknown.db");
buildFixtureDb(FX_UNKNOWN, [
  { id: "ses_fx_unk", time_updated: 3000, model: JSON.stringify({ id: "CPU-Qwen3-0.6B", providerID: "fx" }),
    messages: [ { time_created: 10, data: FIN_UNKNOWN } ] },
]);
const FX_NOTAL = path.join(SANDBOX, "fx_notal.db");
buildFixtureDb(FX_NOTAL, [
  { id: "ses_fx_empty", time_updated: 3000, model: JSON.stringify({ id: "probe-model-120K_MTP", providerID: "fx" }),
    messages: [ { time_created: 20, data: INFLIGHT } ] },
  // #114 (2026-09-28): the model-NOWHERE fixture — the session-row model is
  // NULL and there is no finished step (a lower time_updated keeps the
  // newest-session default read on ses_fx_empty).
  { id: "ses_fx_nomodel", time_updated: 2000, model: null },
]);
const MISSING_DB = path.join(SANDBOX, "missing_fx.db"); // never created — the db-error shape

// the core — SAME module instance the plugin imports (same resolved file), so
// setDbPath below steers the plugin's chat.message read to the fixtures.
const { readGauge, formatGauge, parseWindow, parseModelId, setDbPath, getDbPath, setBackends, getBackends, DEFAULT_BACKENDS, setImportForTest, clearImportForTest, importAttemptsForTest, setBudgetFileForTest, getBudgetFile, loopIterationSuffix, setLoopRootForTest } =
  await import(new URL("../scripts/gauge.mjs", import.meta.url).href);

// #212 (U26, 2026-10-29): formatGauge NO LONGER reads the budget store —
// the ` | N compactions left` suffix is retired. The steering stays pointed
// at a NEVER-CREATED sandbox path so every pre-existing formatGauge /
// ctx-line pin stays byte-identical and the trip-constant read
// (maintenanceTripTokens) falls back to its default; the S6b section
// points it at fixture budget files for its no-suffix regression pins.
setBudgetFileForTest(path.join(SANDBOX, "missing_budget.json"));

// Loop iteration counter (2026-10-05, Part 2): the INJECTED chat.message
// ctx line now carries the ` ITER=<n> <folder>` suffix when the CURRENT
// loop folder has a counter.json — steered to a NEVER-CREATED sandbox
// loop root so every formatGauge / ctx-line byte-exact pin stays
// byte-identical (no loop folder / counter → the suffix is `""`); the
// S36 section writes its fixture
// loop folder inside that root.
setLoopRootForTest(path.join(SANDBOX, "loop"));


// ------------------------------------------------------------------ S6 gauge core shapes (8)

// 21 — known-window: byte-exact readout + the structured fields
{
  const r = await readGauge(FX_OK);
  check(
    "21",
    "S6",
    "known-window: formatGauge byte-exact + kind ok + sid/modelId/total/output/ctx/window fields",
    formatGauge(r) === "SESSION=ses_fx_ok CTX=12345 (4%) REM=243655" && r.ok === true && r.kind === "ok" && r.sid === "ses_fx_ok" && r.modelId === "probe-model-256K_MTP" && r.total === 12345 && r.output === 2345 && r.ctx === 12345 && r.window === 256000,
    JSON.stringify(r),
  );
}

// 22 — unknown-window: `CTX=<ctx>` only (no guessed pct/REM), window undefined
{
  const r = await readGauge(FX_UNKNOWN);
  check(
    "22",
    "S6",
    "unknown-window (no K/M marker in model id): formatGauge byte-exact, ok, window undefined",
    formatGauge(r) === "SESSION=ses_fx_unk CTX=50" && r.ok === true && r.kind === "ok" && r.ctx === 50 && r.window === undefined,
    JSON.stringify(r),
  );
}

// 23 — notAvailable: no finished step in the newest session → no-total
//      (#114, 2026-09-28: the no-total read now carries the SESSION ROW's
//      model — the session-row fallback)
{
  const r = await readGauge(FX_NOTAL);
  check(
    "23",
    "S6",
    "notAvailable (no finished step): formatGauge byte-exact, kind no-total, sid carried, modelId = the session-row model (no step row)",
    formatGauge(r) === "SESSION=ses_fx_empty CTX=notAvailable" && r.ok === false && r.kind === "no-total" && r.sid === "ses_fx_empty" && r.modelId === "probe-model-120K_MTP",
    JSON.stringify(r),
  );
}

// 24 — missing db: db-error (no throw), formatGauge = SESSION=unknown CTX=notAvailable
{
  const r = await readGauge(MISSING_DB);
  check(
    "24",
    "S6",
    "missing db: kind db-error, no throw, sid unknown, non-empty error, formatGauge byte-exact",
    r.ok === false && r.kind === "db-error" && r.sid === "unknown" && r.modelId === "" && typeof r.error === "string" && r.error !== "" && formatGauge(r) === "SESSION=unknown CTX=notAvailable",
    JSON.stringify(r),
  );
}

// 25 — SESSION= prefix: every readout form is prefixed with the read session id
{
  const lines = [formatGauge(await readGauge(FX_OK)), formatGauge(await readGauge(FX_UNKNOWN)), formatGauge(await readGauge(FX_NOTAL)), formatGauge(await readGauge(MISSING_DB))];
  check(
    "25",
    "S6",
    "SESSION= prefix on every readout form (known / unknown / notAvailable / db-error)",
    lines.every((l) => l.startsWith("SESSION=")),
    lines.join(" | "),
  );
}

// 26 — parseWindow cases: the ONLY parser (last marker wins, no fallback)
check(
  "26",
  "S6",
  "parseWindow: 256K → 256000, 210K → 210000, 1.5M → 1500000, 120K_MTP → 120000, no-match → undefined, non-string → undefined",
  parseWindow("probe-model-256K") === 256000 && parseWindow("x-210K") === 210000 && parseWindow("x-1.5M") === 1500000 && parseWindow("probe-model-120K_MTP") === 120000 && parseWindow("CPU-Qwen3-0.6B") === undefined && parseWindow(undefined) === undefined && parseWindow("IQ4KT") === undefined,
  JSON.stringify({ a: parseWindow("probe-model-256K"), b: parseWindow("x-210K"), c: parseWindow("x-1.5M"), d: parseWindow("probe-model-120K_MTP"), e: parseWindow("CPU-Qwen3-0.6B"), f: parseWindow(undefined), g: parseWindow("IQ4KT") }),
);

// 27 — parseModelId: session.model column JSON {"id":...} / plain id / malformed / empty
check(
  "27",
  "S6",
  "parseModelId: JSON id, plain id, malformed JSON → '', empty → ''",
  parseModelId('{"id":"a-120K"}') === "a-120K" && parseModelId("plain-id") === "plain-id" && parseModelId("{bad json") === "" && parseModelId("") === "" && parseModelId(undefined) === "",
  JSON.stringify({ a: parseModelId('{"id":"a-120K"}'), b: parseModelId("plain-id"), c: parseModelId("{bad json"), d: parseModelId(""), e: parseModelId(undefined) }),
);

// 28 — setDbPath/getDbPath global plumbing + explicit-path override wins
{
  setDbPath(FX_UNKNOWN);
  const viaGlobal = await readGauge();
  const viaOverride = await readGauge(FX_OK);
  const pass = getDbPath() === FX_UNKNOWN && viaGlobal.sid === "ses_fx_unk" && viaOverride.sid === "ses_fx_ok";
  setDbPath(FX_OK);
  check(
    "28",
    "S6",
    "setDbPath/getDbPath steer the global read; readGauge(path) override wins",
    pass,
    JSON.stringify({ getDbPath: getDbPath(), viaGlobal: viaGlobal.sid, viaOverride: viaOverride.sid }),
  );
}

// ------------------------------------------------------------------ S6b item 3 RETIRED (#212, U26, 2026-10-29):
// the budget suffix DROPPED from the readout line (8) — formatGauge reads
// NO budget store: every state of the old `compactionsLeftSuffix` reader
// (the cap states, the emergency key absent / explicit-0 legs, the
// fail-open missing file, the no-total SESSION-ROW-model and
// model-nowhere reads, the silent cap-1 fallback map shape with the old
// `(unlisted)` marker) lands as the PLAIN readout form — these pins guard
// the drop against a regression. The store is still steered via
// setBudgetFileForTest (inert for formatGauge now). The FX_OK fixture read
// carries sid ses_fx_ok + model probe-model-256K_MTP.

const BUDGET_FX = path.join(SANDBOX, "budget_fx.json");
const MB_FX = { "probe-model-256K_MTP": 3, default: 1 };
const setBudgetFx = (count, eb, sid = "ses_fx_ok") => {
  const rec = { model_budget: MB_FX, sessions: { [sid]: { count, updated: "fx", model: "probe-model-256K_MTP" } } };
  if (eb !== undefined) rec.emergency_budget = eb;
  writeFileSync(BUDGET_FX, JSON.stringify(rec), "utf-8");
  setBudgetFileForTest(BUDGET_FX);
};
const FX_OK_LINE = "SESSION=ses_fx_ok CTX=12345 (4%) REM=243655";

// 28.1 — state 1 (count 0 < cap 3): NO budget suffix — the known-window
//      line is the plain readout form (#212 suffix drop).
{
  setBudgetFx(0);
  const r = await readGauge(FX_OK);
  check(
    "28.1",
    "S6b",
    "state 1 (count 0 < cap 3): NO budget suffix — the line is the plain readout form (#212)",
    formatGauge(r) === FX_OK_LINE,
    JSON.stringify(formatGauge(r)),
  );
}

// 28.2 — state 2: count === cap, the emergency_budget key ABSENT (the old
//      fail-open default-1 emergency leg): still NO suffix — formatGauge
//      ignores the budget store entirely (#212).
{
  setBudgetFx(3);
  const r = await readGauge(FX_OK);
  check(
    "28.2",
    "S6b",
    "state 2 (count === cap, key absent): NO budget suffix (#212)",
    formatGauge(r) === FX_OK_LINE,
    JSON.stringify(formatGauge(r)),
  );
}

// 28.3 — state 3 (count 4 > cap 3 — fully exhausted): NO suffix.
{
  setBudgetFx(4);
  const r = await readGauge(FX_OK);
  check(
    "28.3",
    "S6b",
    "state 3 (count > cap — fully exhausted): NO budget suffix (#212)",
    formatGauge(r) === FX_OK_LINE,
    JSON.stringify(formatGauge(r)),
  );
}

// 28.4 — state 2b (count === cap + emergency_budget 0 EXPLICIT): NO suffix.
{
  setBudgetFx(3, 0);
  const r = await readGauge(FX_OK);
  check(
    "28.4",
    "S6b",
    "state 2b (count === cap, emergency_budget 0 explicit): NO budget suffix (#212)",
    formatGauge(r) === FX_OK_LINE,
    JSON.stringify(formatGauge(r)),
  );
}

// 28.5 — fail-open: the budget file MISSING (the never-created sandbox path
//      the probe default) → the line stands verbatim, as in every state.
{
  setBudgetFileForTest(path.join(SANDBOX, "missing_budget.json"));
  const r = await readGauge(FX_OK);
  check(
    "28.5",
    "S6b",
    "fail-open (budget file missing): NO suffix — the known-window line is the plain readout form",
    formatGauge(r) === FX_OK_LINE,
    JSON.stringify(formatGauge(r)),
  );
}

// 28.6 — no-total read (#114): the shape fields stand (sid + session-row
//      model carried, path-discriminating) and the line ends at
//      CTX=notAvailable — NO suffix (#212 retired the row-model cap read
//      on the readout).
{
  const BUDGET_NOTAL = path.join(SANDBOX, "budget_fx_notal.json");
  writeFileSync(BUDGET_NOTAL, JSON.stringify({
    model_budget: { "probe-model-120K_MTP": 3, "probe-model-256K_MTP": 2, default: 1 },
    sessions: { ses_fx_empty: { count: 0, updated: "fx", model: "probe-model-256K_MTP" } },
  }), "utf-8");
  setBudgetFileForTest(BUDGET_NOTAL);
  const r = await readGauge(FX_NOTAL);
  check(
    "28.6",
    "S6b",
    "no-total read (#114): kind/sid/row-model fields stand, line ends `SESSION=ses_fx_empty CTX=notAvailable` — NO suffix (#212)",
    r.ok === false && r.kind === "no-total" && r.sid === "ses_fx_empty" && r.modelId === "probe-model-120K_MTP" && formatGauge(r) === "SESSION=ses_fx_empty CTX=notAvailable",
    JSON.stringify({ r, line: formatGauge(r) }),
  );
}

// 28.7 — no-total + model NOWHERE (session-row model NULL + no budget
//      entry): the plain notAvailable form — NO suffix, NO default-1
//      fallback on the readout.
{
  const BUDGET_NOMODEL = path.join(SANDBOX, "budget_fx_nomodel.json");
  writeFileSync(BUDGET_NOMODEL, JSON.stringify({
    model_budget: { "probe-model-120K_MTP": 3, "probe-model-256K_MTP": 2, default: 1 },
    sessions: {},
  }), "utf-8");
  setBudgetFileForTest(BUDGET_NOMODEL);
  const r = await readGauge(FX_NOTAL, "ses_fx_nomodel");
  check(
    "28.7",
    "S6b",
    "no-total + model nowhere (row model NULL, no budget entry): `SESSION=ses_fx_nomodel CTX=notAvailable` — NO suffix (#212)",
    r.ok === false && r.kind === "no-total" && r.sid === "ses_fx_nomodel" && r.modelId === "" && formatGauge(r) === "SESSION=ses_fx_nomodel CTX=notAvailable",
    JSON.stringify({ r, line: formatGauge(r) }),
  );
}

// 28.8 — the old silent cap-1 fallback map shape (#132: map present with
//      other entries, NO `model_budget.default` key): the readout carries
//      NO suffix and NO `(unlisted)` marker (#212 retired both).
{
  const BUDGET_UNLISTED = path.join(SANDBOX, "budget_fx_unlisted.json");
  writeFileSync(BUDGET_UNLISTED, JSON.stringify({
    model_budget: { "probe-model-120K_MTP": 3, "probe-model-256K_MTP": 2 },
    sessions: { ses_fx_nomodel: { count: 0, updated: "fx", model: "probe-model-unlisted" } },
  }), "utf-8");
  setBudgetFileForTest(BUDGET_UNLISTED);
  const r = await readGauge(FX_NOTAL, "ses_fx_nomodel");
  check(
    "28.8",
    "S6b",
    "silent cap-1 fallback map shape (NO default key): NO suffix, NO `(unlisted)` marker (#212)",
    r.ok === false && r.kind === "no-total" && r.sid === "ses_fx_nomodel" && r.modelId === "" && formatGauge(r) === "SESSION=ses_fx_nomodel CTX=notAvailable",
    JSON.stringify({ r, line: formatGauge(r) }),
  );
}

// restore the probe-default budget steering for every later section
setBudgetFileForTest(path.join(SANDBOX, "missing_budget.json"));

// ------------------------------------------------------------------ S7 backend chain (11) — the #37 chain IS contract
//
// The chain: node:sqlite → bun:sqlite → spawn-sqlite3, first success wins,
// per-process cached. The probe host is NODE, so bun:sqlite is exercised by
// FORCING it (module absent → the named db-error path; adapter shape → a
// unit-mock module) and spawn-sqlite3 END-TO-END with the REAL maintainer-
// placed sqlite3.exe (read-only URIs on the sandbox fixtures). setBackends
// clears/restores the restriction between sections; the core's cache is
// keyed by db path and invalidated by setDbPath/setBackends.

// The unit-mock of the bun:sqlite API surface (the REAL API was verified
// separately against the system bun 1.4.2 — host proof 2): it records every
// call so check 32 can assert the adapter's exact shape.
class MockBunDatabase {
  constructor(p2, opts) {
    MOCK_LOG.push({ op: "construct", path: p2, opts: opts ? { ...opts } : undefined });
  }
  exec(sql) {
    MOCK_LOG.push({ op: "exec", sql });
  }
  prepare(sql) {
    MOCK_LOG.push({ op: "prepare", sql });
    return {
      get() {
        // clone twin TODO #141 unit 2: the mass prepare is TABLE-PAIRED —
        // the v1 form keys on tokens.total; the v2 instantiation keys on
        // session_message (the coexisting MOCK catalog makes session_v2 win
        // the session-row pick, so the v2 form is what goes out here).
        if (String(sql).includes("tokens.total") || String(sql).includes("session_message")) return { sid: "ses_fx_ok", model: JSON.stringify({ id: "probe-model-256K_MTP" }), total: 12345, output: 2345 };
        return { id: "ses_fx_ok" };
      },
    };
  }
  close() {
    MOCK_LOG.push({ op: "close" });
  }
}
const MOCK_LOG = [];

// 29 — backend 1 forced: the readout forms are chain-invariant (byte-identical)
{
  setBackends(["node:sqlite"]);
  const r = await readGauge(FX_OK);
  check(
    "29",
    "S7",
    "chain/node:sqlite (forced): FX_OK byte-identical readout + fields (chain-invariant form)",
    formatGauge(r) === "SESSION=ses_fx_ok CTX=12345 (4%) REM=243655" && r.ok === true && r.kind === "ok" && r.sid === "ses_fx_ok" && r.modelId === "probe-model-256K_MTP" && r.total === 12345 && r.output === 2345 && r.ctx === 12345 && r.window === 256000,
    JSON.stringify(r),
  );
}

// 30 — backend 2 forced, module ABSENT on the node host → db-error NAMING the
//      backend (the production-diagnosability contract), no throw
{
  setBackends(["bun:sqlite"]);
  let threw = false;
  let r;
  try {
    r = await readGauge(FX_OK);
  } catch {
    threw = true;
  }
  check(
    "30",
    "S7",
    "chain/bun:sqlite (forced, module absent on the node host): db-error naming the backend, no throw, notAvailable form",
    !threw && r.ok === false && r.kind === "db-error" && r.sid === "unknown" && typeof r.error === "string" && r.error.startsWith("bun:sqlite ") && formatGauge(r) === "SESSION=unknown CTX=notAvailable",
    JSON.stringify(r),
  );
}

// 31 — per-process cache: a failed import is memoized, NOT re-tried on
//      subsequent fires (the plugin host fires repeatedly)
{
  const a0 = importAttemptsForTest("bun:sqlite");
  await readGauge(FX_OK);
  await readGauge(FX_OK);
  const a1 = importAttemptsForTest("bun:sqlite");
  check("31", "S7", "per-process cache: failed bun:sqlite import NOT re-tried on subsequent fires (attempts unchanged)", a1 === a0, `attempts ${a0} -> ${a1}`);
}

// 32 — backend 2's ADAPTER shape via a unit-mock module (the real bun:sqlite
//      API was verified separately against the system bun 1.4.2 — host proof
//      2): the adapter must drive Database(path, {readonly:true,timeout:2500})
//      + the busy_timeout PRAGMA + prepare().get() ×2 (ordered) + close, and
//      the readout must be byte-identical to backend 1's form.
{
  MOCK_LOG.length = 0;
  setImportForTest("bun:sqlite", { Database: MockBunDatabase });
  const r = await readGauge(FX_OK);
  const construct = MOCK_LOG.find((l) => l.op === "construct");
  const execs = MOCK_LOG.filter((l) => l.op === "exec");
  const prepares = MOCK_LOG.filter((l) => l.op === "prepare");
  const closes = MOCK_LOG.filter((l) => l.op === "close");
  check(
    "32",
    "S7",
    "unit-mock bun:sqlite: adapter drives Database(path,{readonly:true,timeout:2500}) + PRAGMA exec + prepare x7 (clone twin TODO #141: table-aware session-row leg — catalog x2 -> newest x2 (session_v2 first) -> time_updated x2 -> step (table-PAIRED mass — the v2 instantiation, the MOCK coexisting catalog makes session_v2 win) LAST) + close; readout byte-identical",
    formatGauge(r) === "SESSION=ses_fx_ok CTX=12345 (4%) REM=243655" && r.ok === true && r.ctx === 12345 && r.window === 256000 &&
      construct !== undefined && construct.path === FX_OK && construct.opts !== undefined && construct.opts.readonly === true && construct.opts.timeout === 2500 &&
      execs.length === 1 && execs[0].sql === "PRAGMA busy_timeout = 2500;" &&
      // clone twin (TODO #141): the gauge core here is the table-aware unit-1
      // port (`.opencode/plugins/scripts/gauge.mjs`), so the session-row leg
      // drives 7 ordered prepares, not the v1 2 — mirrored EXACTLY from the core.
      prepares.length === 7 &&
      prepares[0].sql === "SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = ?" &&
      prepares[1].sql === prepares[0].sql &&
      prepares[2].sql === "SELECT id, model FROM session_v2 ORDER BY time_updated DESC LIMIT 1" &&
      prepares[3].sql === "SELECT id, model FROM session ORDER BY time_updated DESC LIMIT 1" &&
      prepares[4].sql === "SELECT time_updated FROM session WHERE id = ?" &&
      prepares[5].sql === "SELECT time_updated FROM session_v2 WHERE id = ?" &&
      prepares.slice(0, 6).every((x) => !String(x.sql).includes("session_message")) &&
      String(prepares[6].sql).includes("session_message") &&
      closes.length === 1,
    JSON.stringify({ r, MOCK_LOG }),
  );
}

// 33 — unit-mock bun:sqlite, no finished step: bun's no-row value is NULL
//      (node:sqlite's is undefined — both must read as "no row" → no-total)
{
  class MockBunNoStep extends MockBunDatabase {
    prepare(sql) {
      const s = super.prepare(sql);
      return { get() { if (String(sql).includes("tokens.total") || String(sql).includes("session_message")) return null; return { id: "ses_fx_empty" }; } };
    }
  }
  setImportForTest("bun:sqlite", { Database: MockBunNoStep });
  const r = await readGauge(FX_OK);
  check(
    "33",
    "S7",
    "unit-mock bun:sqlite no finished step (get() → null): no-total form byte-identical",
    r.ok === false && r.kind === "no-total" && r.sid === "ses_fx_empty" && r.modelId === "" && formatGauge(r) === "SESSION=ses_fx_empty CTX=notAvailable",
    JSON.stringify(r),
  );
}

// 34-36 — backend 3 forced, END-TO-END with the REAL sqlite3.exe (read-only
//      URIs on the sandbox fixtures): ok / unknown-window / no-total
{
  clearImportForTest("bun:sqlite");
  setBackends(["spawn-sqlite3"]);
  const r = await readGauge(FX_OK);
  check(
    "34",
    "S7",
    "chain/spawn-sqlite3 (forced, REAL exe end-to-end on the fixture): byte-identical readout + fields",
    formatGauge(r) === "SESSION=ses_fx_ok CTX=12345 (4%) REM=243655" && r.ok === true && r.kind === "ok" && r.sid === "ses_fx_ok" && r.modelId === "probe-model-256K_MTP" && r.total === 12345 && r.output === 2345 && r.ctx === 12345 && r.window === 256000,
    JSON.stringify(r),
  );
}
{
  const r = await readGauge(FX_UNKNOWN);
  check(
    "35",
    "S7",
    "spawn-sqlite3: FX_UNKNOWN byte-identical `SESSION=ses_fx_unk CTX=50` (unknown window via the real exe)",
    formatGauge(r) === "SESSION=ses_fx_unk CTX=50" && r.ok === true && r.ctx === 50 && r.window === undefined,
    JSON.stringify(r),
  );
}
{
  const r = await readGauge(FX_NOTAL);
  check(
    "36",
    "S7",
    "spawn-sqlite3: FX_NOTAL no-total byte-identical (M row absent; the S row carries the session-row model via the real exe — #114)",
    r.ok === false && r.kind === "no-total" && r.sid === "ses_fx_empty" && r.modelId === "probe-model-120K_MTP" && formatGauge(r) === "SESSION=ses_fx_empty CTX=notAvailable",
    JSON.stringify(r),
  );
}

// 37 — full chain, missing db: every backend fails → db-error naming the
//      DEEPEST failing backend (spawn-sqlite3 — the production last resort)
{
  setBackends([...DEFAULT_BACKENDS]);
  const r = await readGauge(MISSING_DB);
  check(
    "37",
    "S7",
    "full chain, missing db: db-error (no throw) naming the deepest failing backend (spawn-sqlite3), notAvailable form",
    r.ok === false && r.kind === "db-error" && r.sid === "unknown" && typeof r.error === "string" && r.error.startsWith("spawn-sqlite3 ") && formatGauge(r) === "SESSION=unknown CTX=notAvailable",
    JSON.stringify(r),
  );
}

// 38 — fallback: a working backend whose module LATER fails (host change)
//      must fall through to the next backend — and the re-attempted import
//      failure is memoized (attempts +1 exactly once across the 2 reads)
{
  const a0 = importAttemptsForTest("bun:sqlite");
  setImportForTest("bun:sqlite", { Database: MockBunDatabase });
  setBackends(["bun:sqlite", "spawn-sqlite3"]);
  const r1 = await readGauge(FX_OK); // ok via the (mock) bun:sqlite — cached for FX_OK
  clearImportForTest("bun:sqlite"); // the module "disappears" (real node import → fails)
  const r2 = await readGauge(FX_OK); // bun re-import fails → falls through to spawn → ok
  const a1 = importAttemptsForTest("bun:sqlite");
  const r3 = await readGauge(FX_OK); // cached spawn — NO new bun import attempt
  const a2 = importAttemptsForTest("bun:sqlite");
  check(
    "38",
    "S7",
    "fallback: working backend whose module later fails falls through to spawn (ok); failed import not re-tried (attempts +1 total)",
    r1.ok === true && r2.ok === true && r3.ok === true && a1 === a0 + 1 && a2 === a1,
    JSON.stringify({ r1: r1.kind, r2: r2.kind, r3: r3.kind, a0, a1, a2 }),
  );
}

// 39 — hook restore: the default chain order is back, the setDbPath plumbing
//      is intact, and the read is still byte-identical (the S4/S6 paths never
//      change because of the chain machinery)
{
  clearImportForTest("bun:sqlite");
  setBackends([...DEFAULT_BACKENDS]);
  const r = await readGauge(FX_OK);
  check(
    "39",
    "S7",
    "hook restore: getBackends() back to the default chain order; setDbPath/getDbPath plumbing intact; read byte-identical",
    JSON.stringify(getBackends()) === JSON.stringify(["node:sqlite", "bun:sqlite", "spawn-sqlite3"]) && getDbPath() === FX_OK && formatGauge(r) === "SESSION=ses_fx_ok CTX=12345 (4%) REM=243655",
    JSON.stringify({ backends: getBackends(), dbPath: getDbPath(), r }),
  );
}

// ------------------------------------------------------------------ S12 ctx_gauge tool (4) — the loop-tool-batch part 2 (the approved design)
//
// The custom tool at .opencode/tools/ctx_gauge.ts (T2, the loop-tool-batch
// proposal part 2): the peek readout as a directly-fired tool. Imported
// DIRECT from the repo path (type-stripped, the same way the probe loads
// compact_memory.ts — the tool file MUST load that way). The tool wraps the
// ONE shared gauge core — the SAME module instance this probe imported at
// the top (the tool's relative import resolves to the same file), so the
// setDbPath steering below reaches the tool's reads. The tool is READ-ONLY:
// no fs writes, no plugin hooks, no sandbox log lines — the sandbox stays
// clean.
const CG_TOOL_TS = path.join(REPO_ROOT, ".opencode", "tools", "deactivated", "ctx_gauge.ts");
let cgTool;
const dbPathBeforeS12 = getDbPath(); // the hook-restore capture (cf. check 39)

// 82 — the tool file imports (type-stripped, direct) and exposes the tool()
//      default export: description (non-empty string) + args carrying the
//      OPTIONAL sessionID (a zod schema: undefined parses, a non-string
//      rejects) + execute (async) + NO `name` field (the host names the
//      tool by FILENAME)
{
  const toolMod = await import(pathToFileURL(CG_TOOL_TS).href);
  cgTool = toolMod.default;
  const sch = cgTool?.args?.sessionID;
  check(
    "82",
    "S12",
    "tool file imports (type-stripped, direct) and exposes the tool() default export (description + optional sessionID arg + async execute, NO name field)",
    cgTool != null && typeof cgTool.description === "string" && cgTool.description.length > 0 &&
      JSON.stringify(Object.keys(cgTool.args ?? {})) === JSON.stringify(["sessionID"]) &&
      sch != null && typeof sch.safeParse === "function" && sch.safeParse(undefined).success === true && sch.safeParse(42).success === false &&
      typeof cgTool.execute === "function" && cgTool.execute.constructor.name === "AsyncFunction" &&
      !("name" in cgTool),
    JSON.stringify({ keys: Object.keys(cgTool ?? {}), desc: typeof cgTool?.description, schOk: sch?.safeParse?.(undefined)?.success, async: cgTool?.execute?.constructor?.name }),
  );
}

// 83 — execute against the FX_OK fixture (steered via setDbPath): the
//      NEWEST-SESSION default read is BYTE-EXACT (the same readout form the
//      S4/S7 sections pin on the core — the tool must not drift) AND the
//      sessionID arg is PASSED THROUGH (the per-session read of the older
//      fixture session ses_fx_old, window 120K)
{
  setDbPath(FX_OK);
  const def = await cgTool.execute({}, {});
  const per = await cgTool.execute({ sessionID: "ses_fx_old" }, {});
  check(
    "83",
    "S12",
    "execute on the fixture (setDbPath): default newest-session read BYTE-EXACT `SESSION=ses_fx_ok CTX=12345 (4%) REM=243655`; sessionID arg passed through (ses_fx_old → `SESSION=ses_fx_old CTX=12345 (10%) REM=107655`)",
    def === "SESSION=ses_fx_ok CTX=12345 (4%) REM=243655" && per === "SESSION=ses_fx_old CTX=12345 (10%) REM=107655",
    JSON.stringify({ def, per }),
  );
}

// 84 — the db-error path (setDbPath to the never-created MISSING_DB): NO
//      throw, the line is NEVER replaced — `SESSION=unknown CTX=notAvailable`
//      + the APPENDED ` — <error>` note (the in-band mirror of peek.mjs's
//      stderr addition; the core's own capped error text)
{
  setDbPath(MISSING_DB);
  let threw = false;
  let res = "";
  try {
    res = await cgTool.execute({}, {});
  } catch (e) {
    threw = true;
    res = String(e?.message ?? e);
  }
  check(
    "84",
    "S12",
    "db-error (missing db): no throw; the line is NOT replaced — `SESSION=unknown CTX=notAvailable` + the appended ` — <error>` note (in-band mirror of peek.mjs's stderr)",
    !threw && res.startsWith("SESSION=unknown CTX=notAvailable — ") && res.length > "SESSION=unknown CTX=notAvailable — ".length,
    JSON.stringify({ threw, res }),
  );
}

// 85 — hook restore (cf. check 39): the global db path is back where S12
//      found it (the plumbing intact) and a global read and an explicit-path
//      read of the SAME restored path agree byte-exact (S12 left no drift in
//      the core)
{
  setDbPath(dbPathBeforeS12);
  const g = await readGauge();
  const e = await readGauge(dbPathBeforeS12);
  check(
    "85",
    "S12",
    "hook restore: the global db path is back where S12 found it; global read == explicit-path read of the restored path (byte-exact, no drift)",
    getDbPath() === dbPathBeforeS12 && g.kind === e.kind && g.sid === e.sid && formatGauge(g) === formatGauge(e),
    JSON.stringify({ getDbPath: getDbPath(), before: dbPathBeforeS12, g: formatGauge(g), e: formatGauge(e) }),
  );
}

// ------------------------------------------------------------------ S15 block_transfer tool (16) — the #60 probe pin (part 1 of 2): the named-clipboard block mover
//
// The custom tool at .opencode/tools/block_transfer.ts (post-#57: the MOVE
// dstFile requirement is hoisted PRE-WRITE): imported DIRECT from the repo
// path (type-stripped, the S12/S13 load pattern — the tool file MUST load
// that way). The module keeps its in-memory `clipboardBuffers` — ONE loaded
// instance is driven across the section (the buffer-lifecycle checks build
// on each other's state, as a real session does). All fs writes are steered
// into the sandbox (context.directory=SANDBOX — the sandbox is inside TEMP,
// which the tool's own sandbox check allows); the one deliberate outside
// path (check 10.13) is rejected BEFORE any fs access. Plain tool() object:
// no plugin hooks, no sandbox plugin.log lines — the sandbox stays
// clean.
const BT_TOOL_TS = path.join(REPO_ROOT, ".opencode", "tools", "deactivated", "block_transfer.ts");
const BT_CTX = { directory: SANDBOX };
const BT_DIR = path.join(SANDBOX, "bt");
mkdirSync(BT_DIR, { recursive: true });
const btWrite = (name, body) => {
  const p = path.join(BT_DIR, name);
  writeFileSync(p, body);
  return p;
};
let btTool;

// 108 — the tool file imports (type-stripped, direct) and exposes the tool()
//      default export: description (non-empty string) + the 12 args IN ORDER
//      (mode = the 11-value enum — S3 adds WRITE+PEEK, S4 adds MAP;
//      srcFile/dstFile/
//      bufferName OPTIONAL strings; startMarker/endMarker/targetMarker
//      OPTIONAL marker-string-or-integer refs — Part B poka-yoke: 42 is a
//      LINE NUMBER (accepted), 2.5 rejected; refs = OPTIONAL array of
//      marker-or-number refs + text = OPTIONAL string — Part C; regions =
//      OPTIONAL array of {start, end} refs + from/count = OPTIONAL
//      integers — S3 Parts D+E) + async execute + NO `name` field (the host
//      names the tool by FILENAME)
//      [re-pinned 2026-09-26 per block_transfer v2 S3 (Parts D+E): the args
//      list gains regions+from+count, the mode enum gains WRITE+PEEK;
//      re-pinned 2026-09-26 per S4 (Part G): the mode enum gains MAP]
{
  const toolMod = await import(pathToFileURL(BT_TOOL_TS).href);
  btTool = toolMod.default;
  const argKeys = Object.keys(btTool?.args ?? {});
  const modeSch = btTool?.args?.mode;
  const optionalStr = (k) => {
    const s = btTool?.args?.[k];
    return s != null && typeof s.safeParse === "function" && s.safeParse(undefined).success === true && s.safeParse(42).success === false;
  };
  const optionalRef = (k) => {
    const s = btTool?.args?.[k];
    return s != null && typeof s.safeParse === "function" &&
      s.safeParse(undefined).success === true &&
      s.safeParse("AAA").success === true &&
      s.safeParse(42).success === true &&
      s.safeParse(2.5).success === false;
  };
  const refsSch = btTool?.args?.refs;
  const textSch = btTool?.args?.text;
  const regionsSch = btTool?.args?.regions;
  const fromSch = btTool?.args?.from;
  const countSch = btTool?.args?.count;
  check(
    "108",
    "S15",
    "tool file imports (type-stripped, direct) and exposes the tool() default export (description + args [mode, srcFile, dstFile, startMarker, endMarker, targetMarker, refs, text, regions, from, count, bufferName] + async execute, NO name field)",
    btTool != null && typeof btTool.description === "string" && btTool.description.length > 0 &&
      JSON.stringify(argKeys) === JSON.stringify(["mode", "srcFile", "dstFile", "startMarker", "endMarker", "targetMarker", "refs", "text", "regions", "from", "count", "bufferName"]) &&
      modeSch != null && typeof modeSch.safeParse === "function" &&
      modeSch.safeParse(undefined).success === false &&
      ["MOVE", "COPY", "APPEND", "CUT", "PASTE", "REPLACE", "WRITE", "PEEK", "MAP", "DELETE", "CLEAR"].every((v) => modeSch.safeParse(v).success === true) &&
      modeSch.safeParse("move").success === false && modeSch.safeParse("MOVE ").success === false && modeSch.safeParse("BOGUS").success === false &&
      ["srcFile", "dstFile", "bufferName"].every(optionalStr) &&
      ["startMarker", "endMarker", "targetMarker"].every(optionalRef) &&
      refsSch != null && typeof refsSch.safeParse === "function" &&
      refsSch.safeParse(undefined).success === true &&
      refsSch.safeParse([1, "BT-START"]).success === true &&
      refsSch.safeParse([1.5]).success === false &&
      textSch != null && typeof textSch.safeParse === "function" &&
      textSch.safeParse(undefined).success === true && textSch.safeParse("x").success === true &&
      regionsSch != null && typeof regionsSch.safeParse === "function" &&
      regionsSch.safeParse(undefined).success === true &&
      regionsSch.safeParse([{ start: 1, end: 2 }]).success === true &&
      regionsSch.safeParse([{ start: "BT-START", end: "BT-END" }]).success === true &&
      regionsSch.safeParse([1]).success === false &&
      regionsSch.safeParse([{ start: 1.5, end: 2 }]).success === false &&
      fromSch != null && typeof fromSch.safeParse === "function" &&
      fromSch.safeParse(undefined).success === true && fromSch.safeParse(3).success === true && fromSch.safeParse(2.5).success === false &&
      countSch != null && typeof countSch.safeParse === "function" &&
      countSch.safeParse(undefined).success === true && countSch.safeParse(5).success === true && countSch.safeParse(true).success === false &&
      typeof btTool.execute === "function" && btTool.execute.constructor.name === "AsyncFunction" &&
      !("name" in btTool),
    JSON.stringify({ keys: argKeys, mode: ["MOVE", "move", "MOVE ", "BOGUS"].map((v) => modeSch?.safeParse?.(v)?.success), async: btTool?.execute?.constructor?.name, nameIn: "name" in (btTool ?? {}) }),
  );
}

// 109 — COPY: the anchor span is INCLUSIVE (the start line through the end
//      line) and the source is UNTOUCHED: the byte-exact Part F feedback
//      line (re-pinned 2026-09-26 per block_transfer v2 S2 — the resolved
//      range + the truncated first-line echo + the buffer count AFTER the
//      op; the S3 feedback redesign completes the other modes) + the
//      source file byte-identical after the call
{
  const src = btWrite("bt1.txt", "alpha\nBT-START block\nline-2\nline-3\nBT-END block\nomega");
  const before = readFileSync(src, "utf8");
  const res = await btTool.execute(
    { mode: "COPY", srcFile: "bt/bt1.txt", startMarker: "BT-START", endMarker: "BT-END", bufferName: "bt1" },
    BT_CTX,
  );
  check(
    "109",
    "S15",
    "COPY: the inclusive anchor span (BT-START..BT-END = 4 lines) + byte-exact Part F feedback `Copied 4 lines from 'bt/bt1.txt' into buffer 'bt1' (lines 2..5, first: 'BT-START block') - buffer: 4 lines.` + source byte-identical",
    res === "Copied 4 lines from 'bt/bt1.txt' into buffer 'bt1' (lines 2..5, first: 'BT-START block') - buffer: 4 lines." && readFileSync(src, "utf8") === before,
    JSON.stringify({ res, changed: readFileSync(src, "utf8") !== before }),
  );
}

// 10.10 — PASTE (the round-trip, fresh dst, targetMarker omitted → EOF
//      append): the byte-exact Part F return (re-pinned 2026-09-26 per
//      block_transfer v2 S3 — the resolved range = the buffer's own lines +
//      the first-line echo + the buffer count AFTER) + the dst carries the
//      inclusive 4-line block BYTE-EXACT
{
  const res = await btTool.execute({ mode: "PASTE", dstFile: "bt/bt1-dst-eof.txt", bufferName: "bt1" }, BT_CTX);
  const dst = path.join(BT_DIR, "bt1-dst-eof.txt");
  const body = existsSync(dst) ? readFileSync(dst, "utf8") : null;
  check(
    "110",
    "S15",
    "PASTE round-trip (fresh dst, EOF): byte-exact Part F return + dst content = the inclusive block byte-exact (`BT-START block`..`BT-END block`)",
    res === "Pasted 4 lines from buffer 'bt1' into 'bt/bt1-dst-eof.txt' (lines 1..4, first: 'BT-START block') (at EOF) - buffer: 4 lines." &&
      body === "BT-START block\nline-2\nline-3\nBT-END block",
    JSON.stringify({ res, body }),
  );
}

// 10.11 — PASTE with a targetMarker (an EXISTING dst): the block is inserted
//      RIGHT AFTER the target line — the insertion point vs the EOF append of
//      check 10.10: byte-exact resulting file + byte-exact return
{
  btWrite("bt1-dst-t.txt", "head\nBT-TARGET line\ntail");
  const res = await btTool.execute(
    { mode: "PASTE", dstFile: "bt/bt1-dst-t.txt", targetMarker: "BT-TARGET", bufferName: "bt1" },
    BT_CTX,
  );
  const body = readFileSync(path.join(BT_DIR, "bt1-dst-t.txt"), "utf8");
  check(
    "111",
    "S15",
    "PASTE with targetMarker: the block lands RIGHT AFTER the target line (not at EOF) — byte-exact file + byte-exact Part F return",
    res === "Pasted 4 lines from buffer 'bt1' into 'bt/bt1-dst-t.txt' (lines 1..4, first: 'BT-START block') (inserted after line 2 in 'bt/bt1-dst-t.txt') - buffer: 4 lines." &&
      body === "head\nBT-TARGET line\nBT-START block\nline-2\nline-3\nBT-END block\ntail",
    JSON.stringify({ res, body }),
  );
}

// 10.12 — the #57 post-fix pin: MOVE with a MISSING dstFile → the exact byte
//      string `Error: 'dstFile' is required for MOVE mode.` WITH THE SOURCE
//      FILE UNTOUCHED (the check is hoisted pre-write — no partial cut)
{
  const src = btWrite("bt-move-nodst.txt", "x1\nBTM-START block\nx2\nBTM-END block\nx3");
  const before = readFileSync(src, "utf8");
  const res = await btTool.execute(
    { mode: "MOVE", srcFile: "bt/bt-move-nodst.txt", startMarker: "BTM-START", endMarker: "BTM-END" },
    BT_CTX,
  );
  check(
    "112",
    "S15",
    "#57 pin: MOVE without dstFile → byte-exact `Error: 'dstFile' is required for MOVE mode.` + source byte-identical (the guard is hoisted pre-write)",
    res === "Error: 'dstFile' is required for MOVE mode." && readFileSync(src, "utf8") === before,
    JSON.stringify({ res, changed: readFileSync(src, "utf8") !== before }),
  );
}

// 10.13 — the sandbox guard: MOVE with a dst OUTSIDE cwd+TEMP is rejected
//      BEFORE any fs access (the pre-write guard): the byte-exact
//      `Error: '<path>' is outside the sandbox (allowed: <roots>)` + the
//      source byte-identical + the outside file never created
{
  const src = btWrite("bt-sandbox-src.txt", "s1\nBTE-START block\ns2\nBTE-END block\ns3");
  const before = readFileSync(src, "utf8");
  const OUTSIDE = path.join(path.dirname(os.tmpdir()), "bt_outside_probe.txt");
  // re-pinned 2026-10-22 (TODO #140 unit A): the allowed set gains the
  // config roots of the repo's own opencode.jsonc (the loaded tool read
  // them at module load) — the expected roots mirror the tool's loader:
  // allow keys valued "allow", the /** twin stripped + resolved-lowercase
  // dedupe, comment + trailing-comma JSONC stripping, fail-open (no config
  // roots) on a read failure.
  const cfgRoots = (() => {
    try {
      const text = readFileSync(path.join(REPO_ROOT, "opencode.jsonc"), "utf8");
      let s = "", i = 0, inS = false, esc = false;
      for (; i < text.length; i++) {
        const c = text[i];
        if (inS) { s += c; if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inS = false; continue; }
        if (c === '"') { inS = true; s += c; continue; }
        if (c === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
        if (c === "/" && text[i + 1] === "*") { i += 2; while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++; i += 2; continue; }
        s += c;
      }
      let q = false, e = false, comma = -1;
      const drop = new Set();
      for (let j = 0; j < s.length; j++) {
        const c2 = s[j];
        if (q) { if (e) e = false; else if (c2 === "\\") e = true; else if (c2 === '"') q = false; continue; }
        if (c2 === '"') { q = true; comma = -1; continue; }
        if (c2 === ",") { comma = j; continue; }
        if (c2 === "}" || c2 === "]") { if (comma !== -1) drop.add(comma); comma = -1; continue; }
        if (c2.trim() !== "") comma = -1;
      }
      let u = "";
      for (let k = 0; k < s.length; k++) if (!drop.has(k)) u += s[k];
      const cfg = JSON.parse(u);
      const ext = cfg && typeof cfg === "object" && cfg.permission && typeof cfg.permission === "object"
        ? cfg.permission.external_directory
        : null;
      if (!ext || typeof ext !== "object") return [];
      const seen = new Set();
      const out = [];
      for (const [key, val] of Object.entries(ext)) {
        if (val !== "allow" || key === "") continue;
        const root = path.resolve(key.endsWith("/**") ? key.slice(0, -3) : key);
        const n = root.toLowerCase();
        if (seen.has(n)) continue;
        seen.add(n);
        out.push(root);
      }
      return out;
    } catch {
      return []; // fail-open mirror: the tool falls back to [cwd + temp] roots
    }
  })();
  const roots = [SANDBOX, ...cfgRoots, process.env.TEMP ?? process.env.TMP, os.tmpdir()]
    .filter((r) => typeof r === "string" && r.length > 0)
    .filter((r, i2, all) => all.indexOf(r) === i2);
  const res = await btTool.execute(
    { mode: "MOVE", srcFile: "bt/bt-sandbox-src.txt", startMarker: "BTE-START", endMarker: "BTE-END", dstFile: OUTSIDE },
    BT_CTX,
  );
  check(
    "113",
    "S15",
    "sandbox rejection: MOVE with an outside dst → byte-exact `Error: '<path>' is outside the sandbox (allowed: <roots>)` BEFORE any fs access (source byte-identical, outside file absent)",
    res === `Error: '${OUTSIDE}' is outside the sandbox (allowed: ${roots.join(", ")})` &&
      readFileSync(src, "utf8") === before && !existsSync(OUTSIDE),
    JSON.stringify({ res, outsideExists: existsSync(OUTSIDE) }),
  );
}

// 10.14 — anchor errors, the missing start marker: COPY with a startMarker
//      absent from the file → the byte-exact error naming the marker + the
//      file
{
  btWrite("bt-err.txt", "p1\nZZ-END before\np3\nYY-START after\np5");
  const res = await btTool.execute(
    { mode: "COPY", srcFile: "bt/bt-err.txt", startMarker: "NOPE-MISSING", endMarker: "ZZ-END", bufferName: "bt-err" },
    BT_CTX,
  );
  check(
    "114",
    "S15",
    "missing start marker → byte-exact `Error: Start marker 'NOPE-MISSING' not found in bt/bt-err.txt.`",
    res === "Error: Start marker 'NOPE-MISSING' not found in bt/bt-err.txt.",
    JSON.stringify({ res }),
  );
}

// 10.15 — anchor errors, the end-after-start rule: the endMarker EXISTS in
//      the file but ONLY before the startMarker → the teaching
//      end-not-found error CARRYING THE FILE REFERENCE (re-pinned
//      2026-09-26 per block_transfer v2 S3 — the S1-deferred switch: the
//      legacy "after start marker" wording is kept, the file is added)
{
  const res = await btTool.execute(
    { mode: "COPY", srcFile: "bt/bt-err.txt", startMarker: "YY-START", endMarker: "ZZ-END", bufferName: "bt-err" },
    BT_CTX,
  );
  check(
    "115",
    "S15",
    "end marker present ONLY before the start → byte-exact `Error: End marker 'ZZ-END' not found after start marker in bt/bt-err.txt.` (the v2 teaching format with the file reference)",
    res === "Error: End marker 'ZZ-END' not found after start marker in bt/bt-err.txt.",
    JSON.stringify({ res }),
  );
}

// 10.16 — the buffer lifecycle end: CLEAR returns the byte-exact Part F
//      line (re-pinned 2026-09-26 per block_transfer v2 S3 — the buffer's
//      line count AFTER the op = 0) and a subsequent PASTE of the SAME
//      (now empty) buffer → the byte-exact empty-buffer error (kept
//      verbatim, no file written)
{
  const r1 = await btTool.execute({ mode: "CLEAR", bufferName: "bt1" }, BT_CTX);
  const r2 = await btTool.execute({ mode: "PASTE", dstFile: "bt/bt1-dst-cleared.txt", bufferName: "bt1" }, BT_CTX);
  const created = existsSync(path.join(BT_DIR, "bt1-dst-cleared.txt"));
  check(
    "116",
    "S15",
    "buffer lifecycle end: byte-exact Part F CLEAR return + PASTE of the cleared buffer → byte-exact empty-buffer error (no file written)",
    r1 === "Cleared buffer 'bt1' - buffer: 0 lines." &&
      r2 === "Error: Clipboard buffer 'bt1' is empty. Perform a COPY or CUT first." && !created,
    JSON.stringify({ r1, r2, created }),
  );
}

// 10.17 — MOVE (the full success path): the block is CUT from the source
//      (byte-exact remainder) and inserted into a fresh dst at EOF
//      (targetMarker omitted) with the byte-exact `Moved 3 lines` return
{
  btWrite("bt-move.txt", "m1\nBTMV-START block\nm2\nBTMV-END block\nm3");
  const res = await btTool.execute(
    { mode: "MOVE", srcFile: "bt/bt-move.txt", startMarker: "BTMV-START", endMarker: "BTMV-END", dstFile: "bt/bt-move-dst.txt" },
    BT_CTX,
  );
  const srcBody = readFileSync(path.join(BT_DIR, "bt-move.txt"), "utf8");
  const dstBody = readFileSync(path.join(BT_DIR, "bt-move-dst.txt"), "utf8");
  check(
    "117",
    "S15",
    "MOVE success: byte-exact Part F feedback (re-pinned 2026-09-26 per block_transfer v2 S3) + source cut to `m1`+`m3` + dst = the inclusive block",
    res === "Moved 3 lines from 'bt/bt-move.txt' to 'bt/bt-move-dst.txt' (lines 2..4, first: 'BTMV-START block') (at EOF)." &&
      srcBody === "m1\nm3" && dstBody === "BTMV-START block\nm2\nBTMV-END block",
    JSON.stringify({ res, srcBody, dstBody }),
  );
}

// 262 — TODO #94: REPLACE (the happy path): the line-anchored span of an
//      EXISTING dst is replaced IN PLACE by the named buffer's content —
//      byte-exact dst + byte-exact `REPLACED` report + the buffer PRESERVED
//      (a later PASTE of the same buffer still reports its 2 lines). Fresh
//      buffer `bt-rep` — the `bt1` buffer was CLEARED at check 116.
{
  const dst = btWrite("bt-rep.txt", "head\nREP-A old one\nREP-B old two\ntail");
  btWrite("bt-rep-src.txt", "RS-A new one\nRS-B new two");
  await btTool.execute(
    { mode: "COPY", srcFile: "bt/bt-rep-src.txt", startMarker: "RS-A", endMarker: "RS-B", bufferName: "bt-rep" },
    BT_CTX,
  );
  const res = await btTool.execute(
    { mode: "REPLACE", dstFile: "bt/bt-rep.txt", startMarker: "REP-A", endMarker: "REP-B", bufferName: "bt-rep" },
    BT_CTX,
  );
  const body = readFileSync(dst, "utf8");
  const rPreserve = await btTool.execute({ mode: "PASTE", dstFile: "bt/bt-rep-preserve.txt", bufferName: "bt-rep" }, BT_CTX);
  check(
    "262",
    "S15",
    "REPLACE happy path: the span (REP-A..REP-B inclusive) of the existing dst is replaced by the buffer — byte-exact dst + byte-exact Part F feedback (re-pinned 2026-09-26 per block_transfer v2 S3) + the buffer PRESERVED (the later PASTE reports its 2 lines in the Part F shape)",
    res === "Replaced 2 lines in 'bt/bt-rep.txt' with buffer 'bt-rep' (old 2..3 -> new 2..3, file now 4 lines, first: 'RS-A new one') - buffer: 2 lines." &&
      body === "head\nRS-A new one\nRS-B new two\ntail" &&
      rPreserve === "Pasted 2 lines from buffer 'bt-rep' into 'bt/bt-rep-preserve.txt' (lines 1..2, first: 'RS-A new one') (at EOF) - buffer: 2 lines.",
    JSON.stringify({ res, body, rPreserve }),
  );
}

// 263 — TODO #94: REPLACE (the non-unique anchor): the startMarker matches
//      MORE THAN ONE line → the v2 teaching non-unique error (match count +
//      the first match line numbers — re-pinned 2026-09-26 per
//      block_transfer v2 S3, the S1-deferred switch) + the dst byte-identical
//      (no write)
{
  const dst = btWrite("bt-rep-nq.txt", "head\nDUP-A line one\nDUP-B line two\ntail");
  const before = readFileSync(dst, "utf8");
  const res = await btTool.execute(
    { mode: "REPLACE", dstFile: "bt/bt-rep-nq.txt", startMarker: "DUP", endMarker: "DUP-B", bufferName: "bt-rep" },
    BT_CTX,
  );
  check(
    "263",
    "S15",
    "REPLACE non-unique start anchor: 'DUP' matches 2 lines → byte-exact v2 teaching error `Error: Start marker 'DUP' is not unique in bt/bt-rep-nq.txt (2 matches: lines 2, 3).` + the dst byte-identical (no write)",
    res === "Error: Start marker 'DUP' is not unique in bt/bt-rep-nq.txt (2 matches: lines 2, 3)." && readFileSync(dst, "utf8") === before,
    JSON.stringify({ res, changed: readFileSync(dst, "utf8") !== before }),
  );
}

// 341 — plan25 fix (a) (2026-09-27): a DIGIT-STRING ref resolves as a
//      1-based line number (the host's constrained decoding stringifies
//      schema integers in the LIVE channel — the type branch alone was
//      dead there): the byte-exact SAME result as the numeric call + the
//      digit-string "0" -> the not-1-based error + the out-of-range
//      digit-string -> the ref-out-of-range error (with the count)
{
  const src = btWrite("bt-dig.txt", "d1\nd2\nd3\nd4");
  const rStr = await btTool.execute({ mode: "COPY", srcFile: "bt/bt-dig.txt", startMarker: "2", endMarker: "3", bufferName: "btDig" }, BT_CTX);
  const rNum = await btTool.execute({ mode: "COPY", srcFile: "bt/bt-dig.txt", startMarker: 2, endMarker: 3, bufferName: "btDigNum" }, BT_CTX);
  const r0 = await btTool.execute({ mode: "COPY", srcFile: "bt/bt-dig.txt", startMarker: "0", endMarker: "3", bufferName: "btDig0" }, BT_CTX);
  const r9 = await btTool.execute({ mode: "COPY", srcFile: "bt/bt-dig.txt", startMarker: "9", endMarker: "3", bufferName: "btDig9" }, BT_CTX);
  check(
    "341",
    "S15",
    "digit-string refs (plan25 a): '2'..'3' give the SAME byte-exact result as 2..3 (live-channel decoding) + '0' -> `Error: Start marker 0 is not a 1-based line number in bt/bt-dig.txt.` + '9' -> `Error: line 9 is out of range in bt/bt-dig.txt (the file has 4 lines).`",
    rStr === "Copied 2 lines from 'bt/bt-dig.txt' into buffer 'btDig' (lines 2..3, first: 'd2') - buffer: 2 lines." &&
      rNum === "Copied 2 lines from 'bt/bt-dig.txt' into buffer 'btDigNum' (lines 2..3, first: 'd2') - buffer: 2 lines." &&
      r0 === "Error: Start marker 0 is not a 1-based line number in bt/bt-dig.txt." &&
      r9 === "Error: line 9 is out of range in bt/bt-dig.txt (the file has 4 lines).",
    JSON.stringify({ rStr, rNum, r0, r9 }),
  );
}

// 342 — plan25 fix (b): the ANCHOR's leading spaces/tabs are stripped
//      before the prefix match (an anchor typed with the line's
//      indentation now matches) + an all-whitespace anchor matches NO
//      line (never match-all) -> the byte-identical OLD not-found format
//      (no candidate hint)
{
  const src = btWrite("bt-ind.txt", "i1\n   ind line\ni3");
  const r1 = await btTool.execute({ mode: "COPY", srcFile: "bt/bt-ind.txt", startMarker: "   ind line", endMarker: "   ind line", bufferName: "btInd" }, BT_CTX);
  const r2 = await btTool.execute({ mode: "COPY", srcFile: "bt/bt-ind.txt", startMarker: " \t ", endMarker: "i3", bufferName: "btInd2" }, BT_CTX);
  check(
    "342",
    "S15",
    "anchor-side trim (plan25 b): the indented anchor matches its line (the echo keeps the original indentation) + the all-whitespace anchor ' \\t ' matches NO line -> the byte-identical OLD not-found format (no candidate hint)",
    r1 === "Copied 1 line from 'bt/bt-ind.txt' into buffer 'btInd' (lines 2..2, first: '   ind line') - buffer: 1 line." &&
      r2 === "Error: Start marker ' \t ' not found in bt/bt-ind.txt.",
    JSON.stringify({ r1, r2 }),
  );
}

// 343 — plan25 fix (c): the candidate hint in the not-found error —
//      deterministic "closest" = the length of the longest common prefix
//      of the trimmed anchor and the trimmed line, top 5 by length DESC,
//      ties by line number ASC, only lines sharing >= 1 char qualify;
//      the anchor is quoted AS GIVEN (untrimmed)
{
  const src = btWrite("bt-ord.txt", "AB first\nABC second\nAB second");
  const r1 = await btTool.execute({ mode: "COPY", srcFile: "bt/bt-ord.txt", startMarker: "ABCD", endMarker: "AB second", bufferName: "btOrd" }, BT_CTX);
  check(
    "343",
    "S15",
    "candidate hint (plan25 c): `Error: Start marker 'ABCD' not found in bt/bt-ord.txt. Closest lines: 2: 'ABC second', 1: 'AB first', 3: 'AB second'` (length desc, ties by line asc)",
    r1 === "Error: Start marker 'ABCD' not found in bt/bt-ord.txt. Closest lines: 2: 'ABC second', 1: 'AB first', 3: 'AB second'",
    JSON.stringify({ r1 }),
  );
}

// 344 — plan25 fix (c), the hint bounds: up to 5 candidates (the cap —
//      6 qualifying lines -> exactly 5, ties by line asc so line 6 is
//      dropped) + each echoed capped at 40 chars ('...' appended when
//      cut, the line's \r stripped, original indentation shown)
{
  const long = "  CX long line with more than forty characters here";
  const src = btWrite("bt-cap.txt", long + "\nCX short two\nCX short three\nCX short four\nCX short five\nCX short six");
  const r1 = await btTool.execute({ mode: "COPY", srcFile: "bt/bt-cap.txt", startMarker: "CY", endMarker: "CX short six", bufferName: "btCap" }, BT_CTX);
  check(
    "344",
    "S15",
    "candidate hint bounds (plan25 c): 6 qualifying lines -> EXACTLY 5 candidates (the cap) + the >40-char line echoed capped at 40 chars ('...' appended, original indentation shown)",
    r1 === `Error: Start marker 'CY' not found in bt/bt-cap.txt. Closest lines: 1: '${long.slice(0, 40)}...', 2: 'CX short two', 3: 'CX short three', 4: 'CX short four', 5: 'CX short five'`,
    JSON.stringify({ r1 }),
  );
}

// ------------------------------------------------------------------ S16 loop_log tool (6) — the #60 probe pin (part 2 of 2): the looprun activity log as a directly-fired tool
//
// The custom tool at .opencode/tools/loop_log.ts (T3, the loop-tool-batch
// part 3): the loop-log line every agent used to hand-format, now
// machine-formatted. Imported DIRECT (type-stripped, the S12/S13 load
// pattern). The probe drives it with context.directory = sandbox roots —
// the loop root <dir>/loop, the created autorun-* folder, and the
// loop_log.md all land in the sandbox (the repo's real loop/ is
// NEVER touched; S5 hygiene verifies zero writes outside the sandbox). The
// folder stamp is local-clock, minute resolution — pinned by FORMAT (regex),
// never the exact value (the AGENTS.md pattern-5 discipline). Plain tool()
// object: no plugin hooks — the sandbox stays clean.
const LL_TOOL_TS = path.join(REPO_ROOT, ".opencode", "tools", "deactivated", "loop_log.ts");
const LL_A = path.join(SANDBOX, "ll-a"); // the single-folder case (checks 10.19-122)
const LL_MULTI = path.join(SANDBOX, "ll-multi"); // the several-folders anomaly case (check 123)
const STAMP_RE = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/;
let llTool;
let llFolderA = null;
let llRetA = null;

// 10.18 — the tool file imports (type-stripped, direct) and exposes the
//      tool() default export: description (non-empty string) + the 5 args IN
//      ORDER (v2: the status REQUIRED free-form string — parse accepts any
//      string, the rejection is RUNTIME (Part C) — role/model OPTIONAL
//      (Part A auto-identity), content REQUIRED, session OPTIONAL) + async
//      execute + NO `name` field (the host names the tool by FILENAME)
{
  const toolMod = await import(pathToFileURL(LL_TOOL_TS).href);
  llTool = toolMod.default;
  const argKeys = Object.keys(llTool?.args ?? {});
  const statusSch = llTool?.args?.status;
  const reqStr = (k) => {
    const s = llTool?.args?.[k];
    return s != null && typeof s.safeParse === "function" && s.safeParse(undefined).success === false && s.safeParse("x").success === true;
  };
  const optStr = (k) => {
    const s = llTool?.args?.[k];
    return s != null && typeof s.safeParse === "function" && s.safeParse(undefined).success === true && s.safeParse("x").success === true;
  };
  check(
    "118",
    "S16",
    "tool file imports (type-stripped, direct) and exposes the tool() default export (description + args [role, model, status, content, session?] + async execute, NO name field) — v2: status = REQUIRED free-form string (parse accepts any string — the rejection is runtime, Part C), role/model OPTIONAL (Part A), content REQUIRED, session OPTIONAL",
    llTool != null && typeof llTool.description === "string" && llTool.description.length > 0 &&
      JSON.stringify(argKeys) === JSON.stringify(["role", "model", "status", "content", "session"]) &&
      statusSch != null && typeof statusSch.safeParse === "function" &&
      statusSch.safeParse(undefined).success === false &&
      ["done", "BOGUS", "", "CORRECT-"].every((v) => statusSch.safeParse(v).success === true) && statusSch.safeParse(42).success === false &&
      ["role", "model", "session"].every(optStr) &&
      reqStr("content") &&
      typeof llTool.execute === "function" && llTool.execute.constructor.name === "AsyncFunction" &&
      !("name" in llTool),
    JSON.stringify({ keys: argKeys, status: ["done", "BOGUS", ""].map((v) => statusSch?.safeParse?.(v)?.success), async: llTool?.execute?.constructor?.name, nameIn: "name" in (llTool ?? {}) }),
  );
}

// 10.19 — the empty loop root: the tool CREATES `autorun-<YYYY-MM-DD_HH-MM>`
//      (the stamp pinned by FORMAT — local clock, minute resolution, never
//      the exact value) + its loop_log.md (exactly one line); the v2 return
//      is EXACTLY three lines `folder: <name> (created)` + `line: <line>` +
//      `verified: readback-match` (no ANOMALY for a fresh single folder)
{
  llRetA = await llTool.execute(
    { role: "probe-s16", model: "probe-model", status: "-->START", content: "probe start line" },
    { directory: LL_A },
  );
  const lines = String(llRetA).split("\n");
  llFolderA = lines[0]?.startsWith("folder: ") ? lines[0].slice("folder: ".length) : null;
  const llFolderBareA = (llFolderA ?? "").replace(/\s\((created|existing)\)$/, "");
  const logFile = path.join(LL_A, "loop", llFolderBareA, "loop_log.md");
  const logBody = existsSync(logFile) ? readFileSync(logFile, "utf8") : null;
  check(
    "119",
    "S16",
    "empty loop root → auto-created `autorun-<YYYY-MM-DD_HH-MM>` (stamp format pinned) + loop_log.md (one line); v2 return EXACTLY `folder: <name> (created)\\nline: <line>\\nverified: readback-match` (no ANOMALY)",
    lines.length === 3 && llFolderA !== null && llFolderA.endsWith(" (created)") && llFolderBareA.startsWith("autorun-") && STAMP_RE.test(llFolderBareA.slice("autorun-".length)) &&
      lines[1].startsWith("line: ") && lines[2] === "verified: readback-match" && !String(llRetA).includes("ANOMALY") &&
      logBody !== null && logBody.endsWith("\n") && logBody.split("\n").filter((l) => l.length > 0).length === 1,
    JSON.stringify({ lines, logBody }),
  );
}

// 120 — the line format: `<stamp> <status> <role> <session|unknown>
//      <model> <content>` (the field order byte-exact — UNCHANGED by v2, the
//      stamp the same format as the folder name; the session was OMITTED in
//      the call and the probe context carries no identity fields → the
//      literal `unknown` in the 4th field), and the return's `line:` field
//      carries EXACTLY the line that landed in the file (+ the v2 flags on
//      the same return: the ` (created)` folder + `verified: readback-match`)
{
  const llFolderBareA2 = (llFolderA ?? "").replace(/\s\((created|existing)\)$/, "");
  const logFile = path.join(LL_A, "loop", llFolderBareA2, "loop_log.md");
  const logBody = existsSync(logFile) ? readFileSync(logFile, "utf8") : null;
  const lineOnly = logBody === null ? null : logBody.replace(/\n$/, "");
  const lineRe = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2} -->START probe-s16 unknown probe-model probe start line$/;
  check(
    "120",
    "S16",
    "line format `<stamp> <status> <role> <session|unknown> <model> <content>` (field order byte-exact; omitted session → literal `unknown`) + the return's `line:` field == the file's line (byte-exact) + the v2 flags on the same return (` (created)` folder, `verified: readback-match`)",
    lineOnly !== null && lineRe.test(lineOnly) && STAMP_RE.test(lineOnly.slice(0, 16)) &&
      llRetA != null && llRetA.split("\n")[1] === `line: ${lineOnly}` &&
      llRetA.split("\n")[0] === `folder: ${llFolderBareA2} (created)` && llRetA.split("\n")[2] === "verified: readback-match",
    JSON.stringify({ lineOnly, retLine: llRetA?.split("\n")[1] }),
  );
}

// 121 — the session passthrough + append-only + single-folder reuse: call
//      #2 with an explicit session → the NEW line carries it in the 4th
//      field (field order intact); the file gains EXACTLY one line; the SAME
//      folder is used, now flagged ` (existing)` + `verified: readback-match`
//      (the exactly-one-folder rule — still no ANOMALY)
{
  const llFolderBareA3 = (llFolderA ?? "").replace(/\s\((created|existing)\)$/, "");
  const logFile = path.join(LL_A, "loop", llFolderBareA3, "loop_log.md");
  const countLines = () => readFileSync(logFile, "utf8").split("\n").filter((l) => l.length > 0).length;
  const beforeCount = countLines();
  const res2 = await llTool.execute(
    { role: "probe-s16", model: "probe-model", status: "DONE<---", content: "probe done line", session: "ses_ll_01" },
    { directory: LL_A },
  );
  const lines2 = String(res2).split("\n");
  const afterCount = countLines();
  const allLines = readFileSync(logFile, "utf8").split("\n").filter((l) => l.length > 0);
  const lastLine = allLines[allLines.length - 1] ?? "";
  check(
    "121",
    "S16",
    "call #2 (session `ses_ll_01` given): the new line carries it in the 4th field (field order byte-exact); the file gains EXACTLY one line; the SAME folder is reused, flagged ` (existing)` + `verified: readback-match` (no ANOMALY)",
    lines2.length === 3 && lines2[0] === `folder: ${llFolderBareA3} (existing)` && lines2[2] === "verified: readback-match" && !String(res2).includes("ANOMALY") &&
      afterCount === beforeCount + 1 &&
      /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2} DONE<--- probe-s16 ses_ll_01 probe-model probe done line$/.test(lastLine) &&
      lines2[1] === `line: ${lastLine}`,
    JSON.stringify({ lines2, beforeCount, afterCount, lastLine }),
  );
}

// 122 — the empty-string session: `session: ""` → the 4th field is the
//      literal `unknown` again (the fallback covers omitted AND empty); the
//      file gains exactly one more line
{
  const llFolderBareA4 = (llFolderA ?? "").replace(/\s\((created|existing)\)$/, "");
  const logFile = path.join(LL_A, "loop", llFolderBareA4, "loop_log.md");
  const countLines = () => readFileSync(logFile, "utf8").split("\n").filter((l) => l.length > 0).length;
  const beforeCount = countLines();
  const res3 = await llTool.execute(
    { role: "probe-s16", model: "probe-model", status: "-WARNING", content: "probe warning line", session: "" },
    { directory: LL_A },
  );
  const afterCount = countLines();
  const allLines = readFileSync(logFile, "utf8").split("\n").filter((l) => l.length > 0);
  const lastLine = allLines[allLines.length - 1] ?? "";
  check(
    "122",
    "S16",
    "session: '' (empty) → the 4th field is the literal `unknown` (the fallback covers omitted AND empty); exactly one more line; the SAME folder, flagged ` (existing)`",
    String(res3).split("\n")[0] === `folder: ${llFolderBareA4} (existing)` &&
      afterCount === beforeCount + 1 &&
      /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2} -WARNING probe-s16 unknown probe-model probe warning line$/.test(lastLine),
    JSON.stringify({ res3, beforeCount, afterCount, lastLine }),
  );
}

// 123 — the SEVERAL-folders anomaly: two dummy autorun-* dirs in a fresh
//      loop root (their mtimes pinned explicitly — the probe never trusts
//      the wall clock for the outcome) → the MOST-RECENTLY-MODIFIED folder
//      is used (flagged ` (existing)`) AND the byte-exact ANOMALY note is
//      the LAST return line (the v2 `verified:` line sits above it — the
//      other folder stays untouched)
{
  const dOld = path.join(LL_MULTI, "loop", "autorun-2026-09-01_09-05");
  const dNew = path.join(LL_MULTI, "loop", "autorun-2026-09-14_10-05");
  mkdirSync(dOld, { recursive: true });
  mkdirSync(dNew, { recursive: true });
  utimesSync(dOld, Date.UTC(2026, 8, 1, 9, 5) / 1000, Date.UTC(2026, 8, 1, 9, 5) / 1000);
  utimesSync(dNew, Date.UTC(2026, 8, 14, 10, 5) / 1000, Date.UTC(2026, 8, 14, 10, 5) / 1000);
  const res = await llTool.execute(
    { role: "probe-s16", model: "probe-model", status: "--INFO--", content: "probe anomaly line" },
    { directory: LL_MULTI },
  );
  const lines = String(res).split("\n");
  const expectedAnomaly =
    "ANOMALY: 2 autorun-* folders exist in the loop dir; used the most-recently-modified (autorun-2026-09-14_10-05). The protocol invariant is EXACTLY ONE current looprun folder — rollover is planner work.";
  const logFile = path.join(dNew, "loop_log.md");
  const logBody = existsSync(logFile) ? readFileSync(logFile, "utf8") : null;
  const oldTouched = existsSync(path.join(dOld, "loop_log.md"));
  check(
    "123",
    "S16",
    "SEVERAL autorun-* folders → the most-recently-MODIFIED one is used (flagged ` (existing)` + `verified: readback-match`) + the byte-exact ANOMALY note as the LAST (4th) return line (the other folder untouched)",
    lines.length === 4 && lines[0] === "folder: autorun-2026-09-14_10-05 (existing)" && lines[2] === "verified: readback-match" && lines[3] === expectedAnomaly &&
      logBody !== null && lines[1] === `line: ${logBody.replace(/\n$/, "")}` && logBody.endsWith("\n") && !oldTouched,
    JSON.stringify({ lines, logBody, oldTouched, expectedAnomaly }),
  );
}

// ------------------------------------------------------------------ S17 numword scriptlet (26)
//
// The lane-5.2 scriptlet (agent/scripts/numword/): ONE shared map
// (numwords.json) read by BOTH entry points. The node CLI is SPAWNED (the
// committed scriptlet IS the contract — no in-probe re-implementation), the
// python twin is spawned via the repo venv python (the agent repo has no
// .venv of its own post-split — the FST workspace venv is the fallback,
// #113 close 2026-09-30), and the module is required DIRECT via
// createRequire (node -e usable). Grammar: research §3.2 +
// addendum C4 — unknown input is LOUD, never a best-guess.

const NUMWORD_DIR = path.join(REPO_ROOT, "agent", "scripts", "numword");
const NUMWORD_JS = path.join(NUMWORD_DIR, "numword.cjs");
const NUMWORDS_JSON = path.join(NUMWORD_DIR, "numwords.json");
const FST_VENV_PY = "C:\\Users\\operator\\Repos\\Free-Snap-Tap\\.venv\\Scripts\\python.exe";
const VENV_PY = existsSync(path.join(REPO_ROOT, ".venv", "Scripts", "python.exe"))
  ? path.join(REPO_ROOT, ".venv", "Scripts", "python.exe")
  : FST_VENV_PY;
const runNumword = (args) => {
  try {
    const stdout = execFileSync(process.execPath, [NUMWORD_JS, ...args], { encoding: "utf8" });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
};
const runPyW2n = (word) => {
  const code = "import sys; sys.path.insert(0, sys.argv[1]); from w2n import w2n; sys.stdout.write(w2n(sys.argv[2]))";
  try {
    const stdout = execFileSync(VENV_PY, ["-c", code, NUMWORD_DIR, word], { encoding: "utf8" });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
};
const NW_PASS = [
  ["nine", "9"],
  ["ninetyfour", "94"],
  ["fourty", "40"],
  ["one-zero-one", "101"],
  ["two-zero", "20"],
  ["one-zero-six", "106"],
  ["eleven", "11"],
];
const NW_REJECT = ["twozero", "two+zero", "foour", "eleventy"];
let n17 = 124;

// 124 — the shared map is complete (the ONE source both entry points read)
{
  const m = JSON.parse(readFileSync(NUMWORDS_JSON, "utf8"));
  const units = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const tens = ["ten", "twenty", "thirty", "forty", "fourty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const teens = ["eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  check(
    "124",
    "S17",
    "shared numwords.json complete: units zero..nine, tens ten..ninety + fourty alias (40), teens eleven..nineteen (19)",
    units.every((u) => u in m.units) && tens.every((t) => t in m.tens) && teens.every((t) => t in m.teens) &&
      m.units.zero === 0 && m.units.nine === 9 && m.tens.forty === 40 && m.tens.fourty === 40 && m.teens.eleven === 11 && m.teens.nineteen === 19,
    JSON.stringify(Object.keys(m)),
  );
  n17++;
}

// 125-131 — node CLI pass fixtures (exit 0, the digit string byte-exact)
for (const [w, d] of NW_PASS) {
  const r = runNumword([w]);
  check(
    String(n17),
    "S17",
    `node CLI ${w} → ${d} (exit 0)`,
    r.code === 0 && r.stdout.trim() === d,
    `code=${r.code} stdout='${r.stdout.trim()}' stderr='${r.stderr.trim().slice(0, 120)}'`,
  );
  n17++;
}

// 132-135 — node CLI reject fixtures (loud: non-zero exit + unknown on stderr)
for (const w of NW_REJECT) {
  const r = runNumword([w]);
  check(
    String(n17),
    "S17",
    `node CLI ${w} → LOUD reject (exit 1, unknown on stderr)`,
    r.code === 1 && /unknown/i.test(r.stderr),
    `code=${r.code} stdout='${r.stdout.trim()}' stderr='${r.stderr.trim().slice(0, 120)}'`,
  );
  n17++;
}

// 136-142 — python w2n pass fixtures (same map + grammar behavior)
for (const [w, d] of NW_PASS) {
  const r = runPyW2n(w);
  check(
    String(n17),
    "S17",
    `python w2n(${w}) → ${d}`,
    r.code === 0 && r.stdout.trim() === d,
    `code=${r.code} stdout='${r.stdout.trim()}' stderr='${r.stderr.trim().slice(0, 120)}'`,
  );
  n17++;
}

// 143-146 — python w2n reject fixtures (loud: ValueError, non-zero exit)
for (const w of NW_REJECT) {
  const r = runPyW2n(w);
  check(
    String(n17),
    "S17",
    `python w2n(${w}) → ValueError (loud)`,
    r.code !== 0 && /ValueError/.test(r.stderr),
    `code=${r.code} stdout='${r.stdout.trim()}' stderr='${r.stderr.trim().slice(0, 120)}'`,
  );
  n17++;
}

// 147-149 — the node module (node -e usable): w2n parity + loud throws +
//      numword_check shell contract
{
  const nw = createRequire(import.meta.url)(NUMWORD_JS);
  check(
    String(n17),
    "S17",
    "module (node -e usable): w2n agrees with every pass fixture",
    NW_PASS.every(([w, d]) => nw.w2n(w) === d),
    JSON.stringify(NW_PASS.map(([w]) => [w, nw.w2n(w)])),
  );
  n17++;
  check(
    String(n17),
    "S17",
    "module: every reject fixture throws (loud, never guessed)",
    NW_REJECT.every((w) => {
      try {
        nw.w2n(w);
        return false;
      } catch {
        return true;
      }
    }),
    JSON.stringify(NW_REJECT),
  );
  n17++;
  const c1 = nw.numword_check("20", "two-zero");
  const c2 = nw.numword_check("5", "nine");
  const c3 = nw.numword_check("9", "eleventy");
  check(
    String(n17),
    "S17",
    "numword_check: AGREE 20 (code 0) / DISAGREE 9 (code 1) / UNKNOWN eleventy (code 2)",
    c1.out === "AGREE 20" && c1.code === 0 && c2.out === "DISAGREE 9" && c2.code === 1 && c3.out === "UNKNOWN eleventy" && c3.code === 2,
    JSON.stringify([c1, c2, c3]),
  );
  n17++;
}

// ------------------------------------------------------------------ S22 submit tool (9) — the #53 Part B pin (2026-09-18): the unified append tool for the three agent-inbox channels
//
// The custom tool at .opencode/tools/submit.ts (approved
// 2026-09-17_agent-feedback-closedown.md, Part B): ONE unified append tool
// for the three agent-inbox channels — feedback (the #53 friction log),
// knowledge (the knowledge inbox), todo (the loose-findings inbox). The
// tool machine-stamps each entry (<header> <YYYY-MM-DD_HH-MM> <role>
// <session> + the raw text + one trailing blank line) and APPENDS it to
// its HARDCODED target — the NO-path-parameter IS the sandbox (note the
// deliberate deviation from the proposal's ".opencode/ subtree" wording:
// todo_inbox.md sits at the project root — the spec ratifies the three
// exact paths). Imported DIRECT (type-stripped, the S12/S13/S16 load
// pattern). Driven with context.directory = sandbox roots — the targets
// land in the sandbox, the real agent/agent_feedback.md /
// knowledge_inbox.md / todo_inbox.md are NEVER touched (S5 hygiene
// verifies zero writes outside the sandbox). The stamp is local-clock,
// minute resolution — pinned by FORMAT (regex) + the minute-boundary
// before/after trick, never the exact value. role + session are AUTO-FILLED from the tool context (context.agent / context.sessionID, falling back to `agent`/`unknown`) — the agent supplies the three channel texts only; there is NO role/session parameter. Plain tool() object: no
// plugin hooks — the sandbox stays clean.
const SUB_TOOL_TS = path.join(REPO_ROOT, ".opencode", "tools", "deactivated", "submit.ts");
const SUB_FB = path.join(SANDBOX, "submit-fb"); // no-params error + the feedback append (checks 230/231)
const SUB_KN = path.join(SANDBOX, "submit-kn"); // the knowledge append (check 234)
const SUB_TODO = path.join(SANDBOX, "submit-todo"); // the todo append (check 235)
const SUB_KEEP = path.join(SANDBOX, "submit-keep"); // the never-read preservation (check 238)
const SUB_NO_PARAMS_ERR = "error: none of feedback/knowledge/todo/ideas/memory provided — nothing written";
const SUB_REL = {
  feedback: "agent/agent_feedback.md",
  knowledge: "agent/knowledge/knowledge_inbox.md",
  todo: "todo_inbox.md",
  ideas: "agent/agent_ideas.md",
};
const SUB_HDR = { feedback: "###", knowledge: "##", todo: "##", ideas: "###" };
const subEntry = (k, s, role, ses, text) => `${SUB_HDR[k]} ${s} ${role} ${ses}\n${text}\n\n`;
const subBlock = (k, entry) => `${k}\ntarget: ${SUB_REL[k]}\nentry: ${entry}`;
const subStampNow = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
};
let n22 = 230;
let subTool;

// 230 — registration shape (1 of 3): the tool file imports (type-stripped,
//      direct) and exposes the tool() default export: description
//      (non-empty string) + the 3 channel args IN ORDER
//      (feedback/knowledge/todo — role/session are GONE, auto-filled from
//      the tool context) + an execute function
{
  const toolMod = await import(pathToFileURL(SUB_TOOL_TS).href);
  subTool = toolMod.default;
  const argKeys = Object.keys(subTool?.args ?? {});
  check(
    String(++n22),
    "S23",
    "submit tool file imports (type-stripped, direct) and exposes the tool() default export (description + args [feedback, knowledge, todo, ideas, memory] + execute; role/session GONE from the schema)",
    subTool != null && typeof subTool.description === "string" && subTool.description.length > 0 &&
      JSON.stringify(argKeys) === JSON.stringify(["feedback", "knowledge", "todo", "ideas", "memory"]) &&
      typeof subTool.execute === "function",
    JSON.stringify({ keys: argKeys, descType: typeof subTool?.description }),
  );
}

// 231 — registration shape (2 of 3): NO stale `name`/`parameters` keys —
//      the host names the tool by FILENAME (the committed tool() form)
{
  check(
    String(++n22),
    "S22",
    "NO stale `name`/`parameters` keys (the host names the tool by FILENAME)",
    subTool != null && !("name" in subTool) && !("parameters" in subTool),
    JSON.stringify({ nameIn: "name" in (subTool ?? {}), parametersIn: "parameters" in (subTool ?? {}) }),
  );
}

// 232 — registration shape (3 of 3): execute is an ASYNC function
{
  check(
    String(++n22),
    "S22",
    "execute is an AsyncFunction",
    subTool != null && typeof subTool.execute === "function" && subTool.execute.constructor.name === "AsyncFunction",
    subTool?.execute?.constructor?.name,
  );
}

// 233 — the arg schema: ALL 4 channel args are OPTIONAL (each accepts undefined
//      AND a string — the at-least-one-required rule is a RUNTIME rule,
//      not a schema constraint) — feedback/knowledge/todo + the 2026-09-27
//      `ideas` channel (the agent-side ideas inbox, distinct from feedback)
{
  const optAccept = (k) => {
    const s = subTool?.args?.[k];
    return s != null && typeof s.safeParse === "function" && s.safeParse(undefined).success === true && s.safeParse("x").success === true;
  };
  check(
    String(++n22),
    "S22",
    "arg schema: all 5 channel args (feedback/knowledge/todo/ideas/memory) optional-accept (undefined AND a string); role/session absent from the schema",
    ["feedback", "knowledge", "todo", "ideas", "memory"].every(optAccept) && !("role" in (subTool?.args ?? {})) && !("session" in (subTool?.args ?? {})),
    JSON.stringify({ args: ["feedback", "knowledge", "todo", "ideas", "memory"].map((k) => ({ k, ok: optAccept(k) })), roleIn: "role" in (subTool?.args ?? {}), sessionIn: "session" in (subTool?.args ?? {}) }),
  );
}

// 234 — the no-params error: execute({}) AND all-empty-string args return
//      the EXACT error string and create NO target (the fresh sandbox
//      project dir stays empty — nothing written)
{
  const noArgsRet = await subTool.execute({}, { directory: SUB_FB });
  const emptyRet = await subTool.execute({ feedback: "", knowledge: "  ", todo: "", ideas: "", memory: "" }, { directory: SUB_FB });
  check(
    String(++n22),
    "S22",
    "no-params ({} and all-empty-string) → the EXACT error string + NO target created (nothing written)",
    noArgsRet === SUB_NO_PARAMS_ERR && emptyRet === SUB_NO_PARAMS_ERR &&
      !existsSync(path.join(SUB_FB, "agent")) && !existsSync(path.join(SUB_FB, "todo_inbox.md")),
    JSON.stringify({ noArgsRet, emptyRet }),
  );
}

// 235 — the feedback append (1 of 3): a fresh sandbox project dir — the
//      tool CREATES agent/agent_feedback.md (parent dirs
//      auto-created) carrying ONLY the entry: `### <stamp> probe-s21
//      ses_fx_sub` + the raw text + one trailing blank line (the stamp
//      minute-resolution, pinned by the before/after trick); the return is
//      `feedback` + `target: <rel>` + `entry: <exact text>` byte-exact;
//      the other two targets are ABSENT
{
  const t1 = subStampNow();
  const ret = await subTool.execute(
    { feedback: "probe feedback line" },
    { directory: SUB_FB, agent: "probe-s21", sessionID: "ses_fx_sub" },
  );
  const t2 = subStampNow();
  const f = path.join(SUB_FB, SUB_REL.feedback);
  const body = existsSync(f) ? readFileSync(f, "utf8") : null;
  const okEntry = (s) => body === subEntry("feedback", s, "probe-s21", "ses_fx_sub", "probe feedback line");
  const okRet = (s) => ret === subBlock("feedback", subEntry("feedback", s, "probe-s21", "ses_fx_sub", "probe feedback line"));
  check(
    String(++n22),
    "S22",
    "feedback append: target created carrying ONLY the entry (### stamp, format pinned) + return byte-exact (`feedback` + `target:` + `entry:`) + the other two targets absent",
    (okEntry(t1) || okEntry(t2)) && (okRet(t1) || okRet(t2)) &&
      !existsSync(path.join(SUB_FB, SUB_REL.knowledge)) && !existsSync(path.join(SUB_FB, SUB_REL.todo)),
    JSON.stringify({ ret, body }),
  );
}

// 236 — the knowledge append (2 of 3): the same contract for
//      agent/knowledge/knowledge_inbox.md with the `## ` header
//      (the established form of the inbox channel)
{
  const t1 = subStampNow();
  const ret = await subTool.execute(
    { knowledge: "probe knowledge line" },
    { directory: SUB_KN, agent: "probe-s21", sessionID: "ses_fx_sub" },
  );
  const t2 = subStampNow();
  const f = path.join(SUB_KN, SUB_REL.knowledge);
  const body = existsSync(f) ? readFileSync(f, "utf8") : null;
  const okEntry = (s) => body === subEntry("knowledge", s, "probe-s21", "ses_fx_sub", "probe knowledge line");
  const okRet = (s) => ret === subBlock("knowledge", subEntry("knowledge", s, "probe-s21", "ses_fx_sub", "probe knowledge line"));
  check(
    String(++n22),
    "S22",
    "knowledge append: target created carrying ONLY the entry (## stamp) + return byte-exact + the other two targets absent",
    (okEntry(t1) || okEntry(t2)) && (okRet(t1) || okRet(t2)) &&
      !existsSync(path.join(SUB_KN, SUB_REL.feedback)) && !existsSync(path.join(SUB_KN, SUB_REL.todo)),
    JSON.stringify({ ret, body }),
  );
}

// 237 — the todo append (3 of 3): the same contract for the PROJECT-ROOT
//      todo_inbox.md with the `## ` header (the repo-root location is the
//      ratified deviation from the proposal's ".opencode/ subtree" wording)
{
  const t1 = subStampNow();
  const ret = await subTool.execute(
    { todo: "probe todo line" },
    { directory: SUB_TODO, agent: "probe-s21", sessionID: "ses_fx_sub" },
  );
  const t2 = subStampNow();
  const f = path.join(SUB_TODO, SUB_REL.todo);
  const body = existsSync(f) ? readFileSync(f, "utf8") : null;
  const okEntry = (s) => body === subEntry("todo", s, "probe-s21", "ses_fx_sub", "probe todo line");
  const okRet = (s) => ret === subBlock("todo", subEntry("todo", s, "probe-s21", "ses_fx_sub", "probe todo line"));
  check(
    String(++n22),
    "S22",
    "todo append: project-root target created carrying ONLY the entry (## stamp) + return byte-exact + the other two targets absent",
    (okEntry(t1) || okEntry(t2)) && (okRet(t1) || okRet(t2)) &&
      !existsSync(path.join(SUB_TODO, SUB_REL.feedback)) && !existsSync(path.join(SUB_TODO, SUB_REL.knowledge)),
    JSON.stringify({ ret, body }),
  );
}

// 238 — the never-read preservation: ALL THREE targets pre-seeded with
//      sentinel lines; ONE feedback append → the feedback file = the
//      sentinel bytes + the entry (the sentinel BYTE-EXACT before the
//      appended entry) and the knowledge/todo files byte-identical to the
//      pre-seed (untouched) — the tool appends, never reads/rewrites
{
  const seed = (dir, k, line) => {
    const f = path.join(dir, SUB_REL[k]);
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(f, line + "\n", "utf8");
  };
  seed(SUB_KEEP, "feedback", "SENTINEL fb — the pre-seeded line must survive byte-exact.");
  seed(SUB_KEEP, "knowledge", "SENTINEL kn — must stay byte-identical.");
  seed(SUB_KEEP, "todo", "SENTINEL todo — must stay byte-identical.");
  const t1 = subStampNow();
  await subTool.execute(
    { feedback: "probe keep line" },
    { directory: SUB_KEEP, agent: "probe-s21", sessionID: "ses_fx_sub" },
  );
  const t2 = subStampNow();
  const fb = readFileSync(path.join(SUB_KEEP, SUB_REL.feedback), "utf8");
  const okFb = (s) => fb === "SENTINEL fb — the pre-seeded line must survive byte-exact.\n" + subEntry("feedback", s, "probe-s21", "ses_fx_sub", "probe keep line");
  check(
    String(++n22),
    "S22",
    "never-read preservation: pre-seeded sentinel BYTE-EXACT before the appended entry (append-only) + the unprovided targets byte-identical (untouched)",
    (okFb(t1) || okFb(t2)) &&
      readFileSync(path.join(SUB_KEEP, SUB_REL.knowledge), "utf8") === "SENTINEL kn — must stay byte-identical.\n" &&
      readFileSync(path.join(SUB_KEEP, SUB_REL.todo), "utf8") === "SENTINEL todo — must stay byte-identical.\n",
    JSON.stringify({ fb }),
  );
}

// ------------------------------------------------------------------ S30 block_transfer v2 S3: WRITE + PEEK + unified Part F feedback (11)
//
// The custom tool at .opencode/tools/block_transfer.ts (post-S3: the
// bufferless WRITE mode — single span or a 'regions' LIST, applied highest
// line first, the overlap teaching error, the absent-file creation detail —
// the bounded PEEK mode — count + 3 head + 3 tail with blank-skip, or a
// from/count window capped at 25 — and the unified Part F feedback for ALL
// modes). The S15 pins 110/111/115/116/117/262/263 are re-pinned IN PLACE to
// the new shapes (the v2 non-unique error — match count + the first match
// line numbers — and the end-before-start error carrying the file
// reference); this section carries the NEW surface + a few feedback pins
// (the smokes carry the breadth). ONE loaded btTool instance (the buffer
// state is session-persistent — fresh buffer names here). All fs writes are
// steered into the sandbox (context.directory=SANDBOX — the bt/ subdir).
// Plain tool() object: no plugin hooks, no sandbox plugin.log lines — the sandbox
// stays clean.
{
  // 305 — WRITE single span: the region of an EXISTING dst is replaced in
  //      place by the direct text — byte-exact Part F feedback + byte-exact
  //      dst
  const w1 = btWrite("bt-w1.txt", "head\nOLD-A one\nOLD-B two\nfoot");
  const rW1 = await btTool.execute(
    { mode: "WRITE", dstFile: "bt/bt-w1.txt", startMarker: "OLD-A", endMarker: "OLD-B", text: "NEW-A one\nNEW-B two" },
    BT_CTX,
  );
  check(
    "305",
    "S30",
    "WRITE single span: byte-exact Part F feedback `Wrote 2 lines to 'bt/bt-w1.txt' (lines 2..3, first: 'NEW-A one').` + the span replaced IN PLACE (byte-exact dst)",
    rW1 === "Wrote 2 lines to 'bt/bt-w1.txt' (old 2..3 -> new 2..3, file now 4 lines, first: 'NEW-A one')." && readFileSync(w1, "utf8") === "head\nNEW-A one\nNEW-B two\nfoot",
    JSON.stringify({ rW1, body: readFileSync(w1, "utf8") }),
  );

  // 306 — WRITE on an ABSENT file (flagged detail #2, approved): NO
  //      missing-file guard — the refs resolve against the EMPTY state
  //      (byte-exact teaching not-found / out-of-range errors) + the file
  //      is never created (no partial state on rejection)
  {
    const r1 = await btTool.execute(
      { mode: "WRITE", dstFile: "bt/bt-w-new.txt", startMarker: "NOPE", endMarker: "NOPE2", text: "x" },
      BT_CTX,
    );
    const r2 = await btTool.execute(
      { mode: "WRITE", dstFile: "bt/bt-w-new.txt", startMarker: 1, endMarker: 1, text: "x" },
      BT_CTX,
    );
    const exists = existsSync(path.join(BT_DIR, "bt-w-new.txt"));
    check(
      "306",
      "S30",
      "WRITE on an absent file (flagged detail #2): no missing-file guard — the marker refs resolve against the EMPTY state (teaching not-found) + the number refs are out of range (the file has 0 lines) + the file never created",
      r1 === "Error: Start marker 'NOPE' not found in bt/bt-w-new.txt." &&
        r2 === "Error: line 1 is out of range in bt/bt-w-new.txt (the file has 0 lines)." &&
        !exists,
      JSON.stringify({ r1, r2, exists }),
    );
  }

  // 307 — WRITE 'regions' LIST CONTRACT (re-pinned 2026-10-22 per todo_inbox
  //      2026-10-22_03-26 — the recommended end state: REJECT). MORE THAN
  //      ONE region with the single 'text' arg is REJECTED (byte-exact
  //      teaching error + the dst byte-identical — NO fan-out of one text
  //      into every region, no partial state, no 'last_write' store); the
  //      PAIRED form (exactly ONE region + one text) still writes with the
  //      hardening-item-7 feedback line (a 1-region list adds NO summary
  //      line). The overlap teaching (308) stays reachable — the reject
  //      guard runs AFTER it.
  {
    const w2 = btWrite("bt-w2.txt", "h1\nA-A one\nA-B two\nmid\nB-A one\nB-B two\nh7");
    const before = readFileSync(w2, "utf8");
    const res = await btTool.execute(
      { mode: "WRITE", dstFile: "bt/bt-w2.txt", text: "REPL", regions: [{ start: "A-A", end: "A-B" }, { start: "B-A", end: "B-B" }] },
      BT_CTX,
    );
    const bodyAfterReject = readFileSync(w2, "utf8");
    const resPaired = await btTool.execute(
      { mode: "WRITE", dstFile: "bt/bt-w2.txt", text: "REPL", regions: [{ start: "A-A", end: "A-B" }] },
      BT_CTX,
    );
    check(
      "307",
      "S30",
      "WRITE 'regions' LIST contract: 2 regions + ONE 'text' is REJECTED (byte-exact teaching error, the dst byte-identical) + the paired 1-region form writes (byte-exact feedback + dst)",
      res === "Error: the 'regions' list has 2 regions but WRITE takes ONE 'text' (it would fan the same text into every region) — use exactly one region in the list, or one WRITE call per region." &&
        bodyAfterReject === before &&
        resPaired === "Wrote 1 line to 'bt/bt-w2.txt' (old 2..3 -> new 2..2, file now 6 lines, first: 'REPL')." &&
        readFileSync(w2, "utf8") === "h1\nREPL\nmid\nB-A one\nB-B two\nh7",
      JSON.stringify({ res, bodyAfterReject, resPaired, body: readFileSync(w2, "utf8") }),
    );
  }

  // 308 — WRITE 'regions' with OVERLAPPING spans: the teaching error with
  //      the ACTUAL line numbers (the lower span named first) + the dst
  //      byte-identical (no write)
  {
    const w3 = btWrite("bt-w3.txt", "l1\nl2\nl3\nl4\nl5");
    const before = readFileSync(w3, "utf8");
    const res = await btTool.execute(
      { mode: "WRITE", dstFile: "bt/bt-w3.txt", text: "X", regions: [{ start: 2, end: 4 }, { start: 3, end: 5 }] },
      BT_CTX,
    );
    check(
      "308",
      "S30",
      "WRITE 'regions' with overlapping spans: byte-exact teaching error `Error: overlapping spans (lines 2..4 and 3..5) in bt/bt-w3.txt.` (the ACTUAL line numbers) + the dst byte-identical (no write)",
      res === "Error: overlapping spans (lines 2..4 and 3..5) in bt/bt-w3.txt." && readFileSync(w3, "utf8") === before,
      JSON.stringify({ res, changed: readFileSync(w3, "utf8") !== before }),
    );
  }

  // 309 — WRITE input guards: the byte-exact missing-dstFile /
  //      missing-text / 'regions'+markers-mutually-exclusive /
  //      single-span-needs-both-markers errors
  {
    const r1 = await btTool.execute({ mode: "WRITE", startMarker: "a", endMarker: "b", text: "x" }, BT_CTX);
    const r2 = await btTool.execute({ mode: "WRITE", dstFile: "bt/bt-w3.txt", startMarker: "l1", endMarker: "l2" }, BT_CTX);
    const r3 = await btTool.execute({ mode: "WRITE", dstFile: "bt/bt-w3.txt", text: "x", startMarker: "l1", endMarker: "l2", regions: [{ start: 1, end: 1 }] }, BT_CTX);
    const r4 = await btTool.execute({ mode: "WRITE", dstFile: "bt/bt-w3.txt", text: "x", startMarker: "l1" }, BT_CTX);
    check(
      "309",
      "S30",
      "WRITE input guards: byte-exact missing-dstFile / missing-text / 'regions'+markers mutually exclusive / single-span needs both markers errors",
      r1 === "Error: 'dstFile' is required for WRITE mode." &&
        r2 === "Error: 'text' is required for WRITE mode." &&
        r3 === "Error: the 'regions' list takes the span alone (no single markers)." &&
        r4 === "Error: 'startMarker' and 'endMarker' are both required for WRITE mode.",
      JSON.stringify({ r1, r2, r3, r4 }),
    );
  }

  // 310 — PEEK default: the line count + 3 head + 3 tail lines (byte-exact
  //      shape) — the BLANK line is SKIPPED when picking the echoed lines
  {
    await btTool.execute({ mode: "COPY", text: "AAA first\n\nbbb third\nccc fourth\nddd fifth\neee sixth\nfff seventh\nGGG last", bufferName: "bt-pk" }, BT_CTX);
    const res = await btTool.execute({ mode: "PEEK", bufferName: "bt-pk" }, BT_CTX);
    check(
      "310",
      "S30",
      "PEEK default: byte-exact `Peeked buffer 'bt-pk': 8 lines — head: 'AAA first', 'bbb third', 'ccc fourth' ... tail: 'eee sixth', 'fff seventh', 'GGG last'` (the count + 3 head + 3 tail; blank line 2 skipped when picking)",
      res === "Peeked buffer 'bt-pk': 8 lines — head: 'AAA first', 'bbb third', 'ccc fourth' ... tail: 'eee sixth', 'fff seventh', 'GGG last'",
      JSON.stringify({ res }),
    );
  }

  // 311 — PEEK window: the from/count bounded window (byte-exact) + the
  //      25-line CAP (a 40-line request on a 30-line buffer echoes exactly
  //      lines 1..25)
  {
    const big = Array.from({ length: 30 }, (_, i) => "L" + (i + 1)).join("\n");
    await btTool.execute({ mode: "COPY", text: big, bufferName: "bt-pk3" }, BT_CTX);
    const r1 = await btTool.execute({ mode: "PEEK", bufferName: "bt-pk3", from: 5, count: 3 }, BT_CTX);
    const r2 = await btTool.execute({ mode: "PEEK", bufferName: "bt-pk3", from: 1, count: 40 }, BT_CTX);
    check(
      "311",
      "S30",
      "PEEK window: byte-exact from/count window (3 lines) + the 25-line CAP (a 40-line request on a 30-line buffer echoes exactly lines 1..25)",
      r1 === "Peeked buffer 'bt-pk3': lines 5..7 of 30 — 'L5', 'L6', 'L7'" &&
        r2 === "Peeked buffer 'bt-pk3': lines 1..25 of 30 — " + Array.from({ length: 25 }, (_, i) => `'L${i + 1}'`).join(", "),
      JSON.stringify({ r1, r2len: r2.length, r2head: r2.slice(0, 60) }),
    );
  }

  // 312 — PEEK guards: 'from'+'count' must be given TOGETHER (either side
  //      alone → the exact error) + the empty-buffer error for an absent
  //      buffer + 'from' beyond the buffer → the ref-out-of-range error
  //      (with the count)
  {
    const r1 = await btTool.execute({ mode: "PEEK", bufferName: "bt-pk", from: 2 }, BT_CTX);
    const r2 = await btTool.execute({ mode: "PEEK", bufferName: "bt-pk", count: 2 }, BT_CTX);
    const r3 = await btTool.execute({ mode: "PEEK", bufferName: "bt-pk-none" }, BT_CTX);
    const r4 = await btTool.execute({ mode: "PEEK", bufferName: "bt-pk", from: 99, count: 1 }, BT_CTX);
    check(
      "312",
      "S30",
      "PEEK guards: byte-exact together-errors ('from' or 'count' alone) + the empty-buffer error (absent buffer) + 'from' beyond the buffer → the ref-out-of-range error (with the count)",
      r1 === "Error: 'from' and 'count' must be given together." &&
        r2 === "Error: 'from' and 'count' must be given together." &&
        r3 === "Error: Clipboard buffer 'bt-pk-none' is empty. Perform a COPY or CUT first." &&
        r4 === "Error: line 99 is out of range in buffer 'bt-pk' (the buffer has 8 lines).",
      JSON.stringify({ r1, r2, r3, r4 }),
    );
  }

  // 313 — the unified Part F feedback (buffer ops): byte-exact CUT line
  //      (resolved range + echo + the buffer count AFTER) + byte-exact
  //      PASTE line (the buffer's own range + echo + the buffer count
  //      AFTER) + the source cut byte-exact
  {
    const src = btWrite("bt-fb-cut.txt", "AAA start\nline-1\nline-2\nZZZ end\ntail");
    const r1 = await btTool.execute({ mode: "CUT", srcFile: "bt/bt-fb-cut.txt", startMarker: "line-1", endMarker: "line-2", bufferName: "bt-fb" }, BT_CTX);
    btWrite("bt-fb-paste.txt", "head");
    const r2 = await btTool.execute({ mode: "PASTE", dstFile: "bt/bt-fb-paste.txt", bufferName: "bt-fb", targetMarker: "head" }, BT_CTX);
    check(
      "313",
      "S30",
      "unified Part F feedback (buffer ops): byte-exact CUT line + byte-exact PASTE line (resolved range + first-line echo + the buffer count AFTER) + the source cut byte-exact",
      r1 === "Cut 2 lines from 'bt/bt-fb-cut.txt' into buffer 'bt-fb' (lines 2..3, first: 'line-1') - buffer: 2 lines." &&
        r2 === "Pasted 2 lines from buffer 'bt-fb' into 'bt/bt-fb-paste.txt' (lines 1..2, first: 'line-1') (inserted after line 1 in 'bt/bt-fb-paste.txt') - buffer: 2 lines." &&
        readFileSync(src, "utf8") === "AAA start\nZZZ end\ntail",
      JSON.stringify({ r1, r2, srcBody: readFileSync(src, "utf8") }),
    );
  }

  // 314 — the unified Part F feedback (non-buffer + CLEAR): byte-exact
  //      DELETE line (resolved range + echo) + byte-exact CLEAR line
  //      (the buffer count AFTER the op = 0)
  {
    const src = btWrite("bt-fb-del.txt", "AAA start\nline-1\nline-2\nZZZ end\ntail");
    const r1 = await btTool.execute({ mode: "DELETE", srcFile: "bt/bt-fb-del.txt", startMarker: "line-1", endMarker: "line-2" }, BT_CTX);
    const r2 = await btTool.execute({ mode: "CLEAR", bufferName: "bt-fb" }, BT_CTX);
    check(
      "314",
      "S30",
      "unified Part F feedback (non-buffer + CLEAR): byte-exact DELETE line + byte-exact CLEAR line (the buffer count AFTER the op = 0)",
      r1 === "Deleted 2 lines from 'bt/bt-fb-del.txt' (lines 2..3, first: 'line-1')." &&
        r2 === "Cleared buffer 'bt-fb' - buffer: 0 lines.",
      JSON.stringify({ r1, r2 }),
    );
  }

  // 315 — the v2 teaching error switch (the S1-deferred format): byte-exact
  //      non-unique error (match count + the first match line numbers) +
  //      byte-exact end-before-start error CARRYING THE FILE REFERENCE
  {
    btWrite("bt-err2.txt", "p1\nDUP-A one\np3\nDUP-B two\np5");
    const r1 = await btTool.execute({ mode: "COPY", srcFile: "bt/bt-err2.txt", startMarker: "DUP", endMarker: "p3", bufferName: "bt-err2" }, BT_CTX);
    btWrite("bt-err3.txt", "p1\nZZZ-A end\np3\nYYY-B start\np5");
    const r2 = await btTool.execute({ mode: "COPY", srcFile: "bt/bt-err3.txt", startMarker: "YYY", endMarker: "ZZZ", bufferName: "bt-err3" }, BT_CTX);
    check(
      "315",
      "S30",
      "the v2 teaching error switch (the S1-deferred format): byte-exact non-unique error `Error: Start marker 'DUP' is not unique in bt/bt-err2.txt (2 matches: lines 2, 4).` + byte-exact end-before-start error `Error: End marker 'ZZZ' not found after start marker in bt/bt-err3.txt.` (carrying the file reference)",
      r1 === "Error: Start marker 'DUP' is not unique in bt/bt-err2.txt (2 matches: lines 2, 4)." &&
        r2 === "Error: End marker 'ZZZ' not found after start marker in bt/bt-err3.txt.",
      JSON.stringify({ r1, r2 }),
    );
  }
}

// ------------------------------------------------------------------ S33 context_trim tool (6) — 2026-09-30 (plan39: the approved context-trim build, Unit 1): report + trim the session's live model context
//
// The custom tool at .opencode/tools/context_trim.ts: imported DIRECT from
// the repo path (type-stripped, the S12/S15 load pattern — the tool file
// MUST load that way). The section drives the CORE exports (reportWindow /
// tailSet) against its OWN fixture DB built in the sandbox (DatabaseSync —
// the opencode-like session/message/part shapes from the bounded
// read-only live-DB inspection; the smoke's fixture layout is the
// reference): ses_ct_fix (18 messages — 12 before the marker, the tool
// parts INSIDE the retained tail: msg_08 read, msg_10 read+bash, msg_12
// webfetch; the marker quartet: msg_13 the compaction user row (part
// tail_start_id=msg_07 → retained tail msg_07..msg_12 = exactly the floor
// 6), msg_14 the summary child; 4 messages after the summary) +
// ses_ct_nomark (3 messages, no marker). The fixture DB is NEVER the
// live one. Plain tool() object: no hooks, no sandbox plugin.log lines —
// the sandbox stays clean.
const CT_TOOL_TS = path.join(REPO_ROOT, ".opencode", "tools", "deactivated", "context_trim.ts");
const CT_DIR = path.join(SANDBOX, "context_trim");
mkdirSync(CT_DIR, { recursive: true });
const CT_DB = path.join(CT_DIR, "fixture.db");
let ctTool;
{
  const db = new DatabaseSync(CT_DB);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE project (id TEXT PRIMARY KEY);
    CREATE TABLE session (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL
    );
    CREATE TABLE message (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE part (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL REFERENCES message(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL,
      data TEXT NOT NULL
    );
  `);
  db.prepare("INSERT INTO project (id) VALUES (?)").run("prj_ct");
  const insS = db.prepare("INSERT INTO session (id, project_id, time_created, time_updated) VALUES (?, ?, ?, ?)");
  const insM = db.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?)");
  const insP = db.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?, ?)");
  const putUser = (sid, id, time, text) => {
    insM.run(id, sid, time, time, JSON.stringify({ role: "user", time: { created: time } }));
    insP.run(`p_${id}t`, id, sid, time, time, JSON.stringify({ type: "text", text }));
  };
  const putAsst = (sid, id, time, i, o, cr, parts) => {
    insM.run(id, sid, time, time, JSON.stringify({ role: "assistant", parentID: `p_${id}u`, finish: "stop", tokens: { total: 0, input: i, output: o, reasoning: 0, cache: { write: 0, read: cr } } }));
    parts.forEach((p, k) => insP.run(`p_${id}${String.fromCharCode(97 + k)}`, id, sid, time, time, JSON.stringify(p)));
  };
  const READ = (fp, offset, limit) => ({ type: "tool", tool: "read", callID: "call_" + fp, state: { status: "completed", input: { filePath: fp, offset, limit }, output: "ok" } });
  const BASH = (command) => ({ type: "tool", tool: "bash", callID: "call_bash", state: { status: "completed", input: { command }, output: "" } });
  const WEB = (url) => ({ type: "tool", tool: "webfetch", callID: "call_web", state: { status: "completed", input: { url, format: "text" }, output: "doc" } });
  insS.run("ses_ct_fix", "prj_ct", 0, 0);
  putUser("ses_ct_fix", "msg_01", 1000, "one");
  putAsst("ses_ct_fix", "msg_02", 2000, 100, 50, 2000, [{ type: "text", text: "ok" }]);
  putUser("ses_ct_fix", "msg_03", 3000, "three");
  putAsst("ses_ct_fix", "msg_04", 4000, 200, 100, 4000, [{ type: "text", text: "ok" }]);
  putUser("ses_ct_fix", "msg_05", 5000, "five");
  putAsst("ses_ct_fix", "msg_06", 6000, 300, 150, 6000, [{ type: "text", text: "doc" }]);
  putUser("ses_ct_fix", "msg_07", 7000, "seven");
  putAsst("ses_ct_fix", "msg_08", 8000, 400, 200, 8000, [READ("/proj/alpha.md", 1, 40)]);
  putUser("ses_ct_fix", "msg_09", 9000, "nine");
  putAsst("ses_ct_fix", "msg_10", 10000, 500, 250, 10000, [READ("/proj/beta.md", 41, 80), BASH("ls -la")]);
  putUser("ses_ct_fix", "msg_11", 11000, "eleven");
  putAsst("ses_ct_fix", "msg_12", 12000, 600, 300, 12000, [WEB("https://example.com/doc")]);
  insM.run("msg_13", "ses_ct_fix", 13000, 13000, JSON.stringify({ role: "user", time: { created: 13000 } }));
  insP.run("p_13c", "msg_13", "ses_ct_fix", 13000, 13000, JSON.stringify({ type: "compaction", auto: false, tail_start_id: "msg_07" }));
  insM.run("msg_14", "ses_ct_fix", 14000, 14000, JSON.stringify({ role: "assistant", parentID: "msg_13", mode: "compaction", agent: "compaction", summary: true, finish: "stop" }));
  putUser("ses_ct_fix", "msg_15", 15000, "post one");
  putAsst("ses_ct_fix", "msg_16", 16000, 700, 350, 14000, [{ type: "text", text: "done" }]);
  putUser("ses_ct_fix", "msg_17", 17000, "post three");
  putAsst("ses_ct_fix", "msg_18", 18000, 800, 400, 16000, [{ type: "text", text: "done" }]);
  insS.run("ses_ct_nomark", "prj_ct", 0, 0);
  putUser("ses_ct_nomark", "msg_n1", 100, "a");
  putAsst("ses_ct_nomark", "msg_n2", 200, 10, 5, 100, [{ type: "text", text: "b" }]);
  putUser("ses_ct_nomark", "msg_n3", 300, "c");
  db.close();
}
let n33 = 346;

// 346 — the tool surface: the tool file imports (type-stripped, direct)
//      and exposes the tool() default export: description (non-empty
//      string) + the 4 args IN ORDER (mode = REQUIRED string; session =
//      REQUIRED string; target = OPTIONAL string; keepMessages = OPTIONAL
//      number — the U0 keep-COUNT form, mutually exclusive with target)
//      + async execute + NO `name` field (the host names the tool by
//      FILENAME) + the CORE exports reportWindow/tailSet are functions
//      (the smoke's surface)
{
  const toolMod = await import(pathToFileURL(CT_TOOL_TS).href);
  ctTool = toolMod.default;
  const argKeys = Object.keys(ctTool?.args ?? {});
  const modeSch = ctTool?.args?.mode;
  const sessSch = ctTool?.args?.session;
  const targSch = ctTool?.args?.target;
  const keepSch = ctTool?.args?.keepMessages;
  check(
    String(n33),
    "S33",
    "tool file imports (type-stripped, direct) and exposes the tool() default export (description + args [mode, session, target, keepMessages] + async execute, NO name field) + the core exports reportWindow/tailSet are functions",
    ctTool != null && typeof ctTool.description === "string" && ctTool.description.length > 0 &&
      JSON.stringify(argKeys) === JSON.stringify(["mode", "session", "target", "keepMessages"]) &&
      modeSch != null && typeof modeSch.safeParse === "function" &&
      modeSch.safeParse(undefined).success === false && modeSch.safeParse("report").success === true && modeSch.safeParse("tail").success === true &&
      sessSch != null && typeof sessSch.safeParse === "function" &&
      sessSch.safeParse(undefined).success === false && sessSch.safeParse("ses_x").success === true &&
      targSch != null && typeof targSch.safeParse === "function" &&
      targSch.safeParse(undefined).success === true && targSch.safeParse("msg_x").success === true && targSch.safeParse(42).success === false &&
      keepSch != null && typeof keepSch.safeParse === "function" &&
      keepSch.safeParse(undefined).success === true && keepSch.safeParse(8).success === true && keepSch.safeParse("8").success === false &&
      typeof ctTool.execute === "function" && ctTool.execute.constructor.name === "AsyncFunction" &&
      !("name" in ctTool) &&
      typeof toolMod.reportWindow === "function" && typeof toolMod.tailSet === "function",
    JSON.stringify({ keys: argKeys, nameIn: "name" in (ctTool ?? {}), exports: Object.keys(toolMod) }),
  );
  n33++;
}

// 347 — report (no target) BYTE-EXACT: the header fields (marker/summary/
//      tail_start/retained/post-summary) + the 10 window rows (the
//      retained-tail slice msg_07..msg_12 + the post-summary slice
//      msg_15..msg_18, chronological) with the read/bash/webfetch targets
//      (the tool parts sit INSIDE the retained tail) + the tokens/bytes4
//      mass (tokens = info.input+output+cache.read when present, else
//      bytes/4 of the part text)
{
  const { reportWindow } = await import(pathToFileURL(CT_TOOL_TS).href);
  const report = await reportWindow(CT_DB, "ses_ct_fix");
  const EXPECT =
    "session ses_ct_fix\n" +
    "header: marker=msg_13 summary=msg_14 tail_start=msg_07 retained=6 post-summary=4\n" +
    "row: msg_07 7000 user bytes4=1\n" +
    "row: msg_08 8000 assistant tokens=8600 tool=read target=/proj/alpha.md offset=1 limit=40\n" +
    "row: msg_09 9000 user bytes4=1\n" +
    "row: msg_10 10000 assistant tokens=10750 tool=read target=/proj/beta.md offset=41 limit=80 tool=bash target=ls -la\n" +
    "row: msg_11 11000 user bytes4=1\n" +
    "row: msg_12 12000 assistant tokens=12900 tool=webfetch target=https://example.com/doc\n" +
    "row: msg_15 15000 user bytes4=2\n" +
    "row: msg_16 16000 assistant tokens=15050\n" +
    "row: msg_17 17000 user bytes4=2\n" +
    "row: msg_18 18000 assistant tokens=17200";
  check(String(n33), "S33", "report (no target) byte-exact: the header fields + the 10 window rows with the read/bash/webfetch targets + the tokens/bytes4 mass", report === EXPECT, JSON.stringify(report));
  n33++;
}

// 348 — dry-run BYTE-EXACT (the report + one line, no write): the exact
//      remove/keep counts + token mass for a tail rewrite to msg_06
//      (extend the retained tail to 7 — remove=0, keep=7, mass
//      38703=6450+1+8600+1+10750+1+12900) + verdict=ok
{
  const { reportWindow } = await import(pathToFileURL(CT_TOOL_TS).href);
  const dry = await reportWindow(CT_DB, "ses_ct_fix", "msg_06");
  check(
    String(n33),
    "S33",
    "dry-run (target msg_06) byte-exact: the exact remove/keep line (counts + token mass) + verdict=ok — no write",
    dry.split("\n")[1] === "header: marker=msg_13 summary=msg_14 tail_start=msg_07 retained=6 post-summary=4" &&
      dry.endsWith("dry-run: target=msg_06 remove=0 (0 tokens) keep=7 (38703 tokens) verdict=ok"),
    JSON.stringify(dry.split("\n").slice(-1)),
  );
  n33++;
}

// 349 — the tail rewrite LANDS (the fixture is mutated from here on): the
//      return line byte-exact (`tail= msg_07 -> msg_06 keep=7`) + the part
//      row carries the new tail_start_id (the single-field JSON edit,
//      byte-exact) + the re-report shows retained=7
{
  const { tailSet, reportWindow } = await import(pathToFileURL(CT_TOOL_TS).href);
  const t = await tailSet(CT_DB, "ses_ct_fix", "msg_06");
  let partJson = null;
  {
    const RO = new DatabaseSync(CT_DB, { readOnly: true });
    partJson = RO.prepare("SELECT data FROM part WHERE id = 'p_13c'").get().data;
    RO.close();
  }
  const report2 = await reportWindow(CT_DB, "ses_ct_fix");
  check(
    String(n33),
    "S33",
    "tail rewrite lands: the return line byte-exact + the part row carries the new tail_start_id (single-field JSON edit, byte-exact) + the re-report shows retained=7",
    t === "tail= msg_07 -> msg_06 keep=7" &&
      partJson === '{"type":"compaction","auto":false,"tail_start_id":"msg_06"}' &&
      report2.split("\n")[1] === "header: marker=msg_13 summary=msg_14 tail_start=msg_06 retained=7 post-summary=4",
    JSON.stringify({ t, partJson, h2: report2.split("\n")[1] }),
  );
  n33++;
}

// 350 — the REJECTIONS (fail-closed, each with its exact reason; no write
//      anywhere): no compaction marker (ses_ct_nomark) / unknown target id
//      / target AT the compaction row (msg_13) / target AFTER the
//      compaction row (msg_15, post-summary) / floor violation (msg_08 →
//      retained tail 5 < 6)
{
  const { tailSet } = await import(pathToFileURL(CT_TOOL_TS).href);
  const r1 = await tailSet(CT_DB, "ses_ct_nomark", "msg_n1");
  const r2 = await tailSet(CT_DB, "ses_ct_fix", "msg_dne");
  const r3 = await tailSet(CT_DB, "ses_ct_fix", "msg_13");
  const r4 = await tailSet(CT_DB, "ses_ct_fix", "msg_15");
  const r5 = await tailSet(CT_DB, "ses_ct_fix", "msg_08");
  check(
    String(n33),
    "S33",
    "rejections (fail-closed, exact reasons): no-completed-compaction / target-not-found / target-not-before-compaction (AT + AFTER the marker) / retained-tail-below-floor 5",
    r1 === "tail= rejected: no-completed-compaction" &&
      r2 === "tail= rejected: target-not-found" &&
      r3 === "tail= rejected: target-not-before-compaction" &&
      r4 === "tail= rejected: target-not-before-compaction" &&
      r5 === "tail= rejected: retained-tail-below-floor 5",
    JSON.stringify({ r1, r2, r3, r4, r5 }),
  );
  n33++;
}

// 351 — the no-marker session report BYTE-EXACT: the header line
//      (marker=none … window=full-history) + the 3 full-history rows
//      (no compaction marker → the full history IS the model window)
{
  const { reportWindow } = await import(pathToFileURL(CT_TOOL_TS).href);
  const r = await reportWindow(CT_DB, "ses_ct_nomark");
  check(
    String(n33),
    "S33",
    "no-marker report byte-exact: the header line (marker=none … window=full-history) + the 3 full-history rows",
    r ===
      "session ses_ct_nomark\n" +
      "header: marker=none summary=none tail_start=none retained=0 post-summary=0 window=full-history\n" +
      "row: msg_n1 100 user bytes4=0\n" +
      "row: msg_n2 200 assistant tokens=115\n" +
      "row: msg_n3 300 user bytes4=0",
    JSON.stringify(r),
  );
  n33++;
}

// ------------------------------------------------------------------ S34 post-compaction tail-set (2) — 2026-10-01 (TODO #120 Unit 2: the plugin-side zero-fork tail-set): the context_trim core's tailSetKeep
//
// The auto-resume plugin's post-compaction tail-set leg calls
// tailSetKeep: keep=N → the N-th message STRICTLY before the
// compaction user row (targetIndex = compactionIndex - keep), then the
// EXACT existing tailSet path (the same 5 fail-closed validations +
// the json_set single-transaction write — reused via delegation; the
// `tail= ` return prefix is remapped to `tail-set= `). A fresh
// ses_ct_k2 session in the SAME fixture DB (10 messages before the
// marker, the marker quartet tail_start_id=msg_k25, the summary
// child, 2 after) so S33's pins and their mutations are untouched.
// The db is the probe's sandbox fixture — NEVER the live one.
{
  const db = new DatabaseSync(CT_DB);
  db.exec("PRAGMA foreign_keys = ON;");
  db.prepare("INSERT INTO session (id, project_id, time_created, time_updated) VALUES ('ses_ct_k2', 'prj_ct', 0, 0)").run();
  const putK2 = (id, time, text) => {
    db.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, 'ses_ct_k2', ?, ?, ?)").run(id, time, time, JSON.stringify({ role: "user", time: { created: time } }));
    db.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, 'ses_ct_k2', ?, ?, ?)").run(`p_${id}t`, id, time, time, JSON.stringify({ type: "text", text }));
  };
  const putK2a = (id, time) => {
    db.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, 'ses_ct_k2', ?, ?, ?)").run(id, time, time, JSON.stringify({ role: "assistant", parentID: `p_${id}u`, finish: "stop" }));
    db.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, 'ses_ct_k2', ?, ?, ?)").run(`p_${id}a`, id, time, time, JSON.stringify({ type: "text", text: "ok" }));
  };
  // 10 messages before the marker (msg_k21..msg_k30).
  putK2("msg_k21", 100, "k one"); putK2a("msg_k22", 200);
  putK2("msg_k23", 300, "k three"); putK2a("msg_k24", 400);
  putK2("msg_k25", 500, "k five"); putK2a("msg_k26", 600);
  putK2("msg_k27", 700, "k seven"); putK2a("msg_k28", 800);
  putK2("msg_k29", 900, "k nine"); putK2a("msg_k30", 1000);
  // The marker quartet (tail_start_id = msg_k25) + the summary child +
  // 2 messages after the summary.
  db.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES ('msg_k31', 'ses_ct_k2', 13000, 13000, ?)").run(JSON.stringify({ role: "user", time: { created: 13000 } }));
  db.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES ('p_k31c', 'msg_k31', 'ses_ct_k2', 13000, 13000, ?)").run(JSON.stringify({ type: "compaction", auto: false, tail_start_id: "msg_k25" }));
  db.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES ('msg_k32', 'ses_ct_k2', 14000, 14000, ?)").run(JSON.stringify({ role: "assistant", parentID: "msg_k31", summary: true, finish: "stop" }));
  putK2("msg_k33", 15000, "k post one");
  putK2a("msg_k34", 16000);
  db.close();
}
let n34 = 352;

// 352 — tailSetKeep VALID + LANDED: keep=8 → the 8th message STRICTLY
//      before the compaction user row (compactionIndex 10 - 8 = index
//      2 → msg_k23), the return line byte-exact + the part row
//      carries the new tail_start_id (the EXACT tailSet write path,
//      reused)
{
  const { tailSetKeep } = await import(pathToFileURL(CT_TOOL_TS).href);
  const k = await tailSetKeep(CT_DB, "ses_ct_k2", 8);
  let partJson = null;
  {
    const RO = new DatabaseSync(CT_DB, { readOnly: true });
    partJson = RO.prepare("SELECT data FROM part WHERE id = 'p_k31c'").get().data;
    RO.close();
  }
  check(
    String(n34),
    "S34",
    "tailSetKeep valid + landed: keep=8 → the 8th message strictly before the compaction row (msg_k23), the return line byte-exact + the part row carries the new tail_start_id (the exact tailSet write path, reused)",
    k === "tail-set= msg_k25 -> msg_k23 keep=8" &&
      partJson === '{"type":"compaction","auto":false,"tail_start_id":"msg_k23"}',
    JSON.stringify({ k, partJson }),
  );
  n34++;
}

// 353 — the REJECTIONS (fail-closed, exact reasons; no write
//      anywhere): keep below the floor (5 → retained 5 < 6, the exact
//      tailSet floor message) / keep above the pre-compaction message
//      count (50 → keep-exceeds-history) / no completed compaction
//      (ses_ct_nomark) / unknown session / keep <= 0 (keep-invalid)
{
  const { tailSetKeep } = await import(pathToFileURL(CT_TOOL_TS).href);
  const r1 = await tailSetKeep(CT_DB, "ses_ct_k2", 5);
  const r2 = await tailSetKeep(CT_DB, "ses_ct_k2", 50);
  const r3 = await tailSetKeep(CT_DB, "ses_ct_nomark", 8);
  const r4 = await tailSetKeep(CT_DB, "ses_ct_dne", 8);
  const r5 = await tailSetKeep(CT_DB, "ses_ct_k2", 0);
  check(
    String(n34),
    "S34",
    "rejections (fail-closed, exact reasons): retained-tail-below-floor 5 / keep-exceeds-history 50 / no-completed-compaction / session-not-found / keep-invalid 0",
    r1 === "tail-set= rejected: retained-tail-below-floor 5" &&
      r2 === "tail-set= rejected: keep-exceeds-history 50" &&
      r3 === "tail-set= rejected: no-completed-compaction" &&
      r4 === "tail-set= rejected: session-not-found" &&
      r5 === "tail-set= rejected: keep-invalid 0",
    JSON.stringify({ r1, r2, r3, r4, r5 }),
  );
  n34++;
}

// ------------------------------------------------------------------ S35 state_snapshot tool (3) — 2026-10-04 (p3-state-snapshot: the planner init digest tool — the approved proposal 2026-09-18_p3-state-snapshot-tool.md): the tool file's existence + the tool() default export shape + the registration-shape pin (the EMPTY args key list — the compact_memory check-86 / context_trim check-346 pattern) + the planner-only steer in the description. The digest BEHAVIOR is smoke-pinned (state_snapshot.smoke.mjs) — the probe pins the SURFACE only (no fixture build here; the tool is READ-ONLY — the sandbox stays clean).
const SS_TOOL_TS = path.join(REPO_ROOT, ".opencode", "tools", "deactivated", "state_snapshot.ts");
let ssTool;
let n35 = 354;

// 354 — the tool file EXISTS + the tool() default export (description a
//      non-empty string + execute a function) — imported DIRECT
//      (type-stripped, the same way the probe loads ctx_gauge.ts, S12)
{
  const exists = existsSync(SS_TOOL_TS);
  if (exists) {
    const toolMod = await import(pathToFileURL(SS_TOOL_TS).href);
    ssTool = toolMod.default;
  }
  check(
    String(n35),
    "S35",
    "state_snapshot.ts exists + the tool() default export (description a non-empty string + execute a function)",
    exists && ssTool != null && typeof ssTool.description === "string" && ssTool.description.length > 0 && typeof ssTool.execute === "function",
    JSON.stringify({ exists, keys: Object.keys(ssTool ?? {}) }),
  );
  n35++;
}

// 355 — the registration-shape pin: the args key list is EMPTY (zero args
//      — the exact args keys, the compact_memory check-86 / context_trim
//      check-346 pattern) + NO `name` field (the host auto-detects
//      .opencode/tools/*.ts — no registration anywhere)
{
  check(
    String(n35),
    "S35",
    "registration shape: the args key list is EMPTY (zero args) + NO name field (host auto-detect)",
    ssTool != null && JSON.stringify(Object.keys(ssTool.args ?? {})) === JSON.stringify([]) && !("name" in ssTool),
    JSON.stringify({ args: Object.keys(ssTool?.args ?? {}), keys: Object.keys(ssTool ?? {}) }),
  );
  n35++;
}

// 356 — the description carries the planner-only steer (the phrase
//      `planner`)
{
  check(
    String(n35),
    "S35",
    "the description carries the planner-only steer (contains the phrase 'planner')",
    typeof ssTool?.description === "string" && ssTool.description.includes("planner"),
    JSON.stringify({ head: String(ssTool?.description).slice(0, 60) }),
  );
  n35++;
}

// ------------------------------------------------------------------ S36 loop iteration suffix (5) — 2026-10-05 (loop iteration counter Part 2 — the approved proposal 2026-10-01_loop-iteration-counter.md) + #171 (2026-10-26, ROUND counter + MAINT token): the gauge core's `loopIterationSuffix()` (the injected chat.message ctx-line suffix) pinned via the test hook (setLoopRootForTest — the setBudgetFileForTest pattern, steered at a sandbox fixture loop root at probe start — the live loop root is never read by the probe).
const S36_LOOP = path.join(SANDBOX, "loop");
let n36 = 357;

// 357 — (i) a loop root without a counter → `""` (the steered root has
//      NO `autorun-*` folder — no loop folder, no counter file)
{
  const s = loopIterationSuffix();
  check(
    String(n36),
    "S36",
    "loop root without a counter → the suffix is the EMPTY string (the ctx line stays byte-identical)",
    s === "",
    JSON.stringify(s),
  );
  n36++;
}

// 358 — (ii) a fixture `autorun-X/counter.json` with n=7 →
//      ` ITER=7 autorun-X` (byte-exact)
{
  const fx = path.join(S36_LOOP, "autorun-X");
  mkdirSync(fx, { recursive: true });
  writeFileSync(path.join(fx, "counter.json"), '{"looprun":"autorun-X","n":7}', "utf-8");
  const s = loopIterationSuffix();
  check(
    String(n36),
    "S36",
    "fixture autorun-X/counter.json n=7 → the suffix is byte-exact ` ITER=7 autorun-X`",
    s === " ITER=7 autorun-X",
    JSON.stringify(s),
  );
  n36++;
}

// 359 — #171 (iii) a fixture counter WITH round=9 (not %5) →
//      ` ITER=7 autorun-X ROUND=9` (byte-exact, no MAINT token)
{
  writeFileSync(path.join(S36_LOOP, "autorun-X", "counter.json"), '{"looprun":"autorun-X","n":7,"round":9}', "utf-8");
  const s = loopIterationSuffix();
  check(
    String(n36),
    "S36",
    "#171 fixture counter round=9 → the suffix is byte-exact ` ITER=7 autorun-X ROUND=9` (no MAINT)",
    s === " ITER=7 autorun-X ROUND=9",
    JSON.stringify(s),
  );
  n36++;
}

// 360 — #171 (iv) round=10 → ` MAINT=1` rides (every 5th round)
{
  writeFileSync(path.join(S36_LOOP, "autorun-X", "counter.json"), '{"looprun":"autorun-X","n":10,"round":10}', "utf-8");
  const s = loopIterationSuffix();
  check(
    String(n36),
    "S36",
    "#171 fixture counter round=10 → the suffix is byte-exact ` ITER=10 autorun-X ROUND=10 MAINT=1`",
    s === " ITER=10 autorun-X ROUND=10 MAINT=1",
    JSON.stringify(s),
  );
  n36++;
}

// 361 — #171 (v) a NON-FINITE round → the OLD byte-exact form (fail-closed:
//      no ROUND token; the `n` leg still renders)
{
  writeFileSync(path.join(S36_LOOP, "autorun-X", "counter.json"), '{"looprun":"autorun-X","n":7,"round":"nine"}', "utf-8");
  const s = loopIterationSuffix();
  check(
    String(n36),
    "S36",
    "#171 non-finite round → the OLD byte-exact ` ITER=7 autorun-X` form (fail-closed, no ROUND token)",
    s === " ITER=7 autorun-X",
    JSON.stringify(s),
  );
  n36++;
}

// ------------------------------------------------------------------ summary

const total = results.length;
const okCount = results.filter((r) => r.ok).length;
if (okCount === total) {
  rmSync(SANDBOX, { recursive: true, force: true });
  console.log(`PROBE handover: ${total}/${total} PASS`);
  process.exit(0);
} else {
  console.log(`PROBE handover: FAILED — ${total - okCount} check(s) failed; sandbox kept at ${SANDBOX}`);
  for (const r of results.filter((x) => !x.ok)) console.log(`  FAIL [${r.id}] ${r.label} — ${r.detail}`);
  process.exit(1);
}
