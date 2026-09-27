# TASK SPEC — #105 part (b): the keepTokens fork-effort research (RESEARCH ONLY)

Date: 2026-09-28 (plan28, planner-28). Agent: **explorer_Q3S_245K_slow** (a
research run — NO code changes, NO builds, NO installs).

## Goal
Estimate the effort of FORKING the installed opencode build (1.18.32) so a
PER-CALL `keepTokens` field in the summarize request is honored (instead of
config-only retention). Deliverable: ONE research doc with the change set,
the effort estimate (phased), the fork/install strategy, and the risks —
plus a recommendation (the #105 acceptance form). This decides whether the
maintainer (a) waits for upstream, (b) forks the host, or (c) keeps the
config-only fallback.

## Verified starting state (do NOT re-derive — from the #99 follow-up
research doc, `.opencode/agent/knowledge/opencode-plugins/
2026-09-27_summarize-keep-source-trace.md`, all line refs 1.18.32-verified)
- Installed host = `opencode-windows-x64` **1.18.32** (the native exe under
  `home\AppData\Roaming\npm\node_modules\opencode-ai\bin\`).
- Source tree = `home\AppData\Local\Temp\opencode\opencode-dev`
  (PLAIN COPY — not a git repo; `packages/opencode/package.json` = 1.18.32;
  provenance spot-verified vs the published v1.18.32 tag).
- `SummarizePayload` = `{providerID, modelID, auto?}` — NO keep field —
  `packages/opencode/src/server/routes/instance/httpapi/groups/session.ts`
  L65-69 (RE-VERIFY the line numbers against the tree — grep, don't trust).
- Handler `SessionHttpApi.summarize` passes only model + auto —
  `.../httpapi/handlers/session.ts` L273-294.
- Budget `preserveRecentBudget` reads CONFIG only —
  `packages/opencode/src/session/compaction.ts` L115-120.
- The body `keep.*` fields our plugin sends are DEAD (silently ignored,
  live-verified) — the config `compaction.keep.tokens` (via the v2-compat
  shim, `config/v2-compat.ts` L163-184) is the ONLY retention control today.

## Scope (READ-ONLY except the deliverable)
- READ: the dev tree above (grep-first; the files are big — never read a
  whole file: `grep -n "SummarizePayload" ... | head -10` style, bounded
  line ranges); `.opencode/plugin/compact_memory.ts` (the summarize call
  surface — how our plugin sends the body + the keep fields today); the #99
  research doc; TODO #105/#99.
- WRITE: exactly ONE new file —
  `.opencode/agent/research/2026-09-28_keeptokens-fork-effort.md` (folder
  exists; format: dated, sectioned, pointers to sources — no code dumps).
- **DO-NOT-TOUCH:** the live `opencode.exe`, `opencode.jsonc`,
  `.opencode/plugin/**`, `AGENTS.md`, `.opencode/agent/prompts/**`,
  everything under `.opencode/maintainer/**`, the backend inference server
  (NEVER launch a request at it — not even enumeration), the dev tree itself
  (no edits there), `opencode.jsonc`, and any npm install/build.

## The research doc must contain (definition of done)
1. **The change set** — every file + the exact edit needed to honor a
   per-call `keepTokens` on the server side:
   - the `SummarizePayload` schema field (groups/session.ts) — name + type;
   - the handler pass-through (handlers/session.ts) → `compactSvc.create`
     (find its signature + the `preserveRecentBudget` call site — grep
     `preserveRecentBudget` / `compactSvc` / `create(` in
     `packages/opencode/src/session/compaction.ts` and the service def);
   - the budget override: per-call value wins over config (one-line design
     in the doc, not code);
   - the CLIENT side: where our plugin's SDK/client types for
     `session.summarize` live (find the client type surface in the dev tree
     — grep `summarize` under `packages/opencode/src` for the client/SDK
     side, and note whether the types are hand-written or generated —
     generated = the fork must also ship/rebuild the type artifacts);
   - a line/effort tally per file (files touched + approx. lines each).
2. **Effort estimate (phased)** — phase 1: the minimal server-side wire
   (schema + handler + budget override) + rebuild + swap; phase 2: the
   client-type alignment so our `compact_memory.ts` can send the field
   without a cast; phase 3: the acceptance test (the N=10 discriminator
   from the #99 doc — keepMessages=10, measure post-compaction prefill via
   the gauge). Estimate each phase in hours with the assumptions stated.
3. **Fork/install strategy** — how a fork of this tree is built for
   Windows x64 (find the build pipeline in the dev tree: the root
   `package.json` scripts / `turbo.json` / the platform-package build
   script that produces `opencode-windows-x64` — grep `opencode-windows`
   in the tree root + `packages/`; the maintainer does the build+swap, the
   doc names the commands), how the npm package is replaced/kept in place,
   and how an upstream `npm update` would interact (the overwrite risk).
4. **Risks** — the upstream-overwrite risk (the fork dies on every npm
   update), the API-compat risk with our plugins (the SDK types the plugin
   imports come from `node_modules/opencode-ai` — a forked host must ship
   matching types or the plugin breaks), the live-host-restart constraint
   (swapping the exe affects the running session — maintainer action,
   mid-session), and the "wait for upstream" alternative (grep the dev
   tree / a quick check whether a per-call keep exists upstream-later —
   if undecidable from the tree, say so).
5. **Recommendation** — which path (fork now / wait / config-only fallback)
   the evidence supports, in one paragraph, ordered by effort + risk.

## Verification (worker self-check)
- Every file/line reference in the doc was grep-verified against the dev
  tree at writing time (a stale ref from the #99 doc counts as a defect).
- The doc names the build commands it cites (each cited file exists —
  `ls`-verified).
- No file outside the deliverable was modified (`git status` clean + the
  dev tree untouched).

## Handover
- `handover_task_to_planner.md`: executive summary — the change-set tally
  (files + lines), the phase estimates, the recommendation, the DO-NOT-
  touch compliance, the commit hash (LANDED = hash recorded in the
  planner's follow-up bookkeeping — never in the same commit).
- Friction check per the planner-prompt §Friction check before the handoff.
- Loop log: START + DONE lines per the loop protocol (looprun folder
  `autorun-2026-09-21_15-33`).
- ONE commit (the doc only — no code touched).
