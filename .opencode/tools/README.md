# tools/ — custom opencode tools (file-named, host-registered)

Purpose: `export default tool({ description, args, execute })` modules — NO
`name` field; the host names a tool by FILENAME (`compact_memory`, `ctx_gauge`,
`loop_log`, `block_transfer`, `session_info`, …). A new/changed tool takes
effect at the next host restart; keep the probe gate green. `dev/` =
development/test copies. These are opencode program files — agent protocol does
not live here (that is `agent/prompts/`).

Per-file docs: `block_transfer.md` · `loop_log.md` · `submit.md` · `ctx_gauge.md`.
Minor host-bridge tools (no own README): `session_info.ts` — minor host-bridge
tool, see its header; `dev_get_tool_context_contents.ts` — minor host-bridge
tool, see its header.
