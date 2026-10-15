# compact_memory.ts — the compaction tool (+ the shared compaction_core.ts)

The 2026-09-26 unification (Part A, approved proposal): ONE compaction behavior BY CONSTRUCTION — this file is the THIN ENTRY-POINT WRAPPER; the shared behavior lives in `compaction_core.ts`.

## What it does

Fires a same-model compaction of a session. SELF (no sessionID — your own session ENDS after the compaction; you resume from files, not the summary) or CROSS (an explicit sessionID — a fire-and-forget dispatch that never blocks). Budget-gated per session/model; the verified-success callback is the ONLY place the budget increments and the COMPACT line lands.

## Implementation sketch

- Entry: `export default tool(...)` — tool registration + arg validation + SELF/CROSS routing.
- Budget gate + the `emergency` arg: denial → the hand-over note, ZERO side effects (no increment, no compact call, no line); at count == cap the `emergency` arg consumes the configured `emergency_budget` 1 (count > cap = fully exhausted).
- Dispatch: the v2 `session.compact` path is fire-and-forget, NO await (the generated v2 types mark the options body `never`, no keep fields); the pinned v1 path (`session.summarize`) carries providerID + modelID in the body (REQUIRED by the server payload schema — an unresolvable pair → the request is NOT sent, no budget burned; keep fields in the body WHEN GIVEN; a 404/missing-key/unexpected-field rejection → one retry without the keep fields).
- Pre-compaction dump (#152): the corpus dump before ANY dispatch (DUMP-OK/RETRY/FAIL lines, no-overwrite naming, one retry, 120 s spawn budget).
- Queued message: the `message` arg is STORED at queue time (one per-session file under `.opencode/temp/`) and delivered as the FIRST message on the compacted session's next resume by the auto_resume unit-4 CONTINUE relay — NO promptAsync at queue time (the maintainer's temp fix stays gone).
- **The shared core (`compaction_core.ts`):** a PURE module — the config reader (`.opencode/temp/compact_budget.json`: `keepMessages`/`keepTokens`/`emergency_budget`/`emergencyRecovery`/`model_budget`, all fail-open defaults, read PER call), the budget store + cap resolver (bare model id → cap; unlisted/typo'd → `model_budget.default`, else 1; CPU models stay cap 0 — the SAFETY INVARIANT), the keepTokens resolution (#99), the summarizer-pair resolution (the session's OWN providerID + modelID — the 2026-09-26_14-26 incident fix), the v1 summarize call, the COMPACT-line writer, the verified-success handling. NO tool registration, NO default export (the T5 loader constraint — importing it pulls no tool registration into the hook-only plugin).

## Who imports it

`compact_memory.ts` (the tool) and `context_recovery.ts` (the hook) — one implementation, two thin entry points.

## Gotchas / lessons

- The dispatch response is NEVER a success claim — the budget increment + the COMPACT line land ONLY in the verified-success callback (a failed dispatch burns NO budget).
- keepTokens (#99): the token mass of the last `keepMessages` messages is the PRIMARY; the budget file's `keepTokens` is the fallback when the read fails or the sum is 0.
- The cap is resolved AT CALL TIME from the `model_budget` map — a mid-run edit applies to the next call.
- The permanent host "failed to load plugin" start error for this file does NOT mean it is dead (a self-compact ran under the same failing start — see `repo_overview.md` safety note).

## Tests

`tests/compact_memory.smoke.mjs`.
