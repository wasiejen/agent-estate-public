// context_trim_v2.ts — the v2-NATIVE context-trim plugin (TODO #137 unit 4b,
// 2026-10-22, clone `migration`). Port of the v1 `.opencode/tools/context_trim.ts`
// (1168 lines, the design of record — plan39, Unit 1: report + tail over the
// opencode DB) onto the v2 plugin surfaces: `ctx.tool.transform` + `editor.add`
// (the 4a registration pattern) and `ctx.session.hook("context")` (the 3a draft
// pattern). Auto-discovered from `.opencode/plugins/` (NO `opencode.jsonc` change).
//
// WHAT IT IS: a v2 plugin (`Plugin` shape — DEFAULT export only, the loader
// contract; the `@opencode/plugin` + `@opencode/ai` imports are TYPE-ONLY, erased
// at runtime; the gauge-core import is a VALUE import of plain `.mjs` whose own
// imports are node: builtins only — the context_family.ts pattern). It registers
// TWO things: the `context_trim` tool (report + tail) and ONE `context` draft-
// hook handler (the assembly-time window filter = the tail's effect).
//
// WHY THE v2 LANE IS DIFFERENT (measured at spec-authoring, 2026-10-22, fork @
// current checkout): v2 has NO `tail_start_id` field and NO host lever to rewrite
// one — the model window is simply the `session_message` rows from the LAST
// COMPLETED `compaction` row onward: the endpoint's own description
// (`session.context` — packages/protocol/src/groups/session.ts:569-579) says
// "all messages after the last compaction"; `packages/core/src/session/history.ts`
// picks the newest completed compaction (`latestCompaction`) and loads rows with
// `seq >=` that seq ASCENDING, so the COMPACTION ROW ITSELF IS the window head
// (compaction.ts:690-694: `previousCompaction` — the FIRST row of the window, when
// type compaction + status completed). v1's destructive DB edit (json_set on the
// compaction part row) has NO v2 counterpart and is NOT ported — the row-deletion
// lane was ruled out in v1 (plan39 `turns`) and stays out of scope.
//
// (1) TOOL SURFACE — `ctx.tool.transform((editor) => editor.add(…))`, name
// `context_trim`, a plain JSON-schema input mirroring v1's args: `mode`
// ("report" | "tail"), `session?` (absent = the CALLING session, read off the
// ToolContext — the 4a SELF pattern; v1 required the id), `target?` (report: the
// dry-run anchor; tail: the new BOUNDARY message id), `keepMessages?` (tail: the
// retained-tail MESSAGE COUNT form, mutually exclusive with target), plus the v2
// addition `clear` (the store has no compaction part to re-point, so un-setting
// needs an explicit lane — see DEVIATIONS). `execute` is a plain Promise;
// rejections are impossible (everything guarded). Rejection lines keep v1's plain
// shapes: `report= rejected: <cause>` / `tail-set= rejected: <cause>` /
// `error: <usage>`.
//
// (2) REPORT — READ-ONLY, NO write anywhere. The window rows come from the v2
// session service: `sessionApi.context({sessionID})` = GET `/api/session/:id/
// context` → the CURRENT model window (the session_message rows after the last
// completed compaction, ASC BY seq; the ready report source of the spec's verified
// facts). Rows are read defensively (`unknown`-typed) — the decoded `Session
// Message.Info` union (`id`, `type`, `time`, `tokens`, `content`…). Token mass
// per row = `data.tokens{input,output,reasoning,cache.read,cache.write}` (the
// fork's own `TokenUsage.total()` sum) gated on the fork's completed-assistant
// discriminator (`$.time.completed IS NOT NULL` + `$.tokens` present — gauge
// unit-2 finding); rows without it carry the `bytes4=` estimate (utf8 bytes/4 over
// the row's text fields). The header also rides the SHARED gauge core (v2-paired
// since units 1+2): `readGauge(undefined, sessionID)` + `formatGauge` — no new
// SQL is added for the session/model/ctx figure (the gauge core is the ONLY DB
// reader used; a db-error read prints ONE honest `gauge: db-error …` line and
// never fails the report). Readout forms mirror v1's CUT-DOWN default: (1) the
// window header, (2) NUMBERED rows `row: N <type> id=<id> <mass-label>=<mass> [tool=…
// target=…]` + the `last: N` flag (the ids print inline — the mark lane needs them; anchors
// are v2 message ids), (3) the RECOMMENDATION block, (4) the `biggest:` biggest-
// droppable list (top-5 heaviest finished turns, no error), (5) with `target`:
// the dry-run (remove/keep counts + token masses + the tail verdict, NO write).
//
// (3) TAIL — a persistent per-session BOUNDARY STORE:
// `.opencode/temp/context_trim_v2.json` (`{sessions: {<sid>: {boundary, keep,
// set_at}}}`, fail-open read, additive read-modify-write — every pre-existing
// top-level key survives, the #119 discipline of the budget core). NO DB write
// EVER. Validation is fail-closed against the CURRENT window rows:
// (a) the session exists (the context read + a `session.get` existence probe);
// (b) the target id is one of the window rows (`target-not-found`);
// (c) the target sits STRICTLY AFTER the window head — the head row is the
// summary/checkpoint entry and is never a boundary (`target-at-window-head`, the
// v2 rename of v1's `target-not-before-compaction`);
// (d) the retained tail (rows from the boundary to the window end, INCLUSIVE) is
// >= 6 — the keepMessages floor carries (`retained-tail-below-floor <n>`).
// The keep-COUNT form computes the anchor as `rows.length - keep` and re-runs
// (c)/(d), plus its own `keep-invalid <keep>` (non-integer/non-positive) and
// `keep-exceeds-history <keep>` (keep > window rows) rejections; keep=0 is refused
// by both the keep-invalid guard and the floor. Success returns v1's line:
// `tail-set= <old> -> <new> keep=<retained>`; `clear` returns `tail-set= <old>
// -> none` (idempotent — a second clear reads `none -> none`).
//
// (4) THE HOOK (the tail's EFFECT) — a `ctx.session.hook("context")` handler
// in the SAME plugin: fired per PRIMARY model request with MUTABLE `messages`
// (fork `packages/core/src/session/model-request.ts:422-431` +
// `packages/plugin/src/promise/session.ts:19-33` — `SessionRequest.messages:
// Array<Message>`). It DROPS the draft entries whose `id` matches a window row
// STRICTLY before the boundary — an ASSEMBLY-TIME filter, the persisted history
// UNTOUCHED = v1's non-destructive + reversible semantics (the DB keeps
// everything; the trim can be re-set, cleared, or dies with the process).
// Entries WITHOUT an `id` (the `system`/effort/tool-result projections) and
// entries with an id NOT in the pre-boundary set are KEPT — never reordered,
// NEVER appended to (the 3a APPEND-only discipline of context_family composes:
// both plugins mutate the SAME draft array IN PLACE — fork
// `packages/core/src/plugin/hooks.ts:92-96` passes ONE event object to every
// handler — so either order composes; pinned in the smoke with the REAL
// context_family plugin registered alongside this one). Session gating + no
// stored boundary → SILENT, and NO service call is made.
//
// (5) STALE BOUNDARY (DoD 4) — when a NEW durable compaction row lands, the
// stored boundary sits BEFORE the new window head, i.e. it is NO LONGER one of
// the window rows. The hook then logs ONE `boundary-stale` evidence line (deduped
// per session + boundary id in memory — one line per stale state, not per fire)
// and keeps the WHOLE post-compaction window (fail-open; nothing dropped). The
// store entry is left UNTOUCHED (non-destructive; the tool's `clear` lane or a
// re-set fixes it deliberately).
//
// (6) EVIDENCE LOG — this plugin's own file `.opencode/temp/context_trim_v2.log`
// (the 3a/4a capped-JSON ladder: LINE_CAP 2000, CAPS [500,150,60], the `…` cut
// char, never-throws appends). Kinds: `trim` (ONE line per applied fire: session
// + boundary + dropped-rows/entries + kept-entries), `boundary-stale` (session +
// boundary), `gauge` (the hook's context-read failure: session + capped-120
// preview), `tail` (the store write: session + state set|cleared + boundary +
// keep), `report` (ONE line per tool report call: session + rows + state), `mark`
// (the drop-list write: session + added/removed/total + est), `marks-stale`
// (session + the ignored-mark count, (8)), `apply` (the staged->active move +
// projection, (9)). Best-effort; NEVER throws out of a hook or the tool.
//
// DEVIATIONS vs v1 (header REQUIRED): (a) NO DB write — the tail lane is the
// boundary store + the draft hook filter (there is no `tail_start_id` in v2);
// (b) the report's ROW source is the v2 session service (`session.context`),
// NOT the tool's own SQL/backend chain — the gauge core stays the only DB read
// (the header figure), so the spawn-sqlite3 lane and the v1 table pair are NOT
// re-implemented (the clone's gauge core already covers v1-only DBs);
// (c) the FULL (id+time-per-row) report form and `recommendationOneLiner` (the
// U4 nudge one-liner, a v1 auto_resume channel — auto_resume is skipped in v2,
// order 2) are NOT ported — the CUT-DOWN form is the only form, the anchors
// carry the ids; (d) the recommendation block changes meaning: v1's low = the
// current tail head, high = index 0; v2 lists the trim RANGE — low = the most
// aggressive legal boundary (retention = FLOOR), high = the earliest legal
// boundary after the head (max retention), medium = the midpoint (omitted when
// it coincides); the CURRENT boundary rides the header line instead; (e) the
// `no-completed-compaction` rejection is GONE — the store lever has no compaction
// dependency (a compaction-less window is still a window); (f) `clear` is a NEW
// arg (v1's un-set was the host rewriting its own field); (g) mass categories:
// v1's bytes4 fallback covered part rows; v2 has no part table, so the estimate
// covers the row's text fields (`text`, content-item `text`, shell output, comp
// action summary+recent); (h) the `marker` mode of the v1 tool (the U3 quartet)
// lives in the compact_memory plugin (4a) — NOT duplicated here.
//
// STILL PENDING (unchanged): LIVE v2-host activation waits for the maintainer's
// host runs; registration/config = maintainer domain.
//
// (7) TEST HOOK — `setStoreFileForTest(p)` (the gauge core's setBudgetFileForTest
// pattern): the smoke steers the boundary store at a scratchpad fixture; the
// production host never calls it.
//
// (8) U6 PER-MESSAGE TRIM SET (TODO #190 U6, 2026-10-27, ACT-shape no-fork) —
// `mode:'mark'`: an additive per-message DROP LIST in the same store (per session
// `marks: [messageId, …]` next to `boundary`, order-independent, de-duplicated,
// restart-safe). `ids:[…]` adds window ids, `unmark:[…]` removes, `clear:true`
// empties the mark set ONLY (a stored boundary stays); tail `clear` is the mirror
// (boundary removed, marks stay). Fail-closed, nothing written on rejection:
// `mark-not-found` (id not a window row), `mark-at-window-head` (the head carries
// the summary), `mark-floor` (marks + the inside boundary together leave fewer
// than FLOOR retained rows); success line `mark-set= +<n> -<m> total=<k>
// rows_dropped_est=<tokens>`. The hook (4) drops the pre-boundary ids AND the ids
// in `marks` (a mark outside the window is ignored — ONE `marks-stale` evidence
// line per session+stale-count, deduped like boundary-stale). The report header
// gains `marks=` + `marks-est=`, and per #189 a dedicated line names the store
// window and the request estimate separately: `window_rows != request; request
// also carries system prompt + retained slice; request-est=<gauge CTX>
// window-est=<window rows mass>`. `keepID` is NOT a lever (U4, 8046528) — the
// host's automatic tail sits before the compaction row, out of this filter.
//
// (9) U7 STAGED MARKING + APPLY (TODO #190 U7, 2026-10-27, ACT-shape no-fork) —
// the (8) mark set becomes `staged`: `mark`/`unmark` keep editing the STAGED list
// (continuous and cheap — the hook NEVER drops a staged id), and ONE explicit
// `mode:'apply'` unions it into the `active` set the hook actually drops. Store
// per session: `{ boundary, keep, set_at, staged?, active? }` — a legacy `marks`
// key READ-SEEDS `active` (a pre-U7 store keeps working; the key is replaced on
// the next write). `apply` first PROJECTS the resulting request: the last
// completed request's prompt tokens (gauge `ctx − output` = input + cache.read,
// the spec's verified facts — never hard-coded) MINUS the mass of the NEWLY
// active rows (provider tokens on completed-assistant rows, else bytes/4; the
// bytes/4 count labels the mixed sum `mixed=<c>`). When the projection exceeds
// EIGHTY percent of the gauge-core window value the apply is REFUSED
// (`apply= rejected: over-bound <projected> <bound>`) unless `force:true`; an
// empty staged set is refused (`apply= rejected: nothing-staged`). Success:
// `apply= staged->active n=<k> projected=<p> bound=<b> ok mixed=<c>`. `mark
// clear:true` empties BOTH sets (the tail `clear` keeps BOTH — symmetry kept).
// The report header names `staged=`/`active=`/`active-est=` (replacing the (8)
// marks fields) and gains a `projection:` line for the staged set — the result
// is inspectable BEFORE applying. The mark guards stay fail-closed; the floor
// computes over the UNION (boundary inside-drop ∪ active ∪ staged). Hook: ONLY
// `active` ids drop; a staged-only entry (no boundary, no active) stays SILENT
// (no service call, no line). Line shapes keep their names: `mark-set= total=`
// is the STAGED size, est is over staged; the trim line's `marks=` carries the
// ACTIVE size.

import type { Plugin } from "@opencode/plugin";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// The shared v2-paired gauge core (VALUE import of plain JS — node: builtins
// only). Used for the report header figure + its readout form only.
import { formatGauge, readGauge } from "./scripts/gauge.mjs";

// ------------------------------------------------------------------ constants

const LINE_CAP = 2000;
const CAPS = [500, 150, 60];
const DOT = "\u2026";
const FLOOR = 6; // the keepMessages floor (v1, the maintainer's round-2 ruling)

// ------------------------------------------------------------------ plugin state

let dir = ""; // ctx.location.directory — the repo root the plugin targets
let sessionApi: Plugin.Context["session"] | undefined;
// Per-session+boundary dedup for the `boundary-stale` line (bounded by the
// number of stale states; the entry re-logs only when the boundary id CHANGES).
const staleLogged = new Map<string, string>();
// Per-session dedup for the `marks-stale` line ((8)): keyed by the STALE-COUNT
// string — one line per (session, count-change), not per fire.
const marksStaleLogged = new Map<string, string>();

function storePath(): string {
  return join(dir, ".opencode", "temp", "context_trim_v2.json");
}

function logPath(): string {
  return join(dir, ".opencode", "temp", "context_trim_v2.log");
}

// ------------------------------------------------------------------ log helpers (v1 ladder, byte-shape)

function cap(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + DOT;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
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

function previewOf(e: unknown): string {
  return cap(String((e as { message?: unknown } | undefined)?.message ?? e ?? "").replace(/\r?\n+/g, " | "), 120);
}

// ------------------------------------------------------------------ the boundary store

// Test hook (the setBudgetFileForTest pattern).
let storeOverride = "";
export function setStoreFileForTest(p: string): void {
  storeOverride = p;
}

function storeFile(): string {
  return storeOverride !== "" ? storeOverride : storePath();
}

// Fail-open read: missing / unreadable / malformed / non-object root → an EMPTY
// store view (never a throw, never a silent zero-of-sessions confusion). The
// (9) shape: { boundary, keep, set_at, staged?, active? } — boundary may be
// ABSENT/"" (a marks-only entry); staged/active are de-duplicated arrays of
// message ids; a legacy (8) `marks` key READ-SEEDS `active` (never re-written
// until the next store write).
type StoreEntry = { boundary: string; keep: number; setAt: string; staged: string[]; active: string[] };

function readIds(v: unknown): string[] {
  const out: string[] = [];
  for (const m of Array.isArray(v) ? v : []) {
    if (typeof m === "string" && m !== "" && !out.includes(m)) out.push(m);
  }
  return out;
}

function readStore(): { sessions: Record<string, StoreEntry> } {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(storeFile(), "utf8"));
  } catch {
    return { sessions: {} };
  }
  if (data == null || typeof data !== "object" || Array.isArray(data)) return { sessions: {} };
  const sessions = (data as Record<string, unknown>)["sessions"];
  if (sessions == null || typeof sessions !== "object" || Array.isArray(sessions)) return { sessions: {} };
  const out: Record<string, StoreEntry> = {};
  for (const [sid, entry] of Object.entries(sessions)) {
    if (entry == null || typeof entry !== "object" || Array.isArray(entry)) continue;
    const rec = entry as Record<string, unknown>;
    const boundaryRaw = rec["boundary"];
    const boundary = typeof boundaryRaw === "string" ? boundaryRaw : "";
    const active = readIds(rec["active"] ?? rec["marks"]); // (9) legacy seed
    const staged = readIds(rec["staged"]);
    if (boundary === "" && staged.length === 0 && active.length === 0) continue; // an entry with NO lever is noise
    const keep = rec["keep"];
    const setAt = rec["set_at"];
    out[sid] = {
      boundary,
      keep: typeof keep === "number" && Number.isFinite(keep) ? keep : 0,
      setAt: typeof setAt === "string" ? setAt : "",
      staged,
      active,
    };
  }
  return { sessions: out };
}

// Additive read-modify-write (the #119 invariant): every pre-existing top-level
// key survives; a malformed file is REPLACED (the store's own file — unlike the
// shared budget file, it carries no foreign keys to preserve… but the sessions
// object of OTHER sessions is re-read from disk and preserved anyway).
function writeSessionEntry(sid: string, entry: StoreEntry | null): boolean {
  try {
    let raw: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(readFileSync(storeFile(), "utf8"));
      if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) raw = parsed as Record<string, unknown>;
    } catch {
      // malformed / missing → start from an empty object (the store file is ours)
    }
    let sessions = raw["sessions"];
    if (sessions == null || typeof sessions !== "object" || Array.isArray(sessions)) sessions = {};
    const s = sessions as Record<string, unknown>;
    if (entry == null || (entry.boundary === "" && entry.staged.length === 0 && entry.active.length === 0)) delete s[sid];
    else {
      const rec: Record<string, unknown> = { boundary: entry.boundary, keep: entry.keep, set_at: entry.setAt };
      // (9) the write REPLACES a legacy `marks` key with `staged`/`active`
      if (entry.staged.length > 0) rec["staged"] = entry.staged;
      if (entry.active.length > 0) rec["active"] = entry.active;
      s[sid] = rec;
    }
    raw["sessions"] = s;
    mkdirSync(dirname(storeFile()), { recursive: true });
    writeFileSync(storeFile(), JSON.stringify(raw), "utf8");
    return true;
  } catch {
    return false; // fail-closed: the caller reports the write failure
  }
}

// ------------------------------------------------------------------ row mass + detail helpers (defensive)

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function finite(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

// The fork's own TokenUsage.total() — input+output+reasoning+cache.read+cache
// write (#103 semantics map onto what v2 stores).
function tokenSum(t: Record<string, unknown> | undefined): number {
  if (t == null) return -1;
  const cache = asRecord(t["cache"]);
  const parts = [t["input"], t["output"], t["reasoning"], cache != null ? cache["read"] : undefined, cache != null ? cache["write"] : undefined];
  let sum = 0;
  for (const p of parts) {
    if (typeof p !== "number" || !Number.isFinite(p)) return -1;
    sum += p;
  }
  return sum;
}

// Provider-true mass ONLY for the fork's completed-assistant shape (tokens
// present + time.completed present); everything else is the bytes4 ESTIMATE.
function massOf(r: Record<string, unknown>): { kind: "tokens" | "bytes4"; mass: number } {
  if (r["type"] === "assistant") {
    const time = asRecord(r["time"]);
    const sum = tokenSum(asRecord(r["tokens"]));
    if (sum >= 0 && time != null && time["completed"] != null) return { kind: "tokens", mass: sum };
  }
  return { kind: "bytes4", mass: Math.floor(textBytesOf(r) / 4) };
}

// The row's text fields: `text` (user/synthetic/system/skill), content-item `text`
// (assistant text/reasoning), shell `output.output`, compaction `summary`+`recent`.
function textBytesOf(r: Record<string, unknown>): number {
  let bytes = 0;
  const own = r["text"];
  if (typeof own === "string") bytes += Buffer.byteLength(own, "utf8");
  if (r["type"] === "compaction") {
    for (const k of ["summary", "recent"]) {
      const v = r[k];
      if (typeof v === "string") bytes += Buffer.byteLength(v, "utf8");
    }
  }
  const ownOut = r["output"];
  if (typeof ownOut === "string") bytes += Buffer.byteLength(ownOut, "utf8");
  else {
    const nested = asRecord(ownOut);
    if (nested != null && typeof nested["output"] === "string") bytes += Buffer.byteLength(nested["output"] as string, "utf8");
  }
  for (const item of asArray(r["content"])) {
    const it = asRecord(item);
    if (it == null) continue;
    if (typeof it["text"] === "string") bytes += Buffer.byteLength(it["text"], "utf8");
  }
  return bytes;
}

// Per-tool-part target (v1 spec §8 surface: read → filePath (+offset/limit);
// bash → command (newlines/tabs escaped); webfetch → url; others → name only).
// v2 shape: the assistant content item `{type:'tool', name, state:{status,
// input}}` — the input of the completed/running/error state.
function toolTargets(r: Record<string, unknown>): string {
  let out = "";
  for (const item of asArray(r["content"])) {
    const it = asRecord(item);
    if (it == null || it["type"] !== "tool") continue;
    const name = typeof it["name"] === "string" ? it["name"] : "";
    out += ` tool=${name !== "" ? name : "?"}`;
    const state = asRecord(it["state"]);
    const input = state != null ? asRecord(state["input"]) : undefined;
    if (input == null) continue;
    let target: string | null = null;
    if (name === "read" && typeof input["filePath"] === "string") {
      target = input["filePath"] as string;
      if (Number.isFinite(finite(input["offset"]))) target += ` offset=${String(input["offset"])}`;
      if (Number.isFinite(finite(input["limit"]))) target += ` limit=${String(input["limit"])}`;
    } else if (name === "bash" && typeof input["command"] === "string") {
      target = (input["command"] as string).replace(/\r?\n/g, "\\n").replace(/\t/g, "\\t");
    } else if (name === "webfetch" && typeof input["url"] === "string") {
      target = input["url"] as string;
    }
    if (target != null) out += ` target=${target}`;
  }
  return out;
}

// The one-line hint of a row (the recommendation leg): the first text item, else
// the row's own `text`, else the first tool target, else the type — escaped to
// one line, truncated at 48 chars.
function hintOf(r: Record<string, unknown>): string {
  for (const item of asArray(r["content"])) {
    const it = asRecord(item);
    if (it != null && typeof it["text"] === "string" && (it["text"] as string) !== "") return esc(it["text"] as string);
  }
  if (typeof r["text"] === "string" && (r["text"] as string) !== "") return esc(r["text"] as string);
  const targets = toolTargets(r);
  const m = / target=(.+)$/.exec(targets);
  if (m != null) return cap(m[1], 48);
  return String(typeof r["type"] === "string" ? r["type"] : "?");
}

function esc(s: string): string {
  return s.replace(/\r?\n/g, "\\n").replace(/\t/g, "\\t");
}

// The read / thought / shell mass split of a row SET (an ESTIMATE — the per-
 // category bytes floored to /4; the category totals need not sum to massOf).
// Categories (v2 shapes): read = the tool-content bytes of the `read`/`webfetch`
// items; thought = the text/reasoning item texts + the user/system/skill texts;
// shell = the tool-content bytes of `bash` items.
function splitOf(rows: Array<Record<string, unknown>>): { read: number; thought: number; shell: number } {
  let read = 0;
  let thought = 0;
  let shell = 0;
  for (const r of rows) {
    if (r["type"] !== "assistant") {
      if (typeof r["text"] === "string") thought += Buffer.byteLength(r["text"] as string, "utf8");
      continue;
    }
    for (const item of asArray(r["content"])) {
      const it = asRecord(item);
      if (it == null) continue;
      if (it["type"] === "text" || it["type"] === "reasoning") {
        if (typeof it["text"] === "string") thought += Buffer.byteLength(it["text"] as string, "utf8");
      } else if (it["type"] === "tool") {
        const state = asRecord(it["state"]);
        let contentBytes = 0;
        if (state != null) {
          for (const part of asArray(state["content"])) {
            const p = asRecord(part);
            if (p != null && typeof p["text"] === "string") contentBytes += Buffer.byteLength(p["text"], "utf8");
          }
        }
        const name = typeof it["name"] === "string" ? it["name"] : "";
        if (name === "read" || name === "webfetch") read += contentBytes;
        else if (name === "bash") shell += contentBytes;
      }
    }
  }
  return { read: Math.floor(read / 4), thought: Math.floor(thought / 4), shell: Math.floor(shell / 4) };
}

function massSum(rows: Array<Record<string, unknown>>): number {
  let s = 0;
  for (const r of rows) s += massOf(r).mass;
  return s;
}

function idOf(r: Record<string, unknown>): string {
  return typeof r["id"] === "string" ? r["id"] : "";
}

// The (8)/(9) mark-set estimated dropped mass: the massOf-sum of window rows at
// index >= 1 whose id is in the set (ids outside the window / at the head
// contribute 0 — the hook ignores them the same way).
function markEstimate(rows: Array<Record<string, unknown>>, marks: string[]): number {
  return idsMass(rows, marks).mass;
}

// (9) the mass AND the bytes/4 (estimate) part count of an id-set against the
// window rows — the apply projection source (`mixed=` labels the estimate).
function idsMass(rows: Array<Record<string, unknown>>, ids: string[]): { mass: number; mixed: number } {
  let mass = 0;
  let mixed = 0;
  for (const id of ids) {
    const i = rows.findIndex((r) => idOf(r) === id);
    if (i < 1) continue;
    const m = massOf(rows[i]);
    mass += m.mass;
    if (m.kind === "bytes4") mixed++;
  }
  return { mass, mixed };
}

// ------------------------------------------------------------------ the window read

// Reads the CURRENT model window: the v2 session service's `context` method
// (GET /api/session/:id/context — all rows after the last completed compaction,
// ASC BY seq, the head row included). Outcomes: ok (rows), not-found (no such
// session — a `session.get` probe discriminates), failed (any other service
// error — the capped preview rides the caller's evidence line). NEVER throws.
type WindowRead = { ok: true; rows: Array<Record<string, unknown>> } | { ok: false; reason: "not-found" | "failed"; preview: string };

async function readWindow(sid: string): Promise<WindowRead> {
  const api = sessionApi;
  const context = api?.context;
  if (typeof context !== "function") return { ok: false, reason: "failed", preview: "session.context is unavailable on this host" };
  try {
    const out = await (context as (i: { sessionID: string }) => Promise<unknown>)({ sessionID: sid });
    if (!Array.isArray(out)) return { ok: false, reason: "failed", preview: "context output is not an array" };
    const rows: Array<Record<string, unknown>> = [];
    for (const item of out) {
      const r = asRecord(item);
      if (r != null) rows.push(r);
    }
    return { ok: true, rows };
  } catch (e) {
    const preview = previewOf(e);
    // Existence probe: a MISSING session fails the get as well → the honest
    // session-not-found line; a PRESENT session means the context read itself
    // failed (a real read failure, not a wrong id).
    try {
      const get = api?.get;
      if (typeof get !== "function") throw new Error("session.get unavailable");
      const info = await (get as (i: { sessionID: string }) => Promise<unknown>)({ sessionID: sid });
      if (info == null) return { ok: false, reason: "not-found", preview };
      return { ok: false, reason: "failed", preview };
    } catch (e2: unknown) {
      const p2 = previewOf(e2);
      if (/not.found/i.test(p2) || /NotFound/i.test(p2)) return { ok: false, reason: "not-found", preview: p2 };
      return { ok: false, reason: "failed", preview };
    }
  }
}

function isHeadCompaction(rows: Array<Record<string, unknown>>): boolean {
  const first = rows[0];
  return first != null && first["type"] === "compaction" && first["status"] === "completed";
}

// ------------------------------------------------------------------ reportWindow (READ-ONLY)

async function reportWindow(sid: string, target?: string): Promise<string> {
  const read = await readWindow(sid);
  if (!read.ok) {
    if (read.reason === "not-found") return `session ${sid}\nreport= rejected: session-not-found`;
    return `session ${sid}\nerror: context-read-failed: ${read.preview}`;
  }
  const rows = read.rows;
  const headIsCompaction = isHeadCompaction(rows);
  // The earliest legal boundary index: 0 is the window HEAD (the summary/check-
  // point entry — never a boundary), so the first legal index is 1; an EMPTY
  // window has no legal boundary at all.
  const aMin = 1;
  const store = readStore();
  const entry = store.sessions[sid];
  const staged = entry?.staged ?? [];
  const active = entry?.active ?? [];
  const storedIndex = entry != null && entry.boundary !== "" ? rows.findIndex((r) => idOf(r) === entry.boundary) : -1;
  // inside = the boundary is a legal window boundary; stale = it is stored but
  // NOT legal in the CURRENT window (buried by a new compaction row, at the
  // head, or its row is gone); a marks-only entry (boundary "") is absent.
  const state = entry == null || entry.boundary === "" ? "absent" : storedIndex >= aMin ? "inside" : "stale";
  const retained = state === "inside" ? rows.length - storedIndex : rows.length;

  // (2) the shared gauge-core figure (the v2-paired session/mass read — no new
  // SQL). A db-error read is ONE honest line; the report survives. Read BEFORE
  // the header block: the #189 line names its CTX as the request estimate.
  const g = await readGauge(undefined, sid);
  const gr = g as { kind?: unknown; error?: unknown; ctx?: unknown; window?: unknown; output?: unknown };
  // (9) the projection quantities — the LAST completed request's PROMPT tokens
  // (gauge ctx − output = input + cache.read, the spec's verified facts) and the
  // eighty-percent bound off the gauge-core window value. Any gauge leg missing
  // prints `unavailable` honestly (never a guessed number).
  const gCtx = typeof gr.ctx === "number" && Number.isFinite(gr.ctx) ? gr.ctx : undefined;
  const gOut = typeof gr.output === "number" && Number.isFinite(gr.output) ? gr.output : undefined;
  const gWin = typeof gr.window === "number" && Number.isFinite(gr.window) ? gr.window : undefined;
  const lastReq = gCtx != null ? (gOut != null ? gCtx - gOut : gCtx) : undefined;
  const stagedEst = markEstimate(rows, staged);
  const bound = gWin != null ? Math.floor(gWin * 0.8) : undefined;
  const projected = lastReq != null ? lastReq - stagedEst : undefined;

  const lines: string[] = [`session ${sid}`];
  const head = rows[0] != null ? idOf(rows[0]) : "none";
  const headType = rows[0] != null ? String(rows[0]["type"] ?? "?") : "empty";
  lines.push(
    `header: head=${head} head-type=${headType} rows=${rows.length} boundary=${entry != null && entry.boundary !== "" ? entry.boundary : "none"}` +
      ` boundary-state=${state} retained=${retained} staged=${staged.length} active=${active.length} active-est=${markEstimate(rows, active)}`,
  );
  // (#189, bundled into (8)): the store window is NOT the model request — name
  // both quantities separately so the window map can never be read as one.
  lines.push(
    "window_rows != request; request also carries system prompt + retained slice" +
      ` request-est=${gCtx != null ? String(gCtx) : "unavailable"} window-est=${massSum(rows)}`,
  );
  // (9) the projection line — the staged set inspectable BEFORE applying.
  lines.push(
    "projection: last-req=" + (lastReq != null ? String(lastReq) : "unavailable") +
      ` staged-est=${stagedEst} projected=` + (projected != null ? String(projected) : "unavailable") +
      " bound=" + (bound != null ? String(bound) : "unavailable") +
      (projected != null && bound != null ? (projected > bound ? " over" : " ok") : ""),
  );
  if (gr.kind === "db-error") {
    lines.push(`gauge: db-error ${cap(String(gr.error ?? "").replace(/\r?\n+/g, " | "), 120)}`);
  } else {
    lines.push(`gauge: ${formatGauge(g)}`);
  }

  // (2b) the numbered rows (the CUT-DOWN form — ids stay internal; anchors come
  // via the option lines).
  rows.forEach((r, i) => {
    const m = massOf(r);
    lines.push(`row: ${i + 1} ${String(r["type"] ?? "?")} id=${idOf(r)} ${m.kind}=${m.mass}${toolTargets(r)}`);
  });
  lines.push(`last: ${rows.length}`);

  // (3) the RECOMMENDATION block — the trim RANGE (deviation (d)): emitted only
  // when a trim range exists (a boundary can sit at index >= 1 and still leave
  // the floor). low = the most aggressive legal boundary (retention = FLOOR),
  // high = the earliest legal one (max retention), medium = the midpoint.
  if (rows.length - aMin >= FLOOR) {
    const low = rows.length - FLOOR; // the floor retention (drops the most)
    const high = aMin; // keeps the most
    const opts: { idx: number; label: string }[] = [];
    opts.push({ idx: low, label: "low" });
    const mid = Math.floor((low + high) / 2);
    if (mid !== low && mid !== high) opts.push({ idx: mid, label: "medium" });
    if (high !== low) opts.push({ idx: high, label: "high" });
    for (const o of opts) {
      const keptRows = [rows[0], ...rows.slice(o.idx)]; // the head row is always kept
      const droppedRows = rows.slice(1, o.idx);
      const rSplit = splitOf(keptRows);
      const dSplit = splitOf(droppedRows);
      lines.push(
        `option ${o.label}: msg=${idOf(rows[o.idx])} keep=${rows.length - o.idx}` +
          ` retained=${massSum(keptRows)} (read=${rSplit.read} thought=${rSplit.thought} shell=${rSplit.shell})` +
          ` dropped=${massSum(droppedRows)} (read=${dSplit.read} thought=${dSplit.thought} shell=${dSplit.shell})` +
          ` hint=${hintOf(rows[o.idx])}`,
      );
    }
  }

  // (4) the biggest-droppable list: the top-5 heaviest FINISHED turns (no
  // error) strictly after the head (the head is never droppable).
  const turns: { row: number; mass: number }[] = [];
  rows.forEach((r, i) => {
    if (i === 0) return;
    if (r["type"] !== "assistant") return;
    const time = asRecord(r["time"]);
    if (time == null || time["completed"] == null) return;
    if (r["error"] != null) return;
    turns.push({ row: i + 1, mass: massOf(r).mass });
  });
  turns.sort((a, b) => b.mass - a.mass || a.row - b.row);
  const big = turns.slice(0, 5);
  if (big.length > 0) lines.push(`biggest: ${big.map((b) => `${b.row}=${b.mass}`).join(" ")}`);

  // (5) the dry-run (with target) — the tail validation, NO write. Like v1, the
  // counts print for `ok` AND for the floor rejection (a computable target).
  if (target != null) {
    const verdict = tailVerdict(rows, target);
    if (verdict === "ok" || verdict.startsWith("rejected: retained-tail-below-floor")) {
      const i = rows.findIndex((r) => idOf(r) === target);
      const oldStart = state === "inside" ? storedIndex : 0;
      const removeCount = i > oldStart ? i - oldStart : 0;
      const removeMass = removeCount > 0 ? massSum(rows.slice(oldStart, i)) : 0;
      const keepCount = rows.length - i;
      const keepMass = massSum(rows.slice(i));
      lines.push(`dry-run: target=${target} remove=${removeCount} (${removeMass} tokens) keep=${keepCount} (${keepMass} tokens) verdict=${verdict}`);
    } else {
      lines.push(`dry-run: target=${target} verdict=${verdict}`);
    }
  }
  appendLog(buildLine("report", { session: sid, state, rows: String(rows.length), staged: String(staged.length), active: String(active.length), target: target != null ? target : undefined }, {}));
  return lines.join("\n");
}

// The tail validation against the CURRENT window rows — `ok` or `rejected:
// <cause>` (the shared guard of the dry-run and the write lane).
function tailVerdict(rows: Array<Record<string, unknown>>, targetID: string): string {
  if (rows.length === 0) return "rejected: target-not-found";
  const i = rows.findIndex((r) => idOf(r) === targetID);
  if (i < 0) return "rejected: target-not-found";
  if (i < 1) return "rejected: target-at-window-head";
  const retained = rows.length - i;
  if (retained < FLOOR) return `rejected: retained-tail-below-floor ${retained}`;
  return "ok";
}

// ------------------------------------------------------------------ tailSet (the STORE write)

async function tailSet(sid: string, form: { target?: string; keep?: number; clear?: boolean }): Promise<string> {
  if (form.clear === true) {
    const before = readStore().sessions[sid];
    // (9) mirror symmetry: tail `clear` removes the BOUNDARY and leaves the
    // STAGED + ACTIVE sets ALONE (mark `clear` is the mirror — empties both
    // sets, keeps the boundary) — the entry is deleted only when nothing is left.
    const keepSets = before != null && (before.staged.length > 0 || before.active.length > 0);
    const okWrite = keepSets
      ? writeSessionEntry(sid, { boundary: "", keep: 0, setAt: before.setAt, staged: before.staged, active: before.active })
      : writeSessionEntry(sid, null);
    if (!okWrite) return `tail-set= error: store-write-failed (the boundary file could not be written)`;
    appendLog(buildLine("tail", { session: sid, state: "cleared", from: before != null && before.boundary !== "" ? before.boundary : undefined, marks: keepSets ? String(before.staged.length + before.active.length) : undefined }, {}));
    staleLogged.delete(sid);
    return `tail-set= ${before != null && before.boundary !== "" ? before.boundary : "none"} -> none`;
  }
  const read = await readWindow(sid);
  if (!read.ok) {
    if (read.reason === "not-found") return `tail-set= rejected: session-not-found`;
    return `tail-set= error: context-read-failed: ${read.preview}`;
  }
  const rows = read.rows;
  let targetID: string;
  let retained: number;
  if (form.keep != null) {
    const keep = form.keep;
    if (!Number.isInteger(keep) || keep <= 0) return `tail-set= rejected: keep-invalid ${String(keep)}`;
    if (keep > rows.length) return `tail-set= rejected: keep-exceeds-history ${String(keep)}`;
    const i = rows.length - keep;
    if (i < 1) return `tail-set= rejected: keep-at-window-head ${String(keep)}`;
    targetID = idOf(rows[i]);
    retained = keep;
    if (retained < FLOOR) return `tail-set= rejected: retained-tail-below-floor ${retained}`;
  } else {
    targetID = form.target ?? "";
    const verdict = tailVerdict(rows, targetID);
    if (verdict !== "ok") return `tail-set= ${verdict}`;
    retained = rows.length - rows.findIndex((r) => idOf(r) === targetID);
  }
  if (targetID === "") return `tail-set= rejected: target-not-found`;
  const before = readStore().sessions[sid];
  if (!writeSessionEntry(sid, { boundary: targetID, keep: retained, setAt: new Date().toISOString(), staged: before?.staged ?? [], active: before?.active ?? [] })) {
    return `tail-set= error: store-write-failed (the boundary file could not be written)`;
  }
  staleLogged.delete(sid);
  appendLog(buildLine("tail", { session: sid, state: "set", boundary: targetID, keep: String(retained), from: before != null && before.boundary !== "" ? before.boundary : undefined }, {}));
  return `tail-set= ${before != null && before.boundary !== "" ? before.boundary : "none"} -> ${targetID} keep=${retained}`;
}

// ------------------------------------------------------------------ markSet (the (8)/(9) staged drop-list store write)

async function markSet(sid: string, form: { ids?: string[]; unmark?: string[]; clear?: boolean }): Promise<string> {
  if (form.clear === true) {
    const before = readStore().sessions[sid];
    // (9) mark `clear` empties BOTH sets (staged AND active) and keeps a stored
    // boundary (the tail `clear` is the mirror — it keeps both sets).
    const removed = before != null ? before.staged.length + before.active.length : 0;
    if (before != null && removed > 0) {
      if (!writeSessionEntry(sid, { boundary: before.boundary, keep: before.keep, setAt: new Date().toISOString(), staged: [], active: [] }))
        return `mark-set= error: store-write-failed (the boundary file could not be written)`;
      marksStaleLogged.delete(sid);
      appendLog(buildLine("mark", { session: sid, added: "0", removed: String(removed), total: "0", est: "0" }, {}));
      return `mark-set= +0 -${removed} total=0 rows_dropped_est=0`;
    }
    return `mark-set= +0 -0 total=0 rows_dropped_est=0`; // idempotent — nothing stored
  }
  const read = await readWindow(sid);
  if (!read.ok) {
    if (read.reason === "not-found") return `mark-set= rejected: session-not-found`;
    return `mark-set= error: context-read-failed: ${read.preview}`;
  }
  const rows = read.rows;
  const entry = readStore().sessions[sid];
  const current = entry?.staged ?? [];
  const active = entry?.active ?? [];
  const dropUnmark = new Set(form.unmark ?? []);
  const kept = current.filter((m) => !dropUnmark.has(m)); // un-marking needs NO window (stale ids un-mark too)
  const removed = current.length - kept.length;
  const newIds: string[] = [];
  for (const id of form.ids ?? []) {
    if (current.includes(id) || newIds.includes(id)) continue; // already staged — no-op, not re-validated
    const i = rows.findIndex((r) => idOf(r) === id);
    if (i < 0) return `mark-set= rejected: mark-not-found`;
    if (i === 0) return `mark-set= rejected: mark-at-window-head`;
    newIds.push(id);
  }
  const staged = [...kept, ...newIds];
  // (9) the floor guard over the UNION: the boundary inside-drop PLUS the ACTIVE
  // set PLUS the staged result must leave >= FLOOR retained rows (a staged id
  // becomes a drop at apply — the guard pre-computes the apply outcome).
  const dropIdx = new Set<number>();
  const boundary = entry?.boundary ?? "";
  if (boundary !== "") {
    const bi = rows.findIndex((r) => idOf(r) === boundary);
    if (bi >= 1) for (let k = 0; k < bi; k++) dropIdx.add(k);
  }
  for (const m of [...active, ...staged]) {
    const i = rows.findIndex((r) => idOf(r) === m);
    if (i >= 1) dropIdx.add(i);
  }
  const retained = rows.length - dropIdx.size;
  if (retained < FLOOR) return `mark-set= rejected: mark-floor ${retained}`;
  const est = markEstimate(rows, staged);
  if (!writeSessionEntry(sid, { boundary, keep: entry?.keep ?? 0, setAt: new Date().toISOString(), staged, active }))
    return `mark-set= error: store-write-failed (the boundary file could not be written)`;
  marksStaleLogged.delete(sid);
  appendLog(buildLine("mark", { session: sid, added: String(newIds.length), removed: String(removed), total: String(staged.length), est: String(est) }, {}));
  return `mark-set= +${newIds.length} -${removed} total=${staged.length} rows_dropped_est=${est}`;
}

// ------------------------------------------------------------------ applySet (the (9) staged->active move + projection)

const BOUND_FRAC = 0.8; // the hard apply bound: eighty percent of the gauge-core window value

// Moves `staged` into `active` (union, staged emptied) ONLY after the projected
// request size passes the bound; a rejection writes NOTHING (fail-closed, like
// every other guard). Projection: last completed request prompt (gauge ctx −
// output = input + cache.read) minus the mass of the NEWLY active rows; the
// bytes/4 part of that sum is counted and labeled `mixed=`. An over-bound apply
// rides `force:true` deliberately (the bound is a guard rail, not a wall).
async function applySet(sid: string, force: boolean): Promise<string> {
  const entry = readStore().sessions[sid];
  const staged = entry?.staged ?? [];
  if (staged.length === 0) return `apply= rejected: nothing-staged`;
  const read = await readWindow(sid);
  if (!read.ok) {
    if (read.reason === "not-found") return `apply= rejected: session-not-found`;
    return `apply= error: context-read-failed: ${read.preview}`;
  }
  const g = await readGauge(undefined, sid);
  const gr = g as { ctx?: unknown; window?: unknown; output?: unknown };
  const gCtx = typeof gr.ctx === "number" && Number.isFinite(gr.ctx) ? gr.ctx : undefined;
  const gOut = typeof gr.output === "number" && Number.isFinite(gr.output) ? gr.output : undefined;
  const gWin = typeof gr.window === "number" && Number.isFinite(gr.window) ? gr.window : undefined;
  if (gCtx == null || gWin == null) return `apply= error: gauge-unavailable (the projection needs the gauge core's ctx + window)`;
  const lastReq = gOut != null ? gCtx - gOut : gCtx;
  const { mass, mixed } = idsMass(read.rows, staged);
  const projected = lastReq - mass;
  const bound = Math.floor(gWin * BOUND_FRAC);
  if (projected > bound && !force) return `apply= rejected: over-bound ${projected} ${bound}`;
  const active = [...(entry?.active ?? [])];
  for (const id of staged) if (!active.includes(id)) active.push(id);
  if (!writeSessionEntry(sid, { boundary: entry?.boundary ?? "", keep: entry?.keep ?? 0, setAt: new Date().toISOString(), staged: [], active }))
    return `apply= error: store-write-failed (the boundary file could not be written)`;
  marksStaleLogged.delete(sid);
  appendLog(buildLine("apply", { session: sid, n: String(staged.length), projected: String(projected), bound: String(bound), mixed: String(mixed), forced: force ? "true" : undefined }, {}));
  return `apply= staged->active n=${staged.length} projected=${projected} bound=${bound} ok mixed=${mixed}`;
}

// ------------------------------------------------------------------ the context draft hook

// The per-PRIMARY-request filter (NEVER throws). Wire-defensive throughout:
// the handler binds the real `SessionContext` shapes but reads everything
// through `unknown` guards.
async function onContext(event: { sessionID?: unknown; messages?: unknown }): Promise<void> {
  try {
    const sid = str(event.sessionID);
    if (sid == null) return; // session gating: no request id -> silent skip
    const entry = readStore().sessions[sid];
    if (entry == null) return; // no boundary and no marks -> SILENT, no service call
    // (9) the hook drops ONLY `active` ids — a staged-only entry (no boundary,
    // no active) is fully SILENT (no service call, no line): marking is cheap
    // and continuous; one `apply` makes it effective.
    if (entry.boundary === "" && entry.active.length === 0) return;
    if (!Array.isArray(event.messages)) {
      appendLog(buildLine("gauge", { session: sid, reason: "messages-not-array" }, {}));
      return;
    }
    const messages = event.messages as Array<{ id?: unknown }>;
    const read = await readWindow(sid);
    if (!read.ok) {
      // A failed read must NOT trim blindly — fail-open (keep everything).
      appendLog(buildLine("gauge", { session: sid, reason: read.reason === "not-found" ? "session-not-found" : "context-read-failed", preview: read.preview }, {}));
      return;
    }
    const rows = read.rows;
    const drop = new Set<string>();
    let bIdx = -1; // -1 = NO boundary applied (absent or stale)
    if (entry.boundary !== "") {
      const i = rows.findIndex((r) => idOf(r) === entry.boundary);
      if (i < 1) {
        // (5) the boundary is NOT inside the current window (a new completed
        // compaction row landed / the row is gone) -> ONE boundary-stale line
        // (deduped per session+boundary) and the boundary rule drops NOTHING —
        // (9) the ACTIVE-set rule below still applies (the filters are independent).
        if (staleLogged.get(sid) !== entry.boundary) {
          staleLogged.set(sid, entry.boundary);
          appendLog(buildLine("boundary-stale", { session: sid, boundary: entry.boundary, where: i < 0 ? "not-in-window" : "at-window-head" }, {}));
        }
      } else {
        bIdx = i;
        // Drop exactly the draft entries carrying a pre-boundary row id; keep
        // everything else (id-less projections, everything at/after the
        // boundary) IN ORDER — in-place, NO append (the composition pin).
        for (const r of rows.slice(0, i)) {
          const id = idOf(r);
          if (id !== "") drop.add(id);
        }
      }
    }
    // (9) the ACTIVE set: drop the window rows at index >= 1 whose ids are
    // active (the HEAD is never droppable); an active id no longer in the window
    // is IGNORED, logged once per (session, stale-count) as marks-stale.
    let staleMarks = 0;
    for (const m of entry.active) {
      const idx = rows.findIndex((r) => idOf(r) === m);
      if (idx < 1) staleMarks++;
      else drop.add(m);
    }
    if (staleMarks > 0 && marksStaleLogged.get(sid) !== String(staleMarks)) {
      marksStaleLogged.set(sid, String(staleMarks));
      appendLog(buildLine("marks-stale", { session: sid, staleMarks: String(staleMarks), marksTotal: String(entry.active.length) }, {}));
    }
    if (drop.size === 0) return; // stale boundary + all marks stale -> nothing dropped, no trim line
    let dropped = 0;
    for (let k = messages.length - 1; k >= 0; k--) {
      const id = messages[k]?.id;
      if (typeof id === "string" && drop.has(id)) {
        messages.splice(k, 1);
        dropped++;
      }
    }
    appendLog(
      buildLine(
        "trim",
        { session: sid, boundary: entry.boundary !== "" ? entry.boundary : "none", boundaryIndex: bIdx >= 1 ? String(bIdx) : "none", marks: String(entry.active.length), droppedRows: String(drop.size), droppedEntries: String(dropped), keptEntries: String(messages.length) },
        {},
      ),
    );
  } catch {
    // the v1 house rule: never throw out of a hook — a defensive failure keeps
    // the whole window (fail-open).
  }
}

// ------------------------------------------------------------------ the tool surface

const TOOL_DESCRIPTION =
  "Reports and trims a session's model context on the v2 session store (NO DB write). `mode:'report'` — READ-ONLY window map: the window = the session_message rows from the LAST completed compaction row onward (the v2 model window); the header names the head row, the row count, the stored BOUNDARY (inside/stale/absent), the retained count and the STAGED/ACTIVE drop-set counts (active dropped-mass est); then a `window_rows != request` line (the request also carries system prompt + retained slice); then a `projection:` line (last-req, staged-est, projected, bound, ok|over — the staged set's apply outcome, inspectable before applying); then NUMBERED rows (id + type + mass — provider tokens for completed assistant rows, else bytes/4 — plus tool-target detail: read filePath (+offset/limit), bash command, webfetch url), the `last: N` flag, the low/medium/high trim-RANGE options (anchors with keep counts, read/thought/shell splits and a hint), the `biggest:` top-5 heaviest finished turns, and with `target` a dry-run (remove/keep counts + masses + the tail verdict — no write). `mode:'tail'` — WRITE to the boundary store `.opencode/temp/context_trim_v2.json`: set the boundary (the new first-kept message id) by `target` or by `keepMessages` (a MESSAGE COUNT, mutually exclusive with target), or REMOVE it with `clear`. `mode:'mark'` — WRITE the per-message STAGED drop list in the same store: `ids` add window ids, `unmark` remove, `clear` empties BOTH staged and active (the boundary stays). `mode:'apply'` — union staged into the ACTIVE set the hook drops, after projecting the resulting request (last request's prompt − newly-active mass) against 80% of the window: refuses `apply= rejected: nothing-staged` or `over-bound <projected> <bound>` unless `force:true`; success `apply= staged->active n=<k> projected=<p> bound=<b> ok mixed=<bytes4-count>`. The `session.context` draft hook drops the request's pre-boundary AND active entries at assembly time — history untouched, reversible (a stale boundary logs ONE boundary-stale line and keeps the window; stale active ids are ignored with ONE marks-stale line). Fail-closed validation (a rejection writes NOTHING): the session exists, the target/mark id is a window row (`mark-not-found`/`target-not-found`), never the window head (`mark-at-window-head`/`target-at-window-head`), and the drop-list union + inside boundary leave >= 6 retained rows (`mark-floor`/`retained-tail-below-floor`). Rejections are plain lines — `report= rejected: <cause>` / `tail-set= rejected: <cause>` / `mark-set= rejected: <cause>` / `apply= rejected: <cause>` / `error: <usage>` (a valid fail-closed outcome — do not retry); read failures print `context-read-failed`. Returns `tail-set= <old> -> <new> keep=<count>` (or `-> none` after a clear) and `mark-set= +<n> -<m> total=<staged-size> rows_dropped_est=<tokens>`. `session` may be omitted (the tool context resolves it).";

const TOOL_INPUT = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: {
      type: "string",
      enum: ["report", "tail", "mark", "apply"],
      description:
        "The mode: 'report' (read-only window map — header + numbered rows + `last: N` + trim-RANGE options + biggest list + optional dry-run) or 'tail' (the boundary-store write — target form, keepMessages form, or clear) or 'mark' (the STAGED drop-list write — ids, unmark, or clear) or 'apply' (move staged into the ACTIVE set the hook drops, projection-bound).",
    },
    session: {
      type: "string",
      description: "The session id (e.g. ses_…). Omit = the CALLING session (resolved from the tool context).",
    },
    target: {
      type: "string",
      description:
        "report: the message id a boundary write would point at (dry-run, no write). tail (<messageID> form): the new BOUNDARY id — the first KEPT message; strictly after the window head, retaining >= 6 rows. Omit with keepMessages or clear.",
    },
    keepMessages: {
      type: "number",
      description:
        "tail (keep-COUNT form): N = the retained-tail MESSAGE count — the boundary moves to leave exactly N rows (a COUNT, not a token budget). Mutually exclusive with target. Rejected: keep-invalid, keep-exceeds-history, retained-tail-below-floor (floor 6), keep-at-window-head.",
    },
    ids: {
      type: "array",
      items: { type: "string" },
      description:
        "mark (add form): window ids to ADD to the STAGED drop list (de-duplicated; effective only after `apply`). Rejected: mark-not-found, mark-at-window-head, mark-floor (the drop-list union + inside boundary leave < 6 retained rows).",
    },
    unmark: {
      type: "array",
      items: { type: "string" },
      description:
        "mark (remove form): staged ids to REMOVE (stale stored ids un-mark too).",
    },
    clear: {
      type: "boolean",
      description:
        "tail (clear form): remove the stored boundary (stored staged/active sets stay). mark (clear form): empty BOTH the staged and active sets (a stored boundary stays). Mutually exclusive with the other args of the mode.",
    },
    force: {
      type: "boolean",
      description:
        "apply (mode 'apply' only): accept a projection over the 80% bound deliberately. Without it an over-bound apply is refused (`apply= rejected: over-bound <projected> <bound>`).",
    },
  },
};

async function execute(args: unknown, toolContext: { sessionID?: unknown }): Promise<{ output: string }> {
  const a: Record<string, unknown> = args != null && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
  const explicitSession = typeof a.session === "string" && a.session.trim() !== "" ? String(a.session).trim() : null;
  const callerID = typeof toolContext?.sessionID === "string" && toolContext.sessionID !== "" ? toolContext.sessionID : null;
  const sid = explicitSession ?? callerID;
  if (sid == null) return { output: "error: missing session (pass `session` or call from a session context)" };
  const mode = a.mode;
  const target = a.target != null && String(a.target).trim() !== "" ? String(a.target).trim() : undefined;
  const keep = a.keepMessages != null ? a.keepMessages : undefined;
  if (mode === "report") return { output: await reportWindow(sid, target) };
  if (mode === "tail") {
    const isClear = a.clear === true;
    if (isClear && (target != null || keep != null)) {
      return { output: "error: tail mode: clear is mutually exclusive with target/keepMessages (use one form)" };
    }
    if (keep != null && target != null) {
      return { output: "error: tail mode: target and keepMessages are mutually exclusive (use one or the other)" };
    }
    if (isClear) return { output: await tailSet(sid, { clear: true }) };
    if (keep != null) return { output: await tailSet(sid, { keep: typeof keep === "number" ? keep : Number(String(keep)) }) };
    if (target != null) return { output: await tailSet(sid, { target }) };
    return { output: "error: tail mode requires target (the boundary message id), keepMessages (the retained-tail message count), or clear (remove the stored boundary)" };
  }
  if (mode === "mark") {
    const isClear = a.clear === true;
    let usage = "";
    const norm = (v: unknown): string[] | undefined =>
      v == null ? undefined : Array.isArray(v) && v.every((x) => typeof x === "string" && (x as string).trim() !== "")
        ? (v as string[]).map((x) => x.trim())
        : (usage = "error: mark mode: ids and unmark must be arrays of non-empty message id strings", []);
    const ids = norm(a.ids);
    const unmark = norm(a.unmark);
    if (usage !== "") return { output: usage };
    if (isClear && (a.ids != null || a.unmark != null)) {
      return { output: "error: mark mode: clear is mutually exclusive with ids/unmark (use one form)" };
    }
    if (!isClear && ids == null && unmark == null) {
      return { output: "error: mark mode requires ids (window message ids to stage for the drop), unmark (ids to restore), or clear (empty BOTH drop sets — a stored boundary stays)" };
    }
    if (isClear) return { output: await markSet(sid, { clear: true }) };
    return { output: await markSet(sid, { ids, unmark }) };
  }
  if (mode === "apply") {
    const bad = Object.keys(a).filter((k) => k !== "mode" && k !== "session" && k !== "force");
    if (bad.length > 0) return { output: "error: apply mode takes no list args (stage with mark mode first; only `force` is accepted)" };
    return { output: await applySet(sid, a.force === true) };
  }
  return { output: "error: mode must be 'report', 'tail', 'mark', or 'apply'" };
}

const trimTool = {
  name: "context_trim",
  description: TOOL_DESCRIPTION,
  input: TOOL_INPUT,
  output: { type: "string" },
  execute,
};

// ------------------------------------------------------------------ the plugin module

const plugin: Plugin.Plugin = {
  id: "context_trim_v2",
  async setup(ctx) {
    dir = ctx.location.directory;
    sessionApi = ctx.session; // the context/get RPC carrier (the window read)
    const regTool = await ctx.tool.transform((editor) => {
      editor.add(trimTool);
    });
    const regHook = await ctx.session.hook("context", (event) => onContext(event));
    return () => {
      staleLogged.clear();
      marksStaleLogged.clear();
      void regTool.dispose();
      void regHook.dispose();
    };
  },
};

export default plugin;
