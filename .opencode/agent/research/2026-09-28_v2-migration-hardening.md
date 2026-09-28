# 2026-09-28 — v2 migration hardening research (TODO #105 part (c))

Research-only (explorer-30, plan30). Maintainer #105 gist: "the current 'main' branch is
identified (nearly 2000 branches) and a hardening plan for our plugins/app for a
potential switch is researched (incl. whether v2's summarize already has keepTokens
functionality not based solely on opencode.jsonc)."

Method: GitHub webfetch of `anomalyco/opencode` (repo page, branches page, tags page,
raw `dev`-branch source files, GitHub API existence checks) + local re-verification
against the 1.18.32 dev tree + bounded greps of our plugin/tool sources. All GitHub
fetches 2026-09-28; every claim below carries its locator.

## 1. The current mainline, identified (what I actually looked at)

- **Default branch = `dev`** (there is no `main` branch — the maintainer's "current
  'main' branch" is `dev`): repo page `https://github.com/anomalyco/opencode` shows
  15,802 commits on `dev`, branch selector defaulting to `dev` (fetched 2026-09-28).
- **Latest published tag = `v2.0.18`** (2026-09-25, commit `cd9a14a`); the v2 line is
  moving fast: `v2.0.10` (09-19) → `v2.0.18` (09-25) = 9 v2 releases in ~7 days;
  `v1.18.32` (09-21) is the LAST v1 tag (tags page, fetched 2026-09-28).
- **Repo stats (fetched):** 210.4k stars, 27.8k forks, 4.7k issues, 1.5k PRs.
- **Branch count: NOT measurable from the fetched pages.** The branches page rendered
  the *active* branches only: `dev` (default), `session-row-helpers`, `v2` (a branch
  literally named `v2`, updated 09-27), `weekly-i18n-sep28`, `effect-rc115`,
  `url-media-type` — no total count in the fetched markup. The maintainer's
  "nearly 2000 branches" observation is plausible at this project's churn but is
  UNVERIFIED by me (honest gap — GitHub's rendered count did not come through the
  fetch).
- **npm state (measured 2026-09-28, `npm view opencode-ai`):** `latest` = **1.18.32** —
  our installed version IS npm's current latest. v2 is NOT on npm `latest`; the dist-tags
  show `dev` = `0.0.0-dev-202609261957` (a 09-26 dev build), `beta` = 2026-08-11,
  `next` = 2026-06-27. → A switch to v2 today would mean installing a non-latest tag
  (`dev`) or another distribution — the compat shim's error strings mention
  "opencode2" (see §3 item 8), so a separate v2 distribution name is plausible.

**Conclusion:** the mainline is mid v1→v2 migration; v2 is pre-npm-latest and in
rapid-release phase. Our pinned npm `latest` (=1.18.32) is still the stable line.

## 2. Q: does v2 (current mainline) summarize/compaction have a per-call keep input?

**Explicit answer: NO on every surface I could verify — retention is still
config-only on the mainline, same as 1.18.32.** One gap remains open (the v2 `/api/`
compact payload — §2d).

- **2a. The summarize endpoint our plugin calls (v1 client):** unchanged on `dev`.
  Fetched `dev: packages/opencode/src/server/routes/instance/httpapi/groups/session.ts`:
  `export const SummarizePayload = Schema.Struct({ providerID: ProviderV2.ID,
  modelID: ModelV2.ID, auto: Schema.optional(Schema.Boolean) })` — no keep/prompt/tail
  field (byte-identical to the 1.18.32 schema, #99 trace doc §Q1).
- **2b. The compaction config schema:** unchanged on `dev`. Fetched
  `dev: packages/core/src/config/compaction.ts`: `ConfigV2.Compaction = { auto?, prune?,
  keep: { tokens? }?, buffer? }` — exactly the 1.18.32 fields (local
  `packages/core/src/config/compaction.ts` L10-14); no new knob for summary behavior or
  per-call retention.
- **2c. The v1→v2 compat shim:** STILL SHIPPED on `dev` —
  `dev: packages/opencode/src/config/v2-compat.ts` exists (18,693 bytes, GitHub API
  2026-09-28); its decoded content still maps `compaction.keep.tokens` →
  `preserve_recent_tokens` (the `preferLegacy` call is present in the fetched base64),
  `agent.*.system` → `prompt` (`lowerAgent`), and decodes with excess-property ignore.
  So a v1-format `opencode.jsonc` still loads on the v2 host (subject to §3 item 8).
- **2d. OPEN GAP — the v2 `/api/session/{sessionID}/compact` endpoint:** the 1.18.32
  v2 SDK gen already carries it (`packages/sdk/js/src/v2/gen/sdk.gen.ts` L5663-5671,
  url `/api/session/{sessionID}/compact`; a sibling `context` method at L5699) — but the
  v2 `/api/` server routes are NOT in the mainline httpapi groups I fetched
  (`session.ts` group = v1 family only, no compact; `experimental.ts` group =
  `/experimental/...` only; no committed `packages/opencode/openapi.json` on `dev` —
  API 404). **Whether the v2 `/api/compact` payload carries a per-call keep field is
  UNVERIFIED** from the files I could cheaply fetch. Follow-up (if the maintainer wants
  it): a `dev` checkout with `bun dev generate` (codegen per 1.18.32
  `packages/sdk/js/script/build.ts` L14, L47-72 — fork doc §2) to regenerate the v2 gen
  types and read the compact payload schema; or inspect the `v2` branch directly.

**Consequence:** the #99/#105 fork recommendation (`.opencode/agent/research/
2026-09-28_keeptokens-fork-effort.md`) stands — "wait for v2" still buys no per-call
keep in this snapshot; and the plugin-side override surfaces measured in the (d) doc
(§3 of `2026-09-28_compaction-summary-customization.md`) are UNAFFECTED by the switch
(the hooks they use are identical on `dev`, §3 item 1).

## 3. Hardening plan — what breaks or changes per plugin/tool on a switch to v2

Baseline facts (fetched `dev` sources, 2026-09-28):
- **Hooks interface: UNCHANGED.** `dev: packages/plugin/src/index.ts` — the `Hooks`
  interface lists the SAME 18 hooks as 1.18.32 (`dispose, event, config, tool, auth,
  provider, chat.message, chat.params, chat.headers, permission.ask,
  command.execute.before, tool.execute.before, shell.env, tool.execute.after,
  experimental.chat.messages.transform, experimental.chat.system.transform,
  experimental.provider.small_model, experimental.session.compacting,
  experimental.compaction.autocontinue, experimental.text.complete, tool.definition`);
  `experimental.session.compacting` keeps the same doc'd contract (`context` appended /
  `prompt` replaces). The `tool` helper export (`export * from "./tool.js"`) is
  unchanged — our tool registrations stay valid.
- **Plugin module type:** `PluginModule = { id?: string; server: Plugin; tui?: never }`
  (`dev: packages/plugin/src/index.ts`) — vs 1.18.32's (fork doc §2: plain
  `{server}`-shape detection at 1.18.32 `packages/opencode/src/plugin/index.ts`
  L95-124: `readV1Plugin` first, then the legacy plain-function export path
  `getLegacyPlugins`, which is where all OUR plugins load today — they use default
  function exports: `auto_resume.ts` L1701, `compact_memory.ts` L326,
  `context_recovery.ts` L141, `ctx_watchdog.ts` L719, `intercept_observer.ts` L1482).
  The mainline loader's legacy path is presumed similar but UNVERIFIED (the 318-line
  1.18.32 loader file was not re-fetched in full).
- **Plugin client:** `dev: PluginInput.client = ReturnType<typeof createOpencodeClient>`
  from `@opencode-ai/sdk` (v1-generation client — same import as 1.18.32; v2 types are
  imported separately). So our `ctx.client` surface stays the v1 gen client even on the
  v2 host — `session.summarize`, `session.messages`, `session.status`,
  `session.promptAsync` all have v1-family endpoints on `dev` (fetched `session.ts`
  group: `session.summarize`, `session.messages`, `session.status`,
  `session.promptAsync` identifiers all present).

Per-item table (risk = behavior delta on a switch; effort = agent work to verify/fix):

| # | Plugin/tool | Surface used (verified) | Mainline state (verified) | Risk | Effort |
|---|---|---|---|---|---|
| 1 | `compact_memory.ts` | dual dispatch: `client.session.compact` if a function, else `client.session.summarize` + `keep` body (L472-528) | v1 `summarize` endpoint unchanged on `dev` (fallback path works); whether the v1 GEN client on v2 exposes `compact` is UNVERIFIED (1.18.32 v1 gen has no `compact` — only v2 gen L5663) → on v2 the plugin likely stays on the v1 summarize path; `keep` stays a dead body field (config-only retention, §2) | LOW | 0 lines — probe at install (the `probeSurface` pattern already exists in `auto_resume.ts` L1687-1701) |
| 2 | `compaction_core.ts` (shared) | config read for the budget class; `callSummarize` sends `keep` (L489-502, L602) | v2 `ConfigV2.Compaction` unchanged (§2b) → config read works; v1 summarize path unchanged | LOW | 0 |
| 3 | `context_recovery.ts` | `client.session.messages` (L213-215) | endpoint present on `dev` | LOW | 0 |
| 4 | `auto_resume.ts` | `event` hook (Unit 1/2) + client probes (`probeSurface` L1687) | `event` hook present on `dev`; the EVENT PAYLOAD SHAPES (session status/idle events) UNVERIFIED — the v2 event surface may have reshaped (the `event.ts` httpapi group exists on both trees, same name) | MEDIUM | 0.5-1 day live verification; handler tweaks if event names/payloads shifted (the client-side probe pattern already exists) |
| 5 | `ctx_watchdog.ts` (gauge/ctx nudge) | `client.session.status()` (L174, L468), `client.session.promptAsync` (L114); gauge reads the session DB via the `scripts/db` helper (v1 DB schema) | both client endpoints present on `dev`; the DB SCHEMA is UNVERIFIED (v2 storage may have changed columns) | MEDIUM | 0.5 day verification; possible column-name updates in the db helper |
| 6 | `intercept_observer.ts` (+ `_core`) | `tool.execute.before` / `tool.execute.after` hooks (header L7); file IO only | both hooks present on `dev`, same shapes (fetched interface) | LOW | 0-0.5 day — re-verify the two KNOWN startup-load errors (`compact_memory.ts` "paths[0]" + `intercept_observer_core.ts` "Plugin export is not a function", repo_overview §Safety limits) on the v2 loader |
| 7 | Tools: `block_transfer`, `loop_log`, `submit`, `session_info`, `ctx_gauge`, `dev_get_tool_context_contents` | pure node/fs, NO SDK client (grep-verified); `tool` helper registration from `@opencode-ai/plugin` | `tool` export unchanged on `dev` (fetched index) | LOW | 0 (registration smoke test at install) |
| 8 | `opencode.jsonc` (maintainer file, v1 format: `permission`, `provider`, `agent`, TUI items, `compaction`) | v1 schema (`$schema: opencode.ai/tui.json`, 492 lines) | mainline SHIM maps agent/compaction/mcp/lsp/commands/skills/settings/experimental and ignores excess properties (§2c) — BUT `permission` (v1 ruleset), `provider` (v1 model list, L60-170), and the TUI items (`scroll_speed`, `cursor`, `mouse`, `attention`, `diff_style`, `autoupdate`, `formatter`, `shell`) are NOT in the shim mapping I inspected → live-verify at first v2 run (diagnostics will name unsupported keys; the shim's own error string references "opencode2" as the v2-native path). Also `compaction.keep.system: true` (L53) is not in `ConfigV2.Compaction.Keep` (tokens only) → silently ignored on v2 (harmless; `tokens` still honored) | MEDIUM | 0.5-1 day maintainer verification; possible `provider`/`permission` rewrite to v2 shapes |

**Cross-cutting switch risks (carried over from the fork-effort doc, still apply):**
1. Live-host restart required for any binary swap (one-time maintainer action; committed
   state + dumps are the recovery contract — fork doc §4 risk 3).
2. v2 churn: 9 releases in ~7 days — a switch lands on a moving target; expect a
   re-verification pass per minor until v2 reaches npm `latest` (currently `latest`
   = 1.18.32, §1).
3. Distribution uncertainty: v2 is not on npm `latest`; the "opencode2" string in the
   shim (§2c/§3 item 8) suggests a separate v2 package/binary — the exact install
   vector (npm `dev` tag vs a new package) must be resolved at switch time.
4. If the switch happens, the fork (doc b) must be RE-LANDED onto the v2 tree (~11
   lines / 6 files, fork doc §1 — the file locations shift with the v2 refactor, so
   re-verification of locators is required; the change DESIGN is unchanged:
   optional `keep.tokens` payload field, per-call wins over config at the single budget
   call site).

## 4. Recommendation

**Do NOT switch now.** The evidence: (a) v2 is pre-npm-latest with rapid churn
(§1); (b) v2 does NOT add the per-call keep we actually want — retention is
config-only there too (§2), so the switch buys the feature for nothing and costs the
§3 verification pass (≈1-2 live sessions across items 4/5/6/8) plus the §4 cross-cutting
risks; (c) our code is already switch-tolerant where it matters — `compact_memory` is
dual-dispatch (item 1), `auto_resume` probes its client surface (item 4), and every hook
name we use is unchanged on `dev`. **Plan:** re-run this identification at each v2 minor
(a cheap tag-page + `SummarizePayload` raw-fetch check, ~5 min) and revisit the switch
when v2 either (i) lands on npm `latest` or (ii) adds a per-call keep to
`SummarizePayload` / the `/api/compact` payload (the §2d gap). Until then: keep the
1.18.32 pin, proceed with the fork (doc b) for per-call keep, and the plugin-side
summary-control surfaces from the (d) doc for the maintainer's two summary ideas.

## 5. Sources (pointers)

- GitHub (fetched 2026-09-28): repo page, `branches` page, `tags` page,
  `dev: packages/opencode/src/server/routes/instance/httpapi/groups/session.ts`,
  `dev: .../groups/experimental.ts`, `dev: packages/core/src/config/compaction.ts`,
  `dev: packages/plugin/src/index.ts`, `dev: packages/opencode/src/config/v2-compat.ts`
  (existence + base64 content), GitHub API 404 for `dev: packages/opencode/openapi.json`.
- npm (measured 2026-09-28): `npm view opencode-ai version` / `dist-tags`.
- 1.18.32 dev tree (local): `packages/sdk/js/src/v2/gen/sdk.gen.ts` (L5663-5671,
  L5699), `packages/opencode/src/plugin/index.ts` (L95-124),
  `packages/core/src/config/compaction.ts` (L10-14).
- Prior research (reused, not re-derived): `.opencode/agent/research/
  2026-09-28_keeptokens-fork-effort.md` (change design, build pipeline, risks),
  `.opencode/agent/knowledge/opencode-plugins/2026-09-27_summarize-keep-source-trace.md`
  (1.18.32 summarize path), `.opencode/agent/research/
  2026-09-28_compaction-summary-customization.md` (this session's (d) doc — hook
  surfaces).
- Our plugin/tool surface (read-only): `.opencode/plugin/*.ts`, `.opencode/tools/*.ts`,
  `opencode.jsonc`.
