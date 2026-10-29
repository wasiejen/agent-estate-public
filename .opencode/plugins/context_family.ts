// context_family.ts — the v2-native context-family core (TODO units 3a +
// 3b, 2026-10-22, clone `migration`; TODO + #154 append leg, 2026-10-26).
// Port of the ctx readout + ctx-line injection and the nudge ladder of the v1
// `.opencode/plugin/ctx_watchdog.ts` (v2.4 / v2.4.1 / v2.5 / v2.6 / Part 2
// vocabulary — the v1 file is the design of record; this header records only
// what CHANGES at the v2 landing). The 3a regions (1)-(5) and the 3b ladder (6)
// + pre-flight (7) keep their v1 semantics; the append leg RE-HOMES their
// delivery onto `tool.execute.after` (spec 2026-10-26_153-154-gauge-append-leg).
//
// WHAT IT IS: a v2 plugin (`Plugin.define` shape — DEFAULT export only, the
// loader contract; the `@opencode/plugin` import is TYPE-ONLY, erased at runtime
// — the clone has no node_modules; the gauge core import is a VALUE import of
// plain `.mjs` whose own imports are node: builtins only, the intercept plugin's
// pattern). It registers TWO hooks: `ctx.tool.hook("execute.before", …)` (the
// handover pre-flight, section 7) and `ctx.tool.hook("execute.after", …)` (the
// ONE context channel — gauge line + rung ladder, sections 1-6). The
// `ctx.session.hook("context")` draft hook is NOT registered anymore (#153): its
// entries were never persisted, so every injected line invalidated the prompt
// checkpoint (#151) while its `ctxmsg` evidence line printed a post that never
// happened. `session.synthetic({delivery: "queue"})` is gone too (#154): it
// landed as the next turn at idle and woke deliberately-idle sessions with a
// stale readout. One channel, persisted, cache-safe, never wakes an idle session.
//
// (1) READOUT — the SHARED gauge core (the clone copy is ALREADY v2-paired:
// unit 1 `922f74c` table-aware session-row leg, unit 2 `2c1fa23` paired token-
// mass leg, #152 `3aa4743` provider-qualified window). `readGauge(undefined,
// sid)` with the EVENT's OWN session id (the v1 v2.6 per-session read discipline;
// the read NEVER throws — a hard failure is `kind:"db-error"`); the appended text
// is `"ctx: " + formatGauge(g)` WITHOUT the `SESSION=<sid> ` token (DoD 2's form:
// the line sits inside the session's own tool result, so naming the session is
// waste) and WITHOUT the `ITER=<n> <folder>` suffix (the maintainer ruling —
// `loop_log` auto-locates its folder from `status`/`content` alone, so repeating
// it ~100 times is waste; the session-start carrier is TODO). The peek CLI /
// ctx_gauge tool readouts are UNCHANGED (`formatGauge` untouched).
//
// (2) CACHE DISCIPLINE (the v2.3 REJECTED-approach ruling, now satisfied by
// construction): the text is appended to the TAIL of the tool RESULT, which the
// host persists into the tool part — so history grows append-only, every earlier
// entry stays byte-identical, and the prompt checkpoint written at that tool
// return keeps matching. The old `session.hook("context")` leg was the opposite:
// its draft entry was never persisted, so prompt N+1 diverged at the injection
// point and the checkpoint was discarded (#151/#153). The append targets the
// field the host actually persists (see the `appendLine` note: content beats
// output in `normalizeContent`); fail-closed — when nothing is appendable,
// NOTHING is written and a rung is not marked fired.
//
// (3) OWN-SESSION GATE (the v1 v2.5 / #32 cross-session-feed semantics, kept):
// the gauge result carries the `sid` it read. A MISMATCH (`g.sid` !== the
// event's sessionID) → SILENT SKIP: no append, NO log line (a normal
// multi-session state, not a failure). A missing/empty event sessionID
// short-circuits the same silent path before the read. On EQUALITY the gate math
// and the rung ladder run against THAT session's numbers only.
//
// (4) EVIDENCE LOG — this plugin's own log file: `.opencode/temp/ctx_family.log`
// (the v1 role of `.opencode/plugin.log` for these lines MOVES HERE). Lines are
// capped JSON (the v1 ladder: LINE_CAP 2000, CAPS [500,150,60], the `…` cut
// char — helpers replicated from v1 byte-shape). Vocabulary AFTER the append leg
// (#153/#154, 2026-10-26):
//   - kind `ctx-append` — ONE line per ACTUAL append: { ts, kind, session,
//     line (the appended text), and the discriminator `gauge` ("line" — the plain
//     gauge line) or `rung` ("1".."5" — a firing rung) }. The line is written
//     AFTER the result mutation succeeded, so the log says what was really
//     persisted (the #153 complaint: the retired `ctxmsg` kind printed a posted
//     line for a push that was commented out).
//   - kind `gauge` — the failure channel, v1 vocabulary kept: reason `db-error`
//     (session + `preview` = the capped-120 error text, omitted when empty). The
//     draft-only `messages-not-array` reason is GONE with the draft leg.
//   - kind `handover-preflight` — the section (7) warn.
//   RETIRED kinds: `ctxmsg` (the draft fire) and `nudge` (the fire line + the
//   `delivery-threw`/`delivery-rejected` reasons — no delivery channel left to
//   fail). SILENT (no line): the sid-mismatch skip, the missing-session skip, an
//   unknown-window read, a below-gate fill, an already-fired rung. Best-effort,
//   NEVER throws out of the hook (the v1 house rule).
//
// (5) BUDGET SUFFIX — RETIRED (#212, U26, 2026-10-29): formatGauge appends
// no ` | N compactions left` field; the injected ctx line ends at REM=<m>.
// The budget store (.opencode/temp/compact_budget.json) stays alive, read
// only for the #213 trip constant (gauge.mjs resolves relative to itself —
// the clone is the v2-paired host of that store).
//
// (6) NUDGE LADDER (spec 3b — the v1 v2.6 rung table + texts VERBATIM; design
// of record = v1 header lines 98-122) — fired on EVERY `tool.execute.after`,
// agent-independent, on the SAME channel as the gauge line. ONE gauge read per
// event for the event's OWN sessionID (the v1 v2.6 per-session ruling stays).
// Rungs: 1 `pct>=50` | 2 `pct>=70 or REM<=30k` | 3 `pct>=80 or REM<=20k` |
// 4 `pct>=90 or REM<=10k` | 5 `REM<5k`; condition = pct OR REM whichever hits
// first; the HIGHEST rung met fires. Unknown window / no-total / db-error reads
// NEVER fire — SILENT (the stop line is defined in pct/REM). A firing rung's
// text is APPENDED to the tool result — the #154 ruling: the old
// `session.synthetic({delivery: "queue"})` leg was PERSISTED but landed as the
// NEXT TURN at idle (fork `session/inbox.ts:98-139` reads `user|synthetic`
// rows), so it woke a deliberately-idle session and carried a readout many turns
// stale. Appending inside the call that caused the growth is current by
// construction and NEVER wakes an idle session: a session with no tool call
// receives nothing. NO `synthetic` call remains in this file. DEDUP: at most one
// append per rung per session, read from the durable store (section 8) — an
// in-memory map reset on every plugin reconciliation and re-fired rungs. The
// v2.8 busy-check/setImmediate race block is NOT ported (no queue channel left).
// v2.7 P02 lesson (v1 lines 128-140): the `tool.execute.after` SUMMARY MIRROR was
// REMOVED in v1 (7 collisions) — NOT (re-)ported here; the committed worker
// summary file stays canonical, this plugin NEVER writes it.
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
// (8) THE DURABLE STORE — `.opencode/temp/ctx_family_store.json` (the
// `context_trim_v2.ts:228 readStore()` precedent): per session the fired rungs
// (reload-surviving dedup, #154) + the CTX of the last appended line (the >=1%
// economy gate, #153). Read per use; read/write NEVER throw (fail-open).
//
// (9) THE ctx_gauge SKIP — a `ctx_gauge` call already answers with the readout,
// so the whole append leg (both the gauge line and the rung ladder) skips it.
//
// STILL PENDING: LIVE v2-host activation of all channels is PENDING maintainer
// restart (registration/config = maintainer domain).

import type { Plugin } from "@opencode/plugin";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// The shared session-DB reader + the readout formatters (the gauge core,
// v2-paired since units 1+2). A VALUE import — plain JS whose own imports are
// node: builtins only (no node_modules surface; the host's plugin load resolves
// it from the repo tree) — the intercept plugin's pattern.
import { formatGauge, readGauge } from "./scripts/gauge.mjs";

// ------------------------------------------------------------------ constants (v1 ladder, byte-shape)

const LINE_CAP = 2000;
const CAPS = [500, 150, 60];
const DOT = "\u2026";

// Section 9: the gauge tool's own call is skipped on the append leg — it already
// answers with the readout in-band, so a second line there is pure duplication
// (and would consume a rung's dedup slot).
const GAUGE_TOOL = "ctx_gauge";

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

// ------------------------------------------------------------------ the durable per-session store

// Section 8: `.opencode/temp/ctx_family_store.json` under the plugin's own repo
// root — the `context_trim_v2.ts:228 readStore()` precedent (a JSON file, read
// per use, NEVER throws). Per session it carries the FIRED RUNGS (the #154
// reload-surviving dedup) and the CTX of this session's LAST APPENDED line
// (the #153 >= 1%-of-window economy gate). A read failure yields an EMPTY view
// and a write failure returns false — both fail-open: the append still happens,
// the plugin simply cannot see this session's history.
type SessionEntry = { ctx?: number; fired: number[] };

function storePath(): string {
  return join(dir, ".opencode", "temp", "ctx_family_store.json");
}

function readStore(): Record<string, SessionEntry> {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(storePath(), "utf8"));
  } catch {
    return {}; // missing / unreadable / malformed -> no history (fail-open)
  }
  if (data == null || typeof data !== "object" || Array.isArray(data)) return {};
  const sessions = (data as Record<string, unknown>)["sessions"];
  if (sessions == null || typeof sessions !== "object" || Array.isArray(sessions)) return {};
  const out: Record<string, SessionEntry> = {};
  for (const [sid, entry] of Object.entries(sessions)) {
    if (entry == null || typeof entry !== "object" || Array.isArray(entry)) continue;
    const rec = entry as Record<string, unknown>;
    const fired = Array.isArray(rec["fired"])
      ? rec["fired"].filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5)
      : [];
    const ctx = rec["ctx"];
    out[sid] = { ctx: typeof ctx === "number" && Number.isFinite(ctx) ? ctx : undefined, fired };
  }
  return out;
}

// Additive read-modify-write (the #119 invariant, the context_trim_v2 twin):
// every other top-level key and every OTHER session's entry survives — only
// this session's entry is replaced. NEVER throws; false on a write failure.
function writeSessionEntry(sid: string, entry: SessionEntry): boolean {
  try {
    let raw: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(readFileSync(storePath(), "utf8"));
      if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) raw = parsed as Record<string, unknown>;
    } catch {
      // malformed / missing -> start from an empty object (this file is ours)
    }
    let sessions = raw["sessions"];
    if (sessions == null || typeof sessions !== "object" || Array.isArray(sessions)) sessions = {};
    (sessions as Record<string, unknown>)[sid] = { ctx: entry.ctx, fired: entry.fired, at: new Date().toISOString() };
    raw["sessions"] = sessions;
    mkdirSync(dirname(storePath()), { recursive: true });
    writeFileSync(storePath(), JSON.stringify(raw), "utf8");
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ the result append (the ONE channel)
//
// Section 2: the append lands in the tool RESULT — the persisted, cache-safe
// channel (fork `packages/core/src/tool.ts:132-152`: the hook mutates
// `afterEvent.result` and the host returns THAT object, so the appended text
// becomes part of the PERSISTED tool part and history grows append-only —
// nothing earlier moves, so the v2.3 cache rule holds by construction).
//
// DEVIATION from the spec's field order, measured in the fork: the host derives
// the model-visible text through `normalizeContent(content, output)`
// (`packages/core/src/tool/runtime.ts:261-265`) — content WINS (a string becomes
// one text item, a non-empty array is kept as-is) and `output` is read ONLY when
// content is absent or empty. Appending to `output` while a content array exists
// would persist nothing. The order below therefore targets the field the host
// actually persists: 1) a string `content`, 2) the LAST text item of a non-empty
// content array (a NEW tail item when it carries none), 3) a string `output`,
// 4) a fresh `output`. Returns false when there is nothing to append into
// (fail-closed: no append, and a rung is NOT marked fired).
type MutableResult = { output?: unknown; content?: unknown };
function appendLine(result: unknown, line: string): boolean {
  if (result == null || typeof result !== "object") return false;
  const r = result as MutableResult;
  const content = r.content;
  if (typeof content === "string") {
    r.content = content + "\n" + line;
    return true;
  }
  if (Array.isArray(content) && content.length > 0) {
    for (let i = content.length - 1; i >= 0; i--) {
      const item = content[i] as { type?: unknown; text?: unknown } | undefined;
      if (item != null && item.type === "text" && typeof item.text === "string") {
        item.text = item.text + "\n" + line;
        return true;
      }
    }
    content.push({ type: "text", text: line }); // no text item -> a NEW tail item
    return true;
  }
  if (typeof r.output === "string") {
    r.output = r.output + "\n" + line;
    return true;
  }
  r.output = line;
  return true;
}
// ------------------------------------------------------------------ 3b: the nudge ladder (v1 v2.6, verbatim semantics)

// The spec file a HANDOVER delegation references (v1 constant, kept verbatim).
const HANDOVER_SPEC_PATH = "agent/handover/handover_task.md";

// Per-session rung state lives in the DURABLE store (section 8), not in a
// process-lifetime map: a plugin reconciliation rebuilds the module, so the old
// in-memory `nudgeFired` map reset and re-fired an already-fired rung (#154).

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

// The append leg, run on EVERY tool.execute.after (agent-independent — the v1
// firing point). ONE gauge read per event for the event's OWN sessionID (the v1
// v2.6 per-session ruling stays — a newest-session read would blind-spot
// concurrent sessions). At most ONE line is appended per call: a firing rung's
// text already carries the readout, so the plain gauge line is suppressed on
// that call (~25 tokens per append, not per leg). NEVER throws; SILENT on every
// non-append: the ctx_gauge skip (section 9), a missing session id, an ERROR-
// status call (that branch carries `error`, no result — fork
// packages/core/src/tool.ts:122-127), an sid mismatch (section 3), an unknown-
// window / no-total read (rung 0, no gate math — the stop line is defined in
// pct/REM), a fill that moved below 1% of the window since this session's last
// append (section 8), and an already-fired rung (section 6).
async function onToolAfter(event: { sessionID?: unknown; tool?: unknown; status?: unknown; result?: unknown }): Promise<void> {
  try {
    if (str(event.tool) === GAUGE_TOOL) return; // section 9: ctx_gauge answers in-band
    const sid = str(event.sessionID);
    if (!sid) return; // session gating: no event id -> silent skip (no read)
    if (event.status !== "completed") return; // an error call has no result to append into
    const g = await readGauge(undefined, sid);
    // Wire-defensive field view of the plain-JS gauge result union (the v1 field
    // semantics unchanged: kind, sid, ctx, window, error).
    const gr = g as { ok?: unknown; kind?: unknown; sid?: unknown; ctx?: unknown; window?: unknown; error?: unknown };
    if (gr.kind === "db-error") {
      // ONE gauge-failure evidence line (the v1 section 4 vocabulary, reason
      // unchanged — the read failed even after busy_timeout + one retry); no
      // append: an honest failure is not a signal.
      const errRaw = typeof gr.error === "string" ? gr.error.trim() : "";
      appendLog(buildLine("gauge", { reason: "db-error", session: sid, preview: errRaw === "" ? undefined : cap(errRaw, 120) }, {}));
      return;
    }
    if (gr.sid !== sid) return; // the v2.5 match-only gate (#32): silent, normal
    // An OK read only: the no-total shape carries a resolved `window` but NO
    // `ctx` (gauge.mjs:995), so a no-signal read must never append and never
    // feed the gate math — the same discipline computeRung applies.
    if (gr.kind !== "ok" || gr.ok !== true) return;
    const w = typeof gr.window === "number" && Number.isFinite(gr.window) ? gr.window : 0;
    const ctx = typeof gr.ctx === "number" && Number.isFinite(gr.ctx) ? gr.ctx : 0;
    if (w <= 0) return; // no resolved window -> nothing to state and nothing to gate
    const entry = readStore()[sid] ?? { fired: [] };
    const rung = computeRung(g);
    if (rung >= 1 && !entry.fired.includes(rung)) {
      const text = nudgeText(rung, formatGauge(g));
      if (!appendLine(event.result, text)) return; // nothing appendable -> NOT marked fired
      writeSessionEntry(sid, { ctx, fired: [...entry.fired, rung] });
      appendLog(buildLine("ctx-append", { session: sid, rung: String(rung), line: text }, {}));
      return;
    }
    // (8) the economy gate: append only once the fill has moved >= 1% of the
    // window since this session's last append; a session's FIRST append is
    // unconditional (no stored ctx yet).
    if (entry.ctx !== undefined && Math.abs(ctx - entry.ctx) < w / 100) return;
    const text = "ctx: " + formatGauge(g).replace(/^SESSION=\S+\s/, "");
    if (!appendLine(event.result, text)) return;
    writeSessionEntry(sid, { ctx, fired: entry.fired });
    appendLog(buildLine("ctx-append", { session: sid, gauge: "line", line: text }, {}));
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
// header). The hook callback params are INFERRED from the fork's `ToolHooks`
// shapes — hence the handler generics bind to the REAL wire shapes; each handler
// keeps its own wire-defensive guards regardless.
const plugin: Plugin.Plugin = {
  id: "context_family",
  async setup(ctx) {
    dir = ctx.location.directory;
    const regBefore = await ctx.tool.hook("execute.before", (event) => onToolBefore(event));
    const regAfter = await ctx.tool.hook("execute.after", (event) => onToolAfter(event));
    return () => {
      void regBefore.dispose();
      void regAfter.dispose();
    };
  },
};

export default plugin;
