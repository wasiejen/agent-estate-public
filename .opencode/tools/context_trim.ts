// plan39 (approved 2026-09-29: proposals/approved/
// 2026-09-28_context-trim-tool.md — the maintainer's "1. + 2. are approved" +
// round-2 "go :-); Unit 1 = this tool, `turns` (row-deletion) Ruled out):
// the `context_trim` custom tool — report + trim a session's LIVE model
// context over the opencode DB (the gauge's CURRENT db path via
// getDbPath — the same resolution as the gauge core; the smoke/probe
// steer it via setDbPath; nothing re-derived here).
//
// Design authority (do not re-research):
//   - agent/research/2026-09-28_context-erase-tail-trim.md §3 + §5 — the
//     window semantics, the guard, the marker quartet, the lever.
//   - proposals/approved/2026-09-28_context-trim-tool.md §"Build scope"
//     (Unit 1) + the round-2 feedback §8 (the report's file/line info).
//
// WHY IT WORKS (research doc §1-3, verified 1.18.32): the model context is
// re-derived from the DB at the top of EVERY loop step (prompt.ts:1092 →
// fresh select message-v2.ts:433-446 → toModelMessagesEffect) — no
// in-memory history, no prompt cache. A single-field JSON edit of the
// compaction part's `tail_start_id` trims or extends the retained tail
// precisely (the host itself rewrites that field in place on compaction —
// compaction.ts:461-466; the retained slice is exactly
// result.slice(tailIndex, compactionIndex), message-v2.ts:568-573). No
// restart, no invalidation.
//
// WINDOW SEMANTICS (mirrored from message-v2.ts:525-576 — the ascending
// (time_created, id) order; the host's stream() pages DESC then reverses
// per page, and filterCompacted reverses the whole list, so the window
// math runs on the ASCENDING list):
//   - the last compaction marker = the LAST (most recent) user row whose
//     parts carry a `compaction` part with `tail_start_id !== undefined`
//     (host findLastIndex, :549-553);
//   - summary index (the host guard's detection, :558-565) = the FIRST
//     assistant row strictly AFTER the marker with `info.summary` +
//     `parentID === marker.id` (no finish check in the host guard);
//   - the COMPLETED compaction (this tool's stricter marker+summary
//     requirement, spec-verified fact) additionally requires
//     `info.finish` + no `info.error` (message-v2.ts:545-546, 558-566);
//   - tail index = the message whose id === the part's `tail_start_id`;
//   - the host guard (:568): `tailIndex >= 0 && tailIndex < compactionIndex
//     && summaryIndex > compactionIndex` — guard fail → the FULL
//     un-reordered history is sent (overflow — the #93 v1 context_recovery
//     backstop was RETIRED with #150 unit B: a guard fail just sends the full history).
//
// Surface (the tool() form — the shape of submit.ts / ctx_gauge.ts; the
// host names the tool by FILENAME — no `name` field):
//   - report <session> [target] — READ-ONLY. TWO forms (the surface
//     returns the CUT-DOWN form — the cheap default; the FULL form stays
//     available through the core export reportWindow — byte-identical to
//     the pre-U1 shape): (1) the window-state header (the last completed
//     compaction: marker present? compaction user row id, summary id,
//     current tail_start_id, retained-tail count, post-summary count; no
//     marker → say so), (2) per-message rows for the messages INSIDE the
//     model window (the retained-tail slice + the post-summary slice; no
//     marker / guard-degenerate → the full history), token mass per row
//     (info.tokens input+output+cache.read when all present, else bytes/4
//     of the part text — text parts' `text` + tool parts' string
//     `state.output`); FULL form: id, time, role + tool name/target
//     (`read`: input filePath + offset/limit; `bash`: command;
//     `webfetch`: url — other tools: name only); CUT-DOWN form (U1,
//     2026-10-01 context budget package): NUMBERED rows 1..N from the
//     window start (the number → messageID map stays internal — the agent
//     never sees/enters dense ids in the row list), role + mass +
//     tool-target detail ONLY (no content echoes, no id, no time), then
//     the `last: N` flag (the current last row number); (3) the
//     RECOMMENDATION block (cut-down form only — emitted when the window
//     is a proper completed-compaction window, hostGuard + strict
//     summary): 3 retention options low / medium / high, each ANCHORED AT
//     A MESSAGE ID (stable across pre/post-compaction deliberation —
//     the row number shifts, the id doesn't) + its keep count (the
//     tail-mode keepMessages value) + the read/thought/shell mass split
//     of retained vs dropped (retained = anchor → just before the
//     compaction row + the always-in-window post-summary slice; dropped =
//     strictly before the anchor; the marker + summary pair is in neither)
//     + the oldest-kept (anchor) message's one-line hint; low = the
//     current tail head (status quo), high = the earliest floor-valid
//     anchor (index 0), medium = the midpoint index (omitted when it
//     coincides with an end); (4) the BIGGEST-DROPPABLE list (cut-down
//     form only): the top-N (default 5, the core opts allow another)
//     heaviest finished turns (finished, no error — the call-result
//     pairs carry their tool parts' inputs + outputs) in the window as
//     window row number + mass — the U2 filter's target list; (5) with
//     target: a dry-run of what a tail rewrite to it would remove/keep
//     (counts + token mass) + whether the tail write would be accepted —
//     no write (both forms).
//   - tail <session> <messageID> — WRITE: rewrite the last completed
//     compaction part's `tail_start_id` to the target id. Validation,
//     fail-closed (mirrors the guard exactly): (1) session exists;
//     (2) the last completed compaction exists (marker + summary child);
//     (3) the target id exists in the session; (4) the target sits
//     strictly BEFORE the compaction user row in (time_created, id)
//     order; (5) retained-tail count (target → compaction row, exclusive)
//     >= 6 — the keepMessages floor (the maintainer's round-2 ruling); a
//     retained tail below 6 is rejected. Single transaction; WAL — the
//     host reads on its own connection (concurrent read safe);
//     SQLITE_BUSY → one short-backoff retry (the gauge's busy_timeout
//     pattern) → fail-closed (never a partial write).
//   - tail <session> keepMessages=N — the keep-COUNT form (WRITE, the
//     same single transaction): N = the retained-tail MESSAGE count —
//     the N-th message STRICTLY before the compaction user row becomes
//     the new tail head (the compact_memory keepMessages count semantics
//     — a message COUNT, not a token budget). Mutually exclusive with
//     the <messageID> form. Delegates to the existing tailSetKeep core
//     export (zero new validation logic — its existing rejections:
//     keep-invalid / keep-exceeds-history / floor 6 / no-completed-
//     compaction / session-not-found); the return line is the core's
//     `tail-set= <old> -> <new> keep=N` (the same shape as the
//     messageID form). Primarily a SHRINK lever (the post-compaction
//     trim); growing stays available (it re-reads raw messages you no
//     longer remember — nothing is lost, the DB keeps them); keep=0
//     stays rejected by the floor 6.
//
// Backend (WRITABLE — the gauge READ chain does not apply): a chain
// tried in order, FIRST SUCCESS wins: (1) `bun:sqlite` (the native
// module of the bun-compiled host), (2) `node:sqlite` (system node v24+
// — the smoke host), (3) `spawn-sqlite3` — the LAST-RESORT maintainer-
// placed CLI (TODO #126; the gauge core's proven spawn discipline):
// execFileSync ARGS ARRAY (no shell — no quoting surface), a hard
// 2500 ms KILL per call (a stuck child is a db-error, never a hang).
// report mode = read-only queries, each ONE CLI invocation on a
// READ-ONLY db URI (`mode=ro` — no journal write while the host writes
// concurrently); the tail write = the BEGIN..COMMIT batch flushed as
// ONE CLI invocation carrying `PRAGMA busy_timeout = 2500; BEGIN; …;
// COMMIT;` (the single-transaction guarantee survives the process
// boundary). When NO backend is available the open is a fail-closed
// db-error (never a blind write) — a missing CLI exe, a spawn error, or
// a timeout all land on that same path. Both in-process backends open
// read-write with `PRAGMA busy_timeout = 2500`. The chain order is
// test-steerable via `setBackends` (the gauge core's pattern — the
// smoke forces `["spawn-sqlite3"]`). The core is exported for the
// smoke (the smoke NEVER points it at the live DB).
//
// Registration is the maintainer's domain (the live opencode.jsonc —
// this file is deliberately NOT registered in any repo config; the
// handover carries the registration snippet).
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
import { existsSync } from "node:fs";
import { tool } from "@opencode-ai/plugin";
import { getDbPath, BUSY_TIMEOUT_MS, DEFAULT_EXE_PATH } from "../plugins/scripts/gauge.mjs";
// The keepMessages floor (round-2 ruling — stated in the description).
const FLOOR = 6;

type Part = { id: string; data: any };
type Msg = { id: string; time: number; data: any; parts: Part[] };
type Ctx = { db: any; backend: string };

// ---------------------------------------------------------------------------
// Backend resolution (the writable chain: in-process → last-resort CLI)
// — see the header block.
// ---------------------------------------------------------------------------

// The chain in selection order (the gauge core's DEFAULT_BACKENDS
// pattern; spawn-sqlite3 is the last resort — TODO #126).
export const TRIM_BACKENDS = Object.freeze(["bun:sqlite", "node:sqlite", "spawn-sqlite3"]);
let backendList = [...TRIM_BACKENDS];
// The backend-list test hook (the gauge core's setBackends pattern) —
// the smoke restricts the chain to ["spawn-sqlite3"] to exercise the
// spawn path; omit the arg to restore the default. The production host
// never calls it.
export function setBackends(list?: string[]) {
  backendList = Array.isArray(list) ? [...list] : [...TRIM_BACKENDS];
}

// ---------------------------------------------------------------------------
// Backend 3 — spawn-sqlite3 (the gauge core's proven spawn discipline;
// read-only CLI calls for report, ONE-CLI-call transaction for tail).
// ---------------------------------------------------------------------------
const SPAWN_TIMEOUT_MS = 2500; // hard KILL per CLI call — never a hang
// 16 MB: the report pulls the window's part JSON through the CLI (the
// target fields + token mass), and a window with big tool outputs can
// sum past 1 MB (measured 2026-10-01: ENOBUFS at 1 MB on a fork window
// carrying 109/36/25 KB parts). The fail-closed end stays — ENOBUFS at
// 16 MB is a clear error, not a hang.
const SPAWN_MAX_BUFFER = 16 * 1024 * 1024;

// The positional `?` bindings inlined (the CLI takes ONE SQL text):
// strings single-quoted ('' doubled), numbers/booleans as-is, null →
// NULL. The schema's JSON columns are JSON.stringify output (control
// bytes escaped — no raw tab/newline in a value), so the tab-separated
// CLI rows parse cleanly.
function bindSql(sql: string, args: any[]): string {
  let out = "";
  let ai = 0;
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === "?" && ai < args.length) {
      const v = args[ai++];
      if (v == null) out += "NULL";
      else if (typeof v === "number" || typeof v === "boolean") out += String(v);
      else out += `'${String(v).replace(/'/g, "''")}'`;
    } else {
      out += sql[i];
    }
  }
  return out;
}

// ONE sqlite3 CLI invocation (the gauge core's discipline — ARGS ARRAY
// via execFileSync, no shell, hard timeout KILL). The column separator
// is forced to SOH (\x01): the CLI default is `|` (a pipe CAN occur inside
// the JSON data columns; a raw \x01 never does — JSON.stringify escapes
// control bytes). \x01 is NON-whitespace, so it survives the Windows
// command-line join UNQUOTED: a lone TAB arg is whitespace-collapsed in
// the Bun-compiled live host, shifting the CLI's args (-separator eats
// the DB URI, the SQL string becomes the "database name") → the CLI
// drops to interactive mode and hangs on stdin → the deterministic
// 2500 ms kill (measured 2026-09-30/10-01, the forked live test; the
// gauge's separator-less call works live — same exe, same ro-URI).
// `dbRef` is the READ-ONLY URI for report reads, the plain path for the
// write call.
// ASYNC (the gauge's proven pattern): the live Bun host's execFileSync
// works ONCE per process and every later spawn 2500 ms-kills (a
// compiled-Bun Windows stdio-handle issue — measured 2026-10-01: the
// first CLI call after each restart succeeds, every later one hangs,
// while bash/node parents and the gauge's async execFile keep working).
async function runCli(dbRef: string, sql: string): Promise<string> {
  try {
    // promisified execFile resolves with an {stdout, stderr} object (the
    // node special case — the gauge reads res.stdout the same way).
    const res = (await execFileAsync(DEFAULT_EXE_PATH, ["-separator", "\x01", dbRef, sql], {
      timeout: SPAWN_TIMEOUT_MS,
      maxBuffer: SPAWN_MAX_BUFFER,
      encoding: "utf8",
    })) as any;
    return String(res?.stdout ?? res);
  } catch (e: any) {
    const isTimeout = e?.killed === true || /timed?\s*out/i.test(String(e?.message ?? ""));
    const stderr = String(e?.stderr ?? "").trim();
    const detail = isTimeout
      ? `timeout ${SPAWN_TIMEOUT_MS}ms kill${stderr ? ` stderr: ${stderr}` : ""}`
      : stderr || String(e?.message ?? e);
    throw new Error(String(detail).replace(/\r?\n+/g, " | ").slice(0, 106));
  }
}

// The tab-separated CLI rows → objects keyed by the SELECT-list column
// names (the in-process backends return named rows — the adapter keeps
// the same shape). An empty field = NULL (the schema's queried columns
// are all NOT NULL, so the mapping is identity-safe).
function parseRows(out: string, names: string[]): any[] {
  const rows: any[] = [];
  for (const line of String(out).split(/\r?\n/)) {
    if (line === "") continue;
    const cols = line.split("\x01");
    const row: any = {};
    names.forEach((n, i) => {
      row[n] = cols[i] === "" ? null : cols[i];
    });
    rows.push(row);
  }
  return rows;
}

// The SELECT-list column names (this schema's queries are flat
// single-level selects — bare identifiers, no subqueries, no `AS`).
function selectNames(sql: string): string[] {
  const m = sql.match(/^\s*SELECT\s+([^;]*?)\s+FROM\s/i);
  return m ? m[1].split(",").map((c) => c.trim()) : [];
}

// A thin Ctx-shaped adapter over the CLI: prepare().get/.all = ONE
// read-only call each; run() inside the BEGIN..COMMIT batch is buffered
// and flushed as ONE read-write call at COMMIT (the BEGIN opens the
// batch with `PRAGMA busy_timeout` — the write's busy wait); ROLLBACK
// discards the buffer (nothing was executed — the open transaction
// dies with its process); close() is a no-op.
function openSpawnDb(dbPath: string) {
  const roUri = `file:${dbPath.replace(/\\/g, "/")}?mode=ro`;
  const db: any = { tx: null as null | string[] };
  db.prepare = (sql: string) => {
    const bound = (...args: any[]) => bindSql(sql, args);
    return {
      get: async (...args: any[]) => {
        const rows = parseRows(await runCli(roUri, bound(...args)), selectNames(sql));
        return rows.length > 0 ? rows[0] : null;
      },
      all: async (...args: any[]) => parseRows(await runCli(roUri, bound(...args)), selectNames(sql)),
      run: async (...args: any[]) => {
        const stmt = bound(...args);
        const full = stmt.endsWith(";") ? stmt : stmt + ";";
        if (db.tx != null) {
          db.tx.push(full);
        } else {
          await runCli(dbPath, full);
        }
        return {};
      },
    };
  };
  db.exec = async (sql: string) => {
    const t = sql.trim();
    if (/^BEGIN\b/i.test(t)) {
      db.tx = [`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS};`, t];
      return;
    }
    if (/^COMMIT\b/i.test(t)) {
      // The buffered statements + the COMMIT itself, ONE invocation.
      const script = [...(db.tx ?? []), t].map((s) => (s.endsWith(";") ? s : s + ";")).join("\n");
      db.tx = null;
      await runCli(dbPath, script);
      return;
    }
    if (/^ROLLBACK\b/i.test(t)) {
      // Nothing was executed (the flush happens at COMMIT) — discard.
      db.tx = null;
      return;
    }
    if (/^PRAGMA\s+busy_timeout/i.test(t)) {
      // The write call carries its own busy_timeout (the BEGIN branch)
      // — a bare open-time PRAGMA needs no connection.
      return;
    }
    await runCli(dbPath, t);
  };
  db.close = () => {
    db.tx = null;
  };
  return db;
}

async function openDb(dbPath: string): Promise<Ctx> {
  if (!existsSync(dbPath)) throw new Error(`db-missing ${dbPath}`);
  const failures: string[] = [];
  for (const name of backendList) {
    try {
      if (name === "bun:sqlite") {
        // 1. bun:sqlite — the native module of the bun-compiled host.
        const mod: any = await import("bun:sqlite");
        const Database = mod?.Database ?? (typeof mod?.default === "function" ? mod.default : mod?.default?.Database);
        if (typeof Database !== "function") throw new Error("module-shape");
        const db = new Database(dbPath, { timeout: BUSY_TIMEOUT_MS });
        try {
          db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS};`);
        } catch {
          // the native `timeout` option already covers the busy wait
        }
        return { db, backend: "bun:sqlite" };
      }
      if (name === "node:sqlite") {
        // 2. node:sqlite — system node v24+ (the smoke/probe host).
        const mod: any = await import("node:sqlite");
        const DatabaseSync = mod?.DatabaseSync;
        if (typeof DatabaseSync !== "function") throw new Error("module-shape");
        const db = new DatabaseSync(dbPath);
        db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS};`);
        return { db, backend: "node:sqlite" };
      }
      if (name === "spawn-sqlite3") {
        // 3. spawn-sqlite3 — the last-resort CLI (see the header block).
        if (!existsSync(DEFAULT_EXE_PATH)) throw new Error(`exe-missing ${DEFAULT_EXE_PATH}`);
        return { db: openSpawnDb(dbPath), backend: "spawn-sqlite3" };
      }
      throw new Error("unknown-backend");
    } catch (e: any) {
      failures.push(`${name} ${String(e?.message ?? e).replace(/\r?\n+/g, " | ").slice(0, 40)}`);
    }
  }
  throw new Error(`no writable sqlite backend (${failures.join("; ") || "no backends configured"})`);
}

// A busy/locked error → the gauge's retry discipline (one retry; the
// busy_timeout is the short backoff).
function isBusy(e: any): boolean {
  return /busy|locked/i.test(String(e?.message ?? e));
}

// ---------------------------------------------------------------------------
// Session state load (read-only queries — never throws, never mutates).
// ---------------------------------------------------------------------------

function parseJsonSafe(raw: string, what: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`bad-json ${what}`);
  }
}

// Loads the session's messages + parts in the host's ASCENDING
// (time_created, id) order (the window-math order, see the header).
async function loadSession(ctx: Ctx, sessionID: string): Promise<{ exists: boolean; msgs: Msg[] }> {
  const sess = await ctx.db.prepare("SELECT id FROM session WHERE id = ?").get(sessionID);
  if (sess == null) return { exists: false, msgs: [] };
  const mRows: any[] = await ctx.db
    .prepare("SELECT id, time_created, data FROM message WHERE session_id = ? ORDER BY time_created ASC, id ASC")
    .all(sessionID);
  const pRows: any[] = await ctx.db
    .prepare("SELECT id, message_id, data FROM part WHERE session_id = ? ORDER BY message_id ASC, id ASC")
    .all(sessionID);
  const partsByMsg = new Map<string, Part[]>();
  for (const r of pRows) {
    const list = partsByMsg.get(r.message_id);
    const part: Part = { id: r.id, data: parseJsonSafe(String(r.data), `part ${r.id}`) };
    if (list) list.push(part);
    else partsByMsg.set(r.message_id, [part]);
  }
  const msgs: Msg[] = mRows.map((r) => ({
    id: r.id,
    time: Number(r.time_created),
    data: parseJsonSafe(String(r.data), `message ${r.id}`),
    parts: partsByMsg.get(r.id) ?? [],
  }));
  return { exists: true, msgs };
}

// ---------------------------------------------------------------------------
// The window math (mirrors message-v2.ts:525-576 — see the header).
// ---------------------------------------------------------------------------

type WindowState = {
  compactionIndex: number; // -1 when no marker
  markerId: string | null;
  tailStartId: string | null;
  summaryIndex: number; // the host-guard (loose) detection
  strictSummaryIndex: number; // the completed-compaction (strict) detection
  summaryId: string | null; // the strict summary's id (null when absent)
  tailIndex: number;
  hostGuard: boolean;
  retained: number; // slice(tailIndex, compactionIndex) length (0 when degenerate)
  postSummary: number; // messages strictly after the loose summary index
};

function computeWindow(msgs: Msg[]): WindowState {
  // The last compaction marker (host findLastIndex, :549-553).
  let compactionIndex = -1;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.data?.role === "user" && m.parts.some((p) => p.data.type === "compaction" && p.data.tail_start_id !== undefined)) {
      compactionIndex = i;
    }
  }
  const marker = compactionIndex >= 0 ? msgs[compactionIndex] : null;
  const part = marker
    ? marker.parts.find((p) => p.data.type === "compaction" && p.data.tail_start_id !== undefined)
    : undefined;
  const tailStartId = part?.data?.tail_start_id ?? null;

  // summary index — the host guard's LOOSE detection (:558-565:
  // summary + parentID, no finish check) and the COMPLETED-COMPACTION
  // strict detection (:545-546: summary + finish + no error).
  let summaryIndex = -1;
  let strictSummaryIndex = -1;
  if (marker != null) {
    for (let j = compactionIndex + 1; j < msgs.length; j++) {
      const m = msgs[j];
      if (m.data?.role !== "assistant" || m.data?.parentID !== marker.id) continue;
      if (summaryIndex === -1 && m.data?.summary) summaryIndex = j;
      if (strictSummaryIndex === -1 && m.data?.summary && m.data?.finish && !m.data?.error) strictSummaryIndex = j;
    }
  }

  const tailIndex = tailStartId ? msgs.findIndex((m) => m.id === tailStartId) : -1;
  const hostGuard = tailIndex >= 0 && tailIndex < compactionIndex && summaryIndex > compactionIndex;
  const retained =
    compactionIndex >= 0 && tailIndex >= 0 && tailIndex < compactionIndex ? compactionIndex - tailIndex : 0;
  const postSummary =
    compactionIndex >= 0 && summaryIndex > compactionIndex ? msgs.length - (summaryIndex + 1) : 0;

  return {
    compactionIndex,
    markerId: marker?.id ?? null,
    tailStartId,
    summaryIndex,
    strictSummaryIndex,
    summaryId: strictSummaryIndex >= 0 ? msgs[strictSummaryIndex].id : null,
    tailIndex,
    hostGuard,
    retained,
    postSummary,
  };
}

// Token mass of ONE message (the spec's rule): info.tokens
// input+output+cache.read when all three are present, else bytes/4 of
// the part text (text parts' `text` + tool parts' string `state.output`).
function massOf(m: Msg): number {
  const t = m.data?.tokens;
  if (
    t != null &&
    Number.isFinite(t.input) &&
    Number.isFinite(t.output) &&
    t?.cache != null &&
    Number.isFinite(t.cache.read)
  ) {
    return t.input + t.output + t.cache.read;
  }
  let bytes = 0;
  for (const p of m.parts) {
    if (p.data?.type === "text" && typeof p.data?.text === "string") bytes += Buffer.byteLength(p.data.text, "utf8");
    else if (p.data?.type === "tool" && typeof p.data?.state?.output === "string")
      bytes += Buffer.byteLength(p.data.state.output, "utf8");
  }
  return Math.floor(bytes / 4);
}

const massKindOf = (m: Msg): "tokens" | "bytes4" => {
  const t = m.data?.tokens;
  return t != null && Number.isFinite(t.input) && Number.isFinite(t.output) && t?.cache != null && Number.isFinite(t.cache.read)
    ? "tokens"
    : "bytes4";
};

// The per-part target (spec §8: read → filePath + offset/limit; bash →
// command; webfetch → url; other tools → name only). Newlines/tabs in a
// command are escaped so a row stays ONE line.
function toolTarget(p: Part): string | null {
  const d = p.data;
  if (d?.type !== "tool") return null;
  const input = d?.state?.input;
  switch (d?.tool) {
    case "read": {
      if (typeof input?.filePath !== "string") return null;
      let s = input.filePath;
      if (Number.isFinite(input?.offset)) s += ` offset=${input.offset}`;
      if (Number.isFinite(input?.limit)) s += ` limit=${input.limit}`;
      return s;
    }
    case "bash": {
      if (typeof input?.command !== "string") return null;
      return input.command.replace(/\r?\n/g, "\\n").replace(/\t/g, "\\t");
    }
    case "webfetch": {
      if (typeof input?.url !== "string") return null;
      return input.url;
    }
    default:
      return null;
  }
}

function rowOf(m: Msg): string {
  let s = `${m.id} ${m.time} ${m.data?.role ?? "?"} ${massKindOf(m)}=${massOf(m)}`;
  for (const p of m.parts) {
    if (p.data?.type !== "tool") continue;
    s += ` tool=${p.data.tool}`;
    const t = toolTarget(p);
    if (t != null) s += ` target=${t}`;
  }
  return s;
}

// The cut-down (brief) row (U1): the FULL row without id + time — the
// caller prefixes the 1-based window row number (the number → messageID
// map stays internal; the agent never sees/enters dense ids).
function briefRowOf(m: Msg): string {
  let s = `${m.data?.role ?? "?"} ${massKindOf(m)}=${massOf(m)}`;
  for (const p of m.parts) {
    if (p.data?.type !== "tool") continue;
    s += ` tool=${p.data.tool}`;
    const t = toolTarget(p);
    if (t != null) s += ` target=${t}`;
  }
  return s;
}

// The read / thought / shell mass split of a message SET (U1
// recommendation leg) — a composition estimate: the part bytes per
// category, floored to /4 per category. The message totals stay the
// spec's massOf rule (provider tokens when present) — the split does NOT
// have to sum to the total. Categories: read = the string
// `state.output` of the `read` + `webfetch` tool parts (pulled-in
// content: files / URLs); thought = the text parts' `text` (conversation
// text, all roles); shell = the string `state.output` of the `bash` tool
// parts.
function splitOf(set: Msg[]): { read: number; thought: number; shell: number } {
  let read = 0;
  let thought = 0;
  let shell = 0;
  for (const m of set) {
    for (const p of m.parts) {
      const d = p.data;
      if (d?.type === "text" && typeof d?.text === "string") {
        thought += Buffer.byteLength(d.text, "utf8");
      } else if (d?.type === "tool" && typeof d?.state?.output === "string") {
        if (d.tool === "read" || d.tool === "webfetch") read += Buffer.byteLength(d.state.output, "utf8");
        else if (d.tool === "bash") shell += Buffer.byteLength(d.state.output, "utf8");
      }
    }
  }
  return { read: Math.floor(read / 4), thought: Math.floor(thought / 4), shell: Math.floor(shell / 4) };
}

// The one-line hint of a message (U1 recommendation leg): the first text
// part's text, else the first tool part's target, else the role —
// escaped to one line, truncated at 48 chars.
function hintOf(m: Msg): string {
  for (const p of m.parts) {
    if (p.data?.type === "text" && typeof p.data?.text === "string") {
      return p.data.text.replace(/\r?\n/g, "\\n").replace(/\t/g, "\\t").slice(0, 48);
    }
  }
  for (const p of m.parts) {
    if (p.data?.type !== "tool") continue;
    const t = toolTarget(p);
    if (t != null) return t.slice(0, 48);
  }
  return String(m.data?.role ?? "?");
}

// The U1 recommendation block: the 3 retention options (low / medium /
// high), each anchored at a MESSAGE ID (stable across pre/post-compaction
// deliberation — the row number shifts, the id doesn't), each with its
// keep count (the tail-mode keepMessages value), the mass (the spec's
// massOf rule) + the read/thought/shell split of retained vs dropped, and
// the oldest-kept (anchor) message's one-line hint. retained = anchor →
// just before the compaction row + the always-in-window post-summary
// slice; dropped = strictly before the anchor; the marker + summary pair
// is in neither (they never sit in the model window). low = the current
// tail head (the status-quo boundary — no write needed); high = the
// earliest floor-valid anchor (index 0, when the pre-compaction history
// leaves >= FLOOR messages — else omitted); medium = the midpoint index
// (omitted when it coincides with an end). Emitted only for a proper
// completed-compaction window (hostGuard + the strict summary).
function retentionOptions(w: WindowState, msgs: Msg[]): string[] {
  if (!(w.hostGuard && w.strictSummaryIndex >= 0)) return [];
  const postStart = w.summaryIndex + 1;
  const opts: { idx: number; label: string }[] = [{ idx: w.tailIndex, label: "low" }];
  const highIdx = w.compactionIndex >= FLOOR ? 0 : -1;
  if (highIdx >= 0) {
    const mid = Math.floor((w.tailIndex + highIdx) / 2);
    if (mid !== w.tailIndex && mid !== highIdx) opts.push({ idx: mid, label: "medium" });
    if (highIdx !== w.tailIndex) opts.push({ idx: highIdx, label: "high" });
  }
  const out: string[] = [];
  for (const o of opts) {
    const retainedSet = [...msgs.slice(o.idx, w.compactionIndex), ...msgs.slice(postStart)];
    const droppedSet = msgs.slice(0, o.idx);
    const keep = w.compactionIndex - o.idx;
    const rSplit = splitOf(retainedSet);
    const dSplit = splitOf(droppedSet);
    const rMass = retainedSet.reduce((a, m) => a + massOf(m), 0);
    const dMass = droppedSet.reduce((a, m) => a + massOf(m), 0);
    out.push(
      `option ${o.label}: msg=${msgs[o.idx].id} keep=${keep}` +
        ` retained=${rMass} (read=${rSplit.read} thought=${rSplit.thought} shell=${rSplit.shell})` +
        ` dropped=${dMass} (read=${dSplit.read} thought=${dSplit.thought} shell=${dSplit.shell})` +
        ` hint=${hintOf(msgs[o.idx])}`,
    );
  }
  return out;
}

// The U1 biggest-droppable list: the top-N heaviest COMPLETED assistant
// turns (finished, no error — a "call-result pair" is such a turn
// carrying its tool parts' inputs + outputs) in the window, as window row
// number + mass (the U2 filter's target list). Tie → the lower row
// number first.
function biggestDroppable(windowMsgs: Msg[], top: number): { row: number; mass: number }[] {
  const turns: { row: number; mass: number }[] = [];
  windowMsgs.forEach((m, i) => {
    if (m.data?.role !== "assistant" || !m.data?.finish || m.data?.error) return;
    turns.push({ row: i + 1, mass: massOf(m) });
  });
  turns.sort((a, b) => b.mass - a.mass || a.row - b.row);
  return turns.slice(0, top);
}

// U4 (2026-10-01 context-budget package): the triage rung's recommendation
// one-liner — the U1 recommendation block in compact form (the
// auto_resume nudge's `--triage` line): the 3 retention options (low /
// medium / high, the block's order) as `keep from <N> ≈<K>k | ...`
// (N = the anchor message's 1-based position in the session's message
// list — the anchors can sit BEFORE the window (medium/high extend the
// retained tail), so it is the full-session number, not a window row;
// K = the retained mass in whole k, rounded) + the biggest-droppable
// single turn as `drop turn <row> (≈<K>k)` (the U1 window row number +
// the total mass). Options + drop join on `; `. No proper
// completed-compaction window → no options part; no finished turn → no
// drop part; neither → "" (the caller emits the bare triage line).
// READ-ONLY (no write statement is ever executed). Session missing /
// db-error → "" (a nudge is never blocked by a recommendation failure).
export async function recommendationOneLiner(dbPath: string, sessionID: string): Promise<string> {
  let ctx: Ctx;
  try {
    ctx = await openDb(dbPath);
  } catch {
    return "";
  }
  try {
    const loaded = await loadSession(ctx, sessionID);
    if (!loaded.exists) return "";
    const msgs = loaded.msgs;
    const w = computeWindow(msgs);
    const parts: string[] = [];
    // The options (the anchor choice mirrors the U1 block exactly).
    if (w.hostGuard && w.strictSummaryIndex >= 0) {
      const opts: number[] = [w.tailIndex];
      const highIdx = w.compactionIndex >= FLOOR ? 0 : -1;
      if (highIdx >= 0) {
        const mid = Math.floor((w.tailIndex + highIdx) / 2);
        if (mid !== w.tailIndex && mid !== highIdx) opts.push(mid);
        if (highIdx !== w.tailIndex) opts.push(highIdx);
      }
      const postStart = w.summaryIndex + 1;
      parts.push(
        "options: keep from " +
          opts
            .map((idx) => {
              const retained = [...msgs.slice(idx, w.compactionIndex), ...msgs.slice(postStart)];
              const mass = retained.reduce((a, m) => a + massOf(m), 0);
              return `${idx + 1} ≈${Math.round(mass / 1000)}k`;
            })
            .join(" | "),
      );
    }
    // The biggest-droppable single turn (the U1 rule, top-1).
    const windowMsgs: Msg[] = w.hostGuard
      ? [...msgs.slice(w.tailIndex, w.compactionIndex), ...msgs.slice(w.summaryIndex + 1)]
      : [...msgs];
    const big = biggestDroppable(windowMsgs, 1)[0];
    if (big) parts.push(`drop turn ${big.row} (≈${Math.round(big.mass / 1000)}k)`);
    return parts.join("; ");
  } catch {
    return "";
  } finally {
    try {
      ctx.db.close();
    } catch {
      // best effort — the read outcome has already been captured
    }
  }
}

// ---------------------------------------------------------------------------
// reportWindow (READ-ONLY — no write statement is ever executed).
// ---------------------------------------------------------------------------

// `opts.brief` = the U1 cut-down form (numbered rows + `last: N` + the
// recommendation block + the biggest-droppable list) — the cheap default
// the TOOL SURFACE returns; omitted/false → the FULL form (byte-identical
// to the pre-U1 shape — the existing pins' contract). `opts.top` = the
// biggest-droppable list size (default 5 — the surface passes no opts).
export async function reportWindow(
  dbPath: string,
  sessionID: string,
  target?: string,
  opts?: { brief?: boolean; top?: number },
): Promise<string> {
  let ctx: Ctx;
  try {
    ctx = await openDb(dbPath);
  } catch (e: any) {
    return `db-error: ${String(e?.message ?? e).replace(/\r?\n+/g, " | ").slice(0, 120)}`;
  }
  try {
    const loaded = await loadSession(ctx, sessionID);
    if (!loaded.exists) return `session ${sessionID}\nreport= rejected: session-not-found`;
    const msgs = loaded.msgs;
    const w = computeWindow(msgs);
    const brief = opts?.brief === true;
    const top = opts?.top != null && Number.isFinite(opts.top) ? Math.max(1, Math.floor(opts.top)) : 5;

    const lines: string[] = [];
    lines.push(`session ${sessionID}`);
    if (w.compactionIndex < 0) {
      lines.push(`header: marker=none summary=none tail_start=none retained=0 post-summary=0 window=full-history`);
    } else {
      let header =
        `header: marker=${w.markerId} summary=${w.summaryId ?? "none"} tail_start=${w.tailStartId}` +
        ` retained=${w.retained} post-summary=${w.postSummary}`;
      if (!w.hostGuard) header += ` window=full-history (guard-degenerate)`;
      lines.push(header);
    }

    // The model window rows: the retained-tail slice + the post-summary
    // slice (the host's exact reorder minus the [marker, summary] pair the
    // header documents); no marker / guard-degenerate → the full history.
    const windowMsgs: Msg[] = w.hostGuard
      ? [...msgs.slice(w.tailIndex, w.compactionIndex), ...msgs.slice(w.summaryIndex + 1)]
      : [...msgs];
    if (brief) {
      // The U1 cut-down form: numbered rows (1..N from the window start —
      // the number → messageID map stays internal), tool-target detail
      // only (no content echoes), then the `last: N` flag.
      windowMsgs.forEach((m, i) => lines.push(`row: ${i + 1} ${briefRowOf(m)}`));
      lines.push(`last: ${windowMsgs.length}`);
      // The recommendation block (proper completed-compaction window only).
      for (const o of retentionOptions(w, msgs)) lines.push(o);
      // The biggest-droppable list (top-N heavy finished turns).
      const big = biggestDroppable(windowMsgs, top);
      if (big.length > 0) lines.push(`biggest: ${big.map((b) => `${b.row}=${b.mass}`).join(" ")}`);
    } else {
      for (const m of windowMsgs) lines.push(`row: ${rowOf(m)}`);
    }

    if (target != null) {
      let dry: string;
      const verdict = dryRunVerdict(w, msgs, target);
      if (verdict === "ok" || verdict.startsWith("rejected: retained-tail-below-floor")) {
        // computable (target exists, sits before the marker): the numbers
        const targetIndex = msgs.findIndex((m) => m.id === target);
        const oldStart = w.hostGuard ? w.tailIndex : w.compactionIndex; // degenerate → no effective retained tail
        const removeCount = targetIndex > oldStart ? targetIndex - oldStart : 0;
        const removeMass = msgs
          .slice(oldStart, targetIndex > oldStart ? targetIndex : oldStart)
          .reduce((a, m) => a + massOf(m), 0);
        const keepCount = w.compactionIndex - targetIndex;
        const keepMass = msgs.slice(targetIndex, w.compactionIndex).reduce((a, m) => a + massOf(m), 0);
        dry = `dry-run: target=${target} remove=${removeCount} (${removeMass} tokens) keep=${keepCount} (${keepMass} tokens) verdict=${verdict}`;
      } else {
        dry = `dry-run: target=${target} verdict=${verdict}`;
      }
      lines.push(dry);
    }
    return lines.join("\n");
  } catch (e: any) {
    return `session ${sessionID}\nerror: ${String(e?.message ?? e).replace(/\r?\n+/g, " | ").slice(0, 120)}`;
  } finally {
    try {
      ctx.db.close();
    } catch {
      // best effort — the read outcome has already been captured
    }
  }
}

// The dry-run verdict = the tail-write validation (fail-closed, mirrors
// the guard) — `ok` or `rejected: <reason>`.
function dryRunVerdict(w: WindowState, msgs: Msg[], target: string): string {
  if (w.compactionIndex < 0 || w.strictSummaryIndex < 0) return "rejected: no-completed-compaction";
  const targetIndex = msgs.findIndex((m) => m.id === target);
  if (targetIndex < 0) return "rejected: target-not-found";
  if (targetIndex >= w.compactionIndex) return "rejected: target-not-before-compaction";
  const retained = w.compactionIndex - targetIndex;
  if (retained < FLOOR) return `rejected: retained-tail-below-floor ${retained}`;
  return "ok";
}

// ---------------------------------------------------------------------------
// tailSet (WRITE — single transaction; WAL; one busy retry; fail-closed).
// ---------------------------------------------------------------------------

export async function tailSet(dbPath: string, sessionID: string, targetID: string): Promise<string> {
  let ctx: Ctx;
  try {
    ctx = await openDb(dbPath);
  } catch (e: any) {
    return `tail= db-error: ${String(e?.message ?? e).replace(/\r?\n+/g, " | ").slice(0, 120)}`;
  }
  try {
    const loaded = await loadSession(ctx, sessionID);
    if (!loaded.exists) return `tail= rejected: session-not-found`;
    const msgs = loaded.msgs;
    const w = computeWindow(msgs);

    // (2) the last COMPLETED compaction exists (marker + summary child —
    // the strict detection: summary + finish + no error, parentID match).
    if (w.compactionIndex < 0 || w.strictSummaryIndex < 0) return `tail= rejected: no-completed-compaction`;
    // (3) the target exists in the session.
    const targetIndex = msgs.findIndex((m) => m.id === targetID);
    if (targetIndex < 0) return `tail= rejected: target-not-found`;
    // (4) the target sits strictly BEFORE the compaction user row in
    // (time_created, id) order (the ascending list index).
    if (targetIndex >= w.compactionIndex) return `tail= rejected: target-not-before-compaction`;
    // (5) the retained-tail count (target → compaction row, exclusive)
    // meets the floor.
    const retained = w.compactionIndex - targetIndex;
    if (retained < FLOOR) return `tail= rejected: retained-tail-below-floor ${retained}`;

    // The single-field JSON edit on the ONE compaction part row (the host
    // does exactly this itself — compaction.ts:461-466). The edit happens
    // INSIDE sqlite via json_set (JSON1, verified on the bundled CLI
    // 3.53.4): only the new tail_start_id (a plain alphanumeric id) is
    // bound — the SQL text carries NO double quotes. The old design
    // inlined JSON.stringify's output as a string literal; the double
    // quotes break the Bun live host's Windows command-line join, the
    // CLI loses its SQL arg and drops to interactive mode → the
    // deterministic 2500 ms kill (measured 2026-10-01: identical call
    // 19 ms from bash). json_set preserves the field order and every
    // other field (byte-exact output — the smoke pins verify).
    const marker = msgs[w.compactionIndex];
    const part = marker.parts.find((p) => p.data.type === "compaction" && p.data.tail_start_id !== undefined)!;
    const oldTail = part.data.tail_start_id;
    const now = Date.now();

    const attempt = async () => {
      await ctx.db.exec("BEGIN IMMEDIATE;");
      try {
        await ctx.db.prepare("UPDATE part SET data = json_set(data, '$.tail_start_id', ?), time_updated = ? WHERE id = ?").run(targetID, now, part.id);
        await ctx.db.exec("COMMIT;");
      } catch (e) {
        try {
          await ctx.db.exec("ROLLBACK;");
        } catch {
          // best effort
        }
        throw e;
      }
    };
    try {
      await attempt();
    } catch (e: any) {
      if (isBusy(e)) {
        // SQLITE_BUSY → ONE short-backoff retry (the gauge's pattern) →
        // fail-closed.
        try {
          await attempt();
        } catch (e2: any) {
          return `tail= db-error: ${String(e2?.message ?? e2).replace(/\r?\n+/g, " | ").slice(0, 120)}`;
        }
      } else {
        return `tail= db-error: ${String(e?.message ?? e).replace(/\r?\n+/g, " | ").slice(0, 120)}`;
      }
    }
    return `tail= ${oldTail} -> ${targetID} keep=${retained}`;
  } catch (e: any) {
    return `tail= db-error: ${String(e?.message ?? e).replace(/\r?\n+/g, " | ").slice(0, 120)}`;
  } finally {
    try {
      ctx.db.close();
    } catch {
      // best effort
    }
  }
}

// ---------------------------------------------------------------------------
// tailSetKeep (WRITE — the keep-COUNT boundary form of tailSet; TODO #120
// Unit 2). The auto-resume plugin's post-compaction tail-set leg calls
// this: after ANY host compaction lands, the fresh compaction part's
// tail_start_id is rewritten to the agent-requested keep boundary (the
// exact count-based retention — the `keep`-th message STRICTLY before
// the compaction user row, targetIndex = compactionIndex - keep),
// replacing the host's default token-budget tail. The boundary
// computation is the ONLY new logic here; the validated write is the
// EXACT existing tailSet path, reused — the same 5 fail-closed
// validations (the delegated call re-runs them on its own fresh read —
// fail-closed against a compaction that lands between the two reads) +
// the json_set single-transaction write; the `tail= ` return prefix is
// remapped to `tail-set= `.
// ---------------------------------------------------------------------------

export async function tailSetKeep(dbPath: string, sessionID: string, keep: number): Promise<string> {
  // The count guard: keep must be a positive integer (a non-positive or
  // non-integer keep has no boundary at all).
  if (!Number.isInteger(keep) || keep <= 0) return `tail-set= rejected: keep-invalid ${keep}`;
  let ctx: Ctx;
  try {
    ctx = await openDb(dbPath);
  } catch (e: any) {
    return `tail-set= db-error: ${String(e?.message ?? e).replace(/\r?\n+/g, " | ").slice(0, 120)}`;
  }
  try {
    const loaded = await loadSession(ctx, sessionID);
    if (!loaded.exists) return `tail-set= rejected: session-not-found`;
    const w = computeWindow(loaded.msgs);
    // (2) the last COMPLETED compaction exists (marker + strict summary
    // child — needed to locate the boundary at all).
    if (w.compactionIndex < 0 || w.strictSummaryIndex < 0) return `tail-set= rejected: no-completed-compaction`;
    // (1) the boundary target = the keep-th message STRICTLY before the
    // compaction user row; keep exceeding the pre-compaction message
    // count has no target.
    const targetIndex = w.compactionIndex - keep;
    if (targetIndex < 0) return `tail-set= rejected: keep-exceeds-history ${keep}`;
    const targetID = loaded.msgs[targetIndex].id;
    // The exact tailSet path from here (its own (3)-(5) validations —
    // the floor check IS the kept count, retained == keep — + the
    // single-transaction write).
    const res = await tailSet(dbPath, sessionID, targetID);
    return res.replace(/^tail= /, "tail-set= ");
  } catch (e: any) {
    return `tail-set= db-error: ${String(e?.message ?? e).replace(/\r?\n+/g, " | ").slice(0, 120)}`;
  } finally {
    try {
      ctx.db.close();
    } catch {
      // best effort
    }
  }
}

// ---------------------------------------------------------------------------
// markerSet (WRITE — the U3 marker compaction, 2026-10-01 context-budget
// package, §U3 of proposals/approved/2026-10-01_context-budget-package.md).
// The agent supplies the summary text itself (compaction style, the current
// model) + a boundary; this function writes the MARKER QUARTET directly —
// the compaction USER row (carrying the compaction part
// { type: "compaction", auto: false, tail_start_id: <boundary> }) + the
// summary ASSISTANT child STRICTLY AFTER it (role assistant, parentID =
// the marker id, mode/agent "compaction", summary true, finish "stop", the
// summary text in ONE text part) — the EXACT row shapes of
// context_trim.smoke.mjs's fixture builder (never hand-derived). The new
// marker is APPENDED LAST with a time_created strictly after every existing
// row (and the summary child strictly after the marker), so the host guard
// `tailIndex < compactionIndex && summaryIndex > compactionIndex`
// (message-v2.ts:568, mirrored above) is STRUCTURAL: the boundary just has
// to exist in the session (the retained tail is boundary..new-marker,
// exclusive). No floor — the agent chose the boundary (the deliberate
// full-window backstop; the tail floor is a rewrite-only guard).
//
// The write is the SAME single-transaction discipline as tailSet
// (BEGIN IMMEDIATE → the four inserts → COMMIT; WAL; one busy retry;
// fail-closed — a rejection performs NO write). The id generator mirrors
// the host's Identifier.ascending format (id.ts create: prefix + 12 hex
// chars of (BigInt(now) * 0x1000 + counter) + 14 base62 random chars —
// 26 chars after the prefix, the host's MessageID.ascending /
// PartID.ascending).
// Returns `marker= <markerId> summary=<summaryId> tail=<boundary>
// keep=<N>` on success, else `marker= rejected: <reason>` /
// `marker= db-error: <detail>` (the same line shapes as tailSet).
// ---------------------------------------------------------------------------

let markerIdCounter = 0;
function ascendingId(prefix: string): string {
  const now = Date.now();
  markerIdCounter += 1;
  const enc = (BigInt(now) * BigInt(0x1000) + BigInt(markerIdCounter)).toString(16);
  const timeHex = enc.length > 12 ? enc.slice(-12) : enc.padStart(12, "0");
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let rand = "";
  for (let i = 0; i < 14; i++) rand += chars[Math.floor(Math.random() * 62)];
  return `${prefix}_${timeHex}${rand}`;
}

export async function markerSet(
  dbPath: string,
  sessionID: string,
  boundaryID: string,
  summaryText: string,
): Promise<string> {
  if (typeof summaryText !== "string" || summaryText === "") return `marker= rejected: summary-empty`;
  let ctx: Ctx;
  try {
    ctx = await openDb(dbPath);
  } catch (e: any) {
    return `marker= db-error: ${String(e?.message ?? e).replace(/\r?\n+/g, " | ").slice(0, 120)}`;
  }
  try {
    const loaded = await loadSession(ctx, sessionID);
    if (!loaded.exists) return `marker= rejected: session-not-found`;
    const msgs = loaded.msgs;
    // (2) the boundary exists in the session. The new marker is appended
    // LAST (time strictly after every existing row), so the guard is
    // structural from here on.
    const boundaryIndex = msgs.findIndex((m) => m.id === boundaryID);
    if (boundaryIndex < 0) return `marker= rejected: boundary-not-found`;
    const retained = msgs.length - boundaryIndex;

    // The quartet (the fixture builder's exact row shapes). The marker's
    // time_created is strictly after every existing row (max existing + 1);
    // the summary child is strictly after the marker (+2) — the (time, id)
    // window order never falls back to the id tiebreak.
    const lastTime = msgs.reduce((a, m) => Math.max(a, m.time), Date.now());
    const markerTime = lastTime + 1;
    const summaryTime = lastTime + 2;
    const markerId = ascendingId("msg");
    const summaryId = ascendingId("msg");
    const markerPartId = ascendingId("prt");
    const summaryPartId = ascendingId("prt");
    const markerData = JSON.stringify({ role: "user", time: { created: markerTime } });
    const markerPart = JSON.stringify({ type: "compaction", auto: false, tail_start_id: boundaryID });
    const summaryData = JSON.stringify({
      role: "assistant",
      parentID: markerId,
      mode: "compaction",
      agent: "compaction",
      summary: true,
      finish: "stop",
    });
    const summaryPart = JSON.stringify({ type: "text", text: summaryText });

    const attempt = async () => {
      await ctx.db.exec("BEGIN IMMEDIATE;");
      try {
        await ctx.db
          .prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?)")
          .run(markerId, sessionID, markerTime, markerTime, markerData);
        await ctx.db
          .prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?, ?)")
          .run(markerPartId, markerId, sessionID, markerTime, markerTime, markerPart);
        await ctx.db
          .prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?)")
          .run(summaryId, sessionID, summaryTime, summaryTime, summaryData);
        await ctx.db
          .prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?, ?)")
          .run(summaryPartId, summaryId, sessionID, summaryTime, summaryTime, summaryPart);
        await ctx.db.exec("COMMIT;");
      } catch (e) {
        try {
          await ctx.db.exec("ROLLBACK;");
        } catch {
          // best effort
        }
        throw e;
      }
    };
    try {
      await attempt();
    } catch (e: any) {
      if (isBusy(e)) {
        // SQLITE_BUSY → ONE short-backoff retry (the gauge's pattern) →
        // fail-closed.
        try {
          await attempt();
        } catch (e2: any) {
          return `marker= db-error: ${String(e2?.message ?? e2).replace(/\r?\n+/g, " | ").slice(0, 120)}`;
        }
      } else {
        return `marker= db-error: ${String(e?.message ?? e).replace(/\r?\n+/g, " | ").slice(0, 120)}`;
      }
    }
    return `marker= ${markerId} summary=${summaryId} tail=${boundaryID} keep=${retained}`;
  } catch (e: any) {
    return `marker= db-error: ${String(e?.message ?? e).replace(/\r?\n+/g, " | ").slice(0, 120)}`;
  } finally {
    try {
      ctx.db.close();
    } catch {
      // best effort
    }
  }
}

// ---------------------------------------------------------------------------
// The tool() wrapper — the gauge's CURRENT db path (getDbPath — the live
// opencode DB on the live host; the smoke/probe steer it via setDbPath).
// The live DB is only ever written by `tail` mode (validated, single
// transaction); `report` mode performs no writes.
// ---------------------------------------------------------------------------

export default tool({
  description: `Reports and trims a session's live model context over the opencode DB (the gauge's current db path — the live opencode DB on the live host). \`report <session> [target]\` — READ-ONLY, CUT-DOWN form (the cheap default): (1) the window state — the last completed compaction (marker present? compaction user row id, summary id, current tail_start_id, retained-tail count, post-summary count; no marker → the full history is the model window), (2) NUMBERED rows 1..N from the window start for the messages INSIDE the model window (retained-tail slice + post-summary slice) — role + token mass (info.tokens input+output+cache.read when present, else bytes/4 of the part text) + tool-target detail ONLY (read: filePath + offset/limit; bash: command; webfetch: url; no content echoes — the number → messageID map stays internal, you never see/enter dense ids here), then the \`last: N\` flag (the current last row number), (3) the RECOMMENDATION block (only for a proper completed-compaction window): 3 retention options low / medium / high, each ANCHORED AT A MESSAGE ID (stable across pre/post-compaction deliberation — the row number shifts, the id doesn't), each with its keep count (the tail-mode keepMessages value), the read / thought / shell mass split of retained (anchor → before the compaction row + the always-in-window post-summary slice) vs dropped (strictly before the anchor) + the oldest-kept message's one-line hint — low = the current tail head (status quo), high = the earliest floor-valid anchor, medium = the midpoint, (4) the BIGGEST-DROPPABLE list: the top-5 heaviest finished turns (no error) in the window as window row number + mass (the U2 filter's target list), (5) with target: a dry-run of what a tail rewrite to it would remove/keep (counts + token mass) + the verdict — no write. The FULL report form (id + time per row, no extras) stays available and byte-identical through the core reportWindow export (the smoke/probe shape). \`tail <session> <messageID>\` — WRITE: rewrite the last completed compaction part's tail_start_id to the target id (the host's own lever, compaction.ts:461-466) so the retained tail shrinks/grows to it; the context re-derives from the DB at the next step — zero restart. \`tail <session> keepMessages=N\` — the keep-COUNT form (WRITE, same single transaction): N = the retained-tail MESSAGE count — the N-th message strictly before the compaction user row becomes the new tail head (the compact_memory keepMessages count semantics — a message COUNT, NOT a token budget); mutually exclusive with the <messageID> form. The core returns it as a \`tail-set= <old> -> <new> keep=N\` line of the same shape as the messageID form; it is primarily a SHRINK lever (the post-compaction trim) — growing stays available, but re-reads raw messages you no longer remember (nothing is lost — the DB keeps them, the report restores the knowledge); keep=0 stays rejected by the floor 6. Fail-closed validation mirrors the host's window guard exactly: the session exists, the last completed compaction exists (marker + summary child), the target id exists in the session, the target sits strictly BEFORE the compaction user row in (time_created, id) order, and the retained-tail count (target → compaction row, exclusive) is >= 6 — the keepMessages floor (a retained tail below 6 is rejected; the keep form's computed boundary re-runs these same checks, plus its own keep-invalid and keep-exceeds-history rejections). Single transaction; WAL — the host reads on its own connection (concurrent read safe); SQLITE_BUSY → one short-backoff retry → fail-closed (never a partial write). Backend chain: in-process sqlite (bun:sqlite → node:sqlite) first, last resort the maintainer-placed sqlite3 CLI (one CLI invocation per query; the tail transaction is ONE invocation) — a missing CLI, spawn error, or timeout still lands the fail-closed db-error. Rejections return as plain lines — \`report= rejected: <cause>\` / \`tail= rejected: <cause>\` / \`tail-set= rejected: <cause>\` (a valid fail-closed outcome, NOT a malfunction — do not retry); genuine backend failures return \`db-error:\` / \`error:\` lines. The (2) rows include the CURRENT in-flight message (its token mass is not yet committed — typically 0, not a zero-mass message); row fields: \`time\` = an epoch-ms number, mass label \`tokens=\` (provider-true) or \`bytes4=\` (bytes/4 fallback), a read target shows filePath (+ offset/limit only when set). The (3) dry-run shares the tail call's fail-closed validation — on a rejected rewrite the dry-run returns the rejection in place of the counts. Returns \`tail= <old> -> <new> keep=<count>\`, or for the keep form \`tail-set= <old> -> <new> keep=<count>\`, or the rejection reason. \`report\` never writes the DB.`,
  args: {
    mode: tool.schema
      .string()
      .describe("The mode: 'report' (read-only window map — the U1 cut-down form: numbered rows 1..N + `last: N` flag + the low/medium/high recommendation block + the top-5 biggest-droppable list — + optional dry-run; the full id/time-per-row form stays available through the core reportWindow export) or 'tail' (the validated tail_start_id rewrite — the <messageID> form or the keepMessages form)."),
    session: tool.schema
      .string()
      .describe("The session id (e.g. ses_…)."),
    target: tool.schema
      .string()
      .optional()
      .describe("report: the message id a tail rewrite would point at (dry-run, no write). tail (<messageID> form): the new tail_start_id — the id of the first message of the retained tail; it must sit strictly before the compaction marker and leave a retained tail of >= 6 messages (the floor). Omit when using the keepMessages form (mutually exclusive)."),
    keepMessages: tool.schema
      .number()
      .optional()
      .describe("tail (keep form): the retained-tail MESSAGE count N — the N-th message strictly before the compaction user row becomes the new tail head (the compact_memory keepMessages count semantics: a message COUNT, not a token budget). Mutually exclusive with target — use exactly one of the two forms. Rejected fail-closed: non-integer or non-positive (keep-invalid), below the floor 6 (retained-tail-below-floor), above the pre-compaction message count (keep-exceeds-history), plus the shared no-completed-compaction / session-not-found; a rejection performs no DB write. The core returns a `tail-set= <old> -> <new> keep=N` line (the same shape as the <messageID> form). Primarily a SHRINK lever (the post-compaction trim) — growing re-reads raw messages you no longer remember (nothing is lost, the DB keeps them)."),
  },

  execute: async (args: any, context: any) => {
    // The gauge's current db path (the gauge core's resolution — the live
    // opencode DB on the live host; the smoke/probe steer it via
    // setDbPath).
    const dbPath = getDbPath();
    const mode = args?.mode;
    const session = String(args?.session ?? "").trim();
    const target =
      args?.target != null && String(args.target).trim() !== "" ? String(args.target).trim() : undefined;
    // The keep-COUNT form (mutually exclusive with target — the surface
    // decides the form; the core's keep-invalid guard covers the rest).
    const keep = args?.keepMessages != null ? args.keepMessages : undefined;
    if (!session) return "error: missing session";
    // The surface returns the U1 CUT-DOWN form (the cheap default —
    // numbered rows + `last: N` + the recommendation block + the
    // biggest-droppable list); the FULL form stays available through the
    // core reportWindow export (byte-identical to the pre-U1 shape).
    if (mode === "report") return reportWindow(dbPath, session, target, { brief: true });
    if (mode === "tail") {
      if (keep != null && target != null)
        return "error: tail mode: target and keepMessages are mutually exclusive (use one or the other)";
      if (keep != null) return tailSetKeep(dbPath, session, keep);
      if (!target)
        return "error: tail mode requires target (the new tail_start_id message id) or keepMessages (the retained-tail message count)";
      return tailSet(dbPath, session, target);
    }
    return "error: mode must be 'report' or 'tail'";
  }
});
