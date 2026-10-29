// loop_log.ts — the v2-NATIVE loop-activity logger (TODO unit 5a, 2026-10-22,
// clone `migration`). Ports the v1 `.opencode/tools/loop_log.ts` tool (the
// design of record, READ-ONLY — Parts A–D) onto the v2 plugin surfaces: `ctx.tool.transform`
// + `editor.add` (the compact_memory.ts registration pattern: setup returns a teardown
// closure disposing the registration). Auto-discovered from `.opencode/plugins/`
// (NO `opencode.jsonc` change — the 3a precedent).
//
// CARRIED (behavior byte-compatible with v1): the 8-char status tokens, the
// line format `<stamp> <status> <role> <session> <model> <content>` (append-only),
// the `autorun-*` folder create/locate/anomaly rules, the readback byte-compare
// confirmation, the `corrects:` line, and the unrecognized-status Error string
// (NOTHING written). The v1 file stays INERT design-of-record (the probe pins it).
//
// DEVIATION (header REQUIRED — the v2 ToolContext carrier): v2 gives
// `{sessionID, agent, messageID, id, signal, progress}` (fork schema tool.ts:14-19
// + plugin promise/tool.ts:11-24) — the v1 Part A chains' legs `context.sessionId`,
// `context.session?.id`, and `context.extra.model.id` have NO v2 carrier (logged;
// the `unknown` fallback carries). Chains become:
//   session: args.session → context.sessionID → else the literal `unknown`
//   role:    args.role    → context.agent     → else `unknown`
//   model:   args.model   → context.agent (the agent-identifier preference) → else `unknown`
// The repo-root carrier = setup-time capture `dir = ctx.location.directory`
// (the context_family.ts:497 precedent; v1 resolved `context.directory ?? process.cwd()`
// at execute time — v2 ToolContext has no `directory`).
//
// WHAT IT IS: a v2 plugin (DEFAULT export only, the loader contract; the
// `@opencode/plugin` import is TYPE-ONLY, erased at runtime; no value imports
// beyond node: builtins — the compact_memory/context_family pattern). NEVER throws.
//
// #161 (2026-10-26): after a successful append whose line carries `planner-<N>`
// (same `/planner-(\d+)/g` scan as auto_resume's spawnCounterFor), the tool bumps
// `loop/<folder>/counter.json` to `{looprun, n: N}` when the counter exists,
// parses, its `looprun` matches the folder, and N > its n. Fail-closed: absent /
// unparseable / wrong-looprun / non-planner line / N <= n -> NO counter write and
// NEVER a created file; the append stands either way.
import type { Plugin } from "@opencode/plugin";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { currentLoopFolder, listLoopFolders, loopCounterPath, readLoopCounter } from "./scripts/loop_root.mjs";

// The repo-root carrier — captured at setup from `ctx.location.directory`;
// the pre-setup default keeps a stray pre-setup call out of a crash (process
// cwd), though the tool only runs after registration.
let dir = process.cwd();

// Local clock, `YYYY-MM-DD_HH-MM` (minute resolution) — the SAME form the
// existing loop-log lines use. Machine-computed; NEVER retyped or compared by
// eye (AGENTS.md pattern 5).
function localStamp(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}-${p(d.getMinutes())}`
  );
}

// Part A — best-effort identity resolution: the FIRST source that is a
// non-blank string wins (its raw, untrimmed value); all sources absent/blank
// -> the literal `unknown`. Never throws — a missing context field just falls
// through to the next source.
function firstKnown(sources: unknown[]): string {
  for (const s of sources) {
    if (s != null && String(s).trim() !== "") return String(s);
  }
  return "unknown";
}

// Part C — lenient status: lowercase + strip everything non-alphanumeric,
// then the keyword check IN THIS ORDER (no keyword is a substring of another,
// so order only matters for the intended `restart` -> START case):
//   done -> DONE<---   return -> -RETURN-   warn -> -WARNING
//   info -> --INFO--   start -> -->START    correct -> CORRECT-
// No keyword matched -> null (the caller returns the Error, writes nothing).
const STATUS_KEYWORDS: ReadonlyArray<readonly [string, string]> = [
  ["done", "DONE<---"],
  ["return", "-RETURN-"],
  ["warn", "-WARNING"],
  ["info", "--INFO--"],
  ["start", "-->START"],
  ["correct", "CORRECT-"],
];

function normalizeStatus(raw: unknown): string | null {
  const norm = String(raw ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [kw, token] of STATUS_KEYWORDS) {
    if (norm.includes(kw)) return token;
  }
  return null;
}

// #161 — counter sync: `counter.json` must never LAG the log's `planner-<N>`
// max. After a successful append whose line carries `planner-<N>` (the SAME
// `/planner-(\d+)/g` scan auto_resume's spawnCounterFor uses), rewrite the
// folder's `counter.json` as `{looprun, n: maxN}` — ONLY when the file exists,
// parses, its `looprun` matches the folder, its `n` is a finite number, and
// maxN > n. Fail-closed on every other leg (non-planner line, absent file —
// NEVER created, unparseable, wrong looprun, bad n, maxN <= n): no write at
// all. Best-effort: any read/write failure is swallowed — the append stands.
// #171 (2026-10-26): the rewrite PRESERVES an existing `round` key (the
// maintenance clock) and never fabricates one.
// #164 (2026-10-26): the counter READ + the counter FILE PATH come from the
// ONE read-only helper `./scripts/loop_root.mjs` (absent/unreadable/
// unparseable/non-object → null → no write; the read NEVER creates the file).
function bumpCounter(folderName: string, line: string): void {
  try {
    let maxN = 0;
    for (const m of line.matchAll(/planner-(\d+)/g)) {
      const n = parseInt(m[1], 10);
      if (n > maxN) maxN = n;
    }
    if (maxN === 0) return; // no `planner-<N>` token in the line -> no write
    const data = readLoopCounter(path.join(dir, "loop"), folderName);
    if (data === null) return; // absent (never created) / unparseable / bad shape
    const rec = data as Record<string, unknown>;
    if (rec["looprun"] !== folderName) return; // wrong-looprun file -> unchanged
    const n = rec["n"];
    if (typeof n !== "number" || !Number.isFinite(n) || maxN <= n) return;
    // #171 (2026-10-26): the n-bump PRESERVES an existing `round` key (the
    // maintenance clock written by the spawn/compaction legs) as-is and NEVER
    // fabricates it — a counter without `round` keeps the {looprun,n} shape.
    const next = "round" in rec
      ? { looprun: folderName, n: maxN, round: rec["round"] }
      : { looprun: folderName, n: maxN };
    writeFileSync(loopCounterPath(path.join(dir, "loop"), folderName), JSON.stringify(next), "utf-8");
  } catch {
    // unwritable -> fail-closed, append stands
  }
}

const TOOL_DESCRIPTION =
  `Appends ONE machine-timestamped loop-log line to the current looprun's loop_log.md (auto-creates the dated autorun-* folder when loop/ is empty) and CONFIRMS the write (reads the file back, byte-compares the last line). status = a free-form word containing one of the keywords (checked in order): start / done / return / warn / info / correct -> the established 8-char tokens (-->START / DONE<--- / -RETURN- / -WARNING / --INFO-- / CORRECT-); case/dash/arrow variants normalize ('restart' -> START); an unrecognized status returns an error naming the keywords (nothing is written). role / model / session are OPTIONAL — auto-filled from the v2 ToolContext (role/model <- context.agent, session <- context.sessionID; else the literal 'unknown' — v2 carries no sessionId/session.id/extra.model.id fields; the v1 twin's extra chain legs have no v2 carrier). Return: folder: <name> (created|existing) + line: <exact line> + verified: readback-match (or readback-MISMATCH: <actual last line>) + corrects: <previous log line> (status 'correct' only) + the ANOMALY note (several autorun-* folders). The line format is unchanged: <stamp> <status> <role> <session> <model> <content>; append-only (no earlier line is ever rewritten). A line carrying planner-<N> additionally bumps the folder's counter.json n to N (a present round key is PRESERVED, never fabricated — #171) when an EXISTING parseable counter for THIS looprun has n < N — fail-closed: an absent/unparseable/wrong-looprun counter is never written and never created; non-planner lines never touch the counter.`;

// The input schema — a plain JSON schema (the promise surface accepts
// Tool.ValueSchema; InputValue resolves to `unknown`, so `execute` reads
// the args defensively). `status`/`content` REQUIRED; `role`/`model`/`session`
// OPTIONAL (the arg descriptions carried from the v1 twin, adapted to the v2
// carrier).
const TOOL_INPUT = {
  type: "object",
  additionalProperties: false,
  required: ["status", "content"],
  properties: {
    status: {
      type: "string",
      description:
        "Free-form status word (Part C): must contain one of the keywords start / done / return / warn / info / correct (checked in that order) -> the established 8-char tokens (-->START / DONE<--- / -RETURN- / -WARNING / --INFO-- / CORRECT-). Case/dash/arrow variants all normalize (e.g. 'restart' -> -->START); an unrecognized status returns an error naming the keywords (never a silent INFO fallback, nothing is written).",
    },
    content: {
      type: "string",
      description:
        "The single-line content for this event (task oneliner for START; the final gauge readout for DONE; the returned agent's 'role-N session_id model' for RETURN; the failed session id + cause for WARNING; short run info for INFO).",
    },
    role: {
      type: "string",
      description:
        "Your full role token, e.g. 'planner-10', 'worker-13', 'looprunner'. OPTIONAL — auto-filled from the host context.agent when omitted; the literal 'unknown' when absent everywhere.",
    },
    model: {
      type: "string",
      description:
        "Your model id, VERBATIM from your own launch context (e.g. 'Qwen3.8-27B-Q3S-170K'). OPTIONAL — auto-filled with the agent-identifier preference (context.agent first — the only v2 carrier); the literal 'unknown' when absent everywhere.",
    },
    session: {
      type: "string",
      description:
        "Your session id, from the SESSION= field of your injected ctx: line. OPTIONAL — auto-filled from the host context.sessionID when omitted/empty; the literal 'unknown' in the line when absent everywhere.",
    },
  },
};

// The tool call sequence (v1 order, carried): the status normalization FIRST
// (denial = ZERO side effects: no folder creation, no append) -> locate/create
// the looprun folder -> resolve the Part A identity chains -> append the ONE
// line (+ the Part D previous-line capture for CORRECT- BEFORE the append) ->
// readback byte-compare -> the return. NEVER throws.
async function execute(
  args: unknown,
  toolContext: { sessionID?: unknown; agent?: unknown },
): Promise<{ output: string }> {
  const a: Record<string, unknown> =
    args != null && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : {};

  // Part C — normalize the status FIRST (a bogus status writes NOTHING —
  // no folder creation, no append; never a silent INFO fallback).
  const status = normalizeStatus(a.status);
  if (status === null) {
    return {
      output: `Error: unrecognizable status ${JSON.stringify(a.status)} — accepted keywords: start / done / return / warn / info / correct (no keyword matched; nothing was written).`,
    };
  }

  const loopRoot = path.join(dir, "loop");

  // Step 2 — locate (or create) the current looprun folder. #164
  // (2026-10-26): the locate goes through the ONE read-only helper
  // `./scripts/loop_root.mjs` (absent `loop/` root -> [] — the same
  // existsSync-guarded empty list as before; several folders -> the
  // most-recently-modified — the anomaly note stays HERE).
  const loopDirs: string[] = listLoopFolders(loopRoot); // deterministic base order (the anomaly case re-sorts by mtime)

  let folderName: string;
  let anomaly: string | null = null;

  if (loopDirs.length === 0) {
    // No current looprun folder -> create the dated one (machine-named).
    folderName = "autorun-" + localStamp();
    mkdirSync(path.join(loopRoot, folderName), { recursive: true });
  } else if (loopDirs.length === 1) {
    folderName = loopDirs[0];
  } else {
    // SEVERAL -> the most-recently-MODIFIED (surfaced, not silently resolved).
    folderName = currentLoopFolder(loopRoot, loopDirs)!;
    anomaly = `ANOMALY: ${loopDirs.length} autorun-* folders exist in the loop dir; used the most-recently-modified (${folderName}). The protocol invariant is EXACTLY ONE current looprun folder — rollover is planner work.`;
  }

  // Step 3 — build and append the ONE machine-timestamped line (append-only).
  // Part A — auto-identity on the v2 carrier (best-effort chains; absent
  // everywhere -> the literal `unknown`).
  const session = firstKnown([a.session, toolContext?.sessionID]);
  const role = firstKnown([a.role, toolContext?.agent]);
  const model = firstKnown([a.model, toolContext?.agent]); // the agent-identifier preference
  const content = typeof a.content === "string" ? a.content : String(a.content ?? "");
  const line = `${localStamp()} ${status} ${role} ${session} ${model} ${content}`;
  const logPath = path.join(loopRoot, folderName, "loop_log.md");

  // Part D — for a CORRECT- line: capture the log's PREVIOUS line (byte-exact,
  // BEFORE this append) so the return can name it cheaply. An empty/absent
  // log -> the `corrects:` field is omitted.
  let previousLine: string | null = null;
  if (status === "CORRECT-") {
    if (existsSync(logPath)) {
      const prevLines = readFileSync(logPath, "utf-8")
        .split("\n")
        .filter((l) => l !== "");
      if (prevLines.length > 0) previousLine = prevLines[prevLines.length - 1];
    }
  }

  appendFileSync(logPath, line + "\n", "utf-8");

  // #161 — counter sync (fail-closed, best-effort — never affects the append
  // or the return surface): a `planner-<N>` line bumps the folder counter.
  bumpCounter(folderName, line);

  // Part B — write confirmation: read the file back and byte-compare the
  // last line against the line just written (a mismatch surfaces the file's
  // ACTUAL last line — never silent).
  const readback = readFileSync(logPath, "utf-8");
  const rbLines = readback.split("\n").filter((l) => l !== "");
  const rbLast = rbLines.length > 0 ? rbLines[rbLines.length - 1] : "";
  const verified = rbLast === line ? "verified: readback-match" : `verified: readback-MISMATCH: ${rbLast}`;

  // Step 4 — return folder (with the created/existing flag) + line + the
  // write confirmation (+ `corrects:` for a CORRECT- line, + the anomaly
  // note, appended last).
  const parts = [
    `folder: ${folderName} ${loopDirs.length === 0 ? "(created)" : "(existing)"}`,
    `line: ${line}`,
    verified,
  ];
  if (previousLine !== null) parts.push(`corrects: ${previousLine}`);
  if (anomaly) parts.push(anomaly);
  return { output: parts.join("\n") };
}

const loopLogTool = {
  name: "loop_log",
  description: TOOL_DESCRIPTION,
  input: TOOL_INPUT,
  output: { type: "string" },
  execute,
};

// ------------------------------------------------------------------ the plugin module

// The v2 plugin module (the loader decodes the DEFAULT export only). The
// setup captures the repo root; the teardown disposes the registration
// (the compact_memory.ts pattern).
const plugin: Plugin.Plugin = {
  id: "loop_log",
  async setup(ctx) {
    dir = ctx.location.directory;
    const regTool = await ctx.tool.transform((editor) => {
      editor.add(loopLogTool);
    });
    return () => {
      void regTool.dispose();
    };
  },
};

export default plugin;
