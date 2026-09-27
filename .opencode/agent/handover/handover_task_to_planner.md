# handover_task_to_planner.md — #105 part (b): keepTokens fork-effort research (explorer-28, plan28)

Date: 2026-09-28. Research-only run — NO code changed, no build, no install, no npm touch,
no backend-server contact.

## Deliverable
`.opencode/agent/research/2026-09-28_keeptokens-fork-effort.md` — the one-line change set,
phased estimate, fork/install strategy, risks, recommendation (the #105 acceptance form).
Every file/line reference in it was grep-verified against the 1.18.32 dev tree at writing
time (the #99 refs all re-verified: `SummarizePayload` groups/session.ts L65-69 ✓, handler
handlers/session.ts L273-294 / create-call L282-290 ✓, `preserveRecentBudget`
compaction.ts L115-120 + call site L230 ✓, v2-compat shim L164-185 (keep at L172-177) ✓).

## Change-set tally (fork = honoring a per-call `keep.tokens`)
**6 files, ~11 lines** (server side):
1. `groups/session.ts` L65-69 — `SummarizePayload` + optional `keep.tokens` field (+2)
2. `handlers/session.ts` L282-290 — handler pass-through to `compactSvc.create` (+1)
3. `compaction.ts` `create` L559-565 + part write L574-581 — carry + store `keepTokens` (+2)
4. `compaction.ts` `processCompaction` L319-325 + `select` call L367-371 — forward it (+2)
5. `compaction.ts` `select` L223-230 — the override: `budget = keepTokens ?? preserveRecentBudget(...)` (+2)
6. `packages/schema/src/v1/session.ts` L195-201 — `CompactionPart` + optional `keepTokens` (+1)
7. `prompt.ts` L1150-1156 — task loop passes `task.keepTokens` (+1)
   (numbered 7 rows / 6 distinct files — compaction.ts carries rows 3-5.)
Client side: **0 lines for our plugins** — `callSummarize` (compaction_core.ts L591-602)
already sends the `keep` body field with `client: any` and a retry-without-keep fallback.
Optional cosmetic: 4 lines in the two SDK gen type files (v1 gen is hand-maintained/stale —
it's even missing `auto`; v2 gen is codegen'd).

## Phase estimates (assumptions: maintainer builds/swaps; bun present; first build)
- **Phase 1** — server wire + rebuild + swap: **~1.5-2.5 h wall** (diff itself < 1 h).
  Build: `bun install` → `bun run --cwd packages/opencode build --single`
  (`packages/opencode/script/build.ts`, bun-windows-x64 compile, smoke `--version` built in)
  → overwrite `opencode-ai\bin\opencode.exe` (+ the platform-package twins so
  postinstall can't restore upstream) → restart.
- **Phase 2** — client-type alignment: **~0 h required** (≤0.5 h optional hygiene).
- **Phase 3** — acceptance: **~1-2 h** — the #99 N=10 discriminator
  (keepMessages=10, gauge-measured post-compaction prefill: ~44k count-like vs ~29-30k budget).
- **Total ~3-5 h, one session.**

## Fork/install strategy + overwrite risk
Build pipeline located and cited in the doc (root bun workspace; `build.ts` flags
`--single` / `--skip-install` / `--skip-embed-web-ui`; output
`dist/opencode-windows-x64/bin/opencode.exe` + platform package.json manifest — the npm
platform-package layout is reproduced locally without publishing). **Overwrite risk:**
any `npm update opencode-ai` silently replaces the fork (manifests stay 1.18.32) —
mitigated by pinning discipline + a version bump for traceability; the plugin degrades
gracefully (retry note) if the fork dies. Other risks: live-host restart (one-time
maintainer action), no DB migration (optional field), upstream divergence (re-land ~11
lines per rebase), wait-for-upstream **undecidable from the pinned tree** (no keep field
on either SDK surface as of 1.18.32 — the tree carries no commitment signal).

## Recommendation (one line)
**Fork (b) now**, scoped Phase 1-3 — the diff is ~11 lines / 6 files, plugin-side work is
zero, and the acceptance test is already specified; config-only (c) permanently caps
retention at session-wide, wait (a) is undecidable. Fall back to (c) only if the maintainer
refuses the build.

## DO-NOT-TOUCH compliance
No edits to the dev tree, the live `opencode.exe`, `opencode.jsonc`, `.opencode/plugin/**`,
`AGENTS.md`, `.opencode/agent/prompts/**`, `.opencode/maintainer/**`; no npm/build/
install; no request at the backend inference server. Writes: the research doc, this
handover, one append to TODO.md (#105 part (b) status line), the loop log.

## Files touched
- NEW `.opencode/agent/research/2026-09-28_keeptokens-fork-effort.md`
- MOD `TODO.md` (#105 status: part (b) DONE line appended — entry stays OPEN for (c)-(e))
- MOD this handover file

## Commit
Commit hash: **LANDED — recorded in the planner's follow-up bookkeeping** (per the spec,
never in the same commit). The commit carries exactly the three files above (no code).
