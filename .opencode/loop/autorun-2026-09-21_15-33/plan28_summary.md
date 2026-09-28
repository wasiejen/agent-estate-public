# plan28 summary (autorun-2026-09-21_15-33, iter 28)

Session `ses_f1b04ea20ffeo9jTAs1IEvAGjg`, planner-28,
Qwen3.8-27B-Q3S-245K-slow. Unit-4 restart branch (after planner-27
`action: restart` + host restart). One routine self-compaction mid-session
(85 % → 26 %, keepMessages=10).

## What was done

1. **MAINTENANCE PASS (catch-up — the iter-25 pass was never run):**
   - knowledge_inbox: 4 entries cured — host-map §3 token-forensics block
     (the 2026-09-26_22-33 + 2026-09-27_00-23 entries consolidated; the
     maintainer's item-5 removal honored — the bytes/4 estimate NOT
     carried; post-#103 gauge wording), knowledge_plugins lineage-depth
     cap, knowledge_tools AGENTS.md watch/refill — + the stale pre-#103
     `ctx_gauge` section in knowledge_tools updated in place + curation
     log.
   - Behavioral guidelines → destill memory (the maintainer's 2026-09-28
     instruction): the destilled_mem section "Planner behavioral
     guidelines (direct sessions)" (MEM-0110 = canonical home) + the
     memory.md addendum + the NAP pointer update.
   - TODO: header numbering fixed (up to #105, new entries start #106);
     #95 CLOSED (full text → `todo_records.md`); #106-#112 filed (feedback
     review + ideas.md triage).
   - Prompt/spec friction fixes (pre-approved class): task-spec 4 lines
     (full repo-relative paths, probe code-block refs re-verified at
     authoring, live-acceptance build canary, no "no new TODO entry" DoD
     assumptions); `todo_inbox.md` root path ×3 (planner + worker
     prompts); "the close-down rides a commit" ×2 (planner + worker).
   - `agent_feedback.md` review (lines 560-622): inline fixes above;
     #585/#594/#603 STALE (plan25 digit-refs / bda3584 / plan25 fixes);
     #579 VERIFIED on the maintainer's request: PARTIALLY STALE (1.5
     corrected by the plan23 live acceptance — the bt anchor-marker pair
     channel works live; 1.3 stands — `read.offset` schema-shadowed; his
     escape evidence = the pre-#100 removal window: last live
     `kind=escape` line 2026-09-26_02-27 vs the removal commit 02:35:47).
   - `agent_ideas.md`: 4 ideas submitted (ctx-gauge config-derived window
     + session/role attribution; the context-erase/tail-trim tool; the
     `submit` memory channel; the messages.updated real-time gauge).
   - New knowledge entry: the built-in `glob` tool returns no matches under
     dot-directories (verified twice — worker + planner; `.opencode` is NOT
     gitignored, the dot-directory is the discriminator).
2. **#105 part (a) DONE (planner-direct):** the ideas.md scan triaged — 4
   ideas submitted, #109-#112 filed, 2 maintainer-backend items (the
   parallel-slot/262k idea + the cache-invalidation experiment — NAP-only),
   the rest already covered (stale/done items recorded above).
3. **#105 part (b) DONE (explorer-28, ses_f1ac80746ffelkelB0h9zwQ4go,
   aaa1dfa):** the keepTokens fork-effort research — change set ~11 lines
   in 6 files (all grep-verified against the 1.18.32 dev tree), phased
   estimate ~3-5 h wall, recommendation = FORK NOW (plugin side needs 0
   lines — `callSummarize` already sends the `keep` body field and degrades
   gracefully on a non-forked build; the v1 gen SDK types are a stale
   hand-maintained artifact — optional 4-line hygiene only). Doc:
   `.opencode/agent/research/2026-09-28_keeptokens-fork-effort.md`. The
   fork build+swap (bun monorepo, `build --single`, npm platform-package
   overwrite) + the N=10 discriminator acceptance are maintainer domain.
4. **Maintainer live interactions (2026-09-28):** the proposals folder was
   restored by his commit d535e31 (verified — `proposals/` back under
   `.opencode/` with its subdirs); the 579 verification request answered
   with the evidence above.

## Baselines

NO code changes this session — no gate re-run needed. Baselines unchanged
from the plan27 close (probe 345/345, all smokes, pytest 459+1w, ruff F=0).

## Open / next

- **#105 remaining:** (c) v2 main-branch identification + hardening plan,
  (d) compaction-summary customization, (e) explorer/researcher makeover
  (his opencode.jsonc write-access tightening pending — his domain).
- **Fork decision (from part (b)):** the maintainer either (b) does the
  Phase 1-3 build+swap (~3-5 h, his domain) or falls back to (c) config-
  only (the plugin's `tok=` stays advisory).
- **Maintainer pending:** `AGENTS_pending_2026-09-27.md` staged at the repo
  root (his paste: the #103 gauge-lag wording + the bit-rot reframe + the
  stop-bullet idle policy); #98 natural cycle; #86 deferred queue tail.
- **Unmarked observation (NAP-only, todo_inbox 2026-09-28_01-50):** the
  self-reference barrel-export quirk in `packages/core/src/v1/session.ts`
  (opencode-dev tree — no action; relevant only if the tree is forked).

## Friction

None beyond what was codified this pass (the glob dot-directory miss →
knowledge_tools.md; the loop_log role/model auto-fill divergence →
agent_readme_loop.md + the explorer's own feedback entry).
