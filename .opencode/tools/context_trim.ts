// plan39 (approved 2026-09-29: proposals/approved/
// 2026-09-28_context-trim-tool.md — the maintainer's "1. + 2. are approved" +
// round-2 "go :-); Unit 1 = this tool, `turns` (row-deletion) Ruled out):
// the `context_trim` custom tool — report + trim a session's LIVE model
// context over the opencode DB (the gauge's DEFAULT_DB_PATH — the same
// resolution as the gauge core; nothing re-derived here).
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
//     un-reordered history is sent (overflow; the context_recovery plugin
//     backstop fires — #93).
//
// Surface (the tool() form — the shape of submit.ts / ctx_gauge.ts; the
// host names the tool by FILENAME — no `name` field):
//   - report <session> [target] — READ-ONLY: (1) the window-state header
//     (the last completed compaction: marker present? compaction user row
//     id, summary id, current tail_start_id, retained-tail count,
//     post-summary count; no marker → say so), (2) per-message rows for
//     the messages INSIDE the model window (the retained-tail slice + the
//     post-summary slice; no marker / guard-degenerate → the full
//     history): id, time, role, and for tool parts: tool name + target
//     (`read`: input filePath + offset/limit; `bash`: command;
//     `webfetch`: url — other tools: name only), token mass (info.tokens
//     input+output+cache.read when all present, else bytes/4 of the part
//     text — text parts' `text` + tool parts' string `state.output`);
//     (3) with target: a dry-run of what a tail rewrite to it would
//     remove/keep (counts + token mass) + whether the tail write would be
//     accepted — no write.
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
import { DEFAULT_DB_PATH, BUSY_TIMEOUT_MS, DEFAULT_EXE_PATH } from "../plugin/scripts/gauge.mjs";
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

// ---------------------------------------------------------------------------
// reportWindow (READ-ONLY — no write statement is ever executed).
// ---------------------------------------------------------------------------

export async function reportWindow(dbPath: string, sessionID: string, target?: string): Promise<string> {
  let ctx: Ctx;
  try {
    ctx = await openDb(dbPath);
  } catch (e: any) {
    return `db-error: ${String(e?.message ?? e).replace(/\r?\n+/g, " | ").slice(0, 120)}`;
  }
  try {
    const loaded = await loadSession(ctx, sessionID);
    if (!loaded.exists) return `session ${sessionID}\nerror: session-not-found`;
    const msgs = loaded.msgs;
    const w = computeWindow(msgs);

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
    for (const m of windowMsgs) lines.push(`row: ${rowOf(m)}`);

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
// The tool() wrapper — the gauge's default DB path (the live opencode DB).
// The live DB is only ever written by `tail` mode (validated, single
// transaction); `report` mode performs no writes.
// ---------------------------------------------------------------------------

export default tool({
  description: `Reports and trims a session's live model context over the opencode DB (the gauge's default db path). \`report <session> [target]\` — READ-ONLY: (1) the window state — the last completed compaction (marker present? compaction user row id, summary id, current tail_start_id, retained-tail count, post-summary count; no marker → the full history is the model window), (2) per-message rows for the messages INSIDE the model window (retained-tail slice + post-summary slice): id, time, role, and for tool parts: tool name + target (read: filePath + offset/limit; bash: command; webfetch: url), token mass (info.tokens input+output+cache.read when present, else bytes/4 of the part text), (3) with target: a dry-run of what a tail rewrite to it would remove/keep (counts + token mass) + the verdict — no write. \`tail <session> <messageID>\` — WRITE: rewrite the last completed compaction part's tail_start_id to the target id (the host's own lever, compaction.ts:461-466) so the retained tail shrinks/grows to it; the context re-derives from the DB at the next step — zero restart. Fail-closed validation mirrors the host's window guard exactly: the session exists, the last completed compaction exists (marker + summary child), the target id exists in the session, the target sits strictly BEFORE the compaction user row in (time_created, id) order, and the retained-tail count (target → compaction row, exclusive) is >= 6 — the keepMessages floor (a retained tail below 6 is rejected). Single transaction; WAL — the host reads on its own connection (concurrent read safe); SQLITE_BUSY → one short-backoff retry → fail-closed (never a partial write). Backend chain: in-process sqlite (bun:sqlite → node:sqlite) first, last resort the maintainer-placed sqlite3 CLI (one CLI invocation per query; the tail transaction is ONE invocation) — a missing CLI, spawn error, or timeout still lands the fail-closed db-error. Returns \`tail= <old> -> <new> keep=<count>\` or the rejection reason. \`report\` never writes the DB.`,
  args: {
    mode: tool.schema
      .string()
      .describe("The mode: 'report' (read-only window map + optional dry-run) or 'tail' (the validated tail_start_id rewrite)."),
    session: tool.schema
      .string()
      .describe("The session id (e.g. ses_…)."),
    target: tool.schema
      .string()
      .optional()
      .describe("report: the message id a tail rewrite would point at (dry-run, no write). tail (REQUIRED): the new tail_start_id — the id of the first message of the retained tail; it must sit strictly before the compaction marker and leave a retained tail of >= 6 messages (the floor)."),
  },

  execute: async (args: any, context: any) => {
    const mode = args?.mode;
    const session = String(args?.session ?? "").trim();
    const target =
      args?.target != null && String(args.target).trim() !== "" ? String(args.target).trim() : undefined;
    if (!session) return "error: missing session";
    if (mode === "report") return reportWindow(DEFAULT_DB_PATH, session, target);
    if (mode === "tail") {
      if (!target) return "error: tail mode requires target (the new tail_start_id message id)";
      return tailSet(DEFAULT_DB_PATH, session, target);
    }
    return "error: mode must be 'report' or 'tail'";
  }
});
