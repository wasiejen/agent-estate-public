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

const pluginMod = await import(pathToFileURL(PLUGIN).href);
const plugin = pluginMod.default;
// (U10) the ordinal lane reads the separate append-order fixture DB.
pluginMod.setOrdinalsDbForTest(ORD_DB);
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
      { id: "msg_a5", role: "assistant", content: [{ type: "tool-call", id: "call_a5", name: "noop", input: {} }] }, // (U11 #200) a TOOL-CALL-ONLY turn: no text, no reasoning -> the unplaceable-tag case (must stay untagged and be COUNTED)
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

// ------------------------------------------------------------------ R1 the report (v2-shaped rows + gauge line)

{
  const out = await trim({ mode: "report", session: SID });
  const lines = out.split("\n");
  chk("R1 header line: the compaction head + rows=10 + no boundary + empty staged/active sets + ordinal source + tags OFF by default", lines[1] === `header: head=msg_c0 head-type=compaction rows=10 boundary=none boundary-state=absent retained=10 staged=0 active=0 active-est=0 ordinal=session-rank tags=off`, JSON.stringify(lines[1] ?? null));
  chk("R1 (#189+U8) the two-quantity line: window_rows != request + request-est (gauge CTX) + OWN-mass window-est 332", lines[2] === "window_rows != request; request also carries system prompt + retained slice request-est=57000 window-est=332", JSON.stringify(lines[2] ?? null));
  chk("R1 (U7) the projection line: last-req = gauge CTX 57000 − output 2000; bound = 80% of the 120K window", lines[3] === "projection: last-req=55000 staged-est=0 projected=55000 bound=96000 ok", JSON.stringify(lines[3] ?? null));
  chk("R1 the gauge line rides the shared v2-paired core (fixture mass 57000 / 120K + budget suffix)", lines[4] === `gauge: SESSION=${SID} CTX=57000 (47%) REM=63000 | 6 compactions left`, JSON.stringify(lines[4] ?? null));
  chk("S0b the tool's name is 'context_trim' (the v1 name — a same-name twin is precedent) and the args mirror v1 (+ clear, + mark ids/unmark, + U7 apply mode + force, + U10 tags, + U11 showIds)", TOOL.name === "context_trim" && JSON.stringify(Object.keys(TOOL.input.properties).sort()) === JSON.stringify(["clear", "force", "ids", "keepMessages", "mode", "session", "showIds", "tags", "target", "unmark"]) && JSON.stringify(TOOL.input.properties.mode.enum) === JSON.stringify(["report", "tail", "mark", "apply"]) && TOOL.output.type === "string", JSON.stringify(TOOL.name + "|" + Object.keys(TOOL.input.properties)));
  chk("R1 (U10+U11) row 1 = the compaction head + its ABSOLUTE ordinal #4300 — COMPACT form, NO id= by default (the opaque id costs ~8-10 tokens/row)", lines[5] === "row: 1 #3 compaction own=5", JSON.stringify(lines[5] ?? null));
  chk("R1 user rows take the own-bytes4 mass + stable ordinals (#4301/#4304/#4308), compact", lines[6] === "row: 2 #4 user own=2" && lines[9] === "row: 5 #7 user own=2" && lines[13] === "row: 9 #11 user own=2", JSON.stringify([lines[6], lines[9], lines[13]]));
  chk("R1 (U8 pin) row 3 asserts OWN mass (111 = input-JSON 45 + output 400 / 4), NOT the provider sum — the cumulative figure rides relabeled req-at=5200; (U10) ordinal #4302, (U11) no id", lines[7] === "row: 3 #5 assistant own=111 req-at=5200 tool=read target=C:/a/b.ts offset=5 limit=20", JSON.stringify(lines[7] ?? null));
  chk("R1 row 4 = the bash-target row (own=205, req-at=9000, #4303, no id)", lines[8] === "row: 4 #6 assistant own=205 req-at=9000 tool=bash target=ls -la", JSON.stringify(lines[8] ?? null));
  chk("R1 the zero-content rows print own=0 + req-at (the provider figure cannot masquerade as weight), compact", lines[10] === "row: 6 #8 assistant own=0 req-at=150" && lines[12] === "row: 8 #10 assistant own=0 req-at=25000" && lines[14] === "row: 10 #12 assistant own=3 req-at=400", JSON.stringify([lines[10], lines[12], lines[14]]));
  chk("R1 the `last:` flag + (U8) `biggest:` ranks by OWN weight: the NEWEST row (#4309=3) is the SMALLEST, the old tool rows dominate (the error turn excluded); (U10/U12) entries are PER-SESSION-RANK-named", lines[15] === "last: 10" && lines[19] === "biggest: #6=205 #5=111 #12=3", JSON.stringify([lines[15], lines[19]]));
  chk("U12 (#202) PER-SESSION RANKS: the window numbers run 3..12 — rows msg_x1/msg_x2 BEFORE the head occupy ranks 1-2 (trimmed-away rows occupy their rank), so rank is contiguous 1..N over the session and is NEITHER the window position NOR a sparse global seq", lines[5] === "row: 1 #3 compaction own=5" && lines[14] === "row: 10 #12 assistant own=3 req-at=400", JSON.stringify([lines[5], lines[14]]));
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
  chk("T1 the report reflects the stored boundary (inside + retained=6) + ordinal source + tags off", out.split("\n")[1] === "header: head=msg_c0 head-type=compaction rows=10 boundary=msg_u4 boundary-state=inside retained=6 staged=0 active=0 active-est=0 ordinal=session-rank tags=off", out.split("\n")[1]);
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
  chk("T14 bad mode -> the v1 error line (U7: the line names the fourth mode)", (await trim({ mode: "sideways", session: SID })) === "error: mode must be 'report', 'tail', 'mark', or 'apply'");
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
  chk("H3 the report shows the stale boundary (state=stale, retained = the whole new window; U10: the new head keeps its absolute #4410 — ordinals are NEVER renumbered)", staleReport.split("\n")[1] === "header: head=msg_c1 head-type=compaction rows=3 boundary=msg_u4 boundary-state=stale retained=3 staged=0 active=0 active-est=0 ordinal=session-rank tags=off" && staleReport.split("\n")[5] === "row: 1 #13 compaction own=2", JSON.stringify([staleReport.split("\n")[1], staleReport.split("\n")[5]]));
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
  chk("M11 usage lines (form guards + id-array validation) + the unknown-session rejection", (await m({ session: SID, clear: true, ids: ["msg_u1"] })) === "error: mark mode: clear is mutually exclusive with ids/unmark (use one form)" && (await m({ session: SID })) === "error: mark mode requires ids (window rows to stage — ids or bare ordinals), unmark (refs to restore), clear (empty BOTH drop sets — a stored boundary stays), or tags (the opt-in in-window ordinal tags on/off)" && (await m({ session: SID, ids: "msg_u1" })) === "error: mark mode: ids and unmark must be arrays of non-empty message id strings" && (await trim({ mode: "mark", session: "ses_absent000", ids: ["msg_x"] })) === "mark-set= rejected: session-not-found");
}

// ------------------------------------------------------------------ U9 the #194 pins: hint cap + same-step apply truthfulness

{
  // (a) the hint cap: a variant window whose LOW anchor row carries a long
  // assistant/user text — the echo must collapse to ONE capped line.
  const longRows = windowRows().map((r) => (r.id === "msg_u4" ? { ...r, text: "user four " + "x".repeat(200) } : r));
  RPC.rows = longRows;
  const hl = (await trim({ mode: "report", session: SID })).split("\n");
  const optLow = hl.find((l) => l.startsWith("option low")) ?? "";
  chk("HINT-CAP (#194) a long anchor echoes ONE capped line: 80 chars + the inline cut marker", optLow.includes(`hint=user four ${"x".repeat(69)}…[+130ch]`), JSON.stringify(optLow.slice(optLow.indexOf("hint="), optLow.indexOf("hint=") + 110)));
  RPC.rows = null;
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
// ------------------------------------------------------------------ U10 the #196 pins: stable ordinals + opt-in tags

{
  const ordLine = (out, n) => out.split("\n").find((l) => l.startsWith(`row: ${n} `)) ?? "(missing)";
  const r0 = await trim({ mode: "report", session: SID });
  chk("U10a ordinal stability BEFORE a drop: msg_u8 #4308, msg_a9 #4309 (absolute seq — not window position)", ordLine(r0, 9) === "row: 9 #11 user own=2" && ordLine(r0, 10) === "row: 10 #12 assistant own=3 req-at=400", JSON.stringify([ordLine(r0, 9), ordLine(r0, 10)]));
  // drop a row ABOVE them: stage + apply msg_a2 (#4302, index 2)
  chk("U10a the drop: stage #4302 BY ORDINAL + apply", (await trim({ mode: "mark", session: SID, ids: ["5"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=111" && (await trim({ mode: "apply", session: SID })) === "apply= staged->active n=1 drop_est=111 projected=54889 bound=96000 ok mixed=0");
  const r1 = await trim({ mode: "report", session: SID });
  chk("U10a (STABILITY) the SAME ids keep the SAME ordinals after the drop above them — #4308/#4309 UNCHANGED (window position IS NOT the source)", ordLine(r1, 9) === "row: 9 #11 user own=2" && ordLine(r1, 10) === "row: 10 #12 assistant own=3 req-at=400", JSON.stringify([ordLine(r1, 9), ordLine(r1, 10)]));
  chk("U10a the ACTIVE set prints the resolved id + the ordinal-stable header (ordinal=session-rank tags=off)", r1.split("\n")[1] === "header: head=msg_c0 head-type=compaction rows=10 boundary=none boundary-state=absent retained=10 staged=0 active=1 active-est=111 ordinal=session-rank tags=off", r1.split("\n")[1]);
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
  // cross-compaction: old rows that SURVIVE the new head keep their numbers
  RPC.rows = [
    { id: "msg_c1", seq: 4410, type: "compaction", status: "completed", summary: "NEW-SUMMARY", recent: "", time: { created: 2100, completed: 2101 } },
    { id: "msg_u9", seq: 4411, type: "user", text: "post-compaction prompt", time: { created: 2200 } },
    { id: "msg_u8", seq: 4308, type: "user", text: "user eight", time: { created: 1900 } },
    { id: "msg_a9", seq: 4309, type: "assistant", agent: "worker-1", model: { id: MODEL_ID, providerID: "llama-swap" }, time: { created: 2000, completed: 2001 }, tokens: { input: 300, output: 100, reasoning: 0, cache: { read: 0, write: 0 } }, content: [{ type: "text", text: "thinking text" }] },
  ];
  const r2 = await trim({ mode: "report", session: SID });
  chk("U10c (STABILITY across a compaction) surviving rows keep #4308/#4309; the NEW head carries its own #4410 (no renumbering)", ordLine(r2, 3) === "row: 3 #11 user own=2" && ordLine(r2, 4) === "row: 4 #12 assistant own=3 req-at=400" && ordLine(r2, 1) === "row: 1 #13 compaction own=2", JSON.stringify([ordLine(r2, 1), ordLine(r2, 3), ordLine(r2, 4)]));
  RPC.rows = null; // restore the base window BEFORE the tag legs (a stale compacted window would make u4/a5 stale-in-window)
  // (U11 #200) COMPACT REPORT: no `id=` by default; `showIds:true` restores it.
  const rc = await trim({ mode: "report", session: SID });
  chk("U11 compact report: NO row line prints id= by default", rc.split("\n").filter((l) => l.startsWith("row: ")).every((l) => !l.includes("id=")) && rc.includes("id=msg_") === false, JSON.stringify(rc.split("\n")[5]));
  const rci = await trim({ mode: "report", session: SID, showIds: true });
  chk("U11 showIds:true restores id= on every row (the flag's name is `showIds`)", rci.split("\n").filter((l) => l.startsWith("row: ")).every((l) => l.includes("id=msg_")) && rci.split("\n")[5] === "row: 1 #3 compaction id=msg_c0 own=5", JSON.stringify(rci.split("\n")[5]));
  // tags are DEFAULT OFF: the hook renders NOTHING for a session without the flag
  chk("U10d tags OFF by default: the draft is byte-untagged and the hook is SILENT (no store entry)", (() => { const d = draft(); return JSON.stringify(d.messages).includes("[#"); })() === false && readStore()?.sessions?.[SID] === undefined);
  // opt-in + an ACTIVE drop so the hook runs; tags render on the SURVIVING rows
  chk("U10e toggle-on returns the tags line", (await trim({ mode: "mark", session: SID, tags: true })) === "mark-set= tags=on");
  chk("U10e stage + apply msg_a3 (#4303) — the hook runs with tags on", (await trim({ mode: "mark", session: SID, ids: ["6"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=205" && (await trim({ mode: "apply", session: SID })) === "apply= staged->active n=1 drop_est=205 projected=54795 bound=96000 ok mixed=0");
  const dt1 = draft();
  await fire(dt1);
  const snap1 = JSON.stringify(dt1.messages);
  chk("U10e the TAG renders `[#N] ` before the FIRST text part of id-carrying user/assistant entries", dt1.messages.some((m) => m.id === "msg_u1" && m.content[0].text === "[#4] user one") && dt1.messages.some((m) => m.id === "msg_a2" && m.content[1].text === "[#5] a2 text") && dt1.messages.some((m) => m.id === "msg_u4" && m.content[0].text === "[#7] user four"), JSON.stringify(dt1.messages.filter((m) => JSON.stringify(m).includes("[#")).map((m) => m.id)));
  // (U11 #200) UNPLACEABLE FIRST: msg_a5 has NEITHER text nor reasoning in the
  // base draft -> stays untagged AND counted. Must run BEFORE the reasoning-lane
  // leg (which mutates the fixture entry).
  chk("U11 msg_a5 (tool-call part only) stays UNTAGGED and the trim line COUNTS it (untagged=1; 8 text-lane tags)", (() => { const l = readLog().slice(-1)[0]; const e = dt1.messages.find((m) => m.id === "msg_a5"); return l.kind === "trim" && Number(l.tagged) === 8 && Number(l.untagged) === 1 && !JSON.stringify(e).includes("[#"); })(), JSON.stringify(readLog().slice(-1)[0] ?? null));
  chk("U10e RESULT entries stay UNTAGGED (id-less tool projections; mass rides the owner's ordinal via the #193 link) + a dropped row leaves untagged", dt1.messages.every((m) => m.role !== "tool" || !JSON.stringify(m).includes("[#")) && !snap1.includes("[#6]"), JSON.stringify(dt1.messages.filter((m) => m.role === "tool").length));
  const dt2 = draft();
  await fire(dt2);
  chk("U10e BYTE-STABILITY: two consecutive assemblies of the same window produce IDENTICAL tagged bytes", JSON.stringify(dt2.messages) === snap1, "tagged bytes differ");
  // stability of the TAGGED bytes across a window shift (a row above drops):
  // the tag is the absolute ordinal — surviving entries are byte-identical
  chk("U10f stage msg_u1 (#4301) too — window SHIFTS (2 active rows)", (await trim({ mode: "mark", session: SID, ids: ["4"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=2" && (await trim({ mode: "apply", session: SID })) === "apply= staged->active n=1 drop_est=2 projected=54998 bound=96000 ok mixed=1");
  const dt3 = draft();
  await fire(dt3);
  const firstText = (d, id) => { const e = d.messages.find((m) => m.id === id); return e == null ? "(gone)" : (e.content.find((p) => p.type === "text") ?? { text: "(none)" }).text; };
  chk("U10f TAG BYTE-IDENTICAL across the shifted assemblies: msg_u4 [#7] and msg_a9 [#12] unchanged after a row ABOVE them dropped; the dropped row is gone", firstText(dt3, "msg_u4") === "[#7] user four" && firstText(dt3, "msg_a9") === "[#12] a9 text" && firstText(dt3, "msg_u1") === "(gone)", `u4=${firstText(dt3, "msg_u4")} a9=${firstText(dt3, "msg_a9")}`);
  chk("U10f the trim line reports tagged= (> 0) + untagged=1 (msg_a5 tool-call-only) with the pair drop intact", (() => { const l = readLog().slice(-1)[0]; return l.kind === "trim" && Number(l.tagged) > 0 && Number(l.untagged) === 1 && l.droppedRows === "2"; })(), JSON.stringify(readLog().slice(-1)[0] ?? null));
  // (U12 #202) the tag trim line names BOTH numbers: the per-session rank as
  // the tag source (`ordinal=session-rank`) and the ABSOLUTE store seq span of
  // the surviving id-carrying entries — forensics can map a tag back to a DB
  // row without a store write.
  chk("U12 the tag trim line names ordinal=session-rank + the absolute store seq span of the surviving entries", (() => { const l = readLog().slice(-1)[0]; return l.kind === "trim" && l.ordinal === "session-rank" && l.seq === "4300-4309"; })(), JSON.stringify(readLog().slice(-1)[0] ?? null));
  // (U12 #202) ONE TAG PER ENTRY: an entry with TWO text parts carries exactly
  // ONE `[#N] ` — on the first text part; the second part stays verbatim and
  // the entry counts ONCE in `tagged=`.
  const dT = draft();
  dT.messages.find((m) => m.id === "msg_u4").content.push({ type: "text", text: "u4 extra part" });
  await fire(dT);
  const eT = dT.messages.find((m) => m.id === "msg_u4");
  chk("U12 one-tag-per-entry: two text parts -> tag ONLY on the first, second part verbatim, entry counted once (tagged=7)", (() => { const l = readLog().slice(-1)[0]; return eT.content[0].text === "[#7] user four" && eT.content[1].text === "u4 extra part" && Number(l.tagged) === 7 && Number(l.untagged) === 1; })(), JSON.stringify(eT.content));
  // (U11 #200) REASONING LANE: a tool-call-only entry WITH a reasoning part
  // becomes tagged on its reasoning part — the text bytes of other entries and
  // the tool-call `input` bytes stay untouched.
  const dN = draft();
  dN.messages.find((m) => m.id === "msg_a5").content.push({ type: "reasoning", text: "a5 ponders" });
  await fire(dN);
  const eN = dN.messages.find((m) => m.id === "msg_a5");
  chk("U11 REASONING-LANE tag: tool-call-only entry with a reasoning part -> [#4305] on the reasoning text, tool-call input untouched", eN != null && eN.content[1].text === "[#8] a5 ponders" && eN.content[0].type === "tool-call" && JSON.stringify(eN.content[0].input) === "{}", JSON.stringify(eN ?? null));
  chk("U11 the reasoning-lane trim line: tagged=8 (7 text survivors + a5 via reasoning), untagged=0 (a5 moved into a lane)", (() => { const l = readLog().slice(-1)[0]; return l.kind === "trim" && Number(l.tagged) === 8 && Number(l.untagged) === 0; })(), JSON.stringify(readLog().slice(-1)[0] ?? null));
  chk("U11 the reasoning-lane fire still byte-stabilizes the text-lane entries (msg_u4 entry identical to snap1)", JSON.stringify(dN.messages.find((m) => m.id === "msg_u4")) === JSON.stringify(JSON.parse(snap1).find((m) => m.id === "msg_u4")), "u4 bytes differ");
  // A reasoning-first assistant entry is now TAGGED through the reasoning lane
  // (the tag NEVER invents a part or reorders content — it rides the existing
  // reasoning part).
  const dR = draft();
  dR.messages.splice(3, 0, { id: "msg_r1", role: "assistant", content: [{ type: "reasoning", text: "r1 thinks" }] });
  await fire(dR);
  chk("U11 an entry the ordinal map does not KNOW stays untagged and is counted (never a guessed number)", (() => { const e = dR.messages.find((m) => m.id === "msg_r1"); return e != null && !JSON.stringify(e).includes("[#"); })(), JSON.stringify(dR.messages.find((m) => m.id === "msg_r1") ?? null));
  chk("U10g toggle-OFF then clear: the entry is DELETED (tags are not a keep-lever once OFF)", (await trim({ mode: "mark", session: SID, tags: false })) === "mark-set= tags=off" && (await trim({ mode: "mark", session: SID, clear: true })) === "mark-set= +0 -2 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID] === undefined);
  const lBefore = readLog().length;
  const dt4 = draft();
  await fire(dt4);
  chk("U10g tags OFF + entry gone: the SAME draft renders NO tag and the hook is SILENT (no line, nothing dropped)", JSON.stringify(dt4.messages).includes("[#") === false && dt4.messages.length === 15 && readLog().length === lBefore, `len=${dt4.messages.length} lines=${readLog().length - lBefore}`);
  // fail-open: an unreadable ordinal source -> `#?` rows, numbers rejected, ids still work
  pluginMod.setOrdinalsDbForTest(path.join(SCRATCH, "fx_missing.db"));
  RPC.rows = windowRows().map((r) => { const { seq, ...rest } = r; return rest; });
  const r3 = await trim({ mode: "report", session: SID });
  chk("U10h fail-open: ordinal=unavailable, rows print #? (never a guessed number)", r3.split("\n")[1].includes("ordinal=unavailable tags=off") && ordLine(r3, 2) === "row: 2 #? user own=2", JSON.stringify([r3.split("\n")[1], ordLine(r3, 2)]));
  chk("U10h fail-open: a bare number is REJECTED as not-found; an id string still marks normally", (await trim({ mode: "mark", session: SID, ids: ["7"] })) === "mark-set= rejected: mark-not-found" && (await trim({ mode: "mark", session: SID, ids: ["msg_u4"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=2" && (await trim({ mode: "mark", session: SID, clear: true })) === "mark-set= +0 -1 total=0 rows_dropped_est=0");
  chk("U10h the hook fails open with tags on + unreadable ordinals (no tag rendered, the drop still applies)", (await trim({ mode: "mark", session: SID, tags: true })) === "mark-set= tags=on" && (await trim({ mode: "mark", session: SID, ids: ["msg_a3"] })) === "mark-set= +1 -0 total=1 rows_dropped_est=205" && (await trim({ mode: "apply", session: SID })) === "apply= staged->active n=1 drop_est=205 projected=54795 bound=96000 ok mixed=0" && await (async () => { const d = draft(); await fire(d); return JSON.stringify(d.messages).includes("[#") === false && d.messages.every((m) => m.id !== "msg_a3"); })());
  pluginMod.setOrdinalsDbForTest(ORD_DB);
  chk("U10h restore: toggle off + clear -> store clean for the C block", (await trim({ mode: "mark", session: SID, tags: false })) === "mark-set= tags=off" && (await trim({ mode: "mark", session: SID, clear: true })) === "mark-set= +0 -1 total=0 rows_dropped_est=0" && readStore()?.sessions?.[SID] === undefined);
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
  chk("INV every line parses; kinds ⊂ {report, tail, trim, boundary-stale, gauge, mark, marks-stale, apply, ordinals (U10 fail-open)}", [...kinds].sort().join(",") === "apply,boundary-stale,gauge,mark,marks-stale,ordinals,report,tail,trim", JSON.stringify([...kinds].sort()));
  chk("INV every line carries ts + kind and stays within the LINE_CAP ladder", lines.every((l) => typeof l.ts === "string" && typeof l.kind === "string" && JSON.stringify(l).length <= 2000 && JSON.stringify(l).length > 0));
  chk("INV the `trim` lines all name a session + boundary + the counts incl droppedProjections/orphan/tagged/untagged (U9 + U10 + U11)", lines.filter((l) => l.kind === "trim").every((l) => typeof l.session === "string" && typeof l.boundary === "string" && typeof l.droppedRows === "string" && typeof l.droppedEntries === "string" && typeof l.droppedProjections === "string" && typeof l.orphan === "string" && typeof l.tagged === "string" && typeof l.untagged === "string" && typeof l.keptEntries === "string"));
  chk("INV the `mark` lines all name session + added/removed/total scalars (a U10 tags-TOGGLE line carries `tags` instead — the only exempt shape)", lines.filter((l) => l.kind === "mark").every((l) => typeof l.session === "string" && ((typeof l.added === "string" && typeof l.removed === "string" && typeof l.total === "string") || typeof l.tags === "string")));
  chk("INV the `apply` lines all name session + n/dropEst/projected/bound/mixed scalars (U8)", lines.filter((l) => l.kind === "apply").every((l) => typeof l.session === "string" && typeof l.n === "string" && typeof l.dropEst === "string" && typeof l.projected === "string" && typeof l.bound === "string" && typeof l.mixed === "string"));
  chk("INV the EIGHT applied kind:apply lines (the rejections log nothing — fail-closed; U9 adds the retry leg, U10 the four ordinal/tag legs)", lines.filter((l) => l.kind === "apply").length === 9, `count=${lines.filter((l) => l.kind === "apply").length}`);
  chk("INV the ONE boundary-stale line for the (session,boundary) state (deduped)", lines.filter((l) => l.kind === "boundary-stale").length === 1, `count=${lines.filter((l) => l.kind === "boundary-stale").length}`);
  chk("INV the ONE marks-stale line for the (session,count) state (deduped)", lines.filter((l) => l.kind === "marks-stale").length === 1, `count=${lines.filter((l) => l.kind === "marks-stale").length}`);
  chk("INV the gauge lines' reasons are only the two honest read failures", lines.filter((l) => l.kind === "gauge").every((l) => l.reason === "context-read-failed" || l.reason === "session-not-found" || l.reason === "messages-not-array"));
  chk("INV report mode emitted a kind:report line per call (17 calls: 9 + the 4 U10 legs + the 2 U11 compact legs + the U12 range leg)", lines.filter((l) => l.kind === "report").length === 17, `count=${lines.filter((l) => l.kind === "report").length}`);
}

// ------------------------------------------------------------------ cleanup

await cleanup();
chk("S3 cleanup disposes the registered tool + hook handler (the store survives — a dead process keeps the trim)", TOOLS.length === 1 && CONTEXT_HANDLERS.length === 0 && existsSync(STORE), JSON.stringify({ handlers: CONTEXT_HANDLERS.length, store: existsSync(STORE) }));
chk("S3b after cleanup the handler list is unchanged by the dispose mock (the tool entry stays; the store is NOT rewritten)", existsSync(STORE) && JSON.parse(readFileSync(STORE, "utf8")).sessions !== undefined, "store readable");

console.log(`\nlog lines: ${readLog().length}`);
console.log(failures === 0 ? "\nSMOKE: ALL PASS" : `\nSMOKE: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
