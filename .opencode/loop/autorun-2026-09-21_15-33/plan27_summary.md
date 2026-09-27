# plan27 summary — #99 follow-up research (planner-direct, DONE)

Session: ses_f1d198b41ffeJA3a3By7tu3TfD, planner-27,
Qwen3.8-27B-Q3S-245K-slow, looprun autorun-2026-09-21_15-33 (iter 27,
unit-4 restart branch after planner-26 `action: restart`).

## What was done

The #99 follow-up research (his ruling 2026-09-27: "if there is a way to set
keeptoken flexibly, it should be used") was completed PLANNER-DIRECT — the
plan26 close left the findings ~80 % in hand (installed source tree located,
`preserve_recent_tokens` found at compaction.ts L117); the remaining checks
were bounded greps + one provenance webfetch. A serial delegation
round-trip was not worth the slot.

## Findings (all file-located, in the research doc)

1. **Installed host = 1.18.32** (measured: npm platform package
   `opencode-windows-x64` version) — the host-map's "1.18.31" reading
   (2026-09-21) is stale. The scratchpad tree
   `home\AppData\Local\Temp\opencode\opencode-dev` (v1.18.32)
   IS the installed build's source — provenance spot-verified: its
   `groups/session.ts` SummarizePayload block is byte-identical to the
   published v1.18.32 tag.
2. **NO per-call keep input exists** — `SummarizePayload =
   {providerID, modelID, auto?}` (groups/session.ts L65-69); the handler
   passes only model + auto to `compactSvc.create` (handlers/session.ts
   L273-294); the budget reads CONFIG only: `preserve_recent_tokens ??
   clamp(0.25*usable, 2k..15k)` (compaction.ts L115-120).
3. **The legacy config mapping** `compaction.keep.tokens` →
   `preserve_recent_tokens` (+ `compaction.buffer` → `reserved`) in
   config/v2-compat.ts normalizeCompaction (L163-184) explains the
   config-wins live series from his compaction_tests.md.
4. **Budget consumption** (`select`, compaction.ts L223-269): whole turns,
   newest→oldest, under an estimated-token metric (`Token.estimate(JSON
   stringify model messages)`); the first over-budget turn may split at a
   message boundary; retention snaps to turn boundaries (his test-#9
   "rounding" question: yes).
5. **Floor** = system prompt + summary only when the budget keeps no turn
   (his tests #11/#12 measured 25.8-25.9k — consistent).
6. **Fallback ruling confirmed**: the config `compaction.keep.tokens`
   (his opencode.jsonc) is the ONLY retention control on the installed
   host; nothing to wire. No code change — the body `keep.*` fields stay
   (dead but harmless, server ignores extras, live-verified); the computed
   keepTokens stays advisory (the COMPACT line's `tok=`).

## Open residual (maintainer, live, on 1.18.32)

- **N=10 discriminator**: the 2026-09-26 fork observation (FULL 30-message
  tail retained despite a 30k budget) contradicts 1.18.32's `select()` —
  version drift 1.18.31→1.18.32 is the candidate explanation; the test
  (protocol in the research doc) resolves count-vs-budget semantics.
- **Summarize-scope probe** (scripts/log/summarize_intercept.cjs).

## Files

- NEW `knowledge/opencode-plugins/2026-09-27_summarize-keep-source-trace.md`
- `knowledge/opencode-plugins/host-map.md` — version note fixed (1.18.31 →
  1.18.32 + source-copy pointer) + §compaction gap-resolved bullet
- `TODO.md` — #99 close note (research done; fallback confirmed; residual)
- `handover_planner.md` — plan26 compressed to archive; plan27 section
- loop folder: this summary + loop log START/DONE lines
- NAP backup: `archive/nap_backup_2026-09-27_ses_f1d198b41.md` (per-session
  ruling)
