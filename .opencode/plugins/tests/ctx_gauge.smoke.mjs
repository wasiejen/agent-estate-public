// ctx_gauge.smoke.mjs — TODO #137 unit 5b: the v2 ctx_gauge plugin smoke.
// bun, MOCK ctx — no opencode process. Pins the DoD 1/4 contract of
// `.opencode/plugins/ctx_gauge.ts`: the loader shape {id:'ctx_gauge', setup} +
// the `tool.transform`/`editor.add` registration (one OPTIONAL `sessionID`
// string arg, string output promise execute, teardown disposes the registration,
// NO hooks), the readout forms carried from v1 IN-BAND (the named-session read,
// the EMPTY/non-string-sessionID default read, the no-total `CTX=notAvailable`
// form, the budget suffix ` | N compactions left` with the singular form and
// the ` (unlisted)` marker — ALL riding the core's `compactionsLeftSuffix`,
// NOTHING re-derived), the budget-store fail-open (file absent -> NO suffix),
// and the db-error in-band mirror (NO throw, the line NEVER replaced, the core
// error text APPENDED as ` — <error>`, NO suffix on the `unknown` sid).
// #213 (U24, 2026-10-29): every identified-session readout ends with the
// maintenance-trip token ` ROUND=<trips>` (cumulative completed-assistant
// `$.tokens.input` ÷ the budget-file `maintenance_trip_tokens`); the #171
// counter-derived ROUND/MAINT pins in section F are REPLACED by the trip pins.
//
// The SHARED gauge core is STEERED at a scratchpad FIXTURE DB (the v2
// context_family smoke's pattern — session_v2 + session_message rows, NEVER
// the live opencode.db) + a FIXTURE budget file via its test hooks. Fixtures
// live in home/AppData/Local/Temp/opencode/ctx-gauge-smoke-v2
// (recreated every run).
// Run: bun run ctx_gauge.smoke.mjs (this dir). Expected final line:
// `SMOKE: ALL PASS`.

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRATCH = "home/AppData/Local/Temp/opencode/ctx-gauge-smoke-v2";
// The repo root this suite lives in (`.opencode/plugins/tests` -> up 3). Resolved
// from the file so the suite runs in whatever checkout owns the tests dir — the
// old absolute archived-clone path no longer exists on this machine (TODO #156,
// 2026-10-26).
const CLONE_ROOT = path.join(import.meta.dirname, "..", "..", "..");
const PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "ctx_gauge.ts");

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
mkdirSync(SCRATCH, { recursive: true });

// The fixture session DB (the v2 table pair the gauge core's unit-1/unit-2 legs
// read FIRST):
// ses_gauge_1  name-marker window 120000, finished-step mass 57000 -> 47%, REM 63000
// ses_gauge_2  NEWER (time_updated 3000 -> the default read's pick), window 64000, mass 10000 -> 15%, REM 54000
// ses_gauge_nx window 32000, a session row and NO step rows -> the notAvailable form
// #213 trip carriers (time_created 50 — OLDER than the pinned step rows, so
// the mass pick is UNCHANGED; they only grow the CUMULATIVE input):
// ses_gauge_1  +300000 -> cumulative 310000 (constant 100000 -> ROUND=3)
// ses_gauge_2  + 90000 -> cumulative 100000 (constant 100000 -> ROUND=1)
const FX_DB = path.join(SCRATCH, "fx_gauge_v2.db");
{
  rmSync(FX_DB, { force: true });
  const db = new DatabaseSync(FX_DB);
  db.exec("CREATE TABLE session_v2(id TEXT PRIMARY KEY, model TEXT, time_updated INTEGER)");
  db.exec("CREATE TABLE session_message(id INTEGER PRIMARY KEY, session_id TEXT, type TEXT, data TEXT, time_created INTEGER)");
  const step = (tokens) => JSON.stringify({ tokens, time: { completed: 123 } });
  db.exec(`INSERT INTO session_v2 VALUES('ses_gauge_1', '{"id":"smoke-gauge-model-120K","providerID":"llama-swap"}', 2000)`);
  db.exec(`INSERT INTO session_v2 VALUES('ses_gauge_2', '{"id":"smoke-gauge-model-64K","providerID":"llama-swap"}', 3000)`);
  db.exec(`INSERT INTO session_v2 VALUES('ses_gauge_nx', '{"id":"smoke-gauge-model-32K","providerID":"llama-swap"}', 1000)`);
  db.exec(`INSERT INTO session_message VALUES(1, 'ses_gauge_1', 'assistant', '${step({ input: 10000, output: 2000, reasoning: 0, cache: { read: 45000, write: 0 } })}', 100)`);
  db.exec(`INSERT INTO session_message VALUES(2, 'ses_gauge_2', 'assistant', '${step({ input: 10000, output: 0, reasoning: 0, cache: { read: 0, write: 0 } })}', 100)`);
  db.exec(`INSERT INTO session_message VALUES(3, 'ses_gauge_1', 'assistant', '${step({ input: 300000, output: 0, reasoning: 0, cache: { read: 0, write: 0 } })}', 50)`);
  db.exec(`INSERT INTO session_message VALUES(4, 'ses_gauge_2', 'assistant', '${step({ input: 90000, output: 0, reasoning: 0, cache: { read: 0, write: 0 } })}', 50)`);
  db.close();
}

// The budget-store fixture: cap 6 (count 1 -> 5 left, plural) for the 120K
// model; cap 2 (count 1 -> 1 left, SINGULAR) for the 64K model; the 32K model
// UNLISTED + NO finite `model_budget.default` key -> the silent built-in cap-1
// fallback carrying the ` (unlisted)` marker (#132). #213: the trip constant
// 100000 (>= the 100_000 floor) — the F section rewrites the key for the
// default-leg pins.
const FX_BUDGET = path.join(SCRATCH, "fx_budget.json");
const budgetWith = (trip) =>
  JSON.stringify({
    model_budget: { "smoke-gauge-model-120K": 6, "smoke-gauge-model-64K": 2 },
    sessions: {
      ses_gauge_1: { count: 1, model: "smoke-gauge-model-120K" },
      ses_gauge_2: { count: 1, model: "smoke-gauge-model-64K" },
    },
    emergency_budget: 1,
    ...(trip === undefined ? {} : { maintenance_trip_tokens: trip }),
  });
writeFileSync(FX_BUDGET, budgetWith(100000), "utf8");

// ------------------------------------------------------------------ steer the shared gauge core

const gaugeMod = await import(pathToFileURL(path.join(CLONE_ROOT, ".opencode", "plugins", "scripts", "gauge.mjs")).href);
gaugeMod.setDbPath(FX_DB); // the plugin's readGauge(undefined, sid) reads THIS file
gaugeMod.setBudgetFileForTest(FX_BUDGET);
// #213: the gauge suffix NO LONGER reads the loop counter — steer the loop
// root at a MISSING dir so an accidental read would fail closed, never the
// live counter (the counter FILE + its semantics stay untouched, F2).
gaugeMod.setLoopRootForTest(path.join(SCRATCH, "no-loop-root"));

// ------------------------------------------------------------------ mock ctx + plugin load

const TOOLS = [];
let DISPOSED = 0;

function makeCtx() {
  return {
    location: { directory: SCRATCH },
    tool: {
      transform: async (cb) => {
        const editor = { list: () => [], get: () => undefined, namespace: () => {}, add: (t) => TOOLS.push(t), update: () => {}, remove: () => {} };
        cb(editor);
        return { dispose: async () => { DISPOSED++; } };
      },
      hook: async (name) => {
        chk(`UNEXPECTED tool.hook(${name})`, false);
        return { dispose: async () => {} };
      },
    },
  };
}

const pluginMod = await import(pathToFileURL(PLUGIN).href);
const plugin = pluginMod.default;

// ------------------------------------------------------------------ S0/S1 the loader shape + registration

chk("S0 default export is the loader shape { id: 'ctx_gauge', setup }",
  plugin && typeof plugin === "object" && plugin.id === "ctx_gauge" && typeof plugin.setup === "function",
  JSON.stringify(Object.keys(plugin ?? {})));

const cleanup = await plugin.setup(makeCtx());
chk("S1 setup registers ONE tool transform (name 'ctx_gauge'), returns a teardown, NO hooks",
  TOOLS.length === 1 && TOOLS[0].name === "ctx_gauge" && typeof cleanup === "function",
  `tools=${TOOLS.length} cleanup=${typeof cleanup}`);

const TOOL = TOOLS[0];
chk("S1 the tool surface: JSON-schema input (ONLY the optional sessionID string, no required), string output, promise execute, non-empty description",
  TOOL.input?.type === "object" &&
    TOOL.input.additionalProperties === false &&
    TOOL.input.required === undefined &&
    Object.keys(TOOL.input.properties).join(",") === "sessionID" &&
    TOOL.input.properties.sessionID.type === "string" &&
    TOOL.output?.type === "string" &&
    typeof TOOL.execute === "function" &&
    typeof TOOL.description === "string" &&
    TOOL.description.includes("compactions left") &&
    TOOL.description.includes("ROUND=<trips>"),
  JSON.stringify([Object.keys(TOOL.input.properties), TOOL.input.required, TOOL.output]));

const call = async (args) => (await TOOL.execute(args, {})).output;

// ------------------------------------------------------------------ A the named-session read + budget suffix + trip token

{
  const out = await call({ sessionID: "ses_gauge_1" });
  chk("(A) named-session readout byte-exact: mass/pct/REM + the ' | 5 compactions left' suffix + ' ROUND=3' (cumulative 310000 / 100000)",
    out === "SESSION=ses_gauge_1 CTX=57000 (47%) REM=63000 | 5 compactions left ROUND=3", out);
}

// ------------------------------------------------------------------ B the default read (EMPTY / non-string sessionID)

{
  const out1 = await call({});
  chk("(B) default read picks the newest session_v2 row (time_updated), '1 compaction left' SINGULAR + ' ROUND=1' (cumulative 100000 / 100000)",
    out1 === "SESSION=ses_gauge_2 CTX=10000 (15%) REM=54000 | 1 compaction left ROUND=1", out1);
  const out2 = await call({ sessionID: "" });
  const out3 = await call({ sessionID: 42 });
  chk("(B) EMPTY / non-string sessionID = the default read (the v1 arg semantics, wire-defensive)",
    out2 === out1 && out3 === out1, JSON.stringify([out2, out3]));
}

// ------------------------------------------------------------------ C no-total form + the (unlisted) marker + ROUND=0

{
  const out = await call({ sessionID: "ses_gauge_nx" });
  chk("(C) no-total read: CTX=notAvailable (no pct/REM) + the cap-1 fallback suffix ' (unlisted)' (#132) + ' ROUND=0' (no completed rows)",
    out === "SESSION=ses_gauge_nx CTX=notAvailable | 1 compaction left (unlisted) ROUND=0", out);
}

// ------------------------------------------------------------------ D budget store absent -> NO suffix (fail-open) + the default trip constant

{
  const before = gaugeMod.getBudgetFile();
  gaugeMod.setBudgetFileForTest(path.join(SCRATCH, "no_dir", "missing_budget.json"));
  const out = await call({ sessionID: "ses_gauge_1" });
  gaugeMod.setBudgetFileForTest(before);
  chk("(D) budget file absent -> NO budget suffix (fail-open) AND the trip constant falls back to the default 1M -> ' ROUND=0'",
    out === "SESSION=ses_gauge_1 CTX=57000 (47%) REM=63000 ROUND=0", out);
}

// ------------------------------------------------------------------ E the db-error in-band mirror

{
  const before = gaugeMod.getDbPath();
  gaugeMod.setDbPath(path.join(SCRATCH, "no_dir", "missing.db"));
  let threw = false;
  let out = "";
  try {
    out = await call({});
  } catch (e) {
    threw = true;
    out = String(e?.message ?? e);
  } finally {
    gaugeMod.setDbPath(before);
  }
  chk("(E) db-error: NO throw, the line NEVER replaced, ` — <error>` appended, the unknown sid -> NO suffix, NO ROUND token",
    !threw && /^SESSION=unknown CTX=notAvailable — \S/.test(out) && !out.includes("compactions left") && !out.includes("ROUND"),
    out);
  const outAfter = await call({ sessionID: "ses_gauge_1" });
  chk("(E) the DB steer restores cleanly (the readout lands again)",
    outAfter === "SESSION=ses_gauge_1 CTX=57000 (47%) REM=63000 | 5 compactions left ROUND=3", outAfter);
}

// ------------------------------------------------------------------ F the #213 trip token (constant legs)

{
  const base = "SESSION=ses_gauge_1 CTX=57000 (47%) REM=63000 | 5 compactions left";
  writeFileSync(FX_BUDGET, budgetWith(50000), "utf8");
  const outBelow = await call({ sessionID: "ses_gauge_1" });
  chk("(F) maintenance_trip_tokens BELOW the 100_000 floor -> the default 1M -> ' ROUND=0'",
    outBelow === `${base} ROUND=0`, outBelow);
  writeFileSync(FX_BUDGET, budgetWith(undefined), "utf8");
  const outAbsent = await call({ sessionID: "ses_gauge_1" });
  chk("(F) the key ABSENT -> the default 1M -> ' ROUND=0'", outAbsent === `${base} ROUND=0`, outAbsent);
  writeFileSync(FX_BUDGET, budgetWith(250000.5), "utf8");
  const outFrac = await call({ sessionID: "ses_gauge_1" });
  chk("(F) a NON-INTEGER constant -> the default 1M -> ' ROUND=0'", outFrac === `${base} ROUND=0`, outFrac);
  writeFileSync(FX_BUDGET, budgetWith(100000), "utf8");
  const out3 = await call({ sessionID: "ses_gauge_1" });
  chk("(F) constant 100000 over the cumulative input 310000 -> byte-exact ' ROUND=3' after the budget suffix",
    out3 === `${base} ROUND=3`, out3);
  // The loop counter is NO LONGER read for the gauge suffix: a live-shaped
  // counter fixture (the old %5 round=40 case) stays INERT — the trip token
  // stands, no MAINT duty token anywhere.
  const fxLoop = path.join(SCRATCH, "counter-inert");
  mkdirSync(fxLoop, { recursive: true });
  gaugeMod.setLoopRootForTest(fxLoop);
  writeFileSync(path.join(fxLoop, "counter.json"), JSON.stringify({ looprun: "x", n: 1, round: 40 }), "utf8");
  const outCounter = await call({ sessionID: "ses_gauge_1" });
  chk("(F) a %5 counter `round` no longer drives the suffix: ' ROUND=3' (trip), NO MAINT token",
    outCounter === `${base} ROUND=3` && !outCounter.includes("MAINT"), outCounter);
  gaugeMod.setLoopRootForTest(path.join(SCRATCH, "no-loop-root"));
  const outMissing = await call({ sessionID: "ses_gauge_nx" });
  chk("(F) the notAvailable form still ends ' ROUND=0'", outMissing === "SESSION=ses_gauge_nx CTX=notAvailable | 1 compaction left (unlisted) ROUND=0", outMissing);
}

// ------------------------------------------------------------------ Z cleanup

cleanup();
chk("Z the teardown disposes the registration", DISPOSED === 1, `disposed=${DISPOSED}`);

console.log(failures === 0 ? "SMOKE: ALL PASS" : `SMOKE: ${failures} FAIL`);
process.exit(failures === 0 ? 0 : 1);
