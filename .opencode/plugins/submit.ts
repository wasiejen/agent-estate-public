// submit.ts — the v2-NATIVE unified inbox appender (TODO #137 unit 5a, 2026-10-22,
// clone `migration`). Ports the v1 `.opencode/tools/submit.ts` tool (#53 Part B
// channel map + stamp rule + the 2026-10-21 NEWLINE GUARD) onto the v2 plugin
// surfaces: `ctx.tool.transform` + `editor.add` (the compact_memory.ts
// registration pattern; setup returns a teardown closure disposing the
// registration). Auto-discovered from `.opencode/plugins/` (NO `opencode.jsonc`
// change — the 3a precedent).
//
// CARRIED byte-compatibly from v1: the channel map + header levels —
//   feedback  -> agent/agent_feedback.md          (### header)
//   knowledge -> agent/knowledge/knowledge_inbox.md (## header)
//   todo      -> todo_inbox.md (repo root)         (## header)
//   ideas     -> agent/agent_ideas.md              (### header)
//   memory    -> agent/memory/<role>/memory_inbox.md (### header, <role> = the
//       agent id BEFORE the first '_', fallback `agent`)
// the entry form `<header> <YYYY-MM-DD_HH-MM> <role> <session>` + the raw text
// + one trailing blank line, the zero-param error string, the EMPTY-string rule,
// the return blocks `<param>` + `target:` + `entry:` in
// feedback/knowledge/todo/ideas/memory order, append-only (a target BODY is
// NEVER read/rewritten — since 2026-10-21 the FINAL BYTE of an existing target
// is probed ONLY to decide the newline separator before an append), and a
// missing target file (or its parent dir) is CREATED carrying only the entry.
// The targets are HARDCODED — there is NO path parameter (that is the sandbox).
//
// NOTE: the clone's v1 twin `.opencode/tools/submit.ts` (167 lines, the spec's
// design-of-record anchor) predates the 2026-10-21 NEWLINE GUARD (the MAIN-repo
// `submit.ts`, 189 lines, carries it); the spec requires the GUARD kept — the
// clone-twin staleness is a logged discrepancy.
//
// DEVIATION (the v2 ToolContext carrier): v2 gives `{sessionID, agent, messageID,
// id, signal, progress}` (fork schema tool.ts:14-19 + plugin promise/tool.ts:11-24)
// — the stamp auto-fill = role = `context.agent` else `agent`; session =
// `context.sessionID` else `unknown` (v1's identical form; there were no extra
// chain legs here). The repo-root carrier = setup-time capture `dir =
// ctx.location.directory` (the context_family.ts:497 precedent; v1 resolved
// `context.directory ?? process.cwd()` at execute time — v2 ToolContext has
// no `directory`).
//
// WHAT IT IS: a v2 plugin (DEFAULT export only, the loader contract; the
// `@opencode/plugin` import is TYPE-ONLY, erased at runtime; no value imports
// beyond node: builtins — the compact_memory/context_family pattern). NEVER
// throws.
import type { Plugin } from "@opencode/plugin";
import { appendFileSync, mkdirSync, statSync, closeSync, openSync, readSync } from "node:fs";
import path from "node:path";

// The repo-root carrier — captured at setup from `ctx.location.directory`;
// the pre-setup default (process cwd) keeps a stray pre-setup call from
// crashing, though the tool only runs after registration.
let dir = process.cwd();

// Local clock, `YYYY-MM-DD_HH-MM` (minute resolution) — the SAME stamp form
// the existing inbox/feedback entries use. Machine-computed; NEVER retyped
// or compared by eye (AGENTS.md pattern 5).
function localStamp(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}-${p(d.getMinutes())}`
  );
}

// The HARDCODED channel targets (relative to the repo root) + their
// established header depths. There is NO path parameter — this table IS the
// sandbox. The memory channel is ROLE-SCOPED, resolved outside the table.
const CHANNELS = {
  feedback: { rel: "agent/agent_feedback.md", header: "###" },
  knowledge: { rel: "agent/knowledge/knowledge_inbox.md", header: "##" },
  todo: { rel: "todo_inbox.md", header: "##" },
  ideas: { rel: "agent/agent_ideas.md", header: "###" },
} as const;
type ChannelKey = keyof typeof CHANNELS;

const TOOL_DESCRIPTION =
  `Appends ONE machine-stamped entry (<header> <YYYY-MM-DD_HH-MM> <role> <session> + your raw text) to each of the provided inbox channels — feedback (friction points: what slowed/confused this session, one line preferred) -> agent/agent_feedback.md; knowledge (verified, actionable knowledge in inbox format) -> agent/knowledge/knowledge_inbox.md; todo (a loose finding, unnumbered — the planner assigns IDs at curation) -> todo_inbox.md; ideas (what is missing or could be done differently to improve something generally — process, toolset, general function, design, interaction of parts; NOT friction, that is feedback) -> agent/agent_ideas.md (the agent-side ideas inbox; the maintainer's own ideas.md is his personal stream, not this target); memory (verified, role-scoped experience/procedure/lesson that improves THIS role's future work — NOT repo-general facts, those go to knowledge) -> agent/memory/<role>/memory_inbox.md, where <role> = your agent id before the first '_' (the maintainer's curation lane cures inbox entries into the role's memory.md + destilled_mem.md). Memory-entry guideline (enough to make a valid, reliable memory — full format in agent/memory/README.md): write ONE concise, self-contained memory statement plus, where known: its type (observed/derived/decided/learned/preference/hypothesis), confidence (high/medium/low), scope (when it applies), an evidence/source locator (file, commit, log line, incident), and a review trigger. NO transient session detail, NO speculation presented as fact, NO restatement of prompt/AGENTS.md/knowledge text. Fire it with at least one of feedback/knowledge/todo/ideas/memory (several at once allowed; pass an empty string for the ones you skip). The date is stamped automatically and role + session are auto-filled from the v2 ToolContext (role = context.agent else 'agent'; session = context.sessionID else 'unknown'); targets resolve against the plugin's setup-captured repo root. Append-only — a target BODY is never read/rewritten; only an existing target's FINAL BYTE is probed to decide the newline separator before an append (the 2026-10-21 fix).`;

// The input schema — a plain JSON schema (the promise surface accepts
// Tool.ValueSchema; InputValue resolves to `unknown`, so `execute` reads the
// args defensively). ALL FIVE optional strings; >= 1 required AT RUNTIME (the
// zero-param error string, carried — an EMPTY string counts as NOT provided).
const TOOL_INPUT = {
  type: "object",
  additionalProperties: false,
  properties: {
    feedback: {
      type: "string",
      description:
        "Friction description (one line preferred): what slowed down or confused this session, an unclear rule, missing context, a caught near-miss.",
    },
    knowledge: {
      type: "string",
      description:
        "Verified, actionable knowledge for the knowledge inbox (dated + role-tagged by the stamp; the knowledge curator moves it to the area files).",
    },
    todo: {
      type: "string",
      description:
        "A loose finding (unnumbered) for the planner's TODO curation: problem + evidence, desired outcome, acceptance criteria.",
    },
    ideas: {
      type: "string",
      description:
        "An improvement idea for the agent-side ideas inbox: what is missing or could be done differently to improve something generally (process, toolset, general function, design, interaction of parts). Not friction — friction goes to feedback.",
    },
    memory: {
      type: "string",
      description:
        "Verified, role-scoped memory for THIS role's own memory inbox (agent/memory/<role>/memory_inbox.md — <role> = the agent id before the first '_'): one concise, self-contained memory statement plus type (observed/derived/decided/learned/preference/hypothesis), confidence, scope, an evidence/source locator, and a review trigger — NO transient session detail, NO speculation as fact, NO restatement of prompt/AGENTS.md/knowledge text. Repo-general facts go to knowledge instead.",
    },
  },
};

async function execute(
  args: unknown,
  toolContext: { sessionID?: unknown; agent?: unknown },
): Promise<{ output: string }> {
  const a: Record<string, unknown> =
    args != null && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : {};

  // An empty/blank string counts as NOT provided (the same convention as
  // loop_log's session handling). The memory channel's target is ROLE-SCOPED
  // (the context.agent prefix before the first '_'), so it is resolved outside
  // the hardcoded CHANNELS table; the other four channels are unchanged.
  const provided = (Object.keys(CHANNELS) as ChannelKey[]).filter(
    (k) => a[k] != null && String(a[k]).trim() !== ""
  );
  const memoryProvided = a["memory"] != null && String(a["memory"]).trim() !== "";
  if (provided.length === 0 && !memoryProvided) {
    return { output: "error: none of feedback/knowledge/todo/ideas/memory provided — nothing written" };
  }

  const stamp = localStamp();
  // role + session are AUTO-FILLED from the v2 ToolContext — the agent never
  // supplies them (no role/session parameter).
  const role = toolContext?.agent != null && String(toolContext.agent).trim() !== "" ? String(toolContext.agent) : "agent";
  const session = toolContext?.sessionID != null && String(toolContext.sessionID).trim() !== "" ? String(toolContext.sessionID) : "unknown";
  // <role> = the agent id BEFORE the first '_' (`planner_Q3S` -> `planner`;
  // an id without '_' keeps itself; the fallback role `agent` maps to the
  // `agent` namespace).
  const rolePrefix = role.split("_")[0];

  // NEWLINE GUARD (2026-10-21, carried from MAIN submit.ts:149-168): a target
  // lacking a trailing newline gets a one-\n separator appended first, so the
  // entry HEADER always starts a line (measured: a 2026-10-16 todo_inbox entry
  // glued into the last line when the target ended without \n). A failed probe
  // must not break the append itself.
  const appendEntry = (target: string, entry: string) => {
    let sep = "";
    try {
      if (statSync(target).size > 0) {
        const fd = openSync(target, "r");
        const buf = Buffer.alloc(1);
        readSync(fd, buf, 0, 1, statSync(target).size - 1);
        closeSync(fd);
        if (buf[0] !== 0x0a) sep = "\n";
      }
    } catch {
      // unreadable/absent -> no separator: a fresh file starts clean
    }
    appendFileSync(target, sep + entry, "utf-8"); // append-only: the body is never read/rewritten
  };

  const blocks: string[] = [];
  for (const key of provided) {
    const { rel, header } = CHANNELS[key];
    const target = path.join(dir, rel);
    mkdirSync(path.dirname(target), { recursive: true }); // missing dir -> create (recursive)
    const entry = `${header} ${stamp} ${role} ${session}\n${String(a[key])}\n\n`;
    appendEntry(target, entry); // append-only: the target BODY is NEVER read
    blocks.push(`${key}\ntarget: ${rel}\nentry: ${entry}`);
  }
  if (memoryProvided) {
    const rel = `agent/memory/${rolePrefix}/memory_inbox.md`;
    const target = path.join(dir, rel);
    // His ruling 3: the inbox FILE and its role FOLDER are created when not
    // already existing (recursive mkdir = both).
    mkdirSync(path.dirname(target), { recursive: true });
    const entry = `### ${stamp} ${role} ${session}\n${String(a["memory"])}\n\n`;
    appendEntry(target, entry);
    blocks.push(`${"memory"}\ntarget: ${rel}\nentry: ${entry}`);
  }
  return { output: blocks.join("\n") };
}

const submitTool = {
  name: "submit",
  description: TOOL_DESCRIPTION,
  input: TOOL_INPUT,
  output: { type: "string" },
  execute,
};

// ------------------------------------------------------------------ the plugin module

// The v2 plugin module (the loader decodes the DEFAULT export only). The
// setup captures the repo root; the teardown disposes the registration
// (the compact_memory.ts pattern).
const plugin: Plugin.Plugin = {
  id: "submit",
  async setup(ctx) {
    dir = ctx.location.directory;
    const regTool = await ctx.tool.transform((editor) => {
      editor.add(submitTool);
    });
    return () => {
      void regTool.dispose();
    };
  },
};

export default plugin;
