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
// `.opencode/plugin/scripts/compaction_core_v2.mjs` (the v1 core ported:
// same `.opencode/temp/compact_budget.json`, same keys, same cap-resolver
// semantics — CPU models cap 0, the SAFETY INVARIANT — same budget-store
// v2 schema, INCREMENT-ON-SUCCESS only, the #119 additive-rewrite invariant,
// the pure gate with the emergency-1 and the caller-scoped CROSS cap+1
// override, TODO #128 ruling 2026-09-30). The v1 core module stays UNIMPORTED
// by v2 code (inert-dir contract).
//
// (2) TOOL REGISTRATION — `ctx.tool.transform((editor) => editor.add(…))`,
// name `compact_memory`, input = a plain JSON schema
// ({ sessionID?, emergency?, message?, mode?, summary?, boundary? }); `execute`
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
// biggest deviation of this unit. (b) THE QUEUE LEG: the v1 temp-file store +
// auto_resume unit-4 resume-relay is NOT ported (auto_resume is order 2, skipped)
// — relay semantics CHANGE to the native inbox queue: `delivery:"queue"` on
// `session.prompt` (the 3b nudge precedent), and the delivery lands AFTER
// VERIFIED SUCCESS (NOT at queue time) so the v1 zombie-guard guarantee is
// kept: a queued continuation present ⇒ the compaction happened; NO temp-file
// queue store needed. Rejection/sync-throw → evidence, NEVER fails the tool.
// (c) KEEP KEYS: the budget file's `keepMessages`/`keepTokens` DO NOT apply
// to a v2 dispatch (no keep fields on the compact body) — read for AUDITABILITY
// only, ONE `keep-not-applied` evidence line when either key is present;
// retention = config `compaction.keep.tokens` (the ONLY v2 control); the
// plugin NEVER writes config values (maintainer domain). (d) THE PRE-COMPACTION
// DUMP leg (#152) is SKIPPED — the v1 dump tool is v1-table shaped, the v2 twin
// rides follow-up spec 2026-10-22_137u4c-dump-twin — ONE `dump-skipped` line
// per dispatch. (e) The COMPACT line stays BYTE-IDENTICAL v1 format in the
// SHARED `.opencode/temp/ctx.log` (the ` ovr` token for the cross override
// slot); plugin evidence lines (dispatch/denied/marker/verify/queue/keep/dump)
// go to `.opencode/temp/compact_v2.log` (the context_family.log capped pattern,
// never-throws appends).
//
// STILL PENDING (unchanged): LIVE v2-host activation waits for the maintainer's
// host runs (the backend slot); registration/config = maintainer domain.

import type { Plugin } from "@opencode/plugin";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

// The ported budget core — a VALUE import of plain JS (node: builtins only).
import {
  SELF_ROOT,
  appendCompactLine,
  budgetGate,
  hasKeepKeys,
  readCompactionConfig,
  recordSuccess,
  resolveRoot,
} from "../plugin/scripts/compaction_core_v2.mjs";

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

// The verified-success handling (v1 order, same helpers): budget INCREMENT
// THEN the COMPACT line, then the continuation queue (DEVIATION (b): the
// native queue lands HERE, after verification).
function verifiedSuccess(sid: string, rec: PendingRecord): void {
  recordSuccess(root(), sid, rec.model);
  const keepResolved =
    rec.keepTokens != null ? { tokens: rec.keepTokens, source: "budget" as const } : { tokens: undefined, source: "none" as const };
  appendCompactLine(root(), sid, rec.model, rec.keepMessages, keepResolved, rec.isEmergency, rec.isOverride);
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
  if (rec.queueText !== "") deliverQueue(sid, rec.queueText);
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

// ------------------------------------------------------------------ (3b) the native queue leg

// The continuation message (`message` arg) rides `session.prompt` with
// `delivery:"queue"` (the 3b nudge-delivery precedent, the inbox channel).
// FIRE-AND-FORGET: a sync throw or a rejection is evidence-logged (kind
// "queue"), NEVER a failure of the tool call; a missing `prompt` fn (a probe
// mock without it) logs `queue-skipped` (v1 discipline).
function deliverQueue(sid: string, text: string): void {
  try {
    const api = sessionApi;
    const fn = api?.prompt;
    if (typeof fn !== "function") {
      appendLog(buildLine("queue", { session: sid, reason: "queue-skipped" }, {}));
      return;
    }
    const p = fn.call(api, { sessionID: sid, text, delivery: "queue" });
    appendLog(buildLine("queue", { session: sid, state: "queued", chars: String(text.length) }, {}));
    void Promise.resolve(p).then(
      () => undefined,
      (e: unknown) => {
        appendLog(buildLine("queue", { session: sid, reason: "delivery-rejected", preview: cap(String((e as { message?: unknown } | undefined)?.message ?? e ?? ""), 120) }, {}));
      },
    );
  } catch (e) {
    appendLog(buildLine("queue", { session: sid, reason: "delivery-threw", preview: cap(String((e as { message?: unknown } | undefined)?.message ?? e ?? ""), 120) }, {}));
  }
}

// ------------------------------------------------------------------ (2) the tool surface

const TOOL_DESCRIPTION =
  "Compacts a session to free context space. Two paths: SELF (sessionID omitted) — the CALLING session is compacted and continues from committed files via the post-compaction protocol; CROSS (explicit sessionID) — a fire-and-forget dispatch: it returns immediately and is NEVER awaited (an await would deadlock the single llama-swap model slot); success is verified ASYNCHRONOUSLY — the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success (the session.compaction.ended event), and a failed dispatch burns NO budget. The budget is per TARGET session, per model — the cap comes from the compact_budget.json model_budget map (bare model id -> cap; unlisted models get the configured default; CPU models denied — cap 0). The total budget per session is the cap + ONE emergency compaction: once the normal cap is drained, the `emergency` argument may consume the 1 (count -> cap+1 = fully exhausted). A CROSS caller (explicit sessionID != the calling session) gets an effective cap of cap + 1 (the caller-scoped override, ruling 2026-09-30) — the spendable TOTAL stays THE SAME AS SELF (cap + the one emergency): a cross at count == cap dispatches via the override slot (the COMPACT line gains the ` ovr` token), and a cross at count == cap + 1 stays REFUSED. MARKER mode (args mode:'marker' + summary): the agent writes the summary itself (compaction style, the current model) and the plugin supplies it at the v2 `compaction` draft hook (event.result — the core skips the summarizer model request and writes the durable compaction message). DEVIATIONS vs v1: the `boundary` argument is IGNORED (v2 computes the retained `recent` from the config compaction.keep.tokens; ONE boundary-ignored evidence line); the budget file's keepMessages/keepTokens are NOT applied (the compact body has no keep fields — ONE keep-not-applied line); the `message` continuation is delivered on the native inbox queue (delivery:'queue') AT verified success; the pre-compaction dump is SKIPPED (the v2 dump twin rides spec 2026-10-22_137u4c-dump-twin). Use it at the stop line / near-limit triage (self) or before a task_id resume of a session that died at its limit (cross); do NOT use it as a restart substitute.";

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
      description: "The post-compaction continuation message (1-3 lines: what to resume + which files to re-read). Queued natively (delivery:'queue') at verified success.",
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
// /dump-skipped) → the fire-and-forget dispatch → the dispatch response (NEV
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

  // The pending record — written BEFORE the dispatch (the compaction hook
  // and the verify leg read it); the queue text is remembered, NOT yet deliv
  // -ered (DEVIATION (b): the native queue lands at verified success).
  pending.set(sessionID, {
    model,
    isEmergency: gate.isEmergency,
    isOverride: gate.isOverride,
    markerSummary,
    fired: false,
    queueText: typeof a.message === "string" ? a.message : "",
    keepMessages: cfg.keepMessages,
    keepTokens: cfg.keepTokens,
  });
  const keepAudit = hasKeepKeys(root());
  if (keepAudit) {
    appendLog(buildLine("keep", { session: sessionID, reason: "keep-not-applied", keepMessages: String(cfg.keepMessages), keepTokens: cfg.keepTokens != null ? String(cfg.keepTokens) : undefined }, {}));
  }
  appendLog(buildLine("dump", { session: sessionID, reason: "dump-skipped" }, {}));

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
  if (isMarker) responseParts.push(`marker= queued — the compaction draft hook supplies the summary (the core skips the summarizer model request; the \`boundary\` argument is IGNORED in v2 — retention rides the config compaction.keep.tokens)`);
  else responseParts.push("Compaction dispatched");
  responseParts.push(` for ${sessionID} (model: ${model !== "" ? model : "unresolved"})`);
  if (gate.isEmergency) responseParts.push(" — the emergency slot is consumed (count → cap+1)");
  if (gate.isOverride) responseParts.push(" — the caller-scoped cross override slot is consumed (the COMPACT line gains the ` ovr` token)");
  responseParts.push(`; the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success (the session.compaction.ended event) — a failed compaction burns NO budget. Used ${gate.count}/${gate.cap} (model class ${gate.label}).`);
  if (typeof a.message === "string" && a.message !== "") responseParts.push(" The continuation message rides the native inbox queue (delivery:'queue') at verified success.");
  if (keepAudit) responseParts.push(" keepMessages/keepTokens are NOT applied in v2 (the compact body has no keep fields).");
  responseParts.push(" The pre-compaction dump is skipped in v2 (the dump twin rides spec 2026-10-22_137u4c-dump-twin).");
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
