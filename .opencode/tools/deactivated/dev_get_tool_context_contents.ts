//client is only available in context of a plugin - not in tool context

// async execute(_args, context) {
//   return JSON.stringify({
//     contextKeys: Object.keys(context ?? {}),
//     clientKeys: Object.keys(context?.client ?? {}),
//     sessionKeys: Object.keys(context?.client?.session ?? {}),
//   }, null, 2)
// },


// - sessionID
// - abort
// - messageID
// - callID
// - extra
// - agent
// - messages
// - metadata
// - ask
// - directory
// - worktree

import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "all available keys of the object context returned for debugging and tool/plugin dev",
  args: {},
  async execute(args: any, context: any) {
    // 2026-09-27 fix: the previous version returned a string[] — but the
    // ToolResult type is `string | { output: string, ... }` (plugin/dist/
    // tool.d.ts L39-46); the host reads `result.output` and calls `.split`
    // on it — on an array `result.output` is undefined → "undefined is
    // not an object (evaluating 'c.split')" on every call. Return a plain
    // string now. `messages` is NOT in the static ToolContext (tool.d.ts
    // L2-24) and may be absent live — never .slice on it raw.
    const c = context ?? {};
    const dump = {
      contextKeys: Object.keys(c),
      sessionID: c.sessionID,
      messageID: c.messageID,
      callID: c.callID,
      extra: c.extra,
      agent: c.agent,
      messages: Array.isArray(c.messages) ? c.messages.slice(0, 1) : c.messages,
      metadata: typeof c.metadata === "function" ? "<function>" : c.metadata,
      ask: typeof c.ask === "function" ? "<function>" : c.ask,
      directory: c.directory,
      worktree: c.worktree,
    };
    try {
      return JSON.stringify(dump, null, 2);
    } catch (e) {
      // a non-serializable (e.g. circular) context value — keys only,
      // never throw out of a tool execute
      return `JSON.stringify failed (${String(e)}) — context keys only: ${Object.keys(c).join(", ")}`;
    }
  }
})
