// =============================================================================
// compaction_core_v2.mjs — the v2-NATIVE compaction budget core (TODO #137
// unit 4a; clone `migration`).
//
// A PURE module (NO tool registration, NO host imports — plain JS, node:fs
// /node:path only, the gauge.mjs sibling contract: the v2 plugin VALUE-
// imports this `.mjs`). It ports the budget layer of the v1
// `.opencode/plugin/compaction_core.ts` 1:1: the SAME file
// (`<root>/.opencode/temp/compact_budget.json`), the SAME keys, the SAME
// semantics —
//   - the config reader (fail-open, read PER CALL — a mid-run edit
//     applies to the next call);
//   - the cap resolver (bare model id → cap; unlisted / typo'd →
//     model_budget.default, else the default 1; CPU models cap 0 — the
//     SAFETY INVARIANT, tested FIRST);
//   - the budget store v2 schema ({count, updated, model} per session;
//     INCREMENT-ON-SUCCESS only) with the #119 READ-MODIFY-WRITE invariant
//     (every pre-existing top-level key survives a rewrite — the file is
//     SHARED with the compaction config);
//   - the COMPACT line (BYTE-IDENTICAL v1 format, appended to the shared
//     `<root>/.opencode/temp/ctx.log` — the cross-host log stays ONE
//     format; ` ovr` = the cross override slot consumed);
//   - the pure budget GATE (denial = ZERO side effects: the CALLER does
//     the no-increment / no-dispatch / no-line discipline; at count ==
//     cap the `emergency` arg consumes the configured emergency_budget
//     1, count → cap+1; count > cap = fully exhausted; a CROSS caller
//     gets an effective cap of cap + 1 — the caller-scoped override,
//     TODO #128 ruling 2026-09-30 — the spendable TOTAL stays cap +
//     ONE emergency, THE SAME AS SELF).
//
// NOT PORTED (no v2 counterpart): the summarizer-pair resolution (the
// v2 compact call takes NO model), the dispatch-time keepTokens COMPUT
//ATION (the compact body has NO keep fields — retention rides the host
// config `compaction.keep.tokens`), the `emergencyRecovery` flag (the
// v1 context_recovery hook is not ported; the key is IGNORED in v2), and
// the pre-compaction dump helpers (the v2 dump twin rides follow-up spec
// 2026-10-22_137u4c-dump-twin — the plugin logs `dump-skipped` instead).
//
// Root: the caller's context `directory` when present, else SELF-
// LOCATION (this file lives at <root>/.opencode/plugins/scripts/ — the
// gauge.mjs pattern; the grandparent of the scripts dir is the repo root).
// =============================================================================

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_KEEP_MESSAGES = 12;
const DEFAULT_EMERGENCY_BUDGET = 1;
const DEFAULT_MODEL_BUDGET = 1;

// ------------------------------------------------------------------ compaction config

// ALL compaction config lives in the SAME file as the budget store:
// <root>/.opencode/temp/compact_budget.json — top-level keys (all optional,
// fail-open defaults): keepMessages (number >= 0, default 12), keepTokens
// (number >= 0, default undefined — read for AUDITABILITY only in v2: the
// compact body has NO keep fields, the plugin logs ONE keep-not-applied
// line when either keep key is PRESENT), emergency_budget (number >= 0,
// default 1 — the once-per-session emergency compaction), model_budget
// ({ "<bare model ID>": <cap>, "default": <cap> }). An absent file /
// unparseable JSON / malformed key fails open to the defaults (never a
// throw). `emergencyRecovery` (v1) is NOT read — the v2 hook has no
// counterpart.
export function readCompactionConfig(root) {
  const cfg = {
    keepMessages: DEFAULT_KEEP_MESSAGES,
    keepTokens: undefined,
    emergency_budget: DEFAULT_EMERGENCY_BUDGET,
    model_budget: {},
  };
  try {
    const parsed = JSON.parse(readFileSync(budgetPath(root), "utf8"));
    if (parsed != null && typeof parsed === "object") {
      if (typeof parsed.keepMessages === "number" && Number.isFinite(parsed.keepMessages) && parsed.keepMessages >= 0) cfg.keepMessages = parsed.keepMessages;
      if (typeof parsed.keepTokens === "number" && Number.isFinite(parsed.keepTokens) && parsed.keepTokens >= 0) cfg.keepTokens = parsed.keepTokens;
      if (typeof parsed.emergency_budget === "number" && Number.isFinite(parsed.emergency_budget) && parsed.emergency_budget >= 0) cfg.emergency_budget = parsed.emergency_budget;
      const mb = parsed.model_budget;
      if (mb != null && typeof mb === "object" && !Array.isArray(mb)) {
        for (const [k, v] of Object.entries(mb)) {
          // cap 0 is meaningful (a model denied by config); a negative is not
          if (typeof v === "number" && Number.isFinite(v) && v >= 0) cfg.model_budget[k] = v;
        }
      }
    }
  } catch {
    // corrupt/unreadable config -> defaults (never throw)
  }
  return cfg;
}

// True when the budget file declares EITHER keep key (raw JSON key check —
// the auditability read behind the plugin's keep-not-applied evidence line
// ; a malformed/absent file -> false).
export function hasKeepKeys(root) {
  try {
    const parsed = JSON.parse(readFileSync(budgetPath(root), "utf8"));
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    return "keepMessages" in parsed || "keepTokens" in parsed;
  } catch {
    return false;
  }
}

// Resolves the compaction cap for a model name: the CPU guard is a SAFETY
// INVARIANT (cap 0, tested FIRST — CPU models are never compacted); then the
// EXACT bare-model-id key of the file's model_budget map (its configured
// cap); else model_budget.default (else the default 1) — an unlisted /
// typo'd id simply never matches.
export function resolveCap(root, modelName) {
  const name = typeof modelName === "string" ? modelName : "";
  if (/^cpu/i.test(name)) return { cap: 0, label: "cpu (excluded)" };
  const mb = readCompactionConfig(root).model_budget;
  if (name !== "" && typeof mb[name] === "number") return { cap: mb[name], label: "model_budget" };
  const def = typeof mb.default === "number" ? mb.default : DEFAULT_MODEL_BUDGET;
  return { cap: def, label: "model_budget default" };
}

// ------------------------------------------------------------------ budget store (v2 schema)

// The compaction budget, keyed by session id, INCREMENT-ON-SUCCESS only —
// shared by FILE with BOTH entry points (the state lives on disk, not in
// module memory). Schema version 2:
//   { "version": 2,
//     "sessions": { "<sid>": { "count": <n>, "updated": "<iso ts>", "model": "<id>" } } }
// The cap lives in the file's TOP-LEVEL model_budget map (resolved per
// call); the session entry stores only count/updated/model (the model =
// the id at the last increment — transparency).

export const SELF_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function resolveRoot(context) {
  if (context != null && typeof context.directory === "string" && context.directory !== "") {
    return context.directory;
  }
  return SELF_ROOT;
}

function tempDir(root) {
  return path.join(root, ".opencode", "temp");
}

function budgetPath(root) {
  return path.join(tempDir(root), "compact_budget.json");
}

// #119: the parsed object is returned AS-IS (every pre-existing top-level
// key survives — the file is shared with the compaction config); only the
// `sessions` map is normalized (absent / wrong-typed / corrupt -> fresh
// empty map). `version` is NOT forced here — the bump to 2 lands on the
// first write (recordSuccess).
function readBudget(root) {
  let base = {};
  try {
    const p = budgetPath(root);
    if (existsSync(p)) {
      const parsed = JSON.parse(readFileSync(p, "utf8"));
      if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) {
        base = parsed;
      }
    }
  } catch {
    // corrupt/unreadable store -> treat as fresh (never throw)
  }
  const sessions =
    base.sessions != null && typeof base.sessions === "object" && !Array.isArray(base.sessions)
      ? base.sessions
      : {};
  return { ...base, sessions };
}

function writeBudget(root, store) {
  try {
    const dir = tempDir(root);
    mkdirSync(dir, { recursive: true });
    writeFileSync(budgetPath(root), JSON.stringify(store, null, 2) + "\n", "utf8");
  } catch {
    // best effort - a lost increment errs toward ONE extra compaction, never a crash
  }
}

export function budgetCount(root, sessionID) {
  const entry = readBudget(root).sessions[sessionID];
  return (entry != null && typeof entry.count === "number" && Number.isFinite(entry.count)) ? entry.count : 0;
}

// INCREMENT-ON-SUCCESS only (a failed compact consumes NO budget). Re-
// read-then-write with NO await between the read and the write (the only
// interleaving-safe sequence for a file shared in-process).
export function recordSuccess(root, sessionID, model) {
  const store = readBudget(root);
  store.version = 2; // the schema bump lands on the first v2 write
  const entry = store.sessions[sessionID] ?? { count: 0, updated: "", model: "" };
  entry.count = (entry.count ?? 0) + 1;
  entry.updated = new Date().toISOString();
  entry.model = typeof model === "string" ? model : (entry.model ?? "");
  store.sessions[sessionID] = entry;
  writeBudget(root, store);
}

// ------------------------------------------------------------------ the COMPACT line

// Appends the COMPACT line to `.opencode/temp/ctx.log` after a verified
// compaction (in-process file append - never throws). BYTE-IDENTICAL v1
// format: leading `YYYY-MM-DD_HH-MM` local stamp + the optional model field
// (OMITTED when empty) + `COMPACT <session id> keep=<m>m tok=<t> <source>`
// (`computed`/`budget`/`none` - in v2 only `budget`/`none` occur: the
// compact body has NO keep fields, the token figure can only ride the
// budget file's keepTokens) + the optional ` emergency` suffix (the once-
// per-session emergency compaction consumed) + the optional ` ovr` suffix
// (the caller-scoped cross override slot consumed - TODO #128, mutually
// exclusive with ` emergency`) + the optional pre-readout `(<text>)`.
export function localStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

export function appendCompactLine(root, sessionID, model, messages, resolved, emergency = false, override = false, preReadout = "") {
  try {
    const dir = tempDir(root);
    mkdirSync(dir, { recursive: true });
    const p = path.join(dir, "ctx.log");
    const modelField = typeof model === "string" ? model : "";
    const preField = typeof preReadout === "string" && preReadout !== "" ? preReadout : "";
    const tok = resolved != null && resolved.tokens != null ? String(resolved.tokens) : "-";
    const source = resolved != null && (resolved.source === "computed" || resolved.source === "budget") ? resolved.source : "none";
    const line =
      `${localStamp()}${modelField !== "" ? ` ${modelField}` : ""} ` +
      `COMPACT ${sessionID} keep=${messages}m tok=${tok} ${source}` +
      (emergency ? " emergency" : "") +
      (override ? " ovr" : "") +
      `${preField !== "" ? ` (${preField})` : ""}\n`;
    appendFileSync(p, line, "utf8");
  } catch {
    // best effort - never break the compaction over a write failure
  }
}

// ------------------------------------------------------------------ the budget gate (pure)

// The v1 gate arithmetic, moved to the core so the v2 plugin stays THIN and
// the smoke pins the cap/emergency/override forms DIRECTLY (no host round-
// trip). The CALLER enforces the denial discipline: on `allowed:false` it
// performs ZERO side effects (no increment, no compact call, no COMPACT
// line) and returns `refusal` verbatim. isCross = an explicit sessionID
// argument != the calling session (the caller-scoped override, TODO #128
// ruling 2026-09-30); emergencyArg = the tool's `emergency` argument.
export function budgetGate(root, model, sessionID, isCross, emergencyArg) {
  const cfg = readCompactionConfig(root);
  const { cap, label } = resolveCap(root, model);
  const count = budgetCount(root, sessionID);
  const effCap = isCross ? cap + 1 : cap;
  let isEmergency = false;
  let isOverride = false;
  if (count >= effCap) {
    if (count === cap && emergencyArg === true && cfg.emergency_budget >= 1) {
      isEmergency = true;
    } else {
      const emergencyNote =
        count === cap && emergencyArg !== true && cfg.emergency_budget >= 1
          ? " The emergency compaction (once per session) is available via the `emergency` argument."
          : " The emergency compaction is unavailable or already consumed — the budget is fully exhausted.";
      const ovrNote = isCross
        ? " The caller-scoped cross override slot is consumed — the budget is fully exhausted."
        : "";
      const refusal =
        `Compaction refused: the compaction budget for ${sessionID} is exhausted — ` +
        `model class ${label} (cap ${cap}), used ${count}/${cap}. ` +
        `Hand over and start fresh — write the handover summary and let the loop restart with a fresh session.` +
        ovrNote +
        emergencyNote;
      return { allowed: false, isEmergency, isOverride, cap, count, label, refusal };
    }
  }
  // The CROSS dispatch that later SUCCEEDS with pre-dispatch count == cap
  // consumed the override slot (the target's normal cap was already spent)
  // - the verified-success COMPACT line gains the `ovr` token (Part 3).
  if (isCross && count === cap) isOverride = true;
  return { allowed: true, isEmergency, isOverride, cap, count, label, refusal: "" };
}
