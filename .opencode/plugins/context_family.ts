// context_family.ts — the v2-native context-family core (TODO #137 unit 3a,
// 2026-10-22, clone `migration`). Port of the ctx readout + ctx-line injection
// of the v1 `.opencode/plugin/ctx_watchdog.ts` (v2.4 / v2.4.1 / v2.5 / Part 2
// vocabulary — the v1 file is the design of record; this header records only
// what CHANGES at the v2 landing). The nudge ladder + the handover pre-flight
// ride spec 3b (same file, NEXT launch) — deliberately absent here.
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
// NOT YET (this unit): the nudge ladder + watchdog handover pre-flight (spec
// 3b, same file, next launch). LIVE v2-host activation of the ctx line is
// PENDING maintainer restart (registration/config = maintainer domain).

import type { Message } from "@opencode/ai";
import type { Plugin } from "@opencode/plugin";
import { appendFileSync, mkdirSync } from "node:fs";
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

// ------------------------------------------------------------------ the plugin module

// The v2 plugin module (the loader decodes the DEFAULT export only — no
// named exports; the loader contract recorded in the intercept plugin's
// header). The hook callback param is INFERRED (the fork's `SessionContext`)
// — hence the handler's generic E binds to the REAL messages element type.
const plugin: Plugin.Plugin = {
  id: "context_family",
  async setup(ctx) {
    dir = ctx.location.directory;
    const reg = await ctx.session.hook("context", (event) => onContext(event));
    return () => reg.dispose();
  },
};

export default plugin;
