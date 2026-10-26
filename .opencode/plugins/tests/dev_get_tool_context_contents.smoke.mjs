// dev_get_tool_context_contents.smoke.mjs — TODO #137 unit 5b: the v2 dev-
// helper plugin smoke. bun, MOCK ctx — no opencode process, NO fixtures needed
// (a pure context reader — nothing touches the filesystem). Pins the DoD 3
// contract of `.opencode/plugins/dev_get_tool_context_contents.ts`: the loader
// shape {id, setup} + the `tool.transform`/`editor.add` registration (name
// `dev_get_tool_context_contents`, the v1 description VERBATIM, a NO-argument
// object input, string output, teardown disposes, NO hooks), the ONE-plain-
// string return discipline (the v1 2026-09-27 fix — the dump parses as an
// OBJECT, never an array), the dump fields = the v2 ToolContext keys that EXIST
// (`contextKeys` + sessionID/agent/messageID/id/progress/signal, values carried,
// `progress` -> the `<function>` marker), the v1-only legs (callID/extra/messages/
// metadata/ask/directory/worktree/client) NEVER INVENTED (their absence rides
// the actual `contextKeys` listing; a live extra key shows there but NOT as a
// dump field), the absent-field drop (no null placeholders), the missing-context
// form, and the non-serializable (circular) context -> the v1 keys-only fallback
// line, NEVER a throw.
//
// Run: bun run dev_get_tool_context_contents.smoke.mjs (this dir). Expected
// final line: `SMOKE: ALL PASS`.

import path from "node:path";
import { pathToFileURL } from "node:url";

// The repo root this suite lives in (`.opencode/plugins/tests` -> up 3). Resolved
// from the file so the suite runs in whatever checkout owns the tests dir — the
// old absolute archived-clone path no longer exists on this machine (TODO #156,
// 2026-10-26).
const CLONE_ROOT = path.join(import.meta.dirname, "..", "..", "..");
const PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "dev_get_tool_context_contents.ts");

let failures = 0;
function chk(label, ok, detail = "") {
  if (ok) console.log(`PASS  ${label}`);
  else {
    failures++;
    console.log(`FAIL  ${label}${detail ? "  [" + detail + "]" : ""}`);
  }
}

// ------------------------------------------------------------------ mock ctx + plugin load

const TOOLS = [];
let DISPOSED = 0;
function makeCtx(directory) {
  return {
    location: { directory },
    tool: {
      transform: async (cb) => {
        const editor = { list: () => [], get: () => undefined, namespace: () => {}, add: (t) => TOOLS.push(t), update: () => {}, remove: () => {} };
        cb(editor);
        return { dispose: async () => { DISPOSED++; } };
      },
      hook: async (name) => {
        chk(`UNEXPECTED tool.hook(${name})`, false);
        return { dispose: async () => {} };
      },
    },
  };
}

const plugin = (await import(pathToFileURL(PLUGIN).href)).default;
chk("S0 default export is the loader shape { id: 'dev_get_tool_context_contents', setup }",
  plugin && typeof plugin === "object" && plugin.id === "dev_get_tool_context_contents" && typeof plugin.setup === "function",
  JSON.stringify(Object.keys(plugin ?? {})));

const cleanup = await plugin.setup(makeCtx("unused/pure-context-reader"));
const TOOL = TOOLS[0];
chk("S1 setup registers ONE tool (name 'dev_get_tool_context_contents'), teardown returned, NO hooks",
  TOOLS.length === 1 && TOOL.name === "dev_get_tool_context_contents" && typeof cleanup === "function",
  `tools=${TOOLS.length}`);
chk("S1 tool surface: v1 description VERBATIM, NO-argument object input, string output, promise execute",
  TOOL.description === "all available keys of the object context returned for debugging and tool/plugin dev" &&
    TOOL.input?.type === "object" &&
    Object.keys(TOOL.input.properties).length === 0 &&
    TOOL.input.required === undefined &&
    TOOL.output?.type === "string" &&
    typeof TOOL.execute === "function",
  JSON.stringify([TOOL.description, TOOL.input, TOOL.output]));

const call = async (toolCtx) => (await TOOL.execute({}, toolCtx)).output;

// ------------------------------------------------------------------ A the v2-shaped context dump

{
  const V2CTX = {
    sessionID: "ses_dev1",
    agent: "worker_FlashNext",
    messageID: "msg_dev1",
    id: "call_dev1",
    signal: new AbortController().signal,
    progress: (u) => Promise.resolve(),
  };
  let threw = false;
  let out = "";
  try {
    out = await call(V2CTX);
  } catch (e) {
    threw = true;
    out = `THREW: ${String(e?.message ?? e)}`;
  }
  const parsed = threw ? null : JSON.parse(out);
  chk("(A) ONE plain string return (the 2026-09-27 discipline), parses as an object, NEVER a throw",
    !threw && typeof out === "string" && parsed != null && typeof parsed === "object" && !Array.isArray(parsed),
    out.slice(0, 120));
  chk("(A) dump top-level keys EXACTLY contextKeys + the v2 fields that EXIST (NO invented legs)",
    !threw && Object.keys(parsed).join(",") === "contextKeys,sessionID,agent,messageID,id,progress,signal",
    threw ? out : Object.keys(parsed).join(","));
  chk("(A) contextKeys = the ACTUAL runtime keys (the v2 ToolContext shape)",
    !threw && parsed.contextKeys.join(",") === "sessionID,agent,messageID,id,signal,progress",
    threw ? out : parsed.contextKeys.join(","));
  chk("(A) values carried: sessionID/agent/messageID/id; progress -> the `<function>` marker",
    !threw && parsed.sessionID === "ses_dev1" && parsed.agent === "worker_FlashNext" && parsed.messageID === "msg_dev1" && parsed.id === "call_dev1" && parsed.progress === "<function>",
    threw ? out : JSON.stringify([parsed.sessionID, parsed.progress]));
  const v1only = ["callID", "extra", "messages", "metadata", "ask", "directory", "worktree", "client"];
  chk("(A) the v1-only legs NEVER invented as dump fields (their absence rides contextKeys)",
    !threw && v1only.every((k) => !(k in parsed)),
    threw ? out : Object.keys(parsed).join(","));
}

// ------------------------------------------------------------------ B live extra keys: reported honestly, not invented

{
  const out = await call({ sessionID: "ses_dev2", agent: "planner_FlashNext", directory: "C:/live/dir", worktree: "wt1" });
  const parsed = JSON.parse(out);
  chk("(B) a live extra key shows in contextKeys but is NOT fabricated as a dump field",
    parsed.contextKeys.join(",") === "sessionID,agent,directory,worktree" && Object.keys(parsed).join(",") === "contextKeys,sessionID,agent",
    Object.keys(parsed).join(",") + " | " + parsed.contextKeys.join(","));
}

// ------------------------------------------------------------------ C absent fields drop (no null placeholders)

{
  const out = await call({ sessionID: "ses_dev3" });
  const parsed = JSON.parse(out);
  chk("(C) absent fields simply drop out of the JSON (agent/messageID/id/progress/signal NOT present as nulls)",
    Object.keys(parsed).join(",") === "contextKeys,sessionID" && parsed.sessionID === "ses_dev3",
    Object.keys(parsed).join(","));
}

// ------------------------------------------------------------------ D missing/undefined context

{
  let threw = false;
  let out = "";
  try {
    out = await call(undefined);
  } catch (e) {
    threw = true;
    out = `THREW: ${String(e?.message ?? e)}`;
  }
  const parsed = threw ? null : JSON.parse(out);
  chk("(D) undefined context -> {contextKeys:[]} form, NEVER a throw",
    !threw && Object.keys(parsed).join(",") === "contextKeys" && Array.isArray(parsed.contextKeys) && parsed.contextKeys.length === 0,
    out);
}

// ------------------------------------------------------------------ E non-serializable (circular) -> the keys-only fallback

{
  const circ = { sessionID: "ses_dev5", agent: "worker_Q3S" };
  const sig = {};
  sig["self"] = sig; // the circularity sits in a DUMP-CARRIED field (signal) —
  circ["signal"] = sig; // contextKeys alone (strings) can never trip the fallback
  let threw = false;
  let out = "";
  try {
    out = await call(circ);
  } catch (e) {
    threw = true;
    out = `THREW: ${String(e?.message ?? e)}`;
  }
  chk("(E) circular context -> the v1 fallback line `JSON.stringify failed (…) — context keys only: <keys>`, NEVER a throw",
    !threw && /^JSON\.stringify failed \(.+\) — context keys only: .+$/.test(out) && out.includes("sessionID, agent, signal"),
    out.slice(0, 160));
}

// ------------------------------------------------------------------ Z cleanup

cleanup();
chk("Z the teardown disposes the registration", DISPOSED === 1, `disposed=${DISPOSED}`);

console.log(failures === 0 ? "SMOKE: ALL PASS" : `SMOKE: ${failures} FAIL`);
process.exit(failures === 0 ? 0 : 1);
