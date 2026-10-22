// dev_get_tool_context_contents.ts — the v2-NATIVE tool-context dump (TODO
// #137 unit 5b, 2026-10-22, clone `migration`). Ports the v1 `.opencode/tools/
// dev_get_tool_context_contents.ts` (the design of record, READ-ONLY) onto the
// v2 plugin surfaces: `ctx.tool.transform` + `editor.add` (the compact_memory.ts
// / loop_log.ts registration pattern; setup returns a teardown closure disposing
// the registration). Auto-discovered from `.opencode/plugins/` (NO `opencode.jsonc`
// change — the 3a precedent).
//
// CARRIED byte-compatibly from v1: the ONE-plain-string return discipline (the
// 2026-09-27 fix — the ToolResult output must be a plain string, NEVER an array
// or object; a non-serializable context value falls back to the keys-only line
// `JSON.stringify failed (<err>) — context keys only: <keys>`; NEVER throws out
// of an execute), the `contextKeys` runtime-key listing, and the `<function>`
// markers on function-typed fields.
//
// DEVIATION (the v2 ToolContext carrier): the dump reports the v2 fields that
// EXIST — `{sessionID, agent, messageID, id, signal, progress}` (fork schema
// tool.ts:14-19 + plugin promise/tool.ts:11-24; `progress` is the `<function>`
// leg, `signal` an AbortSignal). The v1 twin's legs `callID`, `extra`, `messages`,
// `metadata`, `ask`, `directory`, `worktree` (and the plugin-only `client` —
// v1's own header note: the client is only available in a plugin context, NOT
// in a tool context) have NO v2 carrier: NO keys are INVENTED — their absence
// rides the actual runtime `contextKeys` listing (a live extra key shows there
// but is never fabricated as a dump field). The v1 auto-detected tool becomes
// the plugin registration id `dev_get_tool_context_contents`.
//
// WHAT IT IS: a v2 plugin (DEFAULT export only, the loader contract; the
// `@opencode/plugin` import is TYPE-ONLY; NO value imports at all — a pure
// context reader). NEVER throws.
import type { Plugin } from "@opencode/plugin";

const TOOL_DESCRIPTION =
  "all available keys of the object context returned for debugging and tool/plugin dev";

// The input schema — the v1 `args: {}` carried: a plain JSON object schema
// with NO properties (the dump takes no parameters).
const TOOL_INPUT = {
  type: "object",
  additionalProperties: false,
  properties: {},
};

async function execute(_args: unknown, toolContext: { sessionID?: unknown; agent?: unknown; messageID?: unknown; id?: unknown; signal?: unknown; progress?: unknown }): Promise<{ output: string }> {
  // The v1 shape listed the v1 carrier's fields; the v2 execute context carries
  // NO `directory`/`extra`/`client` — the dump lists the v2 fields that EXIST
  // and NOTHING else (NO invented keys); the runtime truth lives in the context
  // keys listing (`contextKeys`).
  const c: Record<string, unknown> = toolContext != null && typeof toolContext === "object" ? (toolContext as Record<string, unknown>) : {};
  const dump: Record<string, unknown> = {
    contextKeys: Object.keys(c),
    sessionID: c["sessionID"],
    agent: c["agent"],
    messageID: c["messageID"],
    id: c["id"],
    progress: typeof c["progress"] === "function" ? "<function>" : c["progress"],
    signal: c["signal"],
  };
  try {
    // 2026-09-27 fix carried: return ONE plain string (the host reads
    // `result.output` and calls `.split` on it — an array/object return breaks
    // every call). Absent (undefined) fields simply drop out of the JSON — that
    // IS the "report them as absent per the actual runtime keys" leg.
    return { output: JSON.stringify(dump, null, 2) };
  } catch (e) {
    // a non-serializable (e.g. circular) context value — keys only,
    // NEVER throw out of a tool execute (the v1 fallback line, carried).
    return { output: `JSON.stringify failed (${String(e)}) — context keys only: ${Object.keys(c).join(", ")}` };
  }
}

const devTool = {
  name: "dev_get_tool_context_contents",
  description: TOOL_DESCRIPTION,
  input: TOOL_INPUT,
  output: { type: "string" },
  execute,
};

// ------------------------------------------------------------------ the plugin module

// The v2 plugin module (the loader decodes the DEFAULT export only). No repo-
// root capture (a pure context reader — nothing resolves against the workspace);
// the teardown disposes the registration (the compact_memory.ts pattern).
const plugin: Plugin.Plugin = {
  id: "dev_get_tool_context_contents",
  async setup(ctx) {
    const regTool = await ctx.tool.transform((editor) => {
      editor.add(devTool);
    });
    return () => {
      void regTool.dispose();
    };
  },
};

export default plugin;
