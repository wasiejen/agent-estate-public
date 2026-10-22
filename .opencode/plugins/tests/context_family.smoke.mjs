// context_family.smoke.mjs — TODO #137 unit 3a + unit 3b: the v2 context-family
// plugin smoke. bun, MOCK ctx — no opencode process. Pins the DoD 2-5 contract
// of `.opencode/plugins/context_family.ts` (the ctx: line injection at the
// `session.context` hook + the own-session gate + the evidence log) and DoD 3's
// cache pin (the untouched prefix byte-compares), plus the 3b legs: the 5-rung
// nudge ladder on `tool.execute.after` (rungs/dedup/silence/delivery — DoD 1-2),
// its kind:"nudge" evidence + delivery-failure reasons (DoD 3), and the handover
// pre-flight on `tool.execute.before` (DoD 4).
//
// The gauge core is STEERED at a scratchpad FIXTURE DB (the existing v2
// intercept smoke's pattern — NEVER the live opencode.db); the budget store +
// loop root ride their test hooks. Fixtures and the log live in
// home/AppData/Local/Temp/opencode/ctx-family-smoke-v2
// (recreated every run). Run: bun run context_family.smoke.mjs (this dir).
// Expected final line: SMOKE: ALL PASS.

import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRATCH = "home/AppData/Local/Temp/opencode/ctx-family-smoke-v2";
const WS = path.join(SCRATCH, "ws"); // the mock workspace (ctx.location.directory)
const CLONE_ROOT = "repo-root-v2";
const PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "context_family.ts");
const SID = "ses_ctxsmoke001"; // the request's OWN session (fixture row + finished step)
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

function readLog() {
  if (!existsSync(LOG)) return [];
  return readFileSync(LOG, "utf8").split("\n").filter((l) => l !== "").map((l) => JSON.parse(l));
}

// The fixture session DB: `session_v2` + `session_message` rows (the v2 line
// the gauge core's unit-1/unit-2 legs read). SID has a FINISHED step (token
// mass 10000+2000+0+45000+0 = 57000); SID2 has a session row and NO step
// rows (the no-total / honest-notAvailable case).
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
  // 3b rung fixtures (DoD 5 boundary ladder; name-marker windows 120K/80K):
  // ses_rung1 60000/120000 -> pct 50, REM 60000 (rung 1: the pct boundary only);
  // ses_rung2 50000/80000 -> pct 62, REM 30000 (rung 2: the REM boundary only);
  // ses_rung3 60000/80000 -> pct 75, REM 20000 (rung 3: the REM boundary only);
  // ses_rung4 70000/80000 -> pct 87, REM 10000 (rung 4: the REM boundary only);
  // ses_rung5 76000/80000 -> REM 4000 (every leg true -> the HIGHEST rung fires);
  // ses_rej / ses_throw 50000/80000 -> rung 2, for the delivery-failure pins.
  const RING = [
    ["ses_rung1", "smoke-rung-model-120K", 60000],
    ["ses_rung2", "smoke-rung-model-80K", 50000],
    ["ses_rung3", "smoke-rung-model-80K", 60000],
    ["ses_rung4", "smoke-rung-model-80K", 70000],
    ["ses_rung5", "smoke-rung-model-80K", 76000],
    ["ses_rej", "smoke-rung-model-80K", 50000],
    ["ses_throw", "smoke-rung-model-80K", 50000],
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

// The budget store fixture: cap 6 for the model, count 0 for SID -> " | 6
// compactions left". (emergency at 1 by default; count < cap -> no +1.)
// The 3b rung models ride their own caps (6 / 4) — session entries ABSENT for
// the rung sessions -> count 0 -> remaining = cap.
const BUDGET = path.join(SCRATCH, "fx_budget.json");
{
  rmSync(BUDGET, { force: true });
  const rec = { model_budget: { [MODEL_ID]: 6, "smoke-rung-model-120K": 6, "smoke-rung-model-80K": 4 }, sessions: { [SID]: { count: 0, model: MODEL_ID } }, emergency_budget: 1 };
  writeFileSync(BUDGET, JSON.stringify(rec), "utf8");
}

// The loop-root fixture: one autorun folder with counter.json n=3 -> the
// injected-line suffix " ITER=3 <folder>" (Part 2 semantics).
const LOOPFX = path.join(SCRATCH, "loop");
{
  const folder = "autorun-2026-01-01_00-00";
  mkdirSync(path.join(LOOPFX, folder), { recursive: true });
  writeFileSync(path.join(LOOPFX, folder, "counter.json"), JSON.stringify({ n: 3 }), "utf8");
}

// ------------------------------------------------------------------ steer the shared gauge core

const gaugeMod = await import(pathToFileURL(path.join(CLONE_ROOT, ".opencode", "plugin", "scripts", "gauge.mjs")).href);
gaugeMod.setDbPath(FX_DB); // the plugin's readGauge(undefined, sid) reads THIS file
gaugeMod.setBudgetFileForTest(BUDGET);
gaugeMod.setLoopRootForTest(LOOPFX);

// ------------------------------------------------------------------ mock ctx + plugin load

// The synthetic delivery mock (3b): records each call's INPUT (the fire-and-
// forget capture), switchable failure mode: "ok" | "reject" (delivery-rejected)
// | "throw" (delivery-threw). The tool-domain mock shares the SAME hooks map.
const SYNTH = { mode: "ok", calls: [] };

function makeCtx(directory) {
  const hooks = {};
  return {
    location: { directory },
    session: {
      hook: async (name, cb) => {
        hooks[name] = cb;
        return { dispose: async () => delete hooks[name] };
      },
      synthetic: (input) => {
        SYNTH.calls.push(input);
        if (SYNTH.mode === "throw") throw new Error("mock delivery sync throw");
        if (SYNTH.mode === "reject") return Promise.reject(new Error("mock delivery rejection"));
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
chk("S1 setup registers the 'context' + 'execute.before' + 'execute.after' hooks and returns a cleanup", typeof ctx._hooks["context"] === "function" && typeof ctx._hooks["execute.before"] === "function" && typeof ctx._hooks["execute.after"] === "function" && typeof cleanup === "function");

const fire = async (draft) => {
  await ctx._hooks["context"](draft);
};

// A draft shaped like the fork's `SessionContext` (messages: Array<Message>).
function draft(sessionID, agent = "worker-1") {
  return {
    sessionID,
    agent,
    model: { id: MODEL_ID, providerID: "llama-swap", limit: { context: 120000 } },
    system: [{ type: "text", text: "the system part" }],
    messages: [
      { role: "user", content: [{ type: "text", text: "the real user message" }] },
      { role: "assistant", content: [{ type: "text", text: "an earlier assistant turn" }] },
      { role: "user", content: [{ type: "text", text: "the newest user message" }] },
    ],
    options: {},
    tools: {},
  };
}

// ------------------------------------------------------------------ S2 the injection + DoD 2 readout

{
  const d = draft(SID);
  const prefixBefore = JSON.stringify(d.messages); // byte snapshot of ALL original entries
  await fire(d);
  const lines = readLog();
  const msgs = d.messages;
  chk("S2 exactly ONE injected piece at the tail (length 4, role user, one text part)", msgs.length === 4 && msgs[3].role === "user" && Array.isArray(msgs[3].content) && msgs[3].content.length === 1 && msgs[3].content[0].type === "text", JSON.stringify(msgs[3] ?? null));
  const text = msgs[3]?.content?.[0]?.text ?? "";
  chk("S2 the piece text starts 'ctx: ' (DoD 2)", text.startsWith("ctx: "), JSON.stringify(text));
  // The pinned readout: the fixture mass 57000 of the name-marker window 120000
  // -> pct 47, REM 63000; the budget fixture -> " | 6 compactions left"; the
  // loop fixture -> " ITER=3 autorun-2026-01-01_00-00".
  const expected = `ctx: SESSION=${SID} CTX=57000 (47%) REM=63000 | 6 compactions left ITER=3 autorun-2026-01-01_00-00`;
  chk("S2 the text equals the gauge readout line + the suffixes (byte-exact)", text === expected, `got ${JSON.stringify(text)}`);
  chk("S3 cache pin: the 3 original entries byte-unchanged (untouched prefix)", JSON.stringify(d.messages.slice(0, 3)) === prefixBefore, "prefix mutated");
  chk("S3 system/options untouched", JSON.stringify(d.system) === JSON.stringify([{ type: "text", text: "the system part" }]) && JSON.stringify(d.options) === "{}");
  chk("S4 one evidence line for the posted fire (kind ctxmsg, session/agent/sess/line fields)", lines.length === 1 && lines[0].kind === "ctxmsg" && lines[0].session === SID && lines[0].agent === "worker-1" && lines[0].sess === SID && lines[0].line === text, JSON.stringify(lines[0] ?? null));
  chk("S4 the ctxmsg 'line' byte-equals the injected text", lines[0]?.line === text);
}

// ------------------------------------------------------------------ S5 the own-session gate (mismatch -> SILENT)

{
  const d = draft("ses_absent999999"); // NO session row in EITHER table
  const before = readLog().length;
  await fire(d);
  chk("S5 mismatch/absent session: NO injection (messages stay 3)", d.messages.length === 3, JSON.stringify(d.messages.map((m) => m.role)));
  chk("S5 mismatch/absent: NO log line (silence where silent)", readLog().length === before, `lines=${readLog().length - before}`);
}

// ------------------------------------------------------------------ S6 honest notAvailable POSTS (own session, no step)

{
  const d = draft(SID2);
  await fire(d);
  const msgs = d.messages;
  const text = msgs[3]?.content?.[0]?.text ?? "";
  // The suffixes ride the SAME steered stores as S2 (budget + loop fixtures
  // active) — the no-total readout form is `CTX=notAvailable` + the suffixes.
  const expected = `ctx: SESSION=${SID2} CTX=notAvailable | 6 compactions left ITER=3 autorun-2026-01-01_00-00`;
  chk("S6 no-total own-session read POSTS the honest notAvailable line (DoD 4)", msgs.length === 4 && text === expected, JSON.stringify(text));
  const lines = readLog();
  const cm = lines.filter((l) => l.kind === "ctxmsg" && l.session === SID2);
  chk("S6 one ctxmsg evidence line for the notAvailable post (sess = SID2, line = the posted text)", cm.length === 1 && cm[0].sess === SID2 && cm[0].line === expected, JSON.stringify(cm));
}

// ------------------------------------------------------------------ S7 db-error: NO injection + ONE evidence line

{
  gaugeMod.setBackends(["node:sqlite"]); // force the failing backend (deterministic)
  gaugeMod.setDbPath(path.join(SCRATCH, "no_dir", "missing.db"));
  const d = draft(SID);
  const before = readLog().length;
  await fire(d);
  const allS7 = readLog();
  const gs = allS7.slice(before); // scoped to THIS fire
  chk("S7 db-error: exactly ONE evidence line for the fire (DoD 5)", allS7.length - before === 1, `delta=${allS7.length - before}`);
  chk("S7 the gauge line: reason db-error + session + capped non-empty preview naming a backend", gs.length === 1 && gs[0].kind === "gauge" && gs[0].reason === "db-error" && gs[0].session === SID && typeof gs[0].preview === "string" && gs[0].preview.length > 0 && gs[0].preview.length <= 121 && /sqlite/.test(gs[0].preview), JSON.stringify(gs[0] ?? null));
  gaugeMod.setBackends(gaugeMod.DEFAULT_BACKENDS);
  gaugeMod.setDbPath(FX_DB);
}

// ------------------------------------------------------------------ S8 messages-not-array: ONE line, fail-closed

{
  const d = draft(SID);
  d.messages = "not-an-array"; // wire-defensive branch
  const before = readLog().length;
  await fire(d);
  const all = readLog();
  const gs = all.slice(before); // scoped to THIS fire (the whole-log gauge filter would double-count S7)
  chk("S8 messages-not-array: exactly ONE gauge line, reason messages-not-array", all.length - before === 1 && gs.length === 1 && gs[0].kind === "gauge" && gs[0].reason === "messages-not-array" && gs[0].session === SID, JSON.stringify(gs));
  chk("S8 messages-not-array: the wire value untouched (no throw)", d.messages === "not-an-array");
}

// ------------------------------------------------------------------ S9 suffix fail-open (missing budget + loop store)

{
  gaugeMod.setBudgetFileForTest(path.join(SCRATCH, "missing_budget.json"));
  gaugeMod.setLoopRootForTest(path.join(SCRATCH, "missing_loop"));
  const d = draft(SID);
  await fire(d);
  const text = d.messages[3]?.content?.[0]?.text ?? "";
  chk("S9 suffixes fail open: no budget suffix, no ITER suffix", text === `ctx: SESSION=${SID} CTX=57000 (47%) REM=63000`, JSON.stringify(text));
  gaugeMod.setBudgetFileForTest(BUDGET);
  gaugeMod.setLoopRootForTest(LOOPFX);
}

// ------------------------------------------------------------------ S10 singular budget form (count == cap -> the +1 emergency)

{
  const b2 = path.join(SCRATCH, "fx_budget2.json");
  writeFileSync(b2, JSON.stringify({ model_budget: { [MODEL_ID]: 1 }, sessions: { [SID]: { count: 1, model: MODEL_ID } } }), "utf8"); // emergency_budget ABSENT -> fail-open 1
  gaugeMod.setBudgetFileForTest(b2);
  const d = draft(SID);
  await fire(d);
  const text = d.messages[3]?.content?.[0]?.text ?? "";
  chk("S10 budget at cap: ' | 1 compaction left' (singular + the emergency +1)", text === `ctx: SESSION=${SID} CTX=57000 (47%) REM=63000 | 1 compaction left ITER=3 autorun-2026-01-01_00-00`, JSON.stringify(text));
  gaugeMod.setBudgetFileForTest(BUDGET);
}

// ------------------------------------------------------------------ 3b: the nudge ladder (DoD 1-3)

// The v2 tool event shapes (fork promise/tool.ts:38-63 — after: status +
// result|error; both carry tool/sessionID/agent/messageID/id/input).
function afterEvent(sessionID) {
  return {
    tool: "bash",
    sessionID,
    agent: "worker-1",
    messageID: "msg-e1",
    id: "call-e1",
    input: { command: "ls" },
    status: "completed",
    result: "ok",
  };
}

const fireAfter = async (event) => {
  await ctx._hooks["execute.after"](event);
  await Promise.resolve(); // land any fire-and-forget rejection in the log
};

// The five pinned rung readouts: fixture mass / name-marker window (60000 of
// 120000 -> (50%) REM 60000; the 80K legs below) + the budget caps (6 for the
// 120K rung model, 4 for the 80K). The nudge readout is the BARE formatGauge
// line — the Part 2 ITER suffix rides ONLY the 3a injected `ctx:` line (v1
// parity: the nudge carries the gauge readout, not the injected form).
const ITER_SFX = ""; // (no loop suffix on the nudge readout — kept as a reminder)
const R1_RO = `SESSION=ses_rung1 CTX=60000 (50%) REM=60000 | 6 compactions left${ITER_SFX}`;
const R2_RO = `SESSION=ses_rung2 CTX=50000 (62%) REM=30000 | 4 compactions left${ITER_SFX}`;
const R3_RO = `SESSION=ses_rung3 CTX=60000 (75%) REM=20000 | 4 compactions left${ITER_SFX}`;
const R4_RO = `SESSION=ses_rung4 CTX=70000 (87%) REM=10000 | 4 compactions left${ITER_SFX}`;
const R5_RO = `SESSION=ses_rung5 CTX=76000 (95%) REM=4000 | 4 compactions left${ITER_SFX}`;
const REJ_RO = `SESSION=ses_rej CTX=50000 (62%) REM=30000 | 4 compactions left${ITER_SFX}`;
// The v1 rung instruction texts VERBATIM (mirrored here to pin the delivery).
const RUNG_TXT = {
  1: "context watch: past 50% of the context window; gauge-check between steps and keep new work small.",
  2: "context high: wrap the current step, start the commit routine, begin the handover summary.",
  3: "wind-down, just before the stop line: run the commit routine now, write the handover summary + TODO.md, prep the NAP.",
  4: "CRITICAL: commit + write the handover summary NOW; do not start new work.",
  5: "stop line reached: further work needs planner approval (working past the line is a rule violation); write the handover summary and stop.",
};

// NB: below the first rung (pct 47, REM 63000) -> SILENT, no delivery.
{
  const before = readLog().length;
  const nBefore = SYNTH.calls.length;
  await fireAfter(afterEvent(SID));
  chk("NB below rung 1: no nudge line and no synthetic call (silence where silent)", readLog().length === before && SYNTH.calls.length === nBefore, `lines=${readLog().length - before}`);
}

// N1 rung 1: the pct >= 50 boundary (pct exactly 50; REM 60000 far from any
// REM leg) — ONE kind:nudge line {session, rung, readout} + ONE queued
// delivery (DoD 2: delivery:"queue", text carries the readout).
{
  const before = readLog().length;
  await fireAfter(afterEvent("ses_rung1"));
  const delta = readLog().slice(before);
  chk("N1 rung 1 fires: exactly ONE kind:nudge line, rung '1', readout byte-exact", delta.length === 1 && delta[0].kind === "nudge" && delta[0].session === "ses_rung1" && delta[0].rung === "1" && delta[0].readout === R1_RO, JSON.stringify(delta[0] ?? null));
  const sc = SYNTH.calls.filter((c) => c.sessionID === "ses_rung1");
  chk("N1 delivery: ONE synthetic call {delivery 'queue', text = readout + the rung-1 text VERBATIM}", sc.length === 1 && sc[0].delivery === "queue" && sc[0].text === `${R1_RO} — ${RUNG_TXT[1]}`, JSON.stringify(sc[0] ?? null));
}

// N2 rung 2 via the REM <= 30000 boundary (pct 62 < 70 — the REM leg alone
// decides), rung 3 via REM=20000 (pct 75), rung 4 via REM=10000 (pct 87):
// the OR-condition legs each fire on their own boundary.
{
  const before = readLog().length;
  await fireAfter(afterEvent("ses_rung2"));
  await fireAfter(afterEvent("ses_rung3"));
  await fireAfter(afterEvent("ses_rung4"));
  const delta = readLog().slice(before);
  chk("N2 rung 2 fires at REM=30000 (pct 62): rung '2', readout byte-exact", delta.length === 3 && delta[0].kind === "nudge" && delta[0].rung === "2" && delta[0].readout === R2_RO, JSON.stringify(delta[0] ?? null));
  chk("N3 rung 3 (wind-down) fires at REM=20000 (pct 75): rung '3' + the text delivered", delta[1]?.rung === "3" && delta[1]?.readout === R3_RO && SYNTH.calls.some((c) => c.sessionID === "ses_rung3" && c.delivery === "queue" && c.text === `${R3_RO} — ${RUNG_TXT[3]}`), JSON.stringify(delta[1] ?? null));
  chk("N4 rung 4 (commit+NAP-now) fires at REM=10000 (pct 87): rung '4' + the text delivered", delta[2]?.rung === "4" && delta[2]?.readout === R4_RO && SYNTH.calls.some((c) => c.sessionID === "ses_rung4" && c.delivery === "queue" && c.text === `${R4_RO} — ${RUNG_TXT[4]}`), JSON.stringify(delta[2] ?? null));
}

// N5 rung 5: REM 4000 (< 5000) with EVERY lower leg also true -> the HIGHEST
// rung met fires, exactly ONE nudge for the session (rung 5), the VERBATIM
// readout + the "stop line reached" phrasing.
{
  const before = readLog().length;
  await fireAfter(afterEvent("ses_rung5"));
  const delta = readLog().slice(before);
  const sc = SYNTH.calls.filter((c) => c.sessionID === "ses_rung5");
  chk("N5 highest-rung rule: ONE line for ses_rung5, rung '5', readout byte-exact", delta.length === 1 && delta[0].kind === "nudge" && delta[0].rung === "5" && delta[0].readout === R5_RO, JSON.stringify(delta[0] ?? null));
  chk("N5 rung-5 delivery: VERBATIM readout + stop-line phrasing, one queued call", sc.length === 1 && sc[0].delivery === "queue" && sc[0].text === `${R5_RO} — ${RUNG_TXT[5]}`, JSON.stringify(sc[0] ?? null));
}

// N6 dedup: re-firing the SAME rung for a session (already fired) -> NO new
// line, NO new call (the in-memory map keyed by session id).
{
  const before = readLog().length;
  const nBefore = SYNTH.calls.length;
  await fireAfter(afterEvent("ses_rung1"));
  await fireAfter(afterEvent("ses_rung5"));
  chk("N6 per-rung dedup: second fire same rung -> no line, no synthetic call", readLog().length === before && SYNTH.calls.length === nBefore, `lines=${readLog().length - before} calls=${SYNTH.calls.length - nBefore}`);
}

// N7 silence channels: an unknown-window (no-total) read and a db-error read
// NEVER fire — and ride NO gauge line on this channel (the §(4) gauge failure
// vocabulary belongs to the context hook; v1: no NEW gauge-failure reasons).
{
  const before = readLog().length;
  await fireAfter(afterEvent(SID2)); // no-total (session row, no step rows)
  gaugeMod.setBackends(["node:sqlite"]);
  gaugeMod.setDbPath(path.join(SCRATCH, "no_dir", "missing.db"));
  await fireAfter(afterEvent(SID)); // db-error read
  gaugeMod.setBackends(gaugeMod.DEFAULT_BACKENDS);
  gaugeMod.setDbPath(FX_DB);
  chk("N7 no-total + db-error after-fires: ZERO new log lines, no synthetic call", readLog().length === before && SYNTH.calls.every((c) => c.sessionID !== SID && c.sessionID !== SID2), `delta=${readLog().length - before}`);
}

// N8 delivery failure channels (DoD 2): a REJECTION and a SYNC THROW from the
// synthetic call are evidence-logged (kind "nudge", reason delivery-*) and
// NEVER fail the tool call — the awaited after-hook fire returns normally.
{
  SYNTH.mode = "reject";
  const before = readLog().length;
  let threw = false;
  try {
    await fireAfter(afterEvent("ses_rej"));
  } catch {
    threw = true;
  }
  const delta = readLog().slice(before);
  chk("N8 rejection: the awaited tool fire is NOT failed (handler returns normally)", !threw, "handler threw");
  chk("N8 rejection: fire line (rung '2') + ONE delivery-rejected line naming the mock error", delta.length === 2 && delta[0].kind === "nudge" && delta[0].session === "ses_rej" && delta[0].rung === "2" && delta[0].readout === REJ_RO && delta[1].kind === "nudge" && delta[1].reason === "delivery-rejected" && delta[1].rung === "2" && typeof delta[1].preview === "string" && /mock delivery rejection/.test(delta[1].preview), JSON.stringify(delta));
  SYNTH.mode = "throw";
  const before2 = readLog().length;
  let threw2 = false;
  try {
    await fireAfter(afterEvent("ses_throw"));
  } catch {
    threw2 = true;
  }
  const delta2 = readLog().slice(before2);
  chk("N8 sync-throw: fire returns normally + fire line + ONE delivery-threw line", !threw2 && delta2.length === 2 && delta2[0].kind === "nudge" && delta2[0].rung === "2" && delta2[0].readout === REJ_RO.replace("ses_rej", "ses_throw") && delta2[1].kind === "nudge" && delta2[1].reason === "delivery-threw" && /mock delivery sync throw/.test(String(delta2[1].preview)), JSON.stringify(delta2));
  SYNTH.mode = "ok";
}

// ------------------------------------------------------------------ 3b: the handover pre-flight (DoD 4)

// The v2 delegation tool is `subagent` (v1 `task` renamed); the before event's
// INPUT is MUTABLE — the pre-flight NEVER mutates it, NEVER throws.
function beforeEvent(input, tool = "subagent", id = "call-e2") {
  return { tool, sessionID: SID, agent: "planner-1", messageID: "msg-e2", id, input };
}

const fireBefore = async (event) => {
  await ctx._hooks["execute.before"](event);
};

const SPEC_F = path.join(WS, "agent", "handover", "handover_task.md"); // the WS repo root's spec file
const HANDOVER_PROMPT = "Read and follow the committed task spec at agent/handover/handover_task.md (TODO #137 unit 3b).";

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
  chk("INV all lines parse as JSON; kinds ONLY {ctxmsg, gauge, nudge, handover-preflight}", kinds.size === 4 && [...kinds].sort().join(",") === "ctxmsg,gauge,handover-preflight,nudge", JSON.stringify([...kinds]));
  chk("INV field shapes per kind: ctxmsg session/agent/sess/line; gauge reason {db-error, messages-not-array} + session; nudge session + rung + (readout | delivery-* reason + preview); handover-preflight reason + session", lines.every((l) => typeof l.ts === "string" && typeof l.kind === "string" && (l.kind === "ctxmsg" ? typeof l.session === "string" && typeof l.sess === "string" && typeof l.line === "string" : l.kind === "gauge" ? (l.reason === "db-error" || l.reason === "messages-not-array") && typeof l.session === "string" : l.kind === "nudge" ? typeof l.session === "string" && typeof l.rung === "string" && (typeof l.readout === "string" || ((l.reason === "delivery-rejected" || l.reason === "delivery-threw") && typeof l.preview === "string")) : l.kind === "handover-preflight" ? l.reason === "handover-task-file-missing-or-empty" && typeof l.session === "string" : false)), JSON.stringify(lines.filter((l) => !(l.kind === "ctxmsg" || l.reason)).map((l) => l.kind + ":" + (l.rung ?? l.reason ?? "")).slice(0, 6)));
  chk("INV no line exceeds the LINE_CAP ladder (2000 chars)", lines.every((l) => JSON.stringify(l).length <= 2000));
  chk("INV the ctxmsg `sess` always EQUALS its `session` (own-session gate: only own reads post)", lines.filter((l) => l.kind === "ctxmsg").every((l) => l.sess === l.session));
  chk("INV every nudge line's session is one of the rung fixtures (per-session reads targeted the event's own id)", lines.filter((l) => l.kind === "nudge").every((l) => /^ses_(rung\d|rej|throw)$/.test(l.session)));
  console.log(`\nlog lines: ${lines.length}`);
}

await cleanup();
chk("S11 cleanup disposes ALL registered hooks (context + execute.before + execute.after)", ctx._hooks["context"] === undefined && ctx._hooks["execute.before"] === undefined && ctx._hooks["execute.after"] === undefined, JSON.stringify(Object.keys(ctx._hooks)));
console.log(failures === 0 ? "\nSMOKE: ALL PASS" : `\nSMOKE: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);