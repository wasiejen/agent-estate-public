# plan24_nap.md — closed-session excess (appended by the next planner per NAP size discipline)

## Fork session (ses_f20b3bf14ffedWHp2HGajHmGLN, planner-24 direct fork, 2026-09-26/27) — #99 live fork test details
- Dispatch side PASS: COMPACT line `keep=30m tok=15916 computed` matches the
  independent DB replication (15,903; Δ13 = the fork turn) — no hidden minimum
  in computeKeepTokens (pure sum, fail-open).
- HOST side: the full 30-message tail retained RAW (raw 179KB ≈ 37-40k tokens;
  prefill 61k = ~20k system + ~37k retained + ~2k summary + new turns; first
  resumed-call DB input 60,877 ≈ backend 61,298) — the 15.9k token budget caused
  NO observable truncation → host retention = COUNT semantics; the "host
  retains the token budget, not the count" expectation (#99 wording) is NOT
  confirmed (structurally the budget always ≈ last-N content mass on the
  current interface, so it can only bind under a raw-part host metric — not
  observed). Summarizer step recorded as agent=compaction msg (input 32,507 ≈
  head text mass excl. tool outputs — his reading: summary over the whole
  context minus system + tool outputs).
- Follow-ups (queued, not started — ride the #99 deferred research): (a) N=10
  fork test (count → prefill ≈ 20k + ~20k raw last-10 (measured 89.5KB) + ~2k
  summary + ~2k new ≈ 44k; budget-bound → ≈ 20k + 4.7k content mass + ~2k +
  ~2k ≈ 29k), (b) summarize-body probe (scripts/log/summarize_intercept.cjs)
  to verify scope.
- His test file (the authority for the whole #99 live picture):
  `.opencode/maintainer/draft/compaction_guide/compaction_tests.md` — the test
  series concluding the body keep settings are NOT applied at all (opencode.json
  `compaction.keep.tokens` used for all; `keep.messages` ignored; floor
  25.8/25.9k = system + summary).
