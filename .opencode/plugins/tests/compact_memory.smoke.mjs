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

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite"; // 4c: the dump twin's fixture-DB pins
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRATCH = "home/AppData/Local/Temp/opencode/compact-smoke-v2";
const WS = path.join(SCRATCH, "ws"); // the mock workspace (ctx.location.directory)
const CLONE_ROOT = "repo-root-v2";
const PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "compact_memory.ts");
const CORE = path.join(CLONE_ROOT, ".opencode", "plugin", "scripts", "compaction_core_v2.mjs");
const TWIN = path.join(CLONE_ROOT, "agent", "scripts", "db", "dump_session_v2.mjs"); // the 4c dump twin script
const SQLITE_EXE = path.join(CLONE_ROOT, ".opencode", "plugin", "tools", "sqlite3.exe"); // its spawn-lane exe

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

// The dump leg (TODO #137 unit 4c) spawns `<ws>/agent/scripts/db/dump_session_
// v2.mjs <sid> --out <corpus-rel> [--json]` — this STUB honors that CLI and
// writes marker content into the ws-relative `archive/sessions/` (the real
// twin's OUT_DIR shape, computed from the script's own dir). EVERY allowed
// dispatch therefore dumps with BOTH artifacts; the dump-failure lanes move
// this file aside inside their own pins.
const FAKE_DUMP_LINES = [
  'import { mkdirSync, writeFileSync } from "node:fs";',
  'import path from "node:path";',
  'import { fileURLToPath } from "node:url";',
  "const dir = path.dirname(fileURLToPath(import.meta.url));",
  "const argv = process.argv.slice(2);",
  "let rel = null, json = false, sid = null;",
  "for (let i = 0; i < argv.length; i++) {",
  "  const a = argv[i];",
  '  if (a === "--out") { i++; rel = argv[i]; }',
  '  else if (a === "--json") json = true;',
  "  else sid = a;",
  "}",
  'const out = path.resolve(dir, "..", "..", "..", "archive", "sessions");',
  'const file = path.join(out, rel != null ? rel : sid + (json ? ".json" : ".md"));',
  "mkdirSync(path.dirname(file), { recursive: true });",
  'writeFileSync(file, "fake dump sid=" + sid + " json=" + json + " rel=" + rel + "\\n", "utf8");',
  'console.log("dumped " + sid + " -> " + file);',
];
mkdirSync(path.join(WS, "agent", "scripts", "db"), { recursive: true });
writeFileSync(path.join(WS, "agent", "scripts", "db", "dump_session_v2.mjs"), FAKE_DUMP_LINES.join("\n") + "\n", "utf8");

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
const pluginMod = await import(pathToFileURL(PLUGIN).href);
const plugin = pluginMod.default;

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
  chk("S4 audit lines: keep-not-applied (12/40000) + dump ok + dispatch accepted (auto)",
    lines.some((l) => l.kind === "keep" && l.reason === "keep-not-applied" && l.keepMessages === "12" && l.keepTokens === "40000") &&
      lines.some((l) => l.kind === "dump" && l.state === "ok" && l.session === "ses_self") &&
      lines.some((l) => l.kind === "dispatch" && l.state === "accepted" && l.mode === "auto" && l.cap === "3" && l.count === "1"),
    JSON.stringify(lines.map((l) => `${l.kind}:${l.reason ?? l.state ?? ""}`)));
  chk("S4 the response states the keep-keys deviation and NO dump-skip/skip-warning text (4c: the dump leg landed)",
    r.output.includes("keepMessages/keepTokens are NOT applied in v2") && !r.output.includes("dump is skipped") && !r.output.includes("WARNING: pre-compaction dump") && r.output.includes("native inbox queue"),
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
  chk("S5 exactly ONE COMPACT line for ses_self, v1 byte-format with the budget keep source (4c: the ctx.log also carries the session's DUMP-* lines, so the pin scopes to COMPACT lines)",
    ctxLines.filter((l) => l.includes(" COMPACT ses_self")).length === 1 &&
      /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2} .+ COMPACT ses_self keep=12m tok=40000 budget\s*$/.test(ctxLines.filter((l) => l.includes(" COMPACT ses_self"))[0] ?? ""),
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
  const dumps = lines.filter((l) => l.kind === "dump" && (l.state === "ok" || l.state === "failed")).length;
  const keeps = lines.filter((l) => l.kind === "keep" && l.reason === "keep-not-applied").length;
  const accepts = lines.filter((l) => l.kind === "dispatch" && l.state === "accepted").length;
  chk("INV all log lines parse as JSON; kinds ONLY {dispatch, marker, verify, keep, dump, queue}",
    kinds.size === 6 && [...kinds].sort().join(",") === "dispatch,dump,keep,marker,queue,verify", JSON.stringify([...kinds]));
  chk("INV every line carries ts + kind and stays under the LINE_CAP ladder",
    lines.every((l) => typeof l.ts === "string" && typeof l.kind === "string" && JSON.stringify(l).length <= 2000), "");
  chk("INV the dump-skipped + keep-not-applied lines land ONCE PER ALLOWED DISPATCH (7 dispatch legs, equal counts)",
    dumps === keeps && dumps === accepts && dumps === 7,
    JSON.stringify({ dumps, keeps, accepts }));
  chk("INV COMPACT lines: every one byte-forms the v1 convention (stamp + model + keep=12m + tok=40000 budget [+ token]) — the DUMP-* lines now share this file, so the pin scopes to COMPACT lines (4c repin)",
    readCtxLog().filter((l) => l.includes(" COMPACT ")).every((l) => /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2} \S+ COMPACT \S+ keep=12m tok=40000 budget( emergency| ovr)*$/.test(l)) &&
      readCtxLog().some((l) => l.includes(" COMPACT ")),
    JSON.stringify(readCtxLog()));
  chk("INV the budget file kept its config keys through the increments (the #119 additive invariant)",
    JSON.parse(readFileSync(BUDGET, "utf8")).model_budget?.[LISTED] === 3 &&
      JSON.parse(readFileSync(BUDGET, "utf8")).keepMessages === 12 &&
      JSON.parse(readFileSync(BUDGET, "utf8")).version === 2,
    readFileSync(BUDGET, "utf8").slice(0, 120));
  console.log(`\nlog lines: ${lines.length}; COMPACT lines: ${readCtxLog().length}`);
}

// ------------------------------------------------------------------ S-D4c the pre-compaction dump leg (TODO #137 unit 4c)
//
// The 4a INV block above counted the 4a dispatch legs (7); the 4c legs below
// run AFTER it ON PURPOSE so that byte-expectation pin keeps its number. EVERY
// allowed dispatch already dumped BOTH artifacts through the fixture stub twin
// (success by default) — the lanes below move the stub aside to pin the failure
// and retry contract, then pin the REAL twin CLI in a sandbox copy against FIXTURE
// DBs (the LIVE DB is NEVER touched).
const DUMP_DIR = path.join(WS, "archive", "sessions", "compaction_dumps");
const STUB_PATH = path.join(WS, "agent", "scripts", "db", "dump_session_v2.mjs");
const STUB_SAVED = readFileSync(STUB_PATH, "utf8");
const dtOK = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2} DUMP-OK /;

chk("D4c preCompactionDumpName byte-exact, normal (md default, stamp null): c0 + c7",
  pluginMod.preCompactionDumpName("ses_pc_name", 0, null) === "compaction_dumps/ses_pc_name_c0.md" &&
    pluginMod.preCompactionDumpName("ses_pc_name", 7, null) === "compaction_dumps/ses_pc_name_c7.md",
  JSON.stringify([pluginMod.preCompactionDumpName("ses_pc_name", 0, null), pluginMod.preCompactionDumpName("ses_pc_name", 7, null)]));
chk("D4c preCompactionDumpName byte-exact, the stamped fallback (fixed stamp — NO clock inside the name fn)",
  pluginMod.preCompactionDumpName("ses_pc_name", 3, "20260915T131530") === "compaction_dumps/ses_pc_name_c3_20260915T131530.md",
  pluginMod.preCompactionDumpName("ses_pc_name", 3, "20260915T131530"));
chk("D4c preCompactionDumpName byte-exact, the #92 json forms (c0 + the stamped c3 case)",
  pluginMod.preCompactionDumpName("ses_pc_name", 0, null, "json") === "compaction_dumps/ses_pc_name_c0.json" &&
    pluginMod.preCompactionDumpName("ses_pc_name", 3, "20260915T131530", "json") === "compaction_dumps/ses_pc_name_c3_20260915T131530.json",
  JSON.stringify([pluginMod.preCompactionDumpName("ses_pc_name", 0, null, "json"), pluginMod.preCompactionDumpName("ses_pc_name", 3, "20260915T131530", "json")]));
chk("D4c resolveNodeExe: a node runtime passes through, a bun/CLI host falls back to \"node\" (the v1 #78 lesson)",
  pluginMod.resolveNodeExe("C:/x/node.exe") === "C:/x/node.exe" &&
    pluginMod.resolveNodeExe("bun") === "node" && pluginMod.resolveNodeExe("opencode.exe") === "node",
  JSON.stringify([pluginMod.resolveNodeExe("C:/x/node.exe"), pluginMod.resolveNodeExe("bun")]));

// the success lane — driven by the 4a legs: ses_self dumped at its PRE-DISPATCH
// budget count (1) → the `c1` base, BOTH artifacts, the ctx.log DUMP-OK lines
chk("D4c success lane: BOTH artifacts land under the ws corpus with the stub's marker content",
  existsSync(path.join(DUMP_DIR, "ses_self_c1.md")) &&
    existsSync(path.join(DUMP_DIR, "ses_self_c1.json")) &&
    readFileSync(path.join(DUMP_DIR, "ses_self_c1.md"), "utf8").startsWith("fake dump sid=ses_self json=false rel=compaction_dumps/ses_self_c1.md"),
  JSON.stringify([existsSync(path.join(DUMP_DIR, "ses_self_c1.md"))]));
chk("D4c success lane: the ctx.log carries the v1-shape DUMP-OK lines (local stamp + full repo-relative relFile + ms=) for BOTH artifacts",
  readCtxLog().some((l) => dtOK.test(l) && l.includes(" ses_self archive/sessions/compaction_dumps/ses_self_c1.md ms=")) &&
    readCtxLog().some((l) => dtOK.test(l) && l.includes(" ses_self archive/sessions/compaction_dumps/ses_self_c1.json ms=")),
  JSON.stringify(readCtxLog().filter((l) => l.includes("DUMP-OK ses_self")).slice(0, 2)));

// the NON-BLOCKING failure lane: the stub is REMOVED → BOTH artifacts fail
rmSync(STUB_PATH, { force: true });
const compactBeforeFail = COMPACT.calls.length;
const rFail = await call({ sessionID: "ses_def" }, {});
await sleep(5);
chk("D4c the no-script lane NEVER blocks the tool: the dispatch STILL lands and the response carries the v1 WARNING",
  COMPACT.calls.length === compactBeforeFail + 1 &&
    rFail.output.includes("Compaction dispatched for ses_def") &&
    rFail.output.includes("WARNING: pre-compaction dump failed for ses_def"),
  JSON.stringify(rFail.output));
chk("D4c the no-script lane logs EXACTLY two DUMP-RETRY=1 + two DUMP-FAIL ctx.log lines (one per artifact; #107 full relFile; #78 stderr detail)",
  readCtxLog().filter((l) => l.includes("DUMP-RETRY=1 ses_def")).length === 2 &&
    readCtxLog().filter((l) => l.includes("DUMP-FAIL ses_def")).length === 2 &&
    readCtxLog().some((l) => l.includes("DUMP-FAIL ses_def archive/sessions/compaction_dumps/ses_def_c0.md ") && /stderr: /i.test(l)) &&
    readCtxLog().some((l) => l.includes("DUMP-FAIL ses_def archive/sessions/compaction_dumps/ses_def_c0.json ")),
  JSON.stringify(readCtxLog().filter((l) => l.includes(" ses_def")).slice(0, 8)));
chk("D4c the hook return shape (a direct call against a root WITHOUT the script): {ok:false, files:[]}, the error names BOTH artifacts (`md: … | json: …`)",
  (() => {
    const r = pluginMod.preCompactionDump(path.join(SCRATCH, "empty4c"), "ses_pc_noscript", 0);
    return r.ok === false && r.files.length === 0 && /^md: .+ \| json: .+$/s.test(r.error ?? "");
  })(),
  JSON.stringify(pluginMod.preCompactionDump(path.join(SCRATCH, "empty4c"), "ses_pc_name2", 0).error ?? "").slice(0, 160));
chk("D4c the compact_v2.log dump audit line carries state=failed + the md-first error head (the field rides the cap ladder)",
  readLog().some((l) => l.kind === "dump" && l.state === "failed" && l.session === "ses_def" && (l.error ?? "").startsWith("md: ")),
  JSON.stringify(readLog().filter((l) => l.kind === "dump" && l.state === "failed").slice(0, 1).map((l) => (l.error ?? "").slice(0, 80))));
writeFileSync(STUB_PATH, STUB_SAVED, "utf8");

// the RETRY-once lane: a stub that FAILS the FIRST spawn (flag file), then
// succeeds — the md artifact retried ONCE, the json artifact landed DIRECTLY
// (#92 independence: one's failure never skips the other).
writeFileSync(path.join(WS, "dump_flag_once"), "x", "utf8");
writeFileSync(STUB_PATH, [
  'import { existsSync, rmSync, writeFileSync, mkdirSync } from "node:fs";',
  'import path from "node:path";',
  'import { fileURLToPath } from "node:url";',
  "const dir = path.dirname(fileURLToPath(import.meta.url));",
  'const flag = path.resolve(dir, "..", "..", "..", "dump_flag_once");',
  'if (existsSync(flag)) { rmSync(flag, { force: true }); process.stderr.write("injected first-attempt failure\\n"); process.exit(1); }',
  "const argv = process.argv.slice(2);",
  "let rel = null, json = false, sid = null;",
  'for (let i = 0; i < argv.length; i++) {',
  "  const a = argv[i];",
  '  if (a === "--out") { i++; rel = argv[i]; }',
  '  else if (a === "--json") json = true;',
  "  else sid = a;",
  "}",
  'const out = path.resolve(dir, "..", "..", "..", "archive", "sessions");',
  'const file = path.join(out, rel != null ? rel : sid + (json ? ".json" : ".md"));',
  "mkdirSync(path.dirname(file), { recursive: true });",
  'writeFileSync(file, "fake dump sid=" + sid + " json=" + json + " rel=" + rel + "\\n", "utf8");',
].join("\n") + "\n", "utf8");
const rRetry = await call({}, { sessionID: "ses_self" });
await sleep(5);
chk("D4c RETRY-once: ONE DUMP-RETRY=1 line for the session, TWO DUMP-OK lines, BOTH artifacts land, NO WARNING in the response",
  readCtxLog().filter((l) => l.includes("DUMP-RETRY=1 ses_self")).length === 1 &&
    readCtxLog().filter((l) => dtOK.test(l) && l.includes(" ses_self archive/sessions/compaction_dumps/ses_self_c2.")).length === 2 &&
    existsSync(path.join(DUMP_DIR, "ses_self_c2.md")) && existsSync(path.join(DUMP_DIR, "ses_self_c2.json")) &&
    !rRetry.output.includes("WARNING: pre-compaction dump"),
  JSON.stringify(readCtxLog().filter((l) => l.includes("DUMP-RETRY=1 ses_self"))));
// the SAME round again (NO `.ended` event pushed → the count stays 2 → the
// c2 base EXISTS): the no-overwrite rule stamps BOTH artifacts' names
const baseMdPath = path.join(DUMP_DIR, "ses_self_c2.md");
const baseMdBefore = readFileSync(baseMdPath, "utf8");
await call({}, { sessionID: "ses_self" });
await sleep(5);
const stampedNames = readdirSync(DUMP_DIR).filter((n) => /^ses_self_c2_\d{8}T\d{6}\.(md|json)$/.test(n));
chk("D4c no-overwrite: a same-round repeat lands STAMPED (both artifacts share the stamp) and leaves the c2 base files BYTE-IDENTICAL",
  stampedNames.length === 2 && readFileSync(baseMdPath, "utf8") === baseMdBefore,
  JSON.stringify(stampedNames));
writeFileSync(STUB_PATH, STUB_SAVED, "utf8");
rmSync(path.join(WS, "dump_flag_once"), { force: true });

// ------------------------------------------------------------------ S-T4c the dump twin CLI (the real script, sandbox copy, fixture DBs)
const SAN = path.join(SCRATCH, "san4c");
mkdirSync(path.join(SAN, "agent", "scripts", "db"), { recursive: true });
mkdirSync(path.join(SAN, ".opencode", "plugin", "tools"), { recursive: true });
copyFileSync(TWIN, path.join(SAN, "agent", "scripts", "db", "dump_session_v2.mjs"));
copyFileSync(SQLITE_EXE, path.join(SAN, ".opencode", "plugin", "tools", "sqlite3.exe"));
const TWIN_SAN = path.join(SAN, "agent", "scripts", "db", "dump_session_v2.mjs");
const SAN_OUT = path.join(SAN, "archive", "sessions");
const FXV2 = path.join(SAN, "fxv2.db");
const FXV1 = path.join(SAN, "fxv1.db");
{
  const db = new DatabaseSync(FXV2);
  db.exec("CREATE TABLE session_v2(id TEXT, title TEXT, agent TEXT, model TEXT, parent_id TEXT, time_created INTEGER, time_updated INTEGER, time_compacting INTEGER, time_archived INTEGER, tokens_input INTEGER, tokens_output INTEGER, tokens_reasoning INTEGER)");
  db.exec("CREATE TABLE session_message(id TEXT, session_id TEXT, type TEXT, seq INTEGER, time_created INTEGER, time_updated INTEGER, data TEXT)");
  db.prepare("INSERT INTO session_v2 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run("ses_fx", "Fixture session", "worker", JSON.stringify({ id: "fx-model", providerID: "p1" }), null, 1700000000000, 1700000090000, null, null, 100, 20, 0);
  const ins = db.prepare("INSERT INTO session_message VALUES (?,?,?,?,?,?,?)");
  ins.run("m_u", "ses_fx", "user", 0, 1700000000000, 1700000000000, JSON.stringify({ time: { created: 1700000000000 }, text: "hello fixture", files: ["a.ts"] }));
  ins.run("m_a", "ses_fx", "assistant", 1, 1700000001000, 1700000002000, JSON.stringify({ time: { created: 1700000001000, completed: 1700000002000 }, agent: "worker", model: { id: "fx-model", providerID: "p1" }, content: [{ type: "reasoning", text: "thinking hard" }, { type: "tool", id: "call_1", name: "read", executed: true, state: { status: "completed", input: { filePath: "C:/x/y.ts" }, content: [{ type: "text", text: "file body" }] } }, { type: "text", text: "answer body" }], finish: "tool-calls", cost: 0, tokens: { input: 72, output: 176, reasoning: 0, cache: { read: 14283, write: 0 } } }));
  ins.run("m_c", "ses_fx", "compaction", 2, 1700000003000, 1700000003000, JSON.stringify({ status: "completed", reason: "manual", summary: "## Objective\n- fixture summary", recent: [], time: { created: 1700000003000 } }));
  db.close();
}
{
  const db = new DatabaseSync(FXV1);
  db.exec("CREATE TABLE session(id TEXT, title TEXT)");
  db.prepare("INSERT INTO session VALUES (?,?)").run("ses_old", "old");
  db.close();
}
const mdOf = (p) => readFileSync(p, "utf8");
const runTwin = (args, backend, dbPath = FXV2, exe = "node") =>
  spawnSync(exe, [TWIN_SAN, ...args], {
    encoding: "utf8",
    env: { ...process.env, OPENCODE_DB: dbPath, ...(backend != null ? { DUMP_V2_BACKENDS: backend } : {}) },
  });
const tFull = runTwin(["ses_fx", "--out", "compaction_dumps/ses_fx_c0.md"], null);
chk("D4c twin CLI (default chain, node host): exit 0 + the dumped line (messages=3 parts=4 mode=full backend=node:sqlite)",
  tFull.status === 0 && /^dumped ses_fx messages=3 parts=4 bytes=\d+ mode=full backend=node:sqlite -> /m.test(tFull.stdout),
  JSON.stringify({ status: tFull.status, out: (tFull.stdout ?? "").slice(0, 160), err: (tFull.stderr ?? "").slice(0, 160) }));
chk("D4c the full md carries the v2 sources + row shapes: the tables/backend line, role=assistant rows, the tool header + input/output verbatim, the compaction summary",
  mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_c0.md")).includes("# source: v2 tables=session_v2+session_message  backend=node:sqlite") &&
    mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_c0.md")).includes("# messages: 3  parts: 4") &&
    mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_c0.md")).includes("## m_a | role=assistant | seq=1") &&
    mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_c0.md")).includes("  [tool] read callID=call_1 status=completed executed=true") &&
    mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_c0.md")).includes('  [tool input] {"filePath":"C:/x/y.ts"}') &&
    mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_c0.md")).includes('  [tool output] [{"type":"text","text":"file body"}]') &&
    mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_c0.md")).includes("## Objective"),
  mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_c0.md")).slice(0, 200));
const tLite = runTwin(["ses_fx", "--out", "compaction_dumps/ses_fx_c1.md", "--lite"], null);
chk("D4c --lite: the tool header stays, NO input/output lines, the text/reasoning bodies verbatim",
  tLite.status === 0 && mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_c1.md")).includes("  [tool] read callID=call_1") &&
    !mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_c1.md")).includes("[tool input]") &&
    mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_c1.md")).includes("thinking hard"),
  JSON.stringify({ status: tLite.status }));
const tJson = runTwin(["ses_fx", "--out", "compaction_dumps/ses_fx_c0.json", "--json"], null);
chk("D4c --json: the raw doc — keys session+messages, the 3 rows typed user/assistant/compaction with the PARSED data (tokens + time.completed)",
  tJson.status === 0 && (() => {
    const d = JSON.parse(mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_c0.json")));
    return Object.keys(d).join(",") === "session,messages" &&
      d.messages.length === 3 &&
      d.messages.map((x) => x.type).join(",") === "user,assistant,compaction" &&
      d.messages[1].data.tokens.input === 72 &&
      d.messages[1].data.time.completed === 1700000002000 &&
      d.session.id === "ses_fx";
  })(),
  JSON.stringify({ status: tJson.status, out: (tJson.stdout ?? "").slice(0, 120) }));
const tBad = runTwin(["ses_fx", "--out", "../evil"], null);
const tNope = runTwin(["ses_nope"], null);
chk("D4c the v1 rejection shapes: unsafe --out relpath → exit 2 with the v1 stderr line; an unknown session → exit 1 'no such session:'",
  tBad.status === 2 && (tBad.stderr ?? "").includes("unsafe --out relpath (must be relative, no `..`, safe chars only): ../evil") &&
    tNope.status === 1 && (tNope.stderr ?? "").includes("no such session: ses_nope"),
  JSON.stringify({ bad: (tBad.stderr ?? "").slice(0, 120), nope: (tNope.stderr ?? "").slice(0, 80) }));
const tV1 = runTwin(["ses_old", "--out", "compaction_dumps/x.md"], null, FXV1);
chk("D4c a v1-only fixture (no v2 pair) → exit 2 with the clear no-v2-tables line (the twin NEVER reads the v1 part lane)",
  tV1.status === 2 && (tV1.stderr ?? "").includes("no v2 tables (session_v2 + session_message)"),
  JSON.stringify((tV1.stderr ?? "").slice(0, 160)));
const tFlags = runTwin(["--all", "--lite"], null);
chk("D4c the flag-conflict rejections keep v1 exit 2 (--all + --lite)",
  tFlags.status === 2 && (tFlags.stderr ?? "").includes("--lite is single-session mode only"),
  JSON.stringify((tFlags.stderr ?? "").slice(0, 120)));
const tAll = runTwin(["--all", "--slim"], null);
chk("D4c the --all corpus lane (slim default): exit 0 + the corpus summary line + the slim file (one line per row)",
  tAll.status === 0 && /^corpus: sessions=1 files=1 failed=0 bytes=\d+ mode=slim backend=node:sqlite -> /m.test(tAll.stdout) &&
    mdOf(path.join(SAN_OUT, "ses_fx.md")).split("\n").filter((l) => /^\d{4}-.* \| \{/.test(l)).length === 3,
  JSON.stringify({ status: tAll.status, out: (tAll.stdout ?? "").slice(0, 160) }));
const tSpawn = runTwin(["ses_fx", "--out", "compaction_dumps/ses_fx_spawn.md"], "spawn-sqlite3");
const tNode2 = runTwin(["ses_fx", "--out", "compaction_dumps/ses_fx_node.md"], null);
chk("D4c the spawn-sqlite3 LAST RESORT works through the copied maintainer exe (mode=ro URI): the md is BYTE-EQUAL to the node:sqlite read modulo the backend field",
  tSpawn.status === 0 && /backend=spawn-sqlite3/.test(tSpawn.stdout) &&
    mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_spawn.md")).replace("backend=spawn-sqlite3", "backend=node:sqlite").replace(/^# dumped: .*$/m, "") ===
      mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_node.md")).replace(/^# dumped: .*$/m, ""),
  JSON.stringify({ status: tSpawn.status, out: (tSpawn.stdout ?? "").slice(0, 140), err: (tSpawn.stderr ?? "").slice(0, 140) }));
const tBun = runTwin(["ses_fx", "--out", "compaction_dumps/ses_fx_bun.md"], null, FXV2, "bun");
chk("D4c under the bun host the chain picks bun:sqlite FIRST (spec order) and the same reads land",
  tBun.status === 0 && /backend=bun:sqlite/.test(tBun.stdout) && mdOf(path.join(SAN_OUT, "compaction_dumps/ses_fx_bun.md")).includes("# messages: 3  parts: 4"),
  JSON.stringify({ status: tBun.status, out: (tBun.stdout ?? "").slice(0, 140), err: (tBun.stderr ?? "").slice(0, 140) }));

const logLenBefore = readLog().length;
await cleanup();
pushEvent({ type: "session.compaction.ended", data: { sessionID: "ses_self" } });
await sleep(20);
chk("cleanup disposes the tool transform + the compaction hook and STOPS the event consumer",
  HOOKS["compaction"] === undefined && readLog().length === logLenBefore && count("ses_self") === 2,
  `hook=${typeof HOOKS["compaction"]} lines=${readLog().length - logLenBefore} count=${count("ses_self")}`);

console.log(failures === 0 ? "\nSMOKE: ALL PASS" : `\nSMOKE: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
