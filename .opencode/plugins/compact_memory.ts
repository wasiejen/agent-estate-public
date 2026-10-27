// compact_memory.ts — the v2-NATIVE compaction plugin (TODO #137 unit 4a,
// 2026-10-22, clone `migration`). Ports the v1 `.opencode/plugin/compact_memory.ts`
// tool (the budget-gated manual compaction + the U3 marker mode) onto the v2
// plugin surfaces: `ctx.tool.transform` + `editor.add`, `ctx.session.compact`,
// `ctx.session.hook("compaction")`, `ctx.event.subscribe`. Auto-discovered
// from `.opencode/plugins/` (NO `opencode.jsonc` change — the 3a precedent).
//
// WHAT IT IS: a v2 plugin (`Plugin` shape — DEFAULT export only, the loader
// contract; the `@opencode/plugin` import is TYPE-ONLY, erased at runtime; the
// budget core import is a VALUE import of plain `.mjs` whose own imports are
// node: builtins only — the context_family.ts / gauge.mjs pattern).
//
// (1) THE BUDGET LAYER rides the paired module
// `.opencode/plugins/scripts/compaction_core_v2.mjs` (the v1 core ported:
// same `.opencode/temp/compact_budget.json`, same keys, same cap-resolver
// semantics — CPU models cap 0, the SAFETY INVARIANT — same budget-store
// v2 schema, INCREMENT-ON-SUCCESS only, the #119 additive-rewrite invariant,
// the pure gate with the emergency-1 and the caller-scoped CROSS cap+1
// override, TODO #128 ruling 2026-09-30). The v1 core module stays UNIMPORTED
// by v2 code (inert-dir contract).
//
// (2) TOOL REGISTRATION — `ctx.tool.transform((editor) => editor.add(…))`,
// name `compact_memory`, input = a plain JSON schema
// ({ sessionID?, emergency?, message?, mode?, summary?, keepMessages?,
// boundary? }); `execute`
// is a plain Promise (the promise-surface contract). SELF (no `sessionID`)
// = the CALLING session, resolved from the ToolContext's `sessionID` (schema
// tool.ts:14-19 — no SDK self-trick); CROSS (explicit id != the caller) =
// fire-and-forget, NEVER awaited (the single llama-swap slot rule survives —
// the dispatch is a POST `/api/session/:id/compact`, its response is NEVER a
// success claim).
//
// (3) DISPATCH — `ctx.session.compact({ sessionID })`: the v2 body carries
// NO keep fields (generated types.ts:4654-4661 = {sessionID, id?, delivery?}),
// so the request sent is EXACTLY {sessionID} — pinned in the smoke.
//
// (4) VERIFICATION LEG (the increment + the COMPACT line land ONLY on a
// VERIFIED compaction) — the EVENT leg: `ctx.event.subscribe()` (the SSE
// stream, an AsyncIterable) consumed for the session's compaction lifecycle;
// `session.compaction.ended` = the success signal (core compaction.ts:649),
// `session.compaction.failed` = the failure signal (:639) → ONE
// `verify=failed` evidence line, NO budget burn; `.started` for OUR OWN
// pending dispatch = an audit line only. Compactions WITHOUT a pending record
// (auto-triggered, the maintainer's `/compact`) are SILENT — no burn (the
// budget tracks the AGENT-tool dispatches, as v1). The gauge-paired DB-read
// fallback leg was NOT needed (the event leg is deterministic under the mock
// and pinned in the smoke); recorded here per the spec's pin-the-leg rule.
// #171 (2026-10-26): the ROUND increment (the maintenance clock in the loop
// folder's counter.json) lands on the SAME verified-success path — a failed
// dispatch increments NOTHING.
//
// DEVIATION (header REQUIRED): (a) the U3 marker mode has NO boundary control
// in v2 — `recent` is core-computed from the config `compaction.keep.tokens`;
// the `boundary` argument is ACCEPTED, IGNORED, and logs ONE `boundary-
// ignored` evidence line; the plugin only sets `event.result = { summary,
// metadata: { marker: true } }` on the `compaction` draft hook (fork
// promise/session.ts:43-52 — "Set to use this compaction and skip the model
// request"; core compaction.ts:402 → fromHook :601-612), and the DURABLE
// compaction message is written by the CORE. The v1 `markerSet` quartet
// DB-write lane (compact_memory.ts:80 import) has NO v2 counterpart — the
// biggest deviation of this unit. (b) THE CONTINUATION FILE LEG (#158, 2026-10-26
// DROP ruling): the native `delivery:"queue"` leg is REMOVED — measured
// UNRELIABLE (delivered late, can deliver TWICE, uncancellable, unobservable;
// TODO #158 measurements). The `message` continuation becomes the v1 TEMP FILE
// again: `.opencode/temp/compact_message_<sid>` (plain UTF-8, OVERWRITTEN on
// every verified compaction), written AT VERIFIED SUCCESS (NOT at dispatch) so
// the v1 zombie-guard guarantee stays: a continuation file present ⇒ the
// compaction happened. It is consumed ONCE at a genuine resume — the
// auto_resume item-4 relay renames it to `.consumed`; the post-compaction
// protocol STEP 0 covers the relay-bypassing channels. NO `session.prompt`
// call for the continuation, EVER. Write failure → evidence, NEVER fails the
// tool (kind "queue" kept: `file-written` / `file-fail`).
// (c) KEEP KEYS (#184 unit 1, 2026-10-27, REWRITTEN): the tool now takes a real
// `keepMessages` (integer 1..40) and it applies on the MARKER path ONLY. The
// plugin reads the CURRENT window rows (`sessionApi.context` — the SAME lane
// context_trim_v2.ts reads), renders the LAST N as verbatim text (oldest first,
// tool calls reduced to `tool: <name> <one-line target>`), and COMPOSES that
// `## Retained tail` section INTO the marker summary the draft hook supplies —
// retention rides the DURABLE compaction row (the core writes `text:
// supplied.summary`), never the request. The `context` draft hook DROPS entries
// only (it cannot re-add old rows — measured), so authoring time is the ONLY
// place retention can be produced. The AUTO path cannot thread keep (the v2
// compact body carries no keep fields): `keepMessages` WITHOUT `mode:'marker'`
// is REJECTED with ONE line + the `keep-requires-marker` audit line — NO silent
// ignore anywhere; out-of-bounds or non-integer N is rejected the same way, and
// a failed window read rejects the dispatch (a keep-requested compaction that
// silently keeps nothing is the exact failure #184 removes). The budget file's
// keep keys stay AUDIT-ONLY (`keep-not-applied`), and on the applied path the
// applied line REPLACES it: `kind:"keep" state:"applied" keepMessages=<N>
// tailChars=<n>`. The COMPACT line's `keep=<m> tok=<budget>` pair is UNCHANGED
// (it reports the budget-file CONFIG, not the applied tail — the v1 COMPACT
// byte-form stays pinned). The plugin NEVER writes config values (maintainer
// domain). (d) THE PRE-COMPACTION
// DUMP leg (#152) IS IMPLEMENTED on the v2 TWIN script (`agent/scripts/db/
// dump_session_v2.mjs` — the `session_v2`+`session_message` twin of the v1
// dump tool, this unit): BEFORE the dispatch, BOTH artifacts (the lossless md
// + the raw json) land in `archive/sessions/compaction_dumps/<sid>_c<count>[
// <stamp>].{md,json}` — the v1 hook contract ported BYTE-COMPATIBLE (naming,
// the ONE retry #78, the `DUMP-OK`/`DUMP-RETRY=1`/`DUMP-FAIL` ctx.log lines
// with the full repo-relative path #107); BEST-EFFORT — a failure warns in the
// response and NEVER blocks; success leaves the response UNCHANGED. The
// count keys the no-overwrite name and rides the PRE-DISPATCH budget count
// (the increment lands only at verified success). (e) The COMPACT line stays
// BYTE-IDENTICAL v1 format in the SHARED `.opencode/temp/ctx.log` (the ` ovr`
// token for the cross override slot; the DUMP-* lines share that file); plugin
// evidence lines (dispatch/denied/marker/verify/queue/keep/dump)
// go to `.opencode/temp/compact_v2.log` (the context_family.log capped pattern,
// never-throws appends).
//
// STILL PENDING (unchanged): LIVE v2-host activation waits for the maintainer's
// host runs (the backend slot); registration/config = maintainer domain.

import type { Plugin } from "@opencode/plugin";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

// The ported budget core — a VALUE import of plain JS (node: builtins only).
import {
  SELF_ROOT,
  appendCompactLine,
  budgetGate,
  hasKeepKeys,
  localStamp,
  readCompactionConfig,
  recordSuccess,
  resolveRoot,
} from "./scripts/compaction_core_v2.mjs";

// #171 (2026-10-26): the ROUND maintenance-clock leg — the ONE read-only
// loop-counter primitives (also plain JS, node: builtins only).
import { currentLoopFolder, loopCounterPath, readLoopCounter } from "./scripts/loop_root.mjs";

// ------------------------------------------------------------------ evidence log (v1 ladder, byte-shape)

const LINE_CAP = 2000;
const CAPS = [500, 150, 60];
const DOT = "\u2026";

let dir = ""; // ctx.location.directory — the repo root the plugin targets
let sessionApi: Plugin.Context["session"] | undefined;
let stopped = false; // cleanup flag for the event consumer

// Per-session PENDING DISPATCH record: the tool call writes it BEFORE the
// dispatch; the compaction hook (marker mode) and the event consumer (verify)
// read it; it is DELETED on the verify outcome or when the dispatch never
// started. A record that NEVER verifies stays unbudgeted (INCREMENT-ON-
// SUCCESS only) and clears at cleanup.
type PendingRecord = {
  model: string;
  isEmergency: boolean;
  isOverride: boolean;
  markerSummary: string; // "" = a standard (non-marker) dispatch
  fired: boolean; // the compaction hook already supplied the result
  queueText: string; // "" = no continuation message
  keepMessages: number;
  keepTokens: number | undefined;
};
const pending = new Map<string, PendingRecord>();

function root(): string {
  return dir !== "" ? dir : SELF_ROOT;
}

function logPath(): string {
  return join(root(), ".opencode", "temp", "compact_v2.log");
}

function cap(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + DOT;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

function sidOf(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function buildLine(kind: string, scalar: Record<string, string | undefined>, big: Record<string, unknown>): string {
  for (const n of CAPS) {
    const rec: Record<string, string> = { ts: new Date().toISOString(), kind };
    for (const [k, v] of Object.entries(scalar)) if (v) rec[k] = cap(v, n);
    for (const [k, v] of Object.entries(big)) {
      const s = JSON.stringify(v);
      if (s != null) rec[k] = cap(s, n);
    }
    const line = JSON.stringify(rec);
    if (line.length <= LINE_CAP) return line;
  }
  const rec: Record<string, string> = { ts: new Date().toISOString(), kind };
  for (const [k, v] of Object.entries(scalar)) if (v) rec[k] = cap(v, CAPS[CAPS.length - 1]);
  return JSON.stringify(rec);
}

function appendLog(line: string): void {
  try {
    const p = logPath();
    mkdirSync(dirname(p), { recursive: true });
    appendFileSync(p, line + "\n", "utf8");
  } catch {
    // best effort — never break the plugin over a write failure
  }
}

// ------------------------------------------------------------------ (5) the marker draft hook

// The `compaction` draft hook (SessionCompaction — `result?` SET means "use
// this compaction and skip the model request"). Only OUR pending marker
// dispatches apply; the primary request fires the `context` hook only (model
// -request.ts:428), so this handler never runs on primary requests. NEVER
// throws; the `recent`/durable-message lane stays the CORE's (DEVIATION (a)).
async function onCompactionDraft(event: { sessionID?: unknown; result?: unknown }): Promise<void> {
  try {
    const sid = sidOf(event.sessionID);
    if (sid === "") return;
    const rec = pending.get(sid);
    if (rec == null || rec.markerSummary === "" || rec.fired) return;
    event.result = { summary: rec.markerSummary, metadata: { marker: true } };
    rec.fired = true;
    appendLog(buildLine("marker", { session: sid, state: "result-supplied", summaryChars: String(rec.markerSummary.length) }, {}));
  } catch {
    // never throw out of a hook
  }
}

// ------------------------------------------------------------------ (4) the verify leg (events)

// #171 (2026-10-26): the ROUND leg of the maintenance clock. Verified success
// increments the CURRENT loop folder's `counter.json` round:
// round_new = (round ?? n ?? 0) + 1, keys spread-preserved. SAME fail-closed
// rules as the counter readers: no loop folder / absent counter (NEVER
// created) / wrong looprun / non-integer round-or-n → NO write and NO log
// change. A FAILED dispatch never reaches this function — it increments
// NOTHING. BEST-EFFORT: any read/write failure is swallowed — the verified
// success handling stands.
function bumpRound(): void {
  try {
    const loopRoot = join(root(), "loop");
    const folder = currentLoopFolder(loopRoot);
    if (folder === null) return;
    const data = readLoopCounter(loopRoot, folder);
    if (data === null) return;
    if (data["looprun"] !== folder) return;
    // `??` semantics: a PRESENT (even corrupt) round is the base — a
    // non-integer base fail-closes the write (no silent n-fallback past a
    // corrupt round).
    const base = data["round"] ?? data["n"] ?? 0;
    if (typeof base !== "number" || !Number.isInteger(base)) return;
    writeFileSync(loopCounterPath(loopRoot, folder), JSON.stringify({ ...data, round: base + 1 }), "utf8");
  } catch {
    // best effort — the counter lane never breaks the verify leg
  }
}

// The verified-success handling (v1 order, same helpers): budget INCREMENT
// THEN the COMPACT line, then the #171 ROUND increment (bumpRound), then the
// continuation FILE (DEVIATION (b): the #158 message file lands HERE, after
// verification). A FAILURE path increments neither budget NOR round.
function verifiedSuccess(sid: string, rec: PendingRecord): void {
  recordSuccess(root(), sid, rec.model);
  const keepResolved =
    rec.keepTokens != null ? { tokens: rec.keepTokens, source: "budget" as const } : { tokens: undefined, source: "none" as const };
  appendCompactLine(root(), sid, rec.model, rec.keepMessages, keepResolved, rec.isEmergency, rec.isOverride);
  bumpRound();
  appendLog(
    buildLine(
      "verify",
      {
        session: sid,
        state: "success",
        model: rec.model,
        mode: rec.markerSummary !== "" ? "marker" : "auto",
        emergency: rec.isEmergency ? "yes" : undefined,
        ovr: rec.isOverride ? "yes" : undefined,
      },
      {},
    ),
  );
  if (rec.queueText !== "") writeMessageFile(sid, rec.queueText);
}

function onVerifyFailure(sid: string, rec: PendingRecord, error: unknown): void {
  pending.delete(sid);
  appendLog(
    buildLine(
      "verify",
      {
        session: sid,
        state: "failed",
        preview: cap(String((error as { message?: unknown } | undefined)?.message ?? error ?? ""), 120),
      },
      {},
    ),
  );
  // NO budget burn (INCREMENT-ON-SUCCESS only) — the v1 discipline.
}

function onLiveEvent(ev: { type?: unknown; data?: { sessionID?: unknown; error?: unknown; reason?: unknown } }): void {
  try {
    const type = typeof ev.type === "string" ? ev.type : "";
    if (type !== "session.compaction.started" && type !== "session.compaction.failed" && type !== "session.compaction.ended") return;
    const sid = sidOf(ev.data?.sessionID);
    if (sid === "") return;
    const rec = pending.get(sid);
    if (rec == null) return; // an auto-triggered or maintainer compaction — SILENT, no burn
    if (type === "session.compaction.started") {
      appendLog(buildLine("verify", { session: sid, state: "started" }, {}));
      return;
    }
    if (type === "session.compaction.failed") {
      onVerifyFailure(sid, rec, ev.data?.error);
      return;
    }
    pending.delete(sid);
    verifiedSuccess(sid, rec);
  } catch {
    // never throw out of the consumer
  }
}

// The SSE consumer (an AsyncIterable from `ctx.event.subscribe()` —
// types.ts:6389 EventSubscribeOutput). The loop is fire-and-forget, NEVER
// awaited by setup; the `stopped` flag (cleanup) or a stream end/error EXITS
// the loop; an event body error is swallowed (the handler is already guarded).
function watchEvents(stream: AsyncIterable<unknown>): void {
  void (async () => {
    try {
      for await (const ev of stream) {
        if (stopped) break;
        onLiveEvent(ev as { type?: unknown; data?: { sessionID?: unknown } });
      }
    } catch {
      // stream end/error — the plugin stays alive (a re-subscribe is not
      // attempted at this channel)
    }
  })();
}

// ------------------------------------------------------------------ (3b) the continuation FILE leg (#158)

// The continuation message (`message` arg) becomes the OBSERVABLE v1 TEMP
// FILE: `.opencode/temp/compact_message_<sid>` — plain UTF-8, OVERWRITTEN on
// every verified compaction. NO `session.prompt`, EVER (the #158 DROP ruling:
// the native queue delivered late, twice, and could not be cancelled). The
// file is consumed ONCE at a genuine resume: the auto_resume item-4 relay
// renames it to `.consumed`; protocol STEP 0 covers the other channels; an
// unconsumed file simply STAYS as readable evidence (#158 DoD — no age
// sweep). Evidence: kind "queue" (kept) — `file-written` / `file-fail`; a
// write failure NEVER fails the tool.
function writeMessageFile(sid: string, text: string): void {
  const msgPath = join(root(), ".opencode", "temp", `compact_message_${sid}`);
  try {
    writeFileSync(msgPath, text, "utf8");
    appendLog(buildLine("queue", { session: sid, state: "file-written", chars: String(text.length) }, {}));
  } catch (e) {
    appendLog(buildLine("queue", { session: sid, reason: "file-fail", preview: cap(String((e as { message?: unknown } | undefined)?.message ?? e ?? ""), 120) }, {}));
  }
}

// ------------------------------------------------------------------ (1d) the pre-compaction dump hook (deviation (d) — the #152 v1 contract, v2 twin script)
//
// Ported BYTE-COMPATIBLE from the v1 plugin (MAIN `.opencode/plugin/compact_memory.ts`
// ~100-170 + 215): the no-overwrite naming keyed on the budget count, the ONE
// retry per artifact (#78), the `DUMP-OK`/`DUMP-RETRY=1`/`DUMP-FAIL` ctx.log
// lines carrying the FULL repo-relative path (#107), and the spawn of the DUMP
// SCRIPT — here the v2 TWIN `agent/scripts/db/dump_session_v2.mjs` (TODO #137
// unit 4c), because a v2 session's content lives in `session_v2` + `session_message`
// (NO `part` table). BEST-EFFORT: NEVER throws, NEVER blocks the tool — a
// failure appends the ctx.log lines and the response carries a WARNING (the
// response is UNCHANGED on success — smoke stability).
//
// The count keys the no-overwrite name and rides the PRE-DISPATCH budget count:
// in v2 the increment lands only at verified success (the
// `session.compaction.ended` event), so dumps of the SAME budget round share
// the `c<count>` base and the exact-exists stamped fallback covers repeats.
// v1 had TWO call sites (SELF + CROSS); the v2 plugin has ONE execute, so ONE
// dump leg covers both paths.

// The dump stamp `YYYYMMDDTHHmmss` — computed by the CALLER so the name
// function stays pure / clock-free (the smoke pins it byte-exact).
function dumpStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// The repo-relative corpus dir the dumps land in (the archive/sessions root).
// #107: the ctx.log DUMP-* lines carry the FULL repo-relative dump path (prefix
// + name); the spawn's `--out` stays corpus-relative (the script's OUT_DIR-relative
// argument, OUT_DIR = the script's own dir-relative `archive/sessions`).
const DUMP_ARCHIVE_REL = "archive/sessions";

// The pure dump-file NAME (no clock inside): `compaction_dumps/<sid>_c<count>.<md|json>`,
// or `..._c<count>_<YYYYMMDDTHHmmss>.<md|json>` when a stamp is supplied (the
// no-overwrite fallback). Exported for the byte-exact smoke pins (the v1 probe's
// 101/102/345 pattern).
export function preCompactionDumpName(sessionID: string, count: number, stamp: string | null, format: "md" | "json" = "md"): string {
  const core = `compaction_dumps/${sessionID}_c${count}`;
  return stamp != null ? `${core}_${stamp}.${format}` : `${core}.${format}`;
}

// The SHARED ctx.log — the v1 file the COMPACT line lands in (the DUMP-* lines
// share it; the plugin's own evidence lines go to compact_v2.log). Best-effort
// append, never throws.
function ctxLogPath(): string {
  return join(root(), ".opencode", "temp", "ctx.log");
}

function appendCtxLine(line: string): void {
  try {
    const p = ctxLogPath();
    mkdirSync(dirname(p), { recursive: true });
    appendFileSync(p, `${line}\n`, "utf8");
  } catch {
    // best effort — never break the tool over a write failure
  }
}

function oneLine(s: unknown): string {
  return String(s).replace(/\s+/g, " ").trim();
}

// `<stamp> DUMP-OK <sid> <relFile> ms=<ms>` (#78: the `ms=` prefix; #107: the
// full repo-relative path) — same local-stamp style as the v1 line.
function appendDumpOkLine(sessionID: string, relFile: string, ms: number): void {
  appendCtxLine(`${localStamp()} DUMP-OK ${sessionID} ${relFile} ms=${ms}`);
}

// `<stamp> DUMP-RETRY=1 <sid> <relFile> ms=<ms> err=<one-line error>` — the
// ONE retry per artifact (#78); the artifact relFile distinguishes the md/json
// lines (#92).
function appendDumpRetryLine(sessionID: string, relFile: string, ms: number, error: unknown): void {
  appendCtxLine(`${localStamp()} DUMP-RETRY=1 ${sessionID} ${relFile} ms=${ms} err=${oneLine(error)}`);
}

// `<stamp> DUMP-FAIL <sid> <relFile> <detail>` (v1 shape) — the detail is
// ONE-LINED so one event writes ONE log line (the child's error message is
// multi-line; an un-one-lined detail would fragment the ctx.log).
function appendDumpFailLine(sessionID: string, relFile: string, detail: string): void {
  appendCtxLine(`${localStamp()} DUMP-FAIL ${sessionID} ${relFile} ${oneLine(detail)}`);
}

// Resolves the node executable for the dump-script spawn (v1 #78 lesson): the
// live opencode host's execPath is the CLI binary, not a node runtime — plain
// node runtimes pass through untouched, anything else falls back to "node"
// (PATH + PATHEXT finds node.exe on Windows). Exported for the smoke pins.
export function resolveNodeExe(execPath: string = process.execPath): string {
  const base = basename(execPath).toLowerCase();
  return base.startsWith("node") ? execPath : "node";
}

// The fixed dump-spawn budget (#78: 120 s — measured dump wall-times are tens
// of ms, so a live DUMP-FAIL is a spawn-level stall, not budget exhaustion).
const DUMP_SPAWN_TIMEOUT_MS = 120_000;

// One dump-spawn attempt: ARGS ARRAY (no shell), `stdio: "pipe"` so a DUMP-FAIL
// can carry the child's stderr (#78); NEVER throws — returns the elapsed ms and,
// on failure, the error text + the captured stderr.
function runDumpSpawn(scriptPath: string, sessionID: string, name: string, extraArgs: string[] = []): { ms: number; error?: string; stderr?: string } {
  const t0 = Date.now();
  try {
    execFileSync(resolveNodeExe(), [scriptPath, sessionID, "--out", name, ...extraArgs], { timeout: DUMP_SPAWN_TIMEOUT_MS, stdio: "pipe" });
    return { ms: Date.now() - t0 };
  } catch (err) {
    const e = err as { message?: unknown; stderr?: unknown } | undefined;
    const stderr = e?.stderr != null ? String(e.stderr) : "";
    const error = typeof e?.message === "string" && e.message !== "" ? e.message : err != null ? String(err) : "dump script failed";
    return { ms: Date.now() - t0, error, stderr };
  }
}

// The DUMP-FAIL detail (#78): the error text + the child's captured stderr,
// each one-lined, joined.
function dumpFailDetail(r: { error?: string; stderr?: string }): string {
  const error = r.error ?? "dump script failed";
  const stderr = oneLine(r.stderr ?? "");
  return stderr !== "" ? `${error} | stderr: ${stderr}` : error;
}

// One artifact's dump: one attempt → ONE DUMP-RETRY=1 line → the retry →
// DUMP-FAIL. The json artifact's spawn carries the extra `--json` flag (#92:
// the lossless md AND the raw json snapshot, each INDEPENDENTLY — one's failure
// does not skip the other).
function dumpOneArtifact(
  scriptPath: string,
  sessionID: string,
  name: string,
  format: "md" | "json",
): { ok: boolean; error?: string } {
  const extra = format === "json" ? ["--json"] : [];
  const relFile = `${DUMP_ARCHIVE_REL}/${name}`;
  const first = runDumpSpawn(scriptPath, sessionID, name, extra);
  if (first.error == null) {
    appendDumpOkLine(sessionID, relFile, first.ms);
    return { ok: true };
  }
  appendDumpRetryLine(sessionID, relFile, first.ms, first.error);
  const second = runDumpSpawn(scriptPath, sessionID, name, extra);
  if (second.error == null) {
    appendDumpOkLine(sessionID, relFile, second.ms);
    return { ok: true };
  }
  const detail = dumpFailDetail(second);
  appendDumpFailLine(sessionID, relFile, detail);
  return { ok: false, error: detail };
}

// The hook: run the dump twin for the target session, BOTH artifacts, named on
// the budget count. The no-overwrite rule: an EXACT-EXISTS md base target →
// the STAMPED names (the MD base decides; both artifacts share the stamp).
// NEVER throws, NEVER blocks; returns {ok, files (md first), error}.
export function preCompactionDump(rootDir: string, sessionID: string, count: number): { ok: boolean; files: string[]; error?: string } {
  const scriptPath = join(rootDir, "agent", "scripts", "db", "dump_session_v2.mjs");
  const archiveDir = join(rootDir, DUMP_ARCHIVE_REL);
  const baseTarget = join(archiveDir, preCompactionDumpName(sessionID, count, null));
  const stamp = existsSync(baseTarget) ? dumpStamp() : null;
  const files: string[] = [];
  const errors: string[] = [];
  for (const format of ["md", "json"] as const) {
    const name = preCompactionDumpName(sessionID, count, stamp, format);
    const target = join(archiveDir, name);
    const one = dumpOneArtifact(scriptPath, sessionID, name, format);
    if (one.ok) {
      files.push(target);
    } else {
      errors.push(`${format}: ${one.error}`);
    }
  }
  const ok = files.length === 2;
  return errors.length > 0
    ? { ok, files, error: errors.join(" | ") }
    : { ok, files };
}

// ------------------------------------------------------------------ (1e) the #184 retained-tail leg (marker mode)
//
// The retention the agent chooses. The CURRENT window rows come from
// `sessionApi.context` — the SAME lane context_trim_v2.ts reads (ASC by seq,
// the window head first). The LAST `keepMessages` RENDERABLE rows are kept, in
// window order (oldest first), and rendered as verbatim text; the section is
// COMPOSED into the marker summary the draft hook supplies, so the retention
// lands in the DURABLE compaction row. Selection rules: a `compaction` row is
// NOT a transcript entry (it carries an earlier summary — the agent-written
// marker summary is the carrier for that state), and a row with nothing
// renderable is skipped, so N counts ENTRIES, not raw rows. Rendering:
// user/synthetic/system/skill `text` verbatim; assistant `text` items verbatim;
// tool items reduce to ONE `tool: <name> <one-line target>` line (the
// context_trim target rule — read filePath [+offset/+limit], bash command
// one-lined, webfetch url, anything else name-only); assistant `reasoning`
// items are DROPPED (the largest mass, the least resumable). NEVER throws.
//
// The bounds the schema states AND the tool enforces (the host MAY not
// validate the schema before `execute`).
const KEEP_MIN = 1;
const KEEP_MAX = 40;
const TAIL_HEADING = "## Retained tail";

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function rowType(r: Record<string, unknown>): string {
  return typeof r["type"] === "string" ? (r["type"] as string) : "?";
}

// A tool item → `tool: <name> <one-line target>` (the context_trim target rule,
// re-implemented here — context_trim_v2.ts is read-only for this unit).
function toolLine(item: Record<string, unknown>): string {
  const name = typeof item["name"] === "string" && item["name"] !== "" ? (item["name"] as string) : "?";
  const state = asRecord(item["state"]);
  const input = state != null ? asRecord(state["input"]) : undefined;
  let target = "";
  if (input != null) {
    if (name === "read" && typeof input["filePath"] === "string") {
      target = input["filePath"] as string;
      const off = input["offset"];
      const lim = input["limit"];
      if (typeof off === "number" && Number.isFinite(off)) target += ` offset=${String(off)}`;
      if (typeof lim === "number" && Number.isFinite(lim)) target += ` limit=${String(lim)}`;
    } else if (name === "bash" && typeof input["command"] === "string") {
      target = (input["command"] as string).replace(/\s+/g, " ").trim();
    } else if (name === "webfetch" && typeof input["url"] === "string") {
      target = input["url"] as string;
    }
  }
  return target !== "" ? `tool: ${name} ${target}` : `tool: ${name}`;
}

// One row's entry text ("" when the row carries nothing renderable — the caller
// skips it and N still counts the RENDERED entries).
function entryText(r: Record<string, unknown>): string {
  const own = r["text"];
  if (typeof own === "string" && own.trim() !== "") return own.trim();
  const parts: string[] = [];
  for (const item of asArray(r["content"])) {
    const it = asRecord(item);
    if (it == null) continue;
    if (it["type"] === "text" && typeof it["text"] === "string" && (it["text"] as string).trim() !== "") parts.push((it["text"] as string).trim());
    else if (it["type"] === "tool") parts.push(toolLine(it));
  }
  return parts.join("\n");
}

type TailRead = { ok: true; count: number; text: string; chars: number } | { ok: false; reason: string; preview: string };

// The window read + the tail render for one compaction. The outcome is ok with
// the delimited section text, or names ONE reason (context-unavailable /
// context-read-failed / tail-empty) — the caller REFUSES the dispatch on any of
// them (no silent no-retention).
async function readTail(sid: string, keep: number): Promise<TailRead> {
  const api = sessionApi;
  const context = api?.context;
  if (typeof context !== "function") return { ok: false, reason: "context-unavailable", preview: "session.context is unavailable on this host" };
  try {
    const out = await (context as (i: { sessionID: string }) => Promise<unknown>)({ sessionID: sid });
    if (!Array.isArray(out)) return { ok: false, reason: "context-read-failed", preview: "context output is not an array" };
    const rows: Array<{ type: string; text: string }> = [];
    for (const item of out) {
      const r = asRecord(item);
      if (r == null) continue;
      const type = rowType(r);
      if (type === "compaction") continue;
      const text = entryText(r);
      if (text === "") continue;
      rows.push({ type, text });
    }
    if (rows.length === 0) return { ok: false, reason: "tail-empty", preview: "the current window carries no renderable transcript rows" };
    const picked = rows.slice(-keep); // the LAST N, window order preserved
    const n = picked.length;
    const lines: string[] = [
      TAIL_HEADING,
      "",
      `The last ${n} transcript entries before this compaction — verbatim, oldest first; tool calls reduced to one line each.`,
      "",
    ];
    picked.forEach((r, i) => {
      lines.push(`[${i + 1}/${n} ${r.type}]`, r.text, "");
    });
    lines.push(`[end of retained tail — ${n} entries]`);
    const text = lines.join("\n");
    return { ok: true, count: n, text, chars: text.length };
  } catch (e) {
    return { ok: false, reason: "context-read-failed", preview: cap(String((e as { message?: unknown } | undefined)?.message ?? e ?? ""), 120) };
  }
}

// The composed marker message: the agent's summary, then the tail section.
function composeMarkerMessage(summary: string, tailText: string): string {
  return `${summary}\n\n${tailText}\n`;
}

// ------------------------------------------------------------------ (2) the tool surface

const TOOL_DESCRIPTION =
  "Compacts a session to free context space. Two paths: SELF (sessionID omitted) — the CALLING session is compacted and continues from committed files via the post-compaction protocol; CROSS (explicit sessionID) — a fire-and-forget dispatch: it returns immediately and is NEVER awaited (an await would deadlock the single llama-swap model slot); success is verified ASYNCHRONOUSLY — the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success (the session.compaction.ended event), and a failed dispatch burns NO budget. The budget is per TARGET session, per model — the cap comes from the compact_budget.json model_budget map (bare model id -> cap; unlisted models get the configured default; CPU models denied — cap 0). The total budget per session is the cap + ONE emergency compaction: once the normal cap is drained, the `emergency` argument may consume the 1 (count -> cap+1 = fully exhausted). A CROSS caller (explicit sessionID != the calling session) gets an effective cap of cap + 1 (the caller-scoped override, ruling 2026-09-30) — the spendable TOTAL stays THE SAME AS SELF (cap + the one emergency): a cross at count == cap dispatches via the override slot (the COMPACT line gains the ` ovr` token), and a cross at count == cap + 1 stays REFUSED. MARKER mode (args mode:'marker' + summary): the agent writes the summary itself (compaction style, the current model) and the plugin supplies it at the v2 `compaction` draft hook (event.result — the core skips the summarizer model request and writes the durable compaction message). DEVIATIONS vs v1: the `boundary` argument is IGNORED (v2 computes the retained `recent` from the config compaction.keep.tokens; ONE boundary-ignored evidence line); `keepMessages` (#184) works on the MARKER path ONLY — the plugin appends the session's LAST N transcript entries verbatim (oldest first) as a `## Retained tail` section INSIDE your summary, so the retention lands in the durable compaction row (the request-assembly hook drops entries, it can never re-add them); it is REJECTED with AUTO mode (`keep-requires-marker`), outside 1..40, or when the window read fails — never silently ignored; the budget file's keepMessages/keepTokens stay audit-only (ONE keep-not-applied line, and it is REPLACED by kind:\"keep\" state:\"applied\" keepMessages=<N> tailChars=<n> on the applied path); the `message` continuation is WRITTEN to `.opencode/temp/compact_message_<sid>` AT verified success (plain UTF-8, overwritten per compaction; consumed ONCE at the resume — the auto_resume restart relay tombstones it to `.consumed`, protocol STEP 0 covers the other channels; NO native queue call); the pre-compaction dump lands in archive/sessions/compaction_dumps/ (BOTH the md and json artifacts) BEFORE the dispatch — a dump failure adds a WARNING to the response, it NEVER blocks the compaction. Use it at the stop line / near-limit triage (self) or before a task_id resume of a session that died at its limit (cross); do NOT use it as a restart substitute.";

// The input schema — a plain JSON schema (the promise surface accepts
// Tool.ValueSchema = a JsonSchema literal; InputValue resolves to `unknown`,
// so `execute` reads the args defensively).
const TOOL_INPUT = {
  type: "object",
  additionalProperties: false,
  properties: {
    sessionID: {
      type: "string",
      description: "The TARGET session. Omit = SELF (the calling session); an explicit id != the caller = CROSS (fire-and-forget, effective cap + 1).",
    },
    emergency: {
      type: "boolean",
      description: "Consumes the once-per-session emergency compaction (allowed only at count == cap). Omit = a normal compaction.",
    },
    message: {
      type: "string",
      description: "The post-compaction continuation message (1-3 lines: what to resume + which files to re-read). WRITTEN to `.opencode/temp/compact_message_<sid>` at verified success (#158 file channel — overwritten per compaction; consumed ONCE at the resume).",
    },
    mode: {
      type: "string",
      enum: ["auto", "marker"],
      description: "The dispatch mode. 'auto'/absent = the host summarizer compaction. 'marker' = the agent supplies the summary itself (U3) and the plugin supplies it at the compaction draft hook; it consumes ONE budget compaction (the normal cap applies).",
    },
    summary: {
      type: "string",
      description: "marker mode REQUIRED: the summary text the agent wrote itself (compaction style, the current model).",
    },
    keepMessages: {
      type: "integer",
      minimum: 1,
      maximum: 40,
      description: "marker mode ONLY: N = how many of the session's LAST transcript entries survive inside the compaction message. The plugin appends them verbatim (oldest first) to your summary as a `## Retained tail` section — tool calls render as `tool: <name> <one-line target>`, assistant reasoning is dropped. A `compaction` row and unrenderable rows do not count toward N. REJECTED (nothing dispatched): with AUTO mode (`keep-requires-marker` — the AUTO path cannot thread keep), outside 1..40 (the schema integer bound, enforced here too), or when the window read fails / has no renderable row. Example: { mode:'marker', summary:'<your summary>', keepMessages:8 }.",
    },
    boundary: {
      type: "string",
      description: "IGNORED in v2 — the retained `recent` is core-computed from the config compaction.keep.tokens; logs ONE boundary-ignored evidence line when present.",
    },
  },
};


// ------------------------------------------------------------------ the tool execute

// The tool call sequence (v1 order): session id (SELF/CROSS) → the marker
// arg validation → the boundary audit line → the model class → the GATE (den
// -ial = ZERO side effects: no pending record, no increment, no compact call,
// no COMPACT line) → the pending record + the audit lines (keep-not-applied
// /dump ok|failed + the corpus dumps) → the fire-and-forget dispatch → the
// -ER a success claim). NEVER throws: every host call is guarded.
async function execute(args: unknown, toolContext: { sessionID?: unknown }): Promise<{ output: string }> {
  const a: Record<string, unknown> = args != null && typeof args === "object" && !Array.isArray(args)
    ? (args as Record<string, unknown>)
    : {};
  // (2) SELF/CROSS routing — an explicit id targets ANOTHER session (or
  // itself); absent = the calling session, read off the ToolContext.
  const explicitID = typeof a.sessionID === "string" && a.sessionID !== "" ? a.sessionID : null;
  const callerID = typeof toolContext?.sessionID === "string" && toolContext.sessionID !== "" ? toolContext.sessionID : null;
  const sessionID = explicitID ?? callerID;
  if (sessionID == null) {
    return { output: "Compaction request failed: no session id available (pass the sessionID argument or a context session id)." };
  }
  const isCross = explicitID != null && explicitID !== callerID;

  // (5a) the marker mode args — the summary is REQUIRED; `boundary` is
  // accepted and IGNORED (DEVIATION (a)) with ONE audit line.
  const isMarker = a.mode === "marker";
  let markerSummary = "";
  if (isMarker) {
    markerSummary = typeof a.summary === "string" ? a.summary : "";
    if (markerSummary === "") {
      return { output: "marker= rejected: summary-empty (the marker mode requires the summary text — write the summary yourself, compaction style)" };
    }
  }
  if (typeof a.boundary === "string" && a.boundary.trim() !== "") {
    appendLog(buildLine("marker", { session: sessionID, state: "boundary-ignored" }, {}));
  }

  // (1e) #184 — the `keepMessages` argument. MARKER path ONLY: the AUTO path has
  // nowhere to thread retention (the v2 compact body carries no keep fields), so
  // the combination is REFUSED, never ignored. The bounds are enforced HERE too —
  // the host MAY validate the schema, MAY not. A digit-string passes (the same
  // poka-yoke the context_trim keep form allows).
  const keepArg = a.keepMessages;
  const wantsKeep = keepArg != null && keepArg !== "";
  let keepN = 0;
  if (wantsKeep) {
    if (!isMarker) {
      appendLog(buildLine("keep", { session: sessionID, reason: "keep-requires-marker", keepMessages: String(keepArg) }, {}));
      return {
        output:
          `keepMessages= rejected: keep-requires-marker (the AUTO path cannot thread keep — retention composes into the marker summary). ` +
          `Pass mode:'marker' with the summary text, e.g. { mode:'marker', summary:'…', keepMessages:${String(keepArg)} }. Nothing dispatched.`,
      };
    }
    const n = typeof keepArg === "number" ? keepArg : Number(String(keepArg));
    if (!Number.isInteger(n) || n < KEEP_MIN || n > KEEP_MAX) {
      appendLog(buildLine("keep", { session: sessionID, reason: "keep-invalid", keepMessages: String(keepArg) }, {}));
      return { output: `keepMessages= rejected: keep-invalid ${String(keepArg)} (an integer ${KEEP_MIN}..${KEEP_MAX}). Nothing dispatched.` };
    }
    keepN = n;
  }

  // The model CLASS (the cap resolver + the COMPACT line's model field only —
  // v2 supplies no summarizer pair; the host picks the summarizer). Fail-
  // open: an unresolved id falls to the budget-file default cap.
  let model = "";
  let modelNote = "";
  try {
    const api = sessionApi;
    if (typeof api?.get === "function") {
      const info = await (api.get as (i: { sessionID: string }) => Promise<unknown>)({ sessionID });
      const id = (info as { model?: { id?: unknown } } | null | undefined)?.model?.id;
      if (typeof id === "string" && id !== "") model = id;
    }
  } catch {
    // host RPC failure → the default cap class (never a throw)
  }
  if (model === "") modelNote = "model: unresolved — the cap class falls back to the budget-file default (model_budget.default, else 1)";

  // (1) the configured cap + the budget gate — BEFORE any compact call.
  const gate = budgetGate(root(), model, sessionID, isCross, a.emergency === true);
  if (!gate.allowed) {
    appendLog(buildLine("dispatch", { session: sessionID, state: "denied", label: gate.label, cap: String(gate.cap), count: String(gate.count), model }, {}));
    return { output: `${gate.refusal}${modelNote !== "" ? `\n${modelNote}` : ""}` };
  }
  const cfg = readCompactionConfig(root());

  // (1e) THE TAIL COMPOSITION (#184) — read the window BEFORE the dispatch (the
  // pre-compaction rows are the ones to retain) and fold the section into the
  // marker summary the draft hook will supply, so the retention rides the
  // DURABLE compaction row. A failed read or an unrenderable window REFUSES the
  // dispatch: a requested retention that silently keeps nothing is exactly the
  // failure #184 removes. Zero side effects on that path — the gate writes
  // nothing, and the pending record + the dump land only past here.
  let composedSummary = markerSummary;
  let keepApplied = false;
  let tailCount = 0;
  let tailChars = 0;
  if (keepN > 0) {
    const tail = await readTail(sessionID, keepN);
    if (!tail.ok) {
      appendLog(buildLine("keep", { session: sessionID, reason: tail.reason, keepMessages: String(keepN), preview: tail.preview }, {}));
      return {
        output:
          `keepMessages= rejected: ${tail.reason} for ${sessionID} (${tail.preview}). ` +
          `Nothing dispatched — a requested retention must not silently keep nothing.`,
      };
    }
    composedSummary = composeMarkerMessage(markerSummary, tail.text);
    keepApplied = true;
    tailCount = tail.count;
    tailChars = tail.chars;
    appendLog(buildLine("keep", { session: sessionID, state: "applied", keepMessages: String(keepN), tailChars: String(tail.chars) }, {}));
  }

  // The pending record — written BEFORE the dispatch (the compaction hook
  // and the verify leg read it); the continuation text is remembered, NOT yet
  // written (DEVIATION (b): the #158 message FILE lands at verified success).
  pending.set(sessionID, {
    model,
    isEmergency: gate.isEmergency,
    isOverride: gate.isOverride,
    markerSummary: composedSummary,
    fired: false,
    queueText: typeof a.message === "string" ? a.message : "",
    keepMessages: cfg.keepMessages,
    keepTokens: cfg.keepTokens,
  });
  const keepAudit = hasKeepKeys(root());
  // #184: the `state:"applied"` line (logged at the composition above) REPLACES
  // this audit line on the applied path — one keep line per dispatch.
  if (keepAudit && !keepApplied) {
    appendLog(buildLine("keep", { session: sessionID, reason: "keep-not-applied", keepMessages: String(cfg.keepMessages), keepTokens: cfg.keepTokens != null ? String(cfg.keepTokens) : undefined }, {}));
  }
  // (1d) THE PRE-COMPACTION DUMP (#152 semantics, the v1 hook contract): BOTH
  // artifacts land in the corpus BEFORE the dispatch; the ctx.log DUMP-* lines
  // and the ONE retry ride `preCompactionDump` above. The count = the PRE-
  // DISPATCH budget count (the increment lands only at verified success).
  // Best-effort: a failure warns in the response, NEVER blocks the dispatch.
  const dump = preCompactionDump(root(), sessionID, gate.count);
  appendLog(buildLine("dump", { session: sessionID, state: dump.ok ? "ok" : "failed", error: dump.error }, {}));
  const dumpWarning = dump.ok ? "" : `\nWARNING: pre-compaction dump failed for ${sessionID} (${dump.error})`;

  // (3) the dispatch — NO AWAIT (the same-slot rule survives v2: an awaited
  // dispatch freezes the issuing turn); the response is NEVER a success claim
  // — only the accepted/rejected audit line. The v2 body carries NO keep
  // fields: exactly {sessionID}.
  const api = sessionApi;
  if (typeof api?.compact !== "function") {
    pending.delete(sessionID);
    appendLog(buildLine("dispatch", { session: sessionID, state: "unavailable" }, {}));
    return { output: "Compaction request failed: session.compact is unavailable on this host." };
  }
  const call = api.compact({ sessionID });
  void Promise.resolve(call).then(
    () => {
      appendLog(
        buildLine(
          "dispatch",
          {
            session: sessionID,
            state: "accepted",
            model,
            mode: isMarker ? "marker" : "auto",
            cap: String(gate.cap),
            count: String(gate.count),
            emergency: gate.isEmergency ? "yes" : undefined,
            ovr: gate.isOverride ? "yes" : undefined,
          },
          {},
        ),
      );
    },
    (e: unknown) => {
      pending.delete(sessionID);
      appendLog(
        buildLine(
          "verify",
          {
            session: sessionID,
            state: "failed",
            reason: "dispatch-rejected",
            preview: cap(String((e as { message?: unknown } | undefined)?.message ?? e ?? ""), 120),
          },
          {},
        ),
      );
    },
  );

  const responseParts: string[] = [];
  if (isMarker) responseParts.push(keepApplied
    ? "marker= queued — the compaction draft hook supplies the agent summary PLUS the composed `## Retained tail` section (the core skips the summarizer model request; the retention rides the DURABLE compaction row)"
    : "marker= queued — the compaction draft hook supplies the summary (the core skips the summarizer model request; the `boundary` argument is IGNORED in v2 — retention rides the config compaction.keep.tokens)");
  else responseParts.push("Compaction dispatched");
  responseParts.push(` for ${sessionID} (model: ${model !== "" ? model : "unresolved"})`);
  if (gate.isEmergency) responseParts.push(" — the emergency slot is consumed (count → cap+1)");
  if (gate.isOverride) responseParts.push(" — the caller-scoped cross override slot is consumed (the COMPACT line gains the ` ovr` token)");
  responseParts.push(`; the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success (the session.compaction.ended event) — a failed compaction burns NO budget. Used ${gate.count}/${gate.cap} (model class ${gate.label}).`);
  if (typeof a.message === "string" && a.message !== "") responseParts.push(" The continuation message lands in `.opencode/temp/compact_message_<sid>` at verified success (#158 file channel — no native queue; consumed once at the resume).");
  if (keepAudit && !keepApplied) responseParts.push(" keepMessages/keepTokens are NOT applied in v2 (the compact body has no keep fields).");
  if (keepApplied) responseParts.push(` Retained tail (#184): the last ${tailCount} window entries (${tailChars} chars) composed into the compaction message under \`## Retained tail\` — audit line kind:"keep" state:"applied" in .opencode/temp/compact_v2.log.`);
  if (dumpWarning !== "") responseParts.push(dumpWarning);
  if (modelNote !== "") responseParts.push(`\n${modelNote}`);
  return { output: responseParts.join("") };
}

const compactTool = {
  name: "compact_memory",
  description: TOOL_DESCRIPTION,
  input: TOOL_INPUT,
  output: { type: "string" },
  execute,
};

// ------------------------------------------------------------------ the plugin module

// The v2 plugin module (the loader decodes the DEFAULT export only). The hook
// callback params are INFERRED from the fork's `SessionCompaction` shape;
// the handler keeps its own wire-defensive guards regardless.
const plugin: Plugin.Plugin = {
  id: "compact_memory",
  async setup(ctx) {
    dir = ctx.location.directory;
    sessionApi = ctx.session; // the compact/prompt/get carrier (the §(3)/(3b) channel)
    const regTool = await ctx.tool.transform((editor) => {
      editor.add(compactTool);
    });
    const regHook = await ctx.session.hook("compaction", (event) => onCompactionDraft(event));
    let stream = ctx.event != null && typeof ctx.event.subscribe === "function" ? ctx.event.subscribe() : undefined;
    if (stream != null) watchEvents(stream);
    return () => {
      stopped = true;
      pending.clear();
      void regTool.dispose();
      void regHook.dispose();
    };
  },
};

export default plugin;
