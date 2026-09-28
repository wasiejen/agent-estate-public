# Worker summary — plan30: TODO #105 parts (c) + (d) — RESEARCH ONLY (explorer-30)

## What changed (research only, no code change, no gate run — per spec)

Two research documents, checkpoint-committed in spec order ((d) first, then (c)):

1. **(d) Compaction-summary customization** —
   `.opencode/agent/research/2026-09-28_compaction-summary-customization.md`
   (checkpoint commit **98bcaf7**).
   - Q answered explicitly: the installed 1.18.32 summarize call accepts NO
     prompt override in the HTTP body (`SummarizePayload = {providerID, modelID,
     auto?}`, groups/session.ts L65-69) or via any env var (zero hits grepped in
     compaction.ts / agent.ts / core compaction.ts / llm/request.ts); YES via
     CONFIG — `agent.compaction.prompt` (v1) or `agent.compaction.system` (v2,
     mapped by v2-compat `lowerAgent` L401) replaces the summarizer's system
     prompt (agent.ts L267-294, L283); the template + update-instructions are
     hardcoded module constants (core/session/compaction.ts L16-55, sole consumer
     `buildPrompt` L160-174).
   - Both maintainer ideas assessed against the influenceable surfaces:
     `experimental.session.compacting` (context append OR full prompt replace —
     typed plugin/index.ts L298-308), `experimental.chat.messages.transform`
     (drop/rewrite pre-summarizer messages; caveat: also fires on normal chat —
     prompt.ts L1255), `experimental.chat.system.transform` (system[] of any LLM
     request incl. the summarizer's), `experimental.text.complete`
     (deterministic post-hoc summary-text rewrite). Neither idea needs a fork.
   - Recommendation: phased plugin-side — Phase A soft `context` injection with
     dynamic iteration N (~30-60 lines, ~0.5-1 day incl. live testing); Phase B
     hard prompt-replace / text-complete diff-stamping only if quality
     insufficient; optional static config `agent.compaction` override (maintainer
     call, zero agent work); fork NOT recommended for these ideas.
2. **(c) v2 migration hardening** —
   `.opencode/agent/research/2026-09-28_v2-migration-hardening.md`
   (checkpoint commit **c81f6c1**).
   - Mainline identified (GitHub, fetched 2026-09-28): default branch is
     **`dev`** (there is no `main` branch), 15,802 commits; latest tag
     **v2.0.18** (2026-09-25); v2 line ≈ 1 release/day (v2.0.10 09-19 → v2.0.18
     09-25); v1.18.32 the last v1 tag (09-21); 210.4k stars / 27.8k forks. The
     "nearly 2000 branches" figure is UNVERIFIED — the branches page rendered
     only the active branches (dev, session-row-helpers, `v2`,
     weekly-i18n-sep28, effect-rc115, url-media-type); the total count did not
     come through the fetch (reported honestly as a gap).
   - Per-call keep answer: **NO** on the mainline — fetched dev
     `SummarizePayload` is unchanged (no keep field), `ConfigV2.Compaction`
     unchanged (auto/prune/keep.tokens/buffer), and the v1→v2 config shim still
     ships (keep.tokens → preserve_recent_tokens). One open gap, specified for
     follow-up: the v2 `/api/session/{id}/compact` payload (present in the v2 SDK
     gen, sdk.gen.ts L5663-5671; its server routes not in the fetched mainline
     groups; no committed openapi.json on dev) — verify via `bun dev generate`
     on a dev checkout if the maintainer wants it.
   - Hardening table (per plugin/tool, risk + effort): hooks interface
     UNCHANGED on dev (all 18 hook names present); our client endpoints
     (summarize/messages/status/promptAsync) all present on dev; LOW risk:
     compact_memory (dual-dispatch already v2-ready), compaction_core,
     context_recovery, intercept_observer, all six tools (node/fs, no SDK);
     MEDIUM risk: auto_resume (event payload shapes unverified), ctx_watchdog
     (gauge DB schema unverified), and the v1-format opencode.jsonc
     (permission/provider/TUI items not in the inspected shim mapping;
     `compaction.keep.system: true` silently ignored on v2 — harmless).
   - Recommendation: **do NOT switch now** — npm `latest` is still 1.18.32
     (measured: `npm view opencode-ai`; v2 only on the npm `dev` tag
     `0.0.0-dev-202609261957`), v2 is in rapid churn, the switch buys no
     per-call keep, and the code delta is small (verification ≈ 1-2 sessions).
     Re-check each v2 minor (cheap tag + SummarizePayload fetch); switch when v2
     lands on npm `latest` or adds per-call keep. The fork (part b doc) and the
     (d) plugin-side surfaces are unaffected by the switch.

## Verification (measured)

- All dev-tree locators: grep/read-verified against
  `home\AppData\Local\Temp\opencode\opencode-dev` (1.18.32 tree,
  provenance per the #99 trace doc) on 2026-09-28.
- All mainline claims: fetched directly from GitHub `dev` branch 2026-09-28
  (repo/branches/tags pages + raw files: groups/session.ts,
  groups/experimental.ts, core config/compaction.ts, plugin/index.ts,
  config/v2-compat.ts existence; API 404 for openapi.json).
- npm state measured locally 2026-09-28 (`npm view opencode-ai`).
- No code changed → no gate run needed (spec §Definition of done 5).

## Commits (this session)

- `98bcaf7` research #105(d): compaction-summary customization (doc 1)
- `c81f6c1` research #105(c): v2 migration hardening (doc 2)
- final commit: `TODO.md` #105 status update + this handover (+ loop log)

## TODO entries

- `TODO.md` #105 status updated: parts (c) + (d) marked DONE with the doc
  paths (per spec, commit hashes NOT recorded in TODO — yours in the
  bookkeeping commit). Entry now: (a)+(b)+(c)+(d) DONE, remaining (e).
- No new TODO entries; nothing found that needs curation.

## Deliberately not done

- The §2d gap (v2 `/api/compact` payload keep-field check) — needs a dev
  checkout + codegen run; out of the research-only scope (follow-up path
  specified in the (c) doc §2d).
- The "nearly 2000 branches" count — not obtainable from the fetched pages;
  reported as unverified rather than guessed.
- Part (e) (explorer/researcher makeover) — separate scope, still open.
- No requests at the backend inference server (none needed — spec DO-NOT).

## Lessons

- The GitHub `contents` API returns FULL base64 content — use it for
  existence+size checks, but a stat-only path (or `git/trees` for directory
  listings) is cheaper when you don't need the bytes.
