// context_family.smoke.mjs — TODO #137 unit 3a: the v2 context-family plugin
// smoke. bun, MOCK ctx — no opencode process. Pins the DoD 2-5 contract of
// `.opencode/plugins/context_family.ts` (the ctx: line injection at the
// `session.context` hook + the own-session gate + the evidence log) and
// DoD 3's cache pin (the untouched prefix byte-compares).
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
  db.close();
}
const SID2 = "ses_ctxsmoke002";

// The budget store fixture: cap 6 for the model, count 0 for SID -> " | 6
// compactions left". (emergency at 1 by default; count < cap -> no +1.)
const BUDGET = path.join(SCRATCH, "fx_budget.json");
{
  rmSync(BUDGET, { force: true });
  const rec = { model_budget: { [MODEL_ID]: 6 }, sessions: { [SID]: { count: 0, model: MODEL_ID } }, emergency_budget: 1 };
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

function makeCtx(directory) {
  const hooks = {};
  return {
    location: { directory },
    session: {
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
chk("S1 setup registers the 'context' hook and returns a cleanup", typeof ctx._hooks["context"] === "function" && typeof cleanup === "function");

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

// ------------------------------------------------------------------ whole-log invariants

{
  const lines = readLog();
  const kinds = new Set(lines.map((l) => l.kind));
  chk("INV all lines parse as JSON; kinds ONLY {ctxmsg, gauge}", kinds.size === 2 && [...kinds].sort().join(",") === "ctxmsg,gauge", JSON.stringify([...kinds]));
  chk("INV every line has ts + kind; every ctxmsg has session/agent/sess/line; every gauge has reason in {db-error, messages-not-array}", lines.every((l) => typeof l.ts === "string" && typeof l.kind === "string" && (l.kind === "ctxmsg" ? typeof l.session === "string" && typeof l.sess === "string" && typeof l.line === "string" : (l.reason === "db-error" || l.reason === "messages-not-array") && typeof l.session === "string")), JSON.stringify(lines.filter((l) => !(l.kind === "ctxmsg" || l.reason)).map((l) => l.kind + ":" + (l.reason ?? ""))));
  chk("INV no line exceeds the LINE_CAP ladder (2000 chars)", lines.every((l) => JSON.stringify(l).length <= 2000));
  chk("INV the ctxmsg `sess` always EQUALS its `session` (own-session gate: only own reads post)", lines.filter((l) => l.kind === "ctxmsg").every((l) => l.sess === l.session));
  console.log(`\nlog lines: ${lines.length}`);
}

await cleanup();
chk("S11 cleanup disposes the registered hook", ctx._hooks["context"] === undefined, typeof ctx._hooks["context"]);
console.log(failures === 0 ? "\nSMOKE: ALL PASS" : `\nSMOKE: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);