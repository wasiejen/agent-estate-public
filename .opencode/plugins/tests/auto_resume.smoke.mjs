// auto_resume.smoke.mjs — TODO #137 order 2: the v2 auto-resume plugin smoke.
// bun, MOCK ctx — no opencode process, NO backend request. Pins every leg of
// `.opencode/plugins/auto_resume.ts`: the loader shape + the `context` hook
// registration, the UNIT 1 event log (byte-shape lines, the NEVER-logged delta
// classes, the `surface=` probe, the #96 log TRIM), the #90 part-C RESTORE (the
// pair lines surviving the trim), the UNIT 3 trigger spawn (the create input
// shape with title/agent/model, the QUEUED prompt, the counter + `ident=`, the
// failure lanes + the consume-even-on-failure rule), the UNIT 4 routing (stop/
// ask/continue/resume-no-op/recovery-cap/restart/dead-mark/deactivation/
// injected-busy), the
// #159 STEP-event ARM SOURCE (busy from `session.step.started`, idle from a
// terminal `session.step.ended` finish, NO idle from tool-calls/unknown/
// missing, the no-double-route, the old status legs still working), the #109
// detector (each clause + the fire + the `loop_log.md` -WARNING line +
// the latch), the budget-exhausted directive forms, the #178 DURABLE MODE
// STORE (toggle -> store write, sticky DIRECT across markerless follow-ups
// with NO wake, the `<|autonom|>` re-arm, and the RESTART simulation — fresh
// setup + existing store = DIRECT at watch creation), and the fail-open
// discipline.
//
// Fixtures and BOTH logs (auto_resume.log + the shared ctx.log) + the #178
// store (`session_mode.json`) live in
// home/AppData/Local/Temp/opencode/auto-resume-smoke-v2 (recreated
// every run) — the LIVE DB and the LIVE temp estate are NEVER touched. The
// store path derives from `ctx.location.directory` (the mock WS root), so the
// same scratch steering that carries the budget fixture carries the store.
// Run: bun run auto_resume.smoke.mjs (this dir). Expected final line:
// `SMOKE: ALL PASS`.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRATCH = "home/AppData/Local/Temp/opencode/auto-resume-smoke-v2";
const WS = path.join(SCRATCH, "ws"); // the mock workspace (ctx.location.directory)
// The repo root this suite lives in (`.opencode/plugins/tests` -> up 3). Resolved
// from the file so the suite runs in whatever checkout owns the tests dir — the
// old absolute archived-clone path no longer exists on this machine (TODO #156,
// 2026-10-26).
const CLONE_ROOT = path.join(import.meta.dirname, "..", "..", "..");
const PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "auto_resume.ts");
const TEMP = path.join(WS, ".opencode", "temp");
const LOG = path.join(TEMP, "auto_resume.log");
const CTXLOG = path.join(TEMP, "ctx.log");
const TRIGGER = path.join(TEMP, "auto_resume_spawn_trigger");
const MODE = path.join(TEMP, "session_mode.json"); // #178 durable store (scratch-steered)
const LOOPROOT = path.join(WS, "loop", "autorun-T");

let failures = 0;
function chk(label, ok, detail = "") {
  if (ok) console.log(`PASS  ${label}`);
  else {
    failures++;
    console.log(`FAIL  ${label}${detail ? "  [" + detail + "]" : ""}`);
  }
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function readLog() {
  if (!existsSync(LOG)) return [];
  return readFileSync(LOG, "utf8").split("\n").filter((l) => l !== "");
}
function has(substr) {
  return readLog().some((l) => l.includes(substr));
}
function countOf(substr) {
  return readLog().filter((l) => l.includes(substr)).length;
}
function scopeLines(sid) {
  return readLog().filter((l) => l.includes("scope=") && l.includes(`sid=${sid}`));
}
function readModeStore() {
  if (!existsSync(MODE)) return {};
  return JSON.parse(readFileSync(MODE, "utf8"));
}
function lastLine() {
  const l = readLog();
  return l.length ? l[l.length - 1] : "";
}

// ------------------------------------------------------------------ fixtures (PRE-setup: the trim + restore pins need them)

rmSync(SCRATCH, { recursive: true, force: true });
mkdirSync(TEMP, { recursive: true });
mkdirSync(LOOPROOT, { recursive: true });

// The pre-existing log: filler lines (the trim cuts them) + the #90 part-C PAIR
// at the TAIL (route= restart spawn sid=ses_par + spawn= sid=ses_child) ->
// after the init trim the restore must see the pair.
{
  const fill = Array.from({ length: 120 }, (_, i) => `2026-10-21T00:00:00.000Z event=session.updated sid=ses_fill_${i}`);
  const pair = ["2026-10-21T00:00:01.000Z route= restart spawn sid=ses_par", "2026-10-21T00:00:02.000Z spawn= sid=ses_child"];
  writeFileSync(LOG, [...fill, ...pair].join("\n") + "\n", "utf8");
}
const PRE_LOG_BYTES = statSync(LOG).size;

// The loop folder carries `planner-7` -> the counter must out-rank the log.
writeFileSync(path.join(LOOPROOT, "loop_log.md"), "2026-10-21_00-00 -->START planner-7 ses_old llama-swap/x\n", "utf8");

// The budget fixture (the budgetExhausted forms): LISTED cap 3 (count==cap ->
// NOT exhausted), ses_exh 4/3 (exhausted), cpu entry (cap 0 -> exhausted).
const LISTED = "smoke-budget-model";
writeFileSync(path.join(TEMP, "compact_budget.json"), JSON.stringify({
  model_budget: { [LISTED]: 3, default: 2 },
  sessions: {
    ses_bud_ok: { count: 3, model: LISTED },
    ses_bud_exh: { count: 4, model: LISTED },
    ses_bud_cpu: { count: 5, model: "cpu-llama-denied" },
  },
}), "utf8");

// ------------------------------------------------------------------ the mock ctx

const CREATE = { calls: [], mode: "ok", seq: 0 }; // ok | throw | no-id | missing
const PROMPT = { calls: [], mode: "ok" }; // ok | reject | missing
const HOOKS = {};
const STREAM = { events: [], waiters: [] };
function pushEvent(ev) {
  STREAM.events.push(ev);
  const w = STREAM.waiters.shift();
  if (w) w();
}
function userMsg(text) {
  return { role: "user", content: [{ type: "text", text }] };
}
function asstMsg(text) {
  return { role: "assistant", content: [{ type: "text", text }] };
}

function makeSession() {
  const api = {
    hook: async (name, cb) => {
      HOOKS[name] = cb;
      return { dispose: async () => delete HOOKS[name] };
    },
    get: (input) => Promise.resolve({ id: input.sessionID }),
    create: (input) => {
      CREATE.calls.push(input);
      if (CREATE.mode === "missing") throw new Error("__never__");
      if (CREATE.mode === "throw") return Promise.reject(new Error("mock create boom"));
      if (CREATE.mode === "noid") return Promise.resolve({ title: "no id here" });
      CREATE.seq += 1;
      return Promise.resolve({ id: `ses_new${CREATE.seq}`, title: input?.title });
    },
    prompt: (input) => {
      PROMPT.calls.push(input);
      if (PROMPT.mode === "reject") return Promise.reject(new Error("mock queue rejection"));
      return Promise.resolve({ id: `inbox_${PROMPT.calls.length}` });
    },
  };
  if (CREATE.mode === "missing") delete api.create;
  if (PROMPT.mode === "missing") delete api.prompt;
  return api;
}

let SESSION_API = null; // the LIVE mock object the plugin captured at setup
function makeCtx() {
  const api = makeSession();
  SESSION_API = api;
  return {
    location: { directory: WS },
    app: { name: "opencode", version: "2", channel: "smoke" },
    session: api,
    event: {
      subscribe: () =>
        (async function* () {
          while (true) {
            if (STREAM.events.length === 0) await new Promise((res) => STREAM.waiters.push(res));
            else yield STREAM.events.shift();
          }
        })(),
    },
    options: { tickMs: 1_000_000, maxLogBytes: 2048, logTailBytes: 512, limitStopIdleMs: 60 },
  };
}

const mod = await import(pathToFileURL(PLUGIN).href);
const plugin = mod.default;
chk("S0 the default export is the loader shape {id:'auto_resume', setup}",
  plugin && typeof plugin === "object" && plugin.id === "auto_resume" && typeof plugin.setup === "function",
  JSON.stringify(Object.keys(plugin ?? {})));
chk("S0 the smoke levers are exported (runTick, trimLogIfNeeded, actionFromText, scopeVerdict)",
  typeof mod.runTick === "function" && typeof mod.trimLogIfNeeded === "function" && typeof mod.actionFromText === "function" && typeof mod.scopeVerdict === "function");

const cleanup = await plugin.setup(makeCtx());
await sleep(10);
chk("S1 setup registers the `context` hook, consumes the event stream, returns a cleanup",
  typeof HOOKS["context"] === "function" && typeof cleanup === "function");

// ------------------------------------------------------------------ S2 UNIT 1: trim + surface + arm lines

chk("S2 the init TRIM cut the filler and logged `log-trim= old=<pre> new=512` (before the surface line)",
  readLog().some((l) => l.includes(`log-trim= old=${PRE_LOG_BYTES} new=512`)) && !readLog().some((l) => l.includes("ses_fill_0")));
chk("S2 the trim kept the #90 PAIR at the tail (the restore sees it)",
  readLog().some((l) => l.includes("route= restart spawn sid=ses_par")) && readLog().some((l) => l.includes("spawn= sid=ses_child")));
chk("S2 the `surface=` line: v=<sha8> + the v2 candidate typeofs + event.subscribe + app.name",
  readLog().some((l) => /surface= v=[0-9a-f]{8} .*create=function .*prompt=function .*hook=function .*event\.subscribe=function app\.name=string/.test(l)),
  readLog().find((l) => l.includes("surface=")) ?? "(none)");

pushEvent({ type: "session.status", data: { sessionID: "ses_ev1", status: { type: "busy" } } });
pushEvent({ type: "session.text.delta", data: { sessionID: "ses_ev1", text: "token token token" } });
pushEvent({ type: "session.created", data: { sessionID: "ses_ev2", agent: "planner_FlashNext", model: { id: "smoke-model-8K", providerID: "llama-swap" } } });
await sleep(25);
chk("S2 the event line shape `<ISO> event=<type> sid=<sid> <key fields>` (status key field)",
  readLog().some((l) => /^\S+Z? event=session\.status sid=ses_ev1 status=busy$/.test(l) || l.includes("event=session.status sid=ses_ev1 status=busy")));
chk("S2 the delta class NEVER logged (#96 analogue): NO `event=session.text.delta` line",
  !readLog().some((l) => l.includes("event=session.text.delta")));
chk("S2 `arm= sid=ses_ev1` (busy arms the watch) + the session.created agent key field",
  has("arm= sid=ses_ev1") && has("event=session.created sid=ses_ev2 agent=planner_FlashNext"));

// ------------------------------------------------------------------ S3 UNIT 3: the trigger spawn

writeFileSync(TRIGGER, "start planner prompt\n", "utf8");
await mod.runTick();
await sleep(15);
const spawnCall = CREATE.calls[0];
chk("S3 the trigger spawn: ONE create with the FLAT ident title only (a file-trigger spawn carries NO identity)",
  CREATE.calls.length === 1 && spawnCall?.title === "autorun-T planner-8" && spawnCall?.agent === undefined && spawnCall?.model === undefined,
  JSON.stringify(spawnCall ?? null));
chk("S3 ONE QUEUED prompt (`delivery:'queue'`) with the trimmed trigger text on the new sid",
  PROMPT.calls[0]?.delivery === "queue" && PROMPT.calls[0]?.text === "start planner prompt" && PROMPT.calls[0]?.sessionID === "ses_new1",
  JSON.stringify(PROMPT.calls[0] ?? null));
chk("S3 `spawn= sid=ses_new1 ident=autorun-T planner-8` (the ident bit rides the counter)",
  has("spawn= sid=ses_new1 ident=autorun-T planner-8"));
chk("S3 the counter written: loop/autorun-T/counter.json n=8 (logMax 7 + 1 beat the absent candidate)",
  (() => {
    const d = JSON.parse(readFileSync(path.join(LOOPROOT, "counter.json"), "utf8"));
    return d.looprun === "autorun-T" && d.n === 8;
  })());
chk("S3 #171 the ROUND key on the FIRST spawn (absent counter -> base 0 -> round 1)",
  (() => {
    const d = JSON.parse(readFileSync(path.join(LOOPROOT, "counter.json"), "utf8"));
    return d.round === 1;
  })());
chk("S3 the trigger consumed by rename (even on success): the .consumed file exists, the trigger is gone",
  existsSync(`${TRIGGER}.consumed`) && !existsSync(TRIGGER));

writeFileSync(TRIGGER, "", "utf8");
await mod.runTick();
chk("S3 an EMPTY trigger -> `spawn-fail= empty trigger` + consumed", has("spawn-fail= empty trigger") && !existsSync(TRIGGER));

// the failure lanes (the LIVE mock object is mutated — the plugin holds the
// same reference it captured at setup)
const savedCreate = SESSION_API.create;
const savedPrompt = SESSION_API.prompt;
delete SESSION_API.create;
writeFileSync(TRIGGER, "second\n", "utf8");
await mod.runTick();
chk("S3 create-missing lane: `spawn-fail= create missing`, NO create call, the trigger STILL consumed",
  has("spawn-fail= create missing") && !existsSync(TRIGGER));
SESSION_API.create = savedCreate;
CREATE.mode = "throw";
writeFileSync(TRIGGER, "third\n", "utf8");
await mod.runTick();
chk("S3 a create REJECTION -> `spawn-fail= create: mock create boom`, NO successor spawn line for it",
  has("spawn-fail= create: mock create boom"));
CREATE.mode = "noid";
writeFileSync(TRIGGER, "fourth\n", "utf8");
await mod.runTick();
chk("S3 a create with NO id -> `spawn-fail= create no id`", has("spawn-fail= create no id"));
CREATE.mode = "ok";
delete SESSION_API.prompt;
writeFileSync(TRIGGER, "fifth\n", "utf8");
await mod.runTick();
chk("S3 a prompt MISSING leg -> `spawn-fail= prompt missing` (the created session is NOT prompted)", has("spawn-fail= prompt missing"));
SESSION_API.prompt = savedPrompt;
PROMPT.mode = "reject";
writeFileSync(TRIGGER, "sixth\n", "utf8");
await mod.runTick();
PROMPT.mode = "ok";
chk("S3 the queued-prompt REJECTION lane -> `spawn-fail= prompt: mock queue rejection`",
  has("spawn-fail= prompt: mock queue rejection"));
chk("S3 a FAILED trigger never re-fires: the trigger file is GONE after every leg (the single `.consumed` tombstone name is overwritten — v1 semantics)",
  !existsSync(TRIGGER) && existsSync(`${TRIGGER}.consumed`));

// ------------------------------------------------------------------ S3r #171 the ROUND spawn leg (2026-10-26)
// round_final = max(existing round ?? 0, existing n ?? 0) + 1 — the migration
// seed (legacy {looprun,n} file) and the round-keyed increment.

{
  writeFileSync(path.join(LOOPROOT, "counter.json"), JSON.stringify({ looprun: "autorun-T", n: 36 }), "utf8");
  writeFileSync(TRIGGER, "round migration\n", "utf8");
  await mod.runTick();
  await sleep(15);
  const d = JSON.parse(readFileSync(path.join(LOOPROOT, "counter.json"), "utf8"));
  chk("S3r #171 migration: legacy {looprun,n:36} (NO round) -> next spawn round=37 (n=37 too)",
    d.n === 37 && d.round === 37, JSON.stringify(d));
  writeFileSync(path.join(LOOPROOT, "counter.json"), JSON.stringify({ looprun: "autorun-T", n: 36, round: 37 }), "utf8");
  writeFileSync(TRIGGER, "round increment\n", "utf8");
  await mod.runTick();
  await sleep(15);
  const d2 = JSON.parse(readFileSync(path.join(LOOPROOT, "counter.json"), "utf8"));
  chk("S3r #171 increment: {n:36,round:37} -> next spawn round=38 (max(round,n)+1)",
    d2.n === 37 && d2.round === 38, JSON.stringify(d2));
}

// ------------------------------------------------------------------ S4 UNIT 4: the routing legs

async function armOnScoped(sid, extraUserMsgs = []) {
  // the context hook (DEVIATION (a) carrier): the own-line ON toggle + the agent
  await HOOKS["context"]({ sessionID: sid, agent: "planner_FlashNext", messages: [userMsg("<|autonom|>"), ...extraUserMsgs] });
  pushEvent({ type: "session.status", data: { sessionID: sid, status: { type: "busy" } } });
  await sleep(20);
}

await armOnScoped("ses_r_stop");
pushEvent({ type: "session.status", data: { sessionID: "ses_r_stop", status: { type: "idle" } } });
pushEvent({ type: "session.text.ended", data: { sessionID: "ses_r_stop", assistantMessageID: "m1", ordinal: 0, text: "closed.\naction: stop" } });
await sleep(20);
await mod.runTick();
chk("S4 `route= stop sid=ses_r_stop` and NO send (the action state machine left alone)",
  has("route= stop sid=ses_r_stop") && !PROMPT.calls.some((c) => c.sessionID === "ses_r_stop") && has("scope= autorun sid=ses_r_stop"));

await armOnScoped("ses_r_ask");
pushEvent({ type: "session.status", data: { sessionID: "ses_r_ask", status: { type: "idle" } } });
pushEvent({ type: "session.text.ended", data: { sessionID: "ses_r_ask", assistantMessageID: "m2", ordinal: 0, text: "waiting on the maintainer.\naction: ask_maintainer" } });
await sleep(20);
await mod.runTick();
chk("S4 `route= ask sid=ses_r_ask` and NO send", has("route= ask sid=ses_r_ask") && !PROMPT.calls.some((c) => c.sessionID === "ses_r_ask"));

// #170 ruling: `action: resume` is a logged NO-OP — no task_id vehicle exists
// yet, so it must NOT self-wake the session and NOT consume the recovery budget.
// (The `arm= … injected` pin that rode this leg moved to the continue leg below:
// the resume no-op sends nothing, so nothing injects.)
await armOnScoped("ses_r_resume");
pushEvent({ type: "session.status", data: { sessionID: "ses_r_resume", status: { type: "idle" } } });
pushEvent({ type: "session.text.ended", data: { sessionID: "ses_r_resume", assistantMessageID: "m3", ordinal: 0, text: "keep going\naction: resume" } });
await sleep(20);
await mod.runTick();
chk("S4 #170 `action: resume` -> NO-OP: `note= resume-unimplemented sid=ses_r_resume`, NO prompt call, NO recovery line",
  has("note= resume-unimplemented sid=ses_r_resume") &&
  !PROMPT.calls.some((c) => c.sessionID === "ses_r_resume") &&
  !has("recovery= sid=ses_r_resume"));

// #170: `action: continue` -> the SAME session wakes with the short continuation
// text (not the #167 rebuild flavor), logs `route= continue`, and consumes NO
// `MAX_RECOVERY_ATTEMPTS` budget. The injected-busy #80 semantics ride it.
await armOnScoped("ses_r_continue");
pushEvent({ type: "session.status", data: { sessionID: "ses_r_continue", status: { type: "idle" } } });
pushEvent({ type: "session.text.ended", data: { sessionID: "ses_r_continue", assistantMessageID: "m4", ordinal: 0, text: "healthy, keep going\naction: continue" } });
await sleep(20);
await mod.runTick();
const contSend = PROMPT.calls.filter((c) => c.sessionID === "ses_r_continue");
chk("S4 #170(a) `action: continue` -> `route= continue sid=ses_r_continue` + ONE QUEUED send to the SAME sid (NO recovery line)",
  has("route= continue sid=ses_r_continue") && contSend.length === 1 && contSend[0].delivery === "queue" &&
  contSend[0].text.startsWith(`[auto-resume unit 4 — planner liveness watchdog, session ses_r_continue]`) &&
  !has("recovery= sid=ses_r_continue"));
chk("S4 #170(a) the continuation text acknowledges the intentional `action: continue` and carries NO post-compaction ritual",
  contSend.length === 1 && contSend[0].text.includes("action: continue") &&
  !contSend[0].text.includes("readme_post_compaction") && !contSend[0].text.includes("compaction"));
pushEvent({ type: "session.status", data: { sessionID: "ses_r_continue", status: { type: "busy" } } });
await sleep(20);
chk("S4 the injection's busy is NOT a fresh cycle (#80 cap semantics): `arm= sid=ses_r_continue injected`",
  has("arm= sid=ses_r_continue injected"));
// #170(b) the budget exemption: the NEXT idle with NO action line must still get
// attempt=1 — the continue cycle consumed no budget.
pushEvent({ type: "session.text.ended", data: { sessionID: "ses_r_continue", assistantMessageID: "m5", ordinal: 0, text: "mid-unit, no line yet" } });
pushEvent({ type: "session.status", data: { sessionID: "ses_r_continue", status: { type: "idle" } } });
await sleep(20);
await mod.runTick();
chk("S4 #170(b) budget exemption: a following null-action idle still gets `recovery= sid=ses_r_continue attempt=1`",
  has("recovery= sid=ses_r_continue attempt=1") && !has("recovery= sid=ses_r_continue attempt=2"));

// #167: the cause-sensitive continue text — the SAME predicate as the #109
// clause-(4) skip. (a) a NEW ctx.log COMPACT line for the watched sid (the
// #98 re-arm tail stamps `lastCompactAt` in the SAME tick) -> the compaction
// flavor; (b) no COMPACT line -> the plain flavor.
await armOnScoped("ses_r_cause_c");
writeFileSync(CTXLOG, "2026-10-26_00-00 [smoke-model] COMPACT ses_r_cause_c keep=12m tok=40000 budget #167 cause fixture\n", "utf8");
pushEvent({ type: "session.status", data: { sessionID: "ses_r_cause_c", status: { type: "idle" } } });
await sleep(20);
await mod.runTick();
const compactSend = PROMPT.calls.find((c) => c.sessionID === "ses_r_cause_c");
chk("S4 #167 (a) a fresh COMPACT-line watch state -> `recovery= … cause= compact` + the compaction-flavored text (the readme pointer)",
  has("recovery= sid=ses_r_cause_c attempt=1 cause= compact") &&
  compactSend?.delivery === "queue" && compactSend !== undefined &&
  compactSend.text.startsWith(`[auto-resume unit 4 — planner liveness watchdog, session ses_r_cause_c]`) &&
  compactSend.text.includes("readme_post_compaction") && compactSend.text.includes("cause= compact"));

await armOnScoped("ses_r_cause_i");
pushEvent({ type: "session.status", data: { sessionID: "ses_r_cause_i", status: { type: "idle" } } });
await sleep(20);
await mod.runTick();
const idleSend = PROMPT.calls.find((c) => c.sessionID === "ses_r_cause_i");
chk("S4 #167 (b) a no-compact watch state -> `recovery= … cause= idle` + the plain text (NO compaction / readme_post_compaction words)",
  has("recovery= sid=ses_r_cause_i attempt=1 cause= idle") &&
  idleSend?.delivery === "queue" && idleSend !== undefined &&
  idleSend.text.startsWith(`[auto-resume unit 4 — planner liveness watchdog, session ses_r_cause_i]`) &&
  !idleSend.text.includes("compaction") && !idleSend.text.includes("readme_post_compaction"));

// the no-line recovery budget -> the restart branch
await armOnScoped("ses_r_noline");
pushEvent({ type: "session.model.selected", data: { sessionID: "ses_r_noline", model: { id: "smoke-model-8K", providerID: "llama-swap" } } });
for (let i = 0; i < 3; i += 1) {
  pushEvent({ type: "session.status", data: { sessionID: "ses_r_noline", status: { type: "idle" } } });
  await sleep(20);
  await mod.runTick();
}
chk("S4 the no-line recovery budget: attempt=1, attempt=2, then the RESTART route",
  has("recovery= sid=ses_r_noline attempt=1") && has("recovery= sid=ses_r_noline attempt=2") && has("route= restart spawn sid=ses_r_noline"));
const identityCall = CREATE.calls.find((c) => c.agent === "planner_FlashNext" && c.model && c.model.id === "smoke-model-8K" && /autorun-T planner-\d+/.test(c.title ?? ""));
chk("S3/S4 the restart spawn create carries the fire-time identity (agent + model{providerID,id}) + the ident title",
  !!identityCall, JSON.stringify(CREATE.calls.map((c) => Object.keys(c))));
chk("S4 `spawn= ... agent=planner_FlashNext model=llama-swap/smoke-model-8K ident=autorun-T planner-<n>` + `deactivate= sid=ses_r_noline`",
  readLog().some((l) => /spawn= sid=\S+ agent=planner_FlashNext model=llama-swap\/smoke-model-8K ident=autorun-T planner-\d+/.test(l)) && has("deactivate= sid=ses_r_noline"));
chk("S4 the RESTART prompt: line 1 the EXACT own-line toggle, the authoritative counter sentence, NO budget directive",
  PROMPT.calls.some((c) => typeof c.text === "string" && c.text.startsWith("<|autonom|>\n") && /Your iteration number is \d+/.test(c.text) && !c.text.includes("budget exhausted")));
pushEvent({ type: "session.status", data: { sessionID: "ses_r_noline", status: { type: "idle" } } });
await sleep(20);
await mod.runTick();
chk("S4 the STICKY deactivation: a later idle on the trigger -> `skip= deactivated sid=ses_r_noline`",
  has("skip= deactivated sid=ses_r_noline"));

// the dead-mark lane
PROMPT.mode = "reject";
await armOnScoped("ses_r_dead");
pushEvent({ type: "session.status", data: { sessionID: "ses_r_dead", status: { type: "idle" } } });
await sleep(20);
await mod.runTick();
PROMPT.mode = "ok";
pushEvent({ type: "session.status", data: { sessionID: "ses_r_dead", status: { type: "idle" } } });
await sleep(20);
await mod.runTick();
chk("S4 a FAILED CONTINUE dead-marks the idle cycle: `send-fail= ... mock queue rejection` then `skip= dead`",
  has("send-fail= sid=ses_r_dead mock queue rejection") && has("skip= dead sid=ses_r_dead"));

// ------------------------------------------------------------------ S4b #159: the STEP-event arm source (the v2 host publishes NO session.status/session.idle)

async function armOnScopedStep(sid) {
  // the context hook (DEVIATION (a) carrier): the own-line ON toggle + the agent
  await HOOKS["context"]({ sessionID: sid, agent: "planner_FlashNext", messages: [userMsg("<|autonom|>")] });
  pushEvent({ type: "session.step.started", data: { sessionID: sid, assistantMessageID: "m_s" } });
  await sleep(20);
}
function routed(sid) {
  return readLog().some((l) => l.includes(`sid=${sid}`) && /(route= |recovery= |skip= |send-fail=)/.test(l));
}

// (a) busy from `session.step.started` — the arm state the status-busy leg used to produce
await armOnScopedStep("ses_st_arm");
chk("S4b #159(a) `session.step.started` ARMS like the busy status leg: the event line + `arm= sid=ses_st_arm` + the scoped verdict",
  has("event=session.step.started sid=ses_st_arm") && has("arm= sid=ses_st_arm") && has("scope= autorun sid=ses_st_arm"));
pushEvent({ type: "session.text.ended", data: { sessionID: "ses_st_arm", assistantMessageID: "m_st_a", ordinal: 0, text: "closed.\naction: stop" } });
pushEvent({ type: "session.step.ended", data: { sessionID: "ses_st_arm", assistantMessageID: "m_st_a", finish: "stop" } });
await sleep(20);
await mod.runTick();
chk("S4b #159(a) the step-ended idle of the armed watch routes: `route= stop sid=ses_st_arm`",
  has("route= stop sid=ses_st_arm"));

// (b) idle from `session.step.ended finish=stop` + `action: restart` -> the successor SPAWN (the dead-loop symptom is gone)
await armOnScopedStep("ses_st_restart");
pushEvent({ type: "session.model.selected", data: { sessionID: "ses_st_restart", model: { id: "smoke-model-8K", providerID: "llama-swap" } } });
pushEvent({ type: "session.text.ended", data: { sessionID: "ses_st_restart", assistantMessageID: "m_st_b", ordinal: 0, text: "unit done\naction: restart" } });
pushEvent({ type: "session.step.ended", data: { sessionID: "ses_st_restart", assistantMessageID: "m_st_b", finish: "stop", tokens: { input: 500, output: 0, reasoning: 0, cache: { read: 0, write: 0 } } } });
await sleep(20);
await mod.runTick();
// the spawn line rides the log right after the route line: `route= restart spawn` -> `spawn= sid=<new>`
const stLines = readLog();
const stRoute = stLines.findIndex((l) => l.includes("route= restart spawn sid=ses_st_restart"));
const stSpawnSid = stRoute >= 0 ? (stLines[stRoute + 1]?.match(/spawn= sid=(\S+)/) ?? [])[1] : undefined;
chk("S4b #159(b) the terminal step-ended idle routes the RESTART SPAWN: `route= restart spawn sid=ses_st_restart` + `deactivate=` + ONE QUEUED prompt on the spawned sid",
  has("route= restart spawn sid=ses_st_restart") && has("deactivate= sid=ses_st_restart") &&
  stSpawnSid !== undefined && PROMPT.calls.some((c) => c.sessionID === stSpawnSid && c.delivery === "queue" && c.text.includes("auto-resume unit 4 restart branch")));

// (c) `finish=tool-calls` = the turn CONTINUES; a missing/"unknown" finish = no signal -> NOTHING routed
await armOnScopedStep("ses_st_tool");
pushEvent({ type: "session.text.ended", data: { sessionID: "ses_st_tool", assistantMessageID: "m_st_c", ordinal: 0, text: "mid turn\naction: stop" } });
pushEvent({ type: "session.step.ended", data: { sessionID: "ses_st_tool", assistantMessageID: "m_st_c", finish: "tool-calls" } });
pushEvent({ type: "session.step.ended", data: { sessionID: "ses_st_tool", assistantMessageID: "m_st_c", finish: "unknown" } });
pushEvent({ type: "session.step.ended", data: { sessionID: "ses_st_tool", assistantMessageID: "m_st_c" } });
await sleep(20);
await mod.runTick();
chk("S4b #159(c) `finish=tool-calls` / `finish=unknown` / a missing finish -> NO idle: runTick routes NOTHING for sid=ses_st_tool",
  !routed("ses_st_tool"));

// (d) no double route: duplicate idles (two terminal step.endeds + a status idle IN ONE WINDOW) route ONCE; the reset then the next tick route nothing
await armOnScopedStep("ses_st_dup");
pushEvent({ type: "session.text.ended", data: { sessionID: "ses_st_dup", assistantMessageID: "m_st_d", ordinal: 0, text: "x\naction: stop" } });
pushEvent({ type: "session.step.ended", data: { sessionID: "ses_st_dup", assistantMessageID: "m_st_d", finish: "stop" } });
pushEvent({ type: "session.step.ended", data: { sessionID: "ses_st_dup", assistantMessageID: "m_st_d", finish: "stop" } });
pushEvent({ type: "session.status", data: { sessionID: "ses_st_dup", status: { type: "idle" } } });
await sleep(20);
await mod.runTick();
chk("S4b #159(d) the duplicate idle (step-ended x2 + a status idle in ONE window) routes EXACTLY ONCE",
  countOf("route= stop sid=ses_st_dup") === 1);
await mod.runTick();
chk("S4b #159(d) the `idlePending` reset: the NEXT tick routes nothing again",
  countOf("route= stop sid=ses_st_dup") === 1);

// (e) regression: the old `session.status busy`/`idle` legs still arm AND route (a host that emits them keeps working)
await armOnScoped("ses_old_step");
pushEvent({ type: "session.status", data: { sessionID: "ses_old_step", status: { type: "idle" } } });
pushEvent({ type: "session.text.ended", data: { sessionID: "ses_old_step", assistantMessageID: "m_st_e", ordinal: 0, text: "old legs\naction: stop" } });
await sleep(20);
await mod.runTick();
chk("S4b #159(e) regression: the `session.status busy`/`idle` legs still arm AND route (`arm=` + `route= stop`)",
  has("arm= sid=ses_old_step") && has("route= stop sid=ses_old_step"));

// ------------------------------------------------------------------ S5 #109: the silent limit-stop detector

writeFileSync(path.join(TEMP, "lineage_max_depth"), "1", "utf8"); // the LIVE cap for the lineage pins

async function armDetector(sid, finish = "length", total = 7950, modelID = "smoke-model-8K") {
  await armOnScoped(sid);
  pushEvent({ type: "session.model.selected", data: { sessionID: sid, model: { id: modelID, providerID: "llama-swap" } } });
  pushEvent({ type: "session.step.ended", data: { sessionID: sid, assistantMessageID: `m_${sid}`, finish, tokens: { input: total, output: 0, reasoning: 0, cache: { read: 0, write: 0 } } } });
  pushEvent({ type: "session.status", data: { sessionID: sid, status: { type: "idle" } } });
  await sleep(20);
}
await armDetector("ses_det");
await mod.runTick();
chk("S5 clause (3) NEGATIVE: idle but the wall of 60s not elapsed (the lever: 60ms) -> NO fire",
  !has("limit-stop= sid=ses_det"));
await sleep(90);
await mod.runTick();
chk("S5 the FIRE: `limit-stop= sid=ses_det total=7950` (the 0.99*8000 = 7920 threshold, name-marker window)",
  has("limit-stop= sid=ses_det total=7950"));
chk("S5 the ONE `-WARNING` line in the looprun's loop_log.md (byte-shape: finish/total/window/no-COMPACT)",
  readFileSync(path.join(LOOPROOT, "loop_log.md"), "utf8").split("\n").some((l) => /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2} -WARNING auto_resume ses_det smoke-model-8K silent limit-stop: finish=length total=7950 window=8000 no-COMPACT$/.test(l)));
await mod.runTick();
await mod.runTick();
chk("S5 the once-per-episode latch: exactly ONE limit-stop line per episode (the claim guard)",
  countOf("limit-stop= sid=ses_det") === 1);
pushEvent({ type: "session.status", data: { sessionID: "ses_det", status: { type: "busy" } } });
await sleep(20);
await armDetector("ses_det", "length", 7950); // a fresh busy + a NEW step re-arms the latch
await sleep(90);
await mod.runTick();
chk("S5 a fresh busy / NEW assistant update CLEARS the latch -> a second episode fires",
  countOf("limit-stop= sid=ses_det") === 2);

await armDetector("ses_n1", "stop");
await armDetector("ses_n2", "length", 3000);
await armDetector("ses_n3", "length", 7950, "unresolvable-model-xyz");
await HOOKS["context"]({ sessionID: "ses_n4", agent: "user", messages: [userMsg("<|Direct|>")] });
pushEvent({ type: "session.status", data: { sessionID: "ses_n4", status: { type: "busy" } } });
pushEvent({ type: "session.model.selected", data: { sessionID: "ses_n4", model: { id: "smoke-model-8K", providerID: "llama-swap" } } });
pushEvent({ type: "session.step.ended", data: { sessionID: "ses_n4", assistantMessageID: "m_n4", finish: "length", tokens: { input: 7950, output: 0, reasoning: 0, cache: { read: 0, write: 0 } } } });
pushEvent({ type: "session.status", data: { sessionID: "ses_n4", status: { type: "idle" } } });
await sleep(90);
await mod.runTick();
chk("S5 clause (1) NEGATIVE (finish=stop) / clause (2) NEGATIVE (total below the wall) / unresolvable window / clause (5) NEGATIVE (scope none) -> NO fires",
  !has("limit-stop= sid=ses_n1") && !has("limit-stop= sid=ses_n2") && !has("limit-stop= sid=ses_n3") && !has("limit-stop= sid=ses_n4"));

await armDetector("ses_c4");
writeFileSync(CTXLOG, "2026-10-22_00-00 [smoke-budget-model] COMPACT ses_c4 keep=12m tok=40000 budget\n", "utf8");
await sleep(20);
await mod.runTick();
chk("S5 clause (4) NEGATIVE: a NEW ctx.log COMPACT line re-arms (`rearm= compact sid=ses_c4`) and suppresses the fire",
  has("rearm= compact sid=ses_c4") && !has("limit-stop= sid=ses_c4"));

// the lineage cap + the RESTORE (from the pre-trim pair)
pushEvent({ type: "session.status", data: { sessionID: "ses_par", status: { type: "idle" } } });
pushEvent({ type: "session.status", data: { sessionID: "ses_child", status: { type: "idle" } } });
await HOOKS["context"]({ sessionID: "ses_child", agent: "planner_FlashNext", messages: [userMsg("<|autonom|>")] });
pushEvent({ type: "session.text.ended", data: { sessionID: "ses_child", assistantMessageID: "m_child", ordinal: 0, text: "go on\naction: restart" } });
await sleep(20);
await mod.runTick();
chk("S6 the #90 part-C RESTORE (ONCE per process): the trigger is deactivated and the child's depth rides the cap (lineage_max_depth=1)",
  has("skip= deactivated sid=ses_par") && has("skip= depth sid=ses_child depth=1"));

// ------------------------------------------------------------------ S6 the budget-exhausted directive forms

for (const [sid, expectDirective] of [["ses_bud_exh", true], ["ses_bud_cpu", true], ["ses_bud_ok", false]]) {
  await armOnScoped(sid);
  pushEvent({ type: "session.text.ended", data: { sessionID: sid, assistantMessageID: `m_${sid}`, ordinal: 0, text: "no line here" } });
  // THREE idle cycles: attempt 1, attempt 2, then the cap-exhausted RESTART route.
  for (let i = 0; i < 3; i += 1) {
    pushEvent({ type: "session.status", data: { sessionID: sid, status: { type: "idle" } } });
    await sleep(20);
    await mod.runTick();
  }
  const direct = readLog().some((l) => l.includes(`budget= exhausted sid=${sid}`));
  chk(`S6 the budget gate form ${sid}: the \`budget= exhausted\` line = ${expectDirective}`,
    direct === expectDirective, `direct=${direct}`);
}
chk("S6 the exhausted RESTART text carries the forced-new-session directive (the dump-corpus sentence)",
  PROMPT.calls.some((c) => typeof c.text === "string" && c.text.includes("compaction budget exhausted — scan the dump of ses_bud_exh") && c.text.includes("`dump_session.cjs` in agent/scripts/db/")));

// ------------------------------------------------------------------ S8a #178: the durable mode store (first setup)

{
  const store = readModeStore();
  chk("S8a #178 the ON toggle WRITES the store: ses_r_stop -> autorun", store.ses_r_stop === "autorun", JSON.stringify(store));
  chk("S8a #178 the OFF toggle WRITES the store: ses_n4 -> direct", store.ses_n4 === "direct");
}

// THE MEASURED FLAW (planner-36): the DIRECT toggle survived only while the
// marked message stayed the newest user message — markerless follow-ups
// flipped the verdict back to the planner prefix -> unit-4 fired again.
await HOOKS["context"]({ sessionID: "ses_178_sticky", agent: "planner_FlashNext", messages: [userMsg("<|Direct|>")] });
chk("S8a #178 the OFF toggle sticks: `scope= none sid=ses_178_sticky` + the store entry direct",
  has("scope= none sid=ses_178_sticky") && readModeStore().ses_178_sticky === "direct");
await HOOKS["context"]({ sessionID: "ses_178_sticky", agent: "planner_FlashNext", messages: [userMsg("plain markerless follow-up (post-compaction history, marker pruned)")] });
chk("S8a #178 a MARKERLESS follow-up keeps DIRECT: the store beats the planner prefix — the ONLY scope line stays `scope= none`",
  scopeLines("ses_178_sticky").length === 1 && scopeLines("ses_178_sticky")[0].includes("scope= none"),
  scopeLines("ses_178_sticky").join(" | "));
pushEvent({ type: "session.status", data: { sessionID: "ses_178_sticky", status: { type: "busy" } } });
pushEvent({ type: "session.status", data: { sessionID: "ses_178_sticky", status: { type: "idle" } } });
await sleep(20);
await mod.runTick();
chk("S8a #178 unit-4 NEVER wakes the DIRECT session: NO route/recovery/skip line, NO prompt call",
  !routed("ses_178_sticky") && !PROMPT.calls.some((c) => c.sessionID === "ses_178_sticky"));
await HOOKS["context"]({ sessionID: "ses_178_sticky", agent: "planner_FlashNext", messages: [userMsg("<|autonom|>")] });
chk("S8a #178 `<|autonom|>` RE-ARMS: the store FLIPS to autorun + `scope= autorun sid=ses_178_sticky`",
  readModeStore().ses_178_sticky === "autorun" && has("scope= autorun sid=ses_178_sticky"));
pushEvent({ type: "session.status", data: { sessionID: "ses_178_sticky", status: { type: "idle" } } });
await sleep(20);
await mod.runTick();
chk("S8a #178 routing RESUMES after the re-arm: `recovery= sid=ses_178_sticky attempt=1` + ONE QUEUED send",
  has("recovery= sid=ses_178_sticky attempt=1") && PROMPT.calls.filter((c) => c.sessionID === "ses_178_sticky").length === 1);

// ------------------------------------------------------------------ S7 pure-leg pins + fail-open + cleanup

chk("S7 the action-line scan is LINE-ANCHORED, last match wins (#98 part A) + the #170 `continue` token",
  mod.actionFromText("x\naction: stop") === "stop" &&
  mod.actionFromText('a quoted "action: restart" mid-line') === null &&
  mod.actionFromText('a quoted "action: continue" mid-line') === null &&
  mod.actionFromText("closed.\naction: continue") === "continue" &&
  mod.actionFromText("action: continue\naction: restart") === "restart" &&
  mod.actionFromText("action: resume\naction: restart") === "restart" &&
  mod.actionFromText("bullet-prefixed\n- action: restart") === null);
chk("S7 the scope verdict ladder: Direct beats the agent test; an ON toggle is ANY agent; NO toggle falls to the planner prefix",
  mod.scopeVerdict("off", "planner_x") === "none" && mod.scopeVerdict("on", "task_worker") === "autorun" &&
  mod.scopeVerdict(null, "planner_FlashNext") === "planner" && mod.scopeVerdict(null, "task_worker") === "none");

// fail-open: a throwing content getter inside the hook payload must NOT escape
let threw = false;
try {
  const poison = { role: "user", content: [{ type: "text", get text() { throw new Error("poison getter"); } }] };
  await HOOKS["context"]({ sessionID: "ses_poison", agent: "planner_FlashNext", messages: [poison] });
} catch (e) {
  threw = true;
}
chk("S7 fail-open: a THROWING hook payload NEVER reaches the host (the handler swallowed it)", !threw);
const logBytesBefore = statSync(LOG).size;
pushEvent({ type: "session.status", data: { sessionID: "ses_after_poison", status: { type: "busy" } } });
await sleep(20);
chk("S7 the plugin stays alive after that poison (later events still log)", statSync(LOG).size > logBytesBefore && has("arm= sid=ses_after_poison"));

cleanup();
chk("S7 teardown disposed the `context` hook registration", HOOKS["context"] === undefined);

// ------------------------------------------------------------------ S8b #178: the RESTART simulation (fresh setup + existing store)

{
  const store = readModeStore();
  store.ses_rs_direct = "direct"; // the durable store SURVIVED the host restart
  writeFileSync(MODE, JSON.stringify(store), "utf8");
}
const cleanup2 = await plugin.setup(makeCtx());
await sleep(10);
chk("S8b #178 the fresh setup re-registers the hook (the reload path)", typeof HOOKS["context"] === "function");
await HOOKS["context"]({ sessionID: "ses_rs_direct", agent: "planner_FlashNext", messages: [userMsg("plain markerless message — the chain alone would say planner")] });
chk("S8b #178 at WATCH CREATION the existing store entry wins: `scope= none sid=ses_rs_direct` (NO planner verdict)",
  has("scope= none sid=ses_rs_direct") && scopeLines("ses_rs_direct").every((l) => l.includes("scope= none")),
  scopeLines("ses_rs_direct").join(" | "));
pushEvent({ type: "session.status", data: { sessionID: "ses_rs_direct", status: { type: "idle" } } });
await sleep(20);
await mod.runTick();
chk("S8b #178 the restarted DIRECT session NEVER wakes: NO route/recovery line, NO prompt call",
  !routed("ses_rs_direct") && !PROMPT.calls.some((c) => c.sessionID === "ses_rs_direct"));
cleanup2();
chk("S8b #178 the second teardown disposed the hook registration", HOOKS["context"] === undefined);

console.log(`\nFAILURES=${failures}`);
console.log(failures === 0 ? "SMOKE: ALL PASS" : `SMOKE: ${failures} FAIL`);
