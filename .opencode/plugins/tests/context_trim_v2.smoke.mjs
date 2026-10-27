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
// block with the REAL context_family plugin on the CURRENT channel (#157 re-pin,
// 2026-10-26): context_family registers EXACTLY `execute.before` + `execute.after`
// and APPENDS its gauge line to the tool result (#153), so the trim draft filter
// and the append compose across TWO channels, never on one draft array.
//
// U6 (#190, 2026-10-27): the M-block pins the per-message MARK set (the (8)
// lane): mark-set round-trip + token est, the hook dropping EXACTLY the marked
// entries (no boundary), head/floor/not-found rejections, the mark-clear vs
// tail-clear symmetry, the stale-mark ignore with ONE deduped marks-stale line,
// the report header marks= fields, and the #189 two-quantity line. The
// CTX_TRIM_SMOKE_{PLUGIN,CF,GAUGE} env vars steer the imported trio at scratch
// copies (the live-file cost rule: a write under .opencode/plugins/** hot-loads
// and re-prefills every live session); unset = the committed real paths.
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
// The repo root this suite lives in (`.opencode/plugins/tests` -> up 3). Resolved
// from the file so the suite runs in whatever checkout owns the tests dir — the
// old absolute archived-clone path no longer exists on this machine (TODO #156,
// 2026-10-26).
const CLONE_ROOT = path.join(import.meta.dirname, "..", "..", "..");
const PLUGIN = process.env.CTX_TRIM_SMOKE_PLUGIN ?? path.join(CLONE_ROOT, ".opencode", "plugins", "context_trim_v2.ts");
const CF_PLUGIN = process.env.CTX_TRIM_SMOKE_CF ?? path.join(CLONE_ROOT, ".opencode", "plugins", "context_family.ts");
const GAUGE = process.env.CTX_TRIM_SMOKE_GAUGE ?? path.join(CLONE_ROOT, ".opencode", "plugins", "scripts", "gauge.mjs");
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
// call is RECORDED, the trim plugin's `context` draft handler is kept in a LIST,
// and the TOOL hooks (name -> handler) are kept per ctx so the composition leg can
// fire context_family's `execute.after` append on the same mock workspace (#157).
const RPC = { mode: "rows", rows: null, calls: [] }; // mode: rows | absent | fail ; rows: null = the base window
const TOOLS = []; // the editor.add captures
const CONTEXT_HANDLERS = []; // the trim plugin's 'context' draft handlers, in registration order

function makeCtx(directory) {
  const TOOL_HOOKS = {}; // tool hook name -> handler (execute.before / execute.after)
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
      hook: async (name, cb) => {
        TOOL_HOOKS[name] = cb;
        return { dispose: async () => delete TOOL_HOOKS[name] };
      },
    },
    _hooks: TOOL_HOOKS, // the composition leg fires these directly
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

chk("S0b the tool's name is 'context_trim' (the v1 name — a same-name twin is precedent) and the args mirror v1 (+ clear, + (8) mark mode with ids/unmark)", TOOL.name === "context_trim" && JSON.stringify(Object.keys(TOOL.input.properties).sort()) === JSON.stringify(["clear", "ids", "keepMessages", "mode", "session", "target", "unmark"]) && JSON.stringify(TOOL.input.properties.mode.enum) === JSON.stringify(["report", "tail", "mark"]) && TOOL.output.type === "string", JSON.stringify(TOOL.name + "|" + Object.keys(TOOL.input.properties)));

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
  chk("R1 header line: the compaction head + rows=10 + no boundary + empty mark set", lines[1] === `header: head=msg_c0 head-type=compaction rows=10 boundary=none boundary-state=absent retained=10 marks=0 marks-est=0`, JSON.stringify(lines[1] ?? null));
  chk("R1 (#189 bundled) the two-quantity line: window_rows != request + request-est + window-est", lines[2] === "window_rows != request; request also carries system prompt + retained slice request-est=57000 window-est=39763", JSON.stringify(lines[2] ?? null));
  chk("R1 the gauge line rides the shared v2-paired core (fixture mass 57000 / 120K + budget suffix)", lines[3] === `gauge: SESSION=${SID} CTX=57000 (47%) REM=63000 | 6 compactions left`, JSON.stringify(lines[3] ?? null));
  chk("R1 row 1 = the compaction head (bytes4 estimate over summary+recent) + the id anchor", lines[4] === "row: 1 compaction id=msg_c0 bytes4=5", JSON.stringify(lines[4] ?? null));
  chk("R1 row 3 = the read-target row (provider tokens + filePath/offset/limit)", lines[6] === "row: 3 assistant id=msg_a2 tokens=5200 tool=read target=C:/a/b.ts offset=5 limit=20", JSON.stringify(lines[6] ?? null));
  chk("R1 row 4 = the bash-target row", lines[7] === "row: 4 assistant id=msg_a3 tokens=9000 tool=bash target=ls -la", JSON.stringify(lines[7] ?? null));
  chk("R1 user rows take the bytes4 fallback", lines[5] === "row: 2 user id=msg_u1 bytes4=2" && lines[8] === "row: 5 user id=msg_u4 bytes4=2" && lines[12] === "row: 9 user id=msg_u8 bytes4=2", JSON.stringify([lines[5], lines[8], lines[12]]));
  chk("R1 the `last:` flag + the heaviest-turn ranking (the error turn excluded)", lines[14] === "last: 10" && lines[18] === "biggest: 8=25000 4=9000 3=5200 10=400", JSON.stringify([lines[14], lines[18]]));
  chk("R1 the recommendation block = the trim RANGE (low=floor 6, medium=midpoint, high=max retention)", lines[15] === "option low: msg=msg_u4 keep=6 retained=25561 (read=0 thought=10 shell=0) dropped=14202 (read=100 thought=2 shell=200) hint=user four" && lines[16] === "option medium: msg=msg_a2 keep=8 retained=39761 (read=100 thought=10 shell=200) dropped=2 (read=0 thought=2 shell=0) hint=C:/a/b.ts offset=5 limit=20" && lines[17] === "option high: msg=msg_u1 keep=9 retained=39763 (read=100 thought=12 shell=200) dropped=0 (read=0 thought=0 shell=0) hint=user one", JSON.stringify([lines[15], lines[16], lines[17]]));
  chk("R1 report mode makes ZERO store writes (the report never writes)", readStore() === null && existsSync(LOG), JSON.stringify(readStore()));
}

// ------------------------------------------------------------------ R2 the dry-run leg (report + target)

{
  const out = await trim({ mode: "report", session: SID, target: "msg_u4" });
  const lines = out.split("\n");
  chk("R2 dry-run: a legal boundary's remove/keep counts + token masses", lines[19] === "dry-run: target=msg_u4 remove=4 (14207 tokens) keep=6 (25556 tokens) verdict=ok", JSON.stringify(lines[19] ?? null));
  const out2 = await trim({ mode: "report", session: SID, target: "msg_u6" });
  chk("R2 dry-run: a boundary leaving 4 rows is REJECTED (the floor carries; counts still print)", out2.split("\n")[19] === "dry-run: target=msg_u6 remove=6 (14359 tokens) keep=4 (25404 tokens) verdict=rejected: retained-tail-below-floor 4", out2.split("\n")[19]);
}

// ------------------------------------------------------------------ T1 the tail store: set + clear + rejection lines

{
  const t = async (args) => await trim({ mode: "tail", ...args });
  chk("T1 set by target id -> v1's return line", (await t({ session: SID, target: "msg_u4" })) === "tail-set= none -> msg_u4 keep=6");
  chk("T1 the store file lands at the plugin's default path (additive shape {sessions:{sid:{boundary,keep,set_at}}})", existsSync(STORE) && readStore()?.sessions?.[SID]?.boundary === "msg_u4" && readStore().sessions[SID].keep === 6, JSON.stringify(readStore()));
  const out = await trim({ mode: "report", session: SID });
  chk("T1 the report reflects the stored boundary (inside + retained=6)", out.split("\n")[1] === "header: head=msg_c0 head-type=compaction rows=10 boundary=msg_u4 boundary-state=inside retained=6 marks=0 marks-est=0", out.split("\n")[1]);
  const dry = await trim({ mode: "report", session: SID, target: "msg_a5" });
  chk("T1 dry-run vs the stored boundary: only the ADDITIONAL drop is counted (the floor rejection still counts)", dry.split("\n")[19] === "dry-run: target=msg_a5 remove=1 (2 tokens) keep=5 (25554 tokens) verdict=rejected: retained-tail-below-floor 5", dry.split("\n")[19]);
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
  chk("T14 bad mode -> the v1 error line (U6: the line names the third mode)", (await trim({ mode: "sideways", session: SID })) === "error: mode must be 'report', 'tail', or 'mark'");
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
  chk("H3 the report shows the stale boundary (state=stale, retained = the whole new window)", staleReport.split("\n")[1] === "header: head=msg_c1 head-type=compaction rows=3 boundary=msg_u4 boundary-state=stale retained=3 marks=0 marks-est=0", staleReport.split("\n")[1]);
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

// ------------------------------------------------------------------ M the per-message mark set (the (8) lane, #190 U6)

{
  const m = async (args) => await trim({ mode: "mark", ...args });
  const marksOf = () => JSON.stringify(readStore()?.sessions?.[SID]?.marks ?? null);
  // M1 the store round-trip + the success line (tokens, never bytes: msg_u1 bytes4=2 + msg_a3 tokens=9000)
  chk("M1 mark ids -> the +n/-m/total/est line", (await m({ session: SID, ids: ["msg_u1", "msg_a3"] })) === "mark-set= +2 -0 total=2 rows_dropped_est=9002");
  chk("M1 marks land in the store next to the (empty) boundary lane; order-preserved, de-dup; the marks key stays absent when empty", readStore()?.sessions?.[SID]?.boundary === "" && marksOf() === JSON.stringify(["msg_u1", "msg_a3"]), marksOf());
  // M2 the hook drops EXACTLY the marked ids (NO boundary set)
  const mb = readLog().length;
  const dm = draft();
  await fire(dm);
  const idsM = dm.messages.map((x) => x.id ?? "(none)");
  chk("M2 the hook drops EXACTLY the two marked entries and NOTHING else (head + id-less survive, order kept)", dm.messages.length === 10 && !idsM.includes("msg_u1") && !idsM.includes("msg_a3") && idsM.includes("msg_c0") && idsM[0] === "(none)" && idsM[idsM.length - 1] === "msg_a9", JSON.stringify(idsM));
  const dM = readLog().slice(mb);
  chk("M2 ONE kind:trim line (boundary none, marks=2, 2 rows/2 entries dropped, 10 kept)", dM.length === 1 && dM[0].kind === "trim" && dM[0].boundary === "none" && dM[0].marks === "2" && dM[0].droppedRows === "2" && dM[0].droppedEntries === "2" && dM[0].keptEntries === "10", JSON.stringify(dM[0] ?? null));
  chk("M2 unmark restores one id (est over the REMAINING live marks)", (await m({ session: SID, unmark: ["msg_a3"] })) === "mark-set= +0 -1 total=1 rows_dropped_est=2" && marksOf() === JSON.stringify(["msg_u1"]));
  // M3-M5b fail-closed rejections (the store stays UNTOUCHED by each)
  chk("M3 head mark rejected (the head carries the summary)", (await m({ session: SID, ids: ["msg_c0"] })) === "mark-set= rejected: mark-at-window-head" && marksOf() === JSON.stringify(["msg_u1"]));
  chk("M4 an id outside the window rows", (await m({ session: SID, ids: ["msg_absent999"] })) === "mark-set= rejected: mark-not-found" && marksOf() === JSON.stringify(["msg_u1"]));
  chk("M5 floor without boundary: 5 live marks on the 10-row window leave 5 (< 6); the dupe id is a no-op, not a re-validate", (await m({ session: SID, ids: ["msg_u1", "msg_a2", "msg_a3", "msg_u4", "msg_a5"] })) === "mark-set= rejected: mark-floor 5" && marksOf() === JSON.stringify(["msg_u1"]));
  chk("M5b marks + inside boundary floor combined: the boundary keeps 6, one further mark rejected", (await trim({ session: SID, mode: "tail", target: "msg_u4" })) === "tail-set= none -> msg_u4 keep=6" && (await m({ session: SID, ids: ["msg_a9"] })) === "mark-set= rejected: mark-floor 5" && marksOf() === JSON.stringify(["msg_u1"]));
  // M6 the mark-clear vs tail-clear symmetry
  chk("M6 mark clear empties ONLY the marks (the boundary stays)", (await m({ session: SID, clear: true })) === "mark-set= +0 -1 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID]?.boundary === "msg_u4" && marksOf() === "null");
  const dm6 = draft();
  await fire(dm6);
  chk("M6 the boundary STILL applies after the mark clear (4 pre-boundary entries dropped, 12 -> 8)", dm6.messages.length === 8, `len=${dm6.messages.length}`);
  chk("M6b a boundary-overlap mark passes the floor (already dropped by the boundary rule; est counts it)", (await m({ session: SID, ids: ["msg_a2"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=5200");
  chk("M6c tail clear removes the BOUNDARY and LEAVES the marks (mirror symmetry)", (await trim({ session: SID, mode: "tail", clear: true })) === "tail-set= msg_u4 -> none" && marksOf() === JSON.stringify(["msg_a2"]));
  chk("M6d mark a second id (est over live marks: 5200 + 2)", (await m({ session: SID, ids: ["msg_u1"] })) === "mark-set= +1 -0 total=2 rows_dropped_est=5202");
  // M7 stale marks: the window moved -> ignored, ONE marks-stale line (deduped per count)
  RPC.rows = compactedRows();
  const m7b = readLog().length;
  const d7 = draft();
  await fire(d7);
  chk("M7 a moved window drops NOTHING from stale marks (fail-open; the draft keeps all 12)", d7.messages.length === 12, `len=${d7.messages.length}`);
  const d7l = readLog().slice(m7b);
  chk("M7 exactly ONE kind:marks-stale line (staleMarks=2, marksTotal=2)", d7l.length === 1 && d7l[0].kind === "marks-stale" && d7l[0].session === SID && d7l[0].staleMarks === "2" && d7l[0].marksTotal === "2", JSON.stringify(d7l[0] ?? null));
  await fire(draft());
  chk("M7 marks-stale DEDUPED per (session,count): the second fire adds NO line", readLog().slice(m7b + 1).filter((l) => l.kind === "marks-stale").length === 0, JSON.stringify(readLog().slice(m7b).map((l) => l.kind)));
  RPC.rows = null;
  const d7r = draft();
  await fire(d7r);
  chk("M7 the marks are LIVE again once the window returns (both dropped)", d7r.messages.length === 10 && d7r.messages.every((x) => x.id !== "msg_a2" && x.id !== "msg_u1"), JSON.stringify(d7r.messages.map((x) => x.id ?? "(none)")));
  // M8 clear (idempotent) + the report prints the set + one extra report line for the INV count
  chk("M8 clear empties the set (the entry goes with it; idempotent second clear)", (await m({ session: SID, clear: true })) === "mark-set= +0 -2 total=0 rows_dropped_est=0" && (await m({ session: SID, clear: true })) === "mark-set= +0 -0 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID] === undefined);
  await m({ session: SID, ids: ["msg_u1", "msg_a5"] });
  const rL = (await trim({ mode: "report", session: SID })).split("\n");
  chk("M8 the report header prints the mark set (marks=2 marks-est=152) and the #189 line holds", rL[1].includes("marks=2 marks-est=152") && rL[2].startsWith("window_rows != request"), JSON.stringify([rL[1], rL[2]]));
  await m({ session: SID, clear: true }); // the store is clean for the C block
  // M9 the usage + validation lanes
  chk("M9 usage lines (form guards + id-array validation) + the unknown-session rejection", (await m({ session: SID, clear: true, ids: ["msg_u1"] })) === "error: mark mode: clear is mutually exclusive with ids/unmark (use one form)" && (await m({ session: SID })) === "error: mark mode requires ids (window message ids to drop), unmark (ids to restore), or clear (empty the mark set — a stored boundary stays)" && (await m({ session: SID, ids: "msg_u1" })) === "error: mark mode: ids and unmark must be arrays of non-empty message id strings" && (await trim({ mode: "mark", session: "ses_absent000", ids: ["msg_x"] })) === "mark-set= rejected: session-not-found");
}

// ------------------------------------------------------------------ C1 the composition block (the REAL context_family plugin, the #153 APPEND channel)
// Re-pinned for #157 (2026-10-26): context_family contributes NO draft handler —
// it registers EXACTLY `execute.before` + `execute.after` and appends its gauge
// line to the TOOL RESULT. `context_trim_v2` keeps the draft filter. The legs
// therefore compose across TWO channels; the old "both orders on one draft array"
// pair is repurposed into the registration-shape pin (C1) + the channel-isolation
// pins (C2/C3).

{
  const cf = (await import(pathToFileURL(CF_PLUGIN).href)).default;
  const cfCtx = makeCtx(WS); // its own hook map; the SAME shared gauge core (FX_DB), the same WS log/store root
  const cfCleanup = await cf.setup(cfCtx);
  const G1 = "ctx: CTX=57000 (47%) REM=63000 | 6 compactions left"; // SID fixture: pct 47 < 50 -> NO rung, the gauge-line lane
  const cfLog = () => (existsSync(CF_LOG) ? readFileSync(CF_LOG, "utf8").split("\n").filter((l) => l !== "").map((l) => JSON.parse(l)) : []);
  const afterEvent = (result, tool = "bash") => ({ tool, sessionID: SID, agent: "worker-1", messageID: "msg-c1", id: "call-c1", input: { command: "ls" }, status: "completed", result });
  const trimFilter = CONTEXT_HANDLERS[0]; // this plugin's draft leg
  const onAfter = cfCtx._hooks["execute.after"]; // context_family's append leg
  chk("C1 the composition registration shape (repurposed from the old two-handlers-on-one-draft pin): context_family registers EXACTLY execute.before + execute.after and NO 'context' draft handler — the trim plugin stays the only draft handler", Object.keys(cfCtx._hooks).sort().join(",") === "execute.after,execute.before" && typeof onAfter === "function" && typeof cfCtx._hooks["execute.before"] === "function" && CONTEXT_HANDLERS.length === 1, JSON.stringify({ cf: Object.keys(cfCtx._hooks).sort(), draftHandlers: CONTEXT_HANDLERS.length }));
  // C2 ONE after-event appends EXACTLY one line: the original output survives as a
  // byte prefix and gains ONE text line (the cache-safe append-only tail).
  const ev1 = afterEvent({ output: "the tool output" });
  const cf0 = cfLog().length;
  await onAfter(ev1);
  chk("C2 exactly ONE appended line per after-event (no doubling): result.output = the original bytes + the ctx line", ev1.result.output === `the tool output\n${G1}` && String(ev1.result.output).split("\n").length === 2, JSON.stringify(ev1.result.output));
  const d1 = cfLog().slice(cf0);
  chk("C2 ONE ctx-append evidence line per event in context_family's OWN log (kind ctx-append, the session, gauge=line, the appended text)", d1.length === 1 && d1[0].kind === "ctx-append" && d1[0].session === SID && d1[0].gauge === "line" && d1[0].line === G1, JSON.stringify(d1[0] ?? null));
  // The ctxmsg pin repurposed (#153): the draft-injection kinds are GONE — the CF
  // log carries ctx-append lines ONLY, and the two plugins' logs stay separate.
  chk("C2 the retired kinds are absent: context_family's log holds ctx-append lines ONLY (no ctxmsg, no nudge), and this plugin's log holds none of them", cfLog().every((l) => l.kind === "ctx-append") && !readFileSync(CF_LOG, "utf8").includes('"kind":"ctxmsg"') && !readFileSync(CF_LOG, "utf8").includes('"kind":"nudge"') && !readFileSync(LOG, "utf8").includes("ctx-append"), JSON.stringify({ cf: cfLog().map((l) => l.kind), trimKinds: [...new Set(readLog().map((l) => l.kind))].sort() }));
  // C3 (DoD 2b) the two channels never meet: the draft filter fired ON the
  // after-event object (a tool result, not a draft) leaves the appended bytes
  // INTACT and logs at most its own honest read failure — it cannot mutate a result.
  const trim0 = readLog().length;
  const cf1 = cfLog().length;
  await trimFilter(ev1); // no boundary stored yet -> the draft leg is SILENT (H2 semantics)
  chk("C3 the trim filter never touches a tool result: the appended ctx line survives byte-exact", ev1.result.output === `the tool output\n${G1}`, JSON.stringify(ev1.result.output));
  chk("C3 with NO boundary the draft leg fired ON a tool-result event is SILENT: zero new lines in EITHER log (no mutation path exists)", readLog().length === trim0 && cfLog().length === cf1, JSON.stringify({ trimDelta: readLog().length - trim0, cfDelta: cfLog().length - cf1 }));
  // C4 the economy gate: a second event on an UNMOVED fill appends nothing -> at
  // most one appended line per moved fill (DoD 2a).
  const ev2 = afterEvent({ output: "second call" });
  const cf2 = cfLog().length;
  await onAfter(ev2);
  chk("C4 the economy gate: the second event on the same fill appends NOTHING and logs NOTHING", ev2.result.output === "second call" && cfLog().length === cf2, JSON.stringify({ out: ev2.result.output, delta: cfLog().length - cf2 }));
  // C5 (DoD 2c) the append SURVIVES a trim boundary: the boundary is SET, the draft
  // filter drops the pre-boundary entries, the already-appended result stays INTACT,
  // and a fill that moved >= 1% of the window still appends — the append leg never
  // reads the boundary store.
  await trim({ mode: "tail", session: SID, target: "msg_u4" });
  const dD = draft();
  const trim1 = readLog().length;
  await trimFilter(dD);
  chk("C5 with a boundary set the filter drops EXACTLY the four pre-boundary ids, keeps the id-less entries and appends NOTHING to the draft (12 -> 8)", dD.messages.length === 8 && ["msg_c0", "msg_u1", "msg_a2", "msg_a3"].every((id) => dD.messages.every((m) => m.id !== id)) && dD.messages.filter((m) => m.id === undefined).length === 2, JSON.stringify({ len: dD.messages.length, ids: dD.messages.map((m) => m.id ?? "(none)") }));
  const dtr = readLog().slice(trim1);
  chk("C5 the filter's own ONE trim line lands in ITS log; context_family's log gains nothing from the draft fire", dtr.length === 1 && dtr[0].kind === "trim" && cfLog().length === cf2, JSON.stringify({ trim: dtr.map((l) => l.kind), cfDelta: cfLog().length - cf2 }));
  // (DoD 2b, the boundary-set state): the draft leg ON a tool-result event can only
  // report its honest read failure — it has no path to a tool result at all.
  const trim2 = readLog().length;
  const cf3 = cfLog().length;
  await trimFilter(afterEvent({ output: "a result while a boundary is set" }));
  const dt2 = readLog().slice(trim2);
  chk("C5 with a boundary SET, the draft leg ON a tool-result event logs ONLY its honest messages-not-array gauge line in ITS log and appends nothing to context_family's log", dt2.length === 1 && dt2[0].kind === "gauge" && dt2[0].reason === "messages-not-array" && cfLog().length === cf3, JSON.stringify(dt2));
  const step2 = JSON.stringify({ tokens: { input: 57000, output: 2500, reasoning: 0, cache: { read: 0, write: 0 } }, time: { completed: 456 } }); // the v2 fill = the LAST completed step's tokens (input + cache.read already carry the conversation)
  {
    const db = new DatabaseSync(FX_DB);
    db.exec(`INSERT INTO session_message VALUES(9, '${SID}', 'assistant', '${step2}', 300)`);
    db.close();
  }
  const ev3 = afterEvent({ output: "after the trim" });
  await onAfter(ev3);
  chk("C5 the append survives the boundary: the moved fill (59500 of 120K, delta 2500 >= 1%) appends its own line into the tool result", ev3.result.output === "after the trim\nctx: CTX=59500 (49%) REM=60500 | 6 compactions left", JSON.stringify(ev3.result.output));
  chk("C5 the earlier appended result stays byte-exact across the boundary, the filter and the moved read", ev1.result.output === `the tool output\n${G1}`, JSON.stringify(ev1.result.output));
  {
    const db = new DatabaseSync(FX_DB);
    db.exec("DELETE FROM session_message WHERE id = 9"); // restore the fixture mass for the later legs
    db.close();
  }
  await cfCleanup();
  await trim({ mode: "tail", session: SID, clear: true });
  chk("C6 (DoD 2d) context_family's cleanup disposes BOTH hooks it registered; this plugin's draft handler + tool registration stay (the store survives)", Object.keys(cfCtx._hooks).length === 0 && CONTEXT_HANDLERS.length === 1 && typeof cleanup === "function" && existsSync(STORE), JSON.stringify({ cf: Object.keys(cfCtx._hooks), draftHandlers: CONTEXT_HANDLERS.length }));
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
  chk("INV every line parses; kinds ⊂ {report, tail, trim, boundary-stale, gauge, mark, marks-stale}", [...kinds].sort().join(",") === "boundary-stale,gauge,mark,marks-stale,report,tail,trim", JSON.stringify([...kinds].sort()));
  chk("INV every line carries ts + kind and stays within the LINE_CAP ladder", lines.every((l) => typeof l.ts === "string" && typeof l.kind === "string" && JSON.stringify(l).length <= 2000 && JSON.stringify(l).length > 0));
  chk("INV the `trim` lines all name a session + boundary + the three counts", lines.filter((l) => l.kind === "trim").every((l) => typeof l.session === "string" && typeof l.boundary === "string" && typeof l.droppedRows === "string" && typeof l.droppedEntries === "string" && typeof l.keptEntries === "string"));
  chk("INV the `mark` lines all name session + added/removed/total scalars", lines.filter((l) => l.kind === "mark").every((l) => typeof l.session === "string" && typeof l.added === "string" && typeof l.removed === "string" && typeof l.total === "string"));
  chk("INV the ONE boundary-stale line for the (session,boundary) state (deduped)", lines.filter((l) => l.kind === "boundary-stale").length === 1, `count=${lines.filter((l) => l.kind === "boundary-stale").length}`);
  chk("INV the ONE marks-stale line for the (session,count) state (deduped)", lines.filter((l) => l.kind === "marks-stale").length === 1, `count=${lines.filter((l) => l.kind === "marks-stale").length}`);
  chk("INV the gauge lines' reasons are only the two honest read failures", lines.filter((l) => l.kind === "gauge").every((l) => l.reason === "context-read-failed" || l.reason === "session-not-found" || l.reason === "messages-not-array"));
  chk("INV report mode emitted a kind:report line per call (7 calls)", lines.filter((l) => l.kind === "report").length === 7, `count=${lines.filter((l) => l.kind === "report").length}`);
}

// ------------------------------------------------------------------ cleanup

await cleanup();
chk("S3 cleanup disposes the registered tool + hook handler (the store survives — a dead process keeps the trim)", TOOLS.length === 1 && CONTEXT_HANDLERS.length === 0 && existsSync(STORE), JSON.stringify({ handlers: CONTEXT_HANDLERS.length, store: existsSync(STORE) }));
chk("S3b after cleanup the handler list is unchanged by the dispose mock (the tool entry stays; the store is NOT rewritten)", existsSync(STORE) && JSON.parse(readFileSync(STORE, "utf8")).sessions !== undefined, "store readable");

console.log(`\nlog lines: ${readLog().length}`);
console.log(failures === 0 ? "\nSMOKE: ALL PASS" : `\nSMOKE: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
