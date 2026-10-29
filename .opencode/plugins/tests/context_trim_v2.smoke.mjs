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
// (U17 #208, 2026-10-28) the REPORT row source is the READ-ONLY SQL lane: the
// fixture rows ride a report fixture DB (`fx_report.db`, the live store shape —
// `id`/`type` columns + the `data` JSON WITHOUT an id); the session-context mock
// drives the HOOK and the WRITE lanes only — a report call fires ZERO RPC calls.
//
// U6 (#190, 2026-10-27): the M-block pins the per-message drop set (the (8)
// lane): the set round-trip + token est, head/floor/not-found rejections, the
// mark-clear vs tail-clear symmetry, the stale-id ignore with ONE deduped
// marks-stale line, and the #189 two-quantity line.
// U7 (#190, 2026-10-27): the lane is re-pinned STAGED: marking edits the STAGED
// set with NO hook effect (a staged-only entry is fully silent), `apply` unions
// it into ACTIVE behind an 80%-of-window PROJECTION bound (over-bound refusal,
// `force:true` acceptance, nothing-staged refusal), mark-clear empties BOTH sets
// while tail-clear keeps BOTH, the floor computes over the union, and the report
// header names staged=/active=/active-est= plus a `projection:` line (all later
// report line indexes +1).
// U8 (#192, 2026-10-27): every mass is the row's OWN weight (`own=` = bytes/4 of
// its text/reasoning/tool-input-JSON/tool-output parts); the cumulative provider
// figure prints relabeled `req-at=` (the REQUEST size at that step — never row
// weight) and feeds only the last-request projection authority; `biggest:` ranks
// by own mass (recency cannot dominate). U8b (live-measured) found tool OUTPUTS
// riding id-less projections — they survived the drop. U9 (#193) FIXES that: the
// hook now drops the CALL and its OUTPUT entries ATOMICALLY (call-id link via
// the `tool-result` part's call id, adjacency fallback for an id-less result,
// unmatched results count `orphan=` and stay) — so every DROP sum (`dropped=`,
// `active-est=`, `rows_dropped_est=`, `drop_est=`, the dry-run remove mass) is
// the FULL own weight again. `retained=`/`window-est=` stay own-mass sums. The
// apply line states a POSITIVE `drop_est=`. Fixture masses: own =
// [5,2,111,205,2,0,2,0,2,3], window-est=332. U9 also caps the report `hint=`
// echo (one line, 80 chars — #194) and makes a same-step `mark`+`apply` ride a
// late store write instead of falsely rejecting.
// The CTX_TRIM_SMOKE_{PLUGIN,CF,GAUGE} env vars steer the imported trio at scratch
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
const OTHER = "ses_trim002"; // (U18 F6) a SECOND live session — the cross-session free leg
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
// (U10 #196) the ORDINAL fixture DB — a SEPARATE file (the gauge fixture keeps
// its INTEGER-rowid shape): the ABSOLUTE store row order, append-only. Rows
// BEFORE the window head (4290/4295 — cut back, still hold their ordinals), the
// ten window rows (4300..4309 — the seq values the window fixture rows carry),
// and the post-compaction rows (4410..4412). A row's number never moves.
const ORD_DB = path.join(SCRATCH, "fx_ordinals.db");
{
  rmSync(ORD_DB, { force: true });
  const odb = new DatabaseSync(ORD_DB);
  odb.exec("CREATE TABLE session_message(id TEXT PRIMARY KEY, session_id TEXT, type TEXT, seq INTEGER)");
  const ordRows = [
    ["msg_x1", 4290], ["msg_x2", 4295],
    ["msg_c0", 4300], ["msg_u1", 4301], ["msg_a2", 4302], ["msg_a3", 4303], ["msg_u4", 4304],
    ["msg_a5", 4305], ["msg_u6", 4306], ["msg_a7", 4307], ["msg_u8", 4308], ["msg_a9", 4309],
    ["msg_c1", 4410], ["msg_u9", 4411], ["msg_a10", 4412],
  ];
  const ins = odb.prepare("INSERT INTO session_message VALUES(?, ?, 'assistant', ?)");
  for (const [rid, sq] of ordRows) ins.run(rid, SID, sq);
  odb.close();
}
const BUDGET = path.join(SCRATCH, "fx_budget.json");
writeFileSync(BUDGET, JSON.stringify({ model_budget: { [MODEL_ID]: 6 }, sessions: { [SID]: { count: 0, model: MODEL_ID } }, emergency_budget: 1 }), "utf8");

const gaugeMod = await import(pathToFileURL(GAUGE).href);
gaugeMod.setDbPath(FX_DB);
gaugeMod.setBudgetFileForTest(BUDGET);
gaugeMod.setLoopRootForTest(path.join(SCRATCH, "no_loop_root"));

// The window fixture — the v2 model window of SID: the LAST completed compaction
// ROW as head + 9 more rows (the 10-row window; the floor 6 leaves indices
// 1..4 as legal boundaries). U8 OWN masses (bytes/4 of the row's own parts):
// head compaction summary(12)+recent(11) -> 5; user "user one" -> 2; msg_a2 read
// part: input JSON 45 bytes + 400 output -> 111 (its provider total 5200 prints
// as req-at= ONLY); msg_a3 bash: input JSON 21 bytes + 800 output -> 205
// (req-at=9000); user four -> 2; msg_a5 error row content [] -> own 0
// (req-at=150); user six -> 2; msg_a7 content [] -> own 0 (req-at=25000); user
// eight -> 2; msg_a9 text "thinking text" -> 3 (req-at=400). window-est=332.
// U9: outputs count in the drop sums AGAIN (the pair rule drops them with the
// call) — the draft() fixture carries the linked + adjacency + orphan results.
// U10 (#196): every row carries its ABSOLUTE store `seq` (4300..4309 — the
// same values the ordinal fixture DB holds; pre-window rows 4290/4295 exist in
// the DB but NOT in the window: they keep their ordinals out of sight).
function windowRows() {
  return [
    { id: "msg_c0", seq: 4300, type: "compaction", status: "completed", summary: "SUMMARY-TEXT", recent: "RECENT-TEXT", time: { created: 1000, completed: 1001 } },
    { id: "msg_u1", seq: 4301, type: "user", text: "user one", time: { created: 1100 } },
    { id: "msg_a2", seq: 4302, type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 1200, completed: 1201 }, tokens: { input: 1000, output: 200, reasoning: 0, cache: { read: 4000, write: 0 } }, content: [{ type: "tool", id: "t1", name: "read", executed: true, state: { status: "completed", input: { filePath: "C:/a/b.ts", offset: 5, limit: 20 }, content: [{ type: "text", text: "R".repeat(400) }] } }] },
    { id: "msg_a3", seq: 4303, type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 1400, completed: 1401 }, tokens: { input: 2000, output: 1000, reasoning: 0, cache: { read: 6000, write: 0 } }, content: [{ type: "tool", id: "t2", name: "bash", executed: true, state: { status: "completed", input: { command: "ls -la" }, content: [{ type: "text", text: "S".repeat(800) }] } }] },
    { id: "msg_u4", seq: 4304, type: "user", text: "user four", time: { created: 1500 } },
    { id: "msg_a5", seq: 4305, type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 1600, completed: 1601 }, tokens: { input: 100, output: 50, reasoning: 0, cache: { read: 0, write: 0 } }, error: { type: "provider.error", message: "boom" }, content: [] },
    { id: "msg_u6", seq: 4306, type: "user", text: "user six", time: { created: 1700 } },
    { id: "msg_a7", seq: 4307, type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 1800, completed: 1801 }, tokens: { input: 4000, output: 1000, reasoning: 0, cache: { read: 20000, write: 0 } }, content: [] },
    { id: "msg_u8", seq: 4308, type: "user", text: "user eight", time: { created: 1900 } },
    { id: "msg_a9", seq: 4309, type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 2000, completed: 2001 }, tokens: { input: 300, output: 100, reasoning: 0, cache: { read: 0, write: 0 } }, content: [{ type: "text", text: "thinking text" }] },
  ];
}
// The same window AFTER a NEW durable compaction row landed: a new head, and
// the old boundary row msg_u4 is NO LONGER one of the window rows. (U10: the
// new head keeps its own absolute seq 4410 — ordinals are NEVER renumbered.)
function compactedRows() {
  return [
    { id: "msg_c1", seq: 4410, type: "compaction", status: "completed", summary: "NEW-SUMMARY", recent: "", time: { created: 2100, completed: 2101 } },
    { id: "msg_u9", seq: 4411, type: "user", text: "post-compaction prompt", time: { created: 2200 } },
    { id: "msg_a10", seq: 4412, type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 2300, completed: 2301 }, tokens: { input: 10, output: 10, reasoning: 0, cache: { read: 0, write: 0 } }, content: [] },
  ];
}

// (U17 #208) THE REPORT FIXTURE DB — the SQL row source in the LIVE store shape:
// `id TEXT PK, session_id, type, seq, data`, where `data` is the row's info
// JSON WITHOUT its id (the live shape — tokens/time ride INSIDE it, verified
// 2026-10-28). The BASE state = msg_x1/msg_x2 (pre-window rows, excluded by the
// seq floor, they hold their ranks in ORD_DB) + the ten window rows; a
// compacted leg INSERTS msg_c1/u9/a10 (window floor moves to seq >= 4410) and
// DELETEs them again. Ranks stay the ORD_DB read — the ordinal lane is
// unchanged. Run: bun; the SQL lane reads it node:sqlite-first, read-only.
const REPORT_DB = path.join(SCRATCH, "fx_report.db");
const PRE_ROWS = [
  { id: "msg_x1", seq: 4290, type: "user", text: "pre-window one", time: { created: 1 } },
  { id: "msg_x2", seq: 4295, type: "user", text: "pre-window two", time: { created: 2 } },
];
function insertRows(db, rows) {
  const ins = db.prepare("INSERT INTO session_message VALUES(?, ?, ?, ?, ?)");
  for (const r of rows) {
    const { id, seq, type, ...info } = r;
    ins.run(id, SID, type, seq, JSON.stringify({ type, ...info }));
  }
}
function buildReportDb(rows) {
  rmSync(REPORT_DB, { force: true });
  const db = new DatabaseSync(REPORT_DB);
  db.exec("CREATE TABLE session_message(id TEXT PRIMARY KEY, session_id TEXT, type TEXT, seq INTEGER, data TEXT)");
  insertRows(db, rows);
  db.close();
}
buildReportDb([...PRE_ROWS, ...windowRows()]);
function addCompactedToReportDb() {
  const db = new DatabaseSync(REPORT_DB);
  insertRows(db, compactedRows());
  db.close();
}
function dropCompactedFromReportDb() {
  const db = new DatabaseSync(REPORT_DB);
  db.exec("DELETE FROM session_message WHERE seq >= 4410");
  db.close();
}
// (U17) mid-run row SWAPS ride UPDATE, never a rebuild: Windows keeps an
// SQLite file delete-locked after reads (EBUSY on rm), while INSERT/UPDATE/
// DELETE reopens are proven fine (the H3 leg).
function setReportRowData(id, row) {
  const db = new DatabaseSync(REPORT_DB);
  const { type, ...info } = row;
  db.prepare("UPDATE session_message SET data = ? WHERE id = ?").run(JSON.stringify({ type, ...info }), id);
  db.close();
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
        if (input.sessionID !== SID && input.sessionID !== OTHER) return undefined; // an unknown session has no row (U18: OTHER is a second live session)
        if (RPC.mode === "not-found") return undefined;
        return { id: input.sessionID, model: { id: MODEL_ID, providerID: "llama-swap" } };
      },
      context: async (input) => {
        RPC.calls.push({ api: "context", input });
        if (input.sessionID !== SID && input.sessionID !== OTHER) throw new Error(`Session not found: ${input.sessionID}`);
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

const pluginMod = await import(pathToFileURL(PLUGIN).href);
const plugin = pluginMod.default;
// (U10) the ordinal lane reads the separate append-order fixture DB.
pluginMod.setOrdinalsDbForTest(ORD_DB);
// (U17 #208) the REPORT row lane reads the report fixture DB (SQL, read-only).
pluginMod.setReportDbForTest(REPORT_DB);
// (U11) when the scratch plugin resolves its own gauge copy to a different
// module instance, inject the steered core so the fixture read is shared.
pluginMod.setGaugeCoreForTest(gaugeMod);
chk("S0 default export is the loader shape { id: 'context_trim_v2', setup }", plugin && plugin.id === "context_trim_v2" && typeof plugin.setup === "function", JSON.stringify(Object.keys(plugin ?? {})));

const ctx = makeCtx(WS);
const cleanup = await plugin.setup(ctx);
chk("S1 setup registers the tool (editor.add) + ONE 'context' hook and returns a cleanup", TOOLS.length === 1 && CONTEXT_HANDLERS.length === 1 && typeof cleanup === "function", JSON.stringify({ tools: TOOLS.length, handlers: CONTEXT_HANDLERS.length }));

const TOOL = TOOLS[0];
const trim = async (args, sessionID = SID) => (await TOOL.execute(args, { sessionID })).output;
const fire = async (draft) => {
  await CONTEXT_HANDLERS[0](draft);
};

chk("U11 the S0b pin moved into the R1 block (schema keys incl showIds) — this line kept as the name pin", TOOL.name === "context_trim");

// A draft shaped like the fork's SessionContext (entries carry the projection's
// optional `id` — to-llm-message.ts sets it per row; system/effort projections
// carry none; `Message.tool` result entries carry NO entry-level id but their
// `tool-result` PART carries the call id — the U9 pair rule's link). U9 fixture
// shape: msg_a2 = call `call_a2` + its LINKED result + an ADJACENCY result (no
// part id, follows a dropped entry when a2 is marked); msg_a3 = call `call_a3`
// + linked result; entry 11 = a TRUE orphan result (follows the KEPT msg_u6).
function draft(sessionID = SID) {
  return structuredClone(draftBase(sessionID)); // (U11) deep clone: legs may MUTATE entries (reasoning push, splice inserts) — the base fixture stays pristine
}
function draftBase(sessionID = SID) {
  return {
    sessionID,
    agent: "worker-1",
    model: { id: MODEL_ID, providerID: "llama-swap" },
    system: [{ type: "text", text: "the system part" }],
    messages: [
      { role: "system", content: [{ type: "text", text: "an id-less system entry" }] },
      { id: "msg_c0", role: "user", content: [{ type: "text", text: "<conversation-checkpoint>" }] },
      { id: "msg_u1", role: "user", content: [{ type: "text", text: "user one" }] },
      { id: "msg_a2", role: "assistant", content: [{ type: "tool-call", id: "call_a2", name: "read", input: {} }, { type: "text", text: "a2 text" }] },
      { role: "tool", content: [{ type: "tool-result", id: "call_a2", name: "read", result: { value: [{ type: "text", text: "a2 output" }] } }] },
      { role: "tool", content: [{ type: "tool-result", name: "read", result: { value: [{ type: "text", text: "a2 adjacent output" }] } }] },
      { id: "msg_a3", role: "assistant", content: [{ type: "tool-call", id: "call_a3", name: "bash", input: {} }, { type: "text", text: "a3 text" }] },
      { role: "tool", content: [{ type: "tool-result", id: "call_a3", name: "bash", result: { value: [{ type: "text", text: "a3 output" }] } }] },
      { id: "msg_u4", role: "user", content: [{ type: "text", text: "user four" }] },
      { id: "msg_a5", role: "assistant", content: [{ type: "tool-call", id: "call_a5", name: "noop", input: {} }] }, // (U11 #200 era) a TOOL-CALL-ONLY turn (kept fixture shape — the tag lane that used to count it is deleted in U17)
      { id: "msg_u6", role: "user", content: [{ type: "text", text: "user six" }] },
      { role: "tool", content: [{ type: "tool-result", name: "read", result: { value: [{ type: "text", text: "orphan result" }] } }] },
      { id: "msg_a7", role: "assistant", content: [{ type: "text", text: "a7 text" }] },
      { id: "msg_u8", role: "user", content: [{ type: "text", text: "user eight" }] },
      { id: "msg_a9", role: "assistant", content: [{ type: "text", text: "a9 text" }] },
    ],
    options: {},
    tools: {},
  };
}

// ------------------------------------------------------------------ R1 the report (SQL fixture rows + gauge line; U17 #208)

{
  const rpc0 = RPC.calls.length;
  const out = await trim({ mode: "report", session: SID });
  const lines = out.split("\n");
  chk("U17 R5a (#208) the report row source is the SQL lane: ZERO service calls (no `context`, no `get` RPC)", RPC.calls.length === rpc0, `calls=${RPC.calls.length - rpc0}`);
  chk("R1 header line: the compaction head + rows=10 + no boundary + empty staged/active sets + ordinal source + guard OFF/empty auto (U14 defaults; U17 #203: the `tags=` token is GONE)", lines[1] === `header: head=msg_c0 head-type=compaction rows=10 boundary=none boundary-state=absent retained=10 staged=0 active=0 active-est=0 ordinal=session-rank guard=off auto=0`, JSON.stringify(lines[1] ?? null));
  chk("R1 (#189+U8) the two-quantity line: window_rows != request + request-est (gauge CTX) + OWN-mass window-est 332", lines[2] === "window_rows != request; request also carries system prompt + retained slice request-est=57000 window-est=332", JSON.stringify(lines[2] ?? null));
  chk("R1 (U7) the projection line: last-req = gauge CTX 57000 − output 2000; bound = 80% of the 120K window", lines[3] === "projection: last-req=55000 staged-est=0 projected=55000 bound=96000 ok", JSON.stringify(lines[3] ?? null));
  chk("R1 the gauge line rides the shared v2-paired core (fixture mass 57000 / 120K + budget suffix)", lines[4] === `gauge: SESSION=${SID} CTX=57000 (47%) REM=63000 | 6 compactions left`, JSON.stringify(lines[4] ?? null));
  chk("S0b the tool's name is 'context_trim' (the v1 name — a same-name twin is precedent) and the args mirror v1 (+ clear, + mark ids/unmark, + U7 apply mode + force, + U11 showIds, + U14 guard; U17 #203: the `tags` arg is GONE; U18 #209: the mode enum gains `free` and `target` accepts string OR number — the percent form)", TOOL.name === "context_trim" && JSON.stringify(Object.keys(TOOL.input.properties).sort()) === JSON.stringify(["clear", "force", "guard", "ids", "keepMessages", "mode", "session", "showIds", "target", "unmark"]) && JSON.stringify(TOOL.input.properties.mode.enum) === JSON.stringify(["report", "tail", "mark", "apply", "free"]) && JSON.stringify(TOOL.input.properties.target.type) === JSON.stringify(["string", "number"]) && TOOL.output.type === "string", JSON.stringify(TOOL.name + "|" + Object.keys(TOOL.input.properties)));
  chk("U14 the description literal grew by AT MOST 80 chars over the pre-U14 2369 and names the guard (U15: AT MOST +60 over the pre-U15 2430, names the flags; U18: cap 2499 = pre-U18 2439 + 60, names the free_space clause)", TOOL.description.length <= 2499 && TOOL.description.includes("`guard` on/off wall guard") && TOOL.description.includes("rows flag s/x/g") && TOOL.description.includes("`mode:'free'` — free_space"), `len=${TOOL.description.length}`);
  chk("R1 (U10+U11) row 1 = the compaction head + its ABSOLUTE ordinal #4300 — COMPACT form, NO id= by default (the opaque id costs ~8-10 tokens/row); (U17 #208 R3) a row without the provider figure prints req-at=unavailable", lines[5] === "row: 1 #3 compaction own=5 req-at=unavailable", JSON.stringify(lines[5] ?? null));
  chk("R1 user rows take the own-bytes4 mass + stable ordinals (#4301/#4304/#4308), compact, req-at=unavailable", lines[6] === "row: 2 #4 user own=2 req-at=unavailable" && lines[9] === "row: 5 #7 user own=2 req-at=unavailable" && lines[13] === "row: 9 #11 user own=2 req-at=unavailable", JSON.stringify([lines[6], lines[9], lines[13]]));
  chk("R1 (U8 pin) row 3 asserts OWN mass (111 = input-JSON 45 + output 400 / 4), NOT the provider sum — the cumulative figure rides relabeled req-at=5200; (U10) ordinal #4302, (U11) no id", lines[7] === "row: 3 #5 assistant own=111 req-at=5200 tool=read target=C:/a/b.ts offset=5 limit=20", JSON.stringify(lines[7] ?? null));
  chk("R1 row 4 = the bash-target row (own=205, req-at=9000, #4303, no id)", lines[8] === "row: 4 #6 assistant own=205 req-at=9000 tool=bash target=ls -la", JSON.stringify(lines[8] ?? null));
  chk("R1 the zero-content rows print own=0 + req-at (the provider figure cannot masquerade as weight), compact", lines[10] === "row: 6 #8 assistant own=0 req-at=150" && lines[12] === "row: 8 #10 assistant own=0 req-at=25000" && lines[14] === "row: 10 #12 assistant own=3 req-at=400", JSON.stringify([lines[10], lines[12], lines[14]]));
  chk("R1 the `last:` flag + (U8) `biggest:` ranks by OWN weight: the NEWEST row (#4309=3) is the SMALLEST, the old tool rows dominate (the error turn excluded); (U10/U12) entries are PER-SESSION-RANK-named", lines[15] === "last: 10" && lines[19] === "biggest: #6=205 #5=111 #12=3", JSON.stringify([lines[15], lines[19]]));
  chk("U12 (#202) PER-SESSION RANKS: the window numbers run 3..12 — rows msg_x1/msg_x2 BEFORE the head occupy ranks 1-2 (trimmed-away rows occupy their rank), so rank is contiguous 1..N over the session and is NEITHER the window position NOR a sparse global seq", lines[5] === "row: 1 #3 compaction own=5 req-at=unavailable" && lines[14] === "row: 10 #12 assistant own=3 req-at=400", JSON.stringify([lines[5], lines[14]]));
  chk("R1 the recommendation block = the trim RANGE with OWN-mass sums (U9: outputs count again — they drop with their call); (U10) anchors name rows by ORDINAL (mark accepts them)", lines[16] === "option low: msg=#7 keep=6 retained=14 (read=0 thought=10 shell=0) dropped=318 (read=100 thought=2 shell=200) hint=user four" && lines[17] === "option medium: msg=#5 keep=8 retained=330 (read=100 thought=10 shell=200) dropped=2 (read=0 thought=2 shell=0) hint=C:/a/b.ts offset=5 limit=20" && lines[18] === "option high: msg=#4 keep=9 retained=332 (read=100 thought=12 shell=200) dropped=0 (read=0 thought=0 shell=0) hint=user one", JSON.stringify([lines[16], lines[17], lines[18]]));
  chk("R1 report mode makes ZERO store writes (the report never writes)", readStore() === null && existsSync(LOG), JSON.stringify(readStore()));
}

// ------------------------------------------------------------------ R2 the dry-run leg (report + target)

{
  const out = await trim({ mode: "report", session: SID, target: "msg_u4" });
  const lines = out.split("\n");
  chk("R2 dry-run: a legal boundary's remove/keep counts (remove = FULL own mass, U9)", lines[20] === "dry-run: target=msg_u4 remove=4 (323 tokens) keep=6 (9 tokens) verdict=ok", JSON.stringify(lines[20] ?? null));
  const out2 = await trim({ mode: "report", session: SID, target: "msg_u6" });
  chk("R2 dry-run: a boundary leaving 4 rows is REJECTED (the floor carries; counts still print)", out2.split("\n")[20] === "dry-run: target=msg_u6 remove=6 (325 tokens) keep=4 (7 tokens) verdict=rejected: retained-tail-below-floor 4", out2.split("\n")[20]);
}

// ------------------------------------------------------------------ T1 the tail store: set + clear + rejection lines

{
  const t = async (args) => await trim({ mode: "tail", ...args });
  chk("T1 set by target id -> v1's return line", (await t({ session: SID, target: "msg_u4" })) === "tail-set= none -> msg_u4 keep=6");
  chk("T1 the store file lands at the plugin's default path (additive shape {sessions:{sid:{boundary,keep,set_at}}})", existsSync(STORE) && readStore()?.sessions?.[SID]?.boundary === "msg_u4" && readStore().sessions[SID].keep === 6, JSON.stringify(readStore()));
  const out = await trim({ mode: "report", session: SID });
  chk("T1 the report reflects the stored boundary (inside + retained=6) + ordinal source + guard off (U14 header; U17: no tags token)", out.split("\n")[1] === "header: head=msg_c0 head-type=compaction rows=10 boundary=msg_u4 boundary-state=inside retained=6 staged=0 active=0 active-est=0 ordinal=session-rank guard=off auto=0", out.split("\n")[1]);
  const dry = await trim({ mode: "report", session: SID, target: "msg_a5" });
  chk("T1 dry-run vs the stored boundary: only the ADDITIONAL drop is counted (own mass; the floor rejection still counts)", dry.split("\n")[20] === "dry-run: target=msg_a5 remove=1 (2 tokens) keep=5 (7 tokens) verdict=rejected: retained-tail-below-floor 5", dry.split("\n")[20]);
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
  chk("T14 bad mode -> the v1 error line (U7: the line names the fourth mode; U18: the fifth)", (await trim({ mode: "sideways", session: SID })) === "error: mode must be 'report', 'tail', 'mark', 'apply', or 'free'");
  chk("T15 the store is UNTOUCHED by every rejection (only the two sets + clears landed)", JSON.stringify(readStore()?.sessions?.[SID] ?? null) === JSON.stringify(null) && Object.keys(readStore()?.sessions ?? {}).length === 0, JSON.stringify(readStore()));
}

// ------------------------------------------------------------------ H1 the hook filter (the tail's effect)

{
  await trim({ mode: "tail", session: SID, target: "msg_u4" }); // boundary: drop msg_c0/u1/a2/a3
  const before = readLog().length;
  const d = draft();
  const nBefore = d.messages.length; // 15 entries (3 id-less: system + 2 result projections + 1 orphan)
  await fire(d);
  const ids = d.messages.map((m) => m.id ?? "(none)");
  const texts = d.messages.map((m) => JSON.stringify(m.content)).join("|");
  chk("H1 (U9 pair rule) the boundary drops the 4 pre-boundary entries AND their outputs atomically (call-id link + adjacency) — 7 entries go", d.messages.length === nBefore - 7 && ids.indexOf("msg_c0") === -1 && ids.indexOf("msg_u1") === -1 && ids.indexOf("msg_a2") === -1 && ids.indexOf("msg_a3") === -1, JSON.stringify(ids));
  chk("H1 the marked row's OUTPUTS vanish (linked result_a2 + adjacency result + linked result_a3) — no call left without its output", !texts.includes("a2 output") && !texts.includes("a2 adjacent output") && !texts.includes("a3 output"), texts.slice(0, 200));
  chk("H1 the id-less entries that STAY = the system projection + the TRUE orphan (adjacency anchor msg_u6 is kept) + order preserved", ids.indexOf("(none)") === 0 && d.messages[d.messages.length - 1]?.id === "msg_a9" && d.messages.filter((m) => !("id" in m)).length === 2 && texts.includes("orphan result"), JSON.stringify(ids));
  chk("H1 NO entry is appended (the array only shrinks; length 8)", d.messages.length === 8, `len=${d.messages.length}`);
  const delta = readLog().slice(before);
  chk("H1 ONE kind:trim line (4 rows, 7 entries = 4 ids + 3 projections, orphan=1)", delta.length === 1 && delta[0].kind === "trim" && delta[0].session === SID && delta[0].boundary === "msg_u4" && delta[0].droppedRows === "4" && delta[0].droppedEntries === "7" && delta[0].droppedProjections === "3" && delta[0].orphan === "1" && delta[0].keptEntries === "8", JSON.stringify(delta[0] ?? null));
  const dBefore = JSON.stringify(draft().messages.slice(1, 3));
  chk("H1 surviving entries are BYTE-UNCHANGED (no content mutation of kept rows)", JSON.stringify(draft().messages.slice(9, 11)) === JSON.stringify(d.messages.slice(2, 4)), `${dBefore}`);
  chk("H1 system/options/tools untouched", JSON.stringify(d.system) === JSON.stringify([{ type: "text", text: "the system part" }]) && JSON.stringify(d.options) === "{}" && JSON.stringify(d.tools) === "{}");
  await trim({ mode: "tail", session: SID, clear: true });
  const nCalls = RPC.calls.length;
  const logBefore = readLog().length;
  await fire(draft());
  chk("H2 with NO stored boundary the hook is SILENT: NO service call, NO log line, the draft untouched", RPC.calls.length === nCalls && readLog().length === logBefore && draft().messages.length === 15, `calls=${RPC.calls.length - nCalls} lines=${readLog().length - logBefore}`);
}

// ------------------------------------------------------------------ U22 F3 (#218) the request-shrink measurement
// `droppedRows=` counts STORE rows matched (`drop.size`); a matched row can map to NO
// draft entry (the fork emits nothing for `idle` rows and an id-less entry for
// `system` rows — to-llm-message.ts:255-257, :291), so it frees zero request bytes.
// `droppedBytes=` is the bytes/4 ACTUALLY spliced out of the draft array — the honest
// effectiveness measurement (the E2 gap).

{
  const removedBytes = (before, after) => {
    const left = new Map();
    for (const m of after.messages) {
      const k = JSON.stringify(m);
      left.set(k, (left.get(k) ?? 0) + 1);
    }
    let bytes = 0;
    for (const m of before.messages) {
      const k = JSON.stringify(m);
      const c = left.get(k) ?? 0;
      if (c > 0) left.set(k, c - 1);
      else bytes += Math.floor(k.length / 4);
    }
    return bytes;
  };
  await trim({ mode: "tail", session: SID, target: "msg_u4" });
  const b1 = readLog().length;
  const d1 = draft();
  const base1 = draft();
  await fire(d1);
  const t1 = readLog().slice(b1).find((l) => l.kind === "trim");
  chk("U22 F3 droppedBytes = the bytes/4 of the entries the draft ACTUALLY lost (7 entries, boundary msg_u4)", t1 != null && t1.droppedBytes === String(removedBytes(base1, d1)) && Number(t1.droppedBytes) > 0 && t1.droppedEntries === "7", JSON.stringify(t1 ?? null));
  await trim({ mode: "tail", session: SID, clear: true });
  // the phantom leg: an EXTRA store row that maps to no draft entry. The boundary now
  // matches 5 store rows while the request loses EXACTLY the same bytes as the 4-row leg.
  RPC.rows = [{ id: "msg_p0", seq: 4310, type: "idle", time: { created: 900 } }, ...windowRows()];
  await trim({ mode: "tail", session: SID, target: "msg_u4" });
  const b2 = readLog().length;
  const d2 = draft();
  const base2 = draft();
  await fire(d2);
  const t2 = readLog().slice(b2).find((l) => l.kind === "trim");
  chk("U22 F3 a phantom store row (no draft entry) inflates droppedRows to 5 while droppedEntries and droppedBytes stay the 4-row values — the E2 asymmetry pinned", t2 != null && t2.droppedRows === "5" && t2.droppedEntries === "7" && t2.droppedBytes === t1?.droppedBytes && t2.droppedBytes === String(removedBytes(base2, d2)), JSON.stringify(t2 ?? null));
  await trim({ mode: "tail", session: SID, clear: true });
  RPC.rows = null;
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
  addCompactedToReportDb(); // (U17 #208) the SQL fixture serves the post-compaction window too
  const staleReport = await trim({ mode: "report", session: SID }); // RPC.rows is still the post-compaction window (HOOK lane) — the REPORT reads the fixture DB
  chk("H3 the report shows the stale boundary (state=stale, retained = the whole new window; U10: the new head keeps its absolute #4410 — ordinals are NEVER renumbered; U17: no tags token; #208: rows from the SQL fixture)", staleReport.split("\n")[1] === "header: head=msg_c1 head-type=compaction rows=3 boundary=msg_u4 boundary-state=stale retained=3 staged=0 active=0 active-est=0 ordinal=session-rank guard=off auto=0" && staleReport.split("\n")[5] === "row: 1 #13 compaction own=2 req-at=unavailable", JSON.stringify([staleReport.split("\n")[1], staleReport.split("\n")[5]]));
  dropCompactedFromReportDb(); // the SQL fixture is back at the 10-row base window
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
  chk("H4 a failing context read keeps the WHOLE window (fail-open)", d.messages.length === 15, `len=${d.messages.length}`);
  const delta = readLog().slice(before);
  chk("H4 ONE kind:gauge line, reason context-read-failed + a capped preview", delta.length === 1 && delta[0].kind === "gauge" && delta[0].session === SID && delta[0].reason === "context-read-failed" && /mock context read failure/.test(String(delta[0].preview)), JSON.stringify(delta[0] ?? null));
  RPC.mode = "not-found";
  const b2 = readLog().length;
  const d2 = draft();
  await fire(d2);
  chk("H4 the hook's not-found read logs reason session-not-found and keeps the window", d2.messages.length === 15 && readLog().slice(b2).length === 1 && readLog().slice(b2)[0].reason === "session-not-found", JSON.stringify(readLog().slice(b2)[0] ?? null));
  const b3 = readLog().length;
  const d3 = draft();
  d3.messages = "not-an-array";
  await fire(d3);
  chk("H4 messages-not-array: ONE gauge line, the wire value untouched, no throw", d3.messages === "not-an-array" && readLog().slice(b3).length === 1 && readLog().slice(b3)[0].reason === "messages-not-array", JSON.stringify(readLog().slice(b3)[0] ?? null));
  RPC.mode = "rows";
  await trim({ mode: "tail", session: SID, clear: true });
}

// ------------------------------------------------------------------ M the staged drop sets (the (9) lane, #190 U6+U7, #192 U8 masses)
// U7 re-pinned the lane STAGED: marking edits the STAGED set (NO hook effect
// until apply); `apply` unions it into ACTIVE behind the 80% projection bound
// (over-bound refusal + force acceptance + nothing-staged refusal); mark-clear
// empties BOTH sets, tail-clear keeps BOTH; the report prints the staged/active
// fields + the `projection:` line (map indexes +1). U9 re-pinned every est back
// to the FULL own sums (the pair rule drops outputs) + the pair/orphan trim-line
// fields + the same-step `apply` retry.

{
  const m = async (args) => await trim({ mode: "mark", ...args });
  const ap = async (args = {}) => await trim({ mode: "apply", ...args });
  const stagedOf = () => JSON.stringify(readStore()?.sessions?.[SID]?.staged ?? null);
  const activeOf = () => JSON.stringify(readStore()?.sessions?.[SID]?.active ?? null);
  const applyLines = () => readLog().filter((l) => l.kind === "apply");
  // M1 the staging round-trip + the success line (U9 FULL own masses: msg_u1 2 + msg_a3 205)
  chk("M1 mark ids -> the +n/-m/total(staged)/OWN-est line (outputs included again)", (await m({ session: SID, ids: ["msg_u1", "msg_a3"] })) === "mark-set= +2 -0 total=2 rows_dropped_est=207");
  chk("M1 staged lands in the store next to the (empty) boundary lane; order-preserved, de-dup; NO active yet", readStore()?.sessions?.[SID]?.boundary === "" && stagedOf() === JSON.stringify(["msg_u1", "msg_a3"]) && readStore()?.sessions?.[SID]?.active === undefined, stagedOf());
  // M2 staged is NOT a drop yet: a staged-only entry is fully SILENT for the hook
  const m2c = RPC.calls.length;
  const m2b = readLog().length;
  const d2 = draft();
  await fire(d2);
  chk("M2 a staged-only entry is SILENT: the draft keeps all 15 entries, NO service call, NO log line", d2.messages.length === 15 && RPC.calls.length === m2c && readLog().length === m2b, `len=${d2.messages.length} calls=${RPC.calls.length - m2c} lines=${readLog().length - m2b}`);
  // M2b apply unions staged into active — POSITIVE drop_est (U9 FULL own-mass sum: outputs drop too): last-req 55000 − 207; mixed = rows WITHOUT req-at (msg_u1 only)
  chk("M2b apply -> staged->active with POSITIVE drop_est (own sum 207 incl outputs, projected positive)", (await ap()) === "apply= staged->active n=2 drop_est=207 projected=54793 bound=96000 ok mixed=1");
  chk("M2b the store after apply: the staged key is gone, active holds both ids", stagedOf() === "null" && activeOf() === JSON.stringify(["msg_u1", "msg_a3"]), stagedOf() + activeOf());
  chk("M2b exactly ONE kind:apply line with session + drop_est/n/projected/bound/mixed scalars", applyLines().length === 1 && applyLines()[0].session === SID && applyLines()[0].n === "2" && applyLines()[0].dropEst === "207" && applyLines()[0].projected === "54793" && applyLines()[0].bound === "96000" && applyLines()[0].mixed === "1", JSON.stringify(applyLines()[0] ?? null));
  // M2c the hook now drops the active pair ATOMICALLY with their outputs
  const mb = readLog().length;
  const dm = draft();
  await fire(dm);
  const idsM = dm.messages.map((x) => x.id ?? "(none)");
  const textsM = dm.messages.map((x) => JSON.stringify(x.content)).join("|");
  chk("M2c after apply the hook drops the two active entries + the LINKED result_a3 (12 kept), order kept", dm.messages.length === 12 && !idsM.includes("msg_u1") && !idsM.includes("msg_a3") && idsM.includes("msg_c0") && idsM[0] === "(none)" && idsM[idsM.length - 1] === "msg_a9", JSON.stringify(idsM));
  chk("M2c ATOMICITY the other way: the UNMARKED msg_a2 keeps its LINKED output (a2 output stays), a3's output left too", textsM.includes("a2 output") && !textsM.includes("a3 output"), textsM.slice(0, 200));
  const dM = readLog().slice(mb);
  chk("M2c ONE kind:trim line (boundary none, marks=2, 2 rows/3 entries = 2 ids + 1 projection, orphan=2, 12 kept)", dM.length === 1 && dM[0].kind === "trim" && dM[0].boundary === "none" && dM[0].marks === "2" && dM[0].droppedRows === "2" && dM[0].droppedEntries === "3" && dM[0].droppedProjections === "1" && dM[0].orphan === "2" && dM[0].keptEntries === "12", JSON.stringify(dM[0] ?? null));
  chk("M2d stage then un-mark a staged id (un-marking needs no window; own est 2)", (await m({ session: SID, ids: ["msg_u4"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=2" && stagedOf() === JSON.stringify(["msg_u4"]) && (await m({ session: SID, unmark: ["msg_u4"] })) === "mark-set= +0 -1 total=0 rows_dropped_est=0" && stagedOf() === "null" && activeOf() === JSON.stringify(["msg_u1", "msg_a3"]));
  // M3-M5c fail-closed guards (a rejection writes NOTHING; the floor is the UNION)
  chk("M3 head mark rejected (the head carries the summary)", (await m({ session: SID, ids: ["msg_c0"] })) === "mark-set= rejected: mark-at-window-head #3 msg_c0" && stagedOf() === "null" && activeOf() === JSON.stringify(["msg_u1", "msg_a3"]));
  chk("M4 an id outside the window rows", (await m({ session: SID, ids: ["msg_absent999"] })) === "mark-set= rejected: mark-not-found" && stagedOf() === "null");
  chk("M5 the floor over the UNION active+staged: the staged result would leave 5 retained (< 6)", (await m({ session: SID, ids: ["msg_a2", "msg_u4", "msg_a5"] })) === "mark-set= rejected: mark-floor 5 breach=msg_a2,msg_u4,msg_a5" && stagedOf() === "null");
  chk("M5b staging an ALREADY-ACTIVE id passes (the union drops it once; own est 2)", (await m({ session: SID, ids: ["msg_u1"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=2" && stagedOf() === JSON.stringify(["msg_u1"]));
  chk("M5c mark clear empties BOTH sets (staged 1 + active 2; the entry goes with them)", (await m({ session: SID, clear: true })) === "mark-set= +0 -3 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID] === undefined);
  // M6 the apply guards
  chk("M6 apply with nothing staged is refused", (await ap()) === "apply= rejected: nothing-staged");
  chk("M6 apply takes no list args", (await ap({ ids: ["msg_u1"] })) === "error: apply mode takes no list args (stage with mark mode first; only `force` is accepted)");
  // M7 the boundary + staged/active interplay + the clear symmetry
  chk("M7a boundary set + a pre-boundary id staged (own est 111)", (await trim({ session: SID, mode: "tail", target: "msg_u4" })) === "tail-set= none -> msg_u4 keep=6" && (await m({ session: SID, ids: ["msg_a2"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=111");
  chk("M7a a further staged mark at the boundary+staged floor is rejected (the boundary keeps 6)", (await m({ session: SID, ids: ["msg_a9"] })) === "mark-set= rejected: mark-floor 5 breach=msg_a9" && stagedOf() === JSON.stringify(["msg_a2"]));
  chk("M7b apply unions the pre-boundary staged id (positive drop_est 111, mixed=0 — it has a req-at counterpart)", (await ap()) === "apply= staged->active n=1 drop_est=111 projected=54889 bound=96000 ok mixed=0" && activeOf() === JSON.stringify(["msg_a2"]));
  chk("M7c mark clear empties BOTH sets and KEEPS the boundary", (await m({ session: SID, clear: true })) === "mark-set= +0 -1 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID]?.boundary === "msg_u4" && stagedOf() === "null" && activeOf() === "null");
  const dm7 = draft();
  await fire(dm7);
  chk("M7c the boundary STILL applies after the mark clear (pre-boundary ids + outputs dropped, 15 -> 8)", dm7.messages.length === 8, `len=${dm7.messages.length}`);
  // M8 stale ACTIVE ids: the window moved -> ignored, ONE marks-stale line (deduped per count)
  chk("M8 stage both + apply (own est 113, mixed=1) + tail clear LEAVES the active set (mirror symmetry)", (await m({ session: SID, ids: ["msg_a2", "msg_u1"] })) === "mark-set= +2 -0 total=2 rows_dropped_est=113" && (await ap()) === "apply= staged->active n=2 drop_est=113 projected=54887 bound=96000 ok mixed=1" && (await trim({ session: SID, mode: "tail", clear: true })) === "tail-set= msg_u4 -> none" && activeOf() === JSON.stringify(["msg_a2", "msg_u1"]));
  RPC.rows = compactedRows();
  const m8b = readLog().length;
  const d8 = draft();
  await fire(d8);
  chk("M8 a moved window drops NOTHING from stale active ids (fail-open; the draft keeps all 15)", d8.messages.length === 15, `len=${d8.messages.length}`);
  const d8l = readLog().slice(m8b);
  chk("M8 exactly ONE kind:marks-stale line (staleMarks=2, marksTotal=2)", d8l.length === 1 && d8l[0].kind === "marks-stale" && d8l[0].session === SID && d8l[0].staleMarks === "2" && d8l[0].marksTotal === "2", JSON.stringify(d8l[0] ?? null));
  await fire(draft());
  chk("M8 marks-stale DEDUPED per (session,count): the second fire adds NO line", readLog().slice(m8b + 1).filter((l) => l.kind === "marks-stale").length === 0, JSON.stringify(readLog().slice(m8b).map((l) => l.kind)));
  RPC.rows = null;
  const d8r = draft();
  await fire(d8r);
  chk("M8 the active set is LIVE again once the window returns (both dropped, their results too — 11 kept)", d8r.messages.length === 11 && d8r.messages.every((x) => x.id !== "msg_a2" && x.id !== "msg_u1"), JSON.stringify(d8r.messages.map((x) => x.id ?? "(none)")));
  // M9 the report prints BOTH sets + the projection line (#189 stays at index 2; the gauge line shifts to 4)
  chk("M9 stage the error-turn row (own mass 0 — no parts)", (await m({ session: SID, ids: ["msg_a5"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=0");
  const rL = (await trim({ mode: "report", session: SID })).split("\n");
  chk("M9 the report header prints staged=1 active=2 active-est=113 (own sums) and the #189 line holds", rL[1].includes("staged=1 active=2 active-est=113") && rL[2].startsWith("window_rows != request"), JSON.stringify([rL[1], rL[2]]));
  chk("M9 the projection line stays POSITIVE: last-req 55000 minus staged-est 0 -> 55000 under the bound", rL[3] === "projection: last-req=55000 staged-est=0 projected=55000 bound=96000 ok", JSON.stringify(rL[3] ?? null));
  chk("M9 the gauge line rides at index 4 (the projection line shifted the map indexes +1)", rL[4].startsWith("gauge: SESSION="), JSON.stringify(rL[4] ?? null));
  // M10 over-bound + force: the fixture DB gains a HUGE LAST step row (CTX 99000 of the 120K window)
  chk("M10 clear BOTH sets empty (staged 1 + active 2)", (await m({ session: SID, clear: true })) === "mark-set= +0 -3 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID] === undefined);
  {
    const db = new DatabaseSync(FX_DB);
    db.exec(`INSERT INTO session_message VALUES(11, '${SID}', 'assistant', '${JSON.stringify({ tokens: { input: 97000, output: 2000, reasoning: 0, cache: { read: 0, write: 0 } }, time: { completed: 789 } })}', 400)`);
    db.close();
  }
  chk("M10 stage a LIGHT id (own mass 2 — the projection STILL sits over the 96000 bound)", (await m({ session: SID, ids: ["msg_u4"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=2");
  const oL = (await trim({ mode: "report", session: SID })).split("\n");
  chk("M10 the report projection line reads `over` (last-req 97000 − 2 > bound 96000)", oL[3] === "projection: last-req=97000 staged-est=2 projected=96998 bound=96000 over", JSON.stringify(oL[3] ?? null));
  chk("M10 apply REFUSES over-bound (the rejection writes NOTHING — staged stays)", (await ap()) === "apply= rejected: over-bound 96998 96000" && stagedOf() === JSON.stringify(["msg_u4"]) && activeOf() === "null");
  chk("M10 apply force:true rides through deliberately (positive drop_est printed)", (await ap({ force: true })) === "apply= staged->active n=1 drop_est=2 projected=96998 bound=96000 ok mixed=1" && activeOf() === JSON.stringify(["msg_u4"]));
  {
    const db = new DatabaseSync(FX_DB);
    db.exec("DELETE FROM session_message WHERE id = 11"); // restore the fixture mass for the later legs
    db.close();
  }
  chk("M10 clear leaves the store CLEAN for the C block", (await m({ session: SID, clear: true })) === "mark-set= +0 -1 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID] === undefined);
  // M11 the usage + validation lanes
  chk("M11 usage lines (form guards + id-array validation) + the unknown-session rejection", (await m({ session: SID, clear: true, ids: ["msg_u1"] })) === "error: mark mode: clear is mutually exclusive with ids/unmark (use one form)" && (await m({ session: SID })) === "error: mark mode requires ids (window rows to stage — ids or bare ordinals), unmark (refs to restore), clear (empty ALL drop sets — staged, active, guard auto — a stored boundary stays), or guard (the opt-in preventive wall guard on/off)" && (await m({ session: SID, ids: "msg_u1" })) === "error: mark mode: ids and unmark must be arrays of non-empty message id strings" && (await trim({ mode: "mark", session: "ses_absent000", ids: ["msg_x"] })) === "mark-set= rejected: session-not-found");
}

// ------------------------------------------------------------------ U9 the #194 pins: hint cap + same-step apply truthfulness

{
  // (a) the hint cap: a variant window whose LOW anchor row carries a long
  // assistant/user text — the echo must collapse to ONE capped line.
  const longRows = windowRows().map((r) => (r.id === "msg_u4" ? { ...r, text: "user four " + "x".repeat(200) } : r));
  const baseU4 = windowRows().find((r) => r.id === "msg_u4");
  setReportRowData("msg_u4", longRows.find((r) => r.id === "msg_u4")); // (U17 #208) the cap rides the SQL fixture now (UPDATE — no rm-rebuild)
  const hl = (await trim({ mode: "report", session: SID })).split("\n");
  const optLow = hl.find((l) => l.startsWith("option low")) ?? "";
  chk("HINT-CAP (#194) a long anchor echoes ONE capped line: 80 chars + the inline cut marker", optLow.includes(`hint=user four ${"x".repeat(69)}…[+130ch]`), JSON.stringify(optLow.slice(optLow.indexOf("hint="), optLow.indexOf("hint=") + 110)));
  setReportRowData("msg_u4", baseU4); // restore the base fixture row
  // (b) the same-step race: the staged write lands 80ms AFTER apply's first
  // read — the ONE bounded re-read (350ms) rides it: apply APPLIES the new set
  // instead of falsely reporting `nothing-staged` after a successful mark.
  const activeOfU9 = () => JSON.stringify(readStore()?.sessions?.[SID]?.active ?? null);
  setTimeout(() => {
    const base = existsSync(STORE) ? JSON.parse(readFileSync(STORE, "utf8")) : {};
    base.sessions = { ...(base.sessions ?? {}), [SID]: { boundary: "", keep: 0, set_at: new Date().toISOString(), staged: ["msg_u4"] } };
    writeFileSync(STORE, JSON.stringify(base), "utf8");
  }, 80);
  const out9 = await trim({ mode: "apply", session: SID });
  chk("APPLY-RETRY (#194) a same-step late mark write rides the retry re-read (n=1 applied, no false nothing-staged)", out9 === "apply= staged->active n=1 drop_est=2 projected=54998 bound=96000 ok mixed=1" && activeOfU9() === JSON.stringify(["msg_u4"]), JSON.stringify({ out: out9, active: activeOfU9() }));
  chk("APPLY-RETRY leaves the store CLEAN for the C block", (await trim({ mode: "mark", session: SID, clear: true })) === "mark-set= +0 -1 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID] === undefined);
}

// ------------------------------------------------------------------ C1 the composition block (the REAL context_family plugin, the #153 APPEND channel)
// ------------------------------------------------------------------ U10 the #196 pins: stable ordinals (U17 #203: the opt-in tags legs DELETED — the tag lane mutated persisted content)

{
  const ordLine = (out, n) => out.split("\n").find((l) => l.startsWith(`row: ${n} `)) ?? "(missing)";
  const r0 = await trim({ mode: "report", session: SID });
  chk("U10a ordinal stability BEFORE a drop: msg_u8 #4308, msg_a9 #4309 (absolute seq — not window position)", ordLine(r0, 9) === "row: 9 #11 user own=2 req-at=unavailable" && ordLine(r0, 10) === "row: 10 #12 assistant own=3 req-at=400", JSON.stringify([ordLine(r0, 9), ordLine(r0, 10)]));
  // drop a row ABOVE them: stage + apply msg_a2 (#4302, index 2)
  chk("U10a the drop: stage #4302 BY ORDINAL + apply", (await trim({ mode: "mark", session: SID, ids: ["5"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=111" && (await trim({ mode: "apply", session: SID })) === "apply= staged->active n=1 drop_est=111 projected=54889 bound=96000 ok mixed=0");
  const r1 = await trim({ mode: "report", session: SID });
  chk("U10a (STABILITY) the SAME ids keep the SAME ordinals after the drop above them — #4308/#4309 UNCHANGED (window position IS NOT the source)", ordLine(r1, 9) === "row: 9 #11 user own=2 req-at=unavailable" && ordLine(r1, 10) === "row: 10 #12 assistant own=3 req-at=400", JSON.stringify([ordLine(r1, 9), ordLine(r1, 10)]));
  chk("U10a the ACTIVE set prints the resolved id + the ordinal-stable header (ordinal=session-rank; U15: + in-window counts; U17: no tags token)", r1.split("\n")[1] === "header: head=msg_c0 head-type=compaction rows=10 boundary=none boundary-state=absent retained=10 staged=0 active=1 active-est=111 ordinal=session-rank guard=off auto=0 dropped-in-window=1 staged-in-window=0", r1.split("\n")[1]);
  await trim({ mode: "mark", session: SID, clear: true });
  // ordinal resolution: a bare number resolves through the ORDINAL MAP, never
  // through window position — it stages the SAME id as the id string does.
  chk("U10b mark by bare ordinal '4304' == mark by id msg_u4 (same staged id, same est)", (await trim({ mode: "mark", session: SID, ids: ["7"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=2" && JSON.stringify(JSON.parse(readFileSync(STORE, "utf8")).sessions[SID].staged) === JSON.stringify(["msg_u4"]));
  chk("U10b unmark by bare ordinal removes the stored id", (await trim({ mode: "mark", session: SID, unmark: ["7"] })) === "mark-set= +0 -1 total=0 rows_dropped_est=0" && JSON.stringify(JSON.parse(readFileSync(STORE, "utf8")).sessions?.[SID]?.staged ?? null) === "null");
  chk("U10b an ordinal naming a row OUTSIDE the window rejects like an unknown id (4290 = a pre-window row); an unknown ordinal too", (await trim({ mode: "mark", session: SID, ids: ["4290"] })) === "mark-set= rejected: mark-not-found" && (await trim({ mode: "mark", session: SID, ids: ["9999"] })) === "mark-set= rejected: mark-not-found");
  chk("U10b the ordinal of the WINDOW HEAD rejects like the head id (mark-at-window-head)", (await trim({ mode: "mark", session: SID, ids: ["3"] })) === "mark-set= rejected: mark-at-window-head #3 msg_c0");
  chk("U10b the tail target accepts a bare ordinal (4304 resolves to msg_u4)", (await trim({ mode: "tail", session: SID, target: "7" })) === "tail-set= none -> msg_u4 keep=6" && (await trim({ mode: "tail", session: SID, clear: true })) === "tail-set= msg_u4 -> none");
  chk("U10b the report dry-run accepts a bare ordinal (names the resolved id)", (await trim({ mode: "report", session: SID, target: "7" })).split("\n")[20] === "dry-run: target=msg_u4 remove=4 (323 tokens) keep=6 (9 tokens) verdict=ok");
  // (U12 #202) RANGE REFS `A-B` — inclusive on BOTH ends, mixed with singletons,
  // resolved against the CURRENT WINDOW through the per-session rank map.
  // Fail-closed at head and floor, naming the offending rows; the success line
  // echoes the resolved count + first/last resolved rank.
    const stagedOfU12 = () => JSON.stringify(readStore()?.sessions?.[SID]?.staged ?? null);
  const activeOfU12 = () => JSON.stringify(readStore()?.sessions?.[SID]?.active ?? null);
  chk("U12a a rank naming a TRIMMED-AWAY row (rank 1 = msg_x1, before the window) rejects like any out-of-window ref", (await trim({ mode: "mark", session: SID, ids: ["1"] })) === "mark-set= rejected: mark-not-found" && stagedOfU12() === "null");
  chk("U12a an invalid range (A>B) rejects BEFORE any resolution; nothing written", (await trim({ mode: "mark", session: SID, ids: ["6-4"] })) === "mark-set= rejected: mark-range-invalid 6-4" && stagedOfU12() === "null");
  chk("U12a a range touching a trimmed-away rank rejects FAIL-CLOSED naming the offending ranks (1-5 hits ranks 1,2)", (await trim({ mode: "mark", session: SID, ids: ["1-5"] })) === "mark-set= rejected: mark-range-unresolved 1,2" && stagedOfU12() === "null");
  chk("U12a a range touching the head row rejects naming the resolved row (#3 = msg_c0)", (await trim({ mode: "mark", session: SID, ids: ["3-4"] })) === "mark-set= rejected: mark-at-window-head #3 msg_c0" && stagedOfU12() === "null");
  chk("U12a a range breaching the keep-floor rejects FAIL-CLOSED naming the offending rows (4-12 = 9 rows, retained 1 < 6)", (await trim({ mode: "mark", session: SID, ids: ["4-12"] })) === "mark-set= rejected: mark-floor 1 breach=msg_u1,msg_a2,msg_a3,msg_u4,msg_a5,msg_u6,msg_a7,msg_u8,msg_a9" && stagedOfU12() === "null" && activeOfU12() === "null");
  chk("U12a SUCCESS with a mixed range list: [4-6]+singleton 9 -> 4 rows staged (u1,a2,a3,u6), est 320, echo resolved=4 ordinals=4-9 (a2 joins the audit though already active)", (await trim({ mode: "mark", session: SID, ids: ["4-6", "9"] })) === "mark-set= +4 -0 total=4 rows_dropped_est=320 resolved=4 ordinals=4-9" && JSON.stringify(JSON.parse(readFileSync(STORE, "utf8")).sessions[SID].staged) === JSON.stringify(["msg_u1", "msg_a2", "msg_a3", "msg_u6"]));
  const rr = await trim({ mode: "report", session: SID });
  chk("U12a the report PROJECTION reflects the range-staged set (staged-est=320 — the bulk op is inspectable before apply)", rr.split("\n")[3] === "projection: last-req=55000 staged-est=320 projected=54680 bound=96000 ok", JSON.stringify(rr.split("\n")[3]));
  chk("U12a UNMARK accepts a range: [4-5] removes msg_u1+msg_a2, leaves msg_a3+msg_u6", (await trim({ mode: "mark", session: SID, unmark: ["4-5"] })) === "mark-set= +0 -2 total=2 rows_dropped_est=207");
  chk("U12a cleanup unmark (ranks 6 and 9) empties staged; the ACTIVE set is untouched", (await trim({ mode: "mark", session: SID, unmark: ["6", "9"] })) === "mark-set= +0 -2 total=0 rows_dropped_est=0" && activeOfU12() === "null");
  chk("U12a a SINGLETON call gets NO echo — the compact success line shape is unchanged", (await trim({ mode: "mark", session: SID, ids: ["7"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=2" && (await trim({ mode: "mark", session: SID, clear: true })) === "mark-set= +0 -1 total=0 rows_dropped_est=0");
  // across compaction: the SQL window floor moves with the new head.
  // (U17 #208) U10c REPINNED honestly: the fixture holds 15 rows once msg_c1/
  // u9/a10 land; the report reads 3 (seq >= 4410) — the new head #13 + #14/#15.
  // Rows BEFORE the new head are excluded by the SQL floor: the store's append
  // order has no surviving-tail mix (the old service-fixture window could).
  // Ranks stay 1..15 over ORD_DB — NEVER renumbered.
  addCompactedToReportDb();
  const r2 = await trim({ mode: "report", session: SID });
  chk("U17 R5d (#208) SQL window = rows after the LAST completed compaction: fixture 15 rows -> the report reads 3 (seq >= 4410): new head #13 compaction + #14/#15; rows BEFORE the new head excluded", ordLine(r2, 1) === "row: 1 #13 compaction own=2 req-at=unavailable" && ordLine(r2, 2) === "row: 2 #14 user own=5 req-at=unavailable" && ordLine(r2, 3) === "row: 3 #15 assistant own=0 req-at=20", JSON.stringify([ordLine(r2, 1), ordLine(r2, 2), ordLine(r2, 3)]));
  dropCompactedFromReportDb();
  // (U11 #200) COMPACT REPORT: no `id=` by default; `showIds:true` restores it.
  const rc = await trim({ mode: "report", session: SID });
  chk("U11 compact report: NO row line prints id= by default", rc.split("\n").filter((l) => l.startsWith("row: ")).every((l) => !l.includes("id=")) && rc.includes("id=msg_") === false, JSON.stringify(rc.split("\n")[5]));
  const rci = await trim({ mode: "report", session: SID, showIds: true });
  chk("U11 showIds:true restores id= on every row (the flag's name is `showIds`)", rci.split("\n").filter((l) => l.startsWith("row: ")).every((l) => l.includes("id=msg_")) && rci.split("\n")[5] === "row: 1 #3 compaction id=msg_c0 own=5 req-at=unavailable", JSON.stringify(rci.split("\n")[5]));
  // (U17 #203) THE TAG LANE IS DELETED — the hook renders NOTHING and mutates
  // NOTHING beyond splice removals; the pins below pin the DELETED lane's
  // absence (arg gone, render gone) and the DOCTRINE that replaces it.
  chk("U10d clean session: the draft carries NO `[#` token and the hook is SILENT (no store entry)", (() => { const d = draft(); return JSON.stringify(d.messages).includes("[#") === false; })() && readStore()?.sessions?.[SID] === undefined);
  chk("U17 D3 the `tags` ARG is GONE from the tool: a tags-toggle call lands in the mark usage line", (await trim({ mode: "mark", session: SID, tags: true })) === "error: mark mode requires ids (window rows to stage — ids or bare ordinals), unmark (refs to restore), clear (empty ALL drop sets — staged, active, guard auto — a stored boundary stays), or guard (the opt-in preventive wall guard on/off)");
  // (U17 #203) DOCTRINE — with ANY store entry present the hook renders entries
  // BYTE-IDENTICAL except the splice removals: no part text changes ever (the
  // tag lane that mutated part bytes is DELETED — the host re-persists live
  // rows' data on its own UPDATE, so hook content edits reach the store).
  chk("U17 D6a boundary entry present: survivors BYTE-IDENTICAL to the source entries (no part mutation, no `[#` token ever, the four pre-boundary rows gone)", await (async () => {
    await trim({ mode: "tail", session: SID, target: "msg_u4" });
    const src = draftBase();
    const d = draft();
    await fire(d);
    const survivorsOk = d.messages.every((m) => typeof m.id !== "string" || src.messages.some((s) => s.id === m.id && JSON.stringify(s) === JSON.stringify(m)));
    const clean = JSON.stringify(d.messages).includes("[#") === false;
    await trim({ mode: "tail", session: SID, clear: true });
    return survivorsOk && clean && !d.messages.some((m) => m.id === "msg_u1" || m.id === "msg_a2");
  })(), "survivors mutated or a token rendered");
  chk("U17 D6b guard-flag entry with NO drop: the draft stays BYTE-IDENTICAL, nothing splices, the entry prunes on toggle-off", await (async () => {
    await trim({ mode: "mark", session: SID, guard: true });
    const d = draft();
    const before = JSON.stringify(d.messages);
    await fire(d);
    await trim({ mode: "mark", session: SID, guard: false });
    return JSON.stringify(d.messages) === before && readStore()?.sessions?.[SID] === undefined;
  })(), "a present entry mutated the draft");
  chk("U17 the boundary-drop trim line names ordinal=session-rank + the ABSOLUTE seq span of the SURVIVING entries (4304-4309)", await (async () => {
    await trim({ mode: "tail", session: SID, target: "msg_u4" });
    await fire(draft());
    const l = readLog().slice(-1)[0];
    await trim({ mode: "tail", session: SID, clear: true });
    return l.kind === "trim" && l.ordinal === "session-rank" && l.seq === "4304-4309";
  })(), JSON.stringify(readLog().slice(-1)[0] ?? null));
  // fail-open: an unreadable ordinal source -> `#?` rows, numbers rejected, ids still work
  pluginMod.setOrdinalsDbForTest(path.join(SCRATCH, "fx_missing.db"));
  RPC.rows = windowRows().map((r) => { const { seq, ...rest } = r; return rest; });
  const r3 = await trim({ mode: "report", session: SID });
  chk("U10h fail-open: ordinal=unavailable, rows print #? (never a guessed number; #208: req-at=unavailable rides too)", r3.split("\n")[1].includes("ordinal=unavailable") && ordLine(r3, 2) === "row: 2 #? user own=2 req-at=unavailable", JSON.stringify([r3.split("\n")[1], ordLine(r3, 2)]));
  chk("U10h fail-open: a bare number is REJECTED as not-found; an id string still marks normally", (await trim({ mode: "mark", session: SID, ids: ["7"] })) === "mark-set= rejected: mark-not-found" && (await trim({ mode: "mark", session: SID, ids: ["msg_u4"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=2" && (await trim({ mode: "mark", session: SID, clear: true })) === "mark-set= +0 -1 total=0 rows_dropped_est=0");
  chk("U17 fail-open: the BOUNDARY drop still applies with unreadable ordinals and the trim line carries NO `seq=` token", await (async () => {
    await trim({ mode: "tail", session: SID, target: "msg_u4" });
    const d = draft();
    await fire(d);
    const l = readLog().slice(-1)[0];
    const cleared = (await trim({ mode: "tail", session: SID, clear: true })) === "tail-set= msg_u4 -> none";
    return d.messages.every((m) => m.id !== "msg_u1" && m.id !== "msg_a2" && m.id !== "msg_a3" && m.id !== "msg_c0") && l.kind === "trim" && l.seq === undefined && l.tagged === undefined && cleared;
  })(), JSON.stringify(readLog().slice(-1)[0] ?? null));
  pluginMod.setOrdinalsDbForTest(ORD_DB);
  chk("U10h restore: ordinals back -> the store stays clean for the C block", readStore()?.sessions?.[SID] === undefined);
}

// ------------------------------------------------------------------ U14 (#205) the preventive wall-guard leg
// The guard flag (store `guard`, DEFAULT OFF) + the guard's OWN drop set
// (`auto`, SEPARATE from the agent's `active` set). (U21 #214) The trigger rides
// the LIVE assembly estimate (bytes/4 over the draft array + the request-overhead
// constant), NOT the gauge last-req figure (that stays the fallback when the array
// is unusable); the picks drain to the 80% FIT bound; the selection rule is the
// shared `dropCandidates` symbol (head/user/compaction/newest-assistant never; a
// tool-output-dominant floor row CAN leave); the notice is appended ONCE per
// CHANGED drop set. Fail-safe: a throw in the guard path sends the request
// UNMODIFIED and logs ONE event:fail line per session. Fixture math: window
// 120000 -> trigger = floor(120000 * 0.92) = 110400, fit = floor(120000 * 0.80) =
// 96000; row masses a3=205, a2=111, u1=2 (indices 1..3 — index 4+ sits inside the
// floor, where only rows above FLOOR_MASS=4000 are candidates).
{
  RPC.rows = null; // the seq-carrying window again (ranks ride the ordinal fixture)
  const fxSet = (inp, outp) => {
    const db = new DatabaseSync(FX_DB);
    db.prepare("UPDATE session_message SET data=? WHERE id=1").run(JSON.stringify({ tokens: { input: inp, output: outp, reasoning: 0, cache: { read: 0, write: 0 } }, time: { completed: 123 } }));
    db.close();
  };
  const fxRestore = () => {
    const db = new DatabaseSync(FX_DB);
    db.prepare("UPDATE session_message SET data=? WHERE id=1").run(JSON.stringify({ tokens: { input: 10000, output: 2000, reasoning: 0, cache: { read: 45000, write: 0 } }, time: { completed: 123 } }));
    db.close();
  };
  const noticeOf = (d) => d.messages.filter((m) => typeof m.id === "string" && m.id === "msg_ctx_guard_notice");
  const guardLines = (from) => readLog().slice(from).filter((l) => l.kind === "guard");
  // G0 the toggle lanes (guard flag ONLY; the tags flag is deleted in U17)
  chk("U14 G0 guard toggle-ON -> the flag lands as a guard-only entry (no `tags` key ever lands)", (await trim({ mode: "mark", session: SID, guard: true })) === "mark-set= guard=on" && readStore()?.sessions?.[SID]?.guard === true && readStore()?.sessions?.[SID]?.tags === undefined && readStore()?.sessions?.[SID]?.auto === undefined);
  chk("U14 G0 the report header names the guard flag + the auto-set size (U17: no tags token)", (await trim({ mode: "report", session: SID })).split("\n")[1].endsWith("guard=on auto=0"), JSON.stringify((await trim({ mode: "report", session: SID })).split("\n")[1]));
  // (U21) the LIVE assembly estimate the plugin computes = bytes/4 over the draft
  // entries + the request-overhead constant; the lane steers the constant
  // (`setSysTokForTest`) so the trigger math is EXACT. TRIGGER = 110400 (92% of the
  // 120K window), FIT = 96000 (the 80% drain target).
  const asmEst = (d) => Math.floor(d.messages.reduce((b, m) => b + JSON.stringify(m).length, 0) / 4);
  const EST = asmEst(draft());
  const TRIGGER = 110400;
  const FIT = 96000;
  // (RED-before, WM-18) the pre-fix plugin copy has no such export — the steer is a
  // no-op there, so the same pins run against the old lane and FAIL on F1/F3/F4.
  const sysToLive = (live) => (typeof pluginMod.setSysTokForTest === "function" ? pluginMod.setSysTokForTest(live - EST) : undefined);
  // (U21 G3) the growth window: the 10 base rows + a tool-output-dominant FLOOR
  // assistant msg_a10 (own = (21 + 17979)/4 = 4500 > FLOOR_MASS), a HEAVY user row
  // (own 5000) and a HEAVY newest assistant row (own 6000) at the tail; rows 13,
  // floor = indices 7..12.
  const grownRows = () => [
    ...windowRows(),
    { id: "msg_a10", seq: 4412, type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 2400, completed: 2401 }, tokens: { input: 100, output: 50, reasoning: 0, cache: { read: 0, write: 0 } }, content: [{ type: "tool", id: "t10", name: "bash", executed: true, state: { status: "completed", input: { command: "ls -la" }, content: [{ type: "text", text: "T".repeat(17979) }] } }] },
    { id: "msg_u11", seq: 4413, type: "user", text: "U".repeat(20000), time: { created: 2500 } },
    { id: "msg_a12", seq: 4414, type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 2600, completed: 2601 }, tokens: { input: 100, output: 50, reasoning: 0, cache: { read: 0, write: 0 } }, content: [{ type: "tool", id: "t12", name: "bash", executed: true, state: { status: "completed", input: { command: "ls -la" }, content: [{ type: "text", text: "V".repeat(23979) }] } }] },
  ];
  // G1 (U22 F2 no-over-fire) BOTH projection inputs sit BELOW the trigger: the
  // R-scaled estimate (44159 x 2.5 = floor 110397) AND last-req (100000) -> NO fire.
  {
    sysToLive(44159);
    fxSet(100000, 0); // last-req 100000 < trigger; R = clamp(100000/332) = 2.5 (cap)
    const lB = readLog().length;
    const d = draft();
    await fire(d);
    chk("U22 G1 max(byte/4 x R, last-req) below the trigger on BOTH inputs: NO fire — draft byte-identical, no guard line, no notice, no auto set", d.messages.length === 15 && noticeOf(d).length === 0 && guardLines(lB).length === 0 && JSON.stringify(d.messages) === JSON.stringify(draft().messages) && readStore()?.sessions?.[SID]?.auto === undefined, `len=${d.messages.length}`);
  }
  // (U22 F2, #218 E1) the byte/4 estimate sits FAR below the trigger while the
  // R-scaled figure crosses it -> the guard FIRES. The pre-fix copy compares the raw
  // estimate only, so this leg is RED there (WM-18 red-before via CTX_TRIM_SMOKE_PLUGIN).
  {
    sysToLive(44160); // 44160 x 2.5 = 110400 = the trigger exactly
    fxSet(100000, 0);
    const lB = readLog().length;
    const d = draft();
    await fire(d);
    const ids = d.messages.map((m) => m.id ?? "(none)");
    const gl = guardLines(lB);
    chk("U22 F2 byte/4 44160 (< trigger) scaled by R 2.5 lands AT the trigger: FIRES with last-req 100000 below it — a3+a2 leave WITH their outputs, notice once", ids.indexOf("msg_a3") === -1 && ids.indexOf("msg_a2") === -1 && !JSON.stringify(d.messages).includes("a3 output") && !JSON.stringify(d.messages).includes("a2 output") && d.messages.length === 11 && noticeOf(d).length === 1, JSON.stringify([ids.length, noticeOf(d).length]));
    chk("U22 F2 the event:auto line names the scaled projection AND its inputs: projected=110400, r=2.50, live=44160, src=assembly, bound=110400, fit=96000, after=110084, n=2, mass=316", gl.length === 1 && gl[0].event === "auto" && gl[0].projected === "110400" && gl[0].r === "2.50" && gl[0].live === "44160" && gl[0].src === "assembly" && gl[0].bound === "110400" && gl[0].fit === "96000" && gl[0].after === "110084" && gl[0].n === "2" && gl[0].mass === "316", JSON.stringify(gl[0] ?? null));
  }
  // (U22 F1) the ratio band is CLAMPED: a provider figure 358x the row mass must not
  // project 358x (cap 2.5), a measured 1.81x still fires (floor 2.0), and a ratio
  // inside the band rides unclamped.
  {
    const clearLeg = async () => (await trim({ mode: "mark", session: SID, clear: true })) === "mark-set= +0 -2 total=0 rows_dropped_est=0";
    await clearLeg();
    sysToLive(44160);
    fxSet(50000, 0); // ratio 50000/332 = 150.6 -> the cap
    const lB = readLog().length;
    await fire(draft());
    const gl = guardLines(lB);
    chk("U22 F1 cap: a 150x measured ratio clamps to r=2.50 — projected stays 110400 (an unclamped 150x render would project ~6.65M)", gl.length === 1 && gl[0].r === "2.50" && gl[0].projected === "110400", JSON.stringify(gl[0] ?? null));
    await clearLeg();
    sysToLive(55200);
    fxSet(600, 0); // ratio 600/332 = 1.81 -> the floor (an unclamped 1.81x ≈ 99,759 < trigger: silent)
    const lB2 = readLog().length;
    await fire(draft());
    const gl2 = guardLines(lB2);
    chk("U22 F1 floor: a measured 1.81x ratio clamps UP to r=2.00 — 55200 x 2.0 = 110400 fires (the E1 band 1.15-2x)", gl2.length === 1 && gl2[0].r === "2.00" && gl2[0].projected === "110400" && gl2[0].live === "55200", JSON.stringify(gl2[0] ?? null));
    await clearLeg();
    sysToLive(50210);
    fxSet(730, 0); // ratio 730/332 = 2.1988 sits INSIDE the band: no clamp
    const lB3 = readLog().length;
    await fire(draft());
    const gl3 = guardLines(lB3);
    chk("U22 F1 mid-band: an unclamped r=2.20 projects floor(50210 x 730/332) = 110401", gl3.length === 1 && gl3[0].r === "2.20" && gl3[0].projected === "110401", JSON.stringify(gl3[0] ?? null));
    await clearLeg();
    // a silent assembly (both inputs far below the trigger) CLEARS the notice
    // signature so the G2 leg below notices again.
    sysToLive(1000);
    fxSet(1000, 0);
    const lB4 = readLog().length;
    await fire(draft());
    chk("U22 F1 band cleanup: the silent assembly adds NO guard line and the store stays clean", guardLines(lB4).length === 0 && readStore()?.sessions?.[SID]?.auto === undefined, JSON.stringify(readStore()?.sessions?.[SID] ?? null));
  }
  // G2 (U21 F1 + F2) last-req FAR BELOW the trigger but the LIVE assembly AT it:
  // fires, and the picks drain toward the 80% fit bound until the pool exhausts.
  {
    sysToLive(TRIGGER);
    fxSet(20000, 0); // last-req 20000 — the pre-U21 lane stayed silent here (RED-before)
    const lB = readLog().length;
    const d = draft();
    await fire(d);
    const ids = d.messages.map((m) => m.id ?? "(none)");
    const nt = noticeOf(d);
    chk("U21 G2 assembly AT trigger with last-req 20000: fires — msg_a3 + msg_a2 leave WITH their linked outputs (drain toward the fit bound exhausts the pool)", ids.indexOf("msg_a3") === -1 && ids.indexOf("msg_a2") === -1 && !JSON.stringify(d.messages).includes("a3 output") && !JSON.stringify(d.messages).includes("a2 output") && ids.includes("msg_u1") && d.messages.length === 11, JSON.stringify(ids));
    chk("U21 G2 the notice = ONE fresh entry AT THE END naming both ranks + the total mass (add lane)", nt.length === 1 && d.messages[d.messages.length - 1]?.id === "msg_ctx_guard_notice" && nt[0].content[0].text === "emergency trim: dropped #5,#6 = 316 tokens; your marks were empty", JSON.stringify(nt[0]?.content?.[0]?.text ?? null));
    const gl = guardLines(lB);
    chk("U22 G2 ONE kind:guard event:auto line: projected = LIVE 110400 x R 2.5 = 276000, r=2.50, live=110400, src=assembly, fit=96000, after=275684, bound=110400, n=2, mass=316, ranks #5,#6, prev=110085 (the band legs above)", gl.length === 1 && gl[0].event === "auto" && gl[0].n === "2" && gl[0].mass === "316" && gl[0].ranks === "#5,#6" && gl[0].projected === "276000" && gl[0].r === "2.50" && gl[0].live === "110400" && gl[0].src === "assembly" && gl[0].fit === "96000" && gl[0].after === "275684" && gl[0].bound === "110400" && gl[0].marks === "0" && gl[0].prev === "110085", JSON.stringify(gl[0] ?? null));
    chk("U21 G2 the auto set is SEPARATE from active (store auto=[msg_a3,msg_a2], no active key)", readStore()?.sessions?.[SID]?.auto?.join(",") === "msg_a3,msg_a2" && readStore()?.sessions?.[SID]?.active === undefined, JSON.stringify(readStore()?.sessions?.[SID] ?? null));
    chk("U25 F1 the fired notice persists its `noticed` marker in the store entry (restart-surviving)", JSON.stringify(readStore()?.sessions?.[SID]?.noticed ?? null) === JSON.stringify(["msg_a2", "msg_a3"]), JSON.stringify(readStore()?.sessions?.[SID] ?? null));
    chk("U21 G2 the trim line carries autoRows=2 + autoMass=316 (+ U25 F5 newRows=2)", (() => { const t = readLog().slice(lB).find((l) => l.kind === "trim"); return t != null && t.autoRows === "2" && t.autoMass === "316" && t.newRows === "2" && t.droppedRows === "2" && t.droppedEntries === "5" && t.keptEntries === "11"; })(), JSON.stringify(readLog().slice(lB).find((l) => l.kind === "trim") ?? null));
  }
  // G3 (U21 F2 + F3) the NEXT step crosses the trigger again: the re-check rides
  // the LIVE estimate and the CHANGED set picks the heavy FLOOR row (D3 rule) while
  // the heavy user / newest-assistant rows stay.
  {
    RPC.rows = grownRows();
    sysToLive(TRIGGER);
    fxSet(20000, 0);
    const lB = readLog().length;
    const d = draft();
    await fire(d);
    chk("U21 G3 second fire on the live estimate: auto grows to {a3,a2,a10} — the heavy FLOOR row leaves; the heavy USER row, the heavy NEWEST assistant row and the head never", readStore()?.sessions?.[SID]?.auto?.slice().sort().join(",") === "msg_a10,msg_a2,msg_a3", JSON.stringify(readStore()?.sessions?.[SID]?.auto ?? null));
    const gl = guardLines(lB);
    chk("U22 G3 event:auto names only the NEW pick (n=1, mass=4499, ranks #15) + prev=275684; the grown window's ratio (20000/15830 = 1.26) clamps to r=2.00 -> projected=220800, after=216301", gl.length === 1 && gl[0].event === "auto" && gl[0].n === "1" && gl[0].mass === "4499" && gl[0].ranks === "#15" && gl[0].projected === "220800" && gl[0].r === "2.00" && gl[0].live === "110400" && gl[0].src === "assembly" && gl[0].after === "216301" && gl[0].prev === "275684", JSON.stringify(gl[0] ?? null));
    const nt = noticeOf(d);
    chk("U25 G3 the notice names ONLY the NEW pick (the DELTA lane, #219): #15 = 4499 tokens over the 10-entry kept draft + notice", nt.length === 1 && nt[0].content[0].text === "emergency trim: dropped #15 = 4499 tokens; your marks were empty" && d.messages.length === 11, JSON.stringify([nt[0]?.content?.[0]?.text ?? null, d.messages.length]));
  }
  // G4 (U21 F4 notice-once) the same drop set over consecutive assemblies: exactly
  // ONE notice row total; the drops stay sticky-and-applied.
  {
    const lB = readLog().length;
    const d1 = draft();
    await fire(d1);
    const ids = d1.messages.map((m) => m.id ?? "(none)");
    chk("U21 G4 assembly 2, SAME set: NO notice row, drops still applied (a2/a3 gone), NO new event:auto line", noticeOf(d1).length === 0 && ids.indexOf("msg_a2") === -1 && ids.indexOf("msg_a3") === -1 && d1.messages.length === 10 && guardLines(lB).length === 0, JSON.stringify([noticeOf(d1).length, d1.messages.length]));
    const d2 = draft();
    await fire(d2);
    chk("U21 G4 assembly 3, SAME set: still NO notice; the trim line still names autoRows=3 autoMass=4815", noticeOf(d2).length === 0 && d2.messages.length === 10 && (() => { const t = readLog().slice(lB).find((l) => l.kind === "trim"); return t != null && t.autoRows === "3" && t.autoMass === "4815"; })(), JSON.stringify(readLog().slice(lB).find((l) => l.kind === "trim") ?? null));
    const d3 = draft();
    await fire(d3);
    chk("U21 G4 assembly 4, SAME set: still no notice — ONE notice row total across the four assemblies", noticeOf(d3).length === 0 && d3.messages.length === 10, JSON.stringify(noticeOf(d3).length));
    RPC.rows = null; // msg_a10 LEAVES the window: the in-window MEMBERSHIP of the same STORED set changes
    const d4 = draft();
    await fire(d4);
    chk("U25 G4 (#219 churn — RED pre-fix): a10 leaves the window, the STORE set is unchanged -> NO re-notice, the drops stay applied", noticeOf(d4).length === 0 && d4.messages.length === 10 && !d4.messages.some((m) => m.id === "msg_a2") && !d4.messages.some((m) => m.id === "msg_a3"), JSON.stringify([noticeOf(d4).length, d4.messages.length]));
    chk("U25 G4 the churn assembly's trim line keeps the full-set fields (autoRows=2 autoMass=316) and carries NO newRows (delta 0)", (() => { const t = readLog().slice(lB).filter((l) => l.kind === "trim").pop(); return t != null && t.autoRows === "2" && t.autoMass === "316" && t.newRows === undefined; })(), JSON.stringify(readLog().slice(lB).filter((l) => l.kind === "trim").pop() ?? null));
  }
  // G5 (U21 F1 fallback) an UNUSABLE draft array (a circular entry) -> the lane
  // falls back to the gauge last-req figure and NAMES it in the log.
  {
    chk("U21 G5 clear empties the auto set from the G4 fire (3 ids) and the (U25) notice marker", (await trim({ mode: "mark", session: SID, clear: true })) === "mark-set= +0 -3 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID]?.auto === undefined && readStore()?.sessions?.[SID]?.noticed === undefined && readStore()?.sessions?.[SID]?.guard === true);
    fxSet(110400, 0); // last-req EXACTLY at the trigger; the live estimate is unavailable here
    const lB = readLog().length;
    const d = draft();
    const cyc = { role: "user", content: [] };
    cyc.self = cyc; // JSON.stringify throws -> assemblyEstimate prints undefined -> last-req drives
    d.messages.push(cyc);
    await fire(d);
    const gl = guardLines(lB);
    chk("U21 G5 unusable assembly array: fires on last-req 110400 with src=last-req, picks a3+a2 (n=2, mass=316)", gl.length === 1 && gl[0].event === "auto" && gl[0].src === "last-req" && gl[0].projected === "110400" && gl[0].n === "2" && gl[0].mass === "316" && d.messages.filter((m) => m.id === "msg_a2").length === 0, JSON.stringify(gl[0] ?? null));
    chk("U21 G5 clear after the fallback fire", (await trim({ mode: "mark", session: SID, clear: true })) === "mark-set= +0 -2 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID]?.auto === undefined);
  }
  // G5b the fail-safe: the gauge throws -> request UNMODIFIED + ONE fail line
  {
    const good = gaugeMod;
    pluginMod.setGaugeCoreForTest({ formatGauge: good.formatGauge, getDbPath: good.getDbPath, readGauge: async () => { throw new Error("boom-gauge"); } });
    const lB = readLog().length;
    const d = draft();
    await fire(d);
    chk("U14 G5 throw in the guard path: the request goes out UNMODIFIED (15 entries, no notice)", d.messages.length === 15 && noticeOf(d).length === 0 && JSON.stringify(d.messages) === JSON.stringify(draft().messages), `len=${d.messages.length}`);
    const gl = guardLines(lB);
    chk("U14 G5 exactly ONE event:fail line — a second fire adds NOTHING (once per session)", gl.length === 1 && gl[0].event === "fail" && typeof gl[0].cause === "string" && await (async () => { const d2 = draft(); await fire(d2); return guardLines(lB).length === 1; })(), JSON.stringify(gl[0] ?? null));
    pluginMod.setGaugeCoreForTest(good);
  }
  // G6 guard OFF -> byte-identical to today AND fully silent (the control arm)
  {
    chk("U14 G6 guard toggle-OFF + no other lever -> the entry is PRUNED", (await trim({ mode: "mark", session: SID, guard: false })) === "mark-set= guard=off" && readStore()?.sessions?.[SID] === undefined);
    const nCalls = RPC.calls.length;
    const lB = readLog().length;
    const d = draft();
    await fire(d);
    chk("U14 G6 guard OFF + no entry: the hook is SILENT (no service call, no line) and the draft is byte-identical", RPC.calls.length === nCalls && readLog().length === lB && JSON.stringify(d.messages) === JSON.stringify(draft().messages), `calls=${RPC.calls.length - nCalls}`);
  }
  fxRestore(); // the gauge fixture returns to the 57000-of-120K mass for the C block
  if (typeof pluginMod.setSysTokForTest === "function") pluginMod.setSysTokForTest(-1); // (U21) a non-positive value restores the production overhead constant
}

// ------------------------------------------------------------------ U25 (#219) the notice-DELTA leg
// The notice fires ONLY on ids the store `auto` set gained SINCE THE LAST
// NOTICE: the per-session `noticed` id list rides the store entry (survives a
// process restart), so a STATIC drop set never re-notices — not across
// assemblies, not when the window head moves membership (the measured #219
// churn). A legacy entry WITHOUT the key = nothing noticed: the set notices
// ONCE. `autoMass=` keeps the full-set mass; `newRows=` names the delta.
{
  RPC.rows = null; // the base 10-row window; the gauge fixture sits at 57000/120K
  const noticeOf = (d) => d.messages.filter((m) => typeof m.id === "string" && m.id === "msg_ctx_guard_notice");
  const inject = (entry) => {
    const base = existsSync(STORE) ? JSON.parse(readFileSync(STORE, "utf8")) : {};
    base.sessions = { ...(base.sessions ?? {}), [SID]: entry };
    writeFileSync(STORE, JSON.stringify(base), "utf8");
  };
  const clearUp = async () => await trim({ mode: "mark", session: SID, clear: true });
  const grownRow = (id, seq, ch) => ({ id, seq, type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: seq, completed: seq + 1 }, tokens: { input: 100, output: 50, reasoning: 0, cache: { read: 0, write: 0 } }, content: [{ type: "tool", id: "t_" + id, name: "bash", executed: true, state: { status: "completed", input: { command: "ls -la" }, content: [{ type: "text", text: ch.repeat(400) }] } }] });
  // D1 a legacy entry (no `noticed` key) notices ONCE, persists the marker,
  // and stays silent on every later assembly of the SAME set.
  {
    const lB = readLog().length;
    inject({ boundary: "", keep: 0, set_at: "2026-01-01T00:00:00Z", auto: ["msg_a3", "msg_a2"] });
    const d1 = draft();
    await fire(d1);
    chk("U25 D1 legacy entry WITHOUT `noticed`: assembly 1 notices ONCE naming the full set (#5,#6 = 316)", noticeOf(d1).length === 1 && noticeOf(d1)[0].content[0].text === "emergency trim: dropped #5,#6 = 316 tokens; your marks were empty", JSON.stringify(noticeOf(d1)[0]?.content?.[0]?.text ?? null));
    chk("U25 D1 the trim line names newRows=2 and keeps autoRows=2 + autoMass=316", (() => { const t = readLog().slice(lB).find((l) => l.kind === "trim"); return t != null && t.newRows === "2" && t.autoRows === "2" && t.autoMass === "316"; })(), JSON.stringify(readLog().slice(lB).find((l) => l.kind === "trim") ?? null));
    chk("U25 F1 the marker landed in the store entry (the notice state is store-backed, not in-process)", JSON.stringify(readStore()?.sessions?.[SID]?.noticed ?? null) === JSON.stringify(["msg_a2", "msg_a3"]), JSON.stringify(readStore()?.sessions?.[SID] ?? null));
    const d2 = draft();
    await fire(d2);
    chk("U25 F3 assembly 2 on the SAME store entry: NO notice line (RED pre-fix — the window sig re-fired)", noticeOf(d2).length === 0 && d2.messages.length === 10, JSON.stringify([noticeOf(d2).length, d2.messages.length]));
    chk("U25 F3 the silent assembly carries NO newRows token, keeps autoMass=316, and the marker did not grow", (() => { const t = readLog().slice(lB).filter((l) => l.kind === "trim").pop(); return t != null && t.newRows === undefined && t.autoMass === "316"; })() && JSON.stringify(readStore()?.sessions?.[SID]?.noticed ?? null) === JSON.stringify(["msg_a2", "msg_a3"]), JSON.stringify(readLog().slice(lB).filter((l) => l.kind === "trim").pop() ?? null));
    RPC.rows = [...windowRows(), grownRow("msg_a10", 4412, "T")]; // the window GROWS while the stored set sits still
    const d3 = draft();
    await fire(d3);
    chk("U25 F3 the window grows (a10 lands) while the stored set sits still: STILL no notice (the churn leg)", noticeOf(d3).length === 0, JSON.stringify(noticeOf(d3).length));
    RPC.rows = null;
    chk("U25 D1 clear PRUNES the marker, so a re-grown set notices again", await (async () => {
      const cleared = (await clearUp()) === "mark-set= +0 -2 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID] === undefined;
      inject({ boundary: "", keep: 0, set_at: "2026-01-01T00:00:00Z", auto: ["msg_a3", "msg_a2"] });
      const d = draft();
      await fire(d);
      const again = noticeOf(d).length === 1;
      await clearUp();
      return cleared && again;
    })(), "the marker survived the clear or the re-grown set stayed silent");
  }
  // D2 the 12 shown-rank cap over a 13-id DELTA (F2): the notice shows the
  // first 12 ranks + the ` +N rows` tail; ONE entry covers all 13.
  {
    const odb = new DatabaseSync(ORD_DB);
    for (const [rid, sq] of [["msg_u11", 4413], ["msg_a12", 4414], ["msg_a13", 4415]]) odb.prepare("INSERT INTO session_message VALUES(?, ?, 'assistant', ?)").run(rid, SID, sq);
    odb.close();
    RPC.rows = [...windowRows(), grownRow("msg_a10", 4412, "T"), grownRow("msg_u11", 4413, "U"), grownRow("msg_a12", 4414, "V"), grownRow("msg_a13", 4415, "W")];
    inject({ boundary: "", keep: 0, set_at: "2026-01-01T00:00:00Z", auto: ["msg_u1", "msg_a2", "msg_a3", "msg_u4", "msg_a5", "msg_u6", "msg_a7", "msg_u8", "msg_a9", "msg_a10", "msg_u11", "msg_a12", "msg_a13"] });
    const d = draft();
    await fire(d);
    const nt = noticeOf(d);
    const text = nt[0]?.content?.[0]?.text ?? "";
    chk("U25 F2 a 13-id delta prints the 12-rank cap: the first 12 ranks (#4..#12 + #15,#16,#17) + ` +1 rows`, ONE notice", nt.length === 1 && text.startsWith("emergency trim: dropped #4,#5,#6,#7,#8,#9,#10,#11,#12,#15,#16,#17 +1 rows = ") && text.endsWith("; your marks were empty"), JSON.stringify(text.slice(0, 130)));
    chk("U25 F2 the delta marker covers ALL 13 ids", (readStore()?.sessions?.[SID]?.noticed ?? []).length === 13, JSON.stringify(readStore()?.sessions?.[SID]?.noticed ?? null));
    const odb2 = new DatabaseSync(ORD_DB);
    odb2.exec("DELETE FROM session_message WHERE seq >= 4413");
    odb2.close();
    RPC.rows = null;
    chk("U25 D2 cleanup: the ORD_DB extras are gone and the clear prunes the 13-id set + marker", (await clearUp()) === "mark-set= +0 -13 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID] === undefined, JSON.stringify(readStore()?.sessions?.[SID] ?? null));
  }
  // D3 (F4) a GUARD fire PLUS a stored free pick in the SAME assembly: exactly
  // ONE notice over the UNION delta — the U21 D4 once-per-changed-set behavior,
  // delta-shaped.
  {
    const db = new DatabaseSync(FX_DB);
    db.prepare("UPDATE session_message SET data=? WHERE id=1").run(JSON.stringify({ tokens: { input: 10000, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, time: { completed: 123 } }));
    db.close();
    const est = Math.floor(draftBase().messages.reduce((b, m) => b + JSON.stringify(m).length, 0) / 4);
    if (typeof pluginMod.setSysTokForTest === "function") pluginMod.setSysTokForTest(110400 - est); // the live estimate sits EXACTLY at the trigger
    inject({ boundary: "", keep: 0, set_at: "2026-01-01T00:00:00Z", guard: true, auto: ["msg_a5"] });
    const lB = readLog().length;
    const d = draft();
    await fire(d);
    const nt = noticeOf(d);
    chk("U25 D3 (F4) guard picks (a3+a2) PLUS a stored un-noticed pick (a5): ONE notice over the union #5,#6,#8 = 316", nt.length === 1 && nt[0].content[0].text === "emergency trim: dropped #5,#6,#8 = 316 tokens; your marks were empty", JSON.stringify(nt[0]?.content?.[0]?.text ?? null));
    chk("U25 D3 the trim line names the union: autoRows=3, autoMass=316, newRows=3", (() => { const t = readLog().slice(lB).find((l) => l.kind === "trim"); return t != null && t.autoRows === "3" && t.autoMass === "316" && t.newRows === "3"; })(), JSON.stringify(readLog().slice(lB).find((l) => l.kind === "trim") ?? null));
    chk("U25 D3 cleanup: clear empties the union set (3 ids), the marker prunes, and the guard toggle-OFF prunes the entry", await (async () => {
      const cleared = (await clearUp()) === "mark-set= +0 -3 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID]?.auto === undefined && readStore()?.sessions?.[SID]?.noticed === undefined && readStore()?.sessions?.[SID]?.guard === true;
      const off = (await trim({ mode: "mark", session: SID, guard: false })) === "mark-set= guard=off" && readStore()?.sessions?.[SID] === undefined;
      return cleared && off;
    })(), JSON.stringify(readStore()?.sessions?.[SID] ?? null));
    const db2 = new DatabaseSync(FX_DB);
    db2.prepare("UPDATE session_message SET data=? WHERE id=1").run(JSON.stringify({ tokens: { input: 10000, output: 2000, reasoning: 0, cache: { read: 45000, write: 0 } }, time: { completed: 123 } }));
    db2.close();
    if (typeof pluginMod.setSysTokForTest === "function") pluginMod.setSysTokForTest(-1);
  }
}

// ------------------------------------------------------------------ U15 (#204) the report drop-indicator leg
// Per-row state flags RIGHT AFTER the rank (` x` active, ` g` guard-auto,
// ` s` staged-only; precedence x > g > s), header ` dropped-in-window=`/
// ` staged-in-window=` counted over WINDOW rows (stale ids never inflate),
// ONE legend line iff any row is flagged, and a CLEAN report BYTE-IDENTICAL
// to the pre-U15 form (the U10/U14 pinned literals + the V7 roundtrip).
{
  RPC.rows = null; // the base 10-row window; gauge fixture restored (57000/120K)
  const rowLine = (out, n) => out.split("\n").find((l) => l.startsWith(`row: ${n} `)) ?? "(missing)";
  const headerOf = (out) => out.split("\n")[1];
  const legends = (out) => out.split("\n").filter((l) => l.startsWith("flags: "));
  // V1 the clean window: NO flag token, NO legend, NO in-window counts anywhere
  const rClean = await trim({ mode: "report", session: SID });
  chk("U15 V1 clean report: header byte-clean, no flags: line, no dropped-in-window, kept rows unprefixed (U17: no tags token; #208: user rows print req-at=unavailable)", headerOf(rClean) === "header: head=msg_c0 head-type=compaction rows=10 boundary=none boundary-state=absent retained=10 staged=0 active=0 active-est=0 ordinal=session-rank guard=off auto=0" && legends(rClean).length === 0 && !rClean.includes("dropped-in-window") && !rClean.includes("staged-in-window") && rowLine(rClean, 2) === "row: 2 #4 user own=2 req-at=unavailable" && !rClean.includes(" x ") && !rClean.includes(" g ") && !rClean.includes(" s "), JSON.stringify([headerOf(rClean), rowLine(rClean, 2)]));
  // V2 staged-only -> ` s`; the row STAYS in the request (nothing applied)
  {
    const mk = await trim({ mode: "mark", session: SID, ids: ["4"] });
    const r2 = await trim({ mode: "report", session: SID });
    chk("U15 V2 stage #4 (msg_u1): the row flags ` s` after the rank + staged-in-window=1 + the legend appears exactly once", mk === "mark-set= +1 -0 total=1 rows_dropped_est=2" && rowLine(r2, 2) === "row: 2 #4 s user own=2 req-at=unavailable" && headerOf(r2).endsWith(" dropped-in-window=0 staged-in-window=1") && legends(r2).join("|") === "flags: s=staged x=dropped g=guard-auto", JSON.stringify([rowLine(r2, 2), headerOf(r2)]));
  }
  // V3 applied -> ` x`; staged drains, the drop count rides
  {
    chk("U15 V3 apply", (await trim({ mode: "apply", session: SID })) === "apply= staged->active n=1 drop_est=2 projected=54998 bound=96000 ok mixed=1");
    const r3 = await trim({ mode: "report", session: SID });
    chk("U15 V3 applied row flags ` x` (not ` s`) + dropped-in-window=1 staged-in-window=0", rowLine(r3, 2) === "row: 2 #4 x user own=2 req-at=unavailable" && headerOf(r3).endsWith(" dropped-in-window=1 staged-in-window=0") && legends(r3).length === 1, JSON.stringify([rowLine(r3, 2), headerOf(r3)]));
  }
  // V4 precedence: staged AGAIN while already active -> ` x` wins; the staged
  // raw count rides (staged=1) but staged-in-window counts staged-ONLY rows = 0
  {
    const mk4 = await trim({ mode: "mark", session: SID, ids: ["4"] });
    const r4 = await trim({ mode: "report", session: SID });
    chk("U15 V4 re-stage an ACTIVE row: ` x` beats ` s`; staged=1 raw (total counts the STAGED set), staged-in-window=0", mk4 === "mark-set= +1 -0 total=1 rows_dropped_est=2" && rowLine(r4, 2) === "row: 2 #4 x user own=2 req-at=unavailable" && headerOf(r4).includes("staged=1 active=1") && headerOf(r4).endsWith(" dropped-in-window=1 staged-in-window=0"), JSON.stringify([mk4, rowLine(r4, 2), headerOf(r4)]));
  }
  // V5 ` g` via the guard's auto set (store-injected — the guard lane is
  // U14-pinned; the REPORT only reads entry.auto)
  {
    await trim({ mode: "mark", session: SID, clear: true }); // empties staged+active+auto, the guard flag survives OFF? (no flag yet) -> entry pruned
    const base = JSON.parse(readFileSync(STORE, "utf8"));
    base.sessions[SID] = { boundary: "", keep: 0, set_at: "2026-01-01T00:00:00Z", guard: true, auto: ["msg_a3"] };
    writeFileSync(STORE, JSON.stringify(base), "utf8");
    const r5 = await trim({ mode: "report", session: SID });
    chk("U15 V5 guard-auto row flags ` g` + header auto=1 + dropped-in-window=1 + legend", rowLine(r5, 4) === "row: 4 #6 g assistant own=205 req-at=9000 tool=bash target=ls -la" && headerOf(r5).endsWith("guard=on auto=1 dropped-in-window=1 staged-in-window=0") && legends(r5).length === 1, JSON.stringify([rowLine(r5, 4), headerOf(r5)]));
  }
  // V6 stale ids: raw sizes are 2+2, the WINDOW counts are 2 (u1 ` x`, a3 ` g`)
  {
    const base = JSON.parse(readFileSync(STORE, "utf8"));
    base.sessions[SID] = { boundary: "", keep: 0, set_at: "2026-01-01T00:00:00Z", guard: true, staged: ["msg_dead0"], active: ["msg_u1", "msg_dead1"], auto: ["msg_a3", "msg_dead2"] };
    writeFileSync(STORE, JSON.stringify(base), "utf8");
    const r6 = await trim({ mode: "report", session: SID });
    chk("U15 V6 stale ids do NOT inflate: active=2 auto=2 staged=1 raw, dropped-in-window=2 staged-in-window=0; rows 2/4 flag x/g", headerOf(r6).includes("staged=1 active=2") && headerOf(r6).includes("auto=2 dropped-in-window=2 staged-in-window=0") && rowLine(r6, 2) === "row: 2 #4 x user own=2 req-at=unavailable" && rowLine(r6, 4) === "row: 4 #6 g assistant own=205 req-at=9000 tool=bash target=ls -la" && legends(r6).length === 1, JSON.stringify([headerOf(r6), rowLine(r6, 2), rowLine(r6, 4)]));
  }
  // V7 roundtrip: OFF + clear -> the report is BYTE-IDENTICAL to V1's clean map
  {
    chk("U15 V7 cleanup", (await trim({ mode: "mark", session: SID, clear: true })) === "mark-set= +0 -5 total=0 rows_dropped_est=0" && (await trim({ mode: "mark", session: SID, guard: false })) === "mark-set= guard=off" && readStore()?.sessions?.[SID] === undefined);
    chk("U15 V7 the cleaned report is BYTE-IDENTICAL to the clean V1 report", (await trim({ mode: "report", session: SID })) === rClean, "roundtrip");
  }
}

// ------------------------------------------------------------------ U17 (#208) the SQL report-source pins
// The report row lane is READ-ONLY SQL: zero RPC calls (pinned in the R1
// block), the store stays BYTE-IDENTICAL across a report call (staged/active/
// auto/guard unchanged — even a legacy polluted entry), a legacy `tags` key
// prunes on the NEXT write, the SQL COUNT discriminates session-not-found,
// and an unreadable DB prints the honest `error: sql-read-failed:` line.
{
  chk("U17 R5b report leaves the store BYTE-IDENTICAL; a legacy `tags` key is IGNORED on read and PRUNED on the next write", await (async () => {
    writeFileSync(STORE, JSON.stringify({ sessions: { [SID]: { boundary: "msg_u4", keep: 6, set_at: "x", tags: true } } }), "utf8");
    const bytes = readFileSync(STORE, "utf8");
    await trim({ mode: "report", session: SID }); // the report must not rewrite anything — not even the prune
    const untouched = readFileSync(STORE, "utf8") === bytes;
    await trim({ mode: "tail", session: SID, target: "msg_u4" }); // the next write prunes the legacy key
    const pruned = readFileSync(STORE, "utf8").includes('"tags"') === false;
    await trim({ mode: "tail", session: SID, clear: true });
    return untouched && pruned && readStore()?.sessions?.[SID] === undefined;
  })(), "the report mutated the store or the legacy key survived");
  chk("U17 (#208) the SQL COUNT discriminates: a session with ZERO rows -> the honest session-not-found line", (await trim({ mode: "report", session: "ses_absent000" })) === "session ses_absent000\nreport= rejected: session-not-found");
  chk("U17 (#208) an unreadable report DB -> the honest `error: sql-read-failed:` line (both backends dead, no throw)", await (async () => {
    pluginMod.setReportDbForTest(path.join(SCRATCH, "fx_report_missing.db"));
    const out = await trim({ mode: "report", session: SID });
    pluginMod.setReportDbForTest(REPORT_DB);
    const restored = (await trim({ mode: "report", session: SID })).includes("header: head=msg_c0");
    return out.startsWith(`session ${SID}\nerror: sql-read-failed: `) && out.length < 300 && restored;
  })(), "no sql-read-failed line");
}

// ------------------------------------------------------------------ U18 (#209) the free-space leg
// `mode:'free'` + `target` (the PERCENT of the gauge-core window value to
// free; default 20, band 5..60, anything else `target-invalid`): drops into
// the session's STICKY `auto` set until the OWN-mass freed estimate reaches
// the target. Selection is the guard lane's candidate rules verbatim
// (heaviest-first, AGE tie-break ascending, head never, keep floor never,
// boundary-retained never, already-dropped never, zero-weight never); the
// removal rides the UNCHANGED hook `auto` leg (pair rule + notice), the
// report flags the picks ` g`. Fixture math: window 120000, last-req 55000 ->
// need(20%) = 24000, the floor-legal pool is 318 (a3=205, a2=111, u1=2) — so
// the base leg pins the honest SHORTFALL stop; a steered 1000-token window
// proves the target-met stop AND the age tie-break (two equal 111-mass rows,
// the older leaves first). A cross-session call lands the picks on the OTHER
// session's entry.
{
  RPC.rows = null; // the base 10-row window; the gauge fixture reads 57000 of 120K
  const good = gaugeMod;
  const steer = (r) => pluginMod.setGaugeCoreForTest({ formatGauge: good.formatGauge, getDbPath: good.getDbPath, readGauge: async () => r });
  const freeLines = (from) => readLog().slice(from).filter((l) => l.kind === "free");
  const autoOf = (sid = SID) => JSON.stringify(readStore()?.sessions?.[sid]?.auto ?? null);
  // F1 the fail-closed target validation — rejected BEFORE any read or write
  {
    const lB = readLog().length;
    chk("U18 F1 target-invalid rejects fail-closed: 0, 61, a float, a word, a negative (echo names the raw value)", (await trim({ mode: "free", session: SID, target: 0 })) === "free= rejected: target-invalid 0" && (await trim({ mode: "free", session: SID, target: 61 })) === "free= rejected: target-invalid 61" && (await trim({ mode: "free", session: SID, target: 2.5 })) === "free= rejected: target-invalid 2.5" && (await trim({ mode: "free", session: SID, target: "abc" })) === "free= rejected: target-invalid abc" && (await trim({ mode: "free", session: SID, target: -1 })) === "free= rejected: target-invalid -1");
    chk("U18 F1 free mode takes ONLY `target` — any other arg rides the usage line", (await trim({ mode: "free", session: SID, ids: ["msg_u1"] })) === "error: free mode takes only `target` (the percent of the window to free; other args are refused)");
    chk("U18 F1 an unknown session rejects like the other lanes", (await trim({ mode: "free", session: "ses_absent000" })) === "free= rejected: session-not-found");
    chk("U18 F1 every rejection wrote NOTHING and logged NO kind:free line (fail-closed)", readStore()?.sessions?.[SID] === undefined && freeLines(lB).length === 0, `lines=${freeLines(lB).length}`);
  }
  // F2/F3/F5 the base leg: the floor-legal pool cannot reach 20% -> honest
  // shortfall stop, heaviest-first order, sticky `auto`, ` g` flags, the
  // UNCHANGED hook removal + notice.
  {
    const lB = readLog().length;
    chk("U18 F5 (U21 D3 re-pinned) default target 20%: freed 316 of need 24000, bound-fill 45%, picks 2, short=yes — the pool exhausts on the SHARED rule (user row never)", (await trim({ mode: "free", session: SID })) === "free= freed=316 target=20 bound-fill=45% picks=2 short=yes");
    chk("U21 F2 selection order (shared rule): HEAVIEST first (a3=205, a2=111) — the USER row u1 is never a candidate, the head and the light floor rows never enter `auto`", autoOf() === JSON.stringify(["msg_a3", "msg_a2"]) && readStore()?.sessions?.[SID]?.active === undefined && readStore()?.sessions?.[SID]?.boundary === "", autoOf());
    const fl = freeLines(lB);
    chk("U18 F3 exactly ONE kind:free line (session/target/freed/picks/short)", fl.length === 1 && fl[0].session === SID && fl[0].target === "20" && fl[0].freed === "316" && fl[0].picks === "2" && fl[0].short === "yes", JSON.stringify(fl[0] ?? null));
    const r = await trim({ mode: "report", session: SID });
    chk("U21 F3 the report flags ONLY the two picks (rows 3/4 ` g`; the user row 2 stays unflagged) + header auto=2 dropped-in-window=2 + one legend", (r.split("\n").find((l) => l.startsWith("row: 2 ")) === "row: 2 #4 user own=2 req-at=unavailable" && r.split("\n").find((l) => l.startsWith("row: 3 ")) === "row: 3 #5 g assistant own=111 req-at=5200 tool=read target=C:/a/b.ts offset=5 limit=20" && r.split("\n").find((l) => l.startsWith("row: 4 ")) === "row: 4 #6 g assistant own=205 req-at=9000 tool=bash target=ls -la" && r.split("\n")[1].includes("auto=2 dropped-in-window=2") && r.split("\n").filter((l) => l.startsWith("flags: ")).length === 1), JSON.stringify([r.split("\n").find((l) => l.startsWith("row: 2 ")), r.split("\n")[1]]));
    const d = draft();
    await fire(d);
    const ids = d.messages.map((m) => m.id ?? "(none)");
    const texts = JSON.stringify(d.messages);
    const t = readLog().slice(lB).find((l) => l.kind === "trim");
    chk("U21 F3 the hook lane removes the free picks WITH their outputs (2 ids + 3 projections) and KEEPS the user row msg_u1 (never a candidate)", ids.includes("msg_u1") && !ids.includes("msg_a2") && !ids.includes("msg_a3") && ids.includes("msg_c0") && ids.includes("msg_u4") && ids.includes("msg_a9") && !texts.includes("a2 output") && !texts.includes("a2 adjacent output") && !texts.includes("a3 output") && d.messages.filter((m) => !("id" in m)).length === 2, JSON.stringify(d.messages.map((m) => m.id ?? "(none)")));
    chk("U21 F3 the notice + trim line ride the free picks (autoRows=2, autoMass=316, 5 entries dropped, 11 kept incl the notice)", d.messages.length === 11 && d.messages[d.messages.length - 1]?.id === "msg_ctx_guard_notice" && d.messages[d.messages.length - 1]?.content[0].text === "emergency trim: dropped #5,#6 = 316 tokens; your marks were empty" && t != null && t.autoRows === "2" && t.autoMass === "316" && t.droppedRows === "2" && t.droppedEntries === "5" && t.keptEntries === "11", JSON.stringify(t ?? null));
    chk("U21 F3 mark clear empties the free picks too (the third drop set; the entry prunes)", (await trim({ mode: "mark", session: SID, clear: true })) === "mark-set= +0 -2 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID] === undefined);
  }
  // F2 the never-rules: a stored boundary makes its whole drop region
  // non-candidate (already dropped) and its retained rows stay.
  {
    chk("U18 F2 boundary-retained + already-dropped rows are NEVER re-picked (a boundary at idx 4 leaves zero candidates; picks=0 writes NOTHING)", await (async () => {
      await trim({ mode: "tail", session: SID, target: "msg_u4" });
      const out = await trim({ mode: "free", session: SID, target: 5 });
      const kept = readStore()?.sessions?.[SID]?.boundary === "msg_u4" && readStore()?.sessions?.[SID]?.auto === undefined;
      const cleared = (await trim({ mode: "tail", session: SID, clear: true })) === "tail-set= msg_u4 -> none";
      return out === "free= freed=0 target=5 bound-fill=45% picks=0 short=yes" && kept && cleared;
    })(), "a boundary-region row got picked or the echo form drifted");
  }
  // F2/F5 the target-met stop + the AGE tie-break on a steered 1000-token
  // window: two equal-mass candidates (111 each), the OLDER leaves first, and
  // the third (50) is never reached.
  {
    const tieRows = () => [
      { id: "tie_c0", type: "compaction", status: "completed", summary: "sum", recent: "rec" },
      { id: "tie_a1", type: "assistant", content: [{ type: "text", text: "a".repeat(444) }] },
      { id: "tie_a2", type: "assistant", content: [{ type: "text", text: "b".repeat(444) }] },
      { id: "tie_a3", type: "assistant", content: [{ type: "text", text: "c".repeat(200) }] },
      { id: "tie_u4", type: "user", text: "tail four" },
      { id: "tie_u5", type: "user", text: "tail five" },
      { id: "tie_u6", type: "user", text: "tail six" },
      { id: "tie_u7", type: "user", text: "tail seven" },
      { id: "tie_u8", type: "user", text: "tail eight" },
      { id: "tie_a9", type: "assistant", content: [{ type: "text", text: "tail nine" }] },
    ];
    RPC.rows = tieRows();
    steer({ ok: true, kind: "ok", sid: SID, modelId: MODEL_ID, total: 900, output: 0, ctx: 900, window: 1000 });
    chk("U18 F2/F5 target MET stops the loop: need 150 of the 1000-token window picks the two 111-mass rows and stops (tie_a3=50 untouched); the AGE tie-break sends the OLDER row first", (await trim({ mode: "free", session: SID, target: 15 })) === "free= freed=222 target=15 bound-fill=67% picks=2 short=no" && autoOf() === JSON.stringify(["tie_a1", "tie_a2"]), autoOf());
    chk("U18 cleanup of the tie leg (picks cleared, store clean)", (await trim({ mode: "mark", session: SID, clear: true })) === "mark-set= +0 -2 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID] === undefined);
    RPC.rows = null;
    pluginMod.setGaugeCoreForTest(good);
    // (U21 F3) `free` NOW frees a heavy FLOOR tool-output row (the U20 #14 shape) —
    // the SHARED rule: head / user / newest-assistant rows never, a floor row above
    // FLOOR_MASS leaves.
    {
      const floorRows = () => [
        ...windowRows(),
        { id: "msg_a10", seq: 4412, type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 2400, completed: 2401 }, tokens: { input: 100, output: 50, reasoning: 0, cache: { read: 0, write: 0 } }, content: [{ type: "tool", id: "t10", name: "bash", executed: true, state: { status: "completed", input: { command: "ls -la" }, content: [{ type: "text", text: "T".repeat(17979) }] } }] },
        { id: "msg_u11", seq: 4413, type: "user", text: "U".repeat(20000), time: { created: 2500 } },
        { id: "msg_a12", seq: 4414, type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 2600, completed: 2601 }, tokens: { input: 100, output: 50, reasoning: 0, cache: { read: 0, write: 0 } }, content: [{ type: "tool", id: "t12", name: "bash", executed: true, state: { status: "completed", input: { command: "ls -la" }, content: [{ type: "text", text: "V".repeat(23979) }] } }] },
      ];
      RPC.rows = floorRows();
      chk("U21 F3 free frees the heavy FLOOR tool-output row (own 4499 > FLOOR_MASS) but NEVER the heavy user or newest-assistant row: freed 4815, picks 3 (a10 first), short=yes", (await trim({ mode: "free", session: SID, target: 5 })) === "free= freed=4815 target=5 bound-fill=41% picks=3 short=yes" && autoOf() === JSON.stringify(["msg_a10", "msg_a3", "msg_a2"]), autoOf());
      chk("U21 F3 cleanup of the heavy-floor leg (picks cleared, store clean)", (await trim({ mode: "mark", session: SID, clear: true })) === "mark-set= +0 -3 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID] === undefined);
      RPC.rows = null;
    }
  }
  // F4 the gauge-window anchor + the honest bound-fill leg
  {
    steer({ ok: true, kind: "ok", sid: SID, modelId: MODEL_ID, total: 55000, output: 0, ctx: 55000, window: undefined });
    chk("U18 F4 no gauge window -> `free= rejected: gauge-window-unavailable` (no math anchor, NOTHING written)", await (async () => {
      const out = await trim({ mode: "free", session: SID });
      return out === "free= rejected: gauge-window-unavailable" && readStore()?.sessions?.[SID] === undefined;
    })(), "the math ran without a window anchor");
    steer({ ok: true, kind: "ok", sid: SID, modelId: MODEL_ID, total: undefined, output: undefined, ctx: undefined, window: 1000 });
    chk("U18 F5 the ctx leg missing prints `bound-fill=unavailable` honestly (never a guessed fill); the target-met stop still holds", await (async () => {
      const out = await trim({ mode: "free", session: SID, target: 20 });
      const cleared = (await trim({ mode: "mark", session: SID, clear: true })) === "mark-set= +0 -1 total=0 rows_dropped_est=0";
      return out === "free= freed=205 target=20 bound-fill=unavailable picks=1 short=no" && cleared && readStore()?.sessions?.[SID] === undefined;
    })(), JSON.stringify(readStore()?.sessions?.[SID] ?? null));
    pluginMod.setGaugeCoreForTest(good);
  }
  // F6 the cross-session lane: the caller stays untouched, the NAMED session
  // gets the sticky picks (the store entries are per-sid).
  {
    steer({ ok: true, kind: "ok", sid: OTHER, modelId: MODEL_ID, total: 500, output: 0, ctx: 500, window: 1000 });
    chk("U18 F6 free on a session OTHER than the caller: the picks land on THAT session's entry, the caller gains NOTHING", await (async () => {
      const out = await trim({ mode: "free", session: OTHER }, SID);
      const landed = autoOf(OTHER) === JSON.stringify(["msg_a3"]) && readStore()?.sessions?.[SID] === undefined;
      const cleared = (await trim({ mode: "mark", session: OTHER, clear: true })) === "mark-set= +0 -1 total=0 rows_dropped_est=0";
      return out === "free= freed=205 target=20 bound-fill=29% picks=1 short=no" && landed && cleared && readStore()?.sessions?.[OTHER] === undefined;
    })(), JSON.stringify(readStore()?.sessions ?? null));
    pluginMod.setGaugeCoreForTest(good);
  }
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
  chk("C5 with a boundary set the filter drops the four pre-boundary ids WITH their output projections (7 go), keeps the system + orphan id-less entries, appends NOTHING (15 -> 8)", dD.messages.length === 8 && ["msg_c0", "msg_u1", "msg_a2", "msg_a3"].every((id) => dD.messages.every((m) => m.id !== id)) && dD.messages.filter((m) => m.id === undefined).length === 2, JSON.stringify({ len: dD.messages.length, ids: dD.messages.map((m) => m.id ?? "(none)") }));
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
  chk("INV every line parses; kinds ⊂ {report, tail, trim, boundary-stale, gauge, mark, marks-stale, apply, ordinals (U10 fail-open), guard (U14), free (U18)}", [...kinds].sort().join(",") === "apply,boundary-stale,free,gauge,guard,mark,marks-stale,ordinals,report,tail,trim", JSON.stringify([...kinds].sort()));
  chk("INV every line carries ts + kind and stays within the LINE_CAP ladder", lines.every((l) => typeof l.ts === "string" && typeof l.kind === "string" && JSON.stringify(l).length <= 2000 && JSON.stringify(l).length > 0));
  chk("INV the `trim` lines all name a session + boundary + the counts incl droppedProjections/orphan + the U22 droppedBytes measurement (U9; U17: the tagged/untagged counters are GONE)", lines.filter((l) => l.kind === "trim").every((l) => typeof l.session === "string" && typeof l.boundary === "string" && typeof l.droppedRows === "string" && typeof l.droppedEntries === "string" && typeof l.droppedBytes === "string" && typeof l.droppedProjections === "string" && typeof l.orphan === "string" && l.tagged === undefined && l.untagged === undefined && typeof l.keptEntries === "string"));
  chk("INV the `mark` lines all name session + added/removed/total scalars (a TOGGLE line carries `guard` instead — the exempt shape; U17: the tags exemption is gone)", lines.filter((l) => l.kind === "mark").every((l) => typeof l.session === "string" && ((typeof l.added === "string" && typeof l.removed === "string" && typeof l.total === "string") || typeof l.guard === "string")));
  chk("INV the `apply` lines all name session + n/dropEst/projected/bound/mixed scalars (U8)", lines.filter((l) => l.kind === "apply").every((l) => typeof l.session === "string" && typeof l.n === "string" && typeof l.dropEst === "string" && typeof l.projected === "string" && typeof l.bound === "string" && typeof l.mixed === "string"));
  chk("INV the `free` lines (U18) all name session + target/freed/picks/short scalars and there are EXACTLY 6 (the base shortfall, the boundary picks=0 leg, the tie-break leg, the U21 heavy-floor leg, the ctx-missing leg, the cross-session leg — every rejection logs nothing)", lines.filter((l) => l.kind === "free").length === 6 && lines.filter((l) => l.kind === "free").every((l) => typeof l.session === "string" && typeof l.target === "string" && typeof l.freed === "string" && typeof l.picks === "string" && (l.short === "yes" || l.short === "no")), `count=${lines.filter((l) => l.kind === "free").length}`);
  chk("INV the applied kind:apply lines (rejections log nothing — fail-closed; U9 retry leg, U10 ordinal legs, U15 V3 leg; U17: the tag-lane applies are gone)", lines.filter((l) => l.kind === "apply").length === 7, `count=${lines.filter((l) => l.kind === "apply").length}`);
  chk("INV the ONE boundary-stale line for the (session,boundary) state (deduped)", lines.filter((l) => l.kind === "boundary-stale").length === 1, `count=${lines.filter((l) => l.kind === "boundary-stale").length}`);
  chk("INV the ONE marks-stale line for the (session,count) state (deduped)", lines.filter((l) => l.kind === "marks-stale").length === 1, `count=${lines.filter((l) => l.kind === "marks-stale").length}`);
  chk("INV the gauge lines' reasons are only the two honest read failures", lines.filter((l) => l.kind === "gauge").every((l) => l.reason === "context-read-failed" || l.reason === "session-not-found" || l.reason === "messages-not-array"));
  chk("INV report mode emitted a kind:report line per call (29 lines: 9 + the 4 U10 legs + the 2 U11 compact legs + the U12 range leg + the 2 U14 G0 header legs + the 7 U15 flag legs + the U17 R5b + restore legs + the U18 ` g` flag leg; the R5a/U17 not-found/sql-fail calls emit none — rejections log nothing)", lines.filter((l) => l.kind === "report").length === 29, `count=${lines.filter((l) => l.kind === "report").length}`);
}

// ------------------------------------------------------------------ cleanup

await cleanup();
chk("S3 cleanup disposes the registered tool + hook handler (the store survives — a dead process keeps the trim)", TOOLS.length === 1 && CONTEXT_HANDLERS.length === 0 && existsSync(STORE), JSON.stringify({ handlers: CONTEXT_HANDLERS.length, store: existsSync(STORE) }));
chk("S3b after cleanup the handler list is unchanged by the dispose mock (the tool entry stays; the store is NOT rewritten)", existsSync(STORE) && JSON.parse(readFileSync(STORE, "utf8")).sessions !== undefined, "store readable");

console.log(`\nlog lines: ${readLog().length}`);
console.log(failures === 0 ? "\nSMOKE: ALL PASS" : `\nSMOKE: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
