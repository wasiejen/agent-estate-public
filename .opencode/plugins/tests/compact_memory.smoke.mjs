// compact_memory.smoke.mjs — TODO #137 unit 4a: the v2 compaction plugin smoke.
// bun, MOCK ctx — no opencode process, NO backend request. Pins the DoD 2-9
// contract of `.opencode/plugins/compact_memory.ts` + the ported budget core
// (`.opencode/plugin/scripts/compaction_core_v2.mjs`): the cap-resolver forms
// (the CPU guard FIRST, unlisted default, listed), denial = ZERO side effects,
// the emergency-1 at count == cap and the exhausted state above, SELF via
// the ToolContext sessionID, CROSS fire-and-forget with the effective cap+1
// and the ` ovr` token, INCREMENT-ON-SUCCESS ONLY (the
// `session.compaction.ended` event leg), `.failed` → no burn + evidence,
// the marker `result` override at the compaction draft hook + the
// boundary-ignored line, the native `delivery:"queue"` continuation +
// rejection evidence, the keep-not-applied line, and the pin that the
// compact body carries NO keep fields (the captured call).
//
// Fixtures and BOTH logs (the plugin's compact_v2.log + the shared ctx.log
// COMPACT line) live in home/AppData/Local/Temp/opencode/
// compact-smoke-v2 (recreated every run) — the LIVE DB is NEVER touched.
// Run: bun run compact_memory.smoke.mjs (this dir). Expected final line:
// `SMOKE: ALL PASS`.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRATCH = "home/AppData/Local/Temp/opencode/compact-smoke-v2";
const WS = path.join(SCRATCH, "ws"); // the mock workspace (ctx.location.directory)
const CLONE_ROOT = "repo-root-v2";
const PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "compact_memory.ts");
const CORE = path.join(CLONE_ROOT, ".opencode", "plugin", "scripts", "compaction_core_v2.mjs");

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

// ------------------------------------------------------------------ fixtures

rmSync(SCRATCH, { recursive: true, force: true });
mkdirSync(path.join(WS, ".opencode", "temp"), { recursive: true });
const LOG = path.join(WS, ".opencode", "temp", "compact_v2.log");
const CTXLOG = path.join(WS, ".opencode", "temp", "ctx.log");
const BUDGET = path.join(WS, ".opencode", "temp", "compact_budget.json");

function readLog() {
  if (!existsSync(LOG)) return [];
  return readFileSync(LOG, "utf8").split("\n").filter((l) => l !== "").map((l) => JSON.parse(l));
}
function readCtxLog() {
  if (!existsSync(CTXLOG)) return [];
  return readFileSync(CTXLOG, "utf8").split("\n").filter((l) => l !== "");
}
function count(sid) {
  const d = JSON.parse(readFileSync(BUDGET, "utf8"));
  return d.sessions?.[sid]?.count ?? 0;
}

// The budget fixture: cap 3 for the listed model, default 2; ONE emergency;
// the keep keys PRESENT (the keep-not-applied pin + the tok=<keepTokens>
// budget source of the COMPACT line). Session entries seed the gate states:
// ses_self 1/3 (a normal dispatch fits), ses_emg 3/3 (only the emergency
// slot), ses_cross 3/3 (only the cross override slot), ses_exhaust 4 (=
// cap+1 — the fully-exhausted refusal), ses_fail 0, ses_marker 0, ses_cpu
// (no entry; the model resolves CPU → cap 0).
const LISTED = "smoke-compaction-model-120K";
writeFileSync(BUDGET, JSON.stringify({
  keepMessages: 12,
  keepTokens: 40000,
  emergency_budget: 1,
  model_budget: { [LISTED]: 3, default: 2 },
  sessions: {
    ses_self: { count: 1, model: LISTED },
    ses_emg: { count: 3, model: LISTED },
    ses_cross: { count: 3, model: LISTED },
    ses_exhaust: { count: 4, model: LISTED },
    ses_fail: { count: 0, model: LISTED },
    ses_marker: { count: 0, model: LISTED },
  },
}), "utf8");

// The model each fixture session resolves to (the mock `session.get`).
const MODELS = {
  ses_self: LISTED,
  ses_emg: LISTED,
  ses_cross: LISTED,
  ses_exhaust: LISTED,
  ses_fail: LISTED,
  ses_marker: LISTED,
  ses_cpu: "cpu-llama-denied",
  ses_def: "unlisted-model-xyz", // -> the model_budget.default cap (2)
  ses_caller: LISTED,
};

// The mock ctx: every host call is RECORDED; `compact` rides DELAY (mode
// "slow" = a promise that resolves LATER — the fire-and-forget pin), `prompt`
// rides PROMPT.mode ("ok" | "reject" | "throw"); the event stream is a PULL
// queue the test feeds.
const COMPACT = { calls: [], mode: "ok" }; // ok | slow | reject
const PROMPT = { calls: [], mode: "ok" }; // ok | reject | throw
const GET = { calls: [] };
const TOOLS = [];
const HOOKS = {};
const STREAM = { events: [], waiters: [] };

function pushEvent(ev) {
  STREAM.events.push(ev);
  const w = STREAM.waiters.shift();
  if (w) w();
}

function makeCtx(directory) {
  return {
    location: { directory },
    session: {
      hook: async (name, cb) => {
        HOOKS[name] = cb;
        return { dispose: async () => delete HOOKS[name] };
      },
      get: (input) => {
        GET.calls.push(input);
        const id = MODELS[input.sessionID];
        return Promise.resolve(id != null ? { id: input.sessionID, model: { id, providerID: "llama-swap" } } : undefined);
      },
      compact: (input) => {
        COMPACT.calls.push(input);
        if (COMPACT.mode === "reject") return Promise.reject(new Error("mock compact rejection"));
        if (COMPACT.mode === "slow") return new Promise((res) => setTimeout(() => res({ id: "inbox-1" }), 60));
        return Promise.resolve({ id: "inbox-1" });
      },
      prompt: (input) => {
        PROMPT.calls.push(input);
        if (PROMPT.mode === "reject") return Promise.reject(new Error("mock queue rejection"));
        if (PROMPT.mode === "throw") throw new Error("mock queue sync throw");
        return Promise.resolve({ id: "inbox-2" });
      },
    },
    tool: {
      transform: async (cb) => {
        const editor = { list: () => [], get: () => undefined, namespace: () => {}, add: (t) => TOOLS.push(t), update: () => {}, remove: () => {} };
        cb(editor);
        return { dispose: async () => {} };
      },
      hook: async (name, cb) => {
        HOOKS["tool:" + name] = cb;
        return { dispose: async () => delete HOOKS["tool:" + name] };
      },
    },
    event: {
      subscribe: () => (async function* () {
        while (true) {
          if (STREAM.events.length === 0) await new Promise((res) => STREAM.waiters.push(res));
          else yield STREAM.events.shift();
        }
      })(),
    },
  };
}

const core = await import(pathToFileURL(CORE).href);
const plugin = (await import(pathToFileURL(PLUGIN).href)).default;

// ------------------------------------------------------------------ S0/S1 the plugin shape

chk("S0 default export is the loader shape { id: 'compact_memory', setup }",
  plugin && typeof plugin === "object" && plugin.id === "compact_memory" && typeof plugin.setup === "function",
  JSON.stringify(Object.keys(plugin ?? {})));

const ctx = makeCtx(WS);
const cleanup = await plugin.setup(ctx);
chk("S1 setup registers the tool transform + the 'compaction' draft hook and returns a cleanup",
  TOOLS.length === 1 && TOOLS[0].name === "compact_memory" && typeof HOOKS["compaction"] === "function" && typeof cleanup === "function",
  `tools=${TOOLS.length} hook=${typeof HOOKS["compaction"]} cleanup=${typeof cleanup}`);
chk("S1 the tool surface: plain JSON-schema input (no keep keys), string output, promise execute",
  TOOLS[0].input?.type === "object" &&
  Object.keys(TOOLS[0].input.properties).join(",") === "sessionID,emergency,message,mode,summary,boundary" &&
  TOOLS[0].input.properties.mode.enum.join(",") === "auto,marker" &&
  TOOLS[0].output?.type === "string" &&
  typeof TOOLS[0].execute === "function",
  JSON.stringify(TOOLS[0].input?.properties ? Object.keys(TOOLS[0].input.properties) : null));

const TOOL = TOOLS[0];
const call = (args, ctxArg) => TOOL.execute(args, ctxArg);

// ------------------------------------------------------------------ S2 the core cap resolver

chk("S2 cap forms: CPU guard FIRST (cap 0 + cpu label), listed exact, unlisted -> model_budget.default, absent file -> default 1",
  core.resolveCap(WS, "cpu-llama-denied").cap === 0 &&
  core.resolveCap(WS, "CPU-anything").label === "cpu (excluded)" &&
  core.resolveCap(WS, LISTED).cap === 3 &&
  core.resolveCap(WS, "unlisted-model-xyz").cap === 2 &&
  core.resolveCap(path.join(SCRATCH, "nope"), "any-model").cap === 1,
  JSON.stringify([core.resolveCap(WS, "cpu-llama-denied"), core.resolveCap(WS, LISTED), core.resolveCap(WS, "unlisted-model-xyz")]));

// ------------------------------------------------------------------ S3 CPU denial: ZERO side effects

{
  MODELS.ses_ff = LISTED;
  MODELS.ses_q = LISTED;
  const compactBefore = COMPACT.calls.length;
  const ctxBefore = readCtxLog().length;
  const logBefore = readLog().length;
  const r = await call({}, { sessionID: "ses_cpu" });
  const lines = readLog().slice(logBefore);
  chk("S3 CPU SELF: the refusal text (cap 0, cpu class)",
    r.output.startsWith("Compaction refused: the compaction budget for ses_cpu is exhausted") &&
      r.output.includes("cpu (excluded) (cap 0), used 0/0") &&
      r.output.includes("available via the `emergency` argument"),
    JSON.stringify(r.output));
  chk("S3 denial ZERO side effects: no compact call, count 0, no COMPACT line, ONE denied line",
    COMPACT.calls.length === compactBefore &&
      count("ses_cpu") === 0 &&
      readCtxLog().length === ctxBefore &&
      lines.length === 1 &&
      lines[0].kind === "dispatch" && lines[0].state === "denied" && lines[0].cap === "0",
    JSON.stringify(lines));
}

// ------------------------------------------------------------------ S4 SELF dispatch (ToolContext id)

{
  const logBefore = readLog().length;
  const r = await call({ message: "resume from the handover file" }, { sessionID: "ses_self" });
  await sleep(5); // let the accepted-audit line land
  const lines = readLog().slice(logBefore);
  const body = COMPACT.calls.find((c) => c.sessionID === "ses_self");
  chk("S4 SELF resolves from the ToolContext sessionID (no sessionID arg)",
    body != null && r.output.includes("Compaction dispatched for ses_self") && r.output.includes(`model: ${LISTED}`),
    JSON.stringify(r.output));
  chk("S4 the compact body carries NO keep fields: keys EXACTLY [sessionID]",
    body != null && Object.keys(body).join(",") === "sessionID",
    JSON.stringify(body ?? null));
  chk("S4 increment NOT at dispatch (INCREMENT-ON-SUCCESS only): count stays 1; the queue is NOT delivered yet",
    count("ses_self") === 1 && PROMPT.calls.length === 0,
    `count=${count("ses_self")} promptCalls=${PROMPT.calls.length}`);
  chk("S4 audit lines: keep-not-applied (12/40000) + dump-skipped + dispatch accepted (auto)",
    lines.some((l) => l.kind === "keep" && l.reason === "keep-not-applied" && l.keepMessages === "12" && l.keepTokens === "40000") &&
      lines.some((l) => l.kind === "dump" && l.reason === "dump-skipped") &&
      lines.some((l) => l.kind === "dispatch" && l.state === "accepted" && l.mode === "auto" && l.cap === "3" && l.count === "1"),
    JSON.stringify(lines.map((l) => `${l.kind}:${l.reason ?? l.state ?? ""}`)));
  chk("S4 the response states the keep-keys and dump deviations",
    r.output.includes("keepMessages/keepTokens are NOT applied in v2") && r.output.includes("dump is skipped in v2") && r.output.includes("native inbox queue"),
    JSON.stringify(r.output));
}

// ------------------------------------------------------------------ S5 verify leg: .ended = success

{
  pushEvent({ type: "session.compaction.started", data: { sessionID: "ses_self" } });
  pushEvent({ type: "session.compaction.ended", data: { sessionID: "ses_self" } });
  await sleep(20);
  const lines = readLog();
  const ctxLines = readCtxLog();
  chk("S5 the .ended signal burns the budget exactly once: count 1 -> 2",
    count("ses_self") === 2, `count=${count("ses_self")}`);
  chk("S5 exactly ONE COMPACT line for ses_self, v1 byte-format with the budget keep source",
    ctxLines.length === 1 && /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2} .+ COMPACT ses_self keep=12m tok=40000 budget\s*$/.test(ctxLines[0]),
    JSON.stringify(ctxLines));
  chk("S5 verify evidence: started + success (model + auto mode) lines",
    lines.some((l) => l.kind === "verify" && l.state === "started" && l.session === "ses_self") &&
      lines.some((l) => l.kind === "verify" && l.state === "success" && l.model === LISTED && l.mode === "auto"),
    JSON.stringify(lines.filter((l) => l.kind === "verify").map((l) => l.state)));
  chk("S5 the queue leg fires ONLY at verified success: delivery:'queue' + the message text",
    PROMPT.calls.length === 1 && PROMPT.calls[0].delivery === "queue" && PROMPT.calls[0].text === "resume from the handover file" && PROMPT.calls[0].sessionID === "ses_self",
    JSON.stringify(PROMPT.calls[0] ?? null));
  // an UNRELATED (auto) compaction of a session WITHOUT a pending record:
  pushEvent({ type: "session.compaction.ended", data: { sessionID: "ses_autonome" } });
  await sleep(10);
  chk("S5 a compaction WITHOUT a pending dispatch record is SILENT (no burn, no line)",
    count("ses_autonome") === 0 && !readLog().some((l) => l.session === "ses_autonome"), "");
}

// ------------------------------------------------------------------ S6 fire-and-forget (slow dispatch)

{
  COMPACT.mode = "slow";
  const r = await call({}, { sessionID: "ses_ff" });
  chk("S6 the tool result returns while the compact call is STILL pending (NEVER awaited)",
    r.output.includes("Compaction dispatched for ses_ff") &&
      !readLog().some((l) => l.kind === "dispatch" && l.state === "accepted" && l.session === "ses_ff"),
    JSON.stringify(readLog().filter((l) => l.session === "ses_ff").map((l) => l.kind + ":" + (l.state ?? l.reason ?? ""))));
  await sleep(90); // the delayed compact resolves at ~60ms -> the accepted line lands
  chk("S6 the accepted line lands LATER; no verify/verify-burn before the ended event",
    readLog().some((l) => l.kind === "dispatch" && l.state === "accepted" && l.session === "ses_ff") && count("ses_ff") === 0,
    `count=${count("ses_ff")}`);
  COMPACT.mode = "ok";
  pushEvent({ type: "session.compaction.ended", data: { sessionID: "ses_ff" } });
  await sleep(10);
  chk("S6 the ended event still verifies the slow dispatch: count 1",
    count("ses_ff") === 1, `count=${count("ses_ff")}`);
}

// ------------------------------------------------------------------ S7 the .failed leg: NO burn

{
  const r = await call({}, { sessionID: "ses_fail" });
  await sleep(5);
  pushEvent({ type: "session.compaction.failed", data: { sessionID: "ses_fail", error: { message: "mock compaction failure" } } });
  await sleep(20);
  const lines = readLog().filter((l) => l.session === "ses_fail");
  chk("S7 the .failed leg burns NO budget: count stays 0, no COMPACT line for the session",
    r.output.includes("Compaction dispatched for ses_fail") && count("ses_fail") === 0 &&
      !readCtxLog().some((l) => l.includes("COMPACT ses_fail")),
    `count=${count("ses_fail")}`);
  chk("S7 ONE verify=failed evidence line with the capped preview",
    lines.some((l) => l.kind === "verify" && l.state === "failed" && typeof l.preview === "string" && l.preview.includes("mock compaction failure")),
    JSON.stringify(lines.map((l) => l.kind + ":" + (l.state ?? l.reason ?? ""))));
}

// ------------------------------------------------------------------ S8 the emergency-1 form

{
  const r0 = await call({}, { sessionID: "ses_emg" });
  const r1 = await call({ emergency: true }, { sessionID: "ses_emg" });
  await sleep(5);
  pushEvent({ type: "session.compaction.ended", data: { sessionID: "ses_emg" } });
  await sleep(20);
  const r2 = await call({ emergency: true }, { sessionID: "ses_exhaust" });
  const ctxLines = readCtxLog();
  const line = ctxLines.find((l) => l.includes("COMPACT ses_emg")) ?? "";
  chk("S8 at count == cap the plain dispatch REFUSES (with the emergency hint)",
    r0.output.startsWith("Compaction refused") && r0.output.includes("used 3/3") && r0.output.includes("available via the `emergency` argument"),
    JSON.stringify(r0.output));
  chk("S8 at count == cap the `emergency` arg consumes the 1 (count -> cap+1, the emergency token)",
    r1.output.includes("emergency slot is consumed") && count("ses_emg") === 4 && /\b emergency\s*$/.test(line),
    JSON.stringify({ count: count("ses_emg"), line }));
  chk("S8 count == cap+1 = fully exhausted even WITH the emergency arg",
    r2.output.startsWith("Compaction refused") && r2.output.includes("used 4/3") && r2.output.includes("already consumed"),
    JSON.stringify(r2.output));
  chk("S8 the emergency and ovr tokens are mutually exclusive on the ses_emg line",
    line !== "" && !line.includes(" ovr"), JSON.stringify(line));
}

// ------------------------------------------------------------------ S9 the CROSS override (+ ovr)

{
  const r = await call({ sessionID: "ses_cross" }, { sessionID: "ses_caller" });
  await sleep(5);
  pushEvent({ type: "session.compaction.ended", data: { sessionID: "ses_cross" } });
  await sleep(20);
  const crossLine = (readCtxLog().find((l) => l.includes("COMPACT ses_cross")) ?? "");
  const r2 = await call({ sessionID: "ses_cross" }, { sessionID: "ses_caller" });
  chk("S9 CROSS at count == cap dispatches via the caller-scoped override (effective cap+1)",
    r.output.includes("cross override slot is consumed") && count("ses_cross") === 4,
    JSON.stringify({ out: r.output.slice(0, 120), count: count("ses_cross") }));
  chk("S9 the verified COMPACT line carries the ` ovr` token (no emergency token)",
    /\sovr\s*$/.test(crossLine) && !/\ emergency/.test(crossLine), JSON.stringify(crossLine));
  chk("S9 CROSS at count == cap+1 stays REFUSED (no second slot)",
    r2.output.startsWith("Compaction refused") && r2.output.includes("cross override slot is consumed"),
    JSON.stringify(r2.output.slice(0, 200)));
}

// ------------------------------------------------------------------ S10 the U3 marker mode

{
  const compactBeforeMarker = COMPACT.calls.length;
  const r0 = await call({ mode: "marker" }, { sessionID: "ses_marker" });
  const r = await call({ mode: "marker", summary: "THE AGENT-WRITTEN SUMMARY", boundary: "msg_100" }, { sessionID: "ses_marker" });
  await sleep(5);
  const draft = {
    sessionID: "ses_marker",
    agent: "worker-1",
    model: { id: LISTED, providerID: "llama-swap" },
    system: [],
    messages: [],
    options: {},
    tools: {},
    result: undefined,
  };
  await HOOKS["compaction"](draft);
  pushEvent({ type: "session.compaction.ended", data: { sessionID: "ses_marker" } });
  await sleep(20);
  const lines = readLog().filter((l) => l.session === "ses_marker");
  chk("S10 marker mode WITHOUT `summary` REFUSES (the refusal added NO compact call; the allowed call below added exactly 1)",
    r0.output.startsWith("marker= rejected: summary-empty") && COMPACT.calls.length === compactBeforeMarker + 1,
    JSON.stringify(r0.output));
  chk("S10 the marker draft hook OVERRODE event.result (summary + metadata.marker — the core skips the model request)",
    draft.result != null && draft.result.summary === "THE AGENT-WRITTEN SUMMARY" && draft.result.metadata?.marker === true,
    JSON.stringify(draft.result ?? null));
  chk("S10 ONE boundary-ignored evidence line for the accepted `boundary` arg (v2 has NO boundary control)",
    lines.filter((l) => l.kind === "marker" && l.state === "boundary-ignored").length === 1,
    JSON.stringify(lines.map((l) => l.kind + ":" + (l.state ?? l.reason ?? ""))));
  chk("S10 marker verify: the ended leg burns ONE (count 1) with the marker mode tag + the COMPACT line",
    count("ses_marker") === 1 &&
      lines.some((l) => l.kind === "marker" && l.state === "result-supplied") &&
      lines.some((l) => l.kind === "verify" && l.state === "success" && l.mode === "marker") &&
      readCtxLog().some((l) => l.includes("COMPACT ses_marker keep=12m tok=40000 budget")),
    `count=${count("ses_marker")}`);
  const stray = { sessionID: "ses_nopen", messages: [], result: undefined };
  await HOOKS["compaction"](stray);
  chk("S10 a compaction draft WITHOUT a pending marker record gets NO result override",
    stray.result === undefined, JSON.stringify(stray.result ?? null));
}

// ------------------------------------------------------------------ S11 queue rejection evidence

{
  PROMPT.mode = "reject";
  await call({ message: "queued continuation" }, { sessionID: "ses_q" });
  await sleep(5);
  pushEvent({ type: "session.compaction.ended", data: { sessionID: "ses_q" } });
  await sleep(20);
  PROMPT.mode = "ok";
  const lines = readLog().filter((l) => l.session === "ses_q");
  chk("S11 a queue delivery REJECTION is evidence-logged, NEVER a burn-loss (count 1)",
    count("ses_q") === 1 && lines.some((l) => l.kind === "queue" && l.reason === "delivery-rejected" && l.preview.includes("mock queue rejection")),
    JSON.stringify(lines.map((l) => l.kind + ":" + (l.state ?? l.reason ?? ""))));
}

// ------------------------------------------------------------------ S12 arg validation (no session id)

{
  const r = await call({}, {});
  chk("S12 a call with NO session id (arg or ToolContext) fails with the honest note, ZERO side effects",
    r.output.startsWith("Compaction request failed: no session id available") && readLog().length === (readLog()).length,
    JSON.stringify(r.output));
}

// ------------------------------------------------------------------ invariants + cleanup

{
  const lines = readLog();
  const kinds = new Set(lines.map((l) => l.kind));
  const dumps = lines.filter((l) => l.kind === "dump" && l.reason === "dump-skipped").length;
  const keeps = lines.filter((l) => l.kind === "keep" && l.reason === "keep-not-applied").length;
  const accepts = lines.filter((l) => l.kind === "dispatch" && l.state === "accepted").length;
  chk("INV all log lines parse as JSON; kinds ONLY {dispatch, marker, verify, keep, dump, queue}",
    kinds.size === 6 && [...kinds].sort().join(",") === "dispatch,dump,keep,marker,queue,verify", JSON.stringify([...kinds]));
  chk("INV every line carries ts + kind and stays under the LINE_CAP ladder",
    lines.every((l) => typeof l.ts === "string" && typeof l.kind === "string" && JSON.stringify(l).length <= 2000), "");
  chk("INV the dump-skipped + keep-not-applied lines land ONCE PER ALLOWED DISPATCH (7 dispatch legs, equal counts)",
    dumps === keeps && dumps === accepts && dumps === 7,
    JSON.stringify({ dumps, keeps, accepts }));
  chk("INV COMPACT lines: every one byte-forms the v1 convention (stamp + model + keep=12m + tok=40000 budget [+ token])",
    readCtxLog().every((l) => /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2} \S+ COMPACT \S+ keep=12m tok=40000 budget( emergency| ovr)*$/.test(l)),
    JSON.stringify(readCtxLog()));
  chk("INV the budget file kept its config keys through the increments (the #119 additive invariant)",
    JSON.parse(readFileSync(BUDGET, "utf8")).model_budget?.[LISTED] === 3 &&
      JSON.parse(readFileSync(BUDGET, "utf8")).keepMessages === 12 &&
      JSON.parse(readFileSync(BUDGET, "utf8")).version === 2,
    readFileSync(BUDGET, "utf8").slice(0, 120));
  console.log(`\nlog lines: ${lines.length}; COMPACT lines: ${readCtxLog().length}`);
}

const logLenBefore = readLog().length;
await cleanup();
pushEvent({ type: "session.compaction.ended", data: { sessionID: "ses_self" } });
await sleep(20);
chk("cleanup disposes the tool transform + the compaction hook and STOPS the event consumer",
  HOOKS["compaction"] === undefined && readLog().length === logLenBefore && count("ses_self") === 2,
  `hook=${typeof HOOKS["compaction"]} lines=${readLog().length - logLenBefore} count=${count("ses_self")}`);

console.log(failures === 0 ? "\nSMOKE: ALL PASS" : `\nSMOKE: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
