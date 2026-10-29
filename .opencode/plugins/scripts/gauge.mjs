// =============================================================================
// Shared context-gauge core (de-peek — TODO.md #30/#35; backend chain — #37):
// ONE implementation imported by BOTH the handover plugin (chat.message
// injection, .opencode/plugin/ctx_watchdog.ts) and the self-peek CLI
// (peek.mjs).
//
// READ BACKEND CHAIN (MAINTAINER RULING 2026-09-10, TODO #37) — tried in
// order, the FIRST SUCCESS WINS; the chosen backend is CACHED PER PROCESS
// (keyed by db path; invalidated by setDbPath/setBackends) so the
// repeatedly-firing plugin host does NOT re-try failed imports on every
// fire (a failed import is memoized and re-thrown, never re-imported):
//   1. node:sqlite   — dynamic import, DatabaseSync({ readOnly: true }).
//                      Flag-free on the system node v24.19.0 (the CLI /
//                      probe host, verified) and ALSO exposed by the SYSTEM
//                      bun 1.4.2 — the 2026-09-10 host-proxy check measured
//                      THAT host, NOT the opencode host (see the evidence
//                      block below).
//   2. bun:sqlite    — dynamic import, the NATIVE bun module — the best
//                      zero-spawn hope on the bun-compiled opencode.exe
//                      host. API facts VERIFIED 2026-09-10 against the
//                      SYSTEM bun 1.4.2 (the spec sketch was wrong —
//                      shape surprise, recorded in the worker summary):
//                        - named export `Database`
//                        - constructor option is `readonly: true` (NOT
//                          node:sqlite's `readOnly`, NOT `readWrite`;
//                          bun rejects unknown options — "Misspelled
//                          option" / "bad parameter or other API misuse")
//                        - a native `timeout` (busy-wait ms) option works
//                          in combination with `readonly`
//                        - `prepare().get()` returns a row object, or
//                          NULL (not undefined like node:sqlite) on no row
//                        - `exec("PRAGMA busy_timeout = N;")` + `close()`
//                          work; write attempts on a readonly db throw
//                          "attempt to write a readonly database"; a
//                          readonly open of the LIVE WAL-mode db
//                          (actively written by another process) works
//                      The adapter tries `{ readonly: true, timeout }`
//                      first and falls back to the plain `{ readonly: true }`
//                      form on a constructor SHAPE error only (an open
//                      error such as "unable to open database file" is
//                      never swallowed).
//   3. spawn-sqlite3 — the retired v1.x backend, PROVEN IN PRODUCTION under
//                      the production bun host (maintainer-placed SQLite
//                      CLI at .opencode/plugins/tools/sqlite3.exe — resolved
//                      RELATIVE to this file, never a hardcoded user path).
//                      The v1.x discipline, recovered from git history
//                      (2cf5f33): ARGS ARRAY (no shell — no quoting
//                      surface), the db as a READ-ONLY URI
//                      `file:<path>/?mode=ro` (no journal write while
//                      opencode writes concurrently), the MARKER SQL
//                      (`M|…` / `S|…` rows — the message `data` JSON is
//                      never fetched into JS), NO PRAGMA in the call (its
//                      echo pollutes stdout). Timeout discipline (this
//                      build): ONE attempt, hard 2500 ms KILL
//                      (timeout ⇒ db-error, never a hang; no busy-retry —
//                      the retry applies to the in-process backends only,
//                      per the ruling).
//
// WHY THE CHAIN — PRODUCTION EVIDENCE (2026-09-10, maintainer restart):
// the v2.5 node:sqlite-only core (313e83b) fails on EVERY chat.message fire
// under the production opencode.exe (bun-compiled) host:
//   kind:"gauge" reason:db-error preview:"sqlite-module ResolveMessage: No
//   such built-in module: node:sqlite"
// ⇒ NO `ctx:` line reached ANY agent in production. The opencode-baked bun's
// capability (node:sqlite? bun:sqlite? neither?) is UNVERIFIED and lands
// with the next maintainer restart — until then the chain degrades safely:
// missing module ⇒ next backend; all backends failing ⇒ a db-error evidence
// line that NAMES the failing backend (diagnosable straight from the
// production plugin.log).
//
// NEVER-THROW (preserved across the whole chain): ANY failure in ANY backend
// ⇒ kind:"db-error" with a capped preview that NAMES the failing backend
// (`node:sqlite …` / `bun:sqlite …` / `spawn-sqlite3 …`). NO new `kind`
// vocabulary, NO new gauge-failure reasons. Busy/locked on the in-process
// backends (1+2): `PRAGMA busy_timeout = 2500` via the API + ONE retry;
// the spawn backend keeps its own hard-timeout discipline (above).
//
// QUERIES — two single-row reads per read (json_extract in SQL — the message
// `data` JSON is never fetched or JS-parsed):
//   1. newest session:  SELECT id, model FROM session ORDER BY time_updated DESC LIMIT 1
//   2. finished step:   the newest session's latest message row whose `data`
//      carries the `"finish"` marker (json_extract of tokens.total/output;
//      the in-flight step has no "finish" field, user rows no tokens at all)
// NULL total (no finished step / empty tokens) → the no-total readout.
//
// PER-SESSION READ (2026-09-10, TODO #30/#33 — the v2.6 nudge ladder):
// readGauge(dbPath, sessionID) with a NON-EMPTY sessionID reads THAT session
// instead of the newest-updated one (same two single-row reads, the session
// row looked up by id, the finished step scoped to that session; the spawn
// backend's marker SQL embeds the id with single-quote escaping). The
// newest-session default (no/empty sessionID) is BYTE-IDENTICAL — the same
// SQL strings, same order, same shapes. Result shapes are UNCHANGED; a
// non-existent session reads as no-total (sid "unknown" — the read came from
// no session row).
//
// TOKEN SEMANTICS (verified 2026-09-10 across all recent step rows — TODO #30;
// #103, 2026-09-27 — the readout is TOTAL, not total−output):
// total = input + output + cache.read holds EXACTLY ⇒ ctx = total = the
// context size at the START of the NEXT turn after the latest FINISHED step
// (the finished step's OWN output included). The readout thus lags the live
// context by ONE generated turn (the in-flight step's output — not yet in
// the DB), not TWO (the old total−output form missed the finished step's
// output too). The in-flight step has NO "finish" field (excluded by the
// LIKE); user rows carry no token fields.
//
// WINDOW RULE (MAINTAINER CONFIRMED 2026-09-09): llama-swap model names
// encode the window as a trailing `<N>K` or `<N>M` marker — the window is
// N × 1000 (K) or N × 10⁶ (M) EXACTLY: `…-120K_MTP` → 120000, `…-210K` →
// 210000, `…-256K` → 256000, `-1.5M` → 1500000. `-MTP` is a speed note only
// (multi-token prediction), NOT extra capacity. The LAST matching marker
// wins (real ids carry no other K/M markers; `IQ4KT` never matches — no
// dash/underscore precedes its 4). No match ⇒ window UNKNOWN — NEVER a
// hardcoded guess (the retired python peek CLI `12050`-style fallback is the bug
// being removed: a real model such as CPU-Qwen3-0.6B must never read as a
// guessed window).
//
// READOUT FORMS — the ONE string used by the CLI, the plugin's injected text,
// and the T2 nudge text (BYTE-IDENTICAL across the chain — the plugin and
// peek.mjs need no change for the output):
// - window known:      SESSION=<sid> CTX=<ctx> (<pct>%) REM=<window-ctx>
//                       (pct = integer ctx*100//window)
// - window unknown:    SESSION=<sid> CTX=<ctx> — nothing else (no guessed
//                       pct/REM)
// - no total / unreadable db: SESSION=<sid|unknown> CTX=notAvailable —
//   verbatim, never a silent/zero confusion.
// - the item-3 budget suffix (2026-09-24): when the compaction budget store
//   resolves, the line ENDS with the distinct ` | N compactions left` field
//   (singular at 1 — the ` | ` separator flags it as a separate field):
//   remaining = max(0, cap - count) PLUS 1 iff the once-per-session emergency
//   compaction is still available (count === cap && effective
//   emergency_budget >= 1 — see compactionsLeftSuffix). Budget file missing /
//   unparseable, or the read session unknown (db-error) → NO suffix
//   (fail-open — the forms above stand verbatim).
//
// SESSION-GATING (the #32 cross-session feed root cause): the result carries
// the id of the session the read came from (sid). The plugin posts its part
// ONLY when sid === the hook's sessionID — a mismatch never posts, and logs
// no line either (a normal multi-session state, not a failure). NOTE the
// deliberate difference to the retired python peek CLI: there is NO fallback to the
// newest finished message of ANOTHER session (that fallback WAS the feed bug).
// =============================================================================

import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { currentLoopFolder, readLoopCounter } from "./loop_root.mjs";

const execFileAsync = promisify(execFile);
export const BUSY_TIMEOUT_MS = 2500;
const SPAWN_TIMEOUT_MS = 2500;
const MAX_BUFFER = 1024 * 1024;
const THIS_DIR = dirname(fileURLToPath(import.meta.url));

// The opencode.db location (fact-2 of the T1 spec, planner-verified).
export const DEFAULT_DB_PATH = join(os.homedir(), ".local", "share", "opencode", "opencode.db");
// The maintainer-placed SQLite CLI, resolved RELATIVE TO THIS FILE (stable
// for the CLI cwd and the plugin import alike): .opencode/plugins/scripts →
// ../tools. NEVER deleted or moved (maintainer-placed, TODO #30/#37).
export const DEFAULT_EXE_PATH = join(THIS_DIR, "..", "tools", "sqlite3.exe");
// The backend chain, in selection order (see the READ BACKEND CHAIN header).
export const DEFAULT_BACKENDS = Object.freeze(["node:sqlite", "bun:sqlite", "spawn-sqlite3"]);

// One process-wide current db path — the override lets the probe point
// the plugin and the CLI at a temp fixture db without any file editing.
// readGauge(p) accepts an explicit db path too (the probe's direct gauge calls).
let dbPath = DEFAULT_DB_PATH;
// The active backend list (setBackends = the probe's chain-restriction hook;
// it also clears the backend cache — a restricted list changes the selection).
let backendList = [...DEFAULT_BACKENDS];
// Per-process cache: db path -> the last SUCCESSFUL backend name. Invalidated
// by setDbPath and setBackends (documented ruling: invalidate on setDbPath).
const backendCache = new Map();
// Dynamic-import memo (per spec, per process): a rejected import is stored
// as a failure marker and RE-THROWN — never re-imported on every fire.
const importCache = new Map();
const importAttemptCount = new Map();

export function setDbPath(p) {
  dbPath = p;
  backendCache.clear();
}
export function getDbPath() {
  return dbPath;
}
export function setBackends(list) {
  backendList = Array.isArray(list) ? [...list] : [...DEFAULT_BACKENDS];
  backendCache.clear();
}
export function getBackends() {
  return [...backendList];
}

// Item 3 (2026-09-24): the budget store the "N compactions left" suffix
// reads (the compact_memory budget store — the SAME file auto_resume.ts
// reads per nudge-eligible call; READ-ONLY here, read per formatGauge call —
// small file, a per-call read is fine). Resolved RELATIVE to this file
// (.opencode/plugins/scripts → ../.. = repo root → .opencode/temp/).
export const DEFAULT_BUDGET_FILE = join(THIS_DIR, "..", "..", "temp", "compact_budget.json");
let budgetFile = DEFAULT_BUDGET_FILE;
// Test hook (the setDbPath pattern — the probe/smokes steer the read at
// fixture budget files; the production host never calls it).
export function setBudgetFileForTest(p) {
  budgetFile = p;
}
export function getBudgetFile() {
  return budgetFile;
}

// Loop iteration counter (2026-10-05, approved proposal
// 2026-10-01_loop-iteration-counter.md Part 2): the loop-root the
// iteration suffix resolves (the autorun loop folders live in
// <repo root>/loop). Resolved RELATIVE to this file (.opencode/plugin/
// scripts → ../../.. = repo root → loop/), the DEFAULT_BUDGET_FILE
// pattern.
export const DEFAULT_LOOP_ROOT = join(THIS_DIR, "..", "..", "..", "loop");
let loopRoot = DEFAULT_LOOP_ROOT;
// Test hook (the setBudgetFileForTest pattern — the probe steers the
// read at a fixture loop root; the production host never calls it).
export function setLoopRootForTest(p) {
  loopRoot = p;
}
export function getLoopRoot() {
  return loopRoot;
}

// Part 2: the ctx-line iteration suffix — `""`, ` ITER=<n> <folder>`, or
// (TODO #171, 2026-10-26) ` ITER=<n> <folder> ROUND=<r>` — plus ` MAINT=1`
// when `r % 5 === 0` (the maintenance-clock token).
// Resolves the CURRENT loop folder + reads the folder's `counter.json`
// through the ONE read-only helper `./loop_root.mjs` (#164, 2026-10-26 —
// the four duplicated folder locators unified; the folder rule stays
// exactly-one → it, several → newest-mtime, none / unreadable → `""`),
// present + parseable (an object with a finite numeric `n` — the counter's
// `looprun` field is NOT checked here) → the suffix. NEVER throws (any
// failure → `""` — the readout line is byte-identical to the pre-counter
// form). The `setLoopRootForTest` hook above steers the helper's root.
// #171 fail-closed ROUND leg: a LEGACY counter WITHOUT a `round` key, or a
// non-finite `round`, keeps the OLD ` ITER=<n> <folder>` form BYTE-EXACT —
// the ROUND/MAINT tokens only ever ride a finite numeric `round`.
export function loopIterationSuffix() {
  try {
    const folder = currentLoopFolder(loopRoot);
    if (folder === null) return "";
    const data = readLoopCounter(loopRoot, folder);
    if (data === null) return "";
    const n = data["n"];
    if (typeof n !== "number" || !Number.isFinite(n)) return "";
    const base = ` ITER=${n} ${folder}`;
    const r = data["round"];
    if (typeof r !== "number" || !Number.isFinite(r)) return base;
    return r % 5 === 0 ? `${base} ROUND=${r} MAINT=1` : `${base} ROUND=${r}`;
  } catch {
    return ""; // no loop root / no folder / no counter / malformed → no suffix
  }
}

// #213 (U24, 2026-10-29): the MAINTENANCE-TRIP carrier (maintainer rulings
// 2026-10-29) — REPLACES the #171 compaction-derived clock: the `maintSuffix`
// export and the ` MAINT=1` duty token are RETIRED. The ctx_gauge working
// line appends ` ROUND=<trips>` INFORMATIONAL on every read that identified a
// session: trips = floor(cumulative provider input_tokens of the READ session
// ÷ the trip constant). Carrier (F1): the SUM of `$.tokens.input` over the
// session's COMPLETED assistant rows — the SAME provider-count source and
// finished-step discriminator as the mass leg; winner table pair (`session_v2`
// holds the id → the v2 pair, else the v1 pair). Constant (F3): the
// `maintenance_trip_tokens` key of the budget file — integer >= 100_000;
// absent / unparseable / < 100_000 → the default 1_000_000 (one log-free read
// on the existing budget-file path — the maintainer owns the file, READ ONLY).
// F4: READ-ONLY SQL only — no provider request, no DB write. NEVER throws: no
// sid / all sum backends fail → "" (fail-open — the readout stands verbatim).
// The loop counter file is NOT read for this suffix anymore (its `n`/`round`
// keys and the loop_log bump leg stay untouched).
export const MAINT_TRIP_DEFAULT = 1_000_000;
export const MAINT_TRIP_MIN = 100_000;

// The trip constant (see the F3 rule above). NEVER throws.
export function maintenanceTripTokens() {
  try {
    const data = JSON.parse(readFileSync(budgetFile, "utf-8"));
    const v =
      data != null && typeof data === "object" && !Array.isArray(data) ? data["maintenance_trip_tokens"] : undefined;
    if (typeof v === "number" && Number.isInteger(v) && v >= MAINT_TRIP_MIN) return v;
  } catch {
    // missing / unreadable / malformed / scalar root → the default
  }
  return MAINT_TRIP_DEFAULT;
}

// The cumulative provider input over the session's completed assistant rows
// (same discriminator as the mass leg; the v1 form mirrors the v1 finished-
// step LIKE). Built per call (SQL_STEP_DISCRIMINATOR_V2 is declared below).
const sqlInputSumV1 = () =>
  "SELECT SUM(COALESCE(json_extract(m.data, '$.tokens.input'), 0)) AS inp FROM message m " +
  "WHERE m.session_id = ? AND m.data LIKE '%\"finish\"%'";
const sqlInputSumV2 = () =>
  "SELECT SUM(COALESCE(json_extract(m.data, '$.tokens.input'), 0)) AS inp FROM session_message m " +
  "WHERE m.session_id = ? AND " + SQL_STEP_DISCRIMINATOR_V2;

// In-process sum read (backends 1+2): open READ-ONLY, busy_timeout, the
// winner-pair SUM, ONE busy retry — the readApiDb discipline. The id held by
// `session_v2` → the v2 pair (no cross-pair double count); a missing PAIRED
// message table degrades to the other pair (the unit-2 rule); any other error
// propagates. A session with no completed rows → SUM NULL → 0.
function readInputSumDb(openFn, target) {
  const attempt = () => {
    let db;
    try {
      db = openFn();
      db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS};`);
      let holdsV2 = false;
      try {
        holdsV2 = db.prepare(sqlSessionById("session_v2")).get(target) != null;
      } catch {
        holdsV2 = false; // no session_v2 table → the v1 pair
      }
      let row;
      try {
        row = db.prepare(holdsV2 ? sqlInputSumV2() : sqlInputSumV1()).get(target);
      } catch (e) {
        if (!/no such table/i.test(String(e?.message ?? e))) throw e;
        row = db.prepare(holdsV2 ? sqlInputSumV1() : sqlInputSumV2()).get(target);
      }
      return row?.inp == null ? 0 : Number(row.inp);
    } finally {
      try {
        db?.close();
      } catch {
        // best effort — the read outcome has already been captured
      }
    }
  };
  try {
    return attempt();
  } catch (e) {
    if (/busy|locked/i.test(String(e?.message ?? e))) return attempt();
    throw e;
  }
}

// Spawn sum read (backend 3): the table probe picks the pair (the spawn gauge
// read's discipline); the CLI prints NULL as an empty field → 0.
async function readSpawnInputSum(p, target) {
  if (!existsSync(DEFAULT_EXE_PATH)) throw new Error(`exe-missing ${DEFAULT_EXE_PATH}`);
  const tables = new Set(
    String((await spawnExec(p, SQL_TABLE_PROBE)).stdout)
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter((x) => x !== ""),
  );
  const q = sqlSidLiteral(target);
  const useV2 = tables.has("session_v2") && tables.has("session_message");
  const sql = useV2
    ? `SELECT SUM(COALESCE(json_extract(m.data, '$.tokens.input'), 0)) FROM session_message m WHERE m.session_id = ${q} AND ${SQL_STEP_DISCRIMINATOR_V2};`
    : `SELECT SUM(COALESCE(json_extract(m.data, '$.tokens.input'), 0)) FROM message m WHERE m.session_id = ${q} AND m.data LIKE '%"finish"%';`;
  const res = await spawnExec(p, sql);
  const line =
    String(res.stdout)
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter((x) => x !== "")[0] ?? "";
  if (line === "" || line === "NULL") return 0;
  const n = Number(line);
  if (Number.isNaN(n)) throw new Error(`sum-unparseable ${line.slice(0, 24)}`);
  return n;
}

const SUM_BACKENDS = {
  "node:sqlite": async (p, target) => {
    const mod = await importModule("node:sqlite");
    const DatabaseSync = mod?.DatabaseSync;
    if (typeof DatabaseSync !== "function") throw new Error("DatabaseSync export missing");
    return readInputSumDb(() => new DatabaseSync(p, { readOnly: true }), target);
  },
  "bun:sqlite": async (p, target) => {
    const mod = await importModule("bun:sqlite");
    const Database = mod?.Database ?? (typeof mod?.default === "function" ? mod.default : mod?.default?.Database);
    if (typeof Database !== "function") throw new Error("Database export missing");
    const open = () => {
      try {
        return new Database(p, { readonly: true, timeout: BUSY_TIMEOUT_MS });
      } catch (e) {
        if (/bad parameter|api misuse|misspelled/i.test(String(e?.message ?? e))) return new Database(p, { readonly: true });
        throw e;
      }
    };
    return readInputSumDb(open, target);
  },
  "spawn-sqlite3": readSpawnInputSum,
};

// Cumulative input ÷ constant → trips for the session. Walks the backend
// chain over the SAME per-path cache the gauge read just warmed; every sum
// backend failure tries the next; ALL fail → null (fail-open). No/unknown
// session → null. NEVER throws at this level (the walk swallows).
export async function maintenanceTrips(sessionID, dbPathOverride) {
  const p = dbPathOverride ?? dbPath;
  const target = typeof sessionID === "string" && sessionID !== "" && sessionID !== "unknown" ? sessionID : undefined;
  if (target === undefined) return null;
  for (const name of orderedBackendsFor(p)) {
    const impl = SUM_BACKENDS[name];
    if (impl === undefined) continue;
    try {
      const sum = await impl(p, target);
      return Number.isFinite(sum) && sum > 0 ? Math.floor(sum / maintenanceTripTokens()) : 0;
    } catch {
      // this sum backend failed — try the next one
    }
  }
  return null;
}

// The ctx_gauge trip token (F2): ` ROUND=<trips>` always on an identified
// session; "" fail-open (unknown sid / all sum backends failed). NEVER throws.
export async function tripRoundSuffix(sessionID, dbPathOverride) {
  try {
    const trips = await maintenanceTrips(sessionID, dbPathOverride);
    return trips == null ? "" : ` ROUND=${trips}`;
  } catch {
    return "";
  }
}

// #115 (2026-09-28): the window is CONFIG-FIRST — the root opencode.jsonc's
// `provider.<pid>.models.<mid>.limit.context` (a finite number > 0) beats
// the name-marker parse (resolveWindow below — parseWindow is the
// fallback). The live config is JSONC (comments + trailing commas; a `//`
// INSIDE a string literal is NOT a comment — the strip is string-aware).
// Resolved RELATIVE to this file: `.opencode/plugins/scripts` → THREE levels up
// = the repo root (`../..` only reaches `.opencode` — #152 fix, see below),
// preferring opencode.jsonc and falling back to opencode.json when
// absent. READ per resolveWindow call (small file — same precedent as the
// budget-store read in compactionsLeftSuffix); NEVER throws (missing /
// unparseable / no entry → the parseWindow fallback stands).
// #150 unit A (2026-10-26): the core moved from `.opencode/plugin/scripts/` to
// `.opencode/plugins/scripts/` — the SAME depth, so every THIS_DIR number above
// stays valid (the exe moved with it to `.opencode/plugins/tools/`).
// #152 (2026-10-26) P0: the T1 estate lived at `<root>/plugin/scripts/`, so the
// original `../..` reached the root. The move into `.opencode/plugin/` left this
// pointing at `.opencode/opencode.jsonc` (never exists) → the config walk was
// DEAD for every model, including the provider-qualified ones. The budget read
// at :200 (`temp` lives under `.opencode`) and DEFAULT_LOOP_ROOT (:217, three
// levels) were already correct.
export const DEFAULT_CONFIG_FILE = join(THIS_DIR, "..", "..", "..", "opencode.jsonc");
let configOverride = null; // test hook: an explicit config path (the setBudgetFileForTest pattern)
export function setConfigFileForTest(p) {
  configOverride = p;
}
export function getConfigFile() {
  return configOverride ?? DEFAULT_CONFIG_FILE;
}

// Probe-only test hooks (the production host never calls these):
export function setImportForTest(spec, moduleValue) {
  importCache.set(spec, moduleValue);
}
export function clearImportForTest(spec) {
  importCache.delete(spec);
}
export function importAttemptsForTest(spec) {
  return importAttemptCount.get(spec) ?? 0;
}

function importModule(spec) {
  const hit = importCache.get(spec);
  if (hit !== undefined) {
    if (hit !== null && typeof hit === "object" && hit.__failed) throw hit.err;
    return hit;
  }
  importAttemptCount.set(spec, (importAttemptCount.get(spec) ?? 0) + 1);
  const pr = import(spec).then(
    (m) => m,
    (e) => {
      importCache.set(spec, { __failed: true, err: e });
      throw e;
    },
  );
  importCache.set(spec, pr);
  return pr;
}

// Model id -> window. The NAME-MARKER parser — LAST marker wins (see the
// WINDOW RULE header block). Since #115 (2026-09-28) it is the FALLBACK of
// resolveWindow (config-first: the root opencode.jsonc limit.context); it
// stands alone for no-provider-prefix ids, non-strings, and every config
// miss.
export function parseWindow(modelId) {
  if (typeof modelId !== "string") return undefined;
  const re = /[-_](\d+(?:\.\d+)?)(K|M)(?![0-9])/g;
  let m = null;
  let last = null;
  while ((m = re.exec(modelId)) !== null) last = m;
  if (last == null) return undefined;
  return Math.round(parseFloat(last[1]) * (last[2] === "K" ? 1000 : 1000 * 1000));
}

// session.model column -> model id. opencode >= v2 schema: JSON {"id":...};
// pre-v2 rows may carry the plain id string — accept both, never throw.
export function parseModelId(raw) {
  if (typeof raw !== "string" || raw === "") return "";
  if (raw.startsWith("{")) {
    try {
      const o = JSON.parse(raw);
      return o != null && typeof o.id === "string" ? o.id : "";
    } catch {
      return "";
    }
  }
  return raw;
}

// #152 (2026-10-26): the SAME column read as { id, ref }. The v2 row shape is
// {"id":"gyro-gyro-m","providerID":"strata"}, so the bare id alone can NEVER
// reach the config walk in resolveWindow (no "/" → name-marker only, and a
// markerless id like `gyro-gyro-m` yields no window → no pct/REM and a dead
// nudge ladder). `ref` = `providerID/id` when BOTH are non-empty strings, the
// bare id otherwise (and the legacy plain string verbatim). The bare `id`
// STAYS the key for the budget map and the readout model slot — only the
// window lookup uses `ref` (never change the budget semantics here).
export function parseModelRef(raw) {
  if (typeof raw !== "string" || raw === "") return { id: "", ref: "" };
  if (raw.startsWith("{")) {
    try {
      const o = JSON.parse(raw);
      const id = o != null && typeof o.id === "string" ? o.id : "";
      const pid = o != null && typeof o.providerID === "string" ? o.providerID : "";
      return { id, ref: id !== "" && pid !== "" ? `${pid}/${id}` : id };
    } catch {
      return { id: "", ref: "" };
    }
  }
  return { id: raw, ref: raw };
}

// #115 (2026-09-28): the JSONC → strict-JSON strip — REPLICATED from
// auto_resume.ts's parseJsonc (string-aware: a `//` inside a string
// literal is NOT a comment; trailing commas stripped before `}`/`]`;
// THROWS on parse failure — the caller swallows). Replicated, not
// imported: gauge.mjs is plain .mjs (no TS import possible).
function parseJsonc(text) {
  let out = "";
  let i = 0;
  let inStr = false;
  while (i < text.length) {
    const ch = text[i];
    if (inStr) {
      out += ch;
      if (ch === "\\" && i + 1 < text.length) {
        i += 1;
        out += text[i];
      } else if (ch === '"') {
        inStr = false;
      }
      i += 1;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    if (ch === "}" || ch === "]") {
      while (out.endsWith(" ") || out.endsWith("\n") || out.endsWith("\t")) out = out.slice(0, -1);
      if (out.endsWith(",")) out = out.slice(0, -1);
    }
    out += ch;
    i += 1;
  }
  return JSON.parse(out);
}

// The root config, parsed (see the DEFAULT_CONFIG_FILE block): the explicit
// test override is used AS-IS; the default prefers opencode.jsonc, falling
// back to opencode.json in the repo root. null on missing / unreadable /
// malformed / non-object root (the caller falls back — NEVER throws).
function readWindowConfig() {
  const p =
    configOverride ??
    (existsSync(DEFAULT_CONFIG_FILE) ? DEFAULT_CONFIG_FILE : join(THIS_DIR, "..", "..", "..", "opencode.json"));
  if (!existsSync(p)) return null;
  let text;
  try {
    text = readFileSync(p, "utf-8");
  } catch {
    return null;
  }
  try {
    const data = parseJsonc(text);
    return data != null && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// #115 (2026-09-28): the window is CONFIG-FIRST — a modelId of the
// `providerID/modelID` form first walks the root config's
// `provider[providerID].models[modelID].limit.context`: a finite number > 0
// is the window. Everything else (no "/" prefix, config missing /
// unparseable / no entry / non-finite / <= 0) falls back to the name-marker
// parseWindow (UNCHANGED — it is the fallback). Never throws.
export function resolveWindow(modelId) {
  if (typeof modelId !== "string") return undefined;
  const slash = modelId.indexOf("/");
  if (slash > 0) {
    const providerID = modelId.slice(0, slash);
    const modelID = modelId.slice(slash + 1);
    const data = readWindowConfig();
    const provider = data != null && typeof data === "object" && !Array.isArray(data) ? data["provider"] : undefined;
    const entry = provider != null && typeof provider === "object" && !Array.isArray(provider) ? provider[providerID] : undefined;
    const models = entry != null && typeof entry === "object" && !Array.isArray(entry) ? entry["models"] : undefined;
    const model = models != null && typeof models === "object" && !Array.isArray(models) ? models[modelID] : undefined;
    const limit = model != null && typeof model === "object" && !Array.isArray(model) ? model["limit"] : undefined;
    const context = limit != null && typeof limit === "object" && !Array.isArray(limit) ? limit["context"] : undefined;
    if (typeof context === "number" && Number.isFinite(context) && context > 0) return context;
  }
  return parseWindow(modelId);
}

// Result shapes (one implementation shared by plugin + CLI + probe —
// UNCHANGED by the chain; the db-error `error` text now NAMES the backend):
//   ok         : { ok:true,  kind:"ok",        sid, modelId, total, output, ctx, window }
//   no total   : { ok:false, kind:"no-total",  sid, modelId }            // read ok, no total
//   unreadable : { ok:false, kind:"db-error",  sid:"unknown", modelId:"", error }

// Item 3 (2026-09-24): the "N compactions left" suffix — the compaction
// budget remaining for the READ session, appended as a DISTINCT field to the
// readout line (format ` | N compactions left`, singular at 1; the budget
// THRESHOLD is deliberately NOT revealed — indirect information only).
// remaining = max(0, cap - count) PLUS 1 iff the once-per-session emergency
// compaction is still available: count === cap && the effective
// emergency_budget >= 1. The key is read LENIENTLY — absent → the fail-open
// default 1 (matching compact_memory's DEFAULT_EMERGENCY_BUDGET), so the
// readout matches the ACTUAL gate after item 10: at count === cap the
// emergency IS still available (count === cap + key absent → 1, NOT 0).
// The cap is resolved EXACTLY like compact_memory's resolveCap (mirror of
// the auto_resume budgetExhausted helper): the CPU safety invariant FIRST
// (cap 0), then the model_budget map's EXACT bare-model-id key, else
// model_budget.default, else 1. The model is the read's modelId (the
// session's CURRENT model — the bare id, the map's key form; a no-total
// read carries the SESSION ROW's model when the row has one — the #114
// session-row fallback, 2026-09-28), so the session entry's `model` (the
// model at the last increment) is the fallback only when neither carries a
// model. File missing / unreadable / unparseable /
// root-not-an-object / sid "unknown" (a db-error read) → NO suffix
// (fail-open). NEVER throws.
export function compactionsLeftSuffix(sid, modelId) {
  if (typeof sid !== "string" || sid === "" || sid === "unknown") return "";
  let data;
  try {
    data = JSON.parse(readFileSync(budgetFile, "utf-8"));
  } catch {
    return ""; // missing / unreadable / malformed → no suffix (fail-open)
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return ""; // scalar root → no store
  const rec = data;
  const sessions = rec["sessions"];
  let entry = null;
  if (sessions != null && typeof sessions === "object" && !Array.isArray(sessions)) {
    const e = sessions[sid];
    if (e != null && typeof e === "object" && !Array.isArray(e)) entry = e;
  }
  const count = entry != null && typeof entry["count"] === "number" && Number.isFinite(entry["count"]) ? entry["count"] : 0;
  const model =
    typeof modelId === "string" && modelId !== ""
      ? modelId
      : entry != null && typeof entry["model"] === "string"
        ? entry["model"]
        : "";
  const mb = rec["model_budget"];
  let cap;
  let unlisted = false; // #132: the SILENT built-in cap-1 fallback (model
  // unlisted/empty + no finite model_budget.default key) — the readout
  // carries the marker ` (unlisted)` ONLY on this branch
  if (/^cpu/i.test(model)) cap = 0; // the CPU safety invariant (mirror of resolveCap)
  else if (mb != null && typeof mb === "object" && !Array.isArray(mb)) {
    if (model !== "" && typeof mb[model] === "number" && Number.isFinite(mb[model])) cap = mb[model];
    else if (typeof mb["default"] === "number" && Number.isFinite(mb["default"])) cap = mb["default"];
    else { cap = 1; unlisted = true; }
  } else {
    cap = 1; unlisted = true;
  }
  const eb = rec["emergency_budget"];
  const emergency = typeof eb === "number" && Number.isFinite(eb) && eb >= 0 ? eb : 1; // absent → fail-open default 1
  const remaining = Math.max(0, cap - count) + (count === cap && emergency >= 1 ? 1 : 0);
  return ` | ${remaining} compaction${remaining === 1 ? "" : "s"} left${unlisted ? " (unlisted)" : ""}`;
}

// The ONE readout form (see the header). sid missing/undefined -> "unknown".
// Item 3 (2026-09-24): the line ends with the budget suffix when the store
// resolves (compactionsLeftSuffix — empty string on fail-open).
export function formatGauge(r) {
  let out;
  if (r.ok) {
    const w = r.window;
    out =
      w == null || w <= 0
        ? `CTX=${r.ctx}`
        : `CTX=${r.ctx} (${Math.floor((r.ctx * 100) / w)}%) REM=${w - r.ctx}`;
  } else {
    out = "CTX=notAvailable";
  }
  return `SESSION=${r.sid ?? "unknown"} ${out}` + compactionsLeftSuffix(r.sid ?? "unknown", r.modelId ?? "");
}

// The two single-row reads (see the header). json_extract never fetches the
// `data` JSON into JS; a missing/NULL token field reads as null.
// v2-migration unit 1 (2026-10-21): the SESSION-ROW leg is TABLE-AWARE — the
// v2 line stores sessions in `session_v2` (columns = `session` PLUS the fork/
// idle columns; the `model` column NAME unchanged, its value JSON `{"id":…}`
// — parseModelId already unwraps both shapes); a migrated DB carries BOTH
// tables (coexistence measured 2026-10-21). The leg reads `session_v2` FIRST,
// then `session`; on a v1-only DB the v1 SQL below goes out BYTE-IDENTICAL
// (the constants are the `session` instantiation of the table templates).
// Newest-session choice across BOTH tables = the greater `time_updated`.
// v2-migration unit 2 (2026-10-22): the TOKEN-mass leg is TABLE-AWARE the
// SAME WAY — its SQL is instantiated against THE TABLE THAT WON THE SESSION-
// ROW PICK (no cross-table mass pairing). The v2 line stores per-assistant-
// message usage in the `session_message.data` blob: `tokens: {input, output,
// reasoning, cache: {read, write}}` (@opencode/schema/token-usage.ts +
// session-message.ts `Assistant`; v1-migration.bun.ts writes the same shape;
// verified 2026-10-22 with one mode=ro read of the live migrated DB — real
// rows carry e.g. input 72 / output 176 / cache.read 14283). The mass TOTAL
// mirrors the fork's OWN TokenUsage.total() = input+output+reasoning+cache.
// read+cache.write — the #103 in+out+cr semantics of v1's `tokens.total`
// mapped to what v2 actually stores (llama-swap usage keeps reasoning/cache.
// write at 0, so the sum lands where v1's total landed). FINISHED-STEP
// discriminator = the fork's own completed-assistant filter (projector.ts
// fork-copy): `type='assistant' AND $.time.completed IS NOT NULL AND $.tokens
// IS NOT NULL` — an in-flight assistant row has neither; the `type` match
// keeps `compaction` rows (their request usage, NOT the context size) out.
// The v1 `message`/`session` instantiation below stays BYTE-IDENTICAL — the
// existing gauge_core pins (v1-only DBs) are unchanged.
const sqlSessionNewest = (t) => `SELECT id, model FROM ${t} ORDER BY time_updated DESC LIMIT 1`;
const sqlSessionById = (t) => `SELECT id, model FROM ${t} WHERE id = ?`;
const SQL_NEWEST_SESSION = sqlSessionNewest("session");
const SQL_FINISHED_STEP =
  "SELECT s.id AS sid, s.model AS model, " +
  "json_extract(m.data, '$.tokens.total') AS total, " +
  "json_extract(m.data, '$.tokens.output') AS output " +
  "FROM message m JOIN session s ON s.id = m.session_id " +
  "WHERE s.id = (SELECT id FROM session ORDER BY time_updated DESC LIMIT 1) " +
  'AND m.data LIKE \'%"finish"%\' ORDER BY m.time_created DESC LIMIT 1';

// v2-migration unit 2 (2026-10-22): the v2 instantiation of the same mass
// read (see the TABLE-AWARE header). TOTAL = the fork's own TokenUsage.total()
// sum; discriminator = the fork's completed-assistant filter; the v2 line has
// NO `tokens.total` field — the five-field sum IS the v2 storage (verified
// against @opencode/schema/token-usage.ts, the v1→v2 migration, and one
// mode=ro read of the live migrated DB).
const SQL_STEP_DISCRIMINATOR_V2 =
  "m.type = 'assistant' AND json_extract(m.data, '$.time.completed') IS NOT NULL AND json_extract(m.data, '$.tokens') IS NOT NULL";
const SQL_TOKEN_TOTAL_V2 =
  "(COALESCE(json_extract(m.data, '$.tokens.input'), 0) + " +
  "COALESCE(json_extract(m.data, '$.tokens.output'), 0) + " +
  "COALESCE(json_extract(m.data, '$.tokens.reasoning'), 0) + " +
  "COALESCE(json_extract(m.data, '$.tokens.cache.read'), 0) + " +
  "COALESCE(json_extract(m.data, '$.tokens.cache.write'), 0))";
const SQL_FINISHED_STEP_V2 =
  "SELECT s.id AS sid, s.model AS model, " +
  `${SQL_TOKEN_TOTAL_V2} AS total, ` +
  "json_extract(m.data, '$.tokens.output') AS output " +
  "FROM session_message m JOIN session_v2 s ON s.id = m.session_id " +
  "WHERE s.id = (SELECT id FROM session_v2 ORDER BY time_updated DESC LIMIT 1) " +
  `AND ${SQL_STEP_DISCRIMINATOR_V2} ORDER BY m.time_created DESC LIMIT 1`;

// The spawn backend's MARKER SQL (v1.x discipline — see the header): two
// statements, marker-prefixed rows; an empty first result simply omits the M
// row, so the output is never ambiguous.
const GAUGE_SQL_MARKER =
  "SELECT 'M', s.id, s.model, json_extract(m.data, '$.tokens.total'), json_extract(m.data, '$.tokens.output') " +
  "FROM message m JOIN session s ON s.id = m.session_id " +
  "WHERE s.id = (SELECT id FROM session ORDER BY time_updated DESC LIMIT 1) " +
  "AND m.data LIKE '%\"finish\"%' ORDER BY m.time_created DESC LIMIT 1; " +
  "SELECT 'S', id, model FROM session ORDER BY time_updated DESC LIMIT 1;";

// v2 unit 2: the spawn backend's v2 marker — SAME 5-field M row + 2-field S
// row shape (the shared parser handles both forms; the fork's JSON `{"id":…}`
// model value unwraps via parseModelId). Instantiated only when `session_v2`
// exists (SQL_TABLE_PROBE — the spawn backend's table probe, one cheap first
// exec deciding which marker form goes out; the v1 marker above stays the
// choice for v1-only DBs, byte-identical).
const GAUGE_SQL_MARKER_V2 =
  "SELECT 'M', s.id, s.model, " +
  `${SQL_TOKEN_TOTAL_V2}, json_extract(m.data, '$.tokens.output') ` +
  "FROM session_message m JOIN session_v2 s ON s.id = m.session_id " +
  "WHERE s.id = (SELECT id FROM session_v2 ORDER BY time_updated DESC LIMIT 1) " +
  `AND ${SQL_STEP_DISCRIMINATOR_V2} ORDER BY m.time_created DESC LIMIT 1; ` +
  "SELECT 'S', id, model FROM session_v2 ORDER BY time_updated DESC LIMIT 1;";
const SQL_TABLE_PROBE =
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('session_v2','session','session_message','message')";

// v2.6 — the PER-SESSION query forms (the ladder's blind-spot-free read; see
// the header block). Same column list and LIKE marker as the newest-session
// forms; the session is pinned by id (in-process: bound parameter; spawn:
// literal with single-quote escaping — opencode session ids are `ses_…`, the
// escape is belt-and-braces, not a quoting surface for user input).
const SQL_SESSION_BY_ID = sqlSessionById("session");
const SQL_FINISHED_STEP_SESSION =
  "SELECT s.id AS sid, s.model AS model, " +
  "json_extract(m.data, '$.tokens.total') AS total, " +
  "json_extract(m.data, '$.tokens.output') AS output " +
  "FROM message m JOIN session s ON s.id = m.session_id " +
  "WHERE s.id = ? " +
  'AND m.data LIKE \'%"finish"%\' ORDER BY m.time_created DESC LIMIT 1';
const SQL_FINISHED_STEP_SESSION_V2 =
  "SELECT s.id AS sid, s.model AS model, " +
  `${SQL_TOKEN_TOTAL_V2} AS total, ` +
  "json_extract(m.data, '$.tokens.output') AS output " +
  "FROM session_message m JOIN session_v2 s ON s.id = m.session_id " +
  "WHERE s.id = ? " +
  `AND ${SQL_STEP_DISCRIMINATOR_V2} ORDER BY m.time_created DESC LIMIT 1`;
const sqlSidLiteral = (sid) => `'${String(sid).replace(/'/g, "''")}'`;
const sqlMarkerForSession = (sid) => {
  const q = sqlSidLiteral(sid);
  return (
    "SELECT 'M', s.id, s.model, json_extract(m.data, '$.tokens.total'), json_extract(m.data, '$.tokens.output') " +
    "FROM message m JOIN session s ON s.id = m.session_id " +
    `WHERE s.id = ${q} AND m.data LIKE '%"finish"%' ORDER BY m.time_created DESC LIMIT 1; ` +
    `SELECT 'S', id, model FROM session WHERE id = ${q};`
  );
};
// v2 unit 2: the v2 per-session spawn marker — SAME field order as the v1
// form (the shared parser + the v2-only instantiation; the coexisting-DB
// winner pick reuses this builder pinned to the WINNER's sid — pairing by
// construction).
const sqlMarkerV2ForSession = (sid) => {
  const q = sqlSidLiteral(sid);
  return (
    "SELECT 'M', s.id, s.model, " +
    `${SQL_TOKEN_TOTAL_V2}, json_extract(m.data, '$.tokens.output') ` +
    "FROM session_message m JOIN session_v2 s ON s.id = m.session_id " +
    `WHERE s.id = ${q} AND ${SQL_STEP_DISCRIMINATOR_V2} ORDER BY m.time_created DESC LIMIT 1; ` +
    `SELECT 'S', id, model FROM session_v2 WHERE id = ${q};`
  );
};

// #165 (2026-10-26): the MODEL fallback for a NULL session row — the v2 PAIR
// only. Every auto_resume spawn-created session has `session_v2.model` NULL
// (measured live 2026-10-26), while its latest `session_message` row carries
// the model as `data.$.model` = the `{"id":…,"providerID":…}` JSON string
// (`json_extract` serializes that object back to text; `parseModelRef` parses
// it — #152 — so the downstream needs NO parser change). NO `type` filter: a
// `compaction` row carries the model the same way, and the fallback wants the
// latest row that HAS one. The v1 `session`↔`message` leg never instantiates
// this (its read stays byte-identical).
const sqlModelFallbackV2 = (sid) =>
  "SELECT json_extract(data, '$.model') AS model FROM session_message " +
  `WHERE session_id = ${sqlSidLiteral(sid)} ` +
  "AND json_extract(data, '$.model') IS NOT NULL AND json_extract(data, '$.model') <> '' " +
  "ORDER BY time_created DESC LIMIT 1";

// ---------------------------------------------------------------------------
// The backends — each returns the SAME raw shape:
//   { sid: string|undefined, model: string|null, total: number|null, output: number|null }
// and THROWS on any hard failure (the chain maps that to the named db-error).

// In-process helper shared by backends 1+2: open (READ-ONLY), the busy_timeout
// PRAGMA via the API, the two single-row reads, ONE retry on busy/locked,
// best-effort close. `target` (v2.6): the per-session read — when set, the
// session row is looked up by id and the finished step is scoped to it;
// unset keeps the newest-session SQL byte-identical.
// v2-migration unit 1 (2026-10-21): the SESSION-ROW leg resolves through
// `sessionRow` — `session_v2` FIRST, then `session` (both tables coexist in a
// migrated DB; NEITHER present keeps the v1 hard-failure outcome). Unit 2
// (2026-10-22): `sessionRow` ALSO REPORTS the winning TABLE — the mass leg
// then runs the instantiation PAIRED with it (session_v2↔session_message,
// session↔message); a MISSING PAIRED message table degrades to null (no-total)
// instead of failing the whole read.
const sessionTablesIn = (db) => {
  const found = [];
  for (const t of ["session_v2", "session"]) {
    try {
      const row = db.prepare("SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
      if (row != null) found.push(t);
    } catch {
      // unreadable catalog — the v1 table name is the only sane fallback
    }
  }
  return found;
};
const sessionRow = (db, target) => {
  const tables = sessionTablesIn(db);
  if (tables.length === 0) throw new Error("no session table");
  if (target != null) {
    for (const t of tables) {
      const row = db.prepare(sqlSessionById(t)).get(target);
      if (row != null) return { table: t, row }; // an id present in BOTH: session_v2 wins
    }
    return { table: undefined, row: undefined };
  }
  let best;
  let bestTable;
  for (const t of tables) {
    const row = db.prepare(sqlSessionNewest(t)).get();
    if (row == null) continue;
    if (best === undefined) {
      best = row;
      bestTable = t;
      continue;
    }
    if (tables.length < 2) continue; // single-table DB: no cross-table compare
    const rn = Number(db.prepare(`SELECT time_updated FROM ${t} WHERE id = ?`).get(row.id)?.time_updated ?? -Infinity);
    const rb = Number(db.prepare(`SELECT time_updated FROM ${bestTable} WHERE id = ?`).get(best.id)?.time_updated ?? -Infinity);
    if (rn > rb) {
      best = row;
      bestTable = t;
    } // a tie keeps the FIRST (`session_v2`) row
  }
  return { table: bestTable, row: best };
};
function readApiDb(openFn, target) {
  const attempt = () => {
    let db;
    try {
      db = openFn();
      db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS};`);
      const picked = sessionRow(db, target);
      const newest = picked.row;
      const massV2 = picked.table === "session_v2";
      let step = null;
      try {
        step =
          target != null
            ? db.prepare(massV2 ? SQL_FINISHED_STEP_SESSION_V2 : SQL_FINISHED_STEP_SESSION).get(target)
            : db.prepare(massV2 ? SQL_FINISHED_STEP_V2 : SQL_FINISHED_STEP).get();
      } catch (e) {
        // unit 2: the mass leg is instantiated against the PAIRED tables of
        // the SESSION-ROW winner (session_v2↔session_message; session↔message
        // — the v1 instantiation goes out BYTE-IDENTICAL). A MISSING PAIRED
        // message table degrades to null (no-total); any other error
        // propagates.
        if (!/no such table/i.test(String(e?.message ?? e))) throw e;
      }
      const sid = typeof newest?.id === "string" && newest.id !== "" ? newest.id : undefined;
      let model =
        step != null && typeof step.model === "string"
          ? step.model
          : typeof newest?.model === "string"
            ? newest.model
            : null;
      if (massV2 && (model == null || model === "")) {
        // #165 (2026-10-26): the MESSAGE-LEVEL model fallback — v2 pair only
        // (the v1 winner never reaches this leg). The session row has no model
        // (NULL for every spawn-created session), so ONE extra read of the
        // PAIRED message table takes the latest `$.model`. A missing paired
        // message table degrades to the null-model outcome (the same unit-2
        // rule as the mass leg); any other error propagates.
        const fallbackSid = sid ?? target;
        if (fallbackSid != null) {
          try {
            const row = db.prepare(sqlModelFallbackV2(fallbackSid)).get();
            if (typeof row?.model === "string" && row.model !== "") model = row.model;
          } catch (e) {
            if (!/no such table/i.test(String(e?.message ?? e))) throw e;
          }
        }
      }
      return {
        sid,
        model,
        total: step?.total == null ? null : Number(step.total),
        output: step?.output == null ? null : Number(step.output),
      };
    } finally {
      try {
        db?.close();
      } catch {
        // best effort — the read outcome has already been captured
      }
    }
  };
  try {
    return attempt();
  } catch (e) {
    if (/busy|locked/i.test(String(e?.message ?? e))) {
      // busy/locked on the first attempt (opencode writes concurrently) and
      // the busy_timeout budget exhausted: retry ONCE before giving up.
      return attempt();
    }
    throw e;
  }
}

// Backend 1 — node:sqlite (DatabaseSync, readOnly). Flag-free on the system
// node v24.19.0; also exposed by the SYSTEM bun 1.4.2 (NOT the opencode host).
async function readNodeSqlite(p, target) {
  const mod = await importModule("node:sqlite");
  const DatabaseSync = mod?.DatabaseSync;
  if (typeof DatabaseSync !== "function") throw new Error("DatabaseSync export missing");
  return readApiDb(() => new DatabaseSync(p, { readOnly: true }), target);
}

// Backend 2 — bun:sqlite (the native bun module). API facts verified on the
// system bun 1.4.2 — see the READ BACKEND CHAIN header (the spec's
// `{ create: false, readWrite: false }` sketch was WRONG for bun 1.4.2:
// the option is `readonly`, unknown options are rejected).
async function readBunSqlite(p, target) {
  const mod = await importModule("bun:sqlite");
  const Database = mod?.Database ?? (typeof mod?.default === "function" ? mod.default : mod?.default?.Database);
  if (typeof Database !== "function") throw new Error("Database export missing");
  const open = () => {
    try {
      return new Database(p, { readonly: true, timeout: BUSY_TIMEOUT_MS });
    } catch (e) {
      // shape-surprise fallback: a host whose bun rejects the combined
      // options falls back to the plain readonly form — but ONLY for a
      // constructor shape error; an OPEN error (missing file, …) propagates.
      if (/bad parameter|api misuse|misspelled/i.test(String(e?.message ?? e))) return new Database(p, { readonly: true });
      throw e;
    }
  };
  return readApiDb(open, target);
}

// Backend 3 — spawn-sqlite3 (the v1.x discipline, recovered from git
// history 2cf5f33; see the READ BACKEND CHAIN header for the full rationale).
const uriRo = (p) => `file:${p.replace(/\\/g, "/")}?mode=ro`;
// The sqlite3 CLI prints NULL as an EMPTY field (and honors a NULLVALUE of
// "NULL" only if configured) — treat both as "no value" → no-total. (The
// v1.x `Number("") → 0` would have misread that as total 0 — hardened here.)
const parseMarkerNumber = (v) => {
  if (typeof v !== "string" || v === "" || v === "NULL") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};
// v2 unit 2 (2026-10-22): the spawn read is TABLE-AWARE via a cheap probe
// exec FIRST (SQL_TABLE_PROBE — sqlite_master names only; a missing/unopenable
// DB fails here exactly like the single-exec v1 form failed before, so the
// db-error shape and the "deepest failing backend" pin survive). Then ONE
// marker exec, instantiated by the probe:
// - `session_v2` ABSENT  → the v1 marker constants, BYTE-IDENTICAL (the
//   existing probe spawn pins 34/35/36 ride this path unchanged);
// - `session_v2` present, no legacy `session` table (or legacy rows none) →
//   the v2 marker constants;
// - COEXISTING session tables → a `W` candidate exec (newest row per table
//   + time_updated) picks the WINNER in JS — the SAME rule as the in-process
//   sessionRow (greater time_updated; a tie keeps session_v2); the marker
//   exec is then PINNED to the winner's sid via the per-session builders —
//   mass pairing by construction (DoD 3: no cross-table pairing). A per-
//   session target skips the candidate exec: the table HOLDING the id wins
//   (session_v2 when present in BOTH).
// NO session table → throw ("no session table") — the v1 hard-failure outcome
// shape (the marker exec would have died on "no such table" before).
const spawnExec = (p, sql) =>
  execFileAsync(DEFAULT_EXE_PATH, [uriRo(p), sql], {
    timeout: SPAWN_TIMEOUT_MS, // hard KILL — a stuck child becomes a db-error, never a hang
    maxBuffer: MAX_BUFFER,
    encoding: "utf8",
  }).then(
    (res) => res,
    (e) => {
      const isTimeout = e?.killed === true || /timed?\s*out/i.test(String(e?.message ?? ""));
      const detail = isTimeout ? `timeout ${SPAWN_TIMEOUT_MS}ms kill` : String(e?.stderr ?? "").trim() || String(e?.message ?? e);
      throw new Error(String(detail).replace(/\r?\n+/g, " | ").slice(0, 106));
    },
  );
async function readSpawnSqlite3(p, target) {
  if (!existsSync(DEFAULT_EXE_PATH)) throw new Error(`exe-missing ${DEFAULT_EXE_PATH}`);
  const tables = new Set(
    String((await spawnExec(p, SQL_TABLE_PROBE)).stdout)
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter((x) => x !== ""),
  );
  const hasV2 = tables.has("session_v2");
  const hasV1 = tables.has("session");
  if (!hasV2 && !hasV1) throw new Error("no session table");
  // Winner pick among the session tables — the SAME rule as the in-process
  // sessionRow (session_v2 FIRST; coexisting greater time_updated wins, a
  // tie keeps session_v2; an id TARGET is held by its table, session_v2 wins
  // in BOTH). The marker exec is then PINNED to the winner's table+sid (DoD
  // 3: the mass pairs with the SAME table that won the session-row pick);
  // an empty winSid means "no rows / single table" → the subquery form.
  let winTable;
  let winSid;
  const spawnHeld = async (t, sid) => {
    const out = String((await spawnExec(p, `SELECT 'Y' FROM ${t} WHERE id = ${sqlSidLiteral(sid)} LIMIT 1;`)).stdout);
    return out.split(/\r?\n/).some((x) => x.trim() === "Y");
  };
  if (target != null) {
    winSid = String(target);
    if (hasV2) {
      if (await spawnHeld("session_v2", target)) winTable = "session_v2";
      else if (hasV1 && await spawnHeld("session", target)) winTable = "session";
      else winTable = "session_v2"; // in NEITHER: empty rows via the v2 pair (no-total shape)
    } else {
      winTable = "session"; // v1-only DB: today's per-session form
    }
  } else if (hasV2 && !hasV1) {
    winTable = "session_v2";
    winSid = "";
  } else if (!hasV2) {
    winTable = "session";
    winSid = ""; // v1-only DB: today's newest form, BYTE-IDENTICAL
  } else {
    // coexisting newest form: one `W` candidate exec resolves the winner.
    const rows = String(
      (
        await spawnExec(
          p,
          "SELECT 'W', id, time_updated FROM session_v2 ORDER BY time_updated DESC LIMIT 1; SELECT 'W', id, time_updated FROM session ORDER BY time_updated DESC LIMIT 1;",
        )
      ).stdout,
    );
    let wV2;
    let wV1;
    for (const line of rows.split(/\r?\n/)) {
      if (!line.startsWith("W|")) continue;
      const parts = line.slice(2).split("|");
      const tnum = Number(parts[parts.length - 1]);
      const rec = { sid: parts[0], t: Number.isFinite(tnum) ? tnum : -Infinity };
      if (wV2 === undefined) wV2 = rec;
      else if (wV1 === undefined) wV1 = rec;
    }
    if (wV2 !== undefined && !(wV1 !== undefined && wV1.t > wV2.t)) {
      winTable = "session_v2";
      winSid = String(wV2.sid);
    } else {
      winTable = "session";
      winSid = String(wV1?.sid ?? "");
    }
  }
  const markerSql =
    winTable === "session_v2"
      ? winSid === ""
        ? GAUGE_SQL_MARKER_V2
        : sqlMarkerV2ForSession(winSid)
      : winSid === ""
        ? GAUGE_SQL_MARKER
        : sqlMarkerForSession(winSid);
  const res = await spawnExec(p, markerSql);
  let sid;
  let model = null;
  let total = null;
  let output = null;
    for (const line of String(res.stdout).split(/\r?\n/)) {
      if (line.startsWith("S|")) {
        // sid | model... — sid is the FIRST field; the rest of the line is the
        // session-row model (a model id containing '|' is still safe — the
        // split is only on the first bar, like the M row).
        const rest = line.slice(2);
        const bar = rest.indexOf("|");
        const s = bar === -1 ? rest : rest.slice(0, bar);
        const sm = bar === -1 ? "" : rest.slice(bar + 1);
        sid = s || undefined;
        // The M row prints FIRST and is the precedence winner — the S-row
        // model only fills in when the read still carries no model (the
        // no-total case, the #114 session-row fallback).
        if (model === null && sm !== "" && sm !== "NULL") model = sm;
      } else if (line.startsWith("M|")) {
      const parts = line.slice(2).split("|");
      // sid | model... | total | output — total/output are the LAST two
      // fields (a model id containing '|' is then still safe).
      if (parts.length >= 4) {
        sid = parts[0] || sid;
        model = parts.slice(1, parts.length - 2).join("|") || null;
        total = parseMarkerNumber(parts[parts.length - 2]);
        output = parseMarkerNumber(parts[parts.length - 1]);
      }
    }
  }
  return { sid, model, total, output };
}

const BACKENDS = {
  "node:sqlite": readNodeSqlite,
  "bun:sqlite": readBunSqlite,
  "spawn-sqlite3": readSpawnSqlite3,
};

function orderedBackendsFor(p) {
  const cached = backendCache.get(p);
  if (cached !== undefined && backendList.includes(cached)) {
    // The last successful backend is tried FIRST (the per-process cache);
    // the rest follow the chain order.
    return [cached, ...backendList.filter((n) => n !== cached)];
  }
  return [...backendList];
}

// raw (any backend) -> the shared result shapes.
function gaugeFromRaw(raw) {
  const sid = typeof raw.sid === "string" && raw.sid !== "" ? raw.sid : "unknown";
  const total = raw.total == null ? Number.NaN : Number(raw.total);
  if (Number.isNaN(total)) {
    // v2-migration unit 1 (2026-10-21): the no-total shape now also carries
    // `window` — the RESOLVED context limit for the read session's model
    // (resolveWindow: config-first, name-marker fallback). The gauge family
    // gets the LIMITS half for a v2 session before the mass leg lands
    // (unit 2); the SESSION-ROW half (sid/modelId) resolves from `session_v2`.
    const { id, ref } = parseModelRef(raw.model);
    return { ok: false, kind: "no-total", sid, modelId: id, window: resolveWindow(ref) };
  }
  const output = raw.output == null || Number.isNaN(Number(raw.output)) ? 0 : Number(raw.output);
  const { id, ref } = parseModelRef(raw.model);
  return {
    ok: true,
    kind: "ok",
    sid,
    modelId: id,
    total,
    output, // evidence field — kept in the shape, NOT subtracted (#103)
    ctx: total, // #103: in+out+cr — the context at the start of the NEXT turn
    window: resolveWindow(ref), // #115 config-first via the provider-qualified ref (#152), name-marker fallback
  };
}

// Reads the db (NEVER throws — a hard failure returns kind:"db-error").
// Walks the backend chain in order (the per-path cached backend first); the
// FIRST SUCCESS wins and is cached for the rest of the process. Every
// backend failure is collected; if ALL fail, the result names the DEEPEST
// failing backend (the last in the chain — the production last resort).
// v2.6: an optional non-empty sessionID switches the read to THAT session
// (the per-session SQL forms above); no/empty keeps the newest-session
// default byte-identical.
export async function readGauge(dbPathOverride, sessionID) {
  const p = dbPathOverride ?? dbPath;
  const target = typeof sessionID === "string" && sessionID !== "" ? sessionID : undefined;
  const failures = [];
  for (const name of orderedBackendsFor(p)) {
    const impl = BACKENDS[name];
    if (impl === undefined) {
      failures.push({ name, error: "unknown-backend" });
      continue;
    }
    try {
      const raw = await impl(p, target);
      backendCache.set(p, name);
      return gaugeFromRaw(raw);
    } catch (e) {
      failures.push({ name, error: String(e?.message ?? e).replace(/\r?\n+/g, " | ").slice(0, 106) });
    }
  }
  const last = failures.length > 0 ? failures[failures.length - 1] : { name: "chain", error: "no backends configured" };
  return {
    ok: false,
    kind: "db-error",
    sid: "unknown",
    modelId: "",
    error: `${last.name} ${last.error}`.slice(0, 120),
  };
}
