// compact_memory.smoke.mjs — the plugin-registered compaction tool.
// FOLDED from the scratchpad smokes cm_v2_smoke.mjs (no-client core) +
// qc_smoke/smoke.mjs (S13 plugin smoke) per the 2026-09-15_smoke-harness-home
// proposal. Adapted at build time to the 2026-09-14 FIRE-AND-FORGET build of
// .opencode/plugin/compact_memory.ts (the source of truth):
//   - `execute` returns the DISPATCH line (never a success claim); the budget
//     increment + the COMPACT line land ONLY in the async success callback, so
//     side-effect assertions run after a `drain` (~25 ms — local stubs settle
//     on microtasks well before that).
//   - the retry-keep note + the background failure go to console.log /
//     console.error — captured, not returned.
//   - the arg shape is FOUR keys (unit A, 2026-09-21: providerID/modelID
//     REMOVED — the summarizer resolves from the root config's
//     agent.compaction.model, falling back to the session model; 2026-09-25
//     #99: keepTokens RETURNS — the dispatch-time resolution (computed
//     primary from the last keepMessages messages' tokens, budget-file
//     keepTokens fallback, else omitted) is sent as keep.tokens in the
//     body + logged on the COMPACT line; keepMessages still drives the
//     computation; item 10: the `emergency` arg — the once-per-session
//     emergency compaction on top of the model cap).
//   - the sandbox carries a stub dump_session.cjs so the pre-compaction dump hook (4512fe6) succeeds silently (a dump failure would append a WARNING line and break the byte-exact checks) — mirrors the probe S13 preamble (#92 2026-09-27: the hook saves BOTH artifacts — the md + the raw json — the rel-driven stub serves both unchanged).
// Idempotent re-runs: the sandbox is a FRESH scratchpad subdir each run.
// Run: node .opencode/plugin/tests/compact_memory.smoke.mjs (plain node, exit 0 iff green).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, freshSandbox, loadRepo, makeChecker } from "./_smoke_base.mjs";

const SANDBOX = freshSandbox("compact_memory");
mkdirSync(path.join(SANDBOX, ".opencode", "temp"), { recursive: true });
const { chk, finish } = makeChecker("COMPACT_MEMORY_SMOKE");

// The pre-compaction dump hook (4512fe6, TODO #152; #92 2026-09-27: BOTH
// artifacts — the md + the raw json, each independently) fires on EVERY
// dispatch and spawns <SANDBOX>/agent/scripts/db/dump_session.cjs.
// The stub below (mirrors the probe S13 preamble) makes every dump SUCCEED,
// so the hook appends nothing to the byte-exact response checks (a missing
// script would append a WARNING line and break them). The stub is rel-driven
// (ignores --json) → it serves BOTH artifacts unchanged.
const FAKE_DUMP = `// probe fake dump — mimics dump_session.cjs's __dirname OUT_DIR + --out
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const OUT_DIR = path.resolve(__dirname, "..", "..", "..", "archive", "sessions");
const argv = process.argv.slice(2);
let sid = null, rel = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--out") { rel = argv[++i]; }
  else if (!argv[i].startsWith("-")) { sid = argv[i]; }
}
if (!sid || rel == null) { console.error("fake-dump: need <sid> --out <rel>"); process.exit(2); }
const file = path.join(OUT_DIR, rel);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, "FAKE DUMP of " + sid + "\\n");
`;
const DUMP_SCRIPT = path.join(SANDBOX, "agent", "scripts", "db", "dump_session.cjs");
mkdirSync(path.dirname(DUMP_SCRIPT), { recursive: true });
writeFileSync(DUMP_SCRIPT, FAKE_DUMP, "utf8");

const drain = (ms = 25) => new Promise((r) => setTimeout(r, ms));
// Captures console.log + console.error across an async fn (the fire-and-forget
// notes/errrors are terminal output, not response text).
const captureConsole = (fn) => {
  const logs = [], errors = [];
  const ol = console.log, oe = console.error;
  console.log = (...a) => logs.push(a.map(String).join(" "));
  console.error = (...a) => errors.push(a.map(String).join(" "));
  return Promise.resolve()
    .then(fn)
    .then(
      (res) => { console.log = ol; console.error = oe; return { res, logs, errors }; },
      (err) => { console.log = ol; console.error = oe; throw err; },
    );
};
// The exact dispatch line (byte form per the plugin source — em dash included).
const dispatchLine = (sid, which, model) =>
  `Compaction dispatched for ${sid} (background, fire-and-forget) — the ${which} call was sent (model: ${model}); the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success.`;

const storePath = path.join(SANDBOX, ".opencode", "temp", "compact_budget.json");
const logPath = path.join(SANDBOX, ".opencode", "temp", "ctx.log");
const readStore = () =>
  existsSync(storePath) ? JSON.parse(readFileSync(storePath, "utf8")) : { version: 2, sessions: {} };
const readLog = () => (existsSync(logPath) ? readFileSync(logPath, "utf8") : "");

// ---- the compaction-config seed (consolidation 2026-09-22): the caps are
// CONFIGURED in the sandbox budget file's top-level model_budget map (bare
// model id → cap + the "default" key). writeBudget stringifies the WHOLE
// parsed object, so this key survives every budget increment below.
writeFileSync(storePath, JSON.stringify({
  version: 2,
  sessions: {},
  model_budget: { "Qwen3.8-27B-IQ4KT-120K": 3, "Qwen-IQ3-Test": 5, default: 1 },
}, null, 2) + "\n");

const mod = await loadRepo(".opencode/plugin/compact_memory.ts");
const factory = mod.default;
chk("default export is the async plugin factory", typeof factory === "function" && factory.constructor.name === "AsyncFunction");
chk("named export resolveCap is a function", typeof mod.resolveCap === "function");
chk("named export readCompactionConfig is a function", typeof mod.readCompactionConfig === "function");

// ---- cap fixtures (model_budget map — the CPU guard is the SAFETY
// INVARIANT; an unlisted / typo'd id simply never matches → the configured
// default)
{
  const c = (name) => mod.resolveCap(SANDBOX, name);
  chk("cap exact model_budget key -> configured 5", c("Qwen-IQ3-Test").cap === 5 && c("Qwen-IQ3-Test").label === "model_budget");
  chk("cap configured model id -> 3 (the configured value for that model ID)", c("Qwen3.8-27B-IQ4KT-120K").cap === 3 && c("Qwen3.8-27B-IQ4KT-120K").label === "model_budget");
  chk("cap unlisted model -> configured default 1", c("Mystery-7B").cap === 1 && c("Mystery-7B").label === "model_budget default");
  chk("cap typo key -> configured default 1 (wrong key never matches)", c("Qwen-IQ3-Test-typO").cap === 1);
  chk("cap CPU -> 0 (excluded — the safety invariant)", c("CPU-Qwen3-0.6B").cap === 0 && c("CPU-Qwen3-0.6B").label === "cpu (excluded)");
}

// ---- readCompactionConfig fail-open (absent file / malformed keys →
// defaults; valid keys win)
{
  const emptyRoot = freshSandbox("compact_memory_cfg");
  const c0 = mod.readCompactionConfig(emptyRoot);
  chk("cfg absent file -> defaults 12/false/{}", c0.keepMessages === 12 && c0.emergencyRecovery === false && JSON.stringify(c0.model_budget) === "{}");
  const p = path.join(emptyRoot, ".opencode", "temp");
  mkdirSync(p, { recursive: true });
  writeFileSync(path.join(p, "compact_budget.json"), `{"keepMessages": 9, "emergencyRecovery": true, "model_budget": {"M": 5, "bad": "x", "neg": -1}}`, "utf8");
  const c1 = mod.readCompactionConfig(emptyRoot);
  chk("cfg valid keys win + bad values skipped (bad/neg dropped, valid kept)",
    c1.keepMessages === 9 && c1.emergencyRecovery === true && c1.model_budget.M === 5 && c1.model_budget.bad == null && c1.model_budget.neg == null,
    JSON.stringify(c1));
  writeFileSync(path.join(p, "compact_budget.json"), `{ oops — not json`, "utf8");
  const c2 = mod.readCompactionConfig(emptyRoot);
  chk("cfg unparseable file -> defaults (never throws)", c2.keepMessages === 12 && c2.emergencyRecovery === false);
}

// ---- the dump hook's node resolver (the live host's execPath is the opencode
// CLI binary, not a node runtime — a wrong spawn fails the dump safely but the
// corpus dump would never happen; plain node paths must pass through untouched)
{
  const r = mod.resolveNodeExe;
  chk("resolveNodeExe: plain node path passes through unchanged",
    r("C:\\Program Files\\nodejs\\node.exe") === "C:\\Program Files\\nodejs\\node.exe",
    JSON.stringify(r("C:\\Program Files\\nodejs\\node.exe")));
  chk("resolveNodeExe: opencode CLI binary falls back to the PATH 'node'",
    r("C:\\x\\opencode.exe") === "node",
    JSON.stringify(r("C:\\x\\opencode.exe")));
  const live = r();
  chk("resolveNodeExe(): live default basename starts with 'node' (plain-node smoke host)",
    typeof live === "string" && path.basename(live).toLowerCase().startsWith("node"),
    JSON.stringify(live));
}

// ---- client stubs (recording; error specs per call count)
const makeClient = (spec = {}) => {
  const rec = { summarize: [], compact: [], messages: [], prompt: [] };
  const client = { session: {} };
  if (spec.summarize) client.session.summarize = (o) => {
    rec.summarize.push(o);
    if (spec.summarizeError != null) {
      const e = typeof spec.summarizeError === "function" ? spec.summarizeError(rec.summarize.length) : spec.summarizeError;
      if (e != null) return Promise.reject(e); // null = this call is clean (the retry)
    }
    return Promise.resolve(true); // the handler's real return: boolean true
  };
  if (spec.compact) client.session.compact = (o) => { rec.compact.push(o); return Promise.resolve(true); };
  if (spec.messages != null || spec.messagesError) client.session.messages = (o) => {
    rec.messages.push(o);
    if (spec.messagesError) return Promise.reject(spec.messagesError);
    return Promise.resolve(spec.messages);
  };
  if (spec.promptAsync) client.session.promptAsync = (o) => { rec.prompt.push(o); return Promise.resolve(true); };
  return { client, rec };
};
const toolCtx = (over = {}) => ({ sessionID: "ses_sm_self", directory: SANDBOX, extra: { model: { id: "Qwen3.8-27B-IQ4KT-120K", providerID: "llama-swap" } }, ...over });
const withClient = async (spec = {}) => {
  const { client, rec } = makeClient(spec);
  const reg = await factory({ client });
  const t = reg.tool.compact_memory;
  return { rec, t, exec: (args, extra) => t.execute(args, toolCtx(extra)) };
};

// ---- registration shape (unit A: FOUR args — the override pair is GONE,
// the tokens keep knob is GONE, the emergency arg added (item 10))
{
  const { t } = await withClient({ summarize: true });
  chk("factory returns { tool: { compact_memory } }", t != null);
  chk("reg shape: description string + async execute", typeof t.description === "string" && typeof t.execute === "function" && t.execute.constructor.name === "AsyncFunction");
  chk("reg args: FOUR keys (sessionID, keepMessages, message, emergency)",
    JSON.stringify(Object.keys(t.args)) === JSON.stringify(["sessionID", "keepMessages", "message", "emergency"]),
    JSON.stringify(Object.keys(t.args)));
  chk("reg args: every value is a zod schema (safeParse)", Object.values(t.args).every((s) => typeof s.safeParse === "function"));
}

// ---- self summarize success (the ACTIVE path on this build)
{
  const { rec, exec } = await withClient({ summarize: true });
  const res = await exec({ keepMessages: 7 });
  await drain();
  chk("summarize dispatched: call recorded (path + body.keep.messages only, NO tokens key + providerID/modelID)",
    rec.summarize.length === 1 && rec.summarize[0].path.id === "ses_sm_self" &&
    rec.summarize[0].body.keep.messages === 7 && rec.summarize[0].body.keep.tokens == null &&
    rec.summarize[0].body.providerID === "llama-swap" && rec.summarize[0].body.modelID === "Qwen3.8-27B-IQ4KT-120K",
    JSON.stringify(rec.summarize[0]));
  chk("response IS the dispatch line (never a success claim)", res === dispatchLine("ses_sm_self", "summarize", "Qwen3.8-27B-IQ4KT-120K"), JSON.stringify(res.slice(0, 160)));
  const st = readStore();
  chk("budget increment-on-verified-success (count 1 after drain)", st.sessions.ses_sm_self?.count === 1, JSON.stringify(st.sessions.ses_sm_self));
  const line = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_self"));
  chk("COMPACT line written with model field + keep args (#99: resolved keepTokens + source — none here)", line != null && / COMPACT ses_sm_self keep=7m tok=- none$/.test(line) && line.includes("Qwen3.8-27B-IQ4KT-120K"), JSON.stringify(line));
   const dumpFile = path.join(SANDBOX, "archive", "sessions", "compaction_dumps", "ses_sm_self_c0.md");
   chk("dump hook fired on the tool path: compaction_dumps/ses_sm_self_c0.md exists (the stub dump, no WARNING appended)", existsSync(dumpFile), dumpFile);
   const DT = "\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}";
   const dumpOk = readLog().trim().split("\n").find((l) => l.includes("DUMP-OK ses_sm_self"));
    // #78 re-pin: the elapsed-ms field gained the `ms=` prefix (was bare `<ms>`);
    // #107 re-pin: the relFile is now the FULL repo-relative dump path
    chk("DUMP-OK line on success: `<stamp> DUMP-OK ses_sm_self archive/sessions/compaction_dumps/ses_sm_self_c0.md ms=<ms>` (#107 full repo-relative path)",
      dumpOk != null && new RegExp(`^${DT} DUMP-OK ses_sm_self archive/sessions/compaction_dumps/ses_sm_self_c0\\.md ms=\\d+$`).test(dumpOk),
      JSON.stringify(dumpOk));
   // #92 (2026-09-27): the pre-compaction dump saves BOTH artifacts — the md
   // (above) AND the raw JSON snapshot (the lossless master). The md DUMP-OK
   // line is written first, so the `.find` above still returns the md line —
   // the json line is matched byte-exact (the anchored regex only the json
   // rel can satisfy).
   const dumpJsonFile = path.join(SANDBOX, "archive", "sessions", "compaction_dumps", "ses_sm_self_c0.json");
   chk("dump hook fired on the tool path (#92): compaction_dumps/ses_sm_self_c0.json exists (the json artifact, the stub dump)", existsSync(dumpJsonFile), dumpJsonFile);
    const dumpOkJson = readLog().trim().split("\n").find((l) => new RegExp(`^${DT} DUMP-OK ses_sm_self archive/sessions/compaction_dumps/ses_sm_self_c0\\.json ms=\\d+$`).test(l));
    chk("DUMP-OK line on success (#92): `<stamp> DUMP-OK ses_sm_self archive/sessions/compaction_dumps/ses_sm_self_c0.json ms=<ms>` (the json artifact line, #107 full repo-relative path)",
     dumpOkJson != null,
     JSON.stringify(dumpOkJson));
 }

// ---- keep rejected once -> retried without keep (the note is console.log'd)
{
  const boom = Object.assign(new Error("404 unexpected field"), { status: 404 });
  const { rec, exec } = await withClient({ summarize: true, summarizeError: (n) => (n === 1 ? boom : null) });
  const { res, logs } = await captureConsole(async () => {
    const r = await exec({ keepMessages: 3, sessionID: "ses_sm_retry" });
    await drain();
    return r;
  });
  chk("retry once w/o keep (2nd call carries providerID/modelID)",
    rec.summarize.length === 2 && rec.summarize[0].body.keep.messages === 3 && rec.summarize[0].body.keep.tokens == null && rec.summarize[1].body.keep == null &&
    rec.summarize[1].body.providerID === "llama-swap" && rec.summarize[1].body.modelID === "Qwen3.8-27B-IQ4KT-120K",
    JSON.stringify(rec.summarize));
  chk("retry note is console.log'd (not in the response)",
    logs.some((l) => l === "compact_memory (ses_sm_retry): keep not accepted by this build (retried without the keep fields)"),
    JSON.stringify(logs));
  chk("response is still the dispatch line + the cross-model note",
    /dispatched/i.test(res) && !/compacted/i.test(res) && res.includes("cross-session model read unavailable"),
    JSON.stringify(res.slice(0, 160)));
  chk("retry success consumed the budget exactly once", readStore().sessions.ses_sm_retry?.count === 1);
}

// ---- v2 compact path (flat parameters; no keep fields)
{
  const { rec, exec } = await withClient({ summarize: true, compact: true });
  const res = await exec({ keepMessages: 2, sessionID: "ses_sm_v2" });
  await drain();
  chk("compact branch wins: flat call, no summarize",
    rec.compact.length === 1 && rec.compact[0].sessionID === "ses_sm_v2" && rec.summarize.length === 0,
    JSON.stringify(rec.compact));
  chk("v2 response: dispatch line naming the compact call", res.includes(dispatchLine("ses_sm_v2", "compact", "Qwen3.8-27B-IQ4KT-120K")) && !/compacted/i.test(res), JSON.stringify(res.slice(0, 160)));
  chk("v2 success consumed the budget (model recorded)", readStore().sessions.ses_sm_v2?.count === 1 && readStore().sessions.ses_sm_v2?.model === "Qwen3.8-27B-IQ4KT-120K");
}

// ---- the config-resolved summarizer (unit A: agent.compaction.model — the
// root config is read PER CALL from the sandbox root: opencode.jsonc first,
// opencode.json second, "" when neither; the file is removed after each case
// so the other cases see the fallback path)
const CFG_PATH = path.join(SANDBOX, "opencode.jsonc");
{
  const { rec, exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "Session-Model-120K", providerID: "llama-swap" } }] });
  writeFileSync(CFG_PATH, `{\n  // root config (JSONC)\n  "agent": { "compaction": { "model": "llama-swap/Gemma4-12B-Q4KXL-MTP-128K" } }\n}`, "utf8");
  const res = await exec({ sessionID: "ses_sm_cfg", keepMessages: 3 });
  await drain();
  rmSync(CFG_PATH, { force: true });
  chk("config set: summarize body carries the CONFIG pair (not the session model)",
    rec.summarize.length === 1 && rec.summarize[0].path.id === "ses_sm_cfg" &&
    rec.summarize[0].body.providerID === "llama-swap" && rec.summarize[0].body.modelID === "Gemma4-12B-Q4KXL-MTP-128K" &&
    rec.summarize[0].body.keep.messages === 3 && rec.summarize[0].body.keep.tokens == null,
    JSON.stringify(rec.summarize[0]));
  chk("config set: dispatch line names the config model + budget under the target id",
    res === dispatchLine("ses_sm_cfg", "summarize", "Gemma4-12B-Q4KXL-MTP-128K") && readStore().sessions.ses_sm_cfg?.count === 1,
    JSON.stringify(res.slice(0, 160)));
}
{
  const { rec, exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "IQ4-fb", providerID: "llama-swap" } }] });
  writeFileSync(CFG_PATH, `{\n  // "agent": {\n  //   "compaction": { "model": "llama-swap/Gemma4-12B-Q4KXL-MTP-128K" }\n  // },\n  "models": {}\n}`, "utf8");
  await exec({ sessionID: "ses_sm_cfgco", keepMessages: 1 });
  await drain();
  rmSync(CFG_PATH, { force: true });
  chk("config commented-out: the FALLBACK session-model pair is used (comment-aware JSONC parse)",
    rec.summarize.length === 1 && rec.summarize[0].body.providerID === "llama-swap" && rec.summarize[0].body.modelID === "IQ4-fb",
    JSON.stringify(rec.summarize[0]));
}
{
  const { rec, exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "IQ4-fb", providerID: "llama-swap" } }] });
  writeFileSync(CFG_PATH, "{ oops — not json", "utf8");
  await exec({ sessionID: "ses_sm_cfgbad", keepMessages: 1 });
  await drain();
  rmSync(CFG_PATH, { force: true });
  chk("config malformed (unparseable): the FALLBACK session-model pair is used (never throws)",
    rec.summarize.length === 1 && rec.summarize[0].body.providerID === "llama-swap" && rec.summarize[0].body.modelID === "IQ4-fb",
    JSON.stringify(rec.summarize[0]));
}

// ---- no-client core (cm_v2 folded): never throws, names the probes, ZERO
// side effects
{
  const reg = await factory({}); // no client, no api
  let threw = false, res = "";
  try {
    res = await reg.tool.compact_memory.execute({ keepMessages: 12, sessionID: "ses_sm_nocli" }, toolCtx({ sessionID: "ses_sm_nocli" }));
    await drain();
  } catch (e) { threw = true; res = String(e); }
  chk("no-client path never throws", !threw, res);
  chk("no-client error names what was probed",
    /Compaction request failed/.test(res) && /compact/i.test(res) && /summarize/i.test(res) && /function/i.test(res),
    res);
  chk("no-client: budget NOT consumed", readStore().sessions.ses_sm_nocli == null, JSON.stringify(readStore().sessions));
  chk("no-client: no COMPACT line", !readLog().includes("COMPACT ses_sm_nocli"));
}

// ---- gate: CPU is cap 0 (excluded — the safety invariant): a PLAIN call
// (no `emergency` arg) is always denied, zero side effects (SELF shape —
// the cap-0 corner below pins the ONE slot a cap-0 model still gets)
{
  const { rec, exec } = await withClient({ summarize: true });
  const res = await exec({ sessionID: "ses_sm_cpu" },
    { sessionID: "ses_sm_cpu", extra: { model: { id: "CPU-Qwen3-0.6B", providerID: "llama-swap" } } });
  await drain();
  chk("cpu denied (self, no emergency arg): no call, no budget entry, cap 0 named",
    rec.summarize.length === 0 && readStore().sessions.ses_sm_cpu == null && /refused/i.test(res) && res.includes("cap 0") && /hand over/i.test(res),
    res);
}

// ---- gate: the cap-0 corner (TODO #128 corrected fact): at cap 0 the
// gate ALLOWS one EMERGENCY self compact (count 0 === cap 0 && the
// `emergency` arg) — under "the same as self" a cap-0 CROSS caller gets
// exactly 1 as well (0 < effCap 1). NO special CPU denial — the uniform
// arithmetic (flagged to the maintainer).
{
  const cpuSelfCtx = { sessionID: "ses_sm_cpu_s", extra: { model: { id: "CPU-Qwen3-0.6B", providerID: "llama-swap" } } };
  const { exec: execCs } = await withClient({ summarize: true });
  const c1 = await execCs({ keepMessages: 1, sessionID: "ses_sm_cpu_s", emergency: true }, cpuSelfCtx);
  await drain();
  const c2 = await execCs({ keepMessages: 1, sessionID: "ses_sm_cpu_s", emergency: true }, cpuSelfCtx);
  await drain();
  chk("cpu cap-0 (g): self@0 + emergency dispatched (count 1 — the once-per-session emergency at cap 0), then refused (fully exhausted)",
    /dispatched/i.test(c1) && readStore().sessions.ses_sm_cpu_s?.count === 1 &&
      /refused/i.test(c2) && /fully exhausted/i.test(c2) && readStore().sessions.ses_sm_cpu_s?.count === 1,
    JSON.stringify({ c1: String(c1).slice(0, 80), c2: String(c2).slice(0, 160) }));
  const { exec: execCx } = await withClient({ summarize: true, messages: [{ info: { modelID: "CPU-Qwen3-0.6B", providerID: "llama-swap" } }] });
  const x1 = await execCx({ keepMessages: 1, sessionID: "ses_sm_cpu_x" });
  await drain();
  const x2 = await execCx({ keepMessages: 1, sessionID: "ses_sm_cpu_x" });
  await drain();
  const lineCx = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_cpu_x keep=1m tok=- none ovr"));
  chk("cpu cap-0 (g): cross@0 dispatched (0 < effCap 1 — the override slot at cap 0), the COMPACT line carries `ovr`, then refused at 1 (the override named consumed)",
    /dispatched/i.test(x1) && readStore().sessions.ses_sm_cpu_x?.count === 1 && lineCx != null &&
      /refused/i.test(x2) && /override slot is consumed/i.test(x2) && readStore().sessions.ses_sm_cpu_x?.count === 1,
    JSON.stringify({ x1: String(x1).slice(0, 80), x2: String(x2).slice(0, 160), lineCx }));
}

// ---- gate: cross-session model read (LAST entry of the messages RPC)
{
  const { rec, exec } = await withClient({ summarize: true, messages: [{ info: { model: "user-x" } }, { info: { modelID: "Qwen3.8-27B-IQ3KT-210K", providerID: "llama-swap" } }] });
  const res = await exec({ keepMessages: 1, sessionID: "ses_sm_cross" });
  await drain();
  const st = readStore();
  chk("cross model read: last entry, IQ3 cap 1, one increment (#99: TWO messages reads — the model pair + the keepTokens resolution)",
    rec.messages.length === 2 && rec.messages[0].path.id === "ses_sm_cross" &&
    st.sessions.ses_sm_cross?.model === "Qwen3.8-27B-IQ3KT-210K" && st.sessions.ses_sm_cross?.count === 1 && /dispatched/i.test(res) && !/compacted/i.test(res),
    JSON.stringify(st.sessions.ses_sm_cross));
}

// ---- gate: cross-session model read — DUAL SHAPE: the in-process client's
// RequestResult wrapper { data: [...] } resolves IDENTICALLY to the bare
// array (the bare-array case above stays the regression pin)
{
  const { rec, exec } = await withClient({ summarize: true, messages: { data: [{ info: { modelID: "Qwen3.8-27B-IQ3KT-210K", providerID: "llama-swap" }, parts: [] }] } });
  const res = await exec({ keepMessages: 1, sessionID: "ses_sm_crosswrap" });
  await drain();
  const st = readStore();
  chk("cross model read ({ data } wrapper): same resolution — model + providerID, empty note, IQ3 cap 1, one increment (#99: TWO messages reads)",
    rec.messages.length === 2 && rec.messages[0].path.id === "ses_sm_crosswrap" &&
    st.sessions.ses_sm_crosswrap?.model === "Qwen3.8-27B-IQ3KT-210K" && st.sessions.ses_sm_crosswrap?.count === 1 &&
    /dispatched/i.test(res) && !/compacted/i.test(res) && !/model read/i.test(res),
    JSON.stringify(st.sessions.ses_sm_crosswrap));
}

// ---- cross read FAILED (RPC error): the request is NOT sent, note in response
{
  const { exec } = await withClient({ summarize: true, messagesError: new Error("boom-rpc") });
  let threw = false, res = "";
  try { res = await exec({ keepMessages: 1, sessionID: "ses_sm_rpc" }); await drain(); } catch { threw = true; }
  chk("rpc fail: not sent, never throws, note names the read failure, no budget",
    !threw && /no resolvable model/i.test(res) && /NOT sent/i.test(res) && /model read/i.test(res) && readStore().sessions.ses_sm_rpc == null,
    String(res).slice(0, 160));
}

// ---- the `message` arg (unit A → item 2, 2026-09-24): NO promptAsync at
// queue time (the maintainer's temp fix 0f192e5 stays in place — the
// prompt is not sent at queue time); the message is STORED — one
// per-session file under .opencode/temp/ — and is delivered at RESUME
// time by the auto_resume unit-4 CONTINUE relay. The response STILL
// carries the queued note (the relay makes it true now). RE-PINNED
// 2026-09-24 (item 2).
{
  const { rec, exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "IQ4-x", providerID: "llama-swap" } }], promptAsync: true });
  const res = await exec({ message: "resume unit-3", sessionID: "ses_sm_msg" });
  await drain();
  chk("message arg: NO promptAsync at queue time (item 2: the message is STORED — delivered at RESUME time by the auto-resume relay)",
    rec.prompt.length === 0,
    JSON.stringify(rec.prompt));
  chk("message arg: response = the dispatch line + the queued note (the message itself NOT in the response)",
    res === `${dispatchLine("ses_sm_msg", "summarize", "IQ4-x")}\nThe message was queued for ses_sm_msg (delivered on its resume).` && !res.startsWith("resume unit-3"),
    JSON.stringify(res));
  chk("message arg (item 2): the message is STORED per-session (.opencode/temp/compact_message_<sid>, content exact)",
    existsSync(path.join(SANDBOX, ".opencode", "temp", "compact_message_ses_sm_msg")) &&
      readFileSync(path.join(SANDBOX, ".opencode", "temp", "compact_message_ses_sm_msg"), "utf-8") === "resume unit-3", "");
  chk("message arg: budget incremented under the target id", readStore().sessions.ses_sm_msg?.count === 1);
}
// ---- message WITHOUT promptAsync on the client (item 2 re-pin): the
// relay is client-independent (the delivery is the auto-resume
// plugin's promptAsync at resume time, not the tool client's) — the
// message is STILL stored, response = dispatch line + the queued note
// (the old NOT-queued WARNING is gone).
{
  const { rec, exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "IQ4-y", providerID: "llama-swap" } }] });
  const res = await exec({ message: "resume unit-4", sessionID: "ses_sm_nomsg" });
  await drain();
  chk("no promptAsync at queue time (item 2): NO prompt sent, the message is STILL stored for the relay, response = dispatch line + the queued note (the WARNING is gone)",
    rec.prompt.length === 0 &&
      res === `${dispatchLine("ses_sm_nomsg", "summarize", "IQ4-y")}\nThe message was queued for ses_sm_nomsg (delivered on its resume).` &&
      existsSync(path.join(SANDBOX, ".opencode", "temp", "compact_message_ses_sm_nomsg")) &&
      readFileSync(path.join(SANDBOX, ".opencode", "temp", "compact_message_ses_sm_nomsg"), "utf-8") === "resume unit-4",
    JSON.stringify(res));
}

// ---- gate: the IQ4 cap-3 gate (CROSS shape — ctx ses_sm_self != the
// target, the no-messages fallback uses the caller's model): 4 dispatched
// (the 4th = the caller-scoped override at count == cap), the 5th refused
// (count 4 == cap+1 — the override named consumed), increment-on-verified-success
{
  const { rec, exec } = await withClient({ summarize: true });
  let res4 = "";
  for (let i = 0; i < 4; i++) {
    res4 = await exec({ keepMessages: 1, sessionID: "ses_sm_gate" });
    await drain();
  }
  const res5 = await exec({ keepMessages: 1, sessionID: "ses_sm_gate" });
  await drain();
  chk("gate (cross, cap 3): calls 1-4 dispatched (the 4th = the override at count == cap), the 5th refused (cap 3, 4/3, the override named consumed, hand-over note)",
    rec.summarize.length === 4 && /dispatched/i.test(res4) && /refused/i.test(res5) && res5.includes("cap 3") && res5.includes("4/3") &&
      /override slot is consumed/i.test(res5) && /hand over/i.test(res5),
    res5.slice(0, 160));
  chk("gate (cross, cap 3): exactly 4 increments (the override slot counts once)", readStore().sessions.ses_sm_gate?.count === 4);
  const lineGateOvr = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_gate keep=1m tok=- none ovr"));
  chk("gate (cross, cap 3, Part 3): the 4th line carries `ovr`, the first 3 carry NO `ovr` (exactly 3 bare lines)",
    lineGateOvr != null && /COMPACT ses_sm_gate keep=1m tok=- none ovr$/.test(lineGateOvr) &&
      readLog().trim().split("\n").filter((l) => l.includes("COMPACT ses_sm_gate keep=1m tok=- none") && !l.includes(" ovr")).length === 3,
    JSON.stringify(lineGateOvr));
}

// ---- gate: the EMERGENCY-1 budget (item 10, 2026-09-24) + the
// caller-scoped CROSS override (TODO #128, ruling 2026-09-30): a CROSS
// caller (an explicit sessionID != the calling session) gets an effective
// cap of cap + 1 — the total spendable stays THE SAME AS SELF (cap + the
// one emergency): cross at count == cap dispatches via the override slot
// (the `emergency` arg is moot), cross at count == cap + 1 stays REFUSED
// (no second slot). The SELF emergency semantics are UNCHANGED (the self
// refusal wording stays pinned). Fixture: model_budget { "Gate-M": 2 },
// emergency_budget 1 (then 0, then absent — the fail-open default 1). The
// fixture is RESTORED before the later tests (their self-model cap 3 must
// survive).
{
  const st0 = readStore();
  const savedMb = st0.model_budget;
  const savedEb = st0.emergency_budget;
  st0.model_budget = { "Gate-M": 2, default: 1 };
  st0.emergency_budget = 1;
  writeFileSync(storePath, JSON.stringify(st0, null, 2) + "\n");
  const selfCtx = (sid) => ({ sessionID: sid, extra: { model: { id: "Gate-M", providerID: "llama-swap" } } });

  // ---- CROSS shape (ctx ses_sm_self != the target — the override)
  const { exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "Gate-M", providerID: "llama-swap" } }] });
  const r1 = await exec({ keepMessages: 2, sessionID: "ses_sm_emg" });
  await drain();
  const r2 = await exec({ keepMessages: 2, sessionID: "ses_sm_emg" });
  await drain();
  chk("xovr: calls 1-2 dispatched (count 2 == cap)",
    /dispatched/i.test(r1) && /dispatched/i.test(r2) && readStore().sessions.ses_sm_emg?.count === 2,
    JSON.stringify({ r1: String(r1).slice(0, 80), r2: String(r2).slice(0, 80) }));
  const r3 = await exec({ keepMessages: 2, sessionID: "ses_sm_emg" });
  await drain();
  const lineOvr = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_emg keep=2m tok=- none ovr"));
  const lineNorm = readLog().trim().split("\n").filter((l) => l.includes("COMPACT ses_sm_emg keep=2m tok=- none") && !l.includes(" ovr") && !l.includes(" emergency"));
  chk("xovr (a): cross@count==cap (no arg) dispatched via the override (count 3 == cap+1), the COMPACT line carries `ovr` (Part 3)",
    /dispatched/i.test(r3) && readStore().sessions.ses_sm_emg?.count === 3 && lineOvr != null &&
      /COMPACT ses_sm_emg keep=2m tok=- none ovr$/.test(lineOvr),
    JSON.stringify({ r3: String(r3).slice(0, 80), lineOvr }));
  chk("xovr (Part 3): the calls 1-2 lines carry NO `ovr` / NO ` emergency` (exactly 2 bare lines, keep=2m tok=- none)",
    lineNorm.length === 2 && lineNorm.every((l) => /COMPACT ses_sm_emg keep=2m tok=- none$/.test(l)),
    JSON.stringify(lineNorm));
  const r3e = await exec({ keepMessages: 2, sessionID: "ses_sm_emg", emergency: true });
  await drain();
  chk("xovr (c): cross@count==cap+1 refused (the override slot is named consumed — no second slot), count stays 3",
    /refused/i.test(r3e) && r3e.includes("cap 2") && r3e.includes("3/2") && /override slot is consumed/i.test(r3e) &&
      /fully exhausted/i.test(r3e) && readStore().sessions.ses_sm_emg?.count === 3,
    r3e.slice(0, 220));
  // (b) cross@count==cap WITH the emergency arg: dispatched via the plain
  // pass — the arg is MOOT (one increment, `ovr` and NO ` emergency`)
  const xb1 = await exec({ keepMessages: 2, sessionID: "ses_sm_xb" });
  await drain();
  const xb2 = await exec({ keepMessages: 2, sessionID: "ses_sm_xb" });
  await drain();
  const rb = await exec({ keepMessages: 2, sessionID: "ses_sm_xb", emergency: true });
  await drain();
  const lineB = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_xb keep=2m tok=- none ovr"));
  chk("xovr (b): cross@count==cap with emergency:true dispatched (same store state — one increment, count 3), `ovr` and NO ` emergency`",
    /dispatched/i.test(rb) && readStore().sessions.ses_sm_xb?.count === 3 && lineB != null && !lineB.includes(" emergency"),
    JSON.stringify({ rb: String(rb).slice(0, 80), lineB }));

  // ---- SELF shape (ctx sessionID == the target): the emergency-1
  // regressions (d/e/f) — the SELF refusal wording stays UNCHANGED
  const { exec: execS } = await withClient({ summarize: true, messages: [{ info: { modelID: "Gate-M", providerID: "llama-swap" } }] });
  await execS({ keepMessages: 2, sessionID: "ses_sm_emgs" }, selfCtx("ses_sm_emgs"));
  await drain();
  await execS({ keepMessages: 2, sessionID: "ses_sm_emgs" }, selfCtx("ses_sm_emgs"));
  await drain();
  const rd = await execS({ keepMessages: 2, sessionID: "ses_sm_emgs" }, selfCtx("ses_sm_emgs"));
  await drain();
  chk("emg-self (d): self@count==cap (no arg) refused, naming the `emergency`-arg availability (wording unchanged)",
    /refused/i.test(rd) && rd.includes("cap 2") && rd.includes("2/2") && /hand over/i.test(rd) &&
      rd.includes("`emergency` argument") && readStore().sessions.ses_sm_emgs?.count === 2,
    rd.slice(0, 220));
  const re = await execS({ keepMessages: 2, sessionID: "ses_sm_emgs", emergency: true }, selfCtx("ses_sm_emgs"));
  await drain();
  const lineE = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_emgs keep=2m tok=- none emergency"));
  chk("emg-self (e): self@count==cap emergency:true dispatched (count 3), the COMPACT line carries ` emergency` and NO `ovr`",
    /dispatched/i.test(re) && readStore().sessions.ses_sm_emgs?.count === 3 && lineE != null &&
      /COMPACT ses_sm_emgs keep=2m tok=- none emergency$/.test(lineE) && !lineE.includes("ovr"),
    JSON.stringify({ re: String(re).slice(0, 80), lineE }));
  const rf = await execS({ keepMessages: 2, sessionID: "ses_sm_emgs", emergency: true }, selfCtx("ses_sm_emgs"));
  await drain();
  chk("emg-self (f): self@count==cap+1 refused (fully exhausted), count stays 3",
    /refused/i.test(rf) && rf.includes("cap 2") && rf.includes("3/2") && /fully exhausted/i.test(rf) &&
      readStore().sessions.ses_sm_emgs?.count === 3,
    rf.slice(0, 220));

  // state survives a FRESH module instance (cache-busted re-import — the
  // count lives on disk, not in module memory): still refused (self shape,
  // count 3 > cap 2)
  const { pathToFileURL } = await import("node:url");
  const freshMod = await import(pathToFileURL(path.join(REPO_ROOT, ".opencode", "plugin", "compact_memory.ts")).href + "?cm_emg_reimport=1");
  const freshClient = { session: { summarize: () => Promise.resolve(true) } };
  const freshT = (await freshMod.default({ client: freshClient })).tool.compact_memory;
  const rFresh = await freshT.execute({ keepMessages: 2, sessionID: "ses_sm_emg", emergency: true },
    toolCtx({ sessionID: "ses_sm_emg", extra: { model: { id: "Gate-M", providerID: "llama-swap" } } }));
  chk("emg: state survives a fresh module instance (re-import still refuses — the count is on disk)",
    /refused/i.test(rFresh) && /fully exhausted/i.test(rFresh),
    rFresh.slice(0, 220));
  // emergency_budget 0: the override is UNCONDITIONAL (eb 0 removes only the
  // SELF emergency) — a CROSS caller is STILL dispatched at count == cap
  // (the `emergency` arg is moot), then refused at cap+1
  const stA = readStore();
  stA.emergency_budget = 0;
  writeFileSync(storePath, JSON.stringify(stA, null, 2) + "\n");
  const { exec: exec0 } = await withClient({ summarize: true, messages: [{ info: { modelID: "Gate-M", providerID: "llama-swap" } }] });
  await exec0({ keepMessages: 1, sessionID: "ses_sm_emg0" });
  await drain();
  await exec0({ keepMessages: 1, sessionID: "ses_sm_emg0" });
  await drain();
  const r0 = await exec0({ keepMessages: 1, sessionID: "ses_sm_emg0", emergency: true });
  await drain();
  const line0 = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_emg0 keep=1m tok=- none ovr"));
  chk("emg0: emergency_budget 0 → a CROSS caller is STILL dispatched at count == cap (the override is unconditional, the arg is moot), the `ovr` line, count 3",
    /dispatched/i.test(r0) && readStore().sessions.ses_sm_emg0?.count === 3 && line0 != null,
    JSON.stringify({ r0: String(r0).slice(0, 80), line0 }));
  const r0b = await exec0({ keepMessages: 1, sessionID: "ses_sm_emg0", emergency: true });
  await drain();
  chk("emg0: the 4th call refused (count 3 == cap+1 — the override named consumed, the emergency unavailable)",
    /refused/i.test(r0b) && r0b.includes("cap 2") && r0b.includes("3/2") && /override slot is consumed/i.test(r0b) &&
      /unavailable or already consumed/i.test(r0b) && readStore().sessions.ses_sm_emg0?.count === 3,
    r0b.slice(0, 220));
  // key ABSENT → the fail-open default 1 applies: the SELF emergency IS
  // consumed (SELF shape — the cross override would dispatch regardless of
  // eb, so the fail-open default is only observable on the self path)
  const stB = readStore();
  delete stB.emergency_budget;
  writeFileSync(storePath, JSON.stringify(stB, null, 2) + "\n");
  const { exec: execD } = await withClient({ summarize: true, messages: [{ info: { modelID: "Gate-M", providerID: "llama-swap" } }] });
  await execD({ keepMessages: 1, sessionID: "ses_sm_emgdf" }, selfCtx("ses_sm_emgdf"));
  await drain();
  await execD({ keepMessages: 1, sessionID: "ses_sm_emgdf" }, selfCtx("ses_sm_emgdf"));
  await drain();
  const rD = await execD({ keepMessages: 1, sessionID: "ses_sm_emgdf", emergency: true }, selfCtx("ses_sm_emgdf"));
  await drain();
  const lineD = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_emgdf keep=1m tok=- none emergency"));
  chk("emg-default: emergency_budget key ABSENT → fail-open default 1 (the self emergency is consumed, count → cap+1), the ` emergency` line, NO `ovr`",
    /dispatched/i.test(rD) && readStore().sessions.ses_sm_emgdf?.count === 3 && lineD != null && !lineD.includes("ovr"),
    JSON.stringify({ rD: String(rD).slice(0, 80), lineD }));
  // restore the fixture for the later tests
  const stR = readStore();
  stR.model_budget = savedMb;
  if (savedEb === undefined) delete stR.emergency_budget; else stR.emergency_budget = savedEb;
  writeFileSync(storePath, JSON.stringify(stR, null, 2) + "\n");
}

// ---- keep defaults from the budget file config (consolidation 2026-09-22):
// keepMessages seeds the COMPACT line when the arg is omitted; the explicit
// arg STILL wins over the file config (the key is removed again after the
// case so the later fixtures see the defaults)
{
  const st = readStore();
  st.keepMessages = 9;
  writeFileSync(storePath, JSON.stringify(st, null, 2) + "\n");
  const { exec } = await withClient({ summarize: true });
  await exec({ sessionID: "ses_sm_keepcfg" });
  await drain();
  const line = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_keepcfg"));
  chk("config keep: COMPACT line reports the configured keep=9m when the arg is omitted (#99: tok=- none — the seed store has no keepTokens)",
    line != null && /COMPACT ses_sm_keepcfg keep=9m tok=- none$/.test(line),
    JSON.stringify(line));
  await exec({ keepMessages: 2, sessionID: "ses_sm_keepargs" });
  await drain();
  const line2 = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_keepargs"));
  chk("config keep: explicit keep arg still wins over the file config (#99: keep=2m tok=- none)",
    line2 != null && /COMPACT ses_sm_keepargs keep=2m tok=- none$/.test(line2),
    JSON.stringify(line2));
  const st2 = readStore();
  delete st2.keepMessages;
  writeFileSync(storePath, JSON.stringify(st2, null, 2) + "\n");
}

// ---- failing background compaction: NO increment, the failure is console.error'd
{
  const { rec, exec } = await withClient({ summarize: true, summarizeError: new Error("boom-plain") });
  const { res, errors } = await captureConsole(async () => {
    const r = await exec({ keepMessages: 1, sessionID: "ses_sm_fail" });
    await drain();
    return r;
  });
  const crossNote = "cross-session model read unavailable (no client.session.messages) — the calling session's model is used for the budget class";
  chk("fail: the response is STILL the dispatch line + cross note (never a success claim, never a failure)",
    res === `${dispatchLine("ses_sm_fail", "summarize", "Qwen3.8-27B-IQ4KT-120K")}\n${crossNote}`, JSON.stringify(res.slice(0, 160)));
  chk("fail: console.error names the session + the server message",
    errors.some((l) => l.includes("FAILED for ses_sm_fail") && l.includes("boom-plain")),
    JSON.stringify(errors));
  chk("fail: NO budget increment, NO COMPACT line, exactly one call attempted",
    rec.summarize.length === 1 && readStore().sessions.ses_sm_fail == null && !readLog().includes("COMPACT ses_sm_fail"));
}

// ---- zombie guard (2026-09-30, compact-message-delivery item 2): a
// VERIFIED dispatch failure deletes the queued message file — the
// write-before-dispatch no longer leaves a zombie the relay would
// deliver on the next recovery idle (file presence ≠ a compaction
// happened).
{
  const { rec, exec } = await withClient({ summarize: true, summarizeError: new Error("boom-zombie") });
  const qz = path.join(SANDBOX, ".opencode", "temp", "compact_message_ses_sm_zombie");
  const { res, errors } = await captureConsole(async () => {
    const r = await exec({ keepMessages: 1, sessionID: "ses_sm_zombie", message: "resume-zombie" });
    await drain();
    return r;
  });
  const crossNote = "cross-session model read unavailable (no client.session.messages) — the calling session's model is used for the budget class";
  chk("zombie: a queued message on a FAILED dispatch is DELETED (no zombie file; the response is unchanged)",
    !existsSync(qz) &&
      res === `${dispatchLine("ses_sm_zombie", "summarize", "Qwen3.8-27B-IQ4KT-120K")}\nThe message was queued for ses_sm_zombie (delivered on its resume).\n${crossNote}`,
    JSON.stringify(res.slice(0, 160)));
  chk("zombie: the failure is console.error'd + NO increment, NO COMPACT line (the compaction never happened)",
    errors.some((l) => l.includes("FAILED for ses_sm_zombie") && l.includes("boom-zombie")) &&
      readStore().sessions.ses_sm_zombie == null && !readLog().includes("COMPACT ses_sm_zombie"),
    JSON.stringify(errors));
}

// ---- v2 schema + lenient v1 read (the schema bump lands on the next write)
{
  const st = readStore();
  const e = st.sessions.ses_sm_gate;
  chk("v2 schema: version 2, count 4 (the cross override slot consumed once), parseable ts, model recorded",
    st.version === 2 && e.count === 4 && !Number.isNaN(Date.parse(e.updated)) && e.model === "Qwen3.8-27B-IQ4KT-120K",
    JSON.stringify({ v: st.version, e }));
  // the synthetic v1 fixture also carries the top-level model_budget config
  // (a real v1 file never had it — the point is the LENIENT read of the
  // old shape + the bump on write; the config key is read alongside)
  const v1 = { version: 1, maxPerSession: 2, model_budget: { "Qwen-IQ4-X": 3, default: 1 }, sessions: { ses_sm_v1: { count: 1, updated: "2026-09-01T00:00:00.000Z" } } };
  writeFileSync(storePath, JSON.stringify(v1, null, 2) + "\n");
  const { exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "Qwen-IQ4-X", providerID: "llama-swap" } }] });
  const res = await exec({ keepMessages: 1, sessionID: "ses_sm_v1" });
  await drain();
  const st2 = readStore();
  chk("lenient v1 read + bump on write (count 1 -> 2, model from the messages read)",
    /dispatched/i.test(res) && st2.version === 2 && st2.sessions.ses_sm_v1.count === 2 && st2.sessions.ses_sm_v1.model === "Qwen-IQ4-X",
    JSON.stringify(st2));
}

// ---- the dump spawn's stderr capture (#78: "ignore" → "pipe" — a DUMP-FAIL
// now carries the child's stderr; the child writes one stdout line + repo
// files, so no pipe-buffer risk at the measured tens-of-ms dump cost; pinned
// on the source — the live spawn is exercised by the DUMP-OK case above)
{
  const src = readFileSync(path.join(REPO_ROOT, ".opencode", "plugin", "compact_memory.ts"), "utf8");
  const spawnIdx = src.indexOf("execFileSync(resolveNodeExe()");
  const spawn = src.slice(spawnIdx, spawnIdx + 260);
  chk("dump spawn: stdio 'pipe' (stderr capture for the DUMP-FAIL detail)",
    spawnIdx >= 0 && /stdio:\s*"pipe"/.test(spawn),
    spawn);
}

// ---- #99 (2026-09-25; metric v2 2026-09-26): the dispatch-time
// keepTokens resolution — the PROVIDER-TOKEN MASS of the last keepMessages
// messages is the PRIMARY (the S-diff: per assistant message S = tokens.input
// + tokens.output + tokens.cache.read is the CUMULATIVE context size after
// the call — the window's mass ≈ S[last assistant in the window] − S[last
// assistant strictly before the window]), sent as keep.tokens in the body +
// logged on the COMPACT line; the BYTES/4 PART MASS (part bytes ÷ 4, usage
// fields for entries without parts) is the FALLBACK when the window has no
// assistant entry or the diff is ≤ 0 (drift); the budget file's keepTokens
// is the FALLBACK when the read fails or the sum is 0, else NONE
// (keep.tokens omitted — the host config default applies). The seed store
// has no keepTokens — any seeded key is RESTORED after the case.
{
  // COMPUTED (S-diff): the wrapper-shape { data: [...] } fake carries a
  // TOKEN SERIES on the assistants (S = input + output + cache.read — the
  // cumulative context size after each call). The window (last 2 of 4) =
  // [user, assistant-B (S 300 + 200 + 2000 = 2500)]; the last assistant
  // strictly BEFORE the window = assistant-A (zero in/out row, S 1000) →
  // S-diff = 2500 − 1000 = 1500 (machine-computed 2026-09-26)
  const { rec, exec } = await withClient({
    summarize: true,
    messages: { data: [
      { info: { role: "user", modelID: "m", providerID: "llama-swap" } },
      { info: { role: "assistant", modelID: "m", providerID: "llama-swap", tokens: { input: 0, output: 0, cache: { read: 1000 } } } },
      { info: { role: "user", modelID: "m", providerID: "llama-swap" } },
      { info: { role: "assistant", modelID: "m", providerID: "llama-swap", tokens: { input: 300, output: 200, cache: { read: 2000 } } } },
    ] },
  });
  await exec({ keepMessages: 2, sessionID: "ses_sm_toks" });
  await drain();
  chk("keepTokens computed (S-diff): body keep.tokens = S(last assistant in window) − S(last assistant before window) = 2500 − 1000 = 1500",
    rec.summarize.length === 1 && rec.summarize[0].body.keep.tokens === 1500 && rec.summarize[0].body.keep.messages === 2,
    JSON.stringify(rec.summarize[0]));
  const lineToks = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_toks"));
  chk("keepTokens computed (S-diff): COMPACT line `keep=2m tok=1500 computed`",
    lineToks != null && /COMPACT ses_sm_toks keep=2m tok=1500 computed$/.test(lineToks),
    JSON.stringify(lineToks));
}
{
  // BYTES/4 FALLBACK: the assistants carry NO token object (zero rows — the
  // S-diff is 0) but WITH parts → the bytes/4 part-mass metric wins — each
  // counted message: 2 text parts of 8000 chars (2 × 8025 part bytes) →
  // Math.round(16050 / 4) = 4013; the last 2 of 3 → 8026 (machine-computed
  // 2026-09-26)
  const { rec, exec } = await withClient({
    summarize: true,
    messages: { data: [
      { info: { role: "user", modelID: "m", providerID: "llama-swap" }, parts: [ { type: "text", text: "u".repeat(8000) }, { type: "text", text: "v".repeat(8000) } ] },
      { info: { role: "assistant", modelID: "m", providerID: "llama-swap" }, parts: [ { type: "text", text: "w".repeat(8000) }, { type: "text", text: "x".repeat(8000) } ] },
      { info: { role: "assistant", modelID: "m", providerID: "llama-swap" }, parts: [ { type: "text", text: "y".repeat(8000) }, { type: "text", text: "z".repeat(8000) } ] },
    ] },
  });
  await exec({ keepMessages: 2, sessionID: "ses_sm_tokfb" });
  await drain();
  chk("keepTokens bytes/4 fallback: assistants WITHOUT tokens (zero rows) but WITH parts → the part-mass metric wins (Σ part bytes ÷ 4, rounded per message)",
    rec.summarize.length === 1 && rec.summarize[0].body.keep.tokens === 8026 && rec.summarize[0].body.keep.messages === 2,
    JSON.stringify(rec.summarize[0]));
  const lineFb = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_tokfb"));
  chk("keepTokens bytes/4 fallback: COMPACT line `keep=2m tok=8026 computed`",
    lineFb != null && /COMPACT ses_sm_tokfb keep=2m tok=8026 computed$/.test(lineFb),
    JSON.stringify(lineFb));
}
{
  // BUDGET FALLBACK: the messages read FAILS — the budget file's keepTokens
  // wins (SELF exec: the model pair comes from extra.model, so the failed
  // read only kills the computed path)
  const st = readStore();
  st.keepTokens = 30000;
  writeFileSync(storePath, JSON.stringify(st, null, 2) + "\n");
  const { rec, exec } = await withClient({ summarize: true, messagesError: new Error("boom-rpc-keep") });
  await exec({ keepMessages: 4 });
  await drain();
  chk("keepTokens budget: read fails → body keep.tokens = the budget file's keepTokens",
    rec.summarize.length === 1 && rec.summarize[0].body.keep.tokens === 30000 && rec.summarize[0].body.keep.messages === 4,
    JSON.stringify(rec.summarize[0]));
  const selfLines = readLog().trim().split("\n").filter((l) => l.includes("COMPACT ses_sm_self"));
  const lastSelf = selfLines.length > 0 ? selfLines[selfLines.length - 1] : null;
  chk("keepTokens budget: COMPACT line `keep=4m tok=30000 budget`",
    lastSelf != null && /COMPACT ses_sm_self keep=4m tok=30000 budget$/.test(lastSelf),
    JSON.stringify(lastSelf));
  const st2 = readStore();
  delete st2.keepTokens;
  writeFileSync(storePath, JSON.stringify(st2, null, 2) + "\n");
}
{
  // COMPUTED SUM 0 → BUDGET: messages present but WITHOUT token info — the
  // sum is 0, so the budget file's keepTokens wins
  const st = readStore();
  st.keepTokens = 12345;
  writeFileSync(storePath, JSON.stringify(st, null, 2) + "\n");
  const { rec, exec } = await withClient({ summarize: true, messages: [{ info: { role: "user", modelID: "m", providerID: "llama-swap" } }] });
  await exec({ keepMessages: 3, sessionID: "ses_sm_tokzero" });
  await drain();
  chk("keepTokens sum-0: body keep.tokens = the budget file's keepTokens (the computed sum was 0)",
    rec.summarize.length === 1 && rec.summarize[0].body.keep.tokens === 12345,
    JSON.stringify(rec.summarize[0]));
  const lineZero = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_tokzero"));
  chk("keepTokens sum-0: COMPACT line `tok=12345 budget`",
    lineZero != null && /COMPACT ses_sm_tokzero keep=3m tok=12345 budget$/.test(lineZero),
    JSON.stringify(lineZero));
  const st2 = readStore();
  delete st2.keepTokens;
  writeFileSync(storePath, JSON.stringify(st2, null, 2) + "\n");
}
{
  // NONE: no messages on the client, no keepTokens in the seed store —
  // keep.tokens is OMITTED (the host config default applies)
  const { rec, exec } = await withClient({ summarize: true });
  await exec({ keepMessages: 5, sessionID: "ses_sm_toknone" });
  await drain();
  chk("keepTokens none: body keep.tokens omitted (the host config default applies)",
    rec.summarize.length === 1 && rec.summarize[0].body.keep.tokens == null && rec.summarize[0].body.keep.messages === 5,
    JSON.stringify(rec.summarize[0]));
  const lineNone = readLog().trim().split("\n").find((l) => l.includes("COMPACT ses_sm_toknone"));
  chk("keepTokens none: COMPACT line `keep=5m tok=- none`",
    lineNone != null && /COMPACT ses_sm_toknone keep=5m tok=- none$/.test(lineNone),
    JSON.stringify(lineNone));
}

// ---- #119 (2026-09-29): the CONFIG-ONLY file (no sessions block) survives
// the first increment — the 2026-09-29 mid-run incident: the lenient read
// fell through to the fresh v2 object for a file WITHOUT a `sessions` key,
// and the first increment rewrote the whole file, destroying autoCompact /
// saturationThreshold / keepTokens / keepMessages / emergencyRecovery /
// emergency_budget / model_budget. Acceptance: the increment leaves ONLY
// the sessions block changed (additive) + the version bump — every
// pre-existing top-level key survives byte-for-byte in value.
{
  const cfg = {
    autoCompact: true,
    saturationThreshold: 0.85,
    outputReserve: 4000,
    keepTokens: 30000,
    keepMessages: 12,
    emergencyRecovery: true,
    emergency_budget: 1,
    model_budget: { "Survive-M": 2, default: 1 },
  };
  writeFileSync(storePath, JSON.stringify(cfg, null, 2) + "\n");
  const { exec } = await withClient({ summarize: true, messages: [{ info: { modelID: "Survive-M", providerID: "llama-swap" } }] });
  const res = await exec({ keepMessages: 1, sessionID: "ses_sm_survive" });
  await drain();
  const stS = readStore();
  chk("#119: config-only file (NO sessions block) -> the increment preserves ALL pre-existing top-level config keys",
    /dispatched/i.test(res) &&
      stS.autoCompact === true && stS.saturationThreshold === 0.85 && stS.outputReserve === 4000 &&
      stS.keepTokens === 30000 && stS.keepMessages === 12 && stS.emergencyRecovery === true &&
      stS.emergency_budget === 1 && stS.model_budget["Survive-M"] === 2 && stS.model_budget.default === 1,
    JSON.stringify(stS));
  chk("#119: ONLY the sessions block changed (one new entry, count 1, model recorded) + version bumped to 2",
    stS.version === 2 && stS.sessions.ses_sm_survive.count === 1 && stS.sessions.ses_sm_survive.model === "Survive-M" &&
      Object.keys(stS.sessions).length === 1,
    JSON.stringify(stS.sessions));
}

finish();
