// intercept_observer.ts — the v2-native intercept observer (Unit A, TODO #137,
// 2026-10-15). Port of the v1 `.opencode/plugin/intercept_observer.ts`
// surviving feature set (maintainer ruling 2026-10-15 — PAIR/NUMWORD DROPPED).
//
// WHAT IT IS: a v2 plugin (`Plugin.define` shape, the promise surface) with a
// single `ctx.tool.hook("execute.before", …)` hook, active for ALL tools.
// `event.input` is MUTABLE and the core executes the post-hook value (fork
// `packages/core/src/tool.ts:271-280`; the shipped `tool-input-repair.ts`
// proves arg repair at hook level). The hook:
//
// (1) OBSERVATION (log-only, ALL tools): path-anomaly (the C doubled-segment
//   detector with the JSON-escaped `\\` collapse, v1 #134-C) + the
//   out-of-sandbox note (`underRoot` span scan over the JSON-serialized arg)
//   to `.opencode/temp/intercept.log`. The dropped v1 classes — dense runs,
//   numword, the `[left:right]` pair channels (read 2a / write 3a / git-refs
//   3c), the date/session/commit shapes — have NO logic, NO log lines, NO
//   verdicts here.
// (2) READ-SCOPED FUZZY (v1 5.4 + R7 + R7.1): the v2 `read` tool `path` arg,
//   d<=2 AND gap>=2 over the bounded corpus (R7 segment matcher first for
//   >=2-segment rel args, R7.1 dedup collapse pre-check), the strict
//   existence gate (mutates only when the canonical EXISTS and the typed
//   path does NOT — `existsSync(abs)` fast path; the corpus holds only REAL
//   paths), fail-closed, `fuzzy-resolved` / `fuzzy-rejected` lines.
// (3) WRITE-SCOPED FUZZY (v1 R2): the v2 `edit` tool `path` arg at the tighter
//   bar d<=1, same gate, `scope=write` flag. The v2 `write` tool is EXCLUDED
//   (M1 — "new file" is a legal write intent). `block_transfer` does not
//   exist in v2 yet — extend when it ports.
// (4) R8 TYPED-PATH REDIRECT (v1 #97): the 1:1 allowed-root redirect over the
//   typed `path` fields (read/write/edit), fail-closed pass-through on
//   unmappable forms, the `kind=redirect` line (the `pair-resolved` verdict
//   is REUSED — v1 byte-compat, no `pair=` in the evidence), and the
//   out-of-sandbox NOTE is recomputed on the EFFECTIVE args (the redirected
//   field no longer fires it). The #102 bash `command`-string span redirect
//   is OUT of the surviving set (typed fields only — v2 `shell` command
//   strings stay opaque).
// (5) R6 PAYLOAD JOURNAL (v1 2026-09-25): EVERY `write` / `edit` call appends
//   ONE line to `.opencode/temp/journal_write.log` (write) or
//   `journal_edit.log` (edit). Best-effort, NEVER fails the call. The
//   journal's edit `old` field is the ORIGINAL pre-mutation oldString.
// (4b) B' HARD-STOP (v1 #134, 2026-10-01): the EFFECTIVE (post-redirect)
//   write/edit `path` OUTSIDE every allowed root (the R8 set) whose
//   CONTAINING DIRECTORY does not exist -> log ONE `intercept-error` line,
//   then throw (a throwing `execute.before` hook fails the tool call — the
//   v2 failure channel, `packages/plugin/src/promise/adapter.ts:632-641`
//   wraps the rejection into a `Tool.Error`). The catch distinguishes the
//   deliberate throw (log + re-throw) from unexpected errors (one
//   `intercept-error` line, swallowed — the house rule).
//
// V2 FIELD NAMES: read/write/edit take `path` (not v1 `filePath`) — the
// REDIRECT_PATH_FIELDS and WRITE fuzzy tables below use `path`.
//
// V2 MODULE RULE: the v2 loader decodes the module against a DEFAULT export
// of `{ id, setup }` (`packages/core/src/plugin/module.ts:78-91,125-133`) —
// named exports are not consulted, so this file exports the default plugin
// ONLY. The `@opencode/plugin` import is TYPE-ONLY (erased at runtime —
// the host loads this file from the workspace without a node_modules; a
// value import would break the host load).
//
// MODEL ID FIELD: v1 read it from the session DB (`readGauge`, the v1
// `session.model` column). The v2 session table is `session_v2` — the reader
// port is OUT of this unit (the context-family unit). Per the v1 house rule
// (unavailable -> the literal), the field carries `unknown` here.
//
// LINE SHAPE (v1 addendum C7 — byte-stable, pipe-separated, 8 fields):
//   <timestamp> | <session_id> | <model_id> | <tool> | <original-arg> |
//   <evidence> | <context: what the arg is — path / commit-ref / …> |
//   <verdict>
// Surviving verdicts: `path-anomaly`, `out-of-sandbox`, `fuzzy-resolved`,
// `fuzzy-rejected`, `pair-resolved` (R8 kind=redirect lines ONLY), `error`
// (the intercept-error line).
//
// HOUSE RULE (v1 ctx_watchdog header): best-effort, never-throw — ANY
// internal error -> at most ONE `intercept-error`-style line, the hook
// returns silently. The only deliberate throw is the (4b) hard stop.

import type { Plugin } from "@opencode/plugin";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";

// ------------------------------------------------------------------ constants

const MAX_LINES_PER_CALL = 3;
const MAX_FIELD_CHARS = 160;
const CORPUS_TTL_MS = 60_000;
const CORPUS_MAX_ENTRIES = 20_000;
const FUZZY_MAX_D = 2;
const FUZZY_MIN_GAP = 2;
// R2: the WRITE-scope fuzzy accept bar (tighter than read's d<=2).
const WRITE_FUZZY_MAX_D = 1;
// R7: the SEGMENT-level accept bar (both scopes).
const SEG_MAX_D = 1;

// The approved external scratchpad root (v1 R1 — a CODE constant).
const SCRATCHPAD_ROOT = "home/AppData/Local/Temp/opencode";

// #134 C: the doubled-segment detector (v1 core, byte-identical). The
// observation channel scans the JSON-SERIALIZED arg — a typed Windows path
// reads back with DOUBLED backslashes (`C:\\Users\\Users`), which broke the
// adjacency; the hook collapses the escaped `\\` pairs first.
const DOUBLED_RE = /(?:^|[\\/])([^\\/]{1,64})(?:[\\/]\1)(?=[\\/]|$)/gi;

// The note-channel span grammars (v1 core, byte-identical).
const WIN_PATH_RE = /(^|[\s"'=({])([A-Za-z]:[\\/][^\s'"|]*)/g;
const POSIX_PATH_RE = /(^|[\s"'=({])(\/[^\s\\'"|]+)/g;
const UNC_PATH_RE = /(^|[\s"'=({])(\\\\[^\s|]+)/g;

// The surviving verdict ranks (v1 VERDICT_RANK, reduced to the surviving
// classes; the sort is stable, ties keep input order).
const VERDICT_RANK: Record<string, number> = {
  "path-anomaly": 1,
  "out-of-sandbox": 2,
};

// ------------------------------------------------------------------ types

interface Observation {
  verdict: string;
  evidence: string;
  context: string;
}

// The fuzzy resolution result (v1 research §2.2/§2.5, unchanged).
type ReadResolution =
  | { kind: "exact" }
  | { kind: "resolved"; path: string; d: number; gap: number }
  | { kind: "rejected"; cands: Array<[string, number]>; reason: string };

// The v2 `execute.before` event (the promise-surface ToolHooks shape,
// `packages/plugin/src/promise/tool.ts:38-46` — `input` is MUTABLE).
type ToolBeforeEvent = {
  tool: string;
  readonly sessionID: string;
  readonly agent: string;
  readonly messageID: string;
  readonly id: string;
  input: unknown;
};

// ------------------------------------------------------------------ pure helpers

function localStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

function argsToString(args: unknown): string {
  if (typeof args === "string") return args;
  if (args == null) return "";
  try {
    const s = JSON.stringify(args);
    return typeof s === "string" ? s : "";
  } catch {
    return String(args);
  }
}

// Flatten a field so the 8-field " | " shape is byte-stable (v1 core,
// unchanged): newlines -> space, any `|` -> bare `|`, cap at
// MAX_FIELD_CHARS (the `...` marker).
function flattenField(v: string, cap: number = MAX_FIELD_CHARS): string {
  let s = String(v ?? "");
  s = s.replace(/[\r\n\t]+/g, " ").replace(/\s*\|\s*/g, "|");
  if (s.length > cap) s = s.slice(0, cap - 3) + "...";
  return s;
}

// The shared root/span normalization (v1 R8, unchanged): backslashes ->
// slashes, collapse separator runs (a JSON-escaped `\\` in a stringified arg
// reads as `//`), lowercase, trim trailing `/`.
function normSandboxPath(p: string): string {
  return String(p ?? "").replace(/\\/g, "/").replace(/\/{2,}/g, "/").toLowerCase().replace(/\/+$/, "");
}

function underRoot(span: string, root: string): boolean {
  const r = normSandboxPath(root);
  if (r === "") return false;
  const s = normSandboxPath(span);
  return s === r || s.startsWith(r + "/");
}

// Path normalization for the matcher (v1 §2.2 step 2, unchanged).
function normPathForm(p: string): string {
  return String(p ?? "").trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/").toLowerCase();
}

// The relative form of an absolute path against a root (v1 core, unchanged).
function relForm(absPath: string, root: string): string {
  const a = String(absPath ?? "").replace(/\\/g, "/");
  const r = String(root ?? "").replace(/\\/g, "/").replace(/\/+$/, "");
  if (r === "" || a === r) return ".";
  if (a.startsWith(r + "/")) return a.slice(r.length + 1);
  return relative(r, a).replace(/\\/g, "/");
}

const SESSION_ID_RE = /^ses_[0-9a-zA-Z]{8,}$/;
const COMMIT_REF_RE = /^[0-9a-fA-F]{40}$/;
const DATE_CTX_RE = /^\d{4}[-/.]\d{1,2}([-/.]\d{1,2})?$/;
const PATHY_RE =
  /(?:[A-Za-z]:[\\/])|(?:\\{2}[^\s|]+\\+[^\s|]+)|(?:^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)+)|(?:[./][A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*)/;

function classifyContext(arg: string): string {
  const s = String(arg ?? "").trim();
  if (SESSION_ID_RE.test(s)) return "session-id";
  if (COMMIT_REF_RE.test(s)) return "commit-ref";
  if (DATE_CTX_RE.test(s)) return "date";
  if (PATHY_RE.test(s)) return "path";
  return "arg";
}

// #134 C: the doubled-segment observation (v1 core, byte-identical — the
// JSON-escaped `\\` collapse is the port's point).
function observePathAnomaly(arg: string): Observation[] {
  const s = String(arg ?? "").replace(/\\\\/g, "\\");
  const segs: string[] = [];
  for (const m of s.matchAll(DOUBLED_RE)) {
    segs.push(m[1]);
    if (segs.length === 2) break;
  }
  if (segs.length === 0) return [];
  return [{ verdict: "path-anomaly", evidence: `doubled=${[...new Set(segs)].join(",")}`, context: classifyContext(s) }];
}

// The out-of-sandbox note (v1 observation e, unchanged): span scan over the
// JSON-serialized arg; `extraRoots` are allowed roots added ONLY when the
// note is recomputed after a redirect fired.
function observeSandbox(arg: string, workspaceRoot: string | null, extraRoots: string[] = []): Observation[] {
  if (workspaceRoot === null || workspaceRoot === "") return [];
  const s = String(arg ?? "");
  const ctx = classifyContext(s);
  const spans: string[] = [];
  for (const re of [WIN_PATH_RE, POSIX_PATH_RE, UNC_PATH_RE]) {
    re.lastIndex = 0;
    for (const m of s.matchAll(re)) {
      if (m[2] && !spans.includes(m[2])) spans.push(m[2]);
      if (spans.length >= 4) break;
    }
    if (spans.length >= 4) break;
  }
  const outside = spans
    .filter((p) => !underRoot(p, workspaceRoot) && !underRoot(p, SCRATCHPAD_ROOT) && !extraRoots.some((r) => underRoot(p, r)))
    .slice(0, 2);
  if (outside.length === 0) return [];
  return [{ verdict: "out-of-sandbox", evidence: `path=${outside[0]} root=${workspaceRoot}`, context: ctx }];
}

// R8: the 1:1 allowed-root redirect resolver (v1 core, byte-identical, incl.
// the #102 POSIX temp-root prefix mapping). FAIL-CLOSED: 0 or >=2 mappings ->
// null (no mutation).
const POSIX_TEMP_PREFIXES = ["/tmp/", "/var/tmp/"];
function resolveRedirect(span: string, roots: string[]): string | null {
  const s = normSandboxPath(span);
  if (s === "" || !s.includes("/")) return null;
  {
    const p = String(span ?? "").replace(/\\/g, "/");
    const pl = p.toLowerCase();
    for (const prefix of POSIX_TEMP_PREFIXES) {
      const bare = prefix.slice(0, -1);
      if (pl.startsWith(prefix) || pl === bare) {
        const rest = (pl === bare ? "" : p.slice(prefix.length)).replace(/\/{2,}/g, "/").replace(/^\/+|\/+$/g, "");
        return rest === "" ? SCRATCHPAD_ROOT : SCRATCHPAD_ROOT + "/" + rest;
      }
    }
  }
  const base = String(span ?? "").split(/[\\/]+/).filter((seg) => seg !== "").pop();
  if (base === undefined || base === "") return null;
  const seen = new Set<string>();
  const hits: string[] = [];
  for (const rawRoot of roots) {
    const root = String(rawRoot ?? "");
    const r = normSandboxPath(root);
    if (r === "" || !r.includes("/") || seen.has(r)) continue;
    seen.add(r);
    if (s === r) {
      hits.push(root);
      continue;
    }
    const parent = (p: string) => p.slice(0, p.lastIndexOf("/"));
    if (parent(s) === parent(r) && parent(s) !== "") hits.push(root);
  }
  if (hits.length !== 1) return null;
  const root = hits[0];
  if (s === normSandboxPath(root)) return root;
  return root.endsWith("/") ? root + base : root + "/" + base;
}

// Classic two-row Levenshtein (v1 core, byte-identical).
function levenshtein(a: string, b: string): number {
  const s = String(a ?? "");
  const t = String(b ?? "");
  if (s === t) return 0;
  if (s === "") return t.length;
  if (t === "") return s.length;
  let prev = new Array<number>(t.length + 1);
  let cur = new Array<number>(t.length + 1);
  for (let j = 0; j <= t.length; j++) prev[j] = j;
  for (let i = 1; i <= s.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] - cost + 2 * cost);
    }
    const tmp = prev;
    prev = cur;
    cur = tmp;
  }
  return prev[t.length];
}

// The nearest EXISTING directory at or above the absolute path (v1 core,
// unchanged).
function nearestExistingDir(absPath: string): string {
  let d = String(absPath ?? "");
  for (let i = 0; i < 24 && d !== ""; i++) {
    try {
      if (statSync(d).isDirectory()) return d;
    } catch {
      // keep walking up
    }
    const parent = dirname(d);
    if (parent === d) break;
    d = parent;
  }
  return "";
}

// Walk `root` and collect relative paths (v1 core, unchanged: directories
// AND files, skip .git/node_modules, capped, sorted).
function buildCorpus(root: string, cap: number = CORPUS_MAX_ENTRIES): string[] {
  const out: string[] = [];
  const r = String(root ?? "");
  if (r === "" || !existsSync(r)) return out;
  const walk = (d: string): void => {
    if (out.length >= cap) return;
    let entries: string[];
    try {
      entries = readdirSync(d); // the string[] form (statSync per entry —
    } catch {
      return;
    }
    // runtime-equivalent to v1's withFileTypes:true, which @types/node 24
    // types awkwardly under tsc)
    for (const name of entries) {
      if (out.length >= cap) return;
      if (name === ".git" || name === "node_modules") continue;
      const full = join(d, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        out.push(relative(r, full).replace(/\\/g, "/"));
        walk(full);
      } else if (st.isFile()) {
        out.push(relative(r, full).replace(/\\/g, "/"));
      }
    }
  };
  walk(r);
  out.sort();
  return out;
}

// The PURE matcher body (v1 research §2.2/§2.5, unchanged): exact after
// normalize -> `exact`; else Levenshtein over FULL relative paths ->
// `resolved` iff d <= maxD AND gap to the second-closest >= FUZZY_MIN_GAP;
// else `rejected` with top-3 candidates + reason.
function matchNearPath(argRel: string, corpus: string[], maxD: number): ReadResolution {
  const q = normPathForm(argRel);
  if (q === "" || corpus.length === 0) {
    return { kind: "rejected", cands: [], reason: corpus.length === 0 ? "empty-corpus" : "empty-arg" };
  }
  for (const c of corpus) {
    if (normPathForm(c) === q) return { kind: "exact" };
  }
  let best = Infinity;
  let bestPath = "";
  let second = Infinity;
  const scored: Array<[string, number]> = [];
  for (const c of corpus) {
    const d = levenshtein(q, normPathForm(c));
    scored.push([c, d]);
    if (d < best) {
      second = best;
      best = d;
      bestPath = c;
    } else if (d < second) {
      second = d;
    }
  }
  scored.sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
  if (best <= maxD && second - best >= FUZZY_MIN_GAP) {
    return { kind: "resolved", path: bestPath, d: best, gap: second === Infinity ? Infinity : second - best };
  }
  return {
    kind: "rejected",
    cands: scored.slice(0, 3),
    reason: best > maxD ? "d-too-high" : "gap-too-small",
  };
}

function resolveReadPath(argRel: string, corpus: string[]): ReadResolution {
  return matchNearPath(argRel, corpus, FUZZY_MAX_D);
}

function resolveWritePath(argRel: string, corpus: string[]): ReadResolution {
  return matchNearPath(argRel, corpus, WRITE_FUZZY_MAX_D);
}

// R7: the segment-level DP (v1 core, byte-identical).
function segmentDistance(a: string[], b: string[]): [number, number] {
  const m = a.length;
  const n = b.length;
  const dp: Array<Array<[number, number]>> = [];
  for (let i = 0; i <= m; i++) {
    dp.push([]);
    for (let j = 0; j <= n; j++) {
      let v: [number, number];
      if (i === 0 && j === 0) v = [0, 0];
      else if (i === 0) v = [j, 0];
      else if (j === 0) v = [i, 0];
      else {
        const lev = levenshtein(a[i - 1], b[j - 1]);
        const opts: Array<[number, number]> = [
          [dp[i - 1][j][0] + 1, dp[i - 1][j][1]],
          [dp[i][j - 1][0] + 1, dp[i][j - 1][1]],
        ];
        if (lev <= 1) opts.push([dp[i - 1][j - 1][0] + lev, dp[i - 1][j - 1][1] + lev]);
        opts.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
        v = opts[0];
      }
      dp[i].push(v);
    }
  }
  return dp[m][n];
}

function splitSegments(rel: string): string[] {
  return rel.split("/").filter((s) => s !== "");
}

// R7: the PURE segment matcher (v1 core, byte-identical).
function matchNearPathSegments(argRel: string, corpus: string[]): ReadResolution {
  const q = normPathForm(argRel);
  if (q === "" || corpus.length === 0) {
    return { kind: "rejected", cands: [], reason: corpus.length === 0 ? "empty-corpus" : "empty-arg" };
  }
  for (const c of corpus) {
    if (normPathForm(c) === q) return { kind: "exact" };
  }
  const qSegs = splitSegments(q);
  const scored: Array<{ c: string; d: number; cs: number }> = [];
  let best: { c: string; d: number; cs: number } | null = null;
  let second = Infinity;
  for (const c of corpus) {
    const [d, cs] = segmentDistance(qSegs, splitSegments(normPathForm(c)));
    scored.push({ c, d, cs });
    if (best === null || d < best.d || (d === best.d && (cs < best.cs || (cs === best.cs && c < best.c)))) {
      second = best === null ? Infinity : best.d;
      best = { c, d, cs };
    } else if (d < second) {
      second = d;
    }
  }
  scored.sort((x, y) => x.d - y.d || x.cs - y.cs || (x.c < y.c ? -1 : x.c > y.c ? 1 : 0));
  const b = best as { c: string; d: number; cs: number };
  if (b.d <= SEG_MAX_D && second - b.d >= FUZZY_MIN_GAP) {
    return { kind: "resolved", path: b.c, d: b.d, gap: second === Infinity ? Infinity : second - b.d };
  }
  return {
    kind: "rejected",
    cands: scored.slice(0, 3).map((e) => [e.c, e.d] as [string, number]),
    reason: b.d > SEG_MAX_D ? "d-too-high" : "gap-too-small",
  };
}

// R7.1: the STRUCTURAL dedup-collapse pre-check (v1 core, byte-identical).
function collapseAdjacentDup(absPath: string): string | null {
  const p = String(absPath ?? "").trim();
  if (p === "") return null;
  const segs = p.split(/[\\/]/);
  for (let i = 0; i + 1 < segs.length; i++) {
    if (segs[i] === "" || segs[i + 1] === "") continue;
    if (normPathForm(segs[i]) === normPathForm(segs[i + 1])) {
      const sep = p.includes("\\") ? "\\" : "/";
      return segs.slice(0, i + 1).concat(segs.slice(i + 2)).join(sep);
    }
  }
  return null;
}

// ------------------------------------------------------------------ allowed roots (R8)

// The shared JSONC comment stripper (v1 compact_memory/compaction_core
// string-state parser, byte-identical).
function stripJsoncComments(content: string): string {
  if (typeof content !== "string") return "";
  let out = "";
  let i = 0;
  const n = content.length;
  let str: string | null = null;
  while (i < n) {
    const ch = content[i];
    if (str !== null) {
      out += ch;
      if (ch === "\\" && i + 1 < n) {
        out += content[i + 1];
        i += 2;
        continue;
      }
      if (ch === str) str = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      str = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "/" && i + 1 < n && content[i + 1] === "/") {
      while (i < n && content[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && i + 1 < n && content[i + 1] === "*") {
      i += 2;
      while (i < n && !(content[i] === "*" && i + 1 < n && content[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

// R8: the allowed-root basis (v1 #97, ported to read BOTH config shapes —
// the v1 `permission.external_directory` map (the clone config today, v2
// normalizes it in memory) and the v2 native ordered `permissions` array
// (research doc §6 — the later config-conversion unit flips the file; the
// plugin survives either). Resolved ONCE at plugin init from
// `<workspace>/opencode.jsonc`: the `external_directory` allows (`/**`
// stripped), the `references.*.path` values, + the workspace root. Config
// unreadable / malformed -> the fallback roots [workspace root,
// SCRATCHPAD_ROOT]. Never throws (fail-open).
function resolveAllowedRoots(dir: string): string[] {
  const roots: string[] = [];
  let ok = false;
  try {
    const cfg = JSON.parse(stripJsoncComments(readFileSync(join(dir, "opencode.jsonc"), "utf8")));
    const top = cfg && typeof cfg === "object" ? (cfg as Record<string, unknown>) : null;
    const ed = top && top.permission && typeof top.permission === "object" ? (top.permission as Record<string, unknown>) : null;
    const ext = ed && ed.external_directory && typeof ed.external_directory === "object" ? (ed.external_directory as Record<string, unknown>) : null;
    if (ext !== null) {
      for (const [key, val] of Object.entries(ext)) {
        if (val !== "allow" || key === "") continue;
        roots.push(key.endsWith("/**") ? key.slice(0, -3) : key);
      }
    }
    const perms = top && Array.isArray(top.permissions) ? (top.permissions as Array<Record<string, unknown>>) : null;
    if (perms !== null) {
      for (const p of perms) {
        if (p && p.action === "external_directory" && p.effect === "allow" && typeof p.resource === "string" && p.resource !== "") {
          roots.push(p.resource.endsWith("/**") ? p.resource.slice(0, -3) : p.resource);
        }
      }
    }
    const refs = top && top.references && typeof top.references === "object" ? (top.references as Record<string, unknown>) : null;
    if (refs !== null) {
      for (const ref of Object.values(refs)) {
        if (ref && typeof ref === "object" && typeof (ref as Record<string, unknown>).path === "string" && (ref as Record<string, unknown>).path !== "") {
          roots.push((ref as Record<string, string>).path);
        }
      }
    }
    ok = true;
  } catch {
    // config unreadable / malformed -> the fallback roots (fail-open)
  }
  roots.push(dir);
  if (!ok) roots.push(SCRATCHPAD_ROOT);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of roots) {
    const n = normSandboxPath(r);
    if (n === "" || seen.has(n)) continue;
    seen.add(n);
    out.push(r);
  }
  return out;
}

// ------------------------------------------------------------------ hook state

let dir = "";
let allowedRoots: string[] = [];
// Corpus cache (v1 §2.7: TTL-bounded — a stale/empty cache fail-closes to
// "no match", the safe direction). Key = normalized root.
const corpusCache = new Map<string, { at: number; entries: string[] }>();

function logPath(): string {
  return join(dir, ".opencode", "temp", "intercept.log");
}

function appendRaw(line: string): void {
  try {
    const p = logPath();
    mkdirSync(dirname(p), { recursive: true });
    appendFileSync(p, line, "utf8");
  } catch {
    // log-only must never break a tool call — swallow
  }
}

function appendObservation(sid: string, model: string, tool: string, argStr: string, o: Observation): void {
  const fields = [localStamp(), sid || "unknown", model, tool || "unknown", flattenField(argStr), flattenField(o.evidence), flattenField(o.context), o.verdict];
  appendRaw(fields.join(" | ") + "\n");
}

function appendError(sid: string, model: string, tool: string, msg: string): void {
  const fields = [localStamp(), sid || "unknown", model, tool || "unknown", "intercept-error", flattenField(msg), "error", "error"];
  appendRaw(fields.join(" | ") + "\n");
}

function getCorpus(root: string): string[] {
  const key = normPathForm(root);
  const hit = corpusCache.get(key);
  if (hit && Date.now() - hit.at < CORPUS_TTL_MS) return hit.entries;
  const entries = buildCorpus(root);
  corpusCache.set(key, { at: Date.now(), entries });
  return entries;
}

// ------------------------------------------------------------------ the channels

// READ-SCOPED FUZZY (v1 runFuzzyField ported to the v2 `path` field): the
// typed path EXISTS -> untouched (no line — the strict gate fast path);
// else R7.1 dedup collapse pre-check (exists -> mutate + kind=dedup line);
// else R7 segment matcher (>=2-segment rel args only; resolved -> mutate +
// kind=seg line); else the char matcher d<=2/gap>=2 (resolved -> mutate +
// line; rejected -> the fuzzy-rejected line, original arg runs). Never
// throws.
function runFuzzyRead(event: ToolBeforeEvent): Observation | null {
  const input = event.input;
  if (input == null || typeof input !== "object") return null;
  const path = (input as Record<string, unknown>)["path"];
  if (typeof path !== "string" || path.trim() === "") return null;
  const abs = isAbsolute(path) ? path : join(dir || ".", path);
  if (existsSync(abs)) return null; // exact-existing — the tool will find it; never fuzzy
  const collapsed = collapseAdjacentDup(abs);
  if (collapsed !== null && existsSync(collapsed)) {
    (input as Record<string, string>)["path"] = collapsed;
    return {
      verdict: "fuzzy-resolved",
      evidence: `fuzzy kind=dedup scope=read orig=${path} -> ${collapsed} d=0`,
      context: classifyContext(path),
    };
  }
  const root = nearestExistingDir(abs);
  if (root === "") return null; // nowhere to match against — fail silent
  const rel = relForm(abs, root);
  const corpus = getCorpus(root);
  if (splitSegments(normPathForm(rel)).length >= 2) {
    const seg = matchNearPathSegments(rel, corpus);
    if (seg.kind === "exact") return null;
    if (seg.kind === "resolved") {
      (input as Record<string, string>)["path"] = join(root, seg.path);
      return {
        verdict: "fuzzy-resolved",
        evidence: `fuzzy kind=seg scope=read orig=${path} -> ${seg.path} d=${seg.d} gap=${seg.gap === Infinity ? "inf" : seg.gap}`,
        context: classifyContext(path),
      };
    }
  }
  const res = resolveReadPath(rel, corpus);
  if (res.kind === "exact") return null; // normalized-equal — untouched
  if (res.kind === "resolved") {
    (input as Record<string, string>)["path"] = join(root, res.path);
    return {
      verdict: "fuzzy-resolved",
      evidence: `fuzzy orig=${path} -> ${res.path} d=${res.d} gap=${res.gap === Infinity ? "inf" : res.gap}`,
      context: classifyContext(path),
    };
  }
  return {
    verdict: "fuzzy-rejected",
    evidence: `fuzzy orig=${path} cands=${res.cands.map(([p, d]) => `${p} ${d}`).join(",")} reason=${res.reason}`,
    context: classifyContext(path),
  };
}

// WRITE-SCOPED FUZZY (v1 runFuzzyWrite, `edit` only on v2 — M1: the `write`
// tool is EXCLUDED; `block_transfer` does not exist in v2 yet): the d<=1
// bar under the SAME strict gate, `scope=write` flag, one line per field.
// Never throws.
function runFuzzyWrite(event: ToolBeforeEvent): Observation[] {
  const input = event.input;
  if (input == null || typeof input !== "object") return [];
  const path = (input as Record<string, unknown>)["path"];
  if (typeof path !== "string" || path.trim() === "") return [];
  const abs = isAbsolute(path) ? path : join(dir || ".", path);
  if (existsSync(abs)) return []; // exact-existing target — never fuzzy
  const lines: Observation[] = [];
  const collapsed = collapseAdjacentDup(abs);
  if (collapsed !== null && existsSync(collapsed)) {
    (input as Record<string, string>)["path"] = collapsed;
    lines.push({
      verdict: "fuzzy-resolved",
      evidence: `fuzzy kind=dedup scope=write orig=${path} -> ${collapsed} d=0`,
      context: classifyContext(path),
    });
    return lines;
  }
  const root = nearestExistingDir(abs);
  if (root === "") return []; // nowhere to match against — fail silent
  const rel = relForm(abs, root);
  const corpus = getCorpus(root);
  if (splitSegments(normPathForm(rel)).length >= 2) {
    const seg = matchNearPathSegments(rel, corpus);
    if (seg.kind === "exact") return [];
    if (seg.kind === "resolved") {
      (input as Record<string, string>)["path"] = join(root, seg.path);
      lines.push({
        verdict: "fuzzy-resolved",
        evidence: `fuzzy kind=seg scope=write orig=${path} -> ${seg.path} d=${seg.d} gap=${seg.gap === Infinity ? "inf" : seg.gap}`,
        context: classifyContext(path),
      });
      return lines;
    }
  }
  const res = resolveWritePath(rel, corpus);
  if (res.kind === "exact") return []; // normalized-equal — untouched
  if (res.kind === "resolved") {
    (input as Record<string, string>)["path"] = join(root, res.path);
    lines.push({
      verdict: "fuzzy-resolved",
      evidence: `fuzzy scope=write orig=${path} -> ${res.path} d=${res.d} gap=${res.gap === Infinity ? "inf" : res.gap}`,
      context: classifyContext(path),
    });
  } else {
    lines.push({
      verdict: "fuzzy-rejected",
      evidence: `fuzzy scope=write orig=${path} cands=${res.cands.map(([p, d]) => `${p} ${d}`).join(",")} reason=${res.reason}`,
      context: classifyContext(path),
    });
  }
  return lines;
}

// R8 TYPED-PATH REDIRECT (v1 #97, v2 field names): the 1:1 allowed-root
// redirect over the typed `path` fields of read/write/edit. FAIL-CLOSED:
// no 1:1 mapping -> no mutation (the permission gate + the note behave
// exactly as today). On a redirect the out-of-sandbox NOTE is recomputed on
// the EFFECTIVE args (the redirected field no longer fires it). Never
// throws.
const REDIRECT_PATH_FIELDS: Record<string, string[]> = {
  read: ["path"],
  write: ["path"],
  edit: ["path"],
};

function runRedirect(event: ToolBeforeEvent): { lines: Observation[]; fired: boolean } {
  const input = event.input;
  if (input == null || typeof input !== "object") return { lines: [], fired: false };
  const fields = REDIRECT_PATH_FIELDS[event.tool] ?? [];
  if (fields.length === 0) return { lines: [], fired: false };
  const lines: Observation[] = [];
  let fired = false;
  for (const field of fields) {
    const raw = (input as Record<string, unknown>)[field];
    if (typeof raw !== "string" || raw.trim() === "") continue;
    const abs = isAbsolute(raw) ? raw : join(dir || ".", raw);
    const target = resolveRedirect(abs, allowedRoots);
    if (target === null || target === raw) continue; // fail-closed / no-op
    (input as Record<string, string>)[field] = target;
    fired = true;
    lines.push({
      verdict: "pair-resolved", // REUSED (v1 byte-compat — no `pair=` evidence)
      evidence: `kind=redirect tool=${event.tool} arg=${field} orig=${raw} value=${target}`,
      context: classifyContext(raw),
    });
  }
  return { lines, fired };
}

// (5) R6 PAYLOAD JOURNAL: ONE line per `write` / `edit` call (best-effort —
// never fails the call). The effective (post-mutation) args are journaled;
// the edit `old` field is the ORIGINAL, pre-mutation oldString (the
// recovery fallback captures what the model asked for).
function appendJournal(tool: string, sid: string, input: Record<string, unknown>, editOldOriginal?: string): void {
  try {
    const s = (k: string): string => (typeof input[k] === "string" ? (input[k] as string) : "");
    let target = "";
    let payload = "";
    if (tool === "write") {
      target = s("path");
      payload = JSON.stringify(s("content"));
    } else {
      target = s("path");
      const old = editOldOriginal !== undefined ? editOldOriginal : s("oldString");
      payload = JSON.stringify({ path: s("path"), old, new: s("newString") });
    }
    const p = join(dir, ".opencode", "temp", tool === "write" ? "journal_write.log" : "journal_edit.log");
    mkdirSync(dirname(p), { recursive: true });
    appendFileSync(p, `${localStamp()} | ${sid || "unknown"} | ${tool} | ${target} | ${payload}\n`, "utf8");
  } catch {
    // best-effort — never break a tool call
  }
}

// ------------------------------------------------------------------ the hook

// #134 (4b): the DELIBERATE hard-stop error. The before hook throws it for a
// write/edit target OUTSIDE every allowed root whose containing directory
// is missing; the catch below distinguishes it (log ONE `intercept-error`
// line + RE-THROW — a throwing `execute.before` fails the tool call, the v2
// failure channel). Everything else stays swallowed (never a throw out of a
// hook).
class HardStopError extends Error {}

async function onToolBefore(event: ToolBeforeEvent): Promise<void> {
  let sid = "";
  let tool = "";
  let model = "unknown";
  try {
    sid = typeof event.sessionID === "string" ? event.sessionID : "";
    tool = typeof event.tool === "string" ? event.tool : "";
    // captured BEFORE any channel may mutate event.input (field 5 is the
    // ORIGINAL arg — what the model asked for)
    const argStr = argsToString(event.input);
    const isObj = event.input != null && typeof event.input === "object";
    // Pipeline order (v1, reduced): the fuzzy channels (may mutate) -> the
    // R8 redirect (after the fuzzy channels — a path fuzzy-resolved
    // in-sandbox is never redirected) -> observation on the ORIGINAL args
    // (the redirect re-fires the note on the EFFECTIVE args when it fired).
    let fuzzy: Observation[] = [];
    if (tool === "read" && isObj) fuzzy = [runFuzzyRead(event)].filter((f) => f !== null);
    else if (tool === "edit" && isObj) fuzzy = runFuzzyWrite(event); // M1: `write` excluded
    const rd = runRedirect(event);
    let obs =
      argStr === ""
        ? []
        : [...observePathAnomaly(argStr), ...observeSandbox(argStr, dir || null)]
            .sort((a, b) => (VERDICT_RANK[a.verdict] ?? 9) - (VERDICT_RANK[b.verdict] ?? 9))
            .slice(0, MAX_LINES_PER_CALL);
    if (rd.fired) {
      obs = obs.filter((o) => o.verdict !== "out-of-sandbox");
      obs.push(...observeSandbox(argsToString(event.input), dir || null, allowedRoots));
    }
    // the payload journal (EVERY write/edit call — the effective args; the
    // journal's edit `old` = the ORIGINAL oldString, captured BEFORE the
    // channels run — the v1 directive b)
    let editOldOriginal: string | undefined;
    if (tool === "edit" && isObj) editOldOriginal = typeof (event.input as { oldString?: unknown }).oldString === "string" ? (event.input as { oldString: string }).oldString : "";
    if ((tool === "write" || tool === "edit") && isObj) appendJournal(tool, sid, event.input as Record<string, unknown>, editOldOriginal);
    if (obs.length === 0 && rd.lines.length === 0 && fuzzy.length === 0) return; // nothing to log
    // model = `unknown` (the v1 session-DB reader is not ported to the
    // `session_v2` schema — the context-family unit)
    for (const o of rd.lines) appendObservation(sid, model, tool, argStr, o);
    for (const o of obs) appendObservation(sid, model, tool, argStr, o);
    for (const o of fuzzy) appendObservation(sid, model, tool, argStr, o);
    // (4b) HARD-STOP (v1 #134, v2 port): the EFFECTIVE (post-redirect)
    // write/edit `path` OUTSIDE every allowed root whose CONTAINING
    // DIRECTORY does not exist -> log landed (above), now block. Placed
    // AFTER the "nothing to log" early return — v1 order, preserved (a
    // relative out-of-sandbox path with no recognizable span logs nothing
    // and passes silent — the v1 behavior, pinned in the handover).
    // Existing external paths (parent exists) pass to the host permission
    // gate as today; in-root paths (new subdirectories) pass to the
    // write-with-dirs path; a doubled segment inside an allowed root is
    // legal (a log signal only).
    if ((tool === "write" || tool === "edit") && isObj) {
      const fp = (event.input as { path?: unknown }).path;
      if (typeof fp === "string" && fp.trim() !== "") {
        const abs = isAbsolute(fp) ? fp : join(dir || ".", fp);
        if (!allowedRoots.some((r) => underRoot(abs, r)) && !existsSync(dirname(abs))) {
          throw new HardStopError(
            `out-of-sandbox path with missing containing directory: ${abs} — request blocked (fix the path; a permission allow could not write there)`,
          );
        }
      }
    }
  } catch (e) {
    if (e instanceof HardStopError) {
      try {
        appendError(sid, model, tool, e.message);
      } catch {
        // swallow the log failure — still re-throw
      }
      throw e;
    }
    // at most ONE intercept-error line; the hook returns silently (the
    // model read may itself have failed — `unknown` then, never a throw)
    try {
      appendError(sid, model, tool, e instanceof Error ? e.message : String(e));
    } catch {
      // swallow — never throw out of a hook
    }
  }
}

// The v2 plugin module (the loader decodes the DEFAULT export only —
// `packages/core/src/plugin/module.ts:78-91`; no named exports).
const plugin: Plugin.Plugin = {
  id: "intercept",
  async setup(ctx) {
    dir = ctx.location.directory;
    allowedRoots = resolveAllowedRoots(dir); // R8: resolved ONCE at init
    const reg = await ctx.tool.hook("execute.before", (event) => onToolBefore(event));
    return () => reg.dispose();
  },
};

export default plugin;
