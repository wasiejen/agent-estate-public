# repo_custom_tools.md — host tools for this repo (read when you use one, or its behavior surprises you)

This repo registers host-specific tools: `.opencode/tools/{block_transfer,ctx_gauge,loop_log}.ts`
plus the `compact_memory` plugin (`.opencode/plugins/compact_memory.ts`).
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

## compact_memory — session compaction (SELF / CROSS)
- Fire it to compact your OWN session (SELF) at the L3 trigger.
- Or compact a named session (CROSS): the planner rescues a worker before a `task_id` resume.
- Args: `[sessionID, keepMessages, message, emergency]` (`keepTokens` is
  gone).
- CROSS dispatches are fire-and-forget. Verify success by the `COMPACT` line
  in `.opencode/temp/ctx.log` (or the terminal), not by the response.
- Budget is per target session + model (cap from `compact_budget.json`
  `model_budget`, bare model id → cap; unlisted models get the configured default; CPU models denied, cap 0); the `emergency` arg consumes the one extra compaction AFTER the normal budget is drained (once per session).
- Pre-compaction dump (TODO #55, landed plan4): before ANY dispatch, the tool
  dumps the target session's full content to `archive/sessions/compaction_dumps/<sid>_c<count>.md`.
- The dump is NEVER overwritten; a same-count collision falls back to a STAMPED name.
- A dump failure is logged (`DUMP-FAIL` in `ctx.log`) and never blocks.
- After a SELF compaction the session ENDS — continuation rides the
  post-compaction reload directive / `task_id` resume (planner prompt
  §Context-budget trigger).
- A failed dispatch consumes NO budget.
- The summarizer is the target session's OWN model (same-model —
  `agent.compaction.model` commented out in opencode.jsonc) → expect ONE
  flush delegation after a CROSS dispatch (llama-swap single slot;
  knowledge_tools.md).

## NOT here
- Built-ins (`task`, `skill`, `webfetch`, …) are not custom tools.
- The probe/gauge scripts (`.opencode/plugins/scripts/`, `repo_commands.md`) are not custom tools.
- Their docs live with them.

## Two tool surfaces (measured 2026-10-27, opencode 2.2.0)
- The Code Mode catalog exposes these tools as `tools.<x>()` inside `execute`.
- When an agent's permissions set `execute: "deny"`, the host puts the same
  tools directly into that agent's NATIVE tool schema (upstream v2.2.0, PR
  #59315) and `execute` disappears from the schema entirely — measured on the
  worker agent: `block_transfer`, `ctx_gauge`, `loop_log`, `submit`,
  `state_snapshot`, `context_trim`, `compact_memory`,
  `dev_get_tool_context_contents` all present natively; `session_info` absent.
- Native calls work under that exposure. Measured: the worker's native
  `loop_log` START returned `verified: readback-match`; native `ctx_gauge`
  returned the full readout line. The old native-empty-result defect did not
  recur.
- Consequence: the "custom tools ONLY via `execute`" rule binds whichever
  surface you actually have. Check your own tool list before choosing the
  path; never work around a denied permission.
