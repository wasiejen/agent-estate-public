# TASK SPEC — plan36 unit 1: context-erase / tail-trim research (RESEARCH ONLY)

Worker: `explorer_Q3S_245K_slow` (verified live in opencode.jsonc).

## Question (exactly ONE)
If rows of a session's messages/parts are deleted from the live opencode
DB, does the context sent to the model on the next turn CHANGE (i.e. it is
re-derived from the DB), or is the model context assembled in a way that
ignores DB-row deletion (in-memory state / incremental list / cached
prompt)?

## Verified facts (planner-measured at spec time — trust these, don't re-derive)
- Installed build = 1.18.32; source copy:
  `home\AppData\Local\Temp\opencode\opencode-dev` (plain copy,
  provenance spot-verified against the published v1.18.32 tag, 2026-09-27).
- Installed packages: `.opencode/node_modules/@opencode-ai/` (SDK types:
  `sdk/dist/gen/sdk.gen.d.ts`).
- The hook `experimental.chat.messages.transform` receives the assembled
  prompt as `messages: {info, parts}[]` (host-map §hooks) — the context is
  assembled as a message list somewhere in host code.
- Measured 2026-09-27 (TODO #92): after a real compaction the pre-compaction
  messages + parts REMAIN in the DB — compaction adds a summary/compaction
  message, it does not delete rows.
- The session DB has `message` + `part` tables (host-map §DB schema; helper:
  `node .opencode/agent/scripts/db/probe_schema.cjs`).
- Knowledge to read FIRST (bounded): `.opencode/agent/knowledge/opencode-
  plugins/host-map.md` (420 lines — grep for `messages`, `history`,
  `compaction` with `| head -30` first) and
  `.opencode/agent/knowledge/opencode-plugins/2026-09-28_auto-resume-units-
  explainer.md`. Doc style reference: `.opencode/agent/research/
  2026-09-28_repo-split.md` (evidenced pins, effort/approval sections).

## What to find (evidence = file + line refs in the opencode-dev source)
1. Where the LLM prompt messages are assembled — the call site feeding the
   provider/LLM request (file + function + line range).
2. Whether that assembly reads the DB per turn or uses in-memory / durable
   state — quote the query / store access.
3. What bounds the sent-message window after compaction (the compaction
   part / last-compaction pointer) — does the assembly start after the
   compaction marker?
4. Integrity assumptions that row deletion would break: part→message FKs,
   compaction-part placement, `session.history` paging (SDK, host-map §SDK),
   message IDs referenced by tool-result parts.
5. Verdict: is row-deletion a viable / safe context-trim channel (the
   "context-erase / tail-trim" idea), or a dead end — and why.

## Constraints
- READ-ONLY: no live-DB writes, no live-session touch, NO model/provider
  requests (the single-slot backend — never request it directly), no FST
  app run.
- Context discipline: greps with `| head -30`; read TARGET sections, never
  whole source files.
- Scratchpad for temp output: `home\AppData\Local\Temp\opencode`.

## Definition of done
- Doc lands at `.opencode/agent/research/2026-09-28_context-erase-tail-
  trim.md` (~150–200 lines), answering the ONE question with code evidence
  (file + line refs against the opencode-dev source) + the verdict.
- ONE checkpoint commit (doc only). The handover file
  `.opencode/agent/handover/handover_task_to_planner.md` rides the FINAL
  commit (status `LANDED`, code commit hash referenced — never your own
  hash; the planner records it in the follow-up bookkeeping).
- DONE loop-log line with correct role/model/session fields (model arg =
  `Qwen3.8-27B-Q3S-245K-slow`).
- No code / plugin / prompt / config / TODO changes (the planner decides
  follow-ups after review).

## DO-NOT-touch
`.opencode/maintainer/**`, `opencode.jsonc`, `AGENTS.md`,
`.opencode/agent/prompts/**`, `TODO.md`, the live DB (write operations).
