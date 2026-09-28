# Task spec — plan30: TODO #105 parts (c) + (d) — RESEARCH ONLY (no code change)

Worker: `explorer_Q3S_245K_slow` (verified live in `opencode.jsonc`, 2026-09-28).
Two research documents, in this ORDER (checkpoint commit per document):
1. **(d) compaction-summary customization** →
   `.opencode/agent/research/2026-09-28_compaction-summary-customization.md`
2. **(c) v2 migration hardening** →
   `.opencode/agent/research/2026-09-28_v2-migration-hardening.md`
`TODO.md` #105 status update + your handover ride the FINAL commit.

## Goal (the maintainer's #105 targets, verbatim gist)
- (d) "using the exact summarize prompt (… `compaction_prompt.md` + the temp
  opencode:dev copy), find how the compaction model's summary behavior can be
  influenced — e.g. drop all content older than 4 compactions, mark new
  additions with the current compaction iteration (keeps the summary current +
  trackable)."
- (c) "the current 'main' branch is identified (nearly 2000 branches) and a
  hardening plan for our plugins/app for a potential switch is researched
  (incl. whether v2's summarize already has keepTokens functionality not
  based solely on opencode.jsonc)."

## Context (verified facts — do NOT re-derive; start here)
- Installed host = **1.18.32** (measured 2026-09-27); the scratchpad dev copy
  `home\AppData\Local\Temp\opencode\opencode-dev` IS that exact
  build (provenance spot-verified vs the published v1.18.32 tag).
- The summarize body is `{providerID, modelID, auto?}` (opencode-dev
  `groups/session.ts` L65-69); the handler passes only model + auto
  (`handlers/session.ts` L273-294); the retention budget reads CONFIG only
  (`session/compaction.ts` L115-120) — full trace:
  `.opencode/agent/knowledge/opencode-plugins/2026-09-27_summarize-keep-source-
  trace.md` (READ this first — it is the protocol for the #99 research).
- The exact summarize prompt (READ-ONLY reference):
  `.opencode/maintainer/draft/compaction_guide/compaction_prompt.md`.
- The prior fork-effort research (READ as starting context for (c)):
  `.opencode/agent/research/2026-09-28_keeptokens-fork-effort.md`
  (its recommendation: fork 1.18.32 now, ~11 lines / 6 files, Phase 1-3).
- Our plugin/tool surface for the hardening inventory (READ-ONLY):
  `.opencode/plugin/*.ts` (auto_resume, compact_memory, context_recovery,
  intercept_observer, gauge/ctx nudge) + `.opencode/tools/*.ts`
  (block_transfer, loop_log, submit) + the SDK surface facts in
  `.opencode/agent/knowledge/opencode-plugins/host-map.md`.

## Definition of done
1. **(d) doc** (committed first — checkpoint before starting (c)):
   - Answers EXPLICITLY: does the installed 1.18.32 summarize call accept ANY
     instruction/prompt override — a body field, a config field, an env var, or
     nothing? (measured from the dev-copy source — file + line locators for
     every claim; if none exists, say so with the negative evidence).
   - Assesses the two maintainer ideas (drop content older than 4 compactions;
     tag additions with the compaction iteration) against what IS influenceable
     (e.g. the config `compaction` section, the prompt the host sends —
     `compaction_prompt.md` is what the host itself sends; can it be
     substituted/configured? — plus the queue-message / pre-compaction hooks we
     control).
   - One RECOMMENDATION with effort estimate (what to change where: host
     config = maintainer file, plugin-side hook, or nothing).
2. **(c) doc**:
   - Identifies the opencode project's CURRENT mainline branch/state from
     GitHub (webfetch; cite what you looked at — default branch, latest
     releases/tags; "nearly 2000 branches" is the maintainer's observation —
     report what you actually see).
   - Answers EXPLICITLY: does v2 (the current mainline) summarize/compaction
     have a per-call keep input (vs config-only in 1.18.32)? (grep the v2
     source — raw file fetch from GitHub is fine; locators required).
   - The HARDENING PLAN: per our plugin/tool (the list above), what breaks or
     changes on a switch (hook names, SDK shapes, config fields) — a table or
     list with effort estimates per item; reuse the fork-effort doc's facts
     where they still apply.
3. Both docs: dated header, sources/locators per claim, ≤ ~250 lines each,
   pointer-only where a knowledge file already covers a fact.
4. `TODO.md` #105 status: parts (c)+(d) marked DONE with the doc paths
   (hash recorded in the planner's follow-up bookkeeping commit — NEVER in
   your own commit); handover to
   `.opencode/agent/handover/handover_task_to_planner.md`.
5. Checkpoint commits: one per verified doc; TODO + handover in the final
   commit. No gate run needed (research-only, no code change).

## DO-NOT-touch
- `.opencode/maintainer/**` (READ-ONLY — esp. the draft compaction_guide files)
- `.opencode/plugin/**`, `.opencode/tools/**` (READ-ONLY here)
- `AGENTS.md`, `.opencode/agent/prompts/**`, `opencode.jsonc` (his live files)
- FST product code (everything outside `.opencode/` + the research folder)
- NO requests at the backend inference server (llama-swap) — ever.

## Context discipline
- First greps bounded (`| head -30`); read bounded windows of the dev copy,
  not whole files; GitHub raw-file fetches only for the files you need.
- If (c) blows past your context (GitHub research is open-ended): commit the
  (d) doc first (already done by then), finish what you can of (c) as a
  PARTIAL doc (state what is missing), and close the handover — the planner
  will decide the follow-up.
