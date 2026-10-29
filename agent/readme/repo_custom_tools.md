# repo_custom_tools.md — host tools for this repo (read when you use one, or its behavior surprises you)

This repo registers host-specific tools: `.opencode/tools/{block_transfer,ctx_gauge,loop_log,context_trim}.ts`
plus the `context_trim_v2` plugin (`.opencode/plugins/context_trim_v2.ts`).
The tool description injected into your context is CURRENT and authoritative.
This part adds WHEN-to-use guidance and traps the description omits.
Contract pinning lives in `.opencode/plugins/probes/handover_probe.mjs`.

## block_transfer — multi-line block MOVE / COPY / CUT / PASTE / DELETE / CLEAR
- Use it to move multi-line blocks: TODO sections, log sections, prompt blocks.
- It replaces write or edit for such housekeeping moves.
- Anchors: `startMarker` / `endMarker` are SHORT UNIQUE line prefixes; the
  block spans start..end INCLUSIVE.
- A non-unique anchor fails. Widen the prefix. Do not guess.
- Each `bufferName` holds one buffer; several can coexist. The default is `'default'`.
- MOVE transfers in one call. COPY or CUT, then PASTE, moves in steps.
- DELETE discards the block. CLEAR empties a buffer.
- `targetMarker` sets the insertion point: right after that line. Omit it to append to EOF.
- Sandbox: all reads AND writes are confined to the repo working dir + the
  Windows temp dir. Outside paths are rejected.
- Verify after every MOVE/PASTE with `git diff` — the tool reports the line
  it acted on, not the result.

## ctx_gauge — context readout, read-only
- Read the context usage of the current session (omitted/empty `sessionID`)
  or a named one.
- Prefer it over the `peek.mjs` shell-out — same number, no shell cost.
- Readout forms: `SESSION=… CTX=n (p%) REM=m`; unknown window → no pct/REM;
  no total / unreadable db → `CTX=notAvailable` + the error appended.
- GAUGE-LAG TRAP (maintainer #9): the readout lags the TRUE context by ≈1
  tool call (~5k — the in-flight step's output; the gauge reads the last
  FINISHED step's in+out+cr, #103, 2026-09-27). Plan with margin; a
  displayed readout is optimistic.

## loop_log — append one loop-log line (loop roles only)
- Loop roles (planner / worker) write bookkeeping here, not hand-formatted
  into `loop_log.md`: the tool appends the formatted line to the current looprun folder.
- The tool auto-creates the dated folder.
- `status` maps to an 8-char token — the accepted keywords and their tokens:
  `start` → `-->START`, `done` → `DONE<---`, `return` → `-RETURN-`,
  `warn` → `-WARNING`, `info` → `--INFO--`, `correct` → `CORRECT-`. The
  lookup is lenient (lowercase, non-alphanumeric characters stripped); an
  unrecognized word is rejected at parse.
- DONE content = the final gauge readout + one-line outcome.
- START content = the task one-liner. RETURN carries `role session model`.
- WARNING carries the failed session id + cause.
- Pass your session id from the injected `SESSION=` field.
- Never hand-edit `loop_log.md`; it is the loop's committed record.

## context_trim — context survival lanes (SELF / CROSS)
- The compact lane is denied (root permission, 2026-10-29); the trim lanes
  replace it. AGENTS.md §Context Trim is the authority and the tool
  description is CURRENT — this section adds WHEN-to-use only.
- `report`: read-only window map (ranks `#N`, `own=`, flags) — read it
  before any manual drop.
- `mark` + `apply`: drop chosen rows behind the fit bound; `guard:true`
  arms the wall guard. `unmark` is PRE-APPLY only — it edits the STAGED
  list; an applied (`active`) or `free`/guard (`auto`) drop clears only
  via `clear` (which empties all drop sets).
- `free target=N`: one call frees ~N % of the window — the stop-line and
  recovery lane. `tail`: keep-boundary (shapes the report, not the live
  request). `clear`: empty the drop sets.
- Drops land at the next assembly; dropped tool outputs are recoverable
  only from committed files — commit state before dropping.
- CROSS (planner): rescue a walled or dead child — `report`, then `free`
  ~25–45 %, then resume with the recovery flow: re-read committed files,
  write a self-summary file + commit, then an informed self-trim.
- `session:'all'`: the store-hygiene sentinel (not a session). `report` lists
  the trim-store entries read-only; `tail` + `clear:true` + `ids` clears named
  DEAD entries. An entry is DEAD once its session is INACTIVE (the session API
  says idle or gone and no step is running) or the session row is gone — a
  finished worker's entry clears even when it self-trimmed mid-run. The
  caller's own entry is never clearable.

## NOT here
- Built-ins (`task`, `skill`, `webfetch`, …) are not custom tools.
- The probe/gauge scripts (`.opencode/plugins/scripts/`, `repo_commands.md`) are not custom tools.
- Their docs live with them.

## Tool surface: native — `execute` denied globally (ruling 2026-10-27, #182)
- The maintainer denies `execute` for EVERY agent. One root `permission` line is
  global: fork proof `packages/core/src/config/plugin/agent.ts:84-91` pushes the
  root document's permission rules onto every agent in the registry.
- Effect (upstream v2.2.0 #59315): this tool set lands in each agent's NATIVE
  tool schema and `execute` vanishes from the schema. Call these tools directly.
- Measured under the deny (worker probe `a0d86bc`): all 8 custom tools plus all 8
  `opencode_*` host tools present natively; native `loop_log` START →
  `verified: readback-match`; native `ctx_gauge` → full readout line. Planner-side
  native calls ride the first session after the config lands.
- Never work around a denied permission, and do not document or reach for a tool
  your schema does not offer (maintainer ruling 2026-10-27: the `execute` mention was
  DELETED from `AGENTS.md`, not replaced).
- The observer plugin sees these tools on the NATIVE path too: a native
  `block_transfer` WRITE with an out-of-sandbox `dstFile` produced one
  `out-of-sandbox` verdict line in `.opencode/temp/intercept.log` (2026-10-27, #179).
- History (forensics only): before the ruling the tools were catalog-only. Across
  345 `execute` calls: 281 (81%) wrapped ONE tool call, 64 (19%) composed
  several, `fetch` appeared 4 times (3 were `file://` boundary probes). See
  TODO #182.
