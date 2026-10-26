// auto_resume.ts — the v2-NATIVE auto-resume plugin (TODO #137 order 2,
// 2026-10-22, clone `migration`). Ports the v1 plugin's LOOP legs onto the
// v2 plugin surfaces: `ctx.event.subscribe()` (the SSE stream), `ctx.session
// .hook("context")`, `ctx.session.create` + `ctx.session.prompt(delivery:
// "queue")`, `ctx.location.directory`. Auto-discovered from `.opencode/plugins
// /` — NO `opencode.jsonc` change (the 3a precedent). The v1 design of record
// stays `.opencode/plugin/auto_resume.ts` (MAIN); the clone's inert v1 copy
// (`plugin-unported-v1/`) is untouched.
//
// WHAT IT IS: a v2 plugin (`Plugin.Plugin` — DEFAULT export only, the loader
// contract; the `@opencode/plugin` import is TYPE-ONLY, erased at runtime; the
// window carrier is a VALUE import of the plain-JS gauge core — the context
// _family.ts / compact_memory.ts pattern).
//
// PORTED UNIT MAP (v1 units, minus the ones this unit does not carry):
//   UNIT 1 — the EVENT LOG: ONE line per delivered event,
//     `<ISO time> event=<type> sid=<sessionID> <key fields>`, append-only
//     `.opencode/temp/auto_resume.log` (mkdir'd recursive); the HIGH-VOLUME
//     delta classes are NEVER logged (the v2 analogue of v1's `message.part
//     delta` #96 rule): `session.text.delta`, `session.reasoning.delta` and
//     `session.tool.input.delta`. Plus the ONE-SHOT init surface probe (`surface
//     =` line, `typeof` ONLY) and the #96 INIT LOG-SIZE GUARD (`log-trim= old=
//   UNIT 2 — NOT PORTED HERE: the PASSIVE ctx-line nudge suffix ALREADY lives
//     in `plugins/context_family.ts` (the 3b unit). Do not duplicate it.
//   UNIT 3 — the SUCCESSOR SPAWN: the one-shot trigger file
//     `.opencode/temp/auto_resume_spawn_trigger` checked on EVERY tick;
//     `create` + ONE QUEUED prompt; the spawn marker/ident (`<folder> planner
//     -<n>`) and the `spawn=` / `spawn-fail=` lines; NEVER throws outward.
//   UNIT 4 — the LIVENESS WATCHDOG: per-session watch state armed by events
//     ONLY (#159: busy rides `session.step.started`, idle rides
//     `session.step.ended` with a TERMINAL finish — `tool-calls` means the
//     turn continues; the `session.status`/`session.idle` legs stay for a
//     host that emits them; the v2 host publishes NEITHER status event);
//     the tick is the ONE decision+send funnel; the `action:` line
//     reading (LINE-ANCHORED, last match wins — #98 part A), the stop/ask
//     no-send routes, the recovery CONTINUE budget (cap 2 per idle cycle,
//     dead-mark on a failed send), the successor check, the LINEAGE-DEPTH cap
//     (`skip= depth`), the STICKY trigger deactivation, the loop-iteration
//     counter (`loop/<folder>/counter.json` + the `ident=` title bit), the
//     #98 COMPACT-line RE-ARM tail read of `.opencode/temp/ctx.log`
//     (`rearm= compact sid=`), and the #90 part-C log RESTORE (ONCE per
//     process) of the depth map + deactivation flags.
//   #109 — the SILENT LIMIT-STOP DETECTOR: the 5-clause signature,
//     `limit-stop=` attribution line + the ONE `-WARNING` line in the current
//     looprun's `loop/<folder>/loop_log.md`, fired ONCE per episode (the
//     `limitWarned` latch), NO action on the session.
//   #178 — the DURABLE MODE STORE: `.opencode/temp/session_mode.json` =
//     `{ "<sid>": "autorun" | "direct" }`. A toggle in ANY user message writes
//     it immediately (sticky); the STORE entry wins over the verdict chain at
//     scope recompute AND at watch creation (the opencode-restart path).
//     Fail-closed (unreadable/corrupt -> empty); NO new log kinds.
//
// EVIDENCE SHAPES CARRIED BYTE-IDENTICAL from v1 (same temp files): the event
// line, `arm=` (`arm= sid=X injected`), `spawn=` / `spawn-fail=`, `rename-fail
// =`, `route= stop|ask|restart spawn`, `recovery= sid= attempt=N`, `send-fail
// =`, `scope=`, `skip= successor|depth|dead|deactivated`, `deactivate= sid=`,
// `budget= exhausted sid=`, `rearm= compact sid=`, `limit-stop= sid= total=`,
// `-WARNING auto_resume <sid> <model> silent limit-stop: finish=length total
// =… window=… no-COMPACT`, `log-trim= old= new=`, `surface= v=<sha8> …`.
//
// DEVIATIONS (this header is REQUIRED; each v1-only leg is named):
//   (a) NO in-process message-history read exists in the v2 session domain
//     (the Pick at fork `promise/session.ts:153-172` has NO `messages`). The
//     scope verdict, the current agent+model identity, the user-message count
//     and the LAST user message's own-line toggle are therefore computed at
//     the `context` hook (fork `promise/session.ts:33-36` — the draft's `
//     messages` array + `agent`), i.e. at the NEXT MODEL REQUEST, and CACHED
//     on the watch; v1 recomputed them on a fresh `messages()` fetch AT IDLE.
//     A session that never issues a model request keeps verdict `unknown` (
//     fail-safe = no action). The LAST assistant action line rides the
//     `session.text.ended` events (fork `schema/src/session-event.ts:416-425
//     — {sessionID, assistantMessageID, ordinal, text}`): text parts are
//     accumulated per assistant message, the NEWEST message wins.
//   (b) The v1 prompt body's `agent`/`model` identity fields have NO v2
//     are NEVER called (behavior change would be a maintainer call). The SPAWN
//     identity DOES port: `SessionCreateInput` is FLAT (generated types.ts:3064
//     -3134 — the fields `id`/`parentID`/`title`/`agent`/`model:{id,provider
//     ID,variant?}`/`location`/`metadata`/`permissions`, each declared via the
//     `{ <field>: <type> }["<field>"]` idiom), so the create body carries
//     `title` (the ident), `agent` and `model` directly.
//   (c) The #120 post-compaction TAIL-SET leg is NOT ported: its write lane
//     is the context_trim core, whose v2 twin (`plugins/context_trim_v2.ts`)
//     is a separate unit. The RE-ARM half of that leg (#98) IS ported.
//   (d) The compact_message_* temp-file legs (item-2 CONTINUE relay, item-4
//     restart INTENT HINT, the item-3 age SWEEP) have NO v2 carrier: the v2
//     compact_memory plugin delivers continuations on the native inbox queue
//     (`delivery:"queue"`), so no file store exists to relay. The `intent=`
//     and `queue-sweep=` lines are therefore absent by construction.
//   (e) v1's `extra.model.id` / `session?.id` / `input.directory` /
//     `client.app.log` carriers: the plugin root rides `ctx.location
//     directory` (the same deviation the 5b units recorded), the caller
//     session id is NOT needed (no tool leg), and v2 `App` = {name,version
//     channel} (fork `plugin/src/app.ts:1-5`) — the probe lists those
//     typeofs instead of `app.log`.
//   (f) The v1 model-window read (the in-process `client.provider.list`
//     catalog) has NO v2 carrier. The window is resolved by the SHARED gauge
//     core `resolveWindow()` (config-first `provider.*.limit.context`, then
//     the name-marker parse — the #115 rule), the same carrier the ctx gauge
//     uses. Unresolvable → NO detector fire (fail-open, clause (2)).
//   (g) The plugin receives NO factory options in v2 (auto-discovery); the
//     test levers (`tickMs`, `maxLogBytes`, `logTailBytes`, `limitStopIdleMs`)
//     ride `ctx.options` (`PluginOptions = Readonly<Record<string, any>>` —
//     fork plugin/src/options.ts:1). Absent -> the v1 defaults (5000 / 20MiB
//     / 2MiB / 60_000), so live behavior stays unchanged. `runTick()` is the
//     smoke's deterministic single-tick export (the live host NEVER calls it).
//
// STILL PENDING (unchanged): LIVE v2-host activation waits for the maintainer
// 's host runs; registration/config = maintainer domain.

import type { Plugin } from "@opencode/plugin";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, readSync, renameSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The window carrier (DEVIATION (f)) — the shared gauge core, plain JS.
import { resolveWindow } from "./scripts/gauge.mjs";

// ------------------------------------------------------------------ constants (v1 values, byte-carried)

const SPAWN_TRIGGER_FILE = "auto_resume_spawn_trigger";
const COMPACT_BUDGET_FILE = "compact_budget.json";
// #178: the DURABLE per-session mode store — `{ "<sid>": "autorun" | "direct" }`.
const SESSION_MODE_FILE = "session_mode.json";
const LINEAGE_FILE = "lineage_max_depth";
const AUTONOM_MARKER = "<|autonom|>";
const TOGGLE_ON_MARKERS: ReadonlyArray<string> = ["<|autonom|>", "<|autorun|>"];
const TOGGLE_OFF_MARKER = "<|direct|>";
const MAX_RECOVERY_ATTEMPTS = 2;
const LINEAGE_DEFAULT_MAX_DEPTH = 10;
const LIMIT_STOP_WINDOW_RATIO = 0.99;
const LIMIT_STOP_IDLE_MS = 60_000;
const MAX_LOG_BYTES_DEFAULT = 20 * 1024 * 1024;
const LOG_TAIL_BYTES_DEFAULT = 2 * 1024 * 1024;
const TICK_MS_DEFAULT = 5000;
const PENDING_INJECT_TTL = 120_000;

// #98 part A: LINE-ANCHORED — `action:` matches ONLY at line start (after any
// leading whitespace), never a PROSE-QUOTED MID-LINE mention. The anchor group
// is NON-capturing so group 1 is the ACTION WORD.
// #170: `continue` is the INTENTIONAL same-session wake (the close ladder's
// idle+context-healthy close) — it must NOT ride the recovery budget.
const ACTION_RE = /(?:^|\n)\s*action:\s*(restart|resume|stop|ask_maintainer|continue)/g;

// #98 part B: the COMPACT-line sid + keep extractors of the shared ctx.log
// line form (the compact_memory plugin writes it BYTE-IDENTICally).
const COMPACT_SID_RE = /\bCOMPACT\s+(ses_[A-Za-z0-9_]+)/;

// The v2 high-volume delta classes — the v1 `message.part.delta` analogue
// (#96). NEVER logged (they are ~97% of the volume); they also arm nothing.
const NEVER_LOGGED: ReadonlyArray<string> = ["session.text.delta", "session.reasoning.delta", "session.tool.input.delta"];

// The v2 candidate session-domain methods probed at init (the v1 list,
// re-derived for the v2 Pick — fork promise/session.ts:153-172).
const SURFACE_CANDIDATES: ReadonlyArray<string> = ["create", "get", "remove", "prompt", "generate", "command", "compact", "synthetic", "interrupt", "update", "move", "wait", "context", "hook"];

// ------------------------------------------------------------------ module state

let root = ""; // ctx.location.directory
let logPath = "";
let ctxLogPath = "";
let projectDir = "";
let sessionApi: Plugin.Context["session"] | undefined;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let tailCursor = 0; // the ctx.log tail-read cursor
// #178: the durable mode store — path set at setup, lazy in-memory mirror of
// the JSON file (reset on (re)load — a restart re-reads the store).
let modeStorePath = "";
type SessionMode = "autorun" | "direct";
let modeStoreCache: Map<string, SessionMode> | null = null;

type Watch = {
  armed: boolean;
  status: string;
  idlePending: boolean;
  recoveryCount: number;
  deadMarked: boolean;
  deactivated: boolean;
  deactivatedUserCount: number;
  scope: "planner" | "autorun" | "none" | "unknown";
  firstAgent: string | null;
  agent: string | null;
  model: { providerID: string; modelID: string } | null;
  lastTokenTotal: number;
  lastActivityAt: number | null;
  lastFinish: string | null;
  lastFinishAt: number | null;
  lastCompactAt: number | null;
  limitWarned: boolean;
  userMessageCount: number;
  lastUserToggle: "on" | "off" | null;
  lastText: string; // the newest assistant message's accumulated text (DEVIATION (a))
  lastTextMessageID: string | null;
};
const watches = new Map<string, Watch>();
const sending = new Set<string>();
const spawned = new Map<string, number>(); // #90 part A: sid -> LINEAGE DEPTH
const createdSessions = new Map<string, number>(); // the successor check
const pendingInject = new Map<string, number>(); // #80 injected-busy TTL

function getWatch(sid: string): Watch {
  let w = watches.get(sid);
  if (!w) {
    w = {
      armed: false, status: "", idlePending: false, recoveryCount: 0, deadMarked: false,
      deactivated: false, deactivatedUserCount: 0, scope: "unknown", firstAgent: null, agent: null,
      model: null, lastTokenTotal: 0, lastActivityAt: null, lastFinish: null, lastFinishAt: null,
      lastCompactAt: null, limitWarned: false, userMessageCount: 0, lastUserToggle: null,
      lastText: "", lastTextMessageID: null,
    };
    // #178: the STORE wins at watch creation (the restart path: a fresh process
    // rebuilds the scope from the durable store, NOT from the message history).
    // The existing `scope= <v> sid=` token shape rides the creation log.
    const stored = storeScopeOf(storeModeGet(sid));
    if (stored !== null) {
      w.scope = stored;
      log(`scope= ${stored} sid=${sid}`);
    }
    watches.set(sid, w);
  }
  return w;
}

function log(line: string): void {
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, `${new Date().toISOString()} ${line}\n`, "utf8");
  } catch {
    // swallow — a log failure is not a session failure
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// The machine stamp of the `-WARNING` line — local clock, `YYYY-MM-DD_HH-MM`
// (minute resolution), the SAME form the loop_log tool's lines use.
function localStamp(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

function tokenTotal(tokens: Record<string, unknown> | undefined): number {
  if (!tokens) return 0;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  if (typeof tokens.total === "number" && Number.isFinite(tokens.total)) return tokens.total;
  const cache = tokens.cache as Record<string, unknown> | undefined;
  return n(tokens.input) + n(tokens.output) + n(tokens.reasoning) + n(cache?.read) + n(cache?.write);
}

// #82: the own-line toggle scan of ONE user text — a marker counts ONLY as the
// whole line (trim-exact, case-insensitive); mid-sentence never toggles.
function toggleOf(text: string): "on" | "off" | null {
  let t: "on" | "off" | null = null;
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim().toLowerCase();
    if (TOGGLE_ON_MARKERS.includes(s)) t = "on";
    else if (s === TOGGLE_OFF_MARKER) t = "off";
  }
  return t;
}

// ------------------------------------------------------------------ #178: the durable mode store

// Fail-closed: an unreadable/corrupt file behaves like an EMPTY store; the
// helpers NEVER throw out of the plugin. The in-memory mirror keeps the modes
// sticky within the process and is the write source (rewrite the WHOLE map).
function storeModeLoad(): Map<string, SessionMode> {
  if (modeStoreCache !== null) return modeStoreCache;
  const m = new Map<string, SessionMode>();
  try {
    const data: unknown = JSON.parse(readFileSync(modeStorePath, "utf8"));
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        if (v === "autorun" || v === "direct") m.set(k, v);
      }
    }
  } catch {
    // unreadable/corrupt -> empty (fail-closed)
  }
  modeStoreCache = m;
  return m;
}

function storeModeGet(sid: string): SessionMode | null {
  return storeModeLoad().get(sid) ?? null;
}

// A seen toggle WRITES the store immediately (sticky, not last-message). The
// single writeFileSync is best-effort (ratified design: a temp+rename is NOT
// required); a failed write never escapes — the mirror keeps this process
// sticky and the next toggle change retries the file.
function storeModeSet(sid: string, mode: SessionMode): void {
  const m = storeModeLoad();
  if (m.get(sid) === mode) return; // already sticky -> no rewrite per request
  m.set(sid, mode);
  try {
    writeFileSync(modeStorePath, `${JSON.stringify(Object.fromEntries(m))}\n`, "utf8");
  } catch {
    // swallow — a store write failure is not a session failure
  }
}

// The store entry -> the watch-scope vocabulary (`direct` -> "none", the same
// value the OFF toggle yields); null = no entry -> the verdict chain decides.
function storeScopeOf(stored: SessionMode | null): "planner" | "autorun" | "none" | null {
  if (stored === "autorun") return "autorun";
  if (stored === "direct") return "none";
  return null;
}

// #98 part A of the action-line scan: the LAST line-anchored action match wins.
export function actionFromText(text: string): string | null {
  ACTION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  let found: string | null = null;
  while ((m = ACTION_RE.exec(text)) !== null) found = m[1];
  return found;
}

// The scope verdict scan (v1 #85 part 1 / #82, DEVIATION (a)): the own-line
// toggle wins over the agent test (`<|Direct|>` -> "none"); an ON toggle ->
// "autorun" (ANY agent type); NO toggle falls through to the agent-prefix test
// — v1 read the FIRST user message's `agent` field (the DB mirror), the v2
// carrier is the `context` hook's `agent` field of the SAME request.
export function scopeVerdict(toggle: "on" | "off" | null, agent: string | null): "planner" | "autorun" | "none" {
  if (toggle === "off") return "none";
  if (toggle === "on") return "autorun";
  if (typeof agent === "string" && agent.startsWith("planner")) return "planner";
  return "none";
}

function lineageMaxDepth(): number {
  try {
    const raw = readFileSync(join(projectDir, ".opencode", "temp", LINEAGE_FILE), "utf8").trim();
    const n = Number.parseInt(raw, 10);
    if (Number.isInteger(n)) return n;
  } catch {
    // missing/unreadable -> default
  }
  return LINEAGE_DEFAULT_MAX_DEPTH;
}

// #96: the INIT SIZE GUARD — keep the byte TAIL and append ONE `log-trim=`
// line. The log is never held open, so a synchronous init-trim is safe.
// Exported for the smoke pins (the tickMs-pattern test lever).
export function trimLogIfNeeded(path: string, maxBytes: number, tailBytes: number): void {
  let size: number;
  try {
    size = statSync(path).size;
  } catch {
    return; // no log yet / unreadable -> no-op
  }
  if (size <= maxBytes) return;
  const keep = Math.min(size, tailBytes);
  if (keep >= size) return; // degenerate caps -> nothing to cut
  try {
    const buf = Buffer.alloc(keep);
    const fd = openSync(path, "r");
    let n = 0;
    try {
      n = readSync(fd, buf, 0, keep, size - keep);
    } finally {
      closeSync(fd);
    }
    writeFileSync(path, buf.subarray(0, n));
    logLine(path, `log-trim= old=${size} new=${keep}`);
  } catch {
    // swallow — best-effort
  }
}

function logLine(path: string, line: string): void {
  try {
    appendFileSync(path, `${new Date().toISOString()} ${line}\n`, "utf8");
  } catch {
    // best effort
  }
}

// ------------------------------------------------------------------ (UNIT 1) the event leg

function sidOf(data: Record<string, unknown> | undefined): string {
  const s = data?.sessionID;
  return typeof s === "string" && s !== "" ? s : "unknown";
}

// The short `<key fields>` tail: the bits that exist, kept short (v1 rule).
function keyFields(type: string, data: Record<string, unknown>): string {
  const bits: string[] = [];
  if (type === "session.status") {
    const status = data.status as { type?: unknown } | undefined;
    const s = typeof status?.type === "string" ? status.type : typeof data.status === "string" ? data.status : null;
    if (s) bits.push(`status=${s}`);
  }
  if (type === "session.step.ended" || type === "session.step.failed") {
    if (typeof data.finish === "string") bits.push(`finish=${data.finish}`);
    const t = tokenTotal(data.tokens as Record<string, unknown>);
    if (t > 0) bits.push(`tokens=${t}`);
  }
  if (type === "session.created" && typeof (data.agent as unknown) === "string") bits.push(`agent=${data.agent}`);
  if (type === "session.text.ended" && typeof data.ordinal === "number") bits.push(`ordinal=${data.ordinal}`);
  return bits.join(" ");
}

// #159: the ONE busy state-change path. The `session.status busy` leg and
// `session.step.started` (the busy signal the v2 host ACTUALLY publishes —
// the fork declares `session.status` EPHEMERAL with no producer) ride this
// helper, so the `arm=`/pendingInject #80 semantics exist exactly once.
function applyBusy(sid: string): void {
  const w = getWatch(sid);
  w.armed = true;
  w.limitWarned = false; // #109: a fresh busy clears the per-episode latch
  w.status = "busy";
  w.idlePending = false;
  const sentAt = pendingInject.get(sid);
  if (sentAt !== undefined && Date.now() - sentAt <= PENDING_INJECT_TTL) {
    // #80: the busy consumed a still-pending CONTINUE injection — NOT a
    // fresh cycle, so the recovery cap keeps accumulating.
    pendingInject.delete(sid);
    log(`arm= sid=${sid} injected`);
  } else {
    w.recoveryCount = 0; // a fresh busy cycle resets the budget
    w.deadMarked = false; // #85 part 2: a fresh busy clears the dead-mark
    log(`arm= sid=${sid}`);
  }
}

// #159: the ONE idle state-change path — the `session.status idle` leg, the
// deprecated `session.idle`, and a TERMINAL `session.step.ended` finish ride
// it. A duplicate idle is safe: `routeScopedIdle` clears `idlePending` before
// it decides, and the `sending` latch guards an in-flight route.
function applyIdle(sid: string): void {
  const w = getWatch(sid);
  w.status = "idle";
  w.idlePending = true; // the tick decides
}

// The ARM-ONLY state machine (events never decide, never send — the tick is
// the only decision+send funnel; v1 order unchanged).
function armEvent(type: string, sid: string, data: Record<string, unknown>): void {
  if (type === "session.status") {
    const status = data.status as { type?: unknown } | undefined;
    const s = typeof status?.type === "string" ? status.type : typeof data.status === "string" ? data.status : null;
    if (s === "busy") applyBusy(sid);
    else if (s === "idle") applyIdle(sid);
    return; // any other vocabulary: no state change, no log line
  }
  if (type === "session.idle") {
    applyIdle(sid); // the deprecated v2 form, accepted defensively
    return;
  }
  // #159: the v2 host publishes NEITHER `session.status` NOR `session.idle` —
  // the step boundaries are its real busy/idle signals. Without this leg
  // nothing ever armed and the routing tick never ran.
  if (type === "session.step.started") {
    applyBusy(sid);
    return;
  }
  // Unit 4: a FAILED/INTERRUPTED execution is an idle trigger too (a dead
  // stream may never emit its idle) — v1's `session.error` leg.
  if (type === "session.execution.failed" || type === "session.execution.interrupted") {
    getWatch(sid).idlePending = true;
    return;
  }
  // Unit 4: track created sessions (sid -> epoch) for the successor check.
  if (type === "session.created") {
    const createdSid = sid !== "unknown" ? sid : "";
    if (createdSid) {
      createdSessions.set(createdSid, Date.now());
      const w = getWatch(createdSid);
      if (w.firstAgent == null && typeof data.agent === "string" && data.agent !== "") w.firstAgent = data.agent;
    }
    return;
  }
  // #109 clause (1) + the saturation input: the assistant STEP boundary.
  if (type === "session.step.ended") {
    const w = getWatch(sid);
    const finish = typeof data.finish === "string" ? data.finish : null;
    if (finish) {
      w.lastFinish = finish;
      w.lastFinishAt = Date.now();
    }
    const total = tokenTotal(data.tokens as Record<string, unknown>);
    if (total > 0) {
      w.lastTokenTotal = total; // OVERWRITTEN per update, never an accumulator
      w.lastActivityAt = Date.now();
    }
    w.limitWarned = false; // a NEW assistant update clears the fire latch
    // #159: a TERMINAL finish is the v2 host's idle signal. `tool-calls`
    // means the turn continues (no idle); a missing or `"unknown"` finish is
    // no signal at all.
    if (finish !== null && finish !== "" && finish !== "tool-calls" && finish !== "unknown") applyIdle(sid);
    return;
  }
  // DEVIATION (a): the LAST assistant text rides this event (no messages()
  // read in v2). Text parts accumulate per assistantMessageID; the newest
  // message wins (a NEW message resets the accumulation).
  if (type === "session.text.ended") {
    const w = getWatch(sid);
    const mid = typeof data.assistantMessageID === "string" ? data.assistantMessageID : null;
    const text = typeof data.text === "string" ? data.text : "";
    if (mid == null) {
      if (text !== "") w.lastText = text;
      return;
    }
    if (mid !== w.lastTextMessageID) {
      w.lastTextMessageID = mid;
      w.lastText = text;
    } else {
      w.lastText += text;
    }
    return;
  }
  if (type === "session.model.selected") {
    const w = getWatch(sid);
    const model = data.model as { id?: unknown; providerID?: unknown } | undefined;
    if (typeof model?.id === "string" && typeof model.providerID === "string") {
      w.model = { modelID: model.id, providerID: model.providerID };
    }
  }
}

function onEventEvent(ev: { type?: unknown; data?: unknown }): void {
  try {
    const type = typeof ev.type === "string" ? ev.type : "";
    if (type === "" || NEVER_LOGGED.includes(type)) return;
    const data = (ev.data != null && typeof ev.data === "object" ? ev.data : {}) as Record<string, unknown>;
    const sid = sidOf(data);
    const extra = keyFields(type, data);
    log(`event=${type} sid=${sid}${extra ? " " + extra : ""}`);
    armEvent(type, sid, data);
  } catch {
    // swallow — a handler failure must never reach the host
  }
}

// The SSE consumer (AsyncIterable from `ctx.event.subscribe()`) — the
// compact_memory.ts pattern: fire-and-forget, the loop NEVER awaited by setup.
function watchEvents(stream: AsyncIterable<unknown>, stopped: { v: boolean }): void {
  void (async () => {
    try {
      for await (const ev of stream) {
        if (stopped.v) break;
        onEventEvent(ev as { type?: unknown; data?: unknown });
      }
    } catch {
      // stream end/error — the plugin stays alive
    }
  })();
}

// ------------------------------------------------------------------ (UNIT 2 deviation) the context-hook leg

// DEVIATION (a) carrier: the draft's `messages` array + `agent` give the
// scope inputs at EVERY model request (the v1 fresh-messages fetch analogue).
// NEVER throws; nothing is decided or sent here.
async function onContextDraft(event: { sessionID?: unknown; agent?: unknown; messages?: unknown }): Promise<void> {
  try {
    const sid = str(event.sessionID);
    if (sid === "") return;
    const w = getWatch(sid);
    if (typeof event.agent === "string" && event.agent !== "") {
      w.agent = event.agent;
      if (w.firstAgent == null) w.firstAgent = event.agent;
    }
    if (Array.isArray(event.messages)) {
      let userCount = 0;
      let lastUserText = "";
      let toggle: "on" | "off" | null = null;
      for (const m of event.messages) {
        const msg = m as { role?: unknown; content?: unknown };
        if (msg.role === "user") {
          userCount += 1;
          const text = partsText(msg.content);
          lastUserText = text;
          const t = toggleOf(text);
          if (t) toggle = t; // last-toggle-wins over the whole history
        }
      }
      w.userMessageCount = userCount;
      w.lastUserToggle = toggleOf(lastUserText); // #90 part B: the LAST user message alone
      // #178: a toggle in ANY message is STICKY — write the durable store now
      // (on -> autorun, off -> direct). No log: the verdict-change line below
      // already carries the `scope= <v> sid=` token.
      if (toggle !== null) storeModeSet(sid, toggle === "on" ? "autorun" : "direct");
      // #178: the STORE entry wins over today's verdict chain (last-toggle ->
      // agent prefix); no entry -> the chain UNCHANGED (#85 behavior kept).
      const stored = storeScopeOf(storeModeGet(sid));
      const verdict = stored ?? scopeVerdict(toggle, w.firstAgent ?? (typeof event.agent === "string" ? event.agent : null));
      if (verdict !== w.scope) {
        w.scope = verdict;
        log(`scope= ${verdict} sid=${sid}`);
      }
    }
  } catch {
    // never throw out of a hook
  }
}

function partsText(content: unknown): string {
  const out: string[] = [];
  if (Array.isArray(content)) {
    for (const p of content) {
      const part = p as { type?: unknown; text?: unknown };
      if (part?.type === "text" && typeof part.text === "string") out.push(part.text);
    }
  }
  return out.join("\n");
}

// ------------------------------------------------------------------ (loop counter + folder)

function currentLoopFolder(): string | null {
  try {
    if (!projectDir) return null;
    const loopRoot = join(projectDir, "loop");
    const folders = readdirSync(loopRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith("autorun-"))
      .map((e) => e.name);
    if (folders.length === 0) return null;
    if (folders.length === 1) return folders[0];
    return folders
      .map((n) => ({ n, m: statSync(join(loopRoot, n)).mtimeMs }))
      .sort((a, b) => b.m - a.m)[0].n;
  } catch {
    return null; // no loop dir / unreadable
  }
}

// Loop iteration counter (Part 1, v1 rule verbatim): `loop/<folder>/counter
// .json` = `{looprun, n}` — the MACHINE source of truth, written AT SPAWN.
// n_final = max(counter candidate, loop_log.md `planner-<N>` max + 1).
// #171 (2026-10-26): the file gains the ROUND key — `round_final =
// max(existing round ?? 0, existing n ?? 0) + 1` (the maintenance clock:
// spawns + verified compactions). Migration: a legacy `{looprun, n: 36}`
// file seeds round 37 at the next spawn; absent / unparseable / wrong-
// looprun → base 0 → round 1. `n` semantics are UNCHANGED (#161 pins stay).
function spawnCounterFor(): { folder: string; n: number } | null {
  try {
    const folder = currentLoopFolder();
    if (!folder) return null;
    const counterPath = join(projectDir, "loop", folder, "counter.json");
    let candidate = 1;
    let roundBase = 0; // #171: max(existing round ?? 0, existing n ?? 0)
    try {
      const data: unknown = JSON.parse(readFileSync(counterPath, "utf8"));
      if (typeof data === "object" && data !== null && (data as Record<string, unknown>)["looprun"] === folder) {
        const n = (data as Record<string, unknown>)["n"];
        if (typeof n === "number" && Number.isFinite(n)) {
          candidate = n + 1;
          if (n > roundBase) roundBase = n;
        }
        const round = (data as Record<string, unknown>)["round"];
        if (typeof round === "number" && Number.isFinite(round) && round > roundBase) roundBase = round;
      }
    } catch {
      // absent / unparseable / wrong looprun -> candidate 1, round base 0
    }
    let logMax = 0;
    try {
      const logText = readFileSync(join(projectDir, "loop", folder, "loop_log.md"), "utf8");
      for (const m of logText.matchAll(/planner-(\d+)/g)) {
        const n = parseInt(m[1], 10);
        if (n > logMax) logMax = n;
      }
    } catch {
      // missing / unreadable loop_log.md -> 0
    }
    const nFinal = Math.max(candidate, logMax + 1);
    const roundFinal = roundBase + 1;
    try {
      writeFileSync(counterPath, JSON.stringify({ looprun: folder, n: nFinal, round: roundFinal }), "utf8");
    } catch {
      // best effort — a write failure must not break the spawn
    }
    return { folder, n: nFinal };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ (UNIT 3) the successor spawn

// create + ONE QUEUED prompt (delivery:"queue" — never synchronous), the
// ident title `<folder> planner-<n>`, the trigger consumed EVEN ON FAILURE.
// DEVIATION (b): the create input carries agent+model (SessionCreateInput.id
// ); there is no `parentID` link (v1 spawned unlinked too — the file-trigger
// path never set one). NEVER throws outward: every failure is a `spawn-fail=`
// line + a NULL return.
async function spawnPlanner(startPrompt: string, ident: { agent?: string; model?: { providerID: string; modelID: string } } | null, precomputed?: { folder: string; n: number } | null): Promise<string | null> {
  const api = sessionApi;
  if (!api || typeof api.create !== "function") {
    log("spawn-fail= create missing");
    return null;
  }
  const counter = precomputed ?? spawnCounterFor();
  const identName = counter ? `${counter.folder} planner-${counter.n}` : null;
  let newSid = "";
  try {
    const input: { title?: string; agent?: string; model?: { id: string; providerID: string } } = {};
    if (identName) input.title = identName;
    if (ident?.agent) input.agent = ident.agent;
    if (ident?.model) input.model = { id: ident.model.modelID, providerID: ident.model.providerID };
    const res = await api.create(input);
    // The promise surface unwraps `data` (SessionCreateOutput = SessionInfo);
    // a `{data}` wrapper is accepted defensively (live-shape drift).
    const wrapped = (res as { data?: unknown } | null)?.data;
    const id = (res as { id?: unknown } | null)?.id ?? (wrapped as { id?: unknown } | null)?.id;
    newSid = typeof id === "string" ? id : "";
  } catch (e) {
    log(`spawn-fail= create: ${(e as { message?: string } | null)?.message ?? "unknown"}`);
    return null;
  }
  if (newSid === "") {
    log("spawn-fail= create no id");
    return null;
  }
  if (typeof api.prompt !== "function") {
    log("spawn-fail= prompt missing");
    return null;
  }
  try {
    await (api.prompt as (i: unknown) => Promise<unknown>)({ sessionID: newSid, text: startPrompt, delivery: "queue" });
  } catch (e) {
    log(`spawn-fail= prompt: ${(e as { message?: string } | null)?.message ?? "unknown"}`);
    return null;
  }
  const bits: string[] = [];
  if (ident?.agent) bits.push(`agent=${ident.agent}`);
  if (ident?.model) bits.push(`model=${ident.model.providerID}/${ident.model.modelID}`);
  if (identName) bits.push(`ident=${identName}`);
  log(`spawn= sid=${newSid}${bits.length ? " " + bits.join(" ") : ""}`);
  return newSid;
}

function renameTrigger(triggerPath: string): void {
  try {
    renameSync(triggerPath, `${triggerPath}.consumed`);
  } catch (e) {
    log(`rename-fail= ${(e as { message?: string } | null)?.message ?? "unknown"}`);
  }
}

let spawnInFlight = false;
let limitStopIdleMs = LIMIT_STOP_IDLE_MS; // clause (3) threshold — a ctx.options test lever (live default 60_000)

async function checkSpawnTrigger(): Promise<void> {
  if (logPath === "") return;
  const triggerPath = join(dirname(logPath), SPAWN_TRIGGER_FILE);
  let content: string;
  try {
    content = readFileSync(triggerPath, "utf8");
  } catch {
    return; // absent -> nothing (ENOENT is the expected case)
  }
  if (content.trim() === "") {
    log("spawn-fail= empty trigger");
    renameTrigger(triggerPath);
    return;
  }
  if (spawnInFlight) return; // one spawn attempt at a time
  spawnInFlight = true;
  try {
    await spawnPlanner(content.trim(), null); // a file-trigger spawn: NO identity (host default)
  } catch {
    log("spawn-fail= spawn unknown"); // defensive — spawnPlanner never throws
  } finally {
    spawnInFlight = false;
  }
  renameTrigger(triggerPath); // consumed EVEN ON FAILURE
}

// ------------------------------------------------------------------ (UNIT 4) texts + budget

// #167: the OBSERVED cause of the idle-without-action-line cycle. The SAME
// ordering predicate as the #109 clause-(4) skip in `limitStopCheck`: the LAST
// observed event for this sid is a ctx.log COMPACT line (the #98 re-arm tail
// stamps `lastCompactAt`; a step-end stamps `lastFinishAt`).
function compactCause(w: Watch): boolean {
  return w.lastCompactAt != null && (w.lastFinishAt == null || w.lastCompactAt >= w.lastFinishAt);
}

// #167: TWO text branches — the compaction-flavored pointer ONLY when a
// compaction is the observed cause; a plain idle never claims one and never
// mandates the post-compaction readme.
function continueText(sid: string): string {
  const w = watches.get(sid);
  if (w && compactCause(w)) {
    return (
      `[auto-resume unit 4 — planner liveness watchdog, session ${sid}] Your last turn ended after a compaction ` +
      "(cause= compact). Follow agent/readme/readme_post_compaction.md — " +
      "re-read the named head files, rebuild from the committed state (git log + NAP + TODO), and continue the current " +
      "unit or close it with an action: line."
    );
  }
  return (
    `[auto-resume unit 4 — planner liveness watchdog, session ${sid}] Your last turn ended without a recognized action: line ` +
    "(cause= idle — a plain stop or protocol gap). Rebuild from the committed state (git log + NAP + TODO), and continue " +
    "the current unit or close it with an action: line."
  );
}

// #170: the INTENTIONAL `action: continue` close (the close ladder's
// idle+context-healthy leg). The session's own context is still intact — this
// wake is a plain continuation: NO compaction claim, NO `readme_post_compaction`
// rebuild ritual. Kept SEPARATE from `continueText` so the recovery branch's
// cause-flavored texts stay byte-identical (#167 pins).
function intentionalContinueText(sid: string): string {
  return (
    `[auto-resume unit 4 — planner liveness watchdog, session ${sid}] Your last turn closed with an intentional ` +
    "action: continue line. This wake keeps your session alive: pick up the current work where you left off, " +
    "and close it with an action: line."
  );
}

// Item 11: the forced-new-session budget check (the SAME compact_budget.json
// the v1 leg read; READ-ONLY per restart-branch call). count > cap ->
// exhausted. The cap mirrors compact_memory's resolveCap: the CPU invariant
// (cap 0), the model_budget map's EXACT bare-model-id key, else its `default`,
// else 1. Fail-open on a missing/unreadable/malformed file or no entry.
function budgetExhausted(sid: string): boolean {
  try {
    const data: unknown = JSON.parse(readFileSync(join(dirname(logPath), COMPACT_BUDGET_FILE), "utf8"));
    if (typeof data !== "object" || data === null) return false;
    const rec = data as Record<string, unknown>;
    const sessions = rec["sessions"];
    if (sessions == null || typeof sessions !== "object" || Array.isArray(sessions)) return false;
    const entry = (sessions as Record<string, unknown>)[sid];
    if (entry == null || typeof entry !== "object") return false;
    const e = entry as Record<string, unknown>;
    const count = e["count"];
    if (typeof count !== "number" || !Number.isFinite(count)) return false;
    const model = typeof e["model"] === "string" ? (e["model"] as string) : "";
    const mb = rec["model_budget"];
    let cap: number;
    if (/^cpu/i.test(model)) cap = 0;
    else if (mb != null && typeof mb === "object" && !Array.isArray(mb)) {
      const m = mb as Record<string, unknown>;
      if (model !== "" && typeof m[model] === "number" && Number.isFinite(m[model])) cap = m[model] as number;
      else if (typeof m["default"] === "number" && Number.isFinite(m["default"])) cap = m["default"] as number;
      else cap = 1;
    } else cap = 1;
    return count > cap;
  } catch {
    return false; // fail OPEN (no directive)
  }
}

// The RESTART start prompt (v1 text byte-carried): LINE 1 is the EXACT OWN-LINE
// toggle so a plugin-spawned successor derives scope "autorun" from its first
// user message ALONE (RESTART-SAFE, no in-memory state).
function restartText(sid: string, exhausted: boolean, n?: number | null): string {
  const iter =
    n != null
      ? `Your iteration number is ${n} (the authoritative loop counter — the loop-log grep stays the fallback verification only). `
      : "Your iteration number = the largest `planner-N` in the current loop folder's `loop_log.md` " +
        "plus one (verify from the log; the counter-mismatch rule applies). ";
  const base =
    `${AUTONOM_MARKER}\n` +
    `Run autonomously. (auto-resume unit 4 restart branch: the previous planner closed with ` +
    "`action: restart`.) " +
    iter +
    "Rebuild reality from committed state (git log, NAP, TODO.md) and continue per your planner prompt's autonomous mode.";
  if (!exhausted) return base;
  return (
    base +
    ` compaction budget exhausted — scan the dump of ${sid} to gain all relevant knowledge ` +
    "(the auto-dump corpus; " +
    "`dump_session.cjs` in agent/scripts/db/ for on-demand dumps); " +
    "make a clean handover/commit if not present; then continue per the NAP."
  );
}

// Unit 4: the successor check — a DIFFERENT sid created since the closing
// session's lastActivityAt (the most recent creation wins).
function findSuccessor(closingSid: string, since: number | null): string | null {
  if (since == null) return null;
  let best: string | null = null;
  let bestEpoch = -1;
  for (const [sid, epoch] of createdSessions) {
    if (sid === closingSid) continue;
    if (epoch >= since && epoch > bestEpoch) {
      best = sid;
      bestEpoch = epoch;
    }
  }
  return best;
}

// #98 part B: the RE-ARM tail read — the NEW ctx.log content since the last
// tick; for each NEW `COMPACT <sid>` line whose sid is WATCHED: arm + reset
// the recovery budget. A partial trailing line is held back (the cursor
// advances only past complete lines). NEVER throws.
function tailCompactRearm(): void {
  const p = ctxLogPath;
  let size: number;
  try {
    size = statSync(p).size;
  } catch {
    return; // no ctx.log yet / unreadable
  }
  if (size < tailCursor) tailCursor = 0; // shrank (trim/rotation)
  if (size === tailCursor) return;
  const buf = Buffer.alloc(size - tailCursor);
  let n = 0;
  try {
    const fd = openSync(p, "r");
    try {
      n = readSync(fd, buf, 0, size - tailCursor, tailCursor);
    } finally {
      closeSync(fd);
    }
  } catch {
    return; // unreadable -> the cursor stays
  }
  const chunk = buf.subarray(0, n).toString("utf8");
  let complete: string;
  if (chunk.length > 0 && chunk.charCodeAt(chunk.length - 1) === 10) {
    tailCursor += n;
    complete = chunk;
  } else {
    const nl = chunk.lastIndexOf("\n");
    tailCursor += nl + 1;
    complete = nl >= 0 ? chunk.slice(0, nl) : "";
  }
  for (const line of complete.split("\n")) {
    const m = line.match(COMPACT_SID_RE);
    if (!m) continue;
    const w = watches.get(m[1]);
    if (!w) continue; // only watched sids
    w.lastCompactAt = Date.now(); // #109 clause (4): this COMPACT line's event time
    w.idlePending = true;
    w.recoveryCount = 0; // a FRESH recovery budget (the context changed)
    log(`rearm= compact sid=${m[1]}`);
  }
}

// ------------------------------------------------------------------ (#109) the silent limit-stop detector

// The 5-clause signature (v1 conjunction, ALL on ONE tick, per watched sid):
//   (1) lastFinish === "length"; (2) lastTokenTotal >= 0.99 * window (the
//       gauge-core window — DEVIATION (f); unresolvable -> NO fire); (3) idle
//       AND now - lastActivityAt >= 60s; (4) no NEW ctx.log COMPACT line
//       since the death step; (5) in scope (the first agent starts with
//       planner/worker/explorer OR the verdict is not "none").
// FIRE: once per episode (the `limitWarned` latch — cleared on a fresh busy
// OR a NEW assistant update). NO action on the session (that half is a
// maintainer call).
async function limitStopCheck(): Promise<void> {
  try {
    const now = Date.now();
    for (const [sid, w] of watches) {
      try {
        if (w.lastFinish !== "length") continue; // (1)
        if (!w.model) continue; // (2) — no model -> no window -> fail-open
        const window = resolveWindow(`${w.model.providerID}/${w.model.modelID}`); // DEVIATION (f) carrier
        if (typeof window !== "number" || !Number.isFinite(window) || window <= 0) continue; // (2) unresolvable -> NO fire
        if (!(w.lastTokenTotal >= LIMIT_STOP_WINDOW_RATIO * window)) continue; // (2)
        if (w.status !== "idle") continue; // (3)
        if (w.lastActivityAt == null || now - w.lastActivityAt < limitStopIdleMs) continue; // (3)
        if (w.lastCompactAt != null && (w.lastFinishAt == null || w.lastCompactAt >= w.lastFinishAt)) continue; // (4)
        const first = w.firstAgent;
        const inScope =
          (typeof first === "string" && (first.startsWith("planner") || first.startsWith("worker") || first.startsWith("explorer"))) ||
          w.scope !== "none";
        if (!inScope) continue; // (5)
        if (w.limitWarned) continue; // the per-episode latch
        w.limitWarned = true;
        fireLimitStop(sid, w, window);
      } catch {
        // one session's failure must not block the others
      }
    }
  } catch {
    // never throw (the tick's never-throw contract)
  }
}

function fireLimitStop(sid: string, w: Watch, window: number): void {
  log(`limit-stop= sid=${sid} total=${w.lastTokenTotal}`);
  const model = w.model ? w.model.modelID : "unknown";
  const line =
    `${localStamp()} -WARNING auto_resume ${sid} ${model} ` +
    `silent limit-stop: finish=length total=${w.lastTokenTotal} window=${window} no-COMPACT`;
  const folder = currentLoopFolder();
  if (!folder) return; // no resolvable looprun -> the log line only
  try {
    const dir = join(projectDir, "loop", folder);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, "loop_log.md"), `${line}\n`, "utf8");
  } catch {
    // a loop-log write failure is not a session failure (the log line stays)
  }
}

// ------------------------------------------------------------------ (UNIT 4) the routing leg

// ONE decision per idle cycle. NO messages() fetch (DEVIATION (a)): the scope
// verdict, identity and the action line ride the watch state (armed by the
// context hook + `session.text.ended`). NEVER throws out; one `err=` line
// per failed cycle.
async function routeScopedIdle(sid: string, w: Watch): Promise<void> {
  if (sending.has(sid)) return; // in-flight latch — retry next tick
  w.idlePending = false; // the decision for this idle cycle is made
  if (w.deactivated) {
    // #90 part B: the flag clears ONLY on a NEW user message carrying an
    // OWN-LINE ON toggle (count > the deactivation baseline).
    if (w.userMessageCount > w.deactivatedUserCount && w.lastUserToggle === "on") {
      w.deactivated = false; // explicit re-engage — fall through
    } else {
      log(`skip= deactivated sid=${sid}`);
      return;
    }
  }
  if (w.scope === "none" || w.scope === "unknown") {
    return; // non-scoped / unproven: NEVER acted on (fail-safe)
  }
  if (w.deadMarked) {
    log(`skip= dead sid=${sid}`); // #85 part 2: a failed CONTINUE marked the cycle
    return;
  }
  const action = actionFromText(w.lastText);
  if (action === "stop") {
    log(`route= stop sid=${sid}`);
    return;
  }
  if (action === "ask_maintainer") {
    log(`route= ask sid=${sid}`);
    return;
  }
  // #170: the INTENTIONAL continue — wake the SAME session with the short
  // continuation text. NO `recovery=` log, NO budget consumption, NO `attempt=`.
  // The mechanics are the recovery branch's: the `sending` latch, the QUEUED
  // delivery, `pendingInject` (#80), and `send-fail=` + dead-mark on error.
  if (action === "continue") {
    log(`route= continue sid=${sid}`);
    sending.add(sid);
    try {
      const api = sessionApi;
      if (!api || typeof api.prompt !== "function") {
        log(`send-fail= sid=${sid} prompt missing`);
        w.deadMarked = true;
        return;
      }
      await (api.prompt as (i: unknown) => Promise<unknown>)({ sessionID: sid, text: intentionalContinueText(sid), delivery: "queue" });
      pendingInject.set(sid, Date.now()); // #80 cap semantics: the injection's busy is not a fresh cycle
    } catch (e) {
      log(`send-fail= sid=${sid} ${(e as { message?: string } | null)?.message ?? "unknown"}`);
      w.deadMarked = true;
    } finally {
      sending.delete(sid);
    }
    return;
  }
  // #170 ruling: `action: resume` is a NO-OP until a task_id vehicle exists —
  // it must not self-wake the planner's own session (the docs' divergence).
  if (action === "resume") {
    log(`note= resume-unimplemented sid=${sid}`);
    return;
  }
  if (action === null && w.recoveryCount < MAX_RECOVERY_ATTEMPTS) {
    w.recoveryCount += 1;
    // #167: `cause=` names which event the watchdog OBSERVED last — the same
    // predicate `continueText` branches on.
    log(`recovery= sid=${sid} attempt=${w.recoveryCount} cause= ${compactCause(w) ? "compact" : "idle"}`);
    sending.add(sid);
    try {
      const api = sessionApi;
      if (!api || typeof api.prompt !== "function") {
        log(`send-fail= sid=${sid} prompt missing`);
        w.deadMarked = true;
        return;
      }
      // QUEUED delivery (the v2 analogue of promptAsync — the race-free
      // channel). DEVIATION (b): no agent/model in the prompt body — the
      // resumed turn keeps the session's own agent.
      await (api.prompt as (i: unknown) => Promise<unknown>)({ sessionID: sid, text: continueText(sid), delivery: "queue" });
      pendingInject.set(sid, Date.now()); // #80 cap semantics: the injection's busy is not a fresh cycle
    } catch (e) {
      log(`send-fail= sid=${sid} ${(e as { message?: string } | null)?.message ?? "unknown"}`);
      w.deadMarked = true;
    } finally {
      sending.delete(sid);
    }
    return;
  }
  // restart, or the recovery budget exhausted with still no line -> successor
  // check -> LINEAGE cap -> RESTART spawn.
  const successor = findSuccessor(sid, w.lastActivityAt);
  if (successor) {
    log(`skip= successor sid=${successor}`);
    return;
  }
  const depth = spawned.get(sid) ?? 0;
  const cap = lineageMaxDepth();
  if (cap >= 0 && depth >= cap) {
    log(`skip= depth sid=${sid} depth=${depth}`);
    return;
  }
  const exhausted = budgetExhausted(sid);
  if (exhausted) log(`budget= exhausted sid=${sid}`);
  log(`route= restart spawn sid=${sid}`);
  const counter = spawnCounterFor(); // computed ONCE (the title N == the text N)
  const ident = w.agent || w.model ? { agent: w.agent ?? undefined, model: w.model ?? undefined } : null;
  const restart = restartText(sid, exhausted, counter?.n ?? null);
  const newSid = await spawnPlanner(restart, ident, counter);
  if (newSid) {
    spawned.set(newSid, depth + 1); // #90 part A
    w.deactivated = true; // #90 part B: STICKY — never re-routed from
    w.deactivatedUserCount = w.userMessageCount;
    log(`deactivate= sid=${sid}`);
  }
}

// ------------------------------------------------------------------ the tick (the ONLY decision+send funnel)

async function tick(): Promise<void> {
  try {
    await checkSpawnTrigger();
  } catch {
    // swallow — the timer callback must never reject
  }
  try {
    tailCompactRearm();
  } catch {
    // swallow
  }
  try {
    await limitStopCheck();
  } catch {
    // swallow
  }
  try {
    for (const [sid, w] of watches) {
      try {
        if (!w.idlePending) continue;
        await routeScopedIdle(sid, w);
      } catch {
        // one session's failure must not block the others
      }
    }
  } catch {
    // swallow
  }
}

// The smoke's deterministic tick lever (the tickMs pattern): ONE tick, called
// directly instead of waiting on the interval. The live host NEVER calls it.
export async function runTick(): Promise<void> {
  await tick();
}

// ------------------------------------------------------------------ init legs

// #80: the running plugin source's 8-char sha256 prefix — the `surface=`
// line pins WHICH source the logging process ran.
function codeVersion(): string {
  try {
    return createHash("sha256").update(readFileSync(fileURLToPath(import.meta.url))).digest("hex").slice(0, 8);
  } catch {
    return "unknown";
  }
}

// The one-shot init surface probe (typeof ONLY — Object.keys misses
// prototype methods). DEVIATION (e): v2 `App` has no `log`; the candidates
// are the v2 Pick's methods.
function probeSurface(ctx: { session?: Record<string, unknown>; app?: Record<string, unknown>; event?: Record<string, unknown> }): void {
  try {
    const parts = SURFACE_CANDIDATES.map((m) => `${m}=${typeof ctx?.session?.[m]}`);
    parts.push(`event.subscribe=${typeof ctx?.event?.subscribe}`, `app.name=${typeof ctx?.app?.name}`);
    log(`surface= v=${codeVersion()} ${parts.join(" ")}`);
  } catch {
    // a probe failure must not break plugin load
  }
}

// #90 part C: the RESTORE (ONCE per process) of the depth map + deactivation
// flags from the plugin's own log: a `route= restart spawn sid=X` line PAIRED
// with a following `spawn= sid=Y` line (no `spawn-fail=` in between) ->
// deactivated(X) + depth(Y) = depth(X)+1; an UNPAIRED `spawn=` -> depth 0.
let lineageRestored = false;
function restoreLineageFromLog(): void {
  if (lineageRestored) return;
  lineageRestored = true;
  let text: string;
  try {
    text = readFileSync(logPath, "utf8");
  } catch {
    return; // no log yet / unreadable
  }
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.includes("spawn= sid=")) {
      const m = line.match(/spawn= sid=(\S+)/);
      if (m && !spawned.has(m[1])) spawned.set(m[1], 0);
      continue;
    }
    const rt = line.match(/route= restart spawn sid=(\S+)/);
    if (!rt) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      const lj = lines[j];
      if (lj.includes("spawn-fail=")) break;
      const sj = lj.match(/spawn= sid=(\S+)/);
      if (sj) {
        getWatch(rt[1]).deactivated = true;
        spawned.set(sj[1], (spawned.get(rt[1]) ?? 0) + 1);
        break;
      }
    }
  }
}

// ------------------------------------------------------------------ the plugin module

const plugin: Plugin.Plugin = {
  id: "auto_resume",
  async setup(ctx) {
    const options = (ctx.options ?? {}) as Record<string, unknown>;
    root = ctx.location.directory;
    projectDir = root;
    logPath = join(root, ".opencode", "temp", "auto_resume.log");
    ctxLogPath = join(root, ".opencode", "temp", "ctx.log");
    // #178: the durable mode store lives in the temp estate (same dir as the
    // logs); the (re)load re-reads the file — the opencode-restart path.
    modeStorePath = join(root, ".opencode", "temp", SESSION_MODE_FILE);
    modeStoreCache = null;
    sessionApi = ctx.session;
    const maxBytesOpt = options.maxLogBytes;
    const maxLogBytes = typeof maxBytesOpt === "number" && Number.isFinite(maxBytesOpt) && maxBytesOpt > 0 ? maxBytesOpt : MAX_LOG_BYTES_DEFAULT;
    const tailOpt = options.logTailBytes;
    const logTailBytes = typeof tailOpt === "number" && Number.isFinite(tailOpt) && tailOpt > 0 ? tailOpt : LOG_TAIL_BYTES_DEFAULT;
    trimLogIfNeeded(logPath, maxLogBytes, logTailBytes); // #96 BEFORE the restore
    restoreLineageFromLog(); // #90 part C
    probeSurface(ctx as unknown as { session?: Record<string, unknown>; app?: Record<string, unknown>; event?: Record<string, unknown> });
    const stopped = { v: false };
    const regContext = await ctx.session.hook("context", (event) => onContextDraft(event));
    const stream = ctx.event != null && typeof ctx.event.subscribe === "function" ? ctx.event.subscribe() : undefined;
    if (stream != null) watchEvents(stream, stopped);
    const idleOpt = options.limitStopIdleMs;
    if (typeof idleOpt === "number" && Number.isFinite(idleOpt) && idleOpt >= 0) limitStopIdleMs = idleOpt;
    const tickOpt = options.tickMs;
    const tickMs = typeof tickOpt === "number" && Number.isFinite(tickOpt) && tickOpt > 0 ? tickOpt : TICK_MS_DEFAULT;
    if (!tickTimer) {
      tickTimer = setInterval(() => {
        void tick();
      }, tickMs);
      if (typeof (tickTimer as { unref?: unknown }).unref === "function") (tickTimer as { unref: () => void }).unref();
    }
    return () => {
      stopped.v = true;
      if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }
      void regContext.dispose();
    };
  },
};

export default plugin;
