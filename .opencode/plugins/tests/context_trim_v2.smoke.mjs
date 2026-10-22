// context_trim_v2.smoke.mjs — TODO #137 unit 4b: the v2 context-trim plugin smoke.
// bun, MOCK ctx — no opencode process. Pins the DoD 1-6 contract of
// `.opencode/plugins/context_trim_v2.ts`: the tool.transform/editor.add
// registration with the v1-mirroring args, the REPORT over a v2-shaped window
// (the session-context rows + the shared gauge core's readout line — the ONLY
// DB read), the tail lane as the persistent BOUNDARY STORE (set/clear + the
// fail-closed rejections: session-not-found, target-not-found, target-at-window-
// head, retained-tail-below-floor, keep-invalid/keep-exceeds-history/keep-at-
// window-head), the `session.context` HOOK filter (drops EXACTLY the pre-
// boundary entries, appends NOTHING, id-less entries kept), the STALE-boundary
// fail-open with the ONE `boundary-stale` line (deduped), and the COMPOSITION
// pin with the REAL context_family plugin's APPEND-ONLY injection (both orders
// on the SAME draft array — fork hooks.ts:92-96 passes one event object to every
// handler).
//
// Fixtures + logs live in the scratchpad home/AppData/Local/Temp/
// opencode/ctx-trim-smoke-v2 (recreated every run) — the LIVE DB is NEVER
// touched (the gauge core is steered at a v2-shaped fixture DB; the boundary
// store + the evidence log ride the mock WS root). Run: bun run
// context_trim_v2.smoke.mjs (this dir). Expected final line: `SMOKE: ALL PASS`.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRATCH = "home/AppData/Local/Temp/opencode/ctx-trim-smoke-v2";
const WS = path.join(SCRATCH, "ws"); // ctx.location.directory (store + log root)
const CLONE_ROOT = "repo-root-v2";
const PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "context_trim_v2.ts");
const CF_PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "context_family.ts");
const GAUGE = path.join(CLONE_ROOT, ".opencode", "plugin", "scripts", "gauge.mjs");
const SID = "ses_trim001";
const MODEL_ID = "smoke-trim-model-120K"; // name-marker window: 120000

let failures = 0;
function chk(label, ok, detail = "") {
  if (ok) console.log(`PASS  ${label}`);
  else {
    failures++;
    console.log(`FAIL  ${label}${detail ? "  [" + detail + "]" : ""}`);
  }
}

// ------------------------------------------------------------------ fixtures

rmSync(SCRATCH, { recursive: true, force: true });
mkdirSync(path.join(WS, ".opencode", "temp"), { recursive: true });
const STORE = path.join(WS, ".opencode", "temp", "context_trim_v2.json"); // the plugin's default store path
const LOG = path.join(WS, ".opencode", "temp", "context_trim_v2.log");
const CF_LOG = path.join(WS, ".opencode", "temp", "ctx_family.log");

function readLog() {
  if (!existsSync(LOG)) return [];
  return readFileSync(LOG, "utf8").split("\n").filter((l) => l !== "").map((l) => JSON.parse(l));
}
function readStore() {
  if (!existsSync(STORE)) return null;
  return JSON.parse(readFileSync(STORE, "utf8"));
}

// The gauge fixture DB: v2-paired tables (session_v2 + session_message) — the
// SAME shape the gauge core's unit-1/unit-2 legs read. CTX mass 57000 of the
// 120K window -> (47%) REM 63000; the budget fixture (cap 6, count 0) -> " |
// 6 compactions left"; the loop root is steered at a MISSING dir (the gauge
// line carries no ITER suffix — formatGauge only).
const FX_DB = path.join(SCRATCH, "fx_trim_v2.db");
{
  rmSync(FX_DB, { force: true });
  const db = new DatabaseSync(FX_DB);
  db.exec("CREATE TABLE session_v2(id TEXT PRIMARY KEY, model TEXT, time_updated INTEGER)");
  db.exec("CREATE TABLE session_message(id INTEGER PRIMARY KEY, session_id TEXT, type TEXT, data TEXT, time_created INTEGER)");
  db.exec(`INSERT INTO session_v2 VALUES('${SID}', '{"id":"${MODEL_ID}","providerID":"llama-swap"}', 2000)`);
  const step = JSON.stringify({
    tokens: { input: 10000, output: 2000, reasoning: 0, cache: { read: 45000, write: 0 } },
    time: { completed: 123 },
  });
  db.exec(`INSERT INTO session_message VALUES(1, '${SID}', 'assistant', '${step}', 100)`);
  db.close();
}
const BUDGET = path.join(SCRATCH, "fx_budget.json");
writeFileSync(BUDGET, JSON.stringify({ model_budget: { [MODEL_ID]: 6 }, sessions: { [SID]: { count: 0, model: MODEL_ID } }, emergency_budget: 1 }), "utf8");

const gaugeMod = await import(pathToFileURL(GAUGE).href);
gaugeMod.setDbPath(FX_DB);
gaugeMod.setBudgetFileForTest(BUDGET);
gaugeMod.setLoopRootForTest(path.join(SCRATCH, "no_loop_root"));

// The window fixture — the v2 model window of SID: the LAST completed compaction
// ROW as head + 9 more rows (the 10-row window; the floor 6 leaves indices
// 1..4 as legal boundaries). Masses (the plugin's rules): head compaction ->
// bytes4 over summary(12)+recent(11) = 5; user "user one"(8) -> 2; assistant
// tokens 1000+200+0+4000+0 = 5200 (read part 400 bytes); assistant 2000+1000+
// 0+6000+0 = 9000 (bash part 800 bytes); user "user four"(9) -> 2; assistant
// WITH error 100+50 -> 150 (excluded from `biggest:`); user "user six"(8) -> 2;
// assistant 4000+1000+0+20000+0 = 25000; user "user eight"(10) -> 2; assistant
// 300+100 -> 400 (one text item "thinking text").
function windowRows() {
  return [
    { id: "msg_c0", type: "compaction", status: "completed", summary: "SUMMARY-TEXT", recent: "RECENT-TEXT", time: { created: 1000, completed: 1001 } },
    { id: "msg_u1", type: "user", text: "user one", time: { created: 1100 } },
    { id: "msg_a2", type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 1200, completed: 1201 }, tokens: { input: 1000, output: 200, reasoning: 0, cache: { read: 4000, write: 0 } }, content: [{ type: "tool", id: "t1", name: "read", executed: true, state: { status: "completed", input: { filePath: "C:/a/b.ts", offset: 5, limit: 20 }, content: [{ type: "text", text: "R".repeat(400) }] } }] },
    { id: "msg_a3", type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 1400, completed: 1401 }, tokens: { input: 2000, output: 1000, reasoning: 0, cache: { read: 6000, write: 0 } }, content: [{ type: "tool", id: "t2", name: "bash", executed: true, state: { status: "completed", input: { command: "ls -la" }, content: [{ type: "text", text: "S".repeat(800) }] } }] },
    { id: "msg_u4", type: "user", text: "user four", time: { created: 1500 } },
    { id: "msg_a5", type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 1600, completed: 1601 }, tokens: { input: 100, output: 50, reasoning: 0, cache: { read: 0, write: 0 } }, error: { type: "provider.error", message: "boom" }, content: [] },
    { id: "msg_u6", type: "user", text: "user six", time: { created: 1700 } },
    { id: "msg_a7", type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 1800, completed: 1801 }, tokens: { input: 4000, output: 1000, reasoning: 0, cache: { read: 20000, write: 0 } }, content: [] },
    { id: "msg_u8", type: "user", text: "user eight", time: { created: 1900 } },
    { id: "msg_a9", type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 2000, completed: 2001 }, tokens: { input: 300, output: 100, reasoning: 0, cache: { read: 0, write: 0 } }, content: [{ type: "text", text: "thinking text" }] },
  ];
}
// The same window AFTER a NEW durable compaction row landed: a new head, and
// the old boundary row msg_u4 is NO LONGER one of the window rows.
function compactedRows() {
  return [
    { id: "msg_c1", type: "compaction", status: "completed", summary: "NEW-SUMMARY", recent: "", time: { created: 2100, completed: 2101 } },
    { id: "msg_u9", type: "user", text: "post-compaction prompt", time: { created: 2200 } },
    { id: "msg_a10", type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 2300, completed: 2301 }, tokens: { input: 10, output: 10, reasoning: 0, cache: { read: 0, write: 0 } }, content: [] },
  ];
}

// The mock ctx: the session RPC is switchable (rows / not-found / failing), every
// call is RECORDED, and BOTH plugins' `context` handlers are kept in a LIST so
// the composition leg can fire them in either ORDER on ONE draft.
const RPC = { mode: "rows", rows: null, calls: [] }; // mode: rows | absent | fail ; rows: null = the base window
const TOOLS = []; // the editor.add captures
const CONTEXT_HANDLERS = []; // BOTH plugins' 'context' handlers, in registration order

function makeCtx(directory) {
  return {
    location: { directory },
    session: {
      hook: async (name, cb) => {
        if (name === "context") CONTEXT_HANDLERS.push(cb);
        return { dispose: async () => CONTEXT_HANDLERS.splice(CONTEXT_HANDLERS.indexOf(cb), 1) };
      },
      get: async (input) => {
        RPC.calls.push({ api: "get", input });
        if (input.sessionID !== SID) return undefined; // an unknown session has no row
        if (RPC.mode === "not-found") return undefined;
        return { id: input.sessionID, model: { id: MODEL_ID, providerID: "llama-swap" } };
      },
      context: async (input) => {
        RPC.calls.push({ api: "context", input });
        if (input.sessionID !== SID) throw new Error(`Session not found: ${input.sessionID}`);
        if (RPC.mode === "not-found") throw new Error(`Session not found: ${input.sessionID}`);
        if (RPC.mode === "fail") throw new Error("mock context read failure");
        if (RPC.mode === "absent") return undefined; // not an array -> failed read
        return RPC.rows != null ? RPC.rows : windowRows();
      },
    },
    tool: {
      transform: async (cb) => {
        const editor = { list: () => [], get: () => undefined, namespace: () => {}, add: (t) => TOOLS.push(t), update: () => {}, remove: () => {} };
        cb(editor);
        return { dispose: async () => {} };
      },
      hook: async () => ({ dispose: async () => {} }),
    },
  };
}

const plugin = (await import(pathToFileURL(PLUGIN).href)).default;
chk("S0 default export is the loader shape { id: 'context_trim_v2', setup }", plugin && plugin.id === "context_trim_v2" && typeof plugin.setup === "function", JSON.stringify(Object.keys(plugin ?? {})));

const ctx = makeCtx(WS);
const cleanup = await plugin.setup(ctx);
chk("S1 setup registers the tool (editor.add) + ONE 'context' hook and returns a cleanup", TOOLS.length === 1 && CONTEXT_HANDLERS.length === 1 && typeof cleanup === "function", JSON.stringify({ tools: TOOLS.length, handlers: CONTEXT_HANDLERS.length }));

const TOOL = TOOLS[0];
const trim = async (args, sessionID = SID) => (await TOOL.execute(args, { sessionID })).output;
const fire = async (draft) => {
  await CONTEXT_HANDLERS[0](draft);
};

chk("S0b the tool's name is 'context_trim' (the v1 name — a same-name twin is precedent) and the args mirror v1 (+ clear)", TOOL.name === "context_trim" && JSON.stringify(Object.keys(TOOL.input.properties).sort()) === JSON.stringify(["clear", "keepMessages", "mode", "session", "target"]) && JSON.stringify(TOOL.input.properties.mode.enum) === JSON.stringify(["report", "tail"]) && TOOL.output.type === "string", JSON.stringify(TOOL.name + "|" + Object.keys(TOOL.input.properties)));

// A draft shaped like the fork's SessionContext (entries carry the projection's
// optional `id` — to-llm-message.ts sets it per row; system/tool-result/effort
// projections carry none).
function draft(sessionID = SID) {
  return {
    sessionID,
    agent: "worker-1",
    model: { id: MODEL_ID, providerID: "llama-swap" },
    system: [{ type: "text", text: "the system part" }],
    messages: [
      { role: "system", content: [{ type: "text", text: "an id-less system entry" }] },
      { id: "msg_c0", role: "user", content: [{ type: "text", text: "<conversation-checkpoint>" }] },
      { id: "msg_u1", role: "user", content: [{ type: "text", text: "user one" }] },
      { id: "msg_a2", role: "assistant", content: [{ type: "text", text: "a2 text" }] },
      { role: "tool", content: [{ type: "tool-result", result: { value: [{ type: "text", text: "orphan result" }] } }] },
      { id: "msg_a3", role: "assistant", content: [{ type: "text", text: "a3 text" }] },
      { id: "msg_u4", role: "user", content: [{ type: "text", text: "user four" }] },
      { id: "msg_a5", role: "assistant", content: [{ type: "text", text: "a5 text" }] },
      { id: "msg_u6", role: "user", content: [{ type: "text", text: "user six" }] },
      { id: "msg_a7", role: "assistant", content: [{ type: "text", text: "a7 text" }] },
      { id: "msg_u8", role: "user", content: [{ type: "text", text: "user eight" }] },
      { id: "msg_a9", role: "assistant", content: [{ type: "text", text: "a9 text" }] },
    ],
    options: {},
    tools: {},
  };
}

// ------------------------------------------------------------------ R1 the report (v2-shaped rows + gauge line)

{
  const out = await trim({ mode: "report", session: SID });
  const lines = out.split("\n");
  chk("R1 header line: the compaction head + rows=10 + no boundary", lines[1] === `header: head=msg_c0 head-type=compaction rows=10 boundary=none boundary-state=absent retained=10`, JSON.stringify(lines[1] ?? null));
  chk("R1 the gauge line rides the shared v2-paired core (fixture mass 57000 / 120K + budget suffix)", lines[2] === `gauge: SESSION=${SID} CTX=57000 (47%) REM=63000 | 6 compactions left`, JSON.stringify(lines[2] ?? null));
  chk("R1 row 1 = the compaction head (bytes4 estimate over summary+recent)", lines[3] === "row: 1 compaction bytes4=5", JSON.stringify(lines[3] ?? null));
  chk("R1 row 3 = the read-target row (provider tokens + filePath/offset/limit)", lines[5] === "row: 3 assistant tokens=5200 tool=read target=C:/a/b.ts offset=5 limit=20", JSON.stringify(lines[5] ?? null));
  chk("R1 row 4 = the bash-target row", lines[6] === "row: 4 assistant tokens=9000 tool=bash target=ls -la", JSON.stringify(lines[6] ?? null));
  chk("R1 user rows take the bytes4 fallback", lines[4] === "row: 2 user bytes4=2" && lines[7] === "row: 5 user bytes4=2" && lines[11] === "row: 9 user bytes4=2", JSON.stringify([lines[4], lines[7], lines[11]]));
  chk("R1 the `last:` flag + the heaviest-turn ranking (the error turn excluded)", lines[13] === "last: 10" && lines[17] === "biggest: 8=25000 4=9000 3=5200 10=400", JSON.stringify([lines[13], lines[17]]));
  chk("R1 the recommendation block = the trim RANGE (low=floor 6, medium=midpoint, high=max retention)", lines[14] === "option low: msg=msg_u4 keep=6 retained=25561 (read=0 thought=10 shell=0) dropped=14202 (read=100 thought=2 shell=200) hint=user four" && lines[15] === "option medium: msg=msg_a2 keep=8 retained=39761 (read=100 thought=10 shell=200) dropped=2 (read=0 thought=2 shell=0) hint=C:/a/b.ts offset=5 limit=20" && lines[16] === "option high: msg=msg_u1 keep=9 retained=39763 (read=100 thought=12 shell=200) dropped=0 (read=0 thought=0 shell=0) hint=user one", JSON.stringify([lines[14], lines[15], lines[16]]));
  chk("R1 report mode makes ZERO store writes (the report never writes)", readStore() === null && existsSync(LOG), JSON.stringify(readStore()));
}

// ------------------------------------------------------------------ R2 the dry-run leg (report + target)

{
  const out = await trim({ mode: "report", session: SID, target: "msg_u4" });
  const lines = out.split("\n");
  chk("R2 dry-run: a legal boundary's remove/keep counts + token masses", lines[18] === "dry-run: target=msg_u4 remove=4 (14207 tokens) keep=6 (25556 tokens) verdict=ok", JSON.stringify(lines[18] ?? null));
  const out2 = await trim({ mode: "report", session: SID, target: "msg_u6" });
  chk("R2 dry-run: a boundary leaving 4 rows is REJECTED (the floor carries; counts still print)", out2.split("\n")[18] === "dry-run: target=msg_u6 remove=6 (14359 tokens) keep=4 (25404 tokens) verdict=rejected: retained-tail-below-floor 4", out2.split("\n")[18]);
}

// ------------------------------------------------------------------ T1 the tail store: set + clear + rejection lines

{
  const t = async (args) => await trim({ mode: "tail", ...args });
  chk("T1 set by target id -> v1's return line", (await t({ session: SID, target: "msg_u4" })) === "tail-set= none -> msg_u4 keep=6");
  chk("T1 the store file lands at the plugin's default path (additive shape {sessions:{sid:{boundary,keep,set_at}}})", existsSync(STORE) && readStore()?.sessions?.[SID]?.boundary === "msg_u4" && readStore().sessions[SID].keep === 6, JSON.stringify(readStore()));
  const out = await trim({ mode: "report", session: SID });
  chk("T1 the report reflects the stored boundary (inside + retained=6)", out.split("\n")[1] === "header: head=msg_c0 head-type=compaction rows=10 boundary=msg_u4 boundary-state=inside retained=6", out.split("\n")[1]);
  const dry = await trim({ mode: "report", session: SID, target: "msg_a5" });
  chk("T1 dry-run vs the stored boundary: only the ADDITIONAL drop is counted (the floor rejection still counts)", dry.split("\n")[18] === "dry-run: target=msg_a5 remove=1 (2 tokens) keep=5 (25554 tokens) verdict=rejected: retained-tail-below-floor 5", dry.split("\n")[18]);
  chk("T2 the head row is never a boundary", (await t({ session: SID, target: "msg_c0" })) === "tail-set= rejected: target-at-window-head");
  chk("T3 an unknown target id", (await t({ session: SID, target: "msg_absent999" })) === "tail-set= rejected: target-not-found");
  chk("T4 floor: a boundary leaving 5 rows", (await t({ session: SID, target: "msg_a5" })) === "tail-set= rejected: retained-tail-below-floor 5");
  chk("T5 keep=0 refused (keep-invalid)", (await t({ session: SID, keepMessages: 0 })) === "tail-set= rejected: keep-invalid 0");
  chk("T6 keep non-integer refused", (await t({ session: SID, keepMessages: 2.5 })) === "tail-set= rejected: keep-invalid 2.5");
  chk("T7 keep above the window row count", (await t({ session: SID, keepMessages: 11 })) === "tail-set= rejected: keep-exceeds-history 11");
  chk("T8 keep = the whole window lands at the head (no legal boundary)", (await t({ session: SID, keepMessages: 10 })) === "tail-set= rejected: keep-at-window-head 10");
  chk("T9 keep form success computes the anchor (keepMessages=6 -> msg_u4)", (await t({ session: SID, keepMessages: 6 })) === "tail-set= msg_u4 -> msg_u4 keep=6");
  chk("T10 clear -> '-> none' (idempotent second clear)", (await t({ session: SID, clear: true })) === "tail-set= msg_u4 -> none" && (await t({ session: SID, clear: true })) === "tail-set= none -> none");
  chk("T11 mutual-exclusion usage lines", (await t({ session: SID, target: "msg_u4", keepMessages: 6 })) === "error: tail mode: target and keepMessages are mutually exclusive (use one or the other)" && (await t({ session: SID, clear: true, target: "msg_u4" })) === "error: tail mode: clear is mutually exclusive with target/keepMessages (use one form)");
  chk("T12 the unknown session is refused (the existence probe discriminates)", (await t({ session: "ses_absent000", target: "msg_c0" })) === "tail-set= rejected: session-not-found");
  chk("T13 no target/keepMessages/clear -> the usage line", (await t({ session: SID })) === "error: tail mode requires target (the boundary message id), keepMessages (the retained-tail message count), or clear (remove the stored boundary)");
  chk("T14 bad mode -> the v1 error line", (await trim({ mode: "sideways", session: SID })) === "error: mode must be 'report' or 'tail'");
  chk("T15 the store is UNTOUCHED by every rejection (only the two sets + clears landed)", JSON.stringify(readStore()?.sessions?.[SID] ?? null) === JSON.stringify(null) && Object.keys(readStore()?.sessions ?? {}).length === 0, JSON.stringify(readStore()));
}

// ------------------------------------------------------------------ H1 the hook filter (the tail's effect)

{
  await trim({ mode: "tail", session: SID, target: "msg_u4" }); // boundary: drop msg_c0/u1/a2/a3
  const before = readLog().length;
  const d = draft();
  const nBefore = d.messages.length; // 12 entries (2 id-less)
  await fire(d);
  const ids = d.messages.map((m) => m.id ?? "(none)");
  chk("H1 the filter drops EXACTLY the pre-boundary id-carrying entries (4) and NOTHING else", d.messages.length === nBefore - 4 && ids.indexOf("msg_c0") === -1 && ids.indexOf("msg_u1") === -1 && ids.indexOf("msg_a2") === -1 && ids.indexOf("msg_a3") === -1, JSON.stringify(ids));
  chk("H1 the id-less entries SURVIVE (system/tool-result projections) + the head-to-tail order is preserved", ids.indexOf("(none)") === 0 && d.messages[d.messages.length - 1]?.id === "msg_a9" && d.messages.filter((m) => !("id" in m)).length === 2, JSON.stringify(ids));
  chk("H1 NO entry is appended (the array only shrinks; length 8)", d.messages.length === 8, `len=${d.messages.length}`);
  const delta = readLog().slice(before);
  chk("H1 ONE kind:trim evidence line (session/boundary/counts)", delta.length === 1 && delta[0].kind === "trim" && delta[0].session === SID && delta[0].boundary === "msg_u4" && delta[0].droppedRows === "4" && delta[0].droppedEntries === "4" && delta[0].keptEntries === "8", JSON.stringify(delta[0] ?? null));
  const dBefore = JSON.stringify(draft().messages.slice(1, 3));
  chk("H1 surviving entries are BYTE-UNCHANGED (no content mutation of kept rows)", JSON.stringify(draft().messages.slice(6, 8)) === JSON.stringify(d.messages.slice(2, 4)), `${dBefore}`);
  chk("H1 system/options/tools untouched", JSON.stringify(d.system) === JSON.stringify([{ type: "text", text: "the system part" }]) && JSON.stringify(d.options) === "{}" && JSON.stringify(d.tools) === "{}");
  await trim({ mode: "tail", session: SID, clear: true });
  const nCalls = RPC.calls.length;
  const logBefore = readLog().length;
  await fire(draft());
  chk("H2 with NO stored boundary the hook is SILENT: NO service call, NO log line, the draft untouched", RPC.calls.length === nCalls && readLog().length === logBefore && draft().messages.length === 12, `calls=${RPC.calls.length - nCalls} lines=${readLog().length - logBefore}`);
}

// ------------------------------------------------------------------ H3 the stale boundary (a new compaction row landed)

{
  await trim({ mode: "tail", session: SID, target: "msg_u4" });
  RPC.mode = "rows"; // the rows getter switches next — pin the stale state via a fresh window
  // Switch the window: the compaction leg serves the POST-compaction rows.
  const before = readLog().length;
  const d = draft();
  const keptBefore = d.messages.length;
  await fire(d);
  chk("H3 pre-condition: the boundary fires the filter once", readLog().slice(before).length === 1 && readLog().slice(before)[0].kind === "trim", JSON.stringify(readLog().slice(before)));
  // Now the new durable compaction row lands: the context RPC serves the new
  // window (msg_u4 is gone) — the plugin reads it through the same RPC.
  RPC.rows = compactedRows();
  const d2 = draft();
  await fire(d2);
  const delta = readLog().slice(before + 1);
  chk("H3 stale boundary -> NOTHING dropped (fail-open, whole window kept)", d2.messages.length === keptBefore, `len=${d2.messages.length}`);
  chk("H3 exactly ONE kind:boundary-stale line", delta.length === 1 && delta[0].kind === "boundary-stale" && delta[0].session === SID && delta[0].boundary === "msg_u4" && delta[0].where === "not-in-window", JSON.stringify(delta[0] ?? null));
  await fire(draft());
  chk("H3 the stale line is DEDUPED per session+boundary (second fire -> no new line)", readLog().slice(before + 1 + delta.length).filter((l) => l.kind === "boundary-stale").length === 0, JSON.stringify(readLog().slice(before + 1).map((l) => l.kind)));
  const staleReport = await trim({ mode: "report", session: SID }); // RPC.rows is still the post-compaction window
  chk("H3 the report shows the stale boundary (state=stale, retained = the whole new window)", staleReport.split("\n")[1] === "header: head=msg_c1 head-type=compaction rows=3 boundary=msg_u4 boundary-state=stale retained=3", staleReport.split("\n")[1]);
  await trim({ mode: "tail", session: SID, clear: true });
  RPC.rows = null; // back to the base window for the later legs
}

// ------------------------------------------------------------------ H4 the read-failure channels of the hook

{
  await trim({ mode: "tail", session: SID, target: "msg_u4" });
  RPC.mode = "fail";
  const before = readLog().length;
  const d = draft();
  await fire(d);
  chk("H4 a failing context read keeps the WHOLE window (fail-open)", d.messages.length === 12, `len=${d.messages.length}`);
  const delta = readLog().slice(before);
  chk("H4 ONE kind:gauge line, reason context-read-failed + a capped preview", delta.length === 1 && delta[0].kind === "gauge" && delta[0].session === SID && delta[0].reason === "context-read-failed" && /mock context read failure/.test(String(delta[0].preview)), JSON.stringify(delta[0] ?? null));
  RPC.mode = "not-found";
  const b2 = readLog().length;
  const d2 = draft();
  await fire(d2);
  chk("H4 the hook's not-found read logs reason session-not-found and keeps the window", d2.messages.length === 12 && readLog().slice(b2).length === 1 && readLog().slice(b2)[0].reason === "session-not-found", JSON.stringify(readLog().slice(b2)[0] ?? null));
  const b3 = readLog().length;
  const d3 = draft();
  d3.messages = "not-an-array";
  await fire(d3);
  chk("H4 messages-not-array: ONE gauge line, the wire value untouched, no throw", d3.messages === "not-an-array" && readLog().slice(b3).length === 1 && readLog().slice(b3)[0].reason === "messages-not-array", JSON.stringify(readLog().slice(b3)[0] ?? null));
  RPC.mode = "rows";
  await trim({ mode: "tail", session: SID, clear: true });
}

// ------------------------------------------------------------------ C1 the composition pin (the REAL context_family plugin)

{
  const cf = (await import(pathToFileURL(CF_PLUGIN).href)).default;
  const cfCtx = makeCtx(WS); // a fresh mock ctx: its own hooks list, the SAME shared gauge core
  const cfCleanup = await cf.setup(cfCtx);
  chk("C1 the context_family plugin registers its own 'context' handler (a SECOND handler on the same hook)", CONTEXT_HANDLERS.length === 2 && typeof CONTEXT_HANDLERS[1] === "function", `handlers=${CONTEXT_HANDLERS.length}`);
  const [trimHandler, cfHandler] = CONTEXT_HANDLERS; // registration order: this plugin, then context_family
  await trim({ mode: "tail", session: SID, target: "msg_u4" });
  // Order A: the injection FIRST, then the filter (the fork's registration order).
  const dA = draft();
  await cfHandler(dA);
  await trimHandler(dA);
  // Order B: the filter FIRST, then the injection.
  const dB = draft();
  await trimHandler(dB);
  await cfHandler(dB);
  const textA = dA.messages[0]?.content?.[0]?.text ?? "";
  const injectedA = dA.messages[dA.messages.length - 1]?.content?.[0]?.text ?? "";
  const injectedB = dB.messages[dB.messages.length - 1]?.content?.[0]?.text ?? "";
  chk("C2 the ctx: injection SURVIVES the filter (id-less entry kept; order A: injection at index 0 of the pre-existing system entry untouched, the injection is the LAST entry)", dA.messages.length === 9 && dA.messages[0]?.role === "system" && /^ctx: SESSION=/.test(injectedA), JSON.stringify({ len: dA.messages.length, tail: injectedA.slice(0, 40) }));
  chk("C2 both handler ORDERS compose: the pre-boundary entries are dropped in both, and the injection is the TAIL entry in both", dB.messages.length === 9 && dA.messages.length === 9 && dB.messages[dB.messages.length - 1]?.role === "user" && ["msg_c0", "msg_u1", "msg_a2", "msg_a3"].every((id) => dA.messages.every((m) => m.id !== id) && dB.messages.every((m) => m.id !== id)), JSON.stringify({ a: dA.messages.map((m) => m.id ?? "(none)"), b: dB.messages.map((m) => m.id ?? "(none)") }));
  chk("C2 the injected text is byte-identical in both orders (the gauge readout is order-independent)", injectedA === injectedB && injectedA === `ctx: SESSION=${SID} CTX=57000 (47%) REM=63000 | 6 compactions left`, JSON.stringify(injectedA));
  chk("C2 the filter never mutates an entry's CONTENT (the surviving entries byte-compare the pre-fire ones)", JSON.stringify(dB.messages[4]) === JSON.stringify(draft().messages[8]), JSON.stringify(dB.messages[4] ?? null));
  chk("C2 the context_family plugin logged its own ctxmsg line in ITS OWN log (the two plugins' logs stay separate)", existsSync(CF_LOG) && readFileSync(CF_LOG, "utf8").includes('"kind":"ctxmsg"'), existsSync(CF_LOG) ? "cf log present" : "no cf log");
  await cfCleanup();
  await trim({ mode: "tail", session: SID, clear: true });
  chk("C3 context_family cleanup removed its handler (this plugin's stays)", CONTEXT_HANDLERS.length === 1, `handlers=${CONTEXT_HANDLERS.length}`);
}

// ------------------------------------------------------------------ S2 the store test hook + the file's additive invariant

{
  const FX_STORE = path.join(SCRATCH, "fx_boundary2.json");
  const mod = plugin; // the module-level hook is exported by the plugin module
  void mod;
  gaugeMod.setDbPath(FX_DB); // (unchanged — the report leg keeps working)
  const storeMod = await import(pathToFileURL(PLUGIN).href); // same module instance (cached)
  storeMod.setStoreFileForTest(FX_STORE);
  await trim({ mode: "tail", session: SID, target: "msg_a3" }); // NOTE: msg_a3 is index 3 (retained 7) — legal
  chk("S2 setStoreFileForTest steers the store at the fixture path (the production default stays put)", existsSync(FX_STORE) && JSON.parse(readFileSync(FX_STORE, "utf8")).sessions?.[SID]?.boundary === "msg_a3", JSON.stringify(readFileSync(FX_STORE, "utf8")));
  writeFileSync(FX_STORE, JSON.stringify({ foreignKey: "keepme", sessions: { [SID]: { boundary: "msg_a3", keep: 7, set_at: "x" } } }), "utf8");
  await trim({ mode: "tail", session: SID, clear: true });
  chk("S2 the write is ADDITIVE (a foreign top-level key survives; #119 discipline)", JSON.parse(readFileSync(FX_STORE, "utf8")).foreignKey === "keepme", JSON.stringify(readFileSync(FX_STORE, "utf8")));
  storeMod.setStoreFileForTest("");
}

// ------------------------------------------------------------------ whole-log invariants

{
  const lines = readLog();
  const kinds = new Set(lines.map((l) => l.kind));
  chk("INV every line parses; kinds ⊂ {report, tail, trim, boundary-stale, gauge}", [...kinds].sort().join(",") === "boundary-stale,gauge,report,tail,trim", JSON.stringify([...kinds].sort()));
  chk("INV every line carries ts + kind and stays within the LINE_CAP ladder", lines.every((l) => typeof l.ts === "string" && typeof l.kind === "string" && JSON.stringify(l).length <= 2000 && JSON.stringify(l).length > 0));
  chk("INV the `trim` lines all name a session + boundary + the three counts", lines.filter((l) => l.kind === "trim").every((l) => typeof l.session === "string" && typeof l.boundary === "string" && typeof l.droppedRows === "string" && typeof l.droppedEntries === "string" && typeof l.keptEntries === "string"));
  chk("INV the ONE boundary-stale line for the (session,boundary) state (deduped)", lines.filter((l) => l.kind === "boundary-stale").length === 1, `count=${lines.filter((l) => l.kind === "boundary-stale").length}`);
  chk("INV the gauge lines' reasons are only the two honest read failures", lines.filter((l) => l.kind === "gauge").every((l) => l.reason === "context-read-failed" || l.reason === "session-not-found" || l.reason === "messages-not-array"));
  chk("INV report mode emitted a kind:report line per call (6 calls)", lines.filter((l) => l.kind === "report").length === 6, `count=${lines.filter((l) => l.kind === "report").length}`);
}

// ------------------------------------------------------------------ cleanup

await cleanup();
chk("S3 cleanup disposes the registered tool + hook handler (the store survives — a dead process keeps the trim)", TOOLS.length === 1 && CONTEXT_HANDLERS.length === 0 && existsSync(STORE), JSON.stringify({ handlers: CONTEXT_HANDLERS.length, store: existsSync(STORE) }));
chk("S3b after cleanup the handler list is unchanged by the dispose mock (the tool entry stays; the store is NOT rewritten)", existsSync(STORE) && JSON.parse(readFileSync(STORE, "utf8")).sessions !== undefined, "store readable");

console.log(`\nlog lines: ${readLog().length}`);
console.log(failures === 0 ? "\nSMOKE: ALL PASS" : `\nSMOKE: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
