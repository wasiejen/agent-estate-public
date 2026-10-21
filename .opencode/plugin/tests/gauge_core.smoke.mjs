// gauge_core.smoke.mjs — the gauge core parseWindow/parseModelId fixtures
// (scratchpad origin: pw_test.mjs, moved per the 2026-09-15_smoke-harness-home
// proposal; the old `.opencode/ctxgauge/gauge.mjs` reference is rewired to the
// current location `.opencode/plugin/scripts/gauge.mjs`) + the item 3
// (2026-09-24) "N compactions left" budget suffix (the 3 states + fail-open
// — the budget store steered at temp fixtures via setBudgetFileForTest) +
// the v2-migration unit 1 (2026-10-21) TABLE-AWARE SESSION-ROW read pins:
// the v1 `session` table / the `session_v2` table / an id in NEITHER / the
// coexisting newest form / a DB with no session table (fixture DBs under
// the scratchpad; NEVER the live DB).
// Run: node .opencode/plugin/tests/gauge_core.smoke.mjs (plain node, exit 0 iff green).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite"; // v2unit1: the fixture-DB read pins
import { loadRepo, freshSandbox } from "./_smoke_base.mjs";

const m = await loadRepo(".opencode/plugin/scripts/gauge.mjs");
const cases = [
  ["Qwen3.8-27B-IQ4KT-100K", 100_000],
  ["Qwen3.8-27B-IQ3KT-120K_MTP", 120_000],
  ["Qwen3.8-27B-IQ3KT-120K_MTP:chat", 120_000],
  ["some-model_210K", 210_000],
  ["some-model_120K-MTP", 120_000],
  ["x-256K", 256_000],
  ["x-1.5M", 1_500_000],
  ["CPU-Qwen3-0.6B", undefined],
  ["no-suffix-at-all", undefined],
  [null, undefined],
  [42, undefined],
];
let fail = 0;
for (const [inp, want] of cases) {
  const got = m.parseWindow(inp);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} parseWindow(${JSON.stringify(inp)}) = ${got} (want ${want})`);
}
console.log("parseModelId JSON:", m.parseModelId('{"id":"Qwen3.8-27B-IQ4KT-100K","providerID":"llama-swap"}'));
console.log("parseModelId plain:", m.parseModelId("plain-id"));
console.log("parseModelId bad:", JSON.stringify(m.parseModelId("{not-json")));

// ---- #115 (2026-09-28): resolveWindow — the window is CONFIG-FIRST.
// The fixture is a real JSONC file (line + block comments, trailing
// commas, a `//` INSIDE a string literal — a broken string-aware strip
// would break the parse → the fallback → the pins below fail), steered
// via setConfigFileForTest (the setBudgetFileForTest pattern). Pins:
// (a) config hit beats the name marker; (b) no-marker model + config →
// the config value; (c) model not in the config → the name parse;
// (d) config file missing → the name parse; (e) the JSONC config (comments
// incl. a `//` inside a string) parses; (f) no provider prefix → the
// name-parse fallback.
const tmpC = freshSandbox("gauge_window_config");
const cfx = path.join(tmpC, "opencode.jsonc");
fs.writeFileSync(
  cfx,
  [
    "// fixture JSONC config (real comments + trailing commas)",
    "{",
    "  /* a block comment */",
    '  "provider": {',
    '    "fx": {',
    '      "name": "fx provider",',
    '      "options": {',
    '        "baseURL": "http://127.0.0.1:8033/v1" // a // INSIDE a string literal',
    "      },",
    '      "models": {',
    '        "x-256K": {',
    '          "limit": { "context": 999999 },',
    "        },",
    '        "no-marker": {',
    '          "limit": { "context": 123456 },',
    "        },",
    '        "tricky-100K": {',
    '          "limit": { "context": 777777 } // tail comment',
    "        },",
    "      },",
    "    },",
    "  },",
    "}",
  ].join("\n"),
  "utf-8",
);
m.setConfigFileForTest(cfx);
const chkW = (label, inp, want) => {
  const got = m.resolveWindow(inp);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} resolveWindow(${JSON.stringify(inp)}) = ${got} (want ${want}) // ${label}`);
};
chkW("(a) config hit beats the name marker", "fx/x-256K", 999999);
chkW("(b) no-marker model + config → the config value", "fx/no-marker", 123456);
chkW("(e) JSONC config with comments (incl. a // inside a string) parses", "fx/tricky-100K", 777777);
chkW("(c) model not in the config → the name parse", "fx/other-256K", 256000);
m.setConfigFileForTest(path.join(tmpC, "absent.jsonc")); // never created
chkW("(d) config file missing → the name parse", "fx/x-256K", 256000);
m.setConfigFileForTest(cfx);
chkW("(f) no provider prefix → the name-parse fallback", "x-256K", 256000);
chkW("non-string → undefined (the parseWindow contract)", null, undefined);
fs.rmSync(tmpC, { recursive: true, force: true });

// ---- item 3 (2026-09-24): the "N compactions left" budget suffix — the 3
// states + fail-open. remaining = max(0, cap - count) + 1 iff the emergency
// 1 is still available (count === cap && effective emergency_budget >= 1 —
// key absent → fail-open default 1). The cap resolves like compact_memory's
// resolveCap (exact bare-model-id key, else default, else 1). The store is
// steered at temp fixtures (the setBudgetFileForTest hook).
const tmpB = fs.mkdtempSync(path.join(os.tmpdir(), "gauge_budget_"));
const bfx = path.join(tmpB, "budget.json");
const MB3 = { "probe-model-256K_MTP": 3, default: 1 };
const wb = (count, eb) => {
  const rec = { model_budget: MB3, sessions: { ses_fx_ok: { count, updated: "fx", model: "probe-model-256K_MTP" } } };
  if (eb !== undefined) rec.emergency_budget = eb;
  fs.writeFileSync(bfx, JSON.stringify(rec), "utf-8");
  m.setBudgetFileForTest(bfx);
};
const R_OK = { ok: true, kind: "ok", sid: "ses_fx_ok", modelId: "probe-model-256K_MTP", total: 12345, output: 2345, ctx: 12345, window: 256000 }; // #103: ctx = total (in+out+cr)
const R_NOTAL = { ok: false, kind: "no-total", sid: "ses_fx_ok", modelId: "" };
const base = "SESSION=ses_fx_ok CTX=12345 (4%) REM=243655";
const chkS = (label, want) => {
  const got = m.formatGauge(R_OK);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${got} (want ${want})`);
};
wb(0);
chkS("state 1 (count 0 < cap 3)", `${base} | 3 compactions left`);
wb(3);
chkS("state 2 (count === cap, emergency key ABSENT → default 1)", `${base} | 1 compaction left`);
wb(4);
chkS("state 3 (count 4 > cap 3 — fully exhausted)", `${base} | 0 compactions left`);
wb(3, 0);
chkS("state 2b (count === cap, emergency_budget 0 explicit)", `${base} | 0 compactions left`);
// #132 (2026-10-01): the SILENT built-in cap-1 fallback — model unlisted /
// empty + no finite `model_budget.default` key → the marker ` (unlisted)`
// after `left` (both entry points: the map present-without-default and the
// map key entirely absent).
{
  const rec = { model_budget: { "probe-model-120K_MTP": 2 }, sessions: { ses_fx_ok: { count: 0, updated: "fx", model: "probe-model-256K_MTP" } } };
  fs.writeFileSync(bfx, JSON.stringify(rec), "utf-8");
  m.setBudgetFileForTest(bfx);
  chkS("silent fallback (model unlisted, map present, NO default key): ` | 1 compaction left (unlisted)`", `${base} | 1 compaction left (unlisted)`);
}
{
  const rec = { sessions: { ses_fx_ok: { count: 0, updated: "fx", model: "probe-model-256K_MTP" } } };
  fs.writeFileSync(bfx, JSON.stringify(rec), "utf-8");
  m.setBudgetFileForTest(bfx);
  chkS("silent fallback (model_budget key entirely ABSENT): ` | 1 compaction left (unlisted)`", `${base} | 1 compaction left (unlisted)`);
}
m.setBudgetFileForTest(path.join(tmpB, "absent.json")); // never created
chkS("fail-open (budget file missing → no suffix)", base);
wb(0);
{
  const got = m.formatGauge(R_NOTAL);
  const want = "SESSION=ses_fx_ok CTX=notAvailable | 3 compactions left";
  const ok = got === want; // the no-total read falls back to the entry's model
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} no-total (modelId '' → entry-model fallback): ${got} (want ${want})`);
}
// #114 (2026-09-28): a no-total read now carries the SESSION ROW's model as
// its modelId — the suffix uses it (count 0 < cap 3 → 3), ahead of the
// entry-model fallback.
{
  const got = m.formatGauge({ ok: false, kind: "no-total", sid: "ses_fx_ok", modelId: "probe-model-256K_MTP" });
  const want = "SESSION=ses_fx_ok CTX=notAvailable | 3 compactions left";
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} no-total (modelId = session-row model → model_budget key): ${got} (want ${want})`);
}
fs.rmSync(tmpB, { recursive: true, force: true });

// ---- v2-migration unit 1 (2026-10-21): the TABLE-AWARE SESSION-ROW read.
// Fixtures: three DBs under the scratchpad (the freshSandbox pattern —
// fixture DBs ONLY, NEVER the live DB). Pins, one per read form: (1) the v1
// `session` table — the v1 read stays green (sid + model id + the token
// mass); (2) the `session_v2` table — sid + the JSON-unwrapped model id +
// the resolved limit (`window`, the LIMITS half — the token leg is unit 2,
// so this read lands as no-total); (3) an id present in NEITHER table —
// the existing not-found outcome; (4) the coexisting DB, newest form — the
// greater `time_updated` wins; (5) a DB with NEITHER session table — the
// v1 hard-failure (db-error) outcome preserved.
{
  const d = freshSandbox("gauge_v2_read");
  const mk = (name, stmts) => {
    const db = new DatabaseSync(path.join(d, name));
    for (const s of stmts) db.exec(s);
    db.close();
  };
  mk("fx_v1.db", [
    "CREATE TABLE session(id TEXT PRIMARY KEY, model TEXT, time_updated INTEGER)",
    "INSERT INTO session VALUES('ses_v1_fx','plain-v1-model-100K',1000)",
    "CREATE TABLE message(id TEXT, session_id TEXT, time_created INTEGER, time_updated INTEGER, data TEXT)",
    `INSERT INTO message VALUES('msg_v1','ses_v1_fx',1,1,'{"finish":"stop","tokens":{"total":43210,"output":999}}')`,
  ]);
  mk("fx_v2.db", [
    "CREATE TABLE session_v2(id TEXT PRIMARY KEY, model TEXT, time_updated INTEGER)",
    `INSERT INTO session_v2 VALUES('ses_v2_fx','{"id":"fx-v2-model-120K","providerID":"llama-swap"}',2000)`,
  ]);
  mk("fx_both.db", [
    "CREATE TABLE session(id TEXT PRIMARY KEY, model TEXT, time_updated INTEGER)",
    "INSERT INTO session VALUES('ses_old_fx','old-v1-model-64K',1000)",
    "CREATE TABLE session_v2(id TEXT PRIMARY KEY, model TEXT, time_updated INTEGER)",
    `INSERT INTO session_v2 VALUES('ses_new_fx','{"id":"new-v2-model-170K","providerID":"llama-swap"}',2000)`,
  ]);
  mk("fx_none.db", ["CREATE TABLE junk(x INTEGER)"]);
  const chkR = (label, ok, detail = "") => {
    if (!ok) fail++;
    console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail !== "" ? `: ${detail}` : ""}`);
  };
  const r1 = await m.readGauge(path.join(d, "fx_v1.db"), "ses_v1_fx");
  chkR(
    "v2unit1 read form 1 (v1 `session` table): sid+modelId+mass stay green",
    r1.ok === true && r1.sid === "ses_v1_fx" && r1.modelId === "plain-v1-model-100K" && r1.total === 43210 && r1.window === 100000,
    JSON.stringify(r1),
  );
  const r2 = await m.readGauge(path.join(d, "fx_v2.db"), "ses_v2_fx");
  chkR(
    "v2unit1 read form 2 (`session_v2` table): id+model(JSON-unwrapped)+limit, no-total (mass = unit 2)",
    r2.ok === false && r2.kind === "no-total" && r2.sid === "ses_v2_fx" && r2.modelId === "fx-v2-model-120K" && r2.window === 120000,
    JSON.stringify(r2),
  );
  const r3 = await m.readGauge(path.join(d, "fx_both.db"), "ses_absent_fx");
  chkR(
    "v2unit1 read form 3 (id in NEITHER table): the existing not-found outcome",
    r3.ok === false && r3.kind === "no-total" && r3.sid === "unknown" && r3.modelId === "",
    JSON.stringify(r3),
  );
  const r4 = await m.readGauge(path.join(d, "fx_both.db"));
  chkR(
    "v2unit1 read form 4 (coexisting DB, newest form): the greater time_updated wins",
    r4.sid === "ses_new_fx" && r4.modelId === "new-v2-model-170K" && r4.window === 170000,
    JSON.stringify(r4),
  );
  const r5 = await m.readGauge(path.join(d, "fx_none.db"), "ses_x");
  chkR(
    "v2unit1 read form 5 (NEITHER session table): the v1 db-error outcome preserved",
    r5.ok === false && r5.kind === "db-error" && r5.sid === "unknown",
    JSON.stringify(r5),
  );
}

console.log(fail === 0 ? "GAUGE_CORE_SMOKE: ALL PASS" : `GAUGE_CORE_SMOKE: ${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
