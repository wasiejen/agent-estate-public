// context_family.smoke.mjs — the v2 context-family plugin smoke, RE-PINNED for
// the TODO #153 + #154 APPEND leg (2026-10-26). bun, MOCK ctx — no opencode
// process. The plugin now delivers the gauge line and the rung nudges by
// APPENDING to the tool result on `tool.execute.after`: the `session.hook(
// "context")` draft leg, the `ctxmsg` kind, and the `session.synthetic`
// delivery are gone. Pins: the loader shape + the EXACT hook list; the append
// lanes (string output / content array / content string / file-only array /
// empty result); the append-only tail (the original output survives as a byte
// prefix); the >= 1%-of-window economy gate (below -> nothing, at/above ->
// append); the `ctx_gauge` skip; the unknown-window / db-error / sid-mismatch
// silence; the durable store `ctx_family_store.json` (reload-surviving rung
// dedup, the last-appended CTX, the additive #119 write, the fail-open read);
// the 5-rung ladder ON THE APPEND CHANNEL (rungs 1-5, the highest-rung rule,
// dedup, ZERO synthetic calls); an ERROR-status call (nothing appendable); the
// handover pre-flight on `execute.before`; the whole-log invariants (kinds ONLY
// ctx-append / gauge / handover-preflight).
//
// The gauge core is STEERED at a scratchpad FIXTURE DB (NEVER the live
// opencode.db); the budget store rides its test hook. Fixtures, the store and
// the log live in home/AppData/Local/Temp/opencode/ctx-family-
// smoke-v2 (recreated every run). Run: bun run context_family.smoke.mjs (this
// dir). Expected final line: SMOKE: ALL PASS.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRATCH = "home/AppData/Local/Temp/opencode/ctx-family-smoke-v2";
const WS = path.join(SCRATCH, "ws"); // the mock workspace (ctx.location.directory)
// The repo root this suite lives in (`.opencode/plugins/tests` -> up 3). The old
// absolute clone path `repo-root-v2` no longer
// exists on this machine — resolved relative to the file so the suite runs in
// whatever checkout owns the tests dir (TODO #153 unit, 2026-10-26).
const CLONE_ROOT = path.join(import.meta.dirname, "..", "..", "..");
const PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "context_family.ts");
const SID = "ses_ctxsmoke001"; // fixture row + finished step: 57000 of a 120K window
const MODEL_ID = "smoke-ctx-model-120K"; // name-marker window: 120000 (config untouched)

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
const LOG = path.join(WS, ".opencode", "temp", "ctx_family.log");
const STORE = path.join(WS, ".opencode", "temp", "ctx_family_store.json");

function readLog() {
  if (!existsSync(LOG)) return [];
  return readFileSync(LOG, "utf8").split("\n").filter((l) => l !== "").map((l) => JSON.parse(l));
}
function seedStore(obj) {
  writeFileSync(STORE, JSON.stringify(obj), "utf8");
}
function readStoreFile() {
  return JSON.parse(readFileSync(STORE, "utf8"));
}
function clearStore() {
  rmSync(STORE, { force: true });
}
// The fixture session DB: `session_v2` + `session_message` rows (the v2 line the
// gauge core's unit-1/unit-2 legs read). SID has a FINISHED step (token mass
// 10000+2000+0+45000+0 = 57000 -> pct 47 of the 120K marker window, REM 63000:
// BELOW rung 1, so this session exercises the plain gauge line). SID2 has a
// session row and NO step rows (the honest no-total read -> never appends).
const FX_DB = path.join(SCRATCH, "fx_ctx_v2.db");
{
  rmSync(FX_DB, { force: true });
  const db = new DatabaseSync(FX_DB);
  db.exec("CREATE TABLE session_v2(id TEXT PRIMARY KEY, model TEXT, time_updated INTEGER)");
  db.exec("CREATE TABLE session_message(id INTEGER PRIMARY KEY, session_id TEXT, type TEXT, data TEXT, time_created INTEGER)");
  db.exec(`INSERT INTO session_v2 VALUES('${SID}', '{"id":"${MODEL_ID}","providerID":"llama-swap"}', 2000)`);
  db.exec(`INSERT INTO session_v2 VALUES('ses_ctxsmoke002', '{"id":"${MODEL_ID}","providerID":"llama-swap"}', 3000)`);
  const step = JSON.stringify({
    tokens: { input: 10000, output: 2000, reasoning: 0, cache: { read: 45000, write: 0 } },
    time: { completed: 123 },
  });
  db.exec(`INSERT INTO session_message VALUES(1, '${SID}', 'assistant', '${step}', 100)`);
  // The rung fixtures (the boundary ladder, name-marker windows 120K/80K):
  // ses_rung1 60000/120000 -> pct 50, REM 60000 (rung 1: the pct boundary only);
  // ses_rung2 50000/80000  -> pct 62, REM 30000 (rung 2: the REM boundary only);
  // ses_rung3 60000/80000  -> pct 75, REM 20000 (rung 3: the REM boundary only);
  // ses_rung4 70000/80000  -> pct 87, REM 10000 (rung 4: the REM boundary only);
  // ses_rung5 76000/80000  -> REM 4000 (every leg true -> the HIGHEST rung fires).
  const RING = [
    ["ses_rung1", "smoke-rung-model-120K", 60000],
    ["ses_rung2", "smoke-rung-model-80K", 50000],
    ["ses_rung3", "smoke-rung-model-80K", 60000],
    ["ses_rung4", "smoke-rung-model-80K", 70000],
    ["ses_rung5", "smoke-rung-model-80K", 76000],
  ];
  for (let i = 0; i < RING.length; i++) {
    const sidR = RING[i][0];
    const stepR = JSON.stringify({ tokens: { input: RING[i][2], output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, time: { completed: 123 } });
    db.exec(`INSERT INTO session_v2 VALUES('${sidR}', '{"id":"${RING[i][1]}","providerID":"llama-swap"}', 2000)`);
    db.exec(`INSERT INTO session_message VALUES(${i + 2}, '${sidR}', 'assistant', '${stepR}', 100)`);
  }
  db.close();
}
const SID2 = "ses_ctxsmoke002";

// The budget fixture: cap 6 for MODEL_ID (SID count 0 -> " | 6 compactions
// left"); the 80K rung model cap 4 with no session entry (remaining = cap).
const BUDGET = path.join(SCRATCH, "fx_budget.json");
{
  const rec = { model_budget: { [MODEL_ID]: 6, "smoke-rung-model-120K": 6, "smoke-rung-model-80K": 4 }, sessions: { [SID]: { count: 0, model: MODEL_ID } }, emergency_budget: 1 };
  writeFileSync(BUDGET, JSON.stringify(rec), "utf8");
}

// ------------------------------------------------------------------ steer the gauge core + the mock ctx

const gaugeMod = await import(pathToFileURL(path.join(CLONE_ROOT, ".opencode", "plugins", "scripts", "gauge.mjs")).href);
gaugeMod.setDbPath(FX_DB); // the plugin's readGauge(undefined, sid) reads THIS file
gaugeMod.setBudgetFileForTest(BUDGET);

// The session-domain mock keeps `synthetic` PRESENT so the suite can pin that
// the plugin NEVER calls it (DoD 3: a queued synthetic lands as the next turn
// and wakes an idle session — #154), and `hook` records into a SEPARATE map so
// the suite can pin that no `context` hook is registered (DoD 1).
const SYNTH = { calls: [] };
const SESSION_HOOKS = {};

function makeCtx(directory) {
  const hooks = {};
  return {
    location: { directory },
    session: {
      hook: async (name, cb) => {
        SESSION_HOOKS[name] = cb;
        return { dispose: async () => delete SESSION_HOOKS[name] };
      },
      synthetic: (input) => {
        SYNTH.calls.push(input);
        return Promise.resolve({ data: "queued" });
      },
    },
    tool: {
      hook: async (name, cb) => {
        hooks[name] = cb;
        return { dispose: async () => delete hooks[name] };
      },
    },
    _hooks: hooks,
  };
}

const plugin = (await import(pathToFileURL(PLUGIN).href)).default;
chk("S0 default export is the loader shape { id: 'context_family', setup }", plugin && typeof plugin === "object" && plugin.id === "context_family" && typeof plugin.setup === "function", JSON.stringify(Object.keys(plugin ?? {})));

const ctx = makeCtx(WS);
const cleanup = await plugin.setup(ctx);
chk("S1 the tool hook list is EXACTLY execute.before + execute.after", Object.keys(ctx._hooks).sort().join(",") === "execute.after,execute.before", JSON.stringify(Object.keys(ctx._hooks)));
chk("S1 NO session hook is registered and setup returns a cleanup (DoD 1)", Object.keys(SESSION_HOOKS).length === 0 && typeof ctx._hooks["execute.after"] === "function" && typeof cleanup === "function", JSON.stringify(Object.keys(SESSION_HOOKS)));
// ------------------------------------------------------------------ the append event shapes

// The v2 tool event shapes (fork promise/tool.ts:47-63 — after: status +
// result|error; both carry tool/sessionID/agent/messageID/id/input). The plugin
// MUTATES `event.result` and the host returns that object (fork
// packages/core/src/tool.ts:132-152), so the pins read the event back.
function afterEvent(sessionID, result, tool = "bash") {
  return { tool, sessionID, agent: "worker-1", messageID: "msg-e1", id: "call-e1", input: { command: "ls" }, status: "completed", result };
}

const fireAfter = async (event) => {
  await ctx._hooks["execute.after"](event);
  await Promise.resolve();
};

// The pinned readouts. The GAUGE line drops the `SESSION=<sid> ` token (DoD 2 —
// the line sits inside the session's own tool result) and carries NO ITER
// suffix; the RUNG text keeps the BARE formatGauge readout + the v1 instruction
// VERBATIM (only the channel changed).
const G1 = "ctx: CTX=57000 (47%) REM=63000 | 6 compactions left";
const R1_RO = "SESSION=ses_rung1 CTX=60000 (50%) REM=60000 | 6 compactions left";
const R2_RO = "SESSION=ses_rung2 CTX=50000 (62%) REM=30000 | 4 compactions left";
const R3_RO = "SESSION=ses_rung3 CTX=60000 (75%) REM=20000 | 4 compactions left";
const R4_RO = "SESSION=ses_rung4 CTX=70000 (87%) REM=10000 | 4 compactions left";
const R5_RO = "SESSION=ses_rung5 CTX=76000 (95%) REM=4000 | 4 compactions left";
const RUNG_TXT = {
  1: "context watch: past 50% of the context window; gauge-check between steps and keep new work small.",
  2: "context high: wrap the current step, start the commit routine, begin the handover summary.",
  3: "wind-down, just before the stop line: run the commit routine now, write the handover summary + TODO.md, prep the NAP.",
  4: "CRITICAL: commit + write the handover summary NOW; do not start new work.",
  5: "stop line reached: further work needs planner approval (working past the line is a rule violation); write the handover summary and stop.",
};

// ------------------------------------------------------------------ A1-A6 the append lanes

{
  clearStore();
  const before = readLog().length;
  const ev = afterEvent(SID, { output: "the tool output", metadata: {} });
  await fireAfter(ev);
  const lines = readLog();
  const ap = lines.filter((l) => l.kind === "ctx-append");
  chk("A1 first append per session is UNCONDITIONAL: the line rides result.output byte-exact", ev.result.output === `the tool output\n${G1}`, JSON.stringify(ev.result.output));
  chk("A2 append-only tail: the original output survives as a byte prefix (cache rule)", String(ev.result.output).startsWith("the tool output") && ev.result.metadata !== undefined, JSON.stringify(ev.result.output));
  chk("A3 ONE kind:ctx-append line (session + gauge discriminator + the appended text)", lines.length - before === 1 && ap.length === 1 && ap[0].session === SID && ap[0].gauge === "line" && ap[0].rung === undefined && ap[0].line === G1, JSON.stringify(ap[0] ?? null));
  const st = readStoreFile();
  chk("A4 the store records this session's appended CTX (the gate baseline) + no rung", st.sessions[SID].ctx === 57000 && Array.isArray(st.sessions[SID].fired) && st.sessions[SID].fired.length === 0, JSON.stringify(st.sessions[SID] ?? null));
}

{
  clearStore(); // a fresh session entry -> the first append is unconditional
  const ev = afterEvent(SID, { output: "keep", content: [{ type: "text", text: "the head" }, { type: "file", uri: "u", mime: "text/plain" }] });
  await fireAfter(ev);
  chk("A5 content array wins: the LAST text item carries the line (normalizeContent keeps content, fork tool/runtime.ts:261-265)", ev.result.content[0].text === `the head\n${G1}` && ev.result.content[1].type === "file" && ev.result.output === "keep", JSON.stringify(ev.result.content));
}

{
  clearStore();
  const ev = afterEvent(SID, { output: "keep", content: [{ type: "file", uri: "u", mime: "text/plain" }] });
  await fireAfter(ev);
  chk("A6 content array without a text item: a NEW tail text item is appended, output untouched", ev.result.content.length === 2 && ev.result.content[1].type === "text" && ev.result.content[1].text === G1 && ev.result.output === "keep", JSON.stringify(ev.result.content));
}

{
  clearStore();
  const ev = afterEvent(SID, { content: "a string content" });
  await fireAfter(ev);
  chk("A7 string content lane: the line is appended to the content string", ev.result.content === `a string content\n${G1}`, JSON.stringify(ev.result.content));
}

{
  clearStore();
  const ev = afterEvent(SID, {});
  await fireAfter(ev);
  chk("A8 neither output nor content: output is SET to the line (the host derives content from it)", ev.result.output === G1, JSON.stringify(ev.result.output));
}
// ------------------------------------------------------------------ A9-A13 the economy gate + skips

{
  clearStore();
  seedStore({ sessions: { [SID]: { ctx: 58199, fired: [] } } }); // delta 1199 < 1% of 120000
  const before = readLog().length;
  const ev = afterEvent(SID, { output: "below the gate" });
  await fireAfter(ev);
  chk("A9 gate BELOW 1% of the window: no append, no log line", ev.result.output === "below the gate" && readLog().length === before, `delta=${readLog().length - before}`);
}

{
  seedStore({ sessions: { [SID]: { ctx: 58200, fired: [] } } }); // delta 1200 = exactly 1%
  const ev = afterEvent(SID, { output: "at the gate" });
  await fireAfter(ev);
  chk("A10 gate AT 1% of the window: the append fires", ev.result.output === `at the gate\n${G1}`, JSON.stringify(ev.result.output));
}

{
  clearStore();
  const before = readLog().length;
  const ev = afterEvent(SID, { output: "ctx_gauge answer" }, "ctx_gauge");
  await fireAfter(ev);
  const ev2 = afterEvent("ses_rung3", { output: "ctx_gauge answer at a rung" }, "ctx_gauge");
  await fireAfter(ev2);
  chk("A11 ctx_gauge SKIP: no append and no line, on a below-rung AND a rung session", ev.result.output === "ctx_gauge answer" && ev2.result.output === "ctx_gauge answer at a rung" && readLog().length === before && !existsSync(STORE), `delta=${readLog().length - before}`);
}

{
  clearStore();
  const before = readLog().length;
  const ev = afterEvent(SID2, { output: "no-total read" });
  await fireAfter(ev);
  chk("A12 no-total (unknown window) read: no append, no line, no store file", ev.result.output === "no-total read" && readLog().length === before && !existsSync(STORE), `delta=${readLog().length - before}`);
}

{
  const before = readLog().length;
  const ev = afterEvent("ses_absent999999", { output: "other session" });
  await fireAfter(ev);
  chk("A13 absent/mismatched session id: SILENT (the own-session gate, no read side effects)", ev.result.output === "other session" && readLog().length === before, `delta=${readLog().length - before}`);
  const noSid = afterEvent(undefined, { output: "no session id" });
  await fireAfter(noSid);
  chk("A13 missing event sessionID: SILENT too (no read, no append)", noSid.result.output === "no session id" && readLog().length === before, `delta=${readLog().length - before}`);
}

{
  gaugeMod.setBackends(["node:sqlite"]); // force the failing backend (deterministic)
  gaugeMod.setDbPath(path.join(SCRATCH, "no_dir", "missing.db"));
  const before = readLog().length;
  const ev = afterEvent(SID, { output: "db error read" });
  await fireAfter(ev);
  const gs = readLog().slice(before);
  chk("A14 db-error: NO append + exactly ONE kind:gauge line (reason db-error, capped preview)", ev.result.output === "db error read" && gs.length === 1 && gs[0].kind === "gauge" && gs[0].reason === "db-error" && gs[0].session === SID && typeof gs[0].preview === "string" && gs[0].preview.length > 0 && gs[0].preview.length <= 121 && /sqlite/.test(gs[0].preview), JSON.stringify(gs[0] ?? null));
  gaugeMod.setBackends(gaugeMod.DEFAULT_BACKENDS);
  gaugeMod.setDbPath(FX_DB);
}

{
  clearStore();
  const ev = { tool: "bash", sessionID: "ses_rung2", agent: "worker-1", messageID: "m", id: "c", input: {}, status: "error", error: { message: "boom" } };
  const before = readLog().length;
  await fireAfter(ev);
  chk("A15 ERROR-status call: nothing appendable -> no append, no line, rung NOT consumed", !("result" in ev) && readLog().length === before && !existsSync(STORE), `delta=${readLog().length - before}`);
}
// ------------------------------------------------------------------ N1-N8 the rung ladder on the append channel

// Below the first rung (pct 47, REM 63000) -> SILENT: covered by A1-A10 above
// (SID never produced a rung line), pinned again here on a fresh store.
{
  clearStore();
  const before = readLog().length;
  await fireAfter(afterEvent(SID, { output: "x" }));
  chk("N0 below rung 1: no rung line ever rides this channel", readLog().slice(before).every((l) => l.kind !== "ctx-append" || l.rung === undefined) && SYNTH.calls.length === 0, JSON.stringify(readLog().slice(before)));
}

{
  clearStore();
  const before = readLog().length;
  const ev1 = afterEvent("ses_rung1", { output: "o1" });
  await fireAfter(ev1);
  chk("N1 rung 1 (pct 50 boundary) appends the rung text byte-exact into result.output", ev1.result.output === `o1\n${R1_RO} — ${RUNG_TXT[1]}`, JSON.stringify(ev1.result.output));
  const d1 = readLog().slice(before);
  chk("N1 ONE kind:ctx-append line, discriminator rung '1', line = the appended text", d1.length === 1 && d1[0].kind === "ctx-append" && d1[0].session === "ses_rung1" && d1[0].rung === "1" && d1[0].line === `${R1_RO} — ${RUNG_TXT[1]}`, JSON.stringify(d1[0] ?? null));
}

{
  const evs = [afterEvent("ses_rung2", { output: "o2" }), afterEvent("ses_rung3", { output: "o3" }), afterEvent("ses_rung4", { output: "o4" })];
  const before = readLog().length;
  for (const e of evs) await fireAfter(e);
  const d = readLog().slice(before);
  chk("N2 rung 2 fires at REM=30000 (pct 62) — the REM leg alone decides", evs[0].result.output === `o2\n${R2_RO} — ${RUNG_TXT[2]}` && d[0]?.rung === "2", JSON.stringify(d[0] ?? null));
  chk("N3 rung 3 (wind-down) fires at REM=20000 (pct 75)", evs[1].result.output === `o3\n${R3_RO} — ${RUNG_TXT[3]}` && d[1]?.rung === "3", JSON.stringify(d[1] ?? null));
  chk("N4 rung 4 (commit+NAP-now) fires at REM=10000 (pct 87)", evs[2].result.output === `o4\n${R4_RO} — ${RUNG_TXT[4]}` && d[2]?.rung === "4", JSON.stringify(d[2] ?? null));
}

{
  const ev = afterEvent("ses_rung5", { output: "o5" });
  const before = readLog().length;
  await fireAfter(ev);
  const d = readLog().slice(before);
  chk("N5 highest-rung rule: ONE append for ses_rung5, rung '5', VERBATIM stop-line text", d.length === 1 && d[0].rung === "5" && ev.result.output === `o5\n${R5_RO} — ${RUNG_TXT[5]}`, JSON.stringify(d[0] ?? null));
}

{
  const before = readLog().length;
  const a = afterEvent("ses_rung1", { output: "again" });
  const b = afterEvent("ses_rung5", { output: "again" });
  await fireAfter(a);
  await fireAfter(b);
  chk("N6 per-rung dedup: a second fire of the SAME rung appends nothing and logs nothing", a.result.output === "again" && b.result.output === "again" && readLog().length === before, `delta=${readLog().length - before}`);
}

{
  // The #154 reload leg: a fresh process reads the store a plugin wrote BEFORE a
  // reconciliation rebuild — an already-fired rung must NOT re-fire.
  clearStore();
  seedStore({ sessions: { ses_rung2: { ctx: 50000, fired: [2], at: "2026-10-26T00:00:00.000Z" } } });
  const before = readLog().length;
  const ev = afterEvent("ses_rung2", { output: "after reload" });
  await fireAfter(ev);
  chk("N7 reload-surviving dedup: store pre-seeded fired[2] -> no re-fire, no line", ev.result.output === "after reload" && readLog().length === before, `delta=${readLog().length - before}`);
}

{
  // A fired rung stays fired, yet the plain gauge line still rides the >=1%
  // gate (here the fill moved 3000 of an 80000 window = 3.75%).
  clearStore();
  seedStore({ sessions: { ses_rung3: { ctx: 57000, fired: [3] } } });
  const ev = afterEvent("ses_rung3", { output: "moved" });
  await fireAfter(ev);
  const st = readStoreFile().sessions.ses_rung3;
  chk("N8 a fired rung does NOT re-fire after reload while the gauge line appends (store keeps fired[3], ctx updated)", ev.result.output === `moved\nctx: CTX=60000 (75%) REM=20000 | 4 compactions left` && st.fired.length === 1 && st.fired[0] === 3 && st.ctx === 60000, JSON.stringify(st));
}

chk("N9 NO synthetic delivery happened anywhere in the run (DoD 3)", SYNTH.calls.length === 0, JSON.stringify(SYNTH.calls.slice(0, 2)));
// ------------------------------------------------------------------ A16-A17 the store failure lanes

{
  writeFileSync(STORE, "{ this is not json", "utf8"); // malformed -> fail-open read
  const ev = afterEvent(SID, { output: "malformed store" });
  await fireAfter(ev);
  chk("A16 malformed store: the read fails OPEN (empty history) and the append still happens", ev.result.output === `malformed store\n${G1}`, JSON.stringify(ev.result.output));
}

{
  seedStore({ foreign: { keep: 1 }, sessions: { ses_other: { ctx: 123, fired: [1] } } });
  await fireAfter(afterEvent(SID, { output: "additive" }));
  const st = readStoreFile();
  chk("A17 the store write is ADDITIVE (#119): a foreign top-level key and another session's entry survive", st.foreign?.keep === 1 && st.sessions.ses_other?.ctx === 123 && st.sessions.ses_other?.fired?.[0] === 1 && st.sessions[SID]?.ctx === 57000, JSON.stringify(st).slice(0, 200));
}

// ------------------------------------------------------------------ P1-P7 the handover pre-flight (unchanged)

// The v2 delegation tool is `subagent` (v1 `task` renamed); the before event's
// INPUT is MUTABLE — the pre-flight NEVER mutates it, NEVER throws.
function beforeEvent(input, tool = "subagent", id = "call-e2") {
  return { tool, sessionID: SID, agent: "planner-1", messageID: "msg-e2", id, input };
}

const fireBefore = async (event) => {
  await ctx._hooks["execute.before"](event);
};

const SPEC_F = path.join(WS, "agent", "handover", "handover_task.md"); // the WS repo root's spec file
const HANDOVER_PROMPT = "Read and follow the committed task spec at agent/handover/handover_task.md (TODO #153/#154).";

{
  const before = readLog().length;
  const inp = { prompt: HANDOVER_PROMPT, subagent_type: "worker_FlashNext" };
  const snap = JSON.stringify(inp);
  let threw = false;
  try {
    await fireBefore(beforeEvent(inp)); // file MISSING (agent/handover absent)
  } catch {
    threw = true;
  }
  const delta = readLog().slice(before);
  chk("P1 missing spec file: ONE kind:handover-preflight line (reason + session + call)", delta.length === 1 && delta[0].kind === "handover-preflight" && delta[0].reason === "handover-task-file-missing-or-empty" && delta[0].session === SID && delta[0].call === "call-e2", JSON.stringify(delta[0] ?? null));
  chk("P1 observation only: no throw, event.input byte-unchanged", !threw && JSON.stringify(inp) === snap, JSON.stringify(inp));
}

{
  mkdirSync(path.dirname(SPEC_F), { recursive: true });
  writeFileSync(SPEC_F, "", "utf8");
  const before = readLog().length;
  await fireBefore(beforeEvent({ prompt: HANDOVER_PROMPT }));
  const delta = readLog().slice(before);
  chk("P2 EMPTY spec file: ONE warn line (same shape)", delta.length === 1 && delta[0].kind === "handover-preflight" && delta[0].reason === "handover-task-file-missing-or-empty", JSON.stringify(delta[0] ?? null));
}

{
  writeFileSync(SPEC_F, "   \n", "utf8"); // whitespace-only -> trim EMPTY
  const before = readLog().length;
  await fireBefore(beforeEvent({ prompt: HANDOVER_PROMPT }));
  chk("P3 whitespace-only spec file: treated as EMPTY -> ONE warn line", readLog().length - before === 1, `delta=${readLog().length - before}`);
  writeFileSync(SPEC_F, "# Task spec — real content\n", "utf8");
  const b4 = readLog().length;
  await fireBefore(beforeEvent({ prompt: HANDOVER_PROMPT }));
  chk("P4 non-empty spec file: SILENT (no new line)", readLog().length === b4, `delta=${readLog().length - b4}`);
  const b5 = readLog().length;
  await fireBefore(beforeEvent({ prompt: "just explore the repo, no spec reference" }));
  chk("P5 prompt WITHOUT the spec path: SILENT (the handover gate)", readLog().length === b5, `delta=${readLog().length - b5}`);
  const b6 = readLog().length;
  await fireBefore(beforeEvent({ prompt: HANDOVER_PROMPT }, "task")); // the v1 tool name
  chk("P6 tool 'task' (the v1 name): SILENT (the gate targets 'subagent')", readLog().length === b6, `delta=${readLog().length - b6}`);
  const b7 = readLog().length;
  await fireBefore(beforeEvent(HANDOVER_PROMPT)); // input not an object
  chk("P7 non-object input: SILENT, no throw (wire-defensive gate)", readLog().length === b7, `delta=${readLog().length - b7}`);
}

// ------------------------------------------------------------------ whole-log invariants

{
  const lines = readLog();
  const kinds = new Set(lines.map((l) => l.kind));
  chk("INV all lines parse as JSON; kinds ONLY {ctx-append, gauge, handover-preflight} (ctxmsg + nudge retired)", kinds.size === 3 && [...kinds].sort().join(",") === "ctx-append,gauge,handover-preflight", JSON.stringify([...kinds]));
  chk("INV field shapes per kind: ctx-append session + (rung 1..5 | gauge 'line') + line; gauge reason db-error + session; handover-preflight reason + session + call", lines.every((l) => typeof l.ts === "string" && typeof l.kind === "string" && (l.kind === "ctx-append" ? typeof l.session === "string" && typeof l.line === "string" && (l.gauge === "line" || (typeof l.rung === "string" && Number(l.rung) >= 1 && Number(l.rung) <= 5)) : l.kind === "gauge" ? l.reason === "db-error" && typeof l.session === "string" : l.kind === "handover-preflight" ? l.reason === "handover-task-file-missing-or-empty" && typeof l.session === "string" && typeof l.call === "string" : false)), JSON.stringify(lines.filter((l) => l.kind === "ctx-append").slice(0, 3)));
  chk("INV no line exceeds the LINE_CAP ladder (2000 chars)", lines.every((l) => JSON.stringify(l).length <= 2000));
  chk("INV every ctx-append session is a fixture session this run read (per-event own-session targeting)", lines.filter((l) => l.kind === "ctx-append").every((l) => l.session === SID || /^ses_rung[1-5]$/.test(l.session)), JSON.stringify([...new Set(lines.filter((l) => l.kind === "ctx-append").map((l) => l.session))]));
  chk("INV every ctx-append line starts with the text it appended ('ctx: ' or the rung readout)", lines.filter((l) => l.kind === "ctx-append").every((l) => l.line.startsWith("ctx: CTX=") || l.line.startsWith("SESSION=ses_rung")), JSON.stringify(lines.filter((l) => l.kind === "ctx-append").map((l) => l.line.slice(0, 14))));
  console.log(`\nlog lines: ${lines.length}`);
}

await cleanup();
chk("S11 cleanup disposes BOTH registered hooks (execute.before + execute.after)", ctx._hooks["execute.before"] === undefined && ctx._hooks["execute.after"] === undefined && Object.keys(SESSION_HOOKS).length === 0, JSON.stringify(Object.keys(ctx._hooks)));
console.log(failures === 0 ? "\nSMOKE: ALL PASS" : `\nSMOKE: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
