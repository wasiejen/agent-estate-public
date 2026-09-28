# context-erase / tail-trim research — do DB row deletions change the next-turn model context? (2026-09-28)

explorer-36, plan36 unit 1 — RESEARCH ONLY (no code, no config, no live-DB writes).
ONE question: if rows of a session's messages/parts are deleted from the live
opencode DB, does the context sent to the model on the next turn CHANGE
(re-derived from the DB), or is the context assembled ignoring DB-row deletion
(in-memory state / incremental list / cached prompt)?

Source: `home\AppData\Local\Temp\opencode\opencode-dev` — plain copy,
provenance spot-verified against the published v1.18.32 tag (task spec,
2026-09-27); version confirmed at `packages/opencode/package.json:3`
(`"version": "1.18.32"`). ALL file:line refs below are against that copy.
The installed live client is v1-generation (host-map §v2 surface, L96-97), so the
`packages/opencode/src/session/` path is the runtime path — that is what is traced.

## TL;DR

**YES — the context changes.** The model's message list is re-derived from the
DB at the top of EVERY loop step (a fresh SQL select, no in-memory history, no
cached prompt, no incremental append-list). Deleted rows simply do not appear
on the next turn. Row-deletion is therefore a **viable context-trim channel**,
but with a narrow safe zone (see §5).

## 1. Where the LLM prompt is assembled (evidence chain)

The per-turn chain, end to end:

1. **Per-step fresh DB read** — `packages/opencode/src/session/prompt.ts:1081-1094`
   (`runLoop`): the `while (true)` loop re-reads the whole session history at the
   top of every step:
   `let msgs = yield* MessageV2.filterCompactedEffect(sessionID)` (prompt.ts:1092-1094).
   There is no cached copy — `msgs` is a local of the loop body.
2. **The DB query itself** — `message-v2.ts:473-494` (`stream()`): pages the session
   in 50-row batches via `page()`; `message-v2.ts:433-446`:
   `db.select().from(MessageTable).where(eq(MessageTable.session_id, sessionID))`
   `.orderBy(desc(time_created), desc(id)).limit(limit + 1)` — executed on every call.
   `hydrate()` (`message-v2.ts:98-120`, called at :463) joins parts by
   `partByMessage.get(row.id) ?? []` (:120) — parts come from the `part` table
   in the same read.
3. **Compaction windowing** — `message-v2.ts:578-580`:
   `filterCompactedEffect = filterCompacted(stream(sessionID))`; the windowing
   itself is §3 below.
4. **Row → model-message conversion** — `message-v2.ts:131-135`
   (`toModelMessagesEffect`), invoked at prompt.ts:1262 inside `Effect.all`.
   Skips: messages with zero parts (`message-v2.ts:200`
   `if (msg.parts.length === 0) continue`), error assistant messages
   (`:252-260`). A `compaction` part renders as the literal text
   "What did we do so far?" (`:232-237`).
   Tool call/result parts live INSIDE the assistant message row and are paired
   by `callID` (`:294-359`, `toolCallId: part.callID` at :322/335/345/359).
5. **Plugin transform hook** — prompt.ts:1255:
   `plugin.trigger("experimental.chat.messages.transform", {}, { messages: msgs })`
   fires on exactly this array (mutable) — the hook the task spec names
   (host-map §hooks, L128).
6. **The provider request** — prompt.ts:1272-1282:
   `handle.process({ user: lastUser, system, messages: [...modelMsgs,
   …maxSteps], tools, model })` → `processor.ts:641-654`:
   `const stream = llm.stream(streamInput)` (:654). The ONLY model input is
   `streamInput.messages` (+ system array, prompt.ts:1264-1269) and tools.
   The `user` field is NOT sent as content — attribution only: per-message
   system (`llm/request.ts:62`), request metadata (`:121,:141`),
   `x-opencode-request` header (`:192`), per-message tool disabling (`:213`).

**Answer to Q1:** the LLM prompt is assembled fresh from the DB at every step
of every turn, via `filterCompactedEffect → stream/page (SQL select) →
toModelMessagesEffect`. No in-memory history, no incremental list, no prompt
cache exists at this layer. (The `Session.messages` RPC used by our plugins —
`session.ts:828-840` → `MessageV2.page` — is a second independent reader of
the same tables. The compaction summarize request is DB-derived too:
`compaction.ts:363-380` serializes the same `messages` list, passed from
prompt.ts:1150-1156, and fires the transform hook at :379.)

## 2. Per-turn DB read vs in-memory state (Q2)

- The only things held in memory across steps: the session row
  (`sessions.get`, prompt.ts:1086 — title/permission, NOT messages), the
  status map (processor.ts:653), and the in-flight assistant row being
  written (`updateMessage`, prompt.ts:1201/1210). History is never cached.
- Because `msgs` is re-read at prompt.ts:1092 at the TOP of each loop
  iteration, even a MID-RUN deletion is reflected in the NEXT step of the
  same turn (the current step's already-sent request is unchanged).
- **No cache invalidation is ever needed** — there is nothing to invalidate.
  A row deleted before the next turn's step-1 read simply does not enter the
  prompt.

## 3. What bounds the sent window after compaction (Q3)

`filterCompacted` (`message-v2.ts:525-576`) is the window logic:

- A *completed compaction* = a user message carrying a `compaction` part
  (detected via a `summary` child: an assistant row with `info.summary` and
  `finish` and no error, whose `parentID` equals the compaction user row's id —
  `:545-546`, `:558-566`).
- The compaction part carries `tail_start_id` (`:538-540`): the id of the
  first message of the RETAINED tail.
- Reorder (`:568-573`): returns
  `[compaction-user, summary, …result.slice(tailIndex, compactionIndex),
  …result.slice(summaryIndex + 1)]` — i.e. **the model window starts at the
  last compaction marker**; pre-marker messages are sent only if they fall
  inside the retained tail slice (`:571`).
- **The guard**: `if (tailIndex >= 0 && tailIndex < compactionIndex &&
  summaryIndex > compactionIndex)` (`:568`). If ANY of {compaction user row,
  its compaction part with `tail_start_id`, the summary row, the message that
  `tail_start_id` points to} is missing, the guard fails and the FULL
  un-reordered history (`result`, `:575`) is returned → every pre-compaction
  row is sent.
- Overflow backstop: prompt.ts:1161-1168 (`compaction.isOverflow` on the last
  finished row's tokens → auto `compaction.create`). On THIS host
  `compaction.auto = false` (opencode.jsonc L47-58 per host-map §live config,
  L349-351), so a degenerated full-history window surfaces as a provider
  overflow error (ContextOverflowError path: compaction.ts:450-458) rather
  than being auto-healed.

## 4. Integrity assumptions that row deletion would break (Q4)

1. **FK cascade (protects, not breaks)** — `PRAGMA foreign_keys = ON` on every
   connection (`packages/core/src/database/database.ts:31`);
   `part.message_id → message.id` with `onDelete: cascade`
   (`packages/core/src/session/sql.ts:82-89`); `message.session_id →
   session.id` cascade (`:68-75`). Deleting a `message` row therefore
   CASCADE-deletes all its part rows — no orphans, no FK violation. Deleting a
   `part` row alone is legal and leaves a (possibly empty) message row.
   Message/part metadata lives in JSON blobs (`data` column, sql.ts:77,92),
   so a row edit = a JSON edit, no column schema to satisfy.
2. **The active turn is the last user ROW, not the last sent request** —
   `MessageV2.latest` (`message-v2.ts:586-602`) picks the newest user row by
   `(time_created, id)`; `runLoop` uses it as `lastUser` and feeds it to
   `process` (prompt.ts:1096, :1273); no user row → hard throw
   (`"No user message found in stream"`, prompt.ts:1098). **Deleting the last
   user/assistant pair makes the next prompt re-run the OLDEST surviving user
   message as the current turn** — the model re-answers an already-answered
   message (duplicate assistant row, possible tool re-execution, and loss of
   that message's per-message `system` field, llm/request.ts:62). Deleting
   tail rows is NOT the same as "trim history and continue" — it also swaps
   the active prompt.
3. **Compaction-marker placement** — §3 guard (message-v2.ts:568): deleting the
   compaction user row, its compaction part, the summary row, or the
   `tail_start_id` target degenerates the window to the FULL history →
   immediate overflow on any session that ever compacted (and no auto-compact
   backstop on this host). Deleting rows strictly BEFORE the marker is
   invisible to assembly, except rows inside the retained-tail slice
   (`:571`) — those shrink the retained tail (that is the intended trim).
4. **Tool call/result pairing** — call and result parts cohabit ONE assistant
   message row (message-v2.ts:294-359, paired by `callID`). Cascade message
   deletion removes both together (safe). Per-part deletion removes exactly
   that call/result from the model messages (no dangling reference, since
   pairing is within-row); it does NOT split a pair.
5. **`parentID` pointers** — assistant rows carry `parentID = lastUser.id`
   (prompt.ts:1188); summary rows are found by `parentID === compaction
   .info.id` (message-v2.ts:564). Deleting a referenced row leaves dangling
   pointers; assembly only JOINs on the summary lookup, so the only
   parentID-sensitive breakage is item 3. Other dangling parentIDs are
   cosmetically inconsistent (TUI/SDK views) but do not alter the model
   request.
6. **Paging / SDK surfaces** — the cursor predicate is strict `(time_created,
   id)` (`message-v2.ts:96` `older()`, cursor encode :465-469) → deleting a
   mid-history row does NOT break cursor arithmetic (no skipped rows, no
   infinite loop); paged surfaces (`session.messages` v1 session.ts:828; v2
   `session.history`/`session.context` — host-map §v2 surface L94-95,
   sdk.gen.d.ts:1726/1718) simply report the trimmed state. Our own plugins
   read `session.messages` (host-map §SDK L78) → gauge/keep-token estimates
   automatically reflect the deletion.

## 5. Verdict

**Channel: VIABLE — with a narrow safe zone and one cleaner alternative lever.**

- **Viable because**: context is re-derived from the DB every step (§1-2).
  Rows deleted before the next step-1 read are absent from the prompt with
  zero invalidation, zero restart, zero host cooperation; the FK cascade
  (sql.ts:89 + database.ts:31) keeps deletes self-consistent (parts follow
  their message).
- **Safe zone** (the only deletions that do not break a live session):
  complete finished turns — user row + its assistant row(s) — strictly
  BEFORE the current last user message (protect item 2) and, when a
  compaction exists, strictly OUTSIDE the marker quartet: compaction user
  row + compaction part + summary row + `tail_start_id` target (protect
  item 3). Parts may be trimmed per-part from OLD assistant rows (item 4).
- **Not viable / hazardous**: deleting the last user message (re-runs an old
  turn), deleting anything in the marker quartet (full-history degeneration →
  overflow; no auto-compact backstop here), part-only deletion of the CURRENT
  turn's messages (phantom rows in session surfaces, message-v2.ts:200 only
  skips them at model level), and any write to the live DB without
  coordinating with the host's open connection (WAL/locking — a production
  implementation concern; this research did not touch the DB).
- **Cleaner lever discovered**: the host itself already rewrites the
  compaction part's `tail_start_id` IN PLACE on the part row —
  `compaction.ts:461-466` (`session.updatePart({…compactionPart,
  tail_start_id: selected.tail_start_id})`). Because the retained-tail slice
  is exactly `result.slice(tailIndex, compactionIndex)`
  (message-v2.ts:567-571), a single-field JSON edit of ONE part row trims or
  extends the retained tail precisely, without any deletion and without
  touching the marker quartet's existence. Where a compaction marker exists,
  this edit is strictly safer than row surgery; where NO marker exists, the
  options are row-deletion of old turns (§5 safe zone) or creating a marker
  (requires a summary → a model request — forbidden on this host).
- **Bottom line**: "context-erase / tail-trim" is NOT a dead end — the DB is
  the single source of the prompt and there is no in-memory shadow. It IS a
  delicate channel: the safe surface is old complete turns (or one JSON field
  on a compaction part); everything near the session tail or the compaction
  marker is structurally load-bearing. Production use needs a follow-up task
  with live-DB write coordination (WAL; foreign-keys already on) — outside
  this research's approval boundary.

## Effort / approval

- Effort: this unit only (source reading, bounded greps; no live DB, no model
  traffic, no FST run). Follow-up unit: (a) design the tail_start_id-edit /
  row-delete tool with live-DB write coordination; (b) maintainer call on
  whether a live-DB write tool is wanted at all.
- Approval: research-only — no code/config/DB changes made by this unit.
