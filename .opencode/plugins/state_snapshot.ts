// state_snapshot.ts — the v2-NATIVE planner init digest (TODO #137 unit 5b,
// 2026-10-22, clone `migration`). Ports the v1 `.opencode/tools/state_snapshot.ts`
// (the design of record, READ-ONLY — the approved 2026-09-18 p3 proposal) onto
// the v2 plugin surfaces: `ctx.tool.transform` + `editor.add` (the compact_memory.ts
// / loop_log.ts registration pattern; setup returns a teardown closure disposing
// the registration). Auto-discovered from `.opencode/plugins/` (NO `opencode.jsonc`
// change — the 3a precedent).
//
// CARRIED (the digest byte-shape unchanged): the seven sections IN ORDER
// (`## git` / `## nap` / `## todo` / `## loop` / `## maintainer` / `## proposals`
// / `## markers`), the `git log --oneline -20` execFileSync leg, the nap
// first-40 + read-more steer, the todo header count + LAST 15 headers form, the
// looprun line (spec #155: the `autorun-*` folder + its `counter.json` →
// `loop=<folder> ITER=<n> log=loop/<folder>/loop_log.md`, else `no-looprun`), the
// maintainer inbox first-lines (max 5 + `… (+<k> more)`) + priority.md's first 10
// lines, the proposals root `.md` filenames, the READY-MADE marker sweep run VERBATIM via
// `execFileSync("bash", ["-c", MARKER_SWEEP])` (the pattern list is NOT re-
// derived), the `(none)` empties, the fail-closed section lines, and the 150-line
// hard cap that truncates the LAST section's content lines first while preserving
// all seven headers + their `… (…)` steers. The soft role gate carries: a non-
// empty `context.agent` that is not a planner gets the EXACT one-line refusal.
// READ-ONLY — it NEVER writes anywhere.
//
// MARKER ORDERING (both twins — spec 2026-10-22_state-snapshot-marker-order):
// the sweep command stays byte-verbatim; only its OUTPUT is re-ordered —
// LIVE-CLASS hits (`maintainer/` / `.opencode/` prefixes, or exactly TODO.md /
// README.md / WIKI.md) FIRST, then DOC-CLASS, each group sorted by the line
// string, BEFORE the 20-line cap + `… (+<k> more)` steer.
//
// DEVIATION (the v2 ToolContext carrier): v2 gives `{sessionID, agent, messageID,
// id, signal, progress}` (fork schema tool.ts:14-19 + plugin promise/tool.ts:11-
// 24) — the v1 repo-root source `context.directory` has NO v2 carrier; the root
// is the setup-time capture `dir = ctx.location.directory` (the context_family
// ts:497 precedent; v1 resolved it at execute time). The execute return is the
// v2 `{ output }` result shape (the digest string inside). The v1 auto-detected
// tool becomes the plugin registration id `state_snapshot`.
//
// WHAT IT IS: a v2 plugin (DEFAULT export only, the loader contract; the
// `@opencode/plugin` import is TYPE-ONLY, erased at runtime; value imports are
// node: builtins only — the compact_memory/context_family pattern). NEVER throws
// (every exec/fs leg is fail-closed into its section line).
import type { Plugin } from "@opencode/plugin";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { currentLoopFolder, readLoopCounter } from "./scripts/loop_root.mjs";

// The repo-root carrier — captured at setup from `ctx.location.directory`;
// the pre-setup default (process cwd) keeps a stray pre-setup call out of a
// crash, though the tool only runs after registration.
let dir = process.cwd();

// The ready-made marker sweep (planner prompt §maintainer calls/decisions —
// verbatim pattern list, carried from v1; the 2026-10-22 doc-noise pass extended
// the `grep -v` filter to drop the AGENT-OWNED + archived doc trees that only
// QUOTE the markers table — anchored at the hit's path field (line start), so
// a marker WORD inside another file's TEXT never hides a hit). `2>/dev/null`
// keeps missing target files (README.md / WIKI.md / absent dirs) from poisoning
// the output.
const MARKER_SWEEP = `grep -rn --include="*.md" -e "--main\\|--now\\|--info\\|--todo\\|--defer\\|--wip\\|--comment" \\
  .opencode/ agent/ maintainer/ loop/ proposals/ TODO.md README.md WIKI.md 2>/dev/null \\
  | grep -v "_past_priorities\\|/done/\\|agent_feedback\\|nap_direct\\|archive/\\|^agent/prompts/\\|^agent/readme/\\|^agent/knowledge/\\|^agent/memory/\\|^agent/research/\\|^agent/scripts/\\|^agent/handover/\\|^loop/\\|^proposals/implemented/\\|^proposals/superseded/\\|^\\.opencode/\\|^maintainer/feedback/"`;

// Read a file's lines (a single trailing newline dropped); null on any read
// failure (the fail-closed section lines are built on this).
const fileLines = (p: string): string[] | null => {
  try {
    let text = fs.readFileSync(p, "utf8");
    if (text.endsWith("\n")) text = text.slice(0, -1);
    return text.split(/\r?\n/);
  } catch {
    return null;
  }
};

// Trim + hard truncate to n chars (no ellipsis — the caps are line counts
// and char caps, not prose).
const trunc = (s: string, n: number): string => {
  const t = s.trim();
  return t.length > n ? t.slice(0, n) : t;
};

// The first error line (the child's stderr when it carries text — the
// informative line — else the thrown message), capped to 80 chars.
const firstErrorLine = (e: any): string => {
  const text = typeof e?.stderr === "string" && e.stderr.trim() !== "" ? e.stderr : String(e?.message ?? "unknown error");
  return text.trim().split("\n")[0].slice(0, 80);
};

// `## git` — git log --oneline -20 (execFileSync, args array; on failure
// the line `(git log failed: <first error line, 80 chars>)`).
const gitSection = (root: string): string[] => {
  try {
    const out = execFileSync("git", ["log", "--oneline", "-20"], { cwd: root, encoding: "utf8" });
    const lines = out
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l !== "");
    return lines.length > 0 ? lines : ["(none)"];
  } catch (e: any) {
    return [`(git log failed: ${firstErrorLine(e)})`];
  }
};

// `## nap` — the FIRST 40 lines of agent/handover/handover_planner.md;
// > 40 lines → the steer line; missing → the fail-closed line.
const napSection = (root: string): string[] => {
  const rel = "agent/handover/handover_planner.md";
  const lines = fileLines(path.join(root, rel));
  if (lines === null) return [`(nap missing: ${rel})`];
  const body = lines.slice(0, 40);
  if (lines.length > 40) body.push(`… (read ${rel} for the rest)`);
  return body.length > 0 ? body : ["(none)"];
};

// `## todo` — entry headers = lines matching `^## (?:#\d+|\d+)\.` in
// TODO.md; the count of ALL of them on the first line, then the LAST 15
// headers, one per line: `#<id> — <remainder truncated to 60 chars>`
// (file order).
const todoSection = (root: string): string[] => {
  const lines = fileLines(path.join(root, "TODO.md")) ?? [];
  const headers: { id: string; rest: string }[] = [];
  for (const line of lines) {
    const m = line.match(/^## (?:#(\d+)|(\d+))\.\s*(.*)$/);
    if (m) headers.push({ id: m[1] ?? m[2], rest: (m[3] ?? "").trim() });
  }
  const out = [`${headers.length} open-entry headers`];
  for (const h of headers.slice(-15)) out.push(`#${h.id} — ${trunc(h.rest, 60)}`);
  return out;
};

// `## loop` — the current looprun (spec #155): the `autorun-*` subdirectory of
// `<root>/loop/` (exactly one → it; several → the most-recently-modified, the
// same resolution `loop_log` uses), and its `counter.json`
// (`{"looprun": "<folder>", "n": <int>}` — plus the TODO #171 `round` key,
// written by auto_resume at spawn and by the compact verify leg): present
// form `loop=<folder> ITER=<n> log=loop/<folder>/loop_log.md`, and with a
// readable integer `round` the ` ROUND=<r>` token rides AFTER `ITER=<n>`
// (#213, 2026-10-29: the ` MAINT=1` duty token is RETIRED — the trip carrier
// lives on ctx_gauge only); legacy counters (no `round`) keep the old
// byte-exact line. ZERO folders, an unreadable counter, a non-integer `n`, or
// a `looprun` field that mismatches the folder name → the empty form
// `no-looprun`. NEVER throws (fail-closed into the empty form). The folder
// locate + counter READ go through the ONE read-only helper
// `./scripts/loop_root.mjs` (#164, 2026-10-26 — the #155 rule stays: NEVER
// import gauge.mjs, its config/window legs; the helper is read-only with no
// gauge legs. The looprun/n validation stays HERE).
const loopSection = (root: string): string[] => {
  try {
    const loopRoot = path.join(root, "loop");
    const folder = currentLoopFolder(loopRoot);
    if (folder === null) return ["no-looprun"];
    const counter = readLoopCounter(loopRoot, folder);
    if (counter === null) return ["no-looprun"];
    if (counter.looprun !== folder || typeof counter.n !== "number" || !Number.isInteger(counter.n)) return ["no-looprun"];
    // #171 (2026-10-26) ROUND leg — #213 (2026-10-29): the MAINT duty token is
    // RETIRED here too (the %5 round now rides plain; the trip carrier is
    // ctx_gauge-only). The ROUND token rides only on a readable INTEGER round
    // — a legacy/absent/non-integer `round` keeps the pre-#171 line
    // byte-exact (fail-closed).
    const roundToken =
      typeof counter.round === "number" && Number.isInteger(counter.round)
        ? ` ROUND=${counter.round}`
        : "";
    return [`loop=${folder} ITER=${counter.n}${roundToken} log=loop/${folder}/loop_log.md`];
  } catch {
    return ["no-looprun"];
  }
};

// `## maintainer` — for each .md file in maintainer/inbox_planner/
// (excluding README.md): `<filename>: <first line truncated to 80 chars>`
// (max 5 files, then `… (+<k> more)`); then priority.md: its first 10
// lines. No inbox files → `(none)`; priority missing → the fail-closed
// line.
const maintainerSection = (root: string): string[] => {
  const inboxDir = path.join(root, "maintainer", "inbox_planner");
  const files: string[] = [];
  try {
    for (const name of fs.readdirSync(inboxDir)) {
      if (name.toLowerCase().endsWith(".md") && name !== "README.md") files.push(name);
    }
    files.sort();
  } catch {}
  const out: string[] = [];
  if (files.length === 0) {
    out.push("(none)");
  } else {
    for (const name of files.slice(0, 5)) {
      const first = (fileLines(path.join(inboxDir, name)) ?? [""])[0];
      out.push(`${name}: ${trunc(first, 80)}`);
    }
    if (files.length > 5) out.push(`… (+${files.length - 5} more)`);
  }
  const prio = fileLines(path.join(root, "maintainer", "priority.md"));
  if (prio === null) out.push("(priority.md missing)");
  else out.push(...prio.slice(0, 10));
  return out;
};

// `## proposals` — the .md FILENAMES at proposals/ root (files only, no
// subfolders), one per line (sorted); none → `(none)`.
const proposalsSection = (root: string): string[] => {
  const d = path.join(root, "proposals");
  const files: string[] = [];
  try {
    for (const name of fs.readdirSync(d)) {
      if (name.toLowerCase().endsWith(".md") && fs.statSync(path.join(d, name)).isFile()) files.push(name);
    }
    files.sort();
  } catch {}
  return files.length > 0 ? files : ["(none)"];
};

// A sweep hit's CLASS: the PATH (grep's `<path>:<line>:<content>` form —
// the text before the first `:`). LIVE-CLASS = under `maintainer/` or
// `.opencode/`, or exactly `TODO.md` / `README.md` / `WIKI.md`; every other
// path (agent/, loop/, proposals/, …) is DOC-CLASS.
const isLiveHit = (line: string): boolean => {
  const i = line.indexOf(":");
  const p = i >= 0 ? line.slice(0, i) : line;
  return p.startsWith("maintainer/") || p.startsWith(".opencode/") || p === "TODO.md" || p === "README.md" || p === "WIKI.md";
};

// `## markers` — the ready-made marker sweep run verbatim via bash in the
// repo root; the hits are reordered LIVE-CLASS first, then DOC-CLASS, each
// group sorted by the line string (the raw sweep order is the sweep's path
// ARGUMENT order, where the DOC-heavy agent/ hits print first and can crowd
// the live maintainer/TODO markers out of the window); then capped at 20 lines
// (then `… (+<k> more)`); no matches → `(none)`; bash failure → the fail-closed
// line.
const markersSection = (root: string): string[] => {
  let out = "";
  try {
    out = execFileSync("bash", ["-c", MARKER_SWEEP], { cwd: root, encoding: "utf8" });
  } catch (e: any) {
    // grep exits 1 on NO MATCHES (empty stdout) — that is an empty sweep,
    // not a failure (the fail-closed line is only for a real error).
    if (e?.status === 1 && (e?.stdout ?? "") === "" && (e?.stderr ?? "") === "") {
      out = "";
    } else {
      return [`(marker sweep failed: ${firstErrorLine(e)})`];
    }
  }
  const lines = out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "");
  if (lines.length === 0) return ["(none)"];
  // LIVE-CLASS first, then DOC-CLASS, each group sorted by the line string
  // (deterministic); the 20-line cap + steer apply AFTER the ordering.
  const live: string[] = [];
  const doc: string[] = [];
  for (const l of lines) (isLiveHit(l) ? live : doc).push(l);
  live.sort();
  doc.sort();
  const ordered = live.concat(doc);
  const body = ordered.slice(0, 20);
  if (ordered.length > 20) body.push(`… (+${ordered.length - 20} more)`);
  return body;
};
// Assemble the digest: the seven sections IN ORDER, each under its
// `## <name>` header, then the total hard cap 150 lines: truncate the
// LAST section's lines first (content lines only, from the end backwards)
// preserving all seven headers + their `… (…)` steer lines. The 2026-10-22
// raise (60 → 150): at a 60-line cap the markers section was ALWAYS starved
// by the bigger sections in a full-size repo (git ~21 + nap ~42 alone
// exceed it) — live maintainer markers never surfaced in the planner digest
// (measured: the plan24 session's own digest carried 0 marker lines).
const buildDigest = (root: string): string => {
  const sections: [string, string[]][] = [
    ["git", gitSection(root)],
    ["nap", napSection(root)],
    ["todo", todoSection(root)],
    ["loop", loopSection(root)],
    ["maintainer", maintainerSection(root)],
    ["proposals", proposalsSection(root)],
    ["markers", markersSection(root)],
  ];
  const digest: string[] = [];
  for (const [name, body] of sections) {
    digest.push(`## ${name}`);
    digest.push(...body);
  }
  while (digest.length > 150) {
    let i = digest.length - 1;
    while (i >= 0 && (digest[i].startsWith("## ") || digest[i].startsWith("… ("))) i--;
    if (i < 0) break;
    digest.splice(i, 1);
  }
  return digest.join("\n");
};

const TOOL_DESCRIPTION =
  `The planner's init digest — the 6–8-call session-start sequence as ONE capped, deterministic read (no interpretation). Sections IN ORDER: \`## git\` (git log --oneline -20), \`## nap\` (the first 40 lines of agent/handover/handover_planner.md + a read-more steer when truncated), \`## todo\` (the TODO.md open-entry header count + the LAST 15 headers), \`## loop\` (the current looprun: \`loop=<folder> ITER=<n> log=loop/<folder>/loop_log.md\`, + \` ROUND=<r>\` when the counter carries an integer \`round\` (#171; #213 retires the MAINT duty token), or \`no-looprun\` when there is no autorun-* folder or no readable counter), \`## maintainer\` (the maintainer/inbox_planner/ .md files — first line each, max 5 — + priority.md's first 10 lines), \`## proposals\` (the proposals/ root .md filenames), \`## markers\` (the ready-made marker sweep, capped at 20 lines). Empty sections read \`(none)\`; the whole digest is hard-capped at 150 lines (the LAST section's lines truncate first, all seven headers + their steers are preserved). PLANNER ONLY — a non-planner agent gets the one-line refusal instead of the digest. Fire at session start; follow up with a full read only where a section needs a decision.`;

// The input schema — the v1 `args: {}` carried: a plain JSON object schema
// with NO properties (the digest takes no parameters).
const TOOL_INPUT = {
  type: "object",
  additionalProperties: false,
  properties: {},
};

async function execute(_args: unknown, toolContext: { agent?: unknown }): Promise<{ output: string }> {
  // The soft role gate (carried from v1): a non-empty agent that is not a
  // planner gets the EXACT one-line refusal (no digest, no throw).
  const agent = typeof toolContext?.agent === "string" ? toolContext.agent : "";
  if (agent !== "" && !agent.startsWith("planner")) {
    return { output: `state_snapshot is the planner init digest — not for ${agent}` };
  }
  // The digest over the setup-captured repo root. READ-ONLY — every leg
  // fail-closes into its section line; NOTHING is ever written.
  return { output: buildDigest(dir) };
}

const stateSnapshotTool = {
  name: "state_snapshot",
  description: TOOL_DESCRIPTION,
  input: TOOL_INPUT,
  output: { type: "string" },
  execute,
};

// ------------------------------------------------------------------ the plugin module

// The v2 plugin module (the loader decodes the DEFAULT export only). The
// setup captures the repo root (the ONLY deviation from v1's execute-time
// `context.directory`); the teardown disposes the registration.
const plugin: Plugin.Plugin = {
  id: "state_snapshot",
  async setup(ctx) {
    dir = ctx.location.directory;
    const regTool = await ctx.tool.transform((editor) => {
      editor.add(stateSnapshotTool);
    });
    return () => {
      void regTool.dispose();
    };
  },
};

export default plugin;
