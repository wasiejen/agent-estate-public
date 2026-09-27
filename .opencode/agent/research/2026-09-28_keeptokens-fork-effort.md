# 2026-09-28 — keepTokens fork-effort research (#105 part (b))

Research-only effort estimate for FORKING the installed opencode 1.18.32 build so a
per-call `keepTokens` field in the `session.summarize` request body is honored (instead
of the config-only `compaction.keep.tokens` retention today). Every file/line reference
below was grep-verified against the dev tree on 2026-09-28 (no code dumps — locations +
intent only).

- **Host under study:** installed `opencode-ai` **1.18.32**
  (`home\AppData\Roaming\npm\node_modules\opencode-ai\` — `bin\opencode.exe`
  is the native bun-compiled binary; platform package
  `opencode-windows-x64@1.18.32` sits in its `node_modules\`, plus the `-baseline`
  variant).
- **Source tree:** `home\AppData\Local\Temp\opencode\opencode-dev`
  (plain copy, `packages/opencode/package.json` = 1.18.32 — provenance from the #99
  follow-up doc; all refs below re-verified against it).
- **Prior art:** #99 follow-up research doc
  `.opencode/agent/knowledge/opencode-plugins/2026-09-27_summarize-keep-source-trace.md`
  (the N=10 discriminator is there, §"N=10 discriminator").
- **Scope read:** our plugin's summarize call surface (`.opencode/plugin/compaction_core.ts`
  `callSummarize`, `compact_memory.ts` L486-514 dispatch) — see §Client side.

## 1. The change set (server side — minimal wire)

The summarize endpoint today: `POST /session/:sessionID/summarize`
(`groups/session.ts` L94 path, L303-311 endpoint, identifier `session.summarize`).
The payload schema has NO keep field; the body's `keep.*` fields our plugin sends are
silently ignored (Effect Schema drops unknown keys — live-verified in #99).

Design in one line: add an optional `keep.tokens` field to the payload, thread it through
`compactSvc.create` → compaction part → `processCompaction` → `select`, where
**the per-call value wins over config**: at the single budget call site,
`budget = keepTokens ?? preserveRecentBudget({cfg, model})`. `preserveRecentBudget`
itself is untouched (it stays the config/default fallback).

| # | File (dev-tree relative) | Location (verified 2026-09-28) | Edit (intent) | ~lines |
|---|---|---|---|---|
| 1 | `packages/opencode/src/server/routes/instance/httpapi/groups/session.ts` | `SummarizePayload` L65-69 (currently `providerID`, `modelID`, `auto?`) | add `keep: Schema.optional(Schema.Struct({ tokens: Schema.optional(NonNegativeInt) }))` (mirrors the body shape our plugin already sends; the extra `messages` key the plugin sends can stay undecoded — dropped harmlessly) | +2 |
| 2 | `packages/opencode/src/server/routes/instance/httpapi/handlers/session.ts` | `SessionHttpApi.summarize` L273-294, `compactSvc.create({...})` L282-290 | pass through `keepTokens: ctx.payload.keep?.tokens` | +1 |
| 3 | `packages/opencode/src/session/compaction.ts` | `create` input L559-565; `session.updatePart` (the compaction part write) L574-581 | add `keepTokens?: number` to the input; store `keepTokens: input.keepTokens` on the part | +2 |
| 4 | `packages/opencode/src/session/compaction.ts` | `processCompaction` input L319-325; `select({...})` call L367-371 | add `keepTokens?: number` to the input; forward to `select` | +2 |
| 5 | `packages/opencode/src/session/compaction.ts` | `select` input L223-227; budget line L230 (`preserveRecentBudget` call) | `const budget = input.keepTokens ?? preserveRecentBudget({ cfg: input.cfg, model: input.model })` | +2 |
| 6 | `packages/schema/src/v1/session.ts` | `CompactionPart` schema L195-201 (currently `type`, `auto`, `overflow?`, `tail_start_id?`) | add `keepTokens: Schema.optional(NonNegativeInt)` — required for `updatePart` to accept the field (old stored parts stay valid: field is optional) | +1 |
| 7 | `packages/opencode/src/session/prompt.ts` | `compaction.process({...})` L1150-1156 (the task loop; `task` IS the compaction part itself — `MessageV2.latest` builds tasks from parts, `message-v2.ts` L596-600, so `task.auto`/`task.overflow` are part fields today) | add `keepTokens: task.keepTokens` to the process input | +1 |

**Tally: 6 files, ~11 lines.** No other server file is touched:

- `packages/core/src/v1/session.ts` — pure re-export of
  `@opencode-ai/schema/session-v1` (imports `CompactionPart` at L11, re-exports); no edit.
- `packages/opencode/src/config/v2-compat.ts` L164-185 (`normalizeCompaction`, the
  `keep.tokens → preserve_recent_tokens` shim) — unchanged; the config path keeps
  working as the fallback.
- `preserveRecentBudget` (`compaction.ts` L115-120: `cfg.compaction?.preserve_recent_tokens
  ?? min(MAX, max(MIN, floor(usable * 0.25)))`) — unchanged; it remains the default.
- The auto-overflow compaction trigger (`prompt.ts` L1164-1167, `auto: true`) passes no
  `keepTokens` → falls back to config, as intended.

## 2. Client side (the SDK type surface)

- The plugin client `ctx.client` is the **v1-generation** `OpencodeClient`:
  `packages/opencode/src/plugin/index.ts` L10 (`import { createOpencodeClient } from
  "@opencode-ai/sdk"`), L146; v1 types = `packages/sdk/js/src/gen/types.gen.ts` +
  `src/gen/sdk.gen.ts` (the `summarize` method at L591-600 — URL `/session/{id}/summarize`,
  body passed through untouched). The v1 gen `SessionSummarizeData.body` (types.gen.ts
  L2509-2524) currently declares only `{ providerID, modelID }` — note it is even MISSING
  the schema's `auto` field, i.e. the v1 gen is a STALE committed artifact, NOT
  regenerated by the current codegen.
- The **v2** gen (`packages/sdk/js/src/v2/gen/types.gen.ts` L10106-10120) DOES carry
  `auto?: boolean` — it is generated: `packages/sdk/js/script/build.ts` L14
  (`bun dev generate` in the opencode package → `openapi.json`), L47-72
  (`@hey-api/openapi-ts createClient` → `src/v2/gen`), plus manual patch steps L74-113.
- **Our plugins need NO client-side change:** `callSummarize`
  (`.opencode/plugin/compaction_core.ts` L591-602) takes `client: any`, builds a plain
  object body, already sends `keep` when present, and retries once without the keep
  fields on rejection (graceful degradation on a non-forked build). No SDK import in
  `compact_memory.ts` / `compaction_core.ts` / `context_recovery.ts` (only
  `@opencode-ai/plugin` + node builtins).

Optional type-hygiene edits (only if the maintainer wants the embedded SDK types to
match the forked server — cosmetic for us, since runtime passes plain objects):

| # | File | Location | Edit | ~lines |
|---|---|---|---|---|
| 8 | `packages/sdk/js/src/gen/types.gen.ts` (v1, hand-maintained) | `SessionSummarizeData.body` L2509-2524 | add `keep?: { tokens?: number }` | +2 |
| 9 | `packages/sdk/js/src/v2/gen/types.gen.ts` (v2, generated) | `SessionSummarizeData.body` L10106-10120 | same (or regenerate via the codegen pipeline) | +2 |

**Phase-2 tally for OUR plugins: 0 lines** (the optional 4 above are maintainer-taste).

## 3. Fork/install strategy

**Build pipeline (verified):** bun monorepo (`packageManager: bun@1.3.14`, root
`package.json`; turbo for `typecheck`: `bun turbo typecheck`). The platform binary is
built by `packages/opencode/package.json` L14 (`"build": "bun run script/build.ts"`):

- `--single` flag (`build.ts` L19, L116-135) = build ONLY the current platform
  (win32-x64, AVX2 — exactly our host); `--skip-install` (L21) skips the
  `bun install --os="*"` native-dep fetches (L141-143); `--skip-embed-web-ui` (L24)
  skips building/embedding the web UI (L26-50).
- `Bun.build` with `compile` (L163-202): target `bun-windows-x64` (L177), outfile
  `dist/opencode-windows-x64/bin/opencode` — on a Windows host this lands on disk as
  `opencode.exe` (publish workflow references
  `dist\opencode-windows-x64\bin\opencode.exe`, `.github/workflows/publish.yml` L162-163).
- Built-in smoke test: `dist/opencode-windows-x64/bin/opencode --version` (L205-214).
- `dist/opencode-windows-x64/package.json` manifest is written by the build (L218-231)
  — i.e. a local build reproduces the npm platform-package layout without publishing.
- `OPENCODE_VERSION` is defined from `Script.version` (L194) — bumping the fork's
  `packages/opencode/package.json` version (e.g. `1.18.32-fork.1`) makes
  `opencode --version` identify the forked binary (recommended for traceability).

**Maintainer build+swap commands (for the fork copy of the dev tree, on the Windows
x64 host — I did not run any of these):**

1. `bun install` (first time; full workspace — assume bun 1.3.x present).
2. `bun run --cwd packages/opencode build --single` (optionally
   `--skip-embed-web-ui` for a faster build; the web UI is not used on this host).
3. Smoke: `dist/opencode-windows-x64/bin/opencode --version` → expect the fork version.
4. Optional typecheck: `bun turbo typecheck` (or scoped `tsgo --noEmit`).
5. Swap: overwrite `home\AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe`
   with the fork binary; also overwrite the platform copies
   (`node_modules\opencode-ai\node_modules\opencode-windows-x64\bin\opencode.exe`
   and the `-baseline` twin) so a later `npm rebuild`/postinstall
   (`opencode-ai\postinstall.mjs` copies platform→`bin\`) cannot silently restore
   upstream.
6. Restart opencode (see risk 3).

**Overwrite risk / upstream interaction:** the fork lives OUTSIDE npm's view — the
manifests stay at 1.18.32. Any `npm update opencode-ai` (or reinstall) replaces the main
package AND the `opencode-windows-x64` optionalDependency and the postinstall re-copies
the upstream binary into `bin\opencode.exe` → the fork dies SILENTLY (the plugin's
keep-retry fallback then degrades to config-only without an error). Mitigations: treat
the fork as "pinned, never npm-update"; keep the fork build artifacts in a known folder;
the `--version` bump gives an at-a-glance check. Re-applying the fork diff on a future
upstream version = re-landing ~11 lines + rebuild (cheap, but it IS the ongoing cost).

## 4. Risks

1. **Upstream-overwrite (managed, not eliminated):** every npm update silently kills the
   fork (see §3). Ongoing discipline cost, not a blocker.
2. **API-compat with our plugins: none in practice.** The plugin uses `client: any`
   (no SDK type import); the SDK types embedded in the forked binary come from the fork
   tree itself. The added field is OPTIONAL on both the payload and the part schema —
   old stored parts and any non-forked caller keep working.
3. **Live-host restart:** swapping `opencode.exe` requires restarting the running host —
   a mid-session maintainer action; in-memory state of live sessions is lost (committed
   state + dumps are the recovery contract). One-time cost per swap.
4. **Persistence compat:** new parts carry `keepTokens`; the fork is the only writer and
   the field is optional in the schema — no DB migration, no decode failure for old rows.
5. **Wait-for-upstream is UNDECIDABLE from the tree** (the tree is pinned to 1.18.32).
   What IS decidable: as of 1.18.32, NEITHER SDK surface (v1 gen L2509-2524, v2 gen
   L10106-10120) nor the server schema carries any per-call keep field — so "wait" buys
   no visible commitment in this snapshot. Whether a later upstream release adds it:
   not determinable from the tree (a read-only check of the upstream repo's releases/PRs
   would be the follow-up if the maintainer wants that signal).
6. **Divergence:** the fork inherits no upstream fixes/security patches until rebased
   (rebase = re-land ~11 lines + rebuild — low cost).
7. **Build prerequisites:** bun 1.3.x on the build host, full-workspace `bun install`
   (network + disk), Windows AVX2 path (our host — matches the `--single` default).

**Considered and rejected alternative:** a plugin-side workaround (e.g. rewriting
`opencode.jsonc` per call to nudge `compaction.keep.tokens`) — config is read at
compaction time by a cached service and the write would race the summarize dispatch;
not a supported surface.

## 5. Effort estimate (phased)

Assumptions: the maintainer does the build+swap (out of scope for agents); bun present;
first build on this machine (one-time `bun install` cost dominates Phase 1).

| Phase | Content | Estimate |
|---|---|---|
| **1 — minimal server wire + rebuild + swap** | fork copy of the tree; the 6-file/~11-line edit (§1); optional version bump; `bun install` (one-time, ~0.5-1h wall on this network); `build --single` (~15-30 min incl. optional web-UI embed); smoke `--version`; optional typecheck; swap + restart | **~1.5-2.5 h wall** (code diff itself: well under an hour incl. verification) |
| **2 — client-type alignment** | 0 lines for our plugins (`callSummarize` already sends `keep`, `client: any`, retry fallback in place). Optional 4-line type-hygiene in the two gen files (hand edit — the v1 gen is not codegen'd) | **~0 h required** (≤0.5 h if the maintainer wants the optional hygiene) |
| **3 — acceptance test** | the N=10 discriminator from the #99 doc: fork a session, `compact_memory` with `keepMessages=10` (config `keep.tokens` unchanged), measure post-compaction prefill via the gauge (TUI display unreliable) — count-like semantics ⇒ prefill ≈ 44k vs 1.18.32 budget semantics ≈ 29-30k; plus a negative control (non-forked build → the "keep not accepted" retry note) | **~1-2 h** (mostly session time around the compactions) |

**Total: ~3-5 h wall, one session**, of which the actual diff is ~11 lines in 6 files
(+4 optional type lines).

## 6. Recommendation

**Fork (option b)** — the evidence supports it, and narrowly: the change set is
mechanically tiny (~11 lines / 6 files, all single-purpose, verified locations), the
client side needs ZERO work because our plugin already transmits the field and degrades
gracefully, and the acceptance test (the N=10 discriminator) is already specified — the
fork converts a dead body field into the per-call retention control that #99/#105 exist
for. Option (c) config-only permanently caps us at session-wide retention (the plugin's
`tok=` stays advisory — exactly the gap #99 documented), and option (a) wait-for-upstream
is undecidable from the pinned tree with no visible commitment in this snapshot, so it
defers the feature indefinitely for free. The fork's costs are managed rather than
avoided: the npm-overwrite risk is a pinning discipline (the plugin already degrades
silently-safe if the fork dies), the live restart is a one-time maintainer action, and
rebased maintenance is ~11 lines per upstream jump. Order by effort+risk: (b) fork now,
scoped to Phase 1-3 above; fall back to (c) only if the maintainer refuses the build.

## Sources (pointers)

- Dev tree: `home\AppData\Local\Temp\opencode\opencode-dev`
  (`packages/opencode/src/server/routes/instance/httpapi/groups/session.ts`,
  `.../handlers/session.ts`, `packages/opencode/src/session/{compaction,prompt,message-v2}.ts`,
  `packages/schema/src/v1/session.ts`, `packages/opencode/src/config/v2-compat.ts`,
  `packages/opencode/src/plugin/index.ts`, `packages/sdk/js/src/{gen, v2/gen}` +
  `script/build.ts`, `packages/opencode/script/build.ts`, `.github/workflows/publish.yml`).
- Installed host: `home\AppData\Roaming\npm\node_modules\opencode-ai`
  (`package.json` optionalDependencies, `postinstall.mjs`).
- #99 follow-up doc: `.opencode/agent/knowledge/opencode-plugins/
  2026-09-27_summarize-keep-source-trace.md` (N=10 discriminator; dead keep fields).
- TODO.md: `## #99` (L695), `## #105` (L864).
- Plugin call surface: `.opencode/plugin/compaction_core.ts` (L591-602),
  `.opencode/plugin/compact_memory.ts` (L486-514).
