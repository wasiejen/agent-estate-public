// ctx_gauge.ts — the v2-NATIVE context-gauge readout tool (TODO #137 unit 5b,
// 2026-10-22, clone `migration`). Ports the v1 `.opencode/tools/ctx_gauge.ts`
// (the design of record, READ-ONLY — the T2 loop-tool-batch part 2) onto the
// v2 plugin surfaces: `ctx.tool.transform` + `editor.add` (the compact_memory.ts
// / loop_log.ts registration pattern; setup returns a teardown closure disposing
// the registration). Auto-discovered from `.opencode/plugins/` (NO `opencode.jsonc`
// change — the 3a precedent).
//
// CARRIED (behavior byte-compatible with v1 where the surface carries pins): the
// tool wraps the ONE shared gauge core (`.opencode/plugins/scripts/gauge.mjs` —
// already v2-paired by migration units 1-2: the session-row + token-mass legs
// read the v2 tables FIRST) and mirrors peek.mjs IN-BAND: the same readout
// string, and on a db failure the core's error text is APPENDED to the line
// (` — <error>`) where peek.mjs writes it to stderr — the line is NEVER
// replaced by a stack trace (the core NEVER throws). The budget suffix and the
// `(unlisted)` marker ride the core's `compactionsLeftSuffix` — NOTHING is
// re-derived here.
//
// U24/#213 (2026-10-29): the working line ends with ` ROUND=<trips>` — the
// maintenance-trip counter (cumulative session input_tokens ÷ the
// `maintenance_trip_tokens` constant, the core's `tripRoundSuffix`); the #171
// counter-derived ROUND and the ` MAINT=1` duty token are RETIRED.
//
// DEVIATION (the v2 tool contract): the promise-surface execute returns
// `{ output }` (`Tool.Result`, the output schema is `{type:"string"}`) instead
// of the v1 bare string; the args ride a plain JSON schema (optional `sessionID`,
// the v1 arg's own description carried); the v1 auto-detected tool (named by
// filename) becomes the plugin registration id `ctx_gauge`. NO repo-root carrier
// is needed (the gauge core resolves its own DB/budget/loop paths — no
// `ctx.location.directory` capture here).
//
// WHAT IT IS: a v2 plugin (DEFAULT export only, the loader contract; the
// `@opencode/plugin` import is TYPE-ONLY, erased at runtime; the gauge-core
// import is a value import of plain `.mjs` — the context_family.ts pattern).
// NEVER throws.
import type { Plugin } from "@opencode/plugin";
import { formatGauge, readGauge, tripRoundSuffix } from "./scripts/gauge.mjs";

const TOOL_DESCRIPTION =
  `Reads the context usage of the current (or a named) session, read-only.
Returns the \`SESSION=… CTX=… (…%) REM=…\` readout (window unknown → no pct/REM; no total / unreadable db → CTX=notAvailable with the error appended). The readout line ends with the distinct \` | N compactions left\` budget suffix when the budget store resolves (file absent / unparseable → no suffix; when the cap resolves via the silent built-in fallback — model unlisted/empty + no finite \`model_budget.default\` key — the suffix appends the marker \` (unlisted)\` after \`left\`, #132). Fire this for context-budget decisions instead of the peek.mjs shell-out.
The line always ends with \` ROUND=<trips>\` — maintenance trips = cumulative session input tokens ÷ \`maintenance_trip_tokens\` (budget-file key, default 1M, #213); the #171 MAINT duty token is retired.
The readout LAGS true usage by ≈1 tool call (~5k tokens — the in-flight step's output, not yet in the DB; the gauge reads the last FINISHED step's in+out+cr, #103) — treat it as a LOWER bound and plan with margin (the same lag applies to the injected ctx: nudge lines).`;

// The input schema — a plain JSON schema (the promise surface accepts
// Tool.ValueSchema; the input value resolves to `unknown`, so `execute` reads
// it defensively). `sessionID` OPTIONAL — the v1 arg, its description carried.
const TOOL_INPUT = {
  type: "object",
  additionalProperties: false,
  properties: {
    sessionID: {
      type: "string",
      description:
        "Session id to read (the per-session read). Empty/omitted: the newest-updated session (the default peek read).",
    },
  },
};

async function execute(args: unknown, _toolContext: unknown): Promise<{ output: string }> {
  const a: Record<string, unknown> =
    args != null && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
  // The v1 arg semantics: an absent/EMPTY/non-string sessionID = the default
  // (newest-updated session) read.
  const sid = typeof a["sessionID"] === "string" && a["sessionID"] !== "" ? a["sessionID"] : undefined;
  // The shared core read (NEVER throws — a hard failure comes back as
  // kind:"db-error" with the capped, backend-naming error text).
  const r = await readGauge(undefined, sid);
  let out = formatGauge(r);
  // The gauge core is plain JS — the result union does not narrow through
  // `kind`, so the fields are read wire-defensively (the v1 field semantics
  // unchanged: `kind`, `error`).
  const gr = r as { kind?: unknown; error?: unknown; sid?: unknown };
  if (gr.kind === "db-error") out += ` — ${String(gr.error ?? "unknown error")}`; // the in-band mirror of peek.mjs's stderr note
  else {
    // U24/#213: the maintenance-trip token — ` ROUND=<trips>` =
    // floor(cumulative input_tokens of the session the read came from ÷ the
    // `maintenance_trip_tokens` constant), informational, appended on every
    // identified session. "" fail-open (unknown sid / sum-read failure).
    const gsid = typeof gr.sid === "string" && gr.sid !== "unknown" ? gr.sid : undefined;
    out += await tripRoundSuffix(gsid);
  }
  return { output: out };
}

const ctxGaugeTool = {
  name: "ctx_gauge",
  description: TOOL_DESCRIPTION,
  input: TOOL_INPUT,
  output: { type: "string" },
  execute,
};

// ------------------------------------------------------------------ the plugin module

// The v2 plugin module (the loader decodes the DEFAULT export only). No repo-
// root capture (the gauge core resolves its own paths); the teardown disposes
// the registration (the compact_memory.ts pattern).
const plugin: Plugin.Plugin = {
  id: "ctx_gauge",
  async setup(ctx) {
    const regTool = await ctx.tool.transform((editor) => {
      editor.add(ctxGaugeTool);
    });
    return () => {
      void regTool.dispose();
    };
  },
};

export default plugin;
