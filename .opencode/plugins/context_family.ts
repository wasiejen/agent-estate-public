// context_family.ts — the v2-native context-family core (TODO #137 unit 3a,
// 2026-10-22, clone `migration`). Port of the ctx readout + ctx-line injection
// of the v1 `.opencode/plugin/ctx_watchdog.ts` (v2.4 / v2.4.1 / v2.5 / Part 2
// vocabulary — the v1 file is the design of record; this header records only
// what CHANGES at the v2 landing). The nudge ladder + the handover pre-flight
// rode spec 3b (same file, next launch after 3a) — landed below under sections
// (6) and (7); the 3a regions (1)-(5) stay intact and byte-stable around them.
//
// WHAT IT IS: a v2 plugin (`Plugin.define` shape — DEFAULT export only, the
// loader contract; the `@opencode/plugin` import is TYPE-ONLY, erased at
// runtime — the clone has no node_modules; the gauge core import is a VALUE
// import of plain `.mjs` whose own imports are node: builtins only, the
// intercept plugin's pattern). It registers ONE hook: `ctx.session.hook("context",
// …)` — the v2 `SessionContext` draft hook, fired per PRIMARY model request
// before `LLM.request` (fork `packages/core/src/session/model-request.ts:422-431`
// — `prepare("primary", …, agentHook("context", …))`; the `compaction` /
// `generate` / `title` kinds register separately and never fire this handler).
// The draft's `messages` is MUTABLE (`SessionRequest` —
// `packages/plugin/src/promise/session.ts:25-31`); this is the official v2
// destination for v1's chat.message injection (research
// `agent/research/2026-10-15_opencode-v2-impact.md` §3: the injection lands on
// the request DRAFT — transient, NEVER persisted; filter-at-assembly ≠ persisted
// history).
//
// (1) READOUT — the SHARED gauge core (the clone copy is ALREADY v2-paired:
// unit 1 `922f74c` table-aware session-row leg, unit 2 `2c1fa23` paired token-
// mass leg). `readGauge(undefined, sessionID)` with the request's OWN session
// id (the v1 v2.6 per-session read discipline; the read NEVER throws — a hard
// failure is `kind:"db-error"`); the injected text is `formatGauge(g)` + the
// Part 2 `loopIterationSuffix()` — BYTE-IDENTICAL to v1's injected chat.message
// ctx line (`ctx: <peek line>[ ITER=<n> <folder>]`); the peek CLI / ctx_gauge
// tool readouts are UNCHANGED by the suffix rule (formatGauge untouched there).
//
// (2) CACHE DISCIPLINE (the v2.3 REJECTED-approach ruling, kept verbatim in
// spirit): the injection is APPEND-ONLY AT THE TAIL of `event.messages`.
// EVERY entry BEFORE the injection point is left BYTE-UNCHANGED — no existing
// entry is mutated, no `system` item, no `options`, nothing earlier in the
// prompt is touched (the cacheable prefix stays byte-stable; mutating anything
// in front of the newest entry invalidates the prompt cache EVERY turn —
// the recorded v2.3 root cause). The injected entry is a NEW plain object:
// `{ role: "user", content: [{ type: "text", text: "ctx: <readout>" }] }` —
// the bounded shape question answered at spec time (tsgo + one fork grep):
// the injectable entry type is `@opencode/ai`'s `LLM.Message`
// (`packages/ai/src/schema/messages.ts:237-244` — a Schema.Class over Struct
// fields; instance type = the plain structural fields, so a plain object
// literal passes tsgo). `id` is OMITTED (optional; no id is required at this
// hook — unlike the v1 v2.4.1 prt/msg id wall, the draft entry is not a
// persisted part and `LLM.Message.id` carries no prefix contract). Role
// `"user"`: the universally translatable role (v1 appended the ctx text part
// onto the just-received USER message; research §2 `to-llm-message.ts:269` has
// a user case; a mid-conversation `system` entry's provider translation is
// unverified — fail toward the safe role). Fail-closed: if the append shape
// cannot be built, NOTHING is appended (the house rule never-throw covers a
// defensive failure; it logs no new reason — the shape is static).
//
// (3) OWN-SESSION GATE (the v1 v2.5 / #32 cross-session-feed semantics,
// kept): the gauge result carries the `sid` it read. A MISMATCH
// (`g.sid !== the request's sessionID`) → SILENT SKIP: no post, NO log line
// (a normal multi-session state, not a failure). On EQUALITY ANY honest
// own-session readout form POSTS — known window, unknown window, and
// `CTX=notAvailable` (no-total) are information, not error. A missing/empty
// request sessionID short-circuits the same silent path (session gating).
//
// (4) EVIDENCE LOG — this plugin's own log file: `.opencode/temp/ctx_family.log`
// (the v1 role of `.opencode/plugin.log` for these lines MOVES HERE — the v1
// event/tool observer channel has no v2 role here and is retired-in-v2 for
// this family). Lines are capped JSON (the v1 ladder: LINE_CAP 2000, CAPS
// [500,150,60], the `…` cut char — helpers replicated from v1 byte-shape).
// Vocabulary (v1 words, kept):
//   - kind "ctxmsg" — ONE line per FIRED-and-POSTED request:
//     { ts, kind, session, agent, sess (the read session id — the v2.5 `sess`
//     field: a post and its source sit side by side), line (the injected text) }
//     The v1 `message`/`midSource` fields are GONE (the v2 draft carries no
//     messageID — the v1 v2.4.1 `invalid-messageID` reason has no v2 branch
//     and stays unemitted; recorded here, NOT invented).
//   - kind "gauge" — the failure channel, v1 vocabulary: reason `db-error`
//     (session + `preview` = the capped-120 error text, omitted when empty —
//     the read failed even after busy_timeout + one retry) and `messages-not-
//     array` (session; the v1 `parts-not-array` analogue on the draft array).
//   DEVIATION vs v1 (spec DoD 5 — "db-error → no injection + ONE evidence
//   line"): v1 logged its chatmsg line BEFORE the db-error check (two lines);
//   here the per-fire line is suppressed whenever a gauge-failure line is
//   emitted — exactly ONE line per failed fire, zero on the silent paths.
//   The ok+posted path logs exactly ONE "ctxmsg" line (v1 discipline: no
//   extra volume). SILENT (no line): the mismatch skip, the missing-session
//   skip. Best-effort, NEVER throws out of the hook (the v1 house rule).
//
// (5) BUDGET SUFFIX — comes FREE via formatGauge (item 3: ` | N compactions
// left`, fail-open when the store is missing/unparseable or the read session
// is unknown). The suffix resolves against the CLONE's `.opencode/temp/
// compact_budget.json` (gauge.mjs resolves relative to itself — the clone is
// the v2-paired host of that store).
//
// (6) NUDGE LADDER (spec 3b — the v1 v2.6 rung table + texts VERBATIM; design
// of record = v1 header lines 98-122) — registered on `ctx.tool.hook("execute.after",
// …)`, agent-independent, fired on EVERY tool call (completed OR error — v1
// behavior: every tool.after). ONE gauge read per event for the event's OWN
// sessionID (the v1 v2.6 per-session ruling stays — a newest-session read would
// blind-spot concurrent sessions). Rungs: 1 `pct>=50` | 2 `pct>=70 or REM<=30k` |
// 3 `pct>=80 or REM<=20k` | 4 `pct>=90 or REM<=10k` | 5 `REM<5k`; condition = pct
// OR REM whichever hits first; the HIGHEST rung met fires; at most ONE nudge
// PER RUNG PER SESSION (in-memory `nudgeFired` map keyed by session id — v1
// shape). Unknown window / no-total / db-error reads NEVER fire — SILENT, and
// NO gauge line rides this channel (the §(4) gauge failure vocabulary belongs
// to the context hook; v1: "no NEW gauge-failure reasons"). Evidence: kind
// "nudge" lines ONLY when a nudge fires — {session, rung, readout} capped JSON
// (v1 volume discipline; no line for a non-fire). DELIVERY replaces v1's
// promptAsync with the v2 synthetic channel: `ctx.session.synthetic({sessionID,
// text, delivery: "queue"})` — the session-domain Pick carries `synthetic`
// (promise/session.ts:139-163), `SessionSyntheticInput` = {sessionID, id?, text,
// description?, metadata?, delivery?: "steer"|"queue", resume?} (generated
// client types :4592; POST path /api/session/:id/synthetic) — "queue" queues
// the nudge as the next turn at idle (the v1 synthetic-part semantics). FIRE-
// AND-FORGET: never awaited in the hook; sync throws + rejections caught and
// evidence-logged (kind "nudge", reason delivery-threw/delivery-rejected,
// capped-120 preview — the v1 delivery-* vocabulary); a rejection NEVER fails
// the tool call. The v2.8 busy-check/setImmediate race block is NOT ported:
// delivery:"queue" is the native v2 idle-queueing mechanic (no steer race at
// this channel). v2.7 P02 lesson (v1 lines 128-140): the `tool.execute.after`
// SUMMARY MIRROR was REMOVED in v1 (7 collisions) — NOT (re-)ported here; the
// committed worker summary file stays canonical, this plugin NEVER writes it.
//
// (7) HANDOVER PRE-FLIGHT (spec 3b — the v1 v2.7 survivor) — registered on
// `ctx.tool.hook("execute.before", …)`. The v2 delegation tool is `subagent`
// (v1 `task` — port map §4 rename; input object carries `prompt: string` —
// fork tool/plugin/subagent.ts:35). Gate: tool === "subagent" AND `input` is an
// object whose `prompt` string contains `agent/handover/handover_task.md` → if
// that spec file (resolved against the plugin's own repo root = ctx
// location.directory — the `.opencode/plugins/` parent) is MISSING (ENOENT) or
// EMPTY (trim), ONE warn line kind "handover-preflight" {reason, session, call
// = the v2 event's `id` (Tool.CallID) — the v1 `callID` role}. OBSERVATION ONLY
// — NEVER throws, NEVER mutates `event.input` (execute.before is the only hook
// that MAY reject a call — fork core/src/plugin/hooks.ts:23 — the pre-flight
// never does; other fs read errors swallow silently like v1).
//
// STILL PENDING (unchanged by 3b): LIVE v2-host activation of all channels is
// PENDING maintainer restart (registration/config = maintainer domain).

import type { Message } from "@opencode/ai";
import type { Plugin } from "@opencode/plugin";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

// The shared session-DB reader + the readout formatters (the gauge core,
// v2-paired since units 1+2). A VALUE import — plain JS whose own imports are
// node: builtins only (no node_modules surface; the host's plugin load resolves
// it from the repo tree) — the intercept plugin's pattern.
import { formatGauge, loopIterationSuffix, readGauge } from "../plugin/scripts/gauge.mjs";

// ------------------------------------------------------------------ constants (v1 ladder, byte-shape)

const LINE_CAP = 2000;
const CAPS = [500, 150, 60];
const DOT = "\u2026";

// ------------------------------------------------------------------ hook state

let dir = "";

function logPath(): string {
  return join(dir, ".opencode", "temp", "ctx_family.log");
}

function cap(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + DOT;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

function toStr(v: unknown, n: number): string | undefined {
  if (v == null) return undefined;
  try {
    const s = JSON.stringify(v, (_k, x) => (typeof x === "string" ? cap(x, n) : x));
    return s == null ? undefined : cap(s, n);
  } catch {
    return undefined;
  }
}

function buildLine(kind: string, scalar: Record<string, string | undefined>, big: Record<string, unknown>): string {
  for (const n of CAPS) {
    const rec: Record<string, string> = { ts: new Date().toISOString(), kind };
    for (const [k, v] of Object.entries(scalar)) if (v) rec[k] = cap(v, n);
    for (const [k, v] of Object.entries(big)) {
      const s = toStr(v, n);
      if (s != null) rec[k] = s;
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
    // best effort — never break the hook over a write failure
  }
}

// ------------------------------------------------------------------ the handler

// The `context` hook handler (the per-fire sequence; NEVER throws). The
// messages array is typed against the REAL injectable element type — the
// spec's bounded shape question, answered by tsgo + ONE grep in the fork's
// `packages/ai/src/**`: `@opencode/ai`'s `LLM.Message`
// (`packages/ai/src/schema/messages.ts:237-244`) is a `Schema.Class` over
// Struct fields — instance type = the plain structural fields: `role`
// required (`system|user|assistant|tool`), `content: Array<ContentPart>`
// required, `id` optional. The appended literal is therefore type-checked
// (a wrong shape turns DoD 7 RED — fail-closed, never a cast-away). The
// `@opencode/ai` import is TYPE-ONLY (erased at runtime — the clone has no
// node_modules; the same rule the intercept plugin records for
// `@opencode/plugin`). The remaining wire fields are read defensively
// (`unknown`-typed) — the guards never rely on the hook's static types.
async function onContext(event: {
  sessionID?: unknown;
  agent?: unknown;
  messages?: Array<Message>;
}): Promise<void> {
  try {
    const sid = str(event.sessionID);
    if (!sid) return; // session gating: no request id -> silent skip (no read)
    // (1) the own-session read (the v1 v2.6 per-session discipline; the read
    // NEVER throws — the db-error kind IS the fallback).
    const g = await readGauge(undefined, sid);
    // The gauge core is plain JS — the result union does not narrow
    // through `kind`, so the result fields are read wire-defensively through
    // one object view (the v1 field semantics unchanged: `kind`, `sid`,
    // `error` — the db-error `error` text names the failing backend).
    const gr = g as { kind?: unknown; sid?: unknown; error?: unknown };
    if (gr.kind === "db-error") {
      // (4b) v1 vocabulary: ONE evidence line (capped preview — the read
      // failed even after busy_timeout + one retry), no post. The per-fire
      // "ctxmsg" line is SUPPRESSED on this branch (the spec DoD 5
      // deviation from v1's two-line order — recorded in the header).
      const errRaw = typeof gr.error === "string" ? gr.error.trim() : "";
      appendLog(
        buildLine(
          "gauge",
          { reason: "db-error", session: sid, preview: errRaw === "" ? undefined : cap(errRaw, 120) },
          {},
        ),
      );
      return;
    }
    // (3) the v2.5 match-only gate (the #32 cross-session feed): a mismatch
    // is a NORMAL multi-session state — no post, no log (silence where silent).
    if (gr.sid !== sid) return;
    // The draft's `messages` must be an array to append into (wire-defensive
    // guard: the host declares the array typed; a non-array on the wire
    // gets the v1-analogue failure line).
    if (!Array.isArray(event.messages)) {
      appendLog(buildLine("gauge", { reason: "messages-not-array", session: sid }, {}));
      return;
    }
    // (2) the APPEND-ONLY tail injection: the readout text is computed ONCE
    // and shared byte-for-byte with the evidence line (the Part 2 ITER suffix
    // resolves at injection time; the logged line carries the INJECTED text).
    const text = `ctx: ${formatGauge(g)}${loopIterationSuffix()}`;
    // The injectable entry: a NEW tail object — role "user" (the universally
    // translatable role; v1 appended the ctx part onto the just-received USER
    // message; a mid-conversation `system` entry's provider translation is
    // unverified — fail toward the safe role) + ONE text part; `id` OMITTED
    // (optional; the draft entry is not a persisted part — the v1 v2.4.1
    // prt/msg id wall has no counterpart at this hook). Every entry BEFORE
    // the tail is left BYTE-UNCHANGED (the v2.3 cache ruling: anything
    // before the newest entry must not move — the cacheable prefix stays
    // byte-stable).
    event.messages.push({ role: "user", content: [{ type: "text", text }] });
    // (4) the per-fire evidence line (posted fires only).
    appendLog(
      buildLine(
        "ctxmsg",
        {
          session: sid,
          agent: str(event.agent),
          sess: g.sid,
          line: text,
        },
        {},
      ),
    );
  } catch {
    // the v1 house rule: never throw out of a hook — a defensive failure is
    // swallowed (the injection shape is static; no new failure reason).
  }
}

// ------------------------------------------------------------------ 3b: the nudge ladder (v1 v2.6, verbatim semantics)

// The spec file a HANDOVER delegation references (v1 constant, kept verbatim).
const HANDOVER_SPEC_PATH = "agent/handover/handover_task.md";

// Per-session rung state: sessionID -> the rungs already fired for it (dedup:
// at most ONE nudge per rung per session; the map lives for the plugin process
// lifetime — bounded by the number of sessions, negligible — the v1 shape).
const nudgeFired = new Map<string, Set<number>>();

// The nudge-rung ladder (the v1 #33 T2 rungs, documented behavior — NOT config):
// rung 5 = REM < 5k; rungs 4/3/2 = the pct rung OR the REM rung; rung 1 = pct.
const RUNG_5_REM = 5_000;
const RUNG_4_PCT = 90;
const RUNG_4_REM = 10_000;
const RUNG_3_PCT = 80;
const RUNG_3_REM = 20_000;
const RUNG_2_PCT = 70;
const RUNG_2_REM = 30_000;
const RUNG_1_PCT = 50;

// The HIGHEST rung met by a readout (0 = none). pct/REM exist only for a KNOWN
// window (kind "ok") — unknown window / no-total / db-error NEVER fire (the
// stop line is defined in pct/REM; an honest no-signal read is not a signal).
// The gauge core is plain JS — wire-defensive field view, no static reliance.
function computeRung(g: { ok?: unknown; kind?: unknown; ctx?: unknown; window?: unknown }): number {
  if (g.kind !== "ok" || g.ok !== true) return 0;
  const w = typeof g.window === "number" && Number.isFinite(g.window) ? g.window : 0;
  if (w <= 0) return 0;
  const ctx = typeof g.ctx === "number" && Number.isFinite(g.ctx) ? g.ctx : 0;
  const pct = Math.floor((ctx * 100) / w); // the exact formatGauge pct formula
  const rem = w - ctx;
  if (rem < RUNG_5_REM) return 5;
  if (pct >= RUNG_4_PCT || rem <= RUNG_4_REM) return 4;
  if (pct >= RUNG_3_PCT || rem <= RUNG_3_REM) return 3;
  if (pct >= RUNG_2_PCT || rem <= RUNG_2_REM) return 2;
  if (pct >= RUNG_1_PCT) return 1;
  return 0;
}

// One line per rung — the VERBATIM gauge readout (formatGauge) + the rung's
// instruction; the five texts are the v1 texts VERBATIM (rung 3 = the wind-
// down, rung 4 = commit + summary NOW, rung 5 = the VERBATIM readout + the
// stop-line phrasing — the ladder semantics are v1's, only the channel differs).
function nudgeText(rung: number, readout: string): string {
  switch (rung) {
    case 1:
      return `${readout} — context watch: past 50% of the context window; gauge-check between steps and keep new work small.`;
    case 2:
      return `${readout} — context high: wrap the current step, start the commit routine, begin the handover summary.`;
    case 3:
      return `${readout} — wind-down, just before the stop line: run the commit routine now, write the handover summary + TODO.md, prep the NAP.`;
    case 4:
      return `${readout} — CRITICAL: commit + write the handover summary NOW; do not start new work.`;
    case 5:
      return `${readout} — stop line reached: further work needs planner approval (working past the line is a rule violation); write the handover summary and stop.`;
    default:
      return readout;
  }
}

// The session domain captured at setup — the synthetic-delivery carrier (the
// real v2 domain, typed through the plugin Context; the same object whose
// `hook` registered the §(1) context handler).
let sessionApi: Plugin.Context["session"] | undefined;

// The v2 synthetic delivery (the §(6) channel): `delivery: "queue"` queues the
// nudge as the NEXT turn at idle. FIRE-AND-FORGET: never awaited by the caller
// hook; a sync throw or a rejection is evidence-logged (kind "nudge", reason
// delivery-threw / delivery-rejected, capped-120 preview — the v1 delivery-*
// vocabulary) and NEVER fails the tool call; a missing `synthetic` fn (a probe
// mock without it) is a NO-OP (v1 discipline).
function deliverNudge(sid: string, rung: number, text: string): void {
  try {
    const api = sessionApi;
    const fn = api?.synthetic;
    if (typeof fn !== "function") return;
    const p = fn.call(api, { sessionID: sid, text, delivery: "queue" });
    if (p && typeof (p as Promise<unknown>).catch === "function") {
      (p as Promise<unknown>).catch((e) => {
        appendLog(
          buildLine(
            "nudge",
            {
              session: sid,
              rung: String(rung),
              reason: "delivery-rejected",
              preview: cap(String((e as { message?: unknown } | undefined)?.message ?? e), 120),
            },
            {},
          ),
        );
      });
    }
  } catch (e) {
    appendLog(
      buildLine(
        "nudge",
        {
          session: sid,
          rung: String(rung),
          reason: "delivery-threw",
          preview: cap(String((e as { message?: unknown } | undefined)?.message ?? e), 120),
        },
        {},
      ),
    );
  }
}

// The ladder, run on EVERY tool.execute.after (agent-independent — the v1 firing
// point; the `status` completed|error branch is NOT gated — an acting session
// accrues context either way). NEVER throws; SILENT on EVERY non-fire: a
// missing session id, an unknown-window/no-total/db-error read (rung 0 —
// no gauge line rides this channel), below the first rung, an already-fired
// rung (no log line — the v1 log-growth discipline). The read targets the
// event's OWN sessionID (the per-session blind-spot-free mechanic; the after
// event carries sessionID — fork promise/tool.ts:47-63).
async function onToolAfter(event: { sessionID?: unknown }): Promise<void> {
  try {
    const sid = str(event.sessionID);
    if (!sid) return;
    const g = await readGauge(undefined, sid);
    const rung = computeRung(g);
    if (rung < 1) return;
    let fired = nudgeFired.get(sid);
    if (fired?.has(rung)) return;
    if (!fired) {
      fired = new Set<number>();
      nudgeFired.set(sid, fired);
    }
    fired.add(rung);
    const readout = formatGauge(g);
    appendLog(buildLine("nudge", { session: sid, rung: String(rung), readout }, {}));
    deliverNudge(sid, rung, nudgeText(rung, readout));
  } catch {
    // never throw out of the hook
  }
}

// ------------------------------------------------------------------ 3b: the handover pre-flight

// A delegation counts as HANDOVER only when a `subagent` call (the v2 name of
// v1's `task` — port map §4) carries an INPUT OBJECT whose `prompt` string
// references the spec file (the v1 gate, tool name renamed; anything else —
// explore, reviewer, ad-hoc — is invisible: SILENT).
function isHandoverTask(tool: unknown, input: unknown): boolean {
  if (str(tool) !== "subagent") return false;
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const prompt = (input as Record<string, unknown>).prompt;
  return typeof prompt === "string" && prompt.includes(HANDOVER_SPEC_PATH);
}

// The spec file rides the plugin's own repo root (ctx.location.directory —
// the `.opencode/plugins/` parent, the repo the delegation targets).
function specPath(): string {
  return join(dir, HANDOVER_SPEC_PATH);
}

function preflightWarn(event: { sessionID?: unknown; id?: unknown }): void {
  appendLog(
    buildLine(
      "handover-preflight",
      {
        reason: "handover-task-file-missing-or-empty",
        session: str(event.sessionID),
        call: str(event.id),
      },
      {},
    ),
  );
}

// The pre-flight warn (missing OR EMPTY spec file). OBSERVATION ONLY — the
// whole body is guarded: NEVER throws (a before-hook throw would be able to
// REJECT the delegation — fork core/src/plugin/hooks.ts:23 — the pre-flight
// never does), NEVER mutates `event.input`; the warn rides this plugin's own
// log (§(4)). Other fs errors swallow like v1 (observation only).
async function onToolBefore(event: { tool?: unknown; sessionID?: unknown; id?: unknown; input?: unknown }): Promise<void> {
  try {
    if (!isHandoverTask(event.tool, event.input)) return;
    const content = readFileSync(specPath(), "utf8");
    if (content.trim() !== "") return;
    preflightWarn(event);
  } catch (e) {
    if ((e as { code?: unknown } | undefined)?.code === "ENOENT") preflightWarn(event);
    // other fs errors: swallow — observation only
  }
}

// ------------------------------------------------------------------ the plugin module

// The v2 plugin module (the loader decodes the DEFAULT export only — no
// named exports; the loader contract recorded in the intercept plugin's
// header). The hook callback params are INFERRED (the fork's `SessionContext`
// + `ToolHooks` shapes) — hence the handler generics bind to the REAL wire
// shapes; each handler keeps its own wire-defensive guards regardless.
const plugin: Plugin.Plugin = {
  id: "context_family",
  async setup(ctx) {
    dir = ctx.location.directory;
    sessionApi = ctx.session; // the synthetic-delivery carrier (the §(6) channel)
    const regContext = await ctx.session.hook("context", (event) => onContext(event));
    const regBefore = await ctx.tool.hook("execute.before", (event) => onToolBefore(event));
    const regAfter = await ctx.tool.hook("execute.after", (event) => onToolAfter(event));
    return () => {
      void regContext.dispose();
      void regBefore.dispose();
      void regAfter.dispose();
    };
  },
};

export default plugin;
