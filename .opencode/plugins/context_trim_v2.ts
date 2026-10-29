// context_trim_v2.ts — the v2-NATIVE context-trim plugin (TODO unit 4b,
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
// (2) REPORT — READ-ONLY, NO write anywhere. (U17 #208, 2026-10-28, maintainer
// ruling) The window rows come from the READ-ONLY SQL lane — the SAME
// node:sqlite → bun:sqlite backend chain as the ordinal lane: `session_message`
// rows after the LAST completed compaction (`seq >=` that row's `seq`, its `data`
// JSON carrying `status: 'completed'`; COALESCE 0 with no compaction), ASC BY
// seq, the compaction row itself the HEAD. The row's `data` JSON is the message
// info — live-verified 2026-10-28 it carries NO `id` (`tokens`/`time` live
// INSIDE), so the row's `id`/`type` COLUMNS merge into the parsed object. Rows
// are read defensively (`unknown`-typed) — the decoded `Session Message.Info`
// union (`type`, `time`, `tokens`, `content`…). The service self-call is GONE
// from the report (ZERO RPC calls); `readWindow` stays for the hook + write
// lanes. U8 (#192,
// 2026-10-27): the ROW MASS is the row's OWN weight — utf8 bytes/4 over the row's
// own parts (`text`, content-item `text`/`reasoning`, tool `state.input` JSON,
// tool `state.content`/`output`). The provider figure on a completed-assistant
// row is NOT a weight — `data.tokens{input,output,…}` sums to the REQUEST size at
// that step (input + cache.read = the whole cached conversation), 75x+ the row's
// own bytes (planner-measured) — so it prints relabeled as `req-at=<tokens>` and
// feeds NOTHING but the last-request projection authority. EVERY sum
// (`window-est=`, `retained=`/`dropped=`, `active-est=`, `rows_dropped_est=`,
// `drop_est=`, `biggest:`) is an OWN-mass sum (`biggest:` ranks by weight, not
// by recency) — honest again because U9 (#193) makes the row's TOOL OUTPUT
// droppable too: the hook removes the message entry AND the projection entries
// carrying its results as ONE atomic unit (see the (10) pair rule in the hook). The header also rides the SHARED gauge core (v2-paired
// since units 1+2): `readGauge(undefined, sessionID)` + `formatGauge` — no new
// SQL is added for the session/model/ctx figure (the gauge core is the ONLY DB
// reader used; a db-error read prints ONE honest `gauge: db-error …` line and
// never fails the report). Readout forms mirror v1's CUT-DOWN default: (1) the
// window header, (2) NUMBERED rows `row: N <type> id=<id> own=<n> [req-at=<t>]
// [tool=… target=…]` + the `last: N` flag (the ids print inline — the mark lane
// needs them; anchors are v2 message ids), (3) the RECOMMENDATION block, (4) the
// `biggest:` biggest-droppable list (top-5 heaviest finished turns by OWN mass,
// no error), (5) with `target`: the dry-run (remove/keep counts + own-mass sums
// + the tail verdict, NO write).
//
// (3) TAIL — a persistent per-session BOUNDARY STORE:
// `.opencode/temp/context_trim_v2.json` (`{sessions: {<sid>: {boundary, keep,
// set_at, staged, active, guard, auto, noticed}}}`, fail-open read, additive
// read-modify-write — every pre-existing
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
// (U10, #196) STABLE ROW ORDINALS + OPT-IN IN-WINDOW TAGS — the ordinal
// SOURCE is the `seq` column of `session_message` (the append position in the
// FULL session row order; store rows are append-only, never deleted), read via
// a READ-ONLY DB lane on the gauge-core path (`getDbPath`), node:sqlite →
// bun:sqlite chain — NO DB WRITE EVER. Window position is NOT the source: a
// drop or compaction would renumber everything below it, while `#<seq>` is the
// number a row keeps FOREVER. `report` prints `row: <pos> #<seq>`, names the
// option anchors and `biggest:` entries by ordinal, and every write lane
// (`mark` ids/unmark, `tail` target, the report dry-run target) accepts a bare
// ALL-DIGIT ordinal resolved through the ordinal map — NEVER through window
// position; the guards (`*-not-found`, `*-at-window-head`, `mark-floor`) are
// unchanged (an ordinal naming an out-of-window row rejects like an unknown
// id). An unreadable ordinal source prints `#?` rows and rejects numbers
// (fail-open, never a guessed number); kind `ordinals` logs ONE line per
// cause. (U17 #203, 2026-10-28, maintainer ruling) The IN-WINDOW TAG LANE is
// DELETED (store flag `tags` + hook-side `[#N] ` render): the host re-persists
// live rows' `data` on its own UPDATE (finalize + later updates), so ANY hook
// write into existing part bytes lands in the store and COMPOUNDS every turn
// — remove or append only, never mutate. Legacy store entries whose JSON still
// carries a `tags` key are IGNORED on read and PRUNED on the next write. The
// ordinal lane stays; `trim` lines keep the `seq=`/`ordinal=` forensics of the
// surviving entries' absolute store seqs; the drop sums and pair rule UNCHANGED.
//
// DEVIATIONS vs v1 (header REQUIRED): (a) NO DB write — the tail lane is the
// boundary store + the draft hook filter (there is no `tail_start_id` in v2);
// (b) (U17 #208, 2026-10-28) the report's ROW source is the READ-ONLY SQL lane
// on the ordinal lane's backend chain (rows after the last completed compaction,
// NO DB write ever) — the service `session.context` self-call is NOT the report
// source anymore; the gauge core stays the request-size figure (the header
// line); the v1 spawn-sqlite3 lane is effectively re-implemented as this
// read-only lane (the clone's gauge core still covers v1-only DBs);
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
// arg (v1's un-set was the host rewriting its own field); (g) mass model (U8):
// v1's bytes4 fallback covered part rows; v2 has no part table, so OWN weight =
// bytes/4 over the row's own fields (`text`, content-item `text`/`reasoning`,
// tool `state.input` JSON, tool `state.content`/output, comp summary+recent);
// the provider `TokenUsage.total()` on completed-assistant rows is the REQUEST
// size at that step — printed as `req-at=`, never summed as row weight (U8);
// (h) the `marker` mode of the v1 tool (the U3 quartet)
// lives in the compact_memory plugin (4a) — NOT duplicated here.
//
// STILL PENDING (unchanged): LIVE v2-host activation waits for the maintainer's
// host runs; registration/config = maintainer domain.
//
// (7) TEST HOOK — `setStoreFileForTest(p)` (the gauge core's setBudgetFileForTest
// pattern): the smoke steers the boundary store at a scratchpad fixture; the
// production host never calls it.
//
// (8) U6 PER-MESSAGE TRIM SET (TODO U6, 2026-10-27, ACT-shape no-fork) —
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
// (9) U7 STAGED MARKING + APPLY (TODO U7, 2026-10-27, ACT-shape no-fork) —
// the (8) mark set becomes `staged`: `mark`/`unmark` keep editing the STAGED list
// (continuous and cheap — the hook NEVER drops a staged id), and ONE explicit
// `mode:'apply'` unions it into the `active` set the hook actually drops. Store
// per session: `{ boundary, keep, set_at, staged?, active? }` — a legacy `marks`
// key READ-SEEDS `active` (a pre-U7 store keeps working; the key is replaced on
// the next write). `apply` first PROJECTS the resulting request (U8 #192, U9
// #193): the last completed request's prompt tokens (gauge `ctx − output` =
// input + cache.read — the provider figures stay the authority HERE, never
// hard-coded) MINUS `drop_est` = the FULL OWN-mass sum of the newly active rows
// (text + reasoning + call args + OUTPUT — the (10) pair rule drops the result
// entries atomically, so the estimate matches what actually leaves; the U8 ±35%
// live gate stays the acceptance criterion). `mixed=<c>` counts the staged rows
// WITHOUT a provider `req-at` counterpart. A same-step `mark`+`apply` can RACE
// (#194): ONE bounded re-read (350ms) rides a late store write, so apply either
// applies the new set or says `nothing-staged` truthfully. When the projection exceeds
// EIGHTY percent of the gauge-core window value the apply is REFUSED
// (`apply= rejected: over-bound <projected> <bound>`) unless `force:true`; an
// empty staged set is refused (`apply= rejected: nothing-staged`). Success:
// `apply= staged->active n=<k> drop_est=<d> projected=<p> bound=<b> ok mixed=<c>`. `mark
// clear:true` empties BOTH sets (the tail `clear` keeps BOTH — symmetry kept).
// The report header names `staged=`/`active=`/`active-est=` (replacing the (8)
// marks fields) and gains a `projection:` line for the staged set — the result
// is inspectable BEFORE applying. The mark guards stay fail-closed; the floor
// computes over the UNION (boundary inside-drop ∪ active ∪ staged). Hook: ONLY
// `active` ids drop; a staged-only entry (no boundary, no active) stays SILENT
// (no service call, no line). Line shapes keep their names: `mark-set= total=`
// is the STAGED size, est is over staged; the trim line's `marks=` carries the
// ACTIVE size.
//
// (15) U18 (#209, 2026-10-28, maintainer rulings) FREE-SPACE MODE —
// `mode:'free'` + `target` (an INTEGER percent of the gauge-core window value,
// DEFAULT 20, valid 5..60 — anything else is a fail-closed
// `free= rejected: target-invalid <raw>`). It auto-drops rows into the
// session's `auto` drop set — the SAME sticky set the (13) guard uses, so the
// hook's removal lane is UNCHANGED (the outputs leave with their calls, the
// (10) pair rule) and the report flags those rows ` g` — until `target`% of
// the window is freed. Selection reuses the guard lane's candidate rules
// verbatim: OWN-mass weight (`ownMassOf`), HEAVIEST-first with AGE (window
// position ASCENDING) tie-break — the ruling: near the wall the payer pre-fill
// is the smaller devil, the open question is HOW MUCH to free (the #207
// re-prefill order stays a later unit) — NEVER the head row, NEVER below the
// keep floor (>= max(FLOOR, entry.keep) survivors), NEVER a boundary-retained
// row, NEVER a row another lever already drops. The target math rides the SAME
// estimator as `markEstimate`: met when `freed_est >= floor(target% of the
// gauge window value)`. NO gauge window → `free= rejected:
// gauge-window-unavailable` (the math has no anchor — never a guessed one).
// Shortfall: echo `short=yes` and STOP at pool exhaustion — NO automatic
// escalation (the mode-2 emergency ruleset is a LATER unit). Success echo:
// `free= freed=<tok> target=<pct> bound-fill=<int>% picks=<n> short=<yes|no>`
// (bound-fill = (last-req − freed_est) over the window; the ctx leg missing
// prints `bound-fill=unavailable` honestly). Picks persist to `auto` (sticky
// until `mark clear`), ONE kind:free evidence line names
// session/target/freed/picks/short, and NOTHING is written when no row is
// pickable. Cross-session works via `session` — the store entries are per-sid.
//
// (17) U29 (#225, 2026-10-29, planner dogfood) GUARD CONVERGENCE — the wall
// guard's TRIGGER authority is the PROVIDER-measured request figure (gauge CTX
// − output = the report's `request-est`), NOT the assembly estimate: scaled by
// `renderRatio` it re-fired EVERY step (CTX=107042 vs projected=991452 — an
// `after=942283 > bound=241172` that can never converge, busting the prompt
// cache once per step). One fire drains from the authority to the 0.8 fit
// bound; the next assembly reads the REDUCED provider figure and stays silent.
// `assemblyEstimate` + `renderRatio` ride as FORENSICS ONLY (`live=` / `r=`).
// `event:auto` gains `auth=last-req`; a deduped `event:skip` line
// (`auth=no-request-fig | pool-exhausted`) audits the armed session's real
// skips; UNDER the trigger the lane stays SILENT (no line). The selection rule
// and the #214 survival property (bytes/4 subtraction stops picks LATER — the
// real request lands BELOW the bound) are UNCHANGED.
//
// (16) U28 (#A2 follow-up, 2026-10-29) CACHE-FREE USABILITY — three fixes, NO
// paid surface (the tool description literal + the arg schema stay
// BYTE-IDENTICAL, delta 0): (F1) every early-failure echo (`<lane>= rejected:` /
// `<lane>= error:` / `error:` usage line) logs ONE kind:"reject" line
// {ts, session, reason} — a failed call is auditable; (F2) the per-assembly
// kind:"trim" trace line fires ONLY when the applied drop set or the
// droppedBytes CHANGED since the last pass for that session (the live log
// flooded 643 identical lines while a static set re-spliced every request);
// (F3) every successful report ENDS with exactly ONE bounded `next:` steer
// line (≤ 110 chars) chosen from the report's own state.

import type { Plugin } from "@opencode/plugin";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// The shared v2-paired gauge core (VALUE import of plain JS — node: builtins
// only). Used for the report header figure + its readout form only.
import { formatGauge, getDbPath, readGauge } from "./scripts/gauge.mjs";
// (U11 smoke hook) The smoke may run this file from a scratch location where its
// `./scripts/gauge.mjs` resolves to a DIFFERENT module instance than the one it
// steers — inject the steered core (same functions, shared test state). The
// ordinal lane keeps the import-bound getDbPath (fixtures steer the same file).
let gauge = { formatGauge, getDbPath, readGauge };
export function setGaugeCoreForTest(m: { formatGauge: typeof formatGauge; getDbPath: typeof getDbPath; readGauge: typeof readGauge }): void {
  gauge = m;
}

// ------------------------------------------------------------------ constants

const LINE_CAP = 2000;
const CAPS = [500, 150, 60];
const DOT = "\u2026";
const FLOOR = 6; // the keepMessages floor (v1, the maintainer's round-2 ruling) — cache-probe comment edit 2026-10-29
// (U21 D3, #214) the floor protects DIALOG STRUCTURE, not mass: a row inside the
// last floor rows is droppable when its OWN mass is tool-output-dominant — above
// this token threshold. Head, user, and compaction rows and the newest assistant
// row NEVER (see `dropCandidates`).
const FLOOR_MASS = 4000;
// (U21 D1, #214) the request payload the draft array does NOT carry: system prompt
// + tool schemas + tokenizer drift. MEASURED 2026-10-28 read-only on three live
// sessions of this repo (`ctx_gauge` CTX/output vs `context_trim mode:'report'`
// window-est): worker ses_e7b6237a5ffe = 81,486 − 53,610 = 27,876; U20 worker
// ses_e7b71db78ffe = 172,014 − (137,299 − 62,179 auto mass) = 96,894; U19 worker
// ses_e7b96ab54ffe = 187,204 − 98,763 = 88,441. The hook's array carries MORE than
// window-est (tool-call args, projections), so the hook-time residual sits BELOW
// the first figure; 25,000 is the conservative lower bound of that band. The
// 92%-trigger / 80%-fit-bound gap (12% of the window = 31,457 tok at 262,144)
// absorbs the residual bytes/4 drift (provider prompt ≈ 1.15–1.5x bytes/4).
const SYS_PROMPT_TOK = 25000;
let sysPromptTok = SYS_PROMPT_TOK; // the test lane may steer it (see setSysTokForTest)
export function setSysTokForTest(n: number): void {
  sysPromptTok = Number.isFinite(n) && n >= 0 ? n : SYS_PROMPT_TOK;
}

// (U22 F1, #218) the RENDER-RATIO band. The provider render of a tool-output-heavy
// session measures ≈ 2x the bytes/4 window estimate (measured 2026-10-29, U21
// acceptance run 3: `window-est=106,508` against a provider req-at that climbed to
// 207,132 and died at 267,659; a second session 138,902 store rows vs 252,192
// provider; band across sessions 1.15-2x). The draft array carries tool ARGS the
// provider renders far larger than their stored bytes, so bytes/4 alone cannot
// trigger the wall guard. The guard therefore scales the live assembly estimate by
// the session's own render ratio, clamped to this band; an unavailable provider
// figure falls back to the floor.
const RENDER_RATIO_FLOOR = 2.0;
const RENDER_RATIO_CAP = 2.5;

// ------------------------------------------------------------------ plugin state

let dir = ""; // ctx.location.directory — the repo root the plugin targets
let sessionApi: Plugin.Context["session"] | undefined;
// Per-session+boundary dedup for the `boundary-stale` line (bounded by the
// number of stale states; the entry re-logs only when the boundary id CHANGES).
const staleLogged = new Map<string, string>();
// Per-session dedup for the `marks-stale` line ((8)): keyed by the STALE-COUNT
// string — one line per (session, count-change), not per fire.
const marksStaleLogged = new Map<string, string>();
// (U14) per-session dedup for the guard fail-safe line — ONE `guard event:fail`
// line per session per plugin load (the spec's "logged ONCE per session").
const guardFailLogged = new Map<string, string>();
// (U25 #219) the (U21 D4, #214) in-process notice signature is GONE: the
// "already announced" state rides the store entry's `noticed` id list, so the
// notice survives a process restart and a STATIC drop set can never re-notice
// through window-membership churn (the #219 churn: three identical notices in
// 20 s while the stored auto set sat still).
// (U21 F2) per-session projected-after-drops of the last fire (in-memory evidence,
// never store state — the store entry shape stays {boundary, keep, setAt, staged,
// active, guard, auto, noticed}).
const guardAfter = new Map<string, number>();
// (U29 G3) per-session dedup for the guard's `event:skip` line: ONE line per
// (session, reason) — bounded by the two reasons; cleared on dispose.
const guardSkipLogged = new Map<string, string>();
// (U28 F2, #A2 follow-up) per-session trace signature of the LAST assembly pass:
// the applied drop set (the matched store ids, sorted) + the spliced
// `droppedBytes`. The invariant the planner judges from: a pass that REPRODUCES
// the previous signature emits NO `kind:"trim"` line; a pass whose drop set or
// `droppedBytes` CHANGED emits exactly ONE line (`newRows=` keeps its meaning —
// a changed set still prints it whenever the notice delta fired). In-memory
// only: the first pass after a plugin load always logs; `mark clear` and the
// full-entry prune reset the signature (the drop state resets — the next drop
// is a fresh set); a no-drop pass empties it, so a drop that lands again logs.
const trimApplied = new Map<string, string>();

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

// (U28 F1) REJECT LOG: every early-failure echo — a `<lane>= rejected: <cause>`
// refusal, a `<lane>= error: <cause>` write/read failure, or a bare
// `error: <usage>` line — appends ONE `kind:"reject"` line `{ts, session,
// reason}` so a failed call is auditable (the log carried NO rejection evidence
// today). No behavior change; no DB write; the tool surface is untouched. The
// reason captures the failure line's own tail. A report `dry-run: ...
// verdict=rejected:` line is NOT a call rejection: the anchor requires
// `<word>= rejected:` or `error:` at a line START, so the dry-run verdict stays
// unmatched.
function logReject(sid: string, output: string): void {
  const m = /(?:^|\n)(?:[a-z-]+= (?:rejected|error)|error): (.+)/.exec(output);
  if (m == null) return;
  appendLog(buildLine("reject", { session: sid, reason: cap(m[1], 160) }, {}));
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
// until the next store write). (U17 #203) the (U10) `tags` flag is GONE — a
// legacy entry whose JSON still carries a `tags` key IGNORES it on read and
// PRUNES it on the next write (the entry is rebuilt key by key). U14 (#205) adds
// `guard` — the opt-in preventive wall-guard flag, DEFAULT OFF (written only
// when ON) — and `auto`, the guard's OWN drop set,
// SEPARATE from the agent's `active` set (sticky: stored ids keep leaving the
// draft even after the flag goes OFF until `mark clear` empties it).
// (U25 #219) adds `noticed` — the ids the notice ALREADY announced: the notice
// fires only on ids the `auto` set gained since the last notice. A legacy entry
// without the key = nothing noticed (the whole set notices once); the key prunes
// whenever `auto` empties, so a re-grown set always notices again.
type StoreEntry = { boundary: string; keep: number; setAt: string; staged: string[]; active: string[]; guard: boolean; auto: string[]; noticed: string[] };

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
    const guard = rec["guard"] === true; // (U14) opt-in wall guard; anything else is OFF
    const auto = readIds(rec["auto"]); // (U14) the guard's own drop ids (separate from `active`)
    const noticed = readIds(rec["noticed"]); // (U25 #219) the already-announced ids; an absent key = nothing noticed
    // (U17 #203) a legacy `tags` key is IGNORED here — no other lever → noise entry.
    if (boundary === "" && staged.length === 0 && active.length === 0 && guard !== true && auto.length === 0) continue; // an entry with NO lever is noise
    const keep = rec["keep"];
    const setAt = rec["set_at"];
    out[sid] = {
      boundary,
      keep: typeof keep === "number" && Number.isFinite(keep) ? keep : 0,
      setAt: typeof setAt === "string" ? setAt : "",
      staged,
      active,
      guard,
      auto,
      noticed,
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
    if (entry == null || (entry.boundary === "" && entry.staged.length === 0 && entry.active.length === 0 && entry.auto.length === 0 && entry.guard !== true)) delete s[sid];
    else {
      const rec: Record<string, unknown> = { boundary: entry.boundary, keep: entry.keep, set_at: entry.setAt };
      // (9) the write REPLACES a legacy `marks` key with `staged`/`active`
      if (entry.staged.length > 0) rec["staged"] = entry.staged;
      if (entry.active.length > 0) rec["active"] = entry.active;
      if (entry.guard === true) rec["guard"] = true; // (U14) the wall-guard flag prints ONLY when ON
      if (entry.auto.length > 0) rec["auto"] = entry.auto; // (U14) the guard's drop ids print only when non-empty
      // (U25 #219) the notice marker rides ONLY while `auto` is non-empty: an
      // emptied drop set prunes it, so a re-grown set notices again.
      if (entry.auto.length > 0 && entry.noticed.length > 0) rec["noticed"] = entry.noticed;
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

// The REQUEST size at that step — the provider `TokenUsage.total()` on the
// fork's completed-assistant shape (tokens present + time.completed present).
// U8 (#192): this is NOT a row weight (input + cache.read = the whole cached
// conversation — planner-measured 75x+ overstatement); it prints relabeled as
// `req-at=` and feeds only the last-request projection authority (via the gauge).
function providerTotalOf(r: Record<string, unknown>): number {
  if (r["type"] !== "assistant") return -1;
  const time = asRecord(r["time"]);
  const sum = tokenSum(asRecord(r["tokens"]));
  return sum >= 0 && time != null && time["completed"] != null ? sum : -1;
}

// U8: the row's OWN weight = utf8 bytes/4 over the row's OWN parts — `text`
// (user/synthetic/system/skill), content-item `text`/`reasoning` (assistant),
// tool `state.input` (JSON bytes = the call payload) and tool `state.content`/
// `output` (the output text), shell `output.output`, compaction `summary`+`recent`.
// The byte split (U8b, live-measured in this session): the hook drops EXACTLY
// the row's id-carrying assembly entry — the TOOL-OUTPUT bytes ride id-less
// tool-result projection entries and are NEVER dropped. `own=` stays the FULL
// weight (incl. outputs); every DROP sum (`rows_dropped_est=`, `drop_est=`,
// `dropped=`, `active-est=`, `staged-est=`) uses the DROPPABLE part only.
function byteBytesOf(r: Record<string, unknown>): { drop: number; out: number } {
  let drop = 0;
  let out = 0;
  const own = r["text"];
  if (typeof own === "string") drop += Buffer.byteLength(own, "utf8");
  if (r["type"] === "compaction") {
    for (const k of ["summary", "recent"]) {
      const v = r[k];
      if (typeof v === "string") drop += Buffer.byteLength(v, "utf8");
    }
  }
  const ownOut = r["output"];
  if (typeof ownOut === "string") out += Buffer.byteLength(ownOut, "utf8");
  else {
    const nested = asRecord(ownOut);
    if (nested != null && typeof nested["output"] === "string") out += Buffer.byteLength(nested["output"] as string, "utf8");
  }
  for (const item of asArray(r["content"])) {
    const it = asRecord(item);
    if (it == null) continue;
    if (typeof it["text"] === "string") drop += Buffer.byteLength(it["text"], "utf8");
    if (it["type"] === "tool") {
      const state = asRecord(it["state"]);
      if (state == null) continue;
      const input = state["input"];
      if (input != null) {
        const s = JSON.stringify(input);
        if (s != null) drop += Buffer.byteLength(s, "utf8");
      }
      const outp = state["output"];
      if (typeof outp === "string") out += Buffer.byteLength(outp, "utf8");
      for (const part of asArray(state["content"])) {
        const p = asRecord(part);
        if (p != null && typeof p["text"] === "string") out += Buffer.byteLength(p["text"], "utf8");
      }
    }
  }
  return { drop, out };
}

function ownMassOf(r: Record<string, unknown>): number {
  const b = byteBytesOf(r);
  return Math.floor((b.drop + b.out) / 4);
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
// U9 (#194): the hint echo is ONE short line — the anchor row's first line,
// capped at HINT_CAP chars; a cut states the cap inline (`…[+Nch]`). The old
// full-text echo cost the observing agent ~10k tokens on one report.
const HINT_CAP = 80;
function hintLine(t: string): string {
  const first = esc(t.split(/\r?\n/)[0]);
  if (first.length <= HINT_CAP) return first;
  return cap(first, HINT_CAP) + `[+${first.length - HINT_CAP}ch]`;
}

function hintOf(r: Record<string, unknown>): string {
  for (const item of asArray(r["content"])) {
    const it = asRecord(item);
    if (it != null && typeof it["text"] === "string" && (it["text"] as string) !== "") return hintLine(it["text"] as string);
  }
  if (typeof r["text"] === "string" && (r["text"] as string) !== "") return hintLine(r["text"] as string);
  const targets = toolTargets(r);
  const m = / target=(.+)$/.exec(targets);
  if (m != null) return cap(m[1], 48);
  return String(typeof r["type"] === "string" ? r["type"] : "?");
}

function esc(s: string): string {
  return s.replace(/\r?\n/g, "\\n").replace(/\t/g, "\\t");
}

// The read / thought / shell mass split of a row SET (an ESTIMATE — the per-
// category bytes floored to /4; the category totals need not sum to ownMassOf).
// U9: outputs count again (they drop with their call). Categories (v2 shapes):
// read = the tool-content bytes of the `read`/`webfetch` items; thought = the
// text/reasoning item texts + the user/system/skill texts; shell = the
// tool-content bytes of `bash` items.
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

// U9: the OWN-mass sum — window weight AND every drop sum (`dropped=`,
// `active-est=`, `rows_dropped_est=`, `drop_est=`, the dry-run remove mass):
// outputs ARE droppable again — the hook takes the call AND its output entries
// atomically (the (10) pair rule). Runtime `orphan=` projections stay excluded
// (they are counted and reported, never estimated into a drop).
function massSum(rows: Array<Record<string, unknown>>): number {
  let s = 0;
  for (const r of rows) s += ownMassOf(r);
  return s;
}

function idOf(r: Record<string, unknown>): string {
  return typeof r["id"] === "string" ? r["id"] : "";
}

// The (8)/(9)/(U9) mark-set estimated dropped mass: the OWN-mass sum of window
// rows at index >= 1 whose id is in the set (ids outside the window / at the
// head contribute 0 — the hook ignores them the same way).
function markEstimate(rows: Array<Record<string, unknown>>, marks: string[]): number {
  return idsMass(rows, marks).mass;
}

// (9)/(U9) the OWN-mass sum AND the `mixed=` count of an id-set against the
// window rows — the apply projection source; `mixed=` counts the rows WITHOUT a
// provider `req-at` counterpart (no completed-assistant figure to cross-check).
function idsMass(rows: Array<Record<string, unknown>>, ids: string[]): { mass: number; mixed: number } {
  let mass = 0;
  let mixed = 0;
  for (const id of ids) {
    const i = rows.findIndex((r) => idOf(r) === id);
    if (i < 1) continue;
    mass += ownMassOf(rows[i]);
    if (providerTotalOf(rows[i]) < 0) mixed++;
  }
  return { mass, mixed };
}

// (U21 F1, #214 D1) the LIVE assembly projection: bytes/4 over the draft entries
// the `session.context` hook received, plus the request-overhead constant
// (`SYS_PROMPT_TOK`). The old authority was the gauge's LAST-FINISHED step
// (`last-req`), which misses everything the step grew AFTER it — U20 measured
// last-req 190,241 against an assembly of 224,000 `in=` + 16,384 `cache.read`:
// ~34k blind, and the request died at 284,070 while the projection still read
// `ok`. Returns undefined when the array is unusable (not an array, or a
// serialization failure) — ONLY then does the guard fall back to `last-req`.
function assemblyEstimate(messages: unknown): number | undefined {
  if (!Array.isArray(messages)) return undefined;
  try {
    let bytes = 0;
    for (const m of messages) bytes += JSON.stringify(m).length;
    return Math.floor(bytes / 4) + sysPromptTok;
  } catch {
    return undefined;
  }
}

// (U31 H1, #227) the CORRECTED live estimate: `assemblyEstimate` MINUS the
// bytes/4 own-mass sum of the rows the hook is dropping for THIS session
// (boundary region + active + auto — same weight source as `ownMassOf`). The
// raw estimate over-counts ~4x on a trimmed session (planner session: own-mass
// sum 298,167 vs provider request 120,647 with 530 sticky drops — the #225
// churn class); subtracting the dropped rows' own mass removes exactly that, so
// the hard leg stays stable. NEVER reuse the `window-est` sum uncorrected.
// Result is >= 0.
function droppedOwnMass(rows: Array<Record<string, unknown>>, dropIdx: Set<number>): number {
  let m = 0;
  for (const i of dropIdx) {
    const r = rows[i];
    if (r != null) m += ownMassOf(r);
  }
  return m;
}

function correctedEstimate(messages: unknown, rows: Array<Record<string, unknown>>, dropIdx: Set<number>): number | undefined {
  const est = assemblyEstimate(messages);
  return est == null ? undefined : Math.max(0, est - droppedOwnMass(rows, dropIdx));
}

// (U22 F1, #218; U29 #225 — FORENSICS ONLY: since the trigger rode the provider
// figure this ratio DECIDES NOTHING, it only annotates the guard log line) the
// per-session RENDER RATIO the guard scales the assembly estimate by: the last
// provider CTX figure (the gauge core's prompt tokens of the last FINISHED step)
// over that step's byte/4 estimate — `massSum(rows)`, the same quantity the
// report prints as `window-est=`. Clamped into
// [RENDER_RATIO_FLOOR, RENDER_RATIO_CAP]; a missing provider figure or a zero row
// mass yields the floor (R = 2.0).
function renderRatio(rows: Array<Record<string, unknown>>, lastReq: number | undefined): number {
  if (lastReq == null || lastReq <= 0) return RENDER_RATIO_FLOOR;
  const est = massSum(rows);
  if (est <= 0) return RENDER_RATIO_FLOOR;
  return Math.min(RENDER_RATIO_CAP, Math.max(RENDER_RATIO_FLOOR, lastReq / est));
}

// (U21 F3, #214 D3) ONE shared selection rule — the wall guard and `free` call
// this symbol, so the floor rule can never drift between the two lanes. Own-mass
// weight (`ownMassOf`, so tool OUTPUTS ride first), HEAVIEST-first with AGE (window
// index ascending) tie-break. NEVER a candidate: the head row (index 0), a row at
// or after a live boundary (the session's explicit keep), a row another lever
// already drops, a zero-weight row, DIALOG STRUCTURE (user rows, compaction rows,
// the NEWEST assistant row), and — inside the last `floorKeep` rows — any row
// whose own mass does not exceed `FLOOR_MASS` (the floor protects structure, not
// mass: a tool-output-dominant floor row leaves, per the planner's ruling).
function dropCandidates(
  rows: Array<Record<string, unknown>>,
  floorKeep: number,
  bIdx: number,
  dropIdx: Set<number>,
): { id: string; idx: number; mass: number }[] {
  let newestAsst = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i]?.["type"] === "assistant") {
      newestAsst = i;
      break;
    }
  }
  const cand: { id: string; idx: number; mass: number }[] = [];
  rows.forEach((r, i) => {
    if (i < 1) return; // (1) the head row is NEVER droppable
    if (bIdx >= 1 && i >= bIdx) return; // (2) boundary-retained rows are explicitly KEPT
    const id = idOf(r);
    if (id === "" || dropIdx.has(i)) return; // (3) already dropped by a lever
    const type = String(r["type"] ?? "");
    if (type === "user" || type === "compaction") return; // (4) dialog structure survives
    if (i === newestAsst) return; // (5) the newest assistant row survives
    const mass = ownMassOf(r);
    if (mass <= 0) return; // (6) a zero-weight row frees nothing
    if (i >= rows.length - floorKeep && mass <= FLOOR_MASS) return; // (7) the floor: only heavy rows leave
    cand.push({ id, idx: i, mass });
  });
  cand.sort((a, b) => b.mass - a.mass || a.idx - b.idx); // heaviest first, oldest tie-break
  return cand;
}

// ------------------------------------------------------------------ the window read

// Reads the CURRENT model window: the v2 session service's `context` method
// (GET /api/session/:id/context — all rows after the last completed compaction,
// ASC BY seq, the head row included). Outcomes: ok (rows), not-found (no such
// session — a `session.get` probe discriminates), failed (any other service
// error — the capped preview rides the caller's evidence line). NEVER throws.
// (U17 #208) the REPORT no longer reads through this lane — `readReportRows`
// is the report's source; this lane stays for the hook and the write modes.
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

// ------------------------------------------------------------------ U10 (#196) — absolute store ordinals

// THE ORDINAL SOURCE: the `seq` column of `session_message` — the append
// position in the FULL session row order (store rows are append-only, never
// deleted), so a row's number NEVER moves across an `apply` (a drop), a
// compaction, or a restart. Window position is FORBIDDEN as the source: a drop
// or a compaction would renumber everything below it. Read-only DB lane on the
// gauge-core path resolution (`getDbPath`), the proven node:sqlite → bun:sqlite
// backend chain; NO DB WRITE EVER (the host DB stays untouched). Fail-open: an
// unreadable DB prints `#?` rows and rejects bare-number refs — never a guess.

// Test hook: point the ordinal read at a fixture DB (undefined = the live path).
let ordinalsOverridePath: string | undefined;
export function setOrdinalsDbForTest(p: string | undefined): void {
  ordinalsOverridePath = p;
}

type SqliteLike = { prepare: (sql: string) => { all: (...args: unknown[]) => unknown }; close?: () => void };
type Ordinals = { ok: true; byId: Map<string, number>; byRank: Map<number, string>; seqById: Map<string, number> } | { ok: false };
const ordinalsFailLogged = new Map<string, string>(); // `${sid}|${backend}` -> last cause (one line per cause)

async function importModule(name: string): Promise<Record<string, unknown> | undefined> {
  try {
    return (await import(name)) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

const ORDINALS_SQL = "SELECT id, seq FROM session_message WHERE session_id = ? ORDER BY seq ASC";

// Shared READ-ONLY open on the proven backend chain (U17 #208: the ordinal lane
// and the report row lane share it). `undefined` = this backend is unavailable
// (import failed or no usable constructor); an OPEN failure (a missing DB file)
// throws INTO the caller's try/catch. NEVER a write handle.
async function openReadonlySqlite(backend: string, p: string): Promise<SqliteLike | undefined> {
  const mod = await importModule(backend);
  const Ctor =
    backend === "node:sqlite"
      ? (typeof mod?.DatabaseSync === "function" ? (mod.DatabaseSync as new (p: string, o: Record<string, unknown>) => SqliteLike) : undefined)
      : (mod?.Database ?? (typeof mod?.default === "function" ? (mod.default as unknown as new (p: string, o: Record<string, unknown>) => SqliteLike) : undefined)) as
          | (new (p: string, o: Record<string, unknown>) => SqliteLike)
          | undefined;
  if (typeof Ctor !== "function") return undefined;
  return new Ctor(p, backend === "node:sqlite" ? { readOnly: true } : { readonly: true });
}

// Full-session id->seq / seq->id maps. NEVER throws: every backend failure
// falls through to the next; all dead → `{ ok: false }` (fail-open `#?`).
async function readOrdinals(sid: string): Promise<Ordinals> {
  const p = ordinalsOverridePath ?? getDbPath();
  for (const backend of ["node:sqlite", "bun:sqlite"]) {
    try {
      const db = await openReadonlySqlite(backend, p);
      if (db == null) continue;
      let raw: unknown;
      try {
        raw = db.prepare(ORDINALS_SQL).all(sid);
      } finally {
        try {
          db.close?.();
        } catch {
          // close is best-effort — a read-only handle releases on GC anyway
        }
      }
      // (U12 #202) PER-SESSION ORDINAL: the row's RANK 1..N over THIS session's
      // rows in append (seq) order — compaction rows and trimmed-away rows
      // occupy their rank too, and rows are append-only, so a rank NEVER
      // changes and the numbers read 1..N instead of sparse global seqs. The
      // absolute store `seq` rides `seqById` for the forensic log fields.
      const byId = new Map<string, number>();
      const byRank = new Map<number, string>();
      const seqById = new Map<string, number>();
      let rank = 0;
      for (const item of Array.isArray(raw) ? raw : []) {
        rank++; // EVERY session row occupies a rank — id-less rows included
        const r = asRecord(item);
        if (r != null && typeof r["id"] === "string" && typeof r["seq"] === "number" && Number.isFinite(r["seq"])) {
          byId.set(r["id"], rank);
          byRank.set(rank, r["id"]);
          seqById.set(r["id"], r["seq"]);
        }
      }
      return { ok: true, byId, byRank, seqById };
    } catch (e) {
      const cause = cap(String((e as { message?: unknown })?.message ?? e).replace(/\r?\n+/g, " "), 120);
      const key = `${sid}|${backend}`;
      if (ordinalsFailLogged.get(key) !== cause) {
        ordinalsFailLogged.set(key, cause);
        appendLog(buildLine("ordinals", { session: sid, backend, reason: cause }, {}));
      }
    }
  }
  return { ok: false };
}

// (U12 #202) the row-carried `seq` merge (U10's mergeOrdinals) is GONE: a
// per-session RANK cannot be derived from one row's seq — only the full
// session row order supplies it, so the ordinal DB read is the sole rank
// authority. An id the read does not know prints `#?` (never a guessed
// number), same honesty rule as before.

// (U10/U12) the row's ordinal as display text — its PER-SESSION RANK (1..N
// over the session's append order), `?` when the source is unreadable or the
// row carries no ordinal.
function ordinalOf(ord: Ordinals, r: Record<string, unknown>): string {
  if (ord.ok === false) return "?";
  const s = ord.byId.get(idOf(r));
  return s == null ? "?" : String(s);
}

// (U10/U12) WRITE-lane ref resolution: an ALL-DIGIT ref is the PER-SESSION
// RANK resolved through the rank map (NEVER through window position); any
// other string is a message id used as-is. A rank naming a row OUTSIDE the
// window (or beyond the session's rows, or any number while the source is
// unreadable) resolves to "" — the CALLER's existing guards then reject it
// exactly like an unknown id (`*-not-found`). Bare numbers are NOT id-shaped
// (`msg_…`), so ids never collide.
function resolveRef(ord: Ordinals, ref: string, rows: Array<Record<string, unknown>>): string {
  if (!/^\d+$/.test(ref)) return ref;
  if (ord.ok === false) return "";
  const id = ord.byRank.get(Number(ref));
  if (id == null) return "";
  return rows.some((r) => idOf(r) === id) ? id : "";
}

// (U12 #202) the range ref shape `A-B` — inclusive on BOTH ends. One shared
// parse for the mark and un-mark lanes.
const RANGE_RE = /^(\d+)-(\d+)$/;

// (U10/U12) the un-mark lane resolves bare numbers and rank RANGES BEST-EFFORT
// (the store holds ids): a resolvable rank becomes its id; anything else stays
// verbatim so stale stored ids un-mark too. An un-mark range expands rank by
// rank; an unresolvable rank contributes its verbatim number — a harmless
// no-op, un-marking needs no window.
function resolveUnmarkRef(ord: Ordinals, ref: string): string {
  if (!/^\d+$/.test(ref) || ord.ok === false) return ref;
  return ord.byRank.get(Number(ref)) ?? ref;
}

function resolveUnmarkRefs(ord: Ordinals, refs: string[]): string[] {
  const out: string[] = [];
  for (const ref of refs) {
    const m = RANGE_RE.exec(ref);
    if (m != null && ord.ok !== false) {
      for (let rk = Number(m[1]); rk <= Number(m[2]) && rk - Number(m[1]) < 10000; rk++) out.push(ord.byRank.get(rk) ?? String(rk));
      continue;
    }
    out.push(resolveUnmarkRef(ord, ref));
  }
  return out;
}

// ------------------------------------------------------------------ U17 (#208) — the report's SQL row source

// Test hook: point the REPORT row read at a fixture DB (undefined = fall back to
// the ordinal override, then the gauge-core path — the live DB). Production
// never calls it.
let reportOverridePath: string | undefined;
export function setReportDbForTest(p: string | undefined): void {
  reportOverridePath = p;
}

// THE REPORT WINDOW as the store sees it: rows AFTER the LAST completed
// compaction row — `seq >=` the MAX seq over `type = 'compaction'` rows whose
// `data` JSON carries `status: 'completed'` (COALESCE 0 = no compaction row →
// the whole session), ASC BY seq, the compaction row itself the window head.
// The row `data` column is the message info: live-verified 2026-10-28 it
// carries NO `id` (`tokens`/`time` live INSIDE it), so the `id`/`type` COLUMNS
// merge into the parsed object. READ-ONLY, NO DB WRITE EVER.
const REPORT_SQL =
  "SELECT id, type, data FROM session_message WHERE session_id = ? AND seq >= COALESCE((SELECT MAX(seq) FROM session_message WHERE session_id = ? AND type = 'compaction' AND json_extract(data, '$.status') = 'completed'), 0) ORDER BY seq ASC";
const REPORT_COUNT_SQL = "SELECT COUNT(*) AS n FROM session_message WHERE session_id = ?";

// (U17 #208) THE REPORT ROW SOURCE — the read-only SQL lane on the SAME backend
// chain and path resolution as the ordinal lane. Outcomes mirror the old
// service read: ok (rows), not-found (ZERO rows for the session — the COUNT
// discriminates), failed (every backend dead / an unreadable DB — the capped
// preview rides the caller's `error: sql-read-failed:` line). NEVER throws.
async function readReportRows(sid: string): Promise<WindowRead> {
  const p = reportOverridePath ?? ordinalsOverridePath ?? getDbPath();
  let lastPreview = "no sqlite backend available";
  for (const backend of ["node:sqlite", "bun:sqlite"]) {
    try {
      const db = await openReadonlySqlite(backend, p);
      if (db == null) continue;
      let countRaw: unknown;
      let raw: unknown;
      try {
        countRaw = db.prepare(REPORT_COUNT_SQL).all(sid);
        raw = db.prepare(REPORT_SQL).all(sid, sid);
      } finally {
        try {
          db.close?.();
        } catch {
          // close is best-effort — a read-only handle releases on GC anyway
        }
      }
      const firstRow = asRecord(Array.isArray(countRaw) ? countRaw[0] : undefined);
      if (firstRow != null && typeof firstRow["n"] === "number" && firstRow["n"] === 0) {
        return { ok: false, reason: "not-found", preview: `no session_message rows for ${sid}` };
      }
      const rows: Array<Record<string, unknown>> = [];
      for (const item of Array.isArray(raw) ? raw : []) {
        const r = asRecord(item);
        if (r == null) continue;
        let info: Record<string, unknown> = {};
        if (typeof r["data"] === "string" && r["data"] !== "") {
          try {
            const parsed = asRecord(JSON.parse(r["data"]));
            if (parsed != null) info = parsed;
          } catch {
            // a malformed data row stays an EMPTY info object: the rank, the
            // id and the type still print, the mass reads 0 — never a guess
          }
        }
        if (typeof info["type"] !== "string" && typeof r["type"] === "string") info["type"] = r["type"];
        rows.push({ ...info, id: typeof r["id"] === "string" ? r["id"] : "" });
      }
      return { ok: true, rows };
    } catch (e) {
      lastPreview = cap(String((e as { message?: unknown })?.message ?? e).replace(/\r?\n+/g, " "), 120);
    }
  }
  return { ok: false, reason: "failed", preview: lastPreview };
}

// ------------------------------------------------------------------ reportWindow (READ-ONLY)

async function reportWindow(sid: string, target?: string, ids = false): Promise<string> {
  // (U17 #208) the row source is the read-only SQL lane — the report fires NO
  // service call; the hook self-call lane (`readWindow`) stays for the writes.
  const read = await readReportRows(sid);
  if (!read.ok) {
    if (read.reason === "not-found") return `session ${sid}\nreport= rejected: session-not-found ${sid} — no rows for this id (omit session to use the caller)`;
    return `session ${sid}\nerror: sql-read-failed: ${read.preview}`;
  }
  const rows = read.rows;
  // (U10) the ordinal source for every ref the report prints and every bare
  // number it accepts — merged row-carried seqs + the full-session DB read.
  const ord = await readOrdinals(sid);
  const headIsCompaction = isHeadCompaction(rows);
  // The earliest legal boundary index: 0 is the window HEAD (the summary/check-
  // point entry — never a boundary), so the first legal index is 1; an EMPTY
  // window has no legal boundary at all.
  const aMin = 1;
  const store = readStore();
  const entry = store.sessions[sid];
  const staged = entry?.staged ?? [];
  const active = entry?.active ?? [];
  // (U35 #230) THE STORE-PRESENCE DISTINGUISHER on the report read path: the
  // store FILE is absent (ENOENT — `readStore` fail-opens to an empty sessions
  // map) or the session carries NO ENTRY (entries are PRUNED when every lever
  // drains — the NORMAL steady state). Both previously read as the
  // `staged=0 active=0` band, so an agent could not tell "my drop set vanished"
  // from "an entry EXISTS with empty sets". The header names the state
  // NEUTRALLY below (`store=missing`) — absence is a state, not an error, and
  // recovery stays a re-mark by the agent (no lane).
  const storeMissing = entry === undefined;
  // (U15 #204) the per-row drop mask for the REPORT — flags come from the STORE
  // ids matched against WINDOW rows: a stale stored id matches no row, so it
  // neither flags a kept row nor inflates the in-window counts. Precedence
  // ` x` (the ACTIVE set — an applied drop) over ` g` (the `auto` set: a guard
  // pick OR a `free` pick) over ` s` (staged-only); a kept row carries NO flag
  // token (byte-identity). The flag names SET MEMBERSHIP per the spec — the
  // boundary/pair interplay stays the hook's business. (U33 #223 vocabulary:
  // ONE term per drop set — `staged`, `active`, `auto` — the legend too.)
  const activeSet = new Set(active);
  const autoSet = new Set(entry?.auto ?? []);
  const stagedSet = new Set(staged);
  let droppedIn = 0;
  let stagedIn = 0;
  for (const r of rows) {
    const mid = idOf(r);
    if (mid === "") continue;
    if (activeSet.has(mid) || autoSet.has(mid)) droppedIn++;
    else if (stagedSet.has(mid)) stagedIn++;
  }
  const storedIndex = entry != null && entry.boundary !== "" ? rows.findIndex((r) => idOf(r) === entry.boundary) : -1;
  // inside = the boundary is a legal window boundary; stale = it is stored but
  // NOT legal in the CURRENT window (buried by a new compaction row, at the
  // head, or its row is gone); a marks-only entry (boundary "") is absent.
  const state = entry == null || entry.boundary === "" ? "absent" : storedIndex >= aMin ? "inside" : "stale";
  const retained = state === "inside" ? rows.length - storedIndex : rows.length;

  // (2) the shared gauge-core figure (the v2-paired session/mass read — no new
  // SQL). A db-error read is ONE honest line; the report survives. Read BEFORE
  // the header block: the #189 line names its CTX as the request estimate.
  const g = await gauge.readGauge(undefined, sid);
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
      ` boundary-state=${state} retained=${retained} ` +
      // (U35 #230) missing store -> the NEUTRAL band; an entry that EXISTS
      // keeps the U33 clean band BYTE-IDENTICAL (the U10/U14/U15 literals too).
      (storeMissing ? "store=missing (normal when no drops were stored)" : `staged=${staged.length} active=${active.length} active-est=${markEstimate(rows, active)}`) +
      ` ordinal=${ord.ok === true ? "session-rank" : "unavailable"}` +
      ` guard=${entry?.guard === true ? "on" : "off"} auto=${entry?.auto.length ?? 0}` +
      // (U15) the in-window counts ride the header ONLY when at least one row
      // is flagged — a clean report stays BYTE-IDENTICAL to the pre-U15 form.
      // Raw set sizes above; these count WINDOW rows (stale ids never inflate).
      (droppedIn + stagedIn > 0 ? ` dropped-in-window=${droppedIn} staged-in-window=${stagedIn}` : ""),
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
    lines.push(`gauge: ${gauge.formatGauge(g)}`);
  }

  // (2b) the numbered rows (the CUT-DOWN form). U8: `own=` is the row's OWN
  // weight; `req-at=` is the REQUEST size at that step (completed-assistant
  // provider total) — never a weight; rows LACKING the provider figure print
  // `req-at=unavailable` honestly (U17 #208 R3 — never a silent absence). U10/U12 (#196/#202): `#N` = the row's
  // PER-SESSION RANK (its position in the session's append-only row order —
  // the number a row keeps FOREVER: stable across drops, compactions,
  // restarts; compaction rows and trimmed-away rows occupy their rank too;
  // `?` when the ordinal source is unreadable). `N` stays the WINDOW position
  // (the map shape); `mark` accepts `#N` or `N`-shaped bare numbers AND range
  // refs `A-B` as refs.
  // (U15 #204) the legend — printed ONLY when at least one row carries a flag
  // (a clean report gains nothing, keeping it byte-identical).
  if (droppedIn + stagedIn > 0) lines.push("flags: s=staged x=active g=auto (guard or free)");
  rows.forEach((r, i) => {
    const reqAt = providerTotalOf(r);
    // (U15) the per-row state flag RIGHT AFTER the rank: ` x` active (leaves
    // the next request), ` g` guard-auto, ` s` staged-only — a row BOTH
    // staged and active takes ` x`; a kept row prints NOTHING extra.
    const mid = idOf(r);
    const flag = mid !== "" && activeSet.has(mid) ? " x" : mid !== "" && autoSet.has(mid) ? " g" : mid !== "" && stagedSet.has(mid) ? " s" : "";
    // (U30 #222 R4) `req-at=` rides ONLY rows that CAN carry the figure: completed
    // assistant rows print the number, unfinished/figure-less assistant rows print
    // `unavailable` (U17 honesty), the never-carrying classes (user/system/
    // synthetic/compaction/idle) print NOTHING for it (the noise class is gone).
    const rtype = String(r["type"] ?? "?");
    lines.push(`row: ${i + 1} #${ordinalOf(ord, r)}${flag} ${rtype}` + (ids ? ` id=${idOf(r)}` : "") + ` own=${ownMassOf(r)}` + (reqAt >= 0 ? ` req-at=${reqAt}` : rtype === "assistant" ? " req-at=unavailable" : "") + toolTargets(r)); // (U11 #200) id= DROPPED by default — the opaque id cost ~8-10 tokens/row; the row is named by #<seq>; `ids:true` restores
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
        `option ${o.label}: msg=#${ordinalOf(ord, rows[o.idx])} keep=${rows.length - o.idx}` + // (U10) the anchor names the row by ORDINAL
          ` retained=${massSum(keptRows)} (read=${rSplit.read} thought=${rSplit.thought} shell=${rSplit.shell})` +
          ` dropped=${massSum(droppedRows)} (read=${dSplit.read} thought=${dSplit.thought} shell=${dSplit.shell})` +
          ` hint=${hintOf(rows[o.idx])}`,
      );
    }
  }

  // (4) the biggest-droppable list: the top-5 heaviest FINISHED turns (no
  // error) strictly after the head (the head is never droppable) — U8: ranked
  // by OWN mass (weight), NOT by the cumulative req-at figure, so recency
  // cannot dominate the ranking.
  const turns: { row: number; mass: number }[] = [];
  rows.forEach((r, i) => {
    if (i === 0) return;
    if (r["type"] !== "assistant") return;
    const time = asRecord(r["time"]);
    if (time == null || time["completed"] == null) return;
    if (r["error"] != null) return;
    const own = ownMassOf(r);
    if (own === 0) return; // U8: a weight-zero row (no parts of its own) is not a biggest candidate
    turns.push({ row: i + 1, mass: own });
  });
  turns.sort((a, b) => b.mass - a.mass || a.row - b.row);
  const big = turns.slice(0, 5);
  // (U10) `biggest:` names rows by ORDINAL (the number `mark` accepts), tie-
  // ordered by window position as before.
  if (big.length > 0) lines.push(`biggest: ${big.map((b) => `#${ordinalOf(ord, rows[b.row - 1])}=${b.mass}`).join(" ")}`);

  // (5) the dry-run (with target) — the tail validation, NO write. Like v1, the
  // counts print for `ok` AND for the floor rejection (a computable target).
  // (U10) the target may be a bare ORDINAL — resolved through the ordinal map
  // before the guards; an unresolvable number lands in `target-not-found`.
  if (target != null) {
    const tid = resolveRef(ord, target, rows);
    const verdict = tailVerdict(rows, tid);
    if (verdict === "ok" || verdict.startsWith("rejected: retained-tail-below-floor")) {
      const i = rows.findIndex((r) => idOf(r) === tid);
      const oldStart = state === "inside" ? storedIndex : 0;
      const removeCount = i > oldStart ? i - oldStart : 0;
      const removeMass = removeCount > 0 ? massSum(rows.slice(oldStart, i)) : 0;
      const keepCount = rows.length - i;
      const keepMass = massSum(rows.slice(i));
      lines.push(`dry-run: target=${tid !== "" ? tid : target} remove=${removeCount} (${removeMass} tokens) keep=${keepCount} (${keepMass} tokens) verdict=${verdict}`);
    } else {
      lines.push(`dry-run: target=${tid !== "" ? tid : target} verdict=${verdict}`);
    }
  }
  // (U28 F3) the STEER line — exactly ONE bounded next-action line closing every
  // SUCCESSFUL report (≤ 110 chars via the U9 `cap` helper), chosen from THIS
  // report's own state: the projection verdict, the fill % (gauge CTX over the
  // window), the staged/active counts, the stored `auto` size (the ` g` rows),
  // and the `biggest:` candidates. First-match ladder: over-bound -> free/force;
  // fill >= 85% -> free; staged rows -> apply; stored drop sets (active/auto —
  // the guard presence shows as ` g` rows) -> clear; else mark the top
  // `biggest:` ranks. Deterministic — the same state prints the same line (the
  // U15 V7 byte-identical roundtrip pin depends on that).
  const fillPct = gCtx != null && gWin != null && gWin > 0 ? Math.round((gCtx * 100) / gWin) : undefined;
  const freeN = fillPct != null && fillPct >= 90 ? 30 : 20;
  const autoN = entry?.auto.length ?? 0;
  const bigRanks = big.slice(0, 3).map((b) => `#${ordinalOf(ord, rows[b.row - 1])}`).join(",");
  let steer: string;
  if (projected != null && bound != null && projected > bound) steer = `next: free target=${freeN} (over-bound) | apply force`;
  else if (fillPct != null && fillPct >= 85) steer = `next: free target=${freeN}`;
  else if (staged.length > 0) steer = `next: apply (${staged.length} staged) | unmark/clear`;
  else if (active.length + autoN > 0) steer = `next: clear (drop sets hold ${active.length + autoN}) | mark #<ranks> + apply`;
  else if (bigRanks !== "") steer = `next: mark ${bigRanks} + apply | free target=${freeN}`;
  else steer = "next: mark #<ranks> + apply";
  lines.push(cap(steer, 110));
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
    const keepSets = before != null && (before.staged.length > 0 || before.active.length > 0 || before.auto.length > 0);
    const okWrite = keepSets
      ? writeSessionEntry(sid, { boundary: "", keep: 0, setAt: before.setAt, staged: before.staged, active: before.active, guard: before.guard, auto: before.auto, noticed: before.noticed })
      : writeSessionEntry(sid, null);
    if (!okWrite) return `tail-set= error: store-write-failed (the boundary file could not be written)`;
    appendLog(buildLine("tail", { session: sid, state: "cleared", from: before != null && before.boundary !== "" ? before.boundary : undefined, marks: keepSets ? String(before.staged.length + before.active.length) : undefined }, {}));
    staleLogged.delete(sid);
    if (!keepSets) trimApplied.delete(sid); // (U28 F2) the entry is GONE — the trace signature resets
    return `tail-set= ${before != null && before.boundary !== "" ? before.boundary : "none"} -> none`;
  }
  const read = await readWindow(sid);
  if (!read.ok) {
    if (read.reason === "not-found") return `tail-set= rejected: session-not-found ${sid} — pass a live session id`;
    return `tail-set= error: context-read-failed: ${read.preview}`;
  }
  const rows = read.rows;
  // (U10) the target may name a row by bare ORDINAL — resolved through the
  // ordinal map; guards unchanged (an unresolvable number → target-not-found).
  const ord = await readOrdinals(sid);
  let targetID: string;
  let retained: number;
  if (form.keep != null) {
    const keep = form.keep;
    if (!Number.isInteger(keep) || keep <= 0) return `tail-set= rejected: keep-invalid ${String(keep)} — keepMessages is a positive count`;
    if (keep > rows.length) return `tail-set= rejected: keep-exceeds-history ${String(keep)} — keep <= the ${rows.length} window rows`;
    const i = rows.length - keep;
    if (i < 1) return `tail-set= rejected: keep-at-window-head ${String(keep)} — keep fewer than the ${rows.length} window rows`;
    targetID = idOf(rows[i]);
    retained = keep;
    if (retained < FLOOR) return `tail-set= rejected: retained-tail-below-floor ${retained} keep=${keep} — keep >= ${FLOOR} rows`;
  } else {
    targetID = resolveRef(ord, form.target ?? "", rows);
    const verdict = tailVerdict(rows, targetID);
    if (verdict !== "ok") {
      // (U30 #222 R1) the rejection NAMES the offending ref AND the fix, ONE line.
      const rem = verdict.startsWith("rejected: retained-tail-below-floor")
        ? `keep >= ${FLOOR} rows`
        : verdict === "rejected: target-at-window-head" ? "a boundary sits after the window head" : "use a row id or #<rank> from report";
      return `tail-set= ${verdict} ${cap(String(form.target ?? ""), 40)} — ${rem}`;
    }
    retained = rows.length - rows.findIndex((r) => idOf(r) === targetID);
  }
  if (targetID === "") return `tail-set= rejected: target-not-found ${cap(String(form.target ?? ""), 40)} — use a row id or #<rank> from report`;
  const before = readStore().sessions[sid];
  if (!writeSessionEntry(sid, { boundary: targetID, keep: retained, setAt: new Date().toISOString(), staged: before?.staged ?? [], active: before?.active ?? [], guard: before?.guard ?? false, auto: before?.auto ?? [], noticed: before?.noticed ?? [] })) {
    return `tail-set= error: store-write-failed (the boundary file could not be written)`;
  }
  staleLogged.delete(sid);
  appendLog(buildLine("tail", { session: sid, state: "set", boundary: targetID, keep: String(retained), from: before != null && before.boundary !== "" ? before.boundary : undefined }, {}));
  return `tail-set= ${before != null && before.boundary !== "" ? before.boundary : "none"} -> ${targetID} keep=${retained}`;
}

// ------------------------------------------------------------------ markSet (the (8)/(9) staged drop-list store write)

// (U36 #231) the SELF-trim row shape: an assistant row whose content carries a
// COMPLETED `context_trim` tool part (any mode) — the self-report lane source.
function isSelfTrimRow(r: Record<string, unknown>): boolean {
  for (const item of asArray(r["content"])) {
    const it = asRecord(item);
    if (it == null || it["type"] !== "tool" || it["name"] !== "context_trim") continue;
    const state = asRecord(it["state"]);
    if (state != null && state["status"] === "completed") return true;
  }
  return false;
}

async function markSet(sid: string, form: { ids?: string[]; unmark?: string[]; clear?: boolean; guard?: boolean; self?: boolean }): Promise<string> {
  // (U14) GUARD TOGGLE — a TOGGLE-ONLY call (`guard`, no ids/unmark/clear) is
  // valid: it writes ONLY the per-session flag (a flag-only entry survives the
  // empty-sets prune). DEFAULT OFF — the control arm stays clean until a
  // session opts in. (U17 #203) the (U10) tags TOGGLE is DELETED with the tag
  // lane — a legacy store `tags` key prunes on this write.
  if (form.guard !== undefined && form.ids == null && form.unmark == null && form.clear !== true && form.self !== true) {
    const before = readStore().sessions[sid];
    const next: StoreEntry = before != null
      ? { boundary: before.boundary, keep: before.keep, setAt: new Date().toISOString(), staged: before.staged, active: before.active, guard: form.guard ?? before.guard, auto: before.auto, noticed: before.noticed }
      : { boundary: "", keep: 0, setAt: new Date().toISOString(), staged: [], active: [], guard: form.guard ?? false, auto: [], noticed: [] };
    if (!writeSessionEntry(sid, next)) return `mark-set= error: store-write-failed (the boundary file could not be written)`;
    appendLog(buildLine("mark", { session: sid, guard: form.guard ? "on" : "off", total: String(next.staged.length + next.active.length) }, {}));
    return `mark-set= guard=${form.guard ? "on" : "off"}`;
  }
  if (form.clear === true) {
    const before = readStore().sessions[sid];
    // (9) mark `clear` empties BOTH sets (staged AND active) and keeps a stored
    // boundary (the tail `clear` is the mirror — it keeps both sets).
    // (U17 #203) the tags lever is GONE — only the guard FLAG survives a clear.
    const removed = before != null ? before.staged.length + before.active.length + before.auto.length : 0;
    const guardNext = form.guard ?? before?.guard ?? false;
    if (removed > 0 || form.guard !== undefined) {
      // (U14) `clear` empties the guard's `auto` set TOO (all three drop sets);
      // the guard FLAG survives a clear — a separate lever.
      if (!writeSessionEntry(sid, { boundary: before?.boundary ?? "", keep: before?.keep ?? 0, setAt: new Date().toISOString(), staged: [], active: [], auto: [], guard: guardNext, noticed: [] }))
        return `mark-set= error: store-write-failed (the boundary file could not be written)`;
      marksStaleLogged.delete(sid);
      trimApplied.delete(sid); // (U28 F2) ALL drop sets emptied — the trace signature resets (the next drop logs once)
      appendLog(buildLine("mark", { session: sid, added: "0", removed: String(removed), total: "0", est: "0", guard: form.guard !== undefined ? (form.guard ? "on" : "off") : undefined }, {}));
      return `mark-set= +0 -${removed} total=0 rows_dropped_est=0`;
    }
    return `mark-set= +0 -0 total=0 rows_dropped_est=0`; // idempotent — nothing stored
  }
  const read = await readWindow(sid);
  if (!read.ok) {
    if (read.reason === "not-found") return `mark-set= rejected: session-not-found ${sid} — pass a live session id`;
    return `mark-set= error: context-read-failed: ${read.preview}`;
  }
  const rows = read.rows;
  // (U10/U12) bare-number refs resolve through the PER-SESSION RANK map before
  // any guard — never through window position; the guards themselves are
  // UNCHANGED (`mark-not-found`, `mark-at-window-head`, `mark-floor`) but the
  // head/floor rejections NAME the offending resolved rows (U12).
  const ord = await readOrdinals(sid);
  const entry = readStore().sessions[sid];
  const current = entry?.staged ?? [];
  const active = entry?.active ?? [];
  // (U10/U12) an ALL-DIGIT un-mark ref becomes its id through the rank map and
  // an un-mark RANGE expands rank by rank (best-effort: anything else stays
  // verbatim so stale stored ids un-mark too).
  const dropUnmark = new Set(resolveUnmarkRefs(ord, form.unmark ?? []));
  const kept = current.filter((m) => !dropUnmark.has(m)); // un-marking needs NO window (stale ids un-mark too)
  const removed = current.length - kept.length;
  const newIds: string[] = [];
  // (U12 #202) RANGE REFS `A-B` (inclusive) mixed with singletons — resolved
  // against the CURRENT WINDOW through the per-session rank map. A range with
  // a rank that maps to no window row (a trimmed-away row, a row beyond the
  // session) rejects FAIL-CLOSED naming the offending ranks — NOTHING is
  // written. An A>B or A<1 range is an invalid ref, rejected before any
  // resolution.
  const singles: string[] = [];
  let sawRange = false;
  const resolvedById = new Map<string, number>(); // id -> rank of every ref-resolved IN-WINDOW row (the audit echo)
  for (const ref of form.ids ?? []) {
    const m = RANGE_RE.exec(ref);
    if (m == null) {
      singles.push(ref);
      continue;
    }
    sawRange = true;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a < 1 || b < a) return `mark-set= rejected: mark-range-invalid ${cap(ref, 40)} — range needs A-B with A >= 1 and B >= A`;
    if (ord.ok === false) return `mark-set= rejected: mark-range-unresolved ${cap(ref, 40)} ordinal=unavailable — mark row ids from report`;
    const missing: number[] = [];
    const picked: { rank: number; id: string }[] = [];
    for (let rk = a; rk <= b && rk - a < 10000; rk++) {
      const id = ord.byRank.get(rk);
      if (id == null || !rows.some((r) => idOf(r) === id)) {
        missing.push(rk);
        continue;
      }
      picked.push({ rank: rk, id });
    }
    if (missing.length > 0)
      return `mark-set= rejected: mark-range-unresolved ${cap(ref, 40)} ranks ${missing.slice(0, 10).join(",")}${missing.length > 10 ? ` +${missing.length - 10} more` : ""} — use #<rank> rows from report`; // fail-closed — the whole batch is refused, NOTHING written
    for (const { rank, id } of picked) {
      resolvedById.set(id, rank);
      if (current.includes(id) || newIds.includes(id)) continue; // already staged — no-op, not re-validated
      const i = rows.findIndex((r) => idOf(r) === id);
      if (i === 0) return `mark-set= rejected: mark-at-window-head #${rank} ${id} — the head is never droppable`; // (U12) names the offending row
      newIds.push(id);
    }
  }
  for (const ref of singles) {
    const id = resolveRef(ord, ref, rows); // an id passes through; a bare rank becomes its window id
    if (id !== "" && ord.ok === true) {
      const rk = ord.byId.get(id);
      if (rk != null && rows.some((r) => idOf(r) === id)) resolvedById.set(id, rk); // join the audit echo
    }
    if (current.includes(id) || newIds.includes(id)) continue; // already staged — no-op, not re-validated
    if (id === "") return `mark-set= rejected: mark-not-found ${cap(ref, 40)} — use an id or #<rank> from report`; // (U30 R1) unknown rank / number with an unreadable source — names the ref AND the fix
    const i = rows.findIndex((r) => idOf(r) === id);
    if (i < 0) return `mark-set= rejected: mark-not-found ${cap(ref, 40)} — use an id or #<rank> from report`; // (U30 R1) a rank naming an OUT-of-window row lands here too — names the ref AND the fix
    if (i === 0) return `mark-set= rejected: mark-at-window-head ${ord.ok === true ? `#${ord.byId.get(id) ?? "?"} ` : ""}${id} — the head is never droppable`; // (U12) names the offending row
    newIds.push(id);
  }
  // (U36 #231) SELF lane — `self:true` stages the session's OWN completed
  // `context_trim` call rows. Same guards as ids: the window head (index 0)
  // is skipped, un-marked ids stay out, already-staged ids are no-ops, and
  // the floor guard below runs over the UNION incl. these picks.
  let selfCount = 0;
  if (form.self === true) {
    for (let i = 1; i < rows.length; i++) {
      const id = idOf(rows[i]);
      if (id === "" || dropUnmark.has(id) || current.includes(id) || newIds.includes(id)) continue;
      if (isSelfTrimRow(rows[i])) {
        newIds.push(id);
        selfCount++;
      }
    }
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
  for (const m of [...active, ...(entry?.auto ?? []), ...staged]) {
    const i = rows.findIndex((r) => idOf(r) === m);
    if (i >= 1) dropIdx.add(i);
  }
  const retained = rows.length - dropIdx.size;
  if (retained < FLOOR)
    return `mark-set= rejected: mark-floor ${retained} breach=${cap(newIds.length > 0 ? newIds.join(",") : "none", 160)} — stage fewer rows (floor ${FLOOR})`; // (U12) names the offending resolved rows
  const est = markEstimate(rows, staged);
  if (!writeSessionEntry(sid, { boundary, keep: entry?.keep ?? 0, setAt: new Date().toISOString(), staged, active, guard: form.guard ?? entry?.guard ?? false, auto: entry?.auto ?? [], noticed: entry?.noticed ?? [] }))
    return `mark-set= error: store-write-failed (the boundary file could not be written)`;
  marksStaleLogged.delete(sid);
  appendLog(buildLine("mark", { session: sid, added: String(newIds.length), removed: String(removed), total: String(staged.length), est: String(est) }, {}));
  // (U12 #202) a call that carried RANGE refs echoes the audit: how many rows
  // the refs resolved to IN the window and the first/last resolved rank — a
  // bulk op is auditable without re-reading the store.
  let echo = "";
  if (sawRange && resolvedById.size > 0) {
    let first = Number.POSITIVE_INFINITY;
    let last = Number.NEGATIVE_INFINITY;
    for (const rk of resolvedById.values()) {
      if (rk < first) first = rk;
      if (rk > last) last = rk;
    }
    echo = ` resolved=${resolvedById.size} ordinals=${first}-${last}`;
  }
  // (U36 #231) the SELF lane echoes how many own-context_trim rows it staged.
  if (form.self === true) echo += ` self=${selfCount}`;
  return `mark-set= +${newIds.length} -${removed} total=${staged.length} rows_dropped_est=${est}${echo}`;
}

// ------------------------------------------------------------------ applySet (the (9) staged->active move + projection)

const BOUND_FRAC = 0.8; // the hard apply bound: eighty percent of the gauge-core window value
// (U14 #205) the wall-guard trigger: the projected request at NINETY-TWO percent
// of the gauge-core window fires the auto-drop. The single tunable of the guard
// (the spec's "configurable fraction"); the test lane may steer it.
let GUARD_FRAC = 0.92;
export function setGuardFracForTest(f: number): void {
  GUARD_FRAC = f;
}
// (U31 H2, #227) OUTPUT_RESERVE — the HARD SAFETY LEG's output reserve: the leg
// fires when the CORRECTED live estimate reaches window MINUS this reserve, so
// the ANSWER still fits. 24,576 tokens = 1/6 of the 262,144-token window (the
// planner's 2026-10-29 ruling). The provider figure cannot see what the step
// grew AFTER the last finished request (U20: last-req ~185k, the request died
// at 284,070) — this leg covers that class.
const OUTPUT_RESERVE = 24576;
// (U31 H3) the hard leg's per-fire drain cap: at most 25% of the window leaves
// in ONE fire — a growth burst must not strip the session bare.
const HARD_CAP_FRAC = 0.25;

// Moves `staged` into `active` (union, staged emptied) ONLY after the projected
// request size passes the bound; a rejection writes NOTHING (fail-closed, like
// every other guard). U8 projection: last completed request prompt (gauge ctx −
// output = input + cache.read — provider authority HERE) minus `drop_est` = the
// OWN-mass sum of the newly active rows (POSITIVE — own weights, not the
// cumulative req-at figures); `mixed=` counts staged rows without a provider
// counterpart. An over-bound apply rides `force:true` deliberately (the bound is
// a guard rail, not a wall).
async function applySet(sid: string, force: boolean): Promise<string> {
  let entry = readStore().sessions[sid];
  let staged = entry?.staged ?? [];
  if (staged.length === 0) {
    // U9 (#194): a same-step `mark` + `apply` can RACE — the host may run the
    // apply BEFORE the mark's store write lands. ONE bounded re-read (350ms)
    // rides the fresh write: apply either applies the new set or says
    // `nothing-staged` truthfully — never a false rejection after a successful
    // `mark-set=` line.
    await new Promise((r) => setTimeout(r, 350));
    entry = readStore().sessions[sid];
    staged = entry?.staged ?? [];
    if (staged.length === 0) return `apply= rejected: nothing-staged — stage rows with mark mode first`;
  }
  const read = await readWindow(sid);
  if (!read.ok) {
    if (read.reason === "not-found") return `apply= rejected: session-not-found ${sid} — pass a live session id`;
    return `apply= error: context-read-failed: ${read.preview}`;
  }
  const g = await gauge.readGauge(undefined, sid);
  const gr = g as { ctx?: unknown; window?: unknown; output?: unknown };
  const gCtx = typeof gr.ctx === "number" && Number.isFinite(gr.ctx) ? gr.ctx : undefined;
  const gOut = typeof gr.output === "number" && Number.isFinite(gr.output) ? gr.output : undefined;
  const gWin = typeof gr.window === "number" && Number.isFinite(gr.window) ? gr.window : undefined;
  if (gCtx == null || gWin == null) return `apply= error: gauge-unavailable (the projection needs the gauge core's ctx + window)`;
  const lastReq = gOut != null ? gCtx - gOut : gCtx;
  const { mass: dropEst, mixed } = idsMass(read.rows, staged);
  const projected = lastReq - dropEst;
  const bound = Math.floor(gWin * BOUND_FRAC);
  if (projected > bound && !force) return `apply= rejected: over-bound ${projected} ${bound} — pass force:true to ride through deliberately`;
  const active = [...(entry?.active ?? [])];
  for (const id of staged) if (!active.includes(id)) active.push(id);
  if (!writeSessionEntry(sid, { boundary: entry?.boundary ?? "", keep: entry?.keep ?? 0, setAt: new Date().toISOString(), staged: [], active, guard: entry?.guard ?? false, auto: entry?.auto ?? [], noticed: entry?.noticed ?? [] }))
    return `apply= error: store-write-failed (the boundary file could not be written)`;
  marksStaleLogged.delete(sid);
  appendLog(buildLine("apply", { session: sid, n: String(staged.length), dropEst: String(dropEst), projected: String(projected), bound: String(bound), mixed: String(mixed), forced: force ? "true" : undefined }, {}));
  return `apply= staged->active n=${staged.length} drop_est=${dropEst} projected=${projected} bound=${bound} ok mixed=${mixed}`;
}

// ------------------------------------------------------------------ freeSet (the (15) U18 free-space mode)

// The free-space target: the PERCENT of the gauge-core window value to free.
// DEFAULT 20; the accepted band 5..60 is validated by the caller (execute) —
// anything else is refused fail-closed before anything reads or writes.
const FREE_DEFAULT = 20;
const FREE_MIN = 5;
const FREE_MAX = 60;

// ONE atomic free-space op: drop rows into the session's `auto` set (the (13)
// guard's own sticky set — the hook's removal lane and the report's ` g` flag
// are UNCHANGED) until `pct`% of the gauge window value is freed. The candidate
// rule is the SHARED `dropCandidates` symbol (U21 F3: the guard and `free` can no
// longer drift — one head/user/compaction/newest-assistant rule, one floor-mass
// rule, one sort). The freed sum is the SAME OWN-mass estimator as `markEstimate`.
// A shortfall stops at pool exhaustion and says so — no escalation, no bound check
// (this lane FREES space, it does not project a request).
async function freeSet(sid: string, pct: number): Promise<string> {
  const read = await readWindow(sid);
  if (!read.ok) {
    if (read.reason === "not-found") return `free= rejected: session-not-found ${sid} — pass a live session id`;
    return `free= error: context-read-failed: ${read.preview}`;
  }
  const rows = read.rows;
  const g = await gauge.readGauge(undefined, sid);
  const gr = g as { ctx?: unknown; output?: unknown; window?: unknown };
  const gCtx = typeof gr.ctx === "number" && Number.isFinite(gr.ctx) ? gr.ctx : undefined;
  const gOut = typeof gr.output === "number" && Number.isFinite(gr.output) ? gr.output : undefined;
  const gWin = typeof gr.window === "number" && Number.isFinite(gr.window) ? gr.window : undefined;
  // The target percent is a fraction of the window — no window, no anchor.
  if (gWin == null || gWin <= 0) return `free= rejected: gauge-window-unavailable`;
  const entry = readStore().sessions[sid];
  const floorKeep = Math.max(FLOOR, entry?.keep ?? 0);
  const bIdx = entry != null && entry.boundary !== "" ? rows.findIndex((r) => idOf(r) === entry.boundary) : -1;
  // the rows a lever ALREADY drops (boundary region + active + auto) — they are
  // not candidates (no double-pick, no double count); a stale boundary (index
  // < 1) drops nothing, the same rule as the hook.
  const dropIdx = new Set<number>();
  if (bIdx >= 1) for (let k = 0; k < bIdx; k++) dropIdx.add(k);
  for (const m of [...(entry?.active ?? []), ...(entry?.auto ?? [])]) {
    const i = rows.findIndex((r) => idOf(r) === m);
    if (i >= 1) dropIdx.add(i);
  }
  const cand = dropCandidates(rows, floorKeep, bIdx, dropIdx);
  const need = Math.floor((gWin * pct) / 100);
  const picks: string[] = [];
  let freed = 0;
  // No survivor-count stop (U21 D3): the structural never-rules inside
  // `dropCandidates` (head, user, compaction, newest assistant) keep the dialog
  // alive, and a tool-output-dominant floor row is droppable by ruling.
  for (const c of cand) {
    if (freed >= need) break; // the target is met — stop
    picks.push(c.id);
    freed += c.mass;
  }
  const short = freed < need;
  if (picks.length > 0) {
    // sticky like the guard picks: they leave the draft on the NEXT assembly
    // (the hook's `auto` leg) and stay until `mark clear`.
    if (!writeSessionEntry(sid, { boundary: entry?.boundary ?? "", keep: entry?.keep ?? 0, setAt: entry?.setAt ?? new Date().toISOString(), staged: entry?.staged ?? [], active: entry?.active ?? [], guard: entry?.guard ?? false, auto: [...(entry?.auto ?? []), ...picks], noticed: entry?.noticed ?? [] }))
      return `free= error: store-write-failed (the boundary file could not be written)`;
  }
  const lastReq = gCtx != null ? (gOut != null ? gCtx - gOut : gCtx) : undefined;
  const projected = lastReq != null ? lastReq - freed : undefined;
  const boundFill = projected != null ? Math.floor((projected * 100) / gWin) : undefined;
  // (U30 #222 R3) the BAND the free landed in: `fill=` = the projected REQUEST
  // fill over the window AFTER the drops (the CTX-based request leg; `bound-fill`
  // stays the PROMPT projection). Existing fields keep their order; the log
  // line stays byte-identical (the free record keeps {ts,session,target,freed,
  // picks,short}).
  const fillPct = gCtx != null ? Math.floor(((gCtx - freed) * 100) / gWin) : undefined;
  appendLog(buildLine("free", { session: sid, target: String(pct), freed: String(freed), picks: String(picks.length), short: short ? "yes" : "no" }, {}));
  return `free= freed=${freed} target=${pct} bound-fill=${boundFill != null ? `${boundFill}%` : "unavailable"} fill=${fillPct != null ? `${fillPct}%` : "unavailable"} picks=${picks.length} short=${short ? "yes" : "no"}`;
}
// ------------------------------------------------------------------ (U30 #226 R5) the store-hygiene lanes

// The newest COMPLETED-assistant ("provider") row + the newest row OVERALL per
// sid — the DEAD-sid guard inputs. Two read-only statements over the SAME
// backend chain + path resolution as the report lane; NOTHING is ever written.
// null = the DB lane is unreadable (the caller fails closed); a sid ABSENT from
// the Map = zero provider rows AND no running step.
const HYGIENE_SQL =
  "SELECT seq, json_extract(data, '$.time.completed') AS tc FROM session_message WHERE session_id = ? AND type = 'assistant' AND json_extract(data, '$.time.completed') IS NOT NULL ORDER BY seq DESC LIMIT 1";
// (U33 #226 G2) the IN-FLIGHT leg: an assistant row with NO `time.completed` as
// the session's NEWEST row means a step is running NOW — LIVE, whatever the
// session API's recency reads.
const HYGIENE_LAST_SQL =
  "SELECT type, json_extract(data, '$.time.completed') AS tc FROM session_message WHERE session_id = ? ORDER BY seq DESC LIMIT 1";

type HygieneRow = { seq: number; tc: number; inflight: boolean };

async function newestProviderRows(sids: string[]): Promise<Map<string, HygieneRow> | null> {
  const p = reportOverridePath ?? ordinalsOverridePath ?? getDbPath();
  for (const backend of ["node:sqlite", "bun:sqlite"]) {
    try {
      const db = await openReadonlySqlite(backend, p);
      if (db == null) continue;
      const out = new Map<string, HygieneRow>();
      try {
        const stmt = db.prepare(HYGIENE_SQL);
        const lastStmt = db.prepare(HYGIENE_LAST_SQL);
        for (const sid of sids) {
          const raw = stmt.all(sid);
          const row = asRecord(Array.isArray(raw) ? raw[0] : undefined);
          const rawLast = lastStmt.all(sid);
          const last = asRecord(Array.isArray(rawLast) ? rawLast[0] : undefined);
          const inflight = last != null && last["type"] === "assistant" && last["tc"] == null;
          if (row != null && typeof row["seq"] === "number") {
            const tcRaw = row["tc"];
            const tc = typeof tcRaw === "number" ? tcRaw : Date.parse(String(tcRaw ?? ""));
            out.set(sid, { seq: row["seq"], tc: Number.isFinite(tc) ? tc : NaN, inflight });
          } else if (inflight) {
            // no completed provider row yet but a step IS running: the listing
            // prints `newest=none`, the verdict reads the entry as LIVE
            out.set(sid, { seq: -1, tc: NaN, inflight: true });
          }
        }
      } finally {
        try {
          db.close?.();
        } catch {
          // close is best-effort — a read-only handle releases on GC anyway
        }
      }
      return out;
    } catch {
      // try the next backend; an all-dead chain stays `null`
    }
  }
  return null;
}

// (U33 #226 G2) THE DEADNESS SIGNAL — an entry is DEAD when its session is
// INACTIVE, not merely when no provider row postdates `set_at`: a completed
// worker that self-trimmed mid-run carries rows AFTER `set_at` and stayed
// `live=yes` forever (13 of 14 store entries, planner listing 2026-10-29).
// Read-only legs in order: (1) the session API `get` — a missing session reads
// `gone`, one whose `time.updated` sits inside HYGIENE_IDLE_MS reads `active`,
// anything else `inactive`; (2) the in-flight row leg above; (3) the U30
// row-staleness rule ONLY as the fail-closed FALLBACK when the API lane is
// absent or unreadable. NO DB write, no write-lane call, no `session.active`
// (that endpoint is not on the plugin surface).
const HYGIENE_IDLE_MS = 30 * 60 * 1000;

export type HygieneLiveness = Map<string, "active" | "inactive" | "gone"> | null;
let livenessOverride: ((sids: string[]) => Promise<HygieneLiveness>) | undefined;
export function setLivenessForTest(fn: ((sids: string[]) => Promise<HygieneLiveness>) | undefined): void {
  livenessOverride = fn;
}

function msOf(v: unknown): number {
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") return Date.parse(v);
  return NaN;
}

async function livenessOf(sids: string[]): Promise<HygieneLiveness> {
  if (livenessOverride != null) return livenessOverride(sids);
  const get = sessionApi?.get;
  if (typeof get !== "function") return null;
  const out = new Map<string, "active" | "inactive" | "gone">();
  for (const sid of sids) {
    try {
      const info = await (get as (i: { sessionID: string }) => Promise<unknown>)({ sessionID: sid });
      if (info == null) {
        out.set(sid, "gone");
        continue;
      }
      const rec = asRecord(info);
      const updated = msOf(asRecord(rec?.["time"])?.["updated"] ?? rec?.["time_updated"]);
      out.set(sid, Number.isFinite(updated) && Date.now() - updated <= HYGIENE_IDLE_MS ? "active" : "inactive");
    } catch (e: unknown) {
      const p = previewOf(e);
      if (/not.found/i.test(p) || /NotFound/i.test(p)) out.set(sid, "gone");
      else return null; // ONE unreadable sid fails the WHOLE lane closed
    }
  }
  return out;
}

// The DEAD verdict for ONE entry (shared by the listing and the clear lane):
// the caller's own entry is NEVER clearable; an unreadable `set_at`, an
// unreadable DB, a running step, an API-active session, or an UNMAPPED
// liveness all REFUSE fail-closed; a `gone` or `inactive` session is DEAD.
function entryVerdict(sid: string, entry: StoreEntry, callerID: string | null, newest: Map<string, HygieneRow> | null, live: HygieneLiveness): { dead: boolean; cause: string } {
  if (callerID != null && sid === callerID) return { dead: false, cause: "self" };
  const setMs = entry.setAt === "" ? NaN : Date.parse(entry.setAt);
  if (!Number.isFinite(setMs)) return { dead: false, cause: "set_at-unreadable" };
  if (newest == null) return { dead: false, cause: "store-db-unreadable" };
  const row = newest.get(sid);
  if (row != null && row.inflight) return { dead: false, cause: "live" };
  const lv = live?.get(sid);
  if (lv === "active") return { dead: false, cause: "live" };
  if (lv === "inactive") return { dead: true, cause: "" };
  if (lv === "gone") return { dead: true, cause: "" };
  if (live == null) {
    // (U30 FALLBACK) no API lane — the row-staleness rule decides, fail-closed
    if (row == null) return { dead: true, cause: "" };
    if (!Number.isFinite(row.tc)) return { dead: false, cause: "newest-row-time-unreadable" };
    if (row.tc > setMs) return { dead: false, cause: "live" };
    return { dead: true, cause: "" };
  }
  return { dead: false, cause: "liveness-unknown" };
}

async function storeListing(callerID: string | null): Promise<string> {
  const store = readStore();
  const sids = Object.keys(store.sessions).sort();
  const newest = sids.length > 0 ? await newestProviderRows(sids) : new Map<string, HygieneRow>();
  const live = sids.length > 0 ? await livenessOf(sids) : new Map<string, "active" | "inactive" | "gone">();
  const lines = [`trim-store: ${storeFile()} (${sids.length} entries)`];
  for (const sid of sids) {
    const e = store.sessions[sid];
    const row = newest?.get(sid);
    const v = entryVerdict(sid, e, callerID, newest, live);
    const liveTok = v.dead ? "no" : v.cause === "live" || v.cause === "self" ? "yes" : "?";
    lines.push(
      `entry: ${sid} set_at=${e.setAt !== "" ? e.setAt : "-"} auto=${e.auto.length} noticed=${e.noticed.length}` +
        ` newest=${newest == null ? "unavailable" : row != null && row.seq >= 0 ? row.seq : "none"} live=${liveTok} self=${callerID != null && sid === callerID ? "yes" : "no"}`,
    );
  }
  if (sids.length === 0) return `${lines[0]}\n(empty — no session holds a trim entry)`;
  lines.push("next: clear DEAD entries via mode:'tail' clear:true session:'all' ids:[\"<sid>\"] (live entries stay; never your own)");
  return lines.join("\n");
}

async function storeClear(callerID: string | null, ids: string[]): Promise<string> {
  const store = readStore();
  const named: string[] = [];
  for (const s of ids) if (!named.includes(s)) named.push(s);
  const present = named.filter((s) => store.sessions[s] != null);
  const newest = present.length > 0 ? await newestProviderRows(present) : new Map<string, HygieneRow>();
  const live = present.length > 0 ? await livenessOf(present) : new Map<string, "active" | "inactive" | "gone">();
  const cleared: string[] = [];
  const refused: string[] = [];
  for (const sid of named) {
    const entry = store.sessions[sid];
    if (entry == null) {
      refused.push(`${sid} not-in-store`);
      continue;
    }
    const v = entryVerdict(sid, entry, callerID, newest, live);
    if (!v.dead) {
      refused.push(`${sid} ${v.cause}`);
      continue;
    }
    if (!writeSessionEntry(sid, null)) {
      return `store-clear= error: store-write-failed on ${sid} (cleared ${cleared.length} before it)`;
    }
    cleared.push(sid);
    staleLogged.delete(sid);
    trimApplied.delete(sid); // (U28 F2) the entry is GONE — the trace signature resets
  }
  if (cleared.length > 0) appendLog(buildLine("store-clear", { session: callerID ?? "store", cleared: String(cleared.length), refused: String(refused.length) }, {}));
  if (cleared.length === 0) {
    const rem = refused.some((r) => r.includes("live") || r.includes("unreadable") || r.includes("unknown"))
      ? "an entry clears once its session is INACTIVE (session API: idle or gone, and no running step); the caller's own entry never clears"
      : "see the listing first (mode:'report' session:'all')";
    return `store-clear= rejected: nothing cleared (kept: ${cap(refused.join(", "), 160)}) — ${rem}`;
  }
  return `store-clear= cleared=${cleared.length} (${cap(cleared.join(","), 120)}) refused=${refused.length}${refused.length > 0 ? ` (kept: ${cap(refused.join(", "), 140)})` : ""}`;
}
// ------------------------------------------------------------------ the context draft hook

// U9 PROBE lane (#193, file-gated — DEFAULT OFF): when `.opencode/temp/u9_probe.on`
// EXISTS, the FIRST draft per session writes the REAL projected-entry shape (entry
// keys/role/id, part types + id-bearing part keys, byte sizes — never text bodies)
// to `.opencode/temp/u9_probe.log`, once per session per plugin load. The gate
// file is deleted once the evidence is collected (2026-10-28). Read-only: never
// mutates the draft, never throws.
const probeLogged = new Set<string>();
function probeShape(sid: string, messages: unknown[]): void {
  if (probeLogged.has(sid)) return;
  try {
    const dir = dirname(logPath());
    if (!existsSync(join(dir, "u9_probe.on"))) return;
    probeLogged.add(sid);
    const snap = messages.slice(0, 30).map((m) => {
      const e = asRecord(m) ?? {};
      const parts = asArray(e["content"]).slice(0, 8).map((c) => {
        const p = asRecord(c) ?? {};
        const idish: Record<string, string> = {};
        for (const k of Object.keys(p)) {
          if (/id|call/i.test(k) && typeof p[k] !== "object") idish[k] = String(p[k]).slice(0, 24);
        }
        return { type: String(p["type"] ?? "?"), keys: Object.keys(p).slice(0, 8), idish, bytes: JSON.stringify(p).length };
      });
      return { role: String(e["role"] ?? "?"), keys: Object.keys(e).slice(0, 8), id: typeof e["id"] === "string" ? e["id"].slice(0, 24) : undefined, parts };
    });
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, "u9_probe.log"), JSON.stringify({ ts: new Date().toISOString(), kind: "u9-probe", session: sid, count: messages.length, entries: snap }) + "\n", "utf8");
  } catch {
    // the probe lane never breaks the draft path
  }
}

// The per-PRIMARY-request filter (NEVER throws). Wire-defensive throughout:
// the handler binds the real `SessionContext` shapes but reads everything
// through `unknown` guards.
async function onContext(event: { sessionID?: unknown; messages?: unknown }): Promise<void> {
  try {
    const sid = str(event.sessionID);
    if (sid == null) return; // session gating: no request id -> silent skip
    // U9 PROBE: shape evidence BEFORE any store gating (fires even with no entry).
    if (Array.isArray(event.messages)) probeShape(sid, event.messages as unknown[]);
    const entry = readStore().sessions[sid];
    if (entry == null) return; // no boundary and no marks -> SILENT, no service call
    // (9) the hook drops ONLY `active` ids — a staged-only entry (no boundary,
    // no active) is fully SILENT (no service call, no line): marking is cheap
    // and continuous; one `apply` makes it effective.
    if (entry.boundary === "" && entry.active.length === 0 && entry.guard !== true && entry.auto.length === 0) return;
    if (!Array.isArray(event.messages)) {
      appendLog(buildLine("gauge", { session: sid, reason: "messages-not-array" }, {}));
      return;
    }
    const messages = event.messages as Array<Record<string, unknown>>;
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
        // Drop the draft entries carrying a pre-boundary row id — and, per the
        // U9 pair rule below, their tool-output projections too. Everything at/
        // after the boundary stays IN ORDER — in-place, NO append (the
        // composition pin).
        // (U22 F3, #218) WHY a boundary drop can leave the provider prompt nearly
        // unchanged while an `auto`-set drop shrinks it — read-only fork finding
        // (home/Repos/opencode, 2026-10-29), two mechanisms:
        // (1) the plugin's WINDOW and the request's REPLAY are different row sets.
        //     `SessionStore.context` reads `SessionHistory.load(db, id, "latest")`
        //     (`packages/core/src/session/store.ts:179`); the request draft comes from
        //     `SessionHistory.entriesForRunner(..., provenance(model) ?? "local")`
        //     (`packages/core/src/session/context.ts:165-170`). Under `"local"` a
        //     completed compaction carrying a providerContext is NOT a replay boundary
        //     (`latestCompaction`, `packages/core/src/session/history.ts:41-53`) and its
        //     checkpoint row is filtered out (`replayable`, `history.ts:23-26`) — the
        //     request replays rows the plugin's window never sees, and a boundary drop
        //     can only reach rows INSIDE the window.
        // (2) the row -> draft mapping is NOT 1:1. `toLLMMessage`
        //     (`packages/core/src/session/runner/to-llm-message.ts:253-327`) emits
        //     NOTHING for `idle`/`agent-switched` rows, an id-LESS entry for `system`
        //     rows (`:291`), and id-less `Message.tool` entries for assistant tool
        //     OUTPUTS (`:216-232`) — a matched store row can contribute no id-carrying
        //     draft entry at all, so `droppedRows=` (= `drop.size`, STORE rows matched)
        //     overstates the request shrink. Plugin-side enforcement: the byte
        //     measurement below (`droppedBytes=` = bytes/4 actually spliced out of the
        //     draft array); the row-set mismatch is fork-side and a plugin must not
        //     drop rows it cannot see or weigh — recorded here and in the #218 entry.
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
    // (12) U14 (#205) STICKY GUARD DROPS — ids the guard auto-selected earlier
    // live in the entry's `auto` set, the guard's OWN set, SEPARATE from the
    // agent's `active` set; they keep leaving the draft even after the flag
    // goes OFF, until `mark clear` empties the set (the head row is never in
    // it — the guard only ever picks index >= 1). An auto id outside the
    // current window is silently IGNORED (stale rows leave no draft entry).
    let autoInWindow = 0;
    for (const m of entry.auto) {
      const idx = rows.findIndex((r) => idOf(r) === m);
      if (idx >= 1) {
        drop.add(m);
        autoInWindow++;
      }
    }
    // One ordinals read per assembly, shared by the guard, the notice, and the
    // seq forensics lane (the DB read is the expensive leg; three reads per
    // request would be waste).
    let ordLoaded: Ordinals | undefined;
    const ordOf = async (): Promise<Ordinals> => {
      if (ordLoaded == null) ordLoaded = await readOrdinals(sid);
      return ordLoaded;
    };
    // (13) U14 (#205) PREVENTIVE WALL GUARD — per-session opt-in (`guard`,
    // DEFAULT OFF). v2 has NO wall handling: an oversized request dies, so the
    // wall is PREVENTED here, at assembly. EVERYTHING computes BEFORE any
    // mutation and the whole lane rides its own try/catch (fail-safe): a throw
    // logs ONE kind:guard event:fail line per session and the request
    // continues WITHOUT guard picks — byte-identical to the guard-off path.
    // (U29 G1(a), #225) TRIGGER AUTHORITY = the PROVIDER-measured request figure:
    // gauge CTX − output of the last FINISHED step (the report's `request-est`).
    // The U21 assembly estimate did NOT track the request: scaled by
    // `renderRatio` (floor 2.0) it projected 991,452 against a gauge CTX of
    // 107,042, the fire landed at `after=942,283 > bound=241,172`, and the guard
    // RE-FIRED EVERY STEP — the #225 cache churn. `assemblyEstimate` and the
    // ratio ride as FORENSICS ONLY (`live=` / `r=` fields). Missing figure ->
    // skip (never fire blind); UNDER the trigger -> SILENT. Trigger/bound math
    // UNCHANGED: 0.92 trigger, drain to the 0.8 fit bound.
    // Selection: the SHARED `dropCandidates` rule (U21 F3 —
    // head/user/compaction/newest-assistant never; a tool-output-dominant floor
    // row CAN leave). Drain target (U21 F2): the picks run until the projection
    // sits UNDER the apply-side fit bound (BOUND_FRAC = 0.8 of the window); the
    // U20 fire stopped ONE pick below the trigger (log 22:17:27Z projected=244,787
    // bound=241,172) and the next step died at 284,070 — the 80% fit bound leaves
    // the headroom the next step grows into. Picks join the drop set BEFORE the
    // pair-rule block (they ride the #193 atomic call+output drop; the splice
    // mutates the array the host builds THIS request from, so the drop reduces the
    // request the fire fires ON), persist to `auto`, and log ONE kind:guard
    // event:auto line with ranks + mass + the projection figures + `auth` (U29 G3).
    let guardPicked = 0;
    const guardPickIds: string[] = []; // kept OUTSIDE the try: the fail-safe must be able to UNDO the picks
    if (entry.guard === true) {
      try {
        const g = await gauge.readGauge(undefined, sid);
        const gr = g as { ctx?: unknown; output?: unknown; window?: unknown };
        const gCtx = typeof gr.ctx === "number" && Number.isFinite(gr.ctx) ? gr.ctx : undefined;
        const gOut = typeof gr.output === "number" && Number.isFinite(gr.output) ? gr.output : undefined;
        const gWin = typeof gr.window === "number" && Number.isFinite(gr.window) ? gr.window : undefined;
        if (gWin != null) {
          // An unknown OUTPUT prints CTX itself (the apply lane's own rule).
          const lastReq = gCtx != null ? (gOut != null ? gCtx - gOut : gCtx) : undefined;
          const live = assemblyEstimate(messages); // (U29) FORENSICS ONLY — decides nothing
          // (U29 G1(a), #225) THE AUTHORITY = the PROVIDER-measured request figure:
          // gauge CTX − output of the last FINISHED step (the report's
          // `request-est`). It tracks the REAL request; the U21 assembly estimate
          // did NOT (live=495726 projected=991452 vs gauge CTX=107042 — ~4.6x
          // over-count, `after=942283 > bound=241172`: the guard re-fired every
          // step and busted the cache once per step). Missing authority -> SKIP
          // (never fire blind); authority UNDER the trigger -> SILENT (steady
          // state, no line — the log stays the audit trail of fires + real
          // skips). Convergence: after a fire the provider figure reflects the
          // spliced request, so the next assembly sits under the trigger -> no
          // re-fire; while the drop set is unchanged nothing is picked again.
          const ratio = renderRatio(rows, lastReq); // forensics only (U29)
          const projection = lastReq; // THE provider-figure authority (U29, shape (a)) — UNCHANGED
          const src = "last-req"; // (U29) the provider leg's name; the hard leg names itself via `auth` (U31 H4)
          const gBound = Math.floor(gWin * GUARD_FRAC);
          const gFit = Math.floor(gWin * BOUND_FRAC);
          // (U31 H1/H2, #227) THE HARD SAFETY LEG — an ADDITIONAL trigger that
          // covers the class the provider figure CANNOT see: growth INSIDE the
          // step (U20 died at request 284,070 while last-req sat ~185k). Fire
          // when the CORRECTED live estimate (assemblyEstimate − droppedOwnMass)
          // reaches window − OUTPUT_RESERVE. The correction keeps the #225
          // fixture GREEN: the planner session (own sum 298,167, 530 sticky drops
          // / mass 281,825, provider ~120,647) corrects to ~16k — far UNDER the
          // hard threshold — so the over-count that caused the churn can NEVER
          // fire this leg, and the provider leg keeps the trigger.
          const floorKeep = Math.max(FLOOR, entry.keep);
          const dropIdx = new Set<number>();
          if (bIdx >= 1) for (let k = 0; k < bIdx; k++) dropIdx.add(k); // the boundary drop region
          for (const m of [...entry.active, ...entry.auto]) {
            const i = rows.findIndex((r) => idOf(r) === m);
            if (i >= 1) dropIdx.add(i);
          }
          const corrected = correctedEstimate(messages, rows, dropIdx); // (U31 H1) >= 0
          const hardAt = gWin - OUTPUT_RESERVE;
          const providerLeg = projection != null && projection >= gBound;
          const hardLeg = corrected != null && corrected >= hardAt;
          let auth = "last-req";
          if (hardLeg) auth = providerLeg ? "both" : "assembly-hardleg"; // (U31 H4) which authority decided
          let skipReason: string | undefined;
          if (projection == null && !hardLeg) skipReason = "no-request-fig"; // no provider figure AND no visible in-flight mass -> never fire blind
          else if (!providerLeg && !hardLeg) skipReason = "under-trigger"; // the REAL request is under the trigger — SILENT, never logged
          if (providerLeg || hardLeg) {
            // Drain base: the provider leg drains the PROVIDER figure (U29 math
            // UNCHANGED); a hard-leg-only fire drains the CORRECTED estimate
            // toward the same fit bound; `both` drains from the provider figure
            // (the authority keeps precedence) under the hard cap.
            let base = providerLeg ? projection : (corrected ?? 0);
            if (hardLeg && !providerLeg && base > (corrected ?? base)) base = corrected ?? base;
            const capTok = hardLeg ? Math.floor(gWin * HARD_CAP_FRAC) : undefined; // (U31 H3) <= 25% of the window per fire
            const cand = dropCandidates(rows, floorKeep, bIdx, dropIdx);
            const pickedIds: string[] = guardPickIds;
            let pickedMass = 0;
            let projected = base;
            const prevAfter = guardAfter.get(sid);
            // (U22 F1, #218; U29) the drain arithmetic is UNCHANGED: `c.mass` is a
            // bytes/4 own-mass subtracted from the PROVIDER figure, so the picks drain
            // CONSERVATIVELY — bytes/4 understates the provider render, they stop LATER
            // than a unit-matched drain would, and the real request lands BELOW the fit
            // bound, never above it (the #214 survival property).
            for (const c of cand) {
              if (projected < gFit) break; // the projection sits UNDER the fit bound — stop
              // (U31 H3) the hard leg's 25%-per-fire cap: stop BEFORE a pick that
              // would CROSS it — at most one fire drains a quarter of the window.
              // The FIRST pick may cross (a single over-cap heavy row must still
              // leave, or the wall stays unprotected); picks are never split.
              if (capTok != null && pickedIds.length > 0 && pickedMass + c.mass > capTok) break;
              pickedIds.push(c.id);
              pickedMass += c.mass;
              projected -= c.mass;
              drop.add(c.id);
            }
            guardPicked = pickedIds.length;
            if (pickedIds.length > 0) {
              guardAfter.set(sid, projected);
              const ord = await ordOf();
              const rankNums = pickedIds
                .map((id) => (ord.ok === true ? ord.byId.get(id) : undefined))
                .filter((x): x is number => typeof x === "number")
                .sort((a, b) => a - b);
              const rankText = rankNums.length > 0 ? rankNums.slice(0, 12).map((n) => `#${n}`).join(",") + (rankNums.length > 12 ? ` +${rankNums.length - 12} more` : "") : "unavailable";
              const wrote = writeSessionEntry(sid, { boundary: entry.boundary, keep: entry.keep, setAt: entry.setAt, staged: entry.staged, active: entry.active, guard: true, auto: [...entry.auto, ...pickedIds], noticed: entry.noticed });
              appendLog(buildLine("guard", { session: sid, event: "auto", auth, n: String(pickedIds.length), mass: String(pickedMass), ranks: rankText, projected: String(base), src, r: ratio.toFixed(2), live: live != null ? String(live) : undefined, fit: String(gFit), after: String(projected), prev: prevAfter != null ? String(prevAfter) : undefined, bound: String(gBound), marks: String(entry.active.length), store: wrote ? undefined : "write-failed" }, {}));
            } else skipReason = "pool-exhausted"; // a leg AT its threshold, NO candidate left — the audit trail (the wall is imminent and nothing is droppable)
          }
          // (U29 G3) ONE deduped `event:skip` line per (session, reason) — the two
          // REAL skips only; `under-trigger` is the steady state and stays SILENT.
          if (skipReason != null && skipReason !== "under-trigger" && guardSkipLogged.get(sid) !== skipReason) {
            guardSkipLogged.set(sid, skipReason);
            appendLog(buildLine("guard", { session: sid, event: "skip", auth: skipReason, projected: projection != null ? String(projection) : "unavailable", src: "last-req", r: ratio.toFixed(2), live: live != null ? String(live) : undefined, fit: String(gFit), bound: String(gBound) }, {}));
          }
        }
      } catch (e) {
        // fail-safe: the guard lane threw -> UNDO any partial picks (the
        // request goes out WITHOUT a guard pick, byte-identical to the
        // guard-off path), ONE line per session. The outer hook's own catch
        // stays the last resort.
        if (guardPicked > 0) {
          for (const id of guardPickIds) drop.delete(id);
          guardPicked = 0;
        }
        if (guardFailLogged.get(sid) !== "fail") {
          guardFailLogged.set(sid, "fail");
          appendLog(buildLine("guard", { session: sid, event: "fail", cause: cap(previewOf(e), 120) }, {}));
        }
      }
    }
    // (10) U9 (#193) ATOMIC PAIR DROP — a marked message removes EVERYTHING it
    // contributed, its tool OUTPUT included. Identification rule, stated in
    // code: (a) PREFERRED the call-id link — a `tool-result` part carries the
    // call id (`id`; fork proof `to-llm-message.ts` ToolResultPart/ToolCallPart,
    // runtime probe 2026-10-28: entry keys `id,role,content,metadata`, call part
    // id `call_…`, result entries are separate `role:"tool"` entries built by
    // `Message.tool` WITHOUT an entry-level id); every `tool-call` part maps
    // that id to its owning message entry. (b) ADJACENCY fallback — an id-less
    // projection with no owned call belongs to the nearest preceding
    // id-carrying entry (dropped iff that entry is). (c) a projection matched by
    // NEITHER stays and counts `orphan=`. The call part lives INSIDE the owning
    // entry, so a call never leaves without its outputs and a result never
    // leaves while its call stays. U17 (#203): the flags do NOT need to
    // compute on an EMPTY drop set (the deleted tag lane once forced that) —
    // the rule body runs only with something to drop, so `orphan=` semantics
    // are UNCHANGED.
    const hadDrop = drop.size > 0;
    const dropFlags = new Array<boolean>(messages.length).fill(false);
    let orphan = 0;
    if (hadDrop) {
      const ownerOf = new Map<string, string>(); // call id -> owning message entry id
      for (const m of messages) {
        const id = typeof m["id"] === "string" ? m["id"] : "";
        if (id === "") continue;
        for (const c of asArray(m["content"])) {
          const p = asRecord(c);
          if (p?.["type"] === "tool-call" && typeof p["id"] === "string") ownerOf.set(p["id"], id);
        }
      }
      const isProjection = (m: Record<string, unknown>): boolean =>
        m["role"] === "tool" || asArray(m["content"]).some((c) => asRecord(c)?.["type"] === "tool-result");
      let prevDropped = false; // adjacency anchor: nearest preceding id-carrying entry dropped?
      messages.forEach((m, k) => {
        const id = typeof m["id"] === "string" ? m["id"] : undefined;
        if (id !== undefined) {
          dropFlags[k] = drop.has(id);
          prevDropped = dropFlags[k];
          return;
        }
        if (!isProjection(m)) return; // system/effort/other id-less entries: untouched, never orphans
        let ownerDropped = false;
        let hasLink = false;
        for (const c of asArray(m["content"])) {
          const p = asRecord(c);
          if (p?.["type"] === "tool-result" && typeof p["id"] === "string") {
            hasLink = true;
            const owner = ownerOf.get(p["id"]);
            if (owner !== undefined && drop.has(owner)) {
              ownerDropped = true;
              break;
            }
          }
        }
        if (ownerDropped) dropFlags[k] = true;
        else if (hasLink) return; // a linked result of a KEPT entry stays (never orphaned)
        else if (prevDropped) dropFlags[k] = true; // adjacency fallback
        else orphan++;
      });
    }
    // (11) U17 (#203) SEQ-SPAN FORENSICS — the ABSOLUTE store seq span of the
    // surviving id-carrying entries (rank -> DB row forensics on the `trim`
    // line; the ordinals read is shared with the guard and notice legs). The
    // U10 tag lane that owned this leg is DELETED: the host re-persists live
    // rows' `data` on its own UPDATE (finalize + later updates), so ANY hook
    // write into existing part bytes lands in the store and COMPOUNDS every
    // turn (TODO mechanism). Doctrine: the hook only ever REMOVES
    // (splices) — surviving entries are BYTE-IDENTICAL, no part text changes
    // ever. COMPUTED BEFORE THE SPLICE: dropFlags are indexed against the
    // PRE-splice array (the U10 unit found the shifted-index trap live).
    let seqSpan = "none";
    if (hadDrop) {
      const ord = await ordOf();
      let seqMin = Number.POSITIVE_INFINITY;
      let seqMax = Number.NEGATIVE_INFINITY;
      messages.forEach((m, k) => {
        if (dropFlags[k]) return; // a dropped entry never counts into the span
        const id = typeof m["id"] === "string" ? m["id"] : "";
        if (id === "") return; // id-less projections never count
        if (ord.ok === true) {
          const sq = ord.seqById.get(id);
          if (sq != null) {
            if (sq < seqMin) seqMin = sq;
            if (sq > seqMax) seqMax = sq;
          }
        }
      });
      if (seqMax >= seqMin) seqSpan = `${seqMin}-${seqMax}`;
    }
    let dropped = 0;
    let droppedProjections = 0;
    // (U22 F3, #218) the REQUEST-SHRINK measurement: bytes/4 of the draft entries
    // ACTUALLY spliced out. `droppedRows=` counts STORE rows matched — a matched row
    // with no draft entry frees nothing — so effectiveness is measured here, not
    // inferred from the row count.
    let droppedBytes = 0;
    for (let k = messages.length - 1; k >= 0; k--) {
      if (!dropFlags[k]) continue;
      try {
        droppedBytes += Math.floor(JSON.stringify(messages[k]).length / 4);
      } catch {
        // an unserializable entry counts 0 — the measurement never breaks the drop
      }
      const id = messages[k]?.["id"];
      if (typeof id === "string" && drop.has(id)) dropped++;
      else droppedProjections++;
      messages.splice(k, 1);
    }
    // (14) U14 (#205) NOTICE — the ADD lane (U5 `add-feasible`, live-proven):
    // ONE FRESH entry the plugin BUILT, pushed at the END after the splice:
    // never counted, never a mutation of history (the plugin owns this object,
    // no shared draft part is touched; the tag lane it once rode behind is
    // deleted). Draft-only: never persisted. Names the dropped RANKS + the mass
    // of THIS notice + whether the session's marks set was empty.
    // (U21 F4, #214 D4) NOTICE ONCE PER CHANGED DROP SET rode an in-process
    // signature built from the ids FOUND IN THIS ASSEMBLY'S WINDOW. (U25 #219)
    // That churned: the same stored auto set re-noticed every time the window
    // head moved its membership (measured 2026-10-29: three identical notices in
    // 20 s at droppedRows=50), and the mass figure named neither this fire's
    // rows nor a stable sum. The rule is now DELTA: the notice covers only rows
    // the STORE `auto` set gained SINCE THE LAST NOTICE — the per-session
    // `noticed` id list rides the store entry, so the state survives a restart
    // and a static drop set never re-notices whatever the window does. A legacy
    // entry without the key = nothing noticed (the set notices ONCE). N3
    // ruling: the notice keeps firing for `free`-created auto sets even while
    // the guard flag is OFF — the agent must know content vanished — but ONCE
    // per delta, never per assembly. The drops themselves stay
    // sticky-and-applied (the splice lane above is untouched).
    let noticeMass = 0; // (U25) the DELTA mass — the notice figure names THIS notice's rows
    let setMass = 0; // the FULL in-window drop-set mass — `autoMass=` keeps its meaning
    let newRows = 0; // (U25 F5) the delta count — the `kind:"trim"` line's `newRows=` field
    const autoTotal = autoInWindow + guardPicked;
    if (autoTotal > 0) {
      const noticeIds = new Set<string>(entry.auto);
      for (const id of guardPickIds) noticeIds.add(id);
      const noticed = new Set<string>(entry.noticed);
      const ord = await ordOf();
      const ranks: number[] = [];
      const deltaIds: string[] = [];
      let unnamed = 0;
      rows.forEach((r, i) => {
        if (i === 0) return; // the head is NEVER a guard row
        const id = idOf(r);
        if (id === "" || !noticeIds.has(id)) return; // stale ids outside the window are absent here
        setMass += ownMassOf(r);
        if (noticed.has(id)) return; // (U25) already announced — never re-notice
        deltaIds.push(id);
        noticeMass += ownMassOf(r);
        const rk = ord.ok === true ? ord.byId.get(id) : undefined;
        if (typeof rk === "number") ranks.push(rk);
        else unnamed++;
      });
      if (deltaIds.length > 0) {
        ranks.sort((a, b) => a - b);
        const shown = ranks.slice(0, 12); // (U21) the 12 shown-rank cap stays
        const more = ranks.length - shown.length + unnamed;
        const rankText = ranks.length > 0 ? shown.map((n) => `#${n}`).join(",") + (more > 0 ? ` +${more} rows` : "") : `${deltaIds.length} rows`;
        const activeText = entry.active.length === 0 ? "empty" : `non-empty (${entry.active.length})`;
        // (U33 #222 notice attribution, #223 vocabulary) THE SOURCE LANE — this
        // notice fires for ANY drop that lands at assembly, so it names who
        // dropped the rows: ids the guard picked IN THIS assembly read `guard`;
        // ids already in the store `auto` set read `free` (a guard pick is
        // noticed by the very notice that records it, so an un-noticed `auto`
        // id can only come from a manual `free`). The trim log's `kind:` field
        // stays the forensic source (KP-47). The old word `marks` is GONE —
        // the ACTIVE set is the same entity the report flags ` x`.
        const guardPickSet = new Set(guardPickIds);
        const autoIdSet = new Set(entry.auto);
        const fromGuard = deltaIds.some((id) => guardPickSet.has(id));
        const fromFree = deltaIds.some((id) => autoIdSet.has(id));
        const src = fromGuard && fromFree ? "guard+free" : fromGuard ? "guard" : "free";
        messages.push({ role: "user", content: [{ type: "text", text: `trim: dropped ${rankText} = ${noticeMass} tokens (source: ${src}); active set ${activeText}` }], id: "msg_ctx_guard_notice" });
        newRows = deltaIds.length;
        // (U25 F1) the marker persists in the store entry so the delta survives a
        // process restart; a failed write degrades to one repeat notice at worst.
        writeSessionEntry(sid, { boundary: entry.boundary, keep: entry.keep, setAt: entry.setAt, staged: entry.staged, active: entry.active, guard: entry.guard, auto: [...entry.auto, ...guardPickIds], noticed: [...entry.noticed, ...deltaIds] });
      }
    }
    // (U28 F2) THE TRACE GATE — the invariant the planner judges from: the
    // `kind:"trim"` line is CHANGE evidence, not a per-pass heartbeat.
    // Signature = the applied drop set (the matched store ids, sorted) + the
    // spliced `droppedBytes`. Unchanged signature = NO line; a changed drop set
    // OR changed `droppedBytes` = exactly ONE line (`newRows=` semantics
    // UNCHANGED — a changed set still prints it whenever the notice delta
    // fired). A no-drop pass empties the signature, so a drop that lands again
    // after a silent pass is a change and logs.
    const sig = [...drop].sort().join(",") + ":" + droppedBytes;
    if (dropped + droppedProjections === 0) {
      trimApplied.set(sid, ""); // stale boundary + all marks stale + nothing dropped -> nothing happened, no trim line; the EMPTY signature makes the next drop a change
      return;
    }
    if (trimApplied.get(sid) !== sig) { // the SAME drop set spliced the SAME bytes — the static-set repeat stays silent (the 643-line flood)
      trimApplied.set(sid, sig);
      appendLog(
      buildLine(
        "trim",
        { session: sid, boundary: entry.boundary !== "" ? entry.boundary : "none", boundaryIndex: bIdx >= 1 ? String(bIdx) : "none", marks: String(entry.active.length), droppedRows: String(drop.size), droppedEntries: String(dropped + droppedProjections), droppedBytes: String(droppedBytes), droppedProjections: String(droppedProjections), orphan: String(orphan), autoRows: autoTotal > 0 ? String(autoTotal) : undefined, autoMass: setMass > 0 ? String(setMass) : undefined, newRows: newRows > 0 ? String(newRows) : undefined, ordinal: seqSpan !== "none" ? "session-rank" : undefined, seq: seqSpan !== "none" ? seqSpan : undefined, keptEntries: String(messages.length) },
        {},
      ),
    );
    }
  } catch {
    // the v1 house rule: never throw out of a hook — a defensive failure keeps
    // the whole window (fail-open).
  }
}

// ------------------------------------------------------------------ the tool surface

const TOOL_DESCRIPTION =
  "Reports and trims a session's model context on the v2 session store (NO DB write). Rows carry `#N` = PER-SESSION RANK (1..N by append order, stable; refs take a rank, `A-B`, or an id). `mode:'report'` — READ-ONLY window map: header = head, count, BOUNDARY state, retained, STAGED/ACTIVE (active-est=own sum); rows flag s/x/g, header in-window counts; `window_rows != request` (request-est=CTX, window-est=own sum); `projection:` (last-req, staged-est, projected, bound, ok|over); rows: position + `#N`, `own=` own weight (bytes/4), `req-at=` = request size at that step (not mass); tool targets; `last: N`; low/med/high trim options (rank, keep, retained/dropped, hint ≤ 80); `biggest:` top-5 turns by OWN weight; `target` = dry-run; `gauge:` = shared core. `mode:'tail'` — WRITE the trim store boundary (first KEPT) via `target` or `keepMessages` (count; exclusive), REMOVE via `clear`. The boundary shapes the REPORT WINDOW only — it does NOT shrink the request (only applied drops do). `mode:'mark'` — WRITE the STAGED drop list: `ids` add rows (ids/ranks/ranges `A-B`), `self:true` stages the session's own completed `context_trim` rows, `unmark` remove PRE-APPLY ONLY (an `active`/`auto` drop stays until `mark clear`), `clear` empties all drop sets (boundary stays), `guard` on/off wall guard (at 92% drops heaviest rows); nothing drops until `apply`. `mode:'apply'` — union staged into ACTIVE behind an 80%-of-window projection (last-req − drop_est; refuses `nothing-staged`/`over-bound` unless `force:true`; same-step mark+apply re-reads). `mode:'free'` — free_space: drops heaviest+oldest rows into `auto` until `target`% of the window frees. `session:'all'` = the store-hygiene sentinel: `report` lists trim-store entries read-only; `tail` + `clear:true` + `ids` clears named DEAD sessions (never your own). The `session.context` hook drops pre-boundary AND active entries ATOMICALLY with their tool outputs (`orphan=` on a lost pair); history untouched; stale refs log ONE line each. Fail-closed (rejections write NOTHING): `report=`/`tail-set=`/`mark-set=`/`apply=` echoes or `error: <usage>`; guards reject outside-window (`*-not-found`), head, keep floor < 6, bad ranges (`mark-*`); read failures print `context-read-failed`; unreadable ordinals print `#?`. Success lines: `tail-set= <old> -> <new> keep=<n>`, `mark-set= +<n> -<m> total=<size> rows_dropped_est=<own>` (ranges add `resolved=`), `apply= staged->active ... ok mixed=<c>`. `session` may be omitted.";

const TOOL_INPUT = {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "mode": {
      "type": "string",
      "enum": [
        "report",
        "tail",
        "mark",
        "apply",
        "free"
      ],
      "description": "One of: 'report' (read-only window map), 'tail' (boundary write — target, keepMessages, or clear), 'mark' (STAGED drop-list write — ids/ranges/self, unmark, or clear), 'apply' (union staged into ACTIVE behind the 80% projection bound), 'free' (free_space — auto-drops the heaviest+oldest droppable rows into the sticky `auto` set until `target`% of the gauge window is freed; shortfall echoes `short=yes` and stops)."
    },
    "session": {
      "type": "string",
      "description": "The session id (e.g. ses_…). Omit = the CALLING session (resolved from the tool context)."
    },
    "target": {
      "type": ["string", "number"],
      "description": "report: the message id a boundary write would point at (dry-run, no write). tail: the new BOUNDARY id — the first KEPT message, strictly after the window head, retaining >= 6 rows. Omit with keepMessages or clear. free: the PERCENT of the gauge window to free — an INTEGER 5..60 (default 20 when omitted); anything else is refused `target-invalid`."
    },
    "keepMessages": {
      "type": "number",
      "description": "tail: N = the retained-tail MESSAGE COUNT (exactly N rows kept; a count, not a token budget). Mutually exclusive with target. Rejected: keep-invalid, keep-exceeds-history, retained-tail-below-floor (floor 6), keep-at-window-head."
    },
    "ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "mark: ids ADD to the STAGED drop list — ids, bare ranks, or ranges `A-B` (inclusive; a rejected range names its offending rows). Rejected: mark-not-found, mark-at-window-head, mark-range-unresolved, mark-floor."
    },
    "unmark": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "mark: staged ids or ranges `A-B` to REMOVE (stale stored ids un-mark too)."
    },
    "clear": {
      "type": "boolean",
      "description": "tail: remove the stored boundary (stored staged/active sets stay). mark: empty BOTH staged and active (a stored boundary stays). Mutually exclusive with the mode's other args."
    },
    "force": {
      "type": "boolean",
      "description": "apply (mode 'apply' only): accept a projection over the 80% bound deliberately; without it an over-bound apply is refused."
    },
    "guard": {
      "type": "boolean",
      "description": "mark: ON/OFF the per-session wall guard (default OFF; toggle-only). Assembly estimate >= 92% of the window auto-drops heaviest droppable rows (head/user/newest never, heavy floor rows may leave, outputs leave with calls); ONE notice per changed drop set; auto drops persist until clear."
    },
    "showIds": {
      "type": "boolean",
      "description": "report: print `id=` on rows (default OFF — `#<seq>` names the row)."
    },
    "self": {
      "type": "boolean",
      "description": "mark: ALSO stage the session's own completed `context_trim` call rows (the self-trim lane); rides the same head/floor guards; rejected with clear."
    }
  }
};

// The dispatch core. (U30 #222 R2) every mode REFUSES args it does not consume:
// the echo names the offending arg AND the lane that DOES take it. (U30 #226 R5)
// `session:"all"` is the store-hygiene sentinel — `mode:"report"` prints the
// READ-ONLY trim-store listing, `mode:"tail"` with `clear:true` runs the DEAD-sid
// hygiene clear (live entries and the caller's own entry are refused, fail-closed).
// A real session id always starts with `ses_`, so the sentinel can never collide.
// The (U28 F1) `execute` wrapper below adds only the reject-evidence logging.
// (U30 #222 R7) the description literal + input schema stay byte-identical —
// the sentinel rides the existing `session` arg; documenting it is the planner's
// cold-pass decision (U32), NOT a live edit here.
const ARG_LANES: Record<string, string> = {
  target: "report dry-run, tail boundary or free percent",
  keepMessages: "tail",
  clear: "tail (boundary) or mark (drop sets)",
  ids: "mark",
  unmark: "mark",
  guard: "mark",
  self: "mark",
  force: "apply",
  showIds: "report",
};
const MODE_ARGS: Record<string, string[]> = {
  report: ["target", "showIds"],
  tail: ["target", "keepMessages", "clear"],
  mark: ["ids", "unmark", "clear", "guard", "self"],
  apply: ["force"],
  free: ["target"],
};
function foreignEcho(label: string, keys: string[]): string {
  return cap(`error: ${label} does not take ${keys.map((k) => (ARG_LANES[k] != null ? `'${k}' (only on ${ARG_LANES[k]})` : `'${k}' (unknown arg — no lane takes it)`)).join(", ")}`, 200);
}
async function dispatch(args: unknown, toolContext: { sessionID?: unknown }): Promise<{ output: string }> {
  const a: Record<string, unknown> = args != null && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
  const explicitSession = typeof a.session === "string" && a.session.trim() !== "" ? String(a.session).trim() : null;
  const callerID = typeof toolContext?.sessionID === "string" && toolContext.sessionID !== "" ? toolContext.sessionID : null;
  const sid = explicitSession ?? callerID;
  if (sid == null) return { output: "error: missing session (pass `session` or call from a session context)" };
  const mode = a.mode;
  // (U30 #226 R5) THE STORE-HYGIENE SENTINEL — the listing is READ-ONLY (no log
  // line, no store write); the clear touches ONLY DEAD entries, NEVER the
  // caller's own session. The extra-arg gate reuses the R2 echo shape.
  if (explicitSession === "all") {
    const extra = Object.keys(a).filter((k) => k !== "mode" && k !== "session" && !(mode === "tail" && a.clear === true && (k === "clear" || k === "ids")));
    if (extra.length > 0) return { output: foreignEcho("the store-hygiene lanes (session='all')", extra) };
    if (mode === "report") return { output: await storeListing(callerID) };
    if (mode === "tail" && a.clear === true) {
      const named = Array.isArray(a.ids) && a.ids.length > 0 && a.ids.every((x) => typeof x === "string" && (x as string).trim() !== "")
        ? (a.ids as string[]).map((x) => x.trim())
        : null;
      if (named == null) return { output: "error: the store-hygiene clear needs ids — the list of sids to clear, exactly as the listing names them" };
      return { output: await storeClear(callerID, named) };
    }
    return { output: "error: session='all' supports mode 'report' (read-only store listing) or mode 'tail' with clear:true + ids (named DEAD sids to clear)" };
  }
  const target = a.target != null && String(a.target).trim() !== "" ? String(a.target).trim() : undefined;
  const keep = a.keepMessages != null ? a.keepMessages : undefined;
  const guardArg = a.guard === true || a.guard === false ? (a.guard as boolean) : undefined; // (U14) the opt-in wall-guard toggle
  // (U30 #222 R2) the mode-foreign arg gate — every known arg belongs to exactly
  // one lane set; an arg the mode never consumes rejects, naming its lane.
  const allowed = MODE_ARGS[String(mode)];
  if (allowed != null) {
    const bad = Object.keys(a).filter((k) => k !== "mode" && k !== "session" && !allowed.includes(k));
    if (bad.length > 0) return { output: foreignEcho(`'${mode}' mode`, bad) };
  }
  if (mode === "report") return { output: await reportWindow(sid, target, a.showIds === true) }; // (U11 #200) `showIds:true` restores id= on rows
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
    // (U30 #222 R2) `clear` with ANY other mark arg refuses — the guard toggle
    // rides its own call (before it was silently ignored by the clear write).
    // (U36 #231) `self` joins the exclusivity set — a clear call carries no adds.
    if (isClear && (a.ids != null || a.unmark != null || guardArg != null || a.self != null)) {
      return { output: "error: mark mode: clear is mutually exclusive with ids/unmark/guard/self (send the guard toggle in its own call)" };
    }
    if (!isClear && ids == null && unmark == null && guardArg == null && a.self !== true) {
      return { output: "error: mark mode requires ids (window rows to stage — ids or bare ordinals), unmark (refs to restore), clear (empty ALL drop sets — staged, active, guard auto — a stored boundary stays), guard (the opt-in preventive wall guard on/off), or self:true (stage the session's own completed context_trim call rows)" };
    }
    if (isClear) return { output: await markSet(sid, { clear: true }) };
    return { output: await markSet(sid, { ids, unmark, guard: guardArg, self: a.self === true }) };
  }
  if (mode === "apply") return { output: await applySet(sid, a.force === true) };
  if (mode === "free") {
    // (15) U18 — the free-space op takes ONLY the percent; the number-shaped
    // string form is accepted too (a host that stringifies numbers), anything
    // else is refused fail-closed BEFORE any read or write.
    const raw = a.target;
    if (raw == null) return { output: await freeSet(sid, FREE_DEFAULT) };
    let pct: number | undefined;
    if (typeof raw === "number") pct = raw;
    else if (typeof raw === "string" && /^\d+$/.test(raw.trim())) pct = Number(raw.trim());
    if (pct === undefined || !Number.isInteger(pct) || pct < FREE_MIN || pct > FREE_MAX)
      return { output: `free= rejected: target-invalid ${cap(String(raw), 40)} — pass an integer percent ${FREE_MIN}..${FREE_MAX}` };
    return { output: await freeSet(sid, pct) };
  }
  return { output: `error: mode must be 'report', 'tail', 'mark', 'apply', or 'free' (got '${cap(String(mode), 40)}')` };
}

// (U28 F1) THE AUDIT WRAPPER — dispatch is untouched; every early-failure echo
// it returns appends ONE `kind:"reject"` line, attributed with the SAME session
// precedence dispatch uses (explicit `session` wins over the caller context; no
// attributable session logs nothing). Successes and hook lanes are unaffected.
async function execute(args: unknown, toolContext: { sessionID?: unknown }): Promise<{ output: string }> {
  const result = await dispatch(args, toolContext);
  const a: Record<string, unknown> = args != null && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
  const explicit = typeof a.session === "string" && a.session.trim() !== "" ? String(a.session).trim() : null;
  const caller = typeof toolContext?.sessionID === "string" && toolContext.sessionID !== "" ? toolContext.sessionID : null;
  const sid = explicit ?? caller;
  if (sid != null) logReject(sid, result.output);
  return result;
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
      guardFailLogged.clear();
      trimApplied.clear();
      guardSkipLogged.clear();
      void regTool.dispose();
      void regHook.dispose();
    };
  },
};

export default plugin;
