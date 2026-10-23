# scripts/log — dense-content helpers for big log files

Print bounded context windows around needle lines in multi-MB logs WITHOUT
reading the log into agent context.

**log resolution:** env `OPENCODE_LOG` > host default
`home/.local/share/opencode/log/opencode.log`.

| script | what it does | tested (from repo root) |
|---|---|---|
| `logctx.cjs` | for each needle line: a +/-3-line window, each line truncated to 380 chars, hits capped | 2026-09-15: `node agent/scripts/log/logctx.cjs` → `=== HIT at line 46904 (hit 1) ===` + `total "schema rejection" lines: 20 of 64193`, exit 0 |
| `summarize_intercept.cjs` | turns the fuzzy-numword intercept log into a 6-section evidence summary (R4 flywheel: verdict counts, fuzzy-rejected d/gap, redundancy-mismatch verbatim, adder-form usage, out-of-sandbox by path prefix, per-session counts); generic — no hardcoded counts/session ids | 2026-09-23: `node agent/scripts/log/tests/summarize_intercept.smoke.cjs` → fixture run byte-exact vs `tests/expected_summary.txt`, all checks passed, exit 0; real log → 6 sections, exit 0 |
| `intercept_sweep.cjs` | the PER-EVENT counterpart of that summary on the same log: the last N events (default 20), filtered by `--session=` / `--verdict=` / `--grep=` (case-insensitive substrings; verdict matches ANY trailing token, never only the frozen list), ONE ≤120-char line per event — the long args-json and evidence fields truncated with a visible `…` marker | 2026-10-22: `node agent/scripts/log/tests/intercept_sweep.smoke.cjs` → 35 checks PASS (fixture `intercept_sweep_fixture.log`, 24 events, 1 malformed), exit 0; live log (5693 events) → default / `--session=` / `--verdict=` views exit 0, max line 120 |

Usage (one each):

```
node agent/scripts/log/logctx.cjs                       # default needle "schema rejection", cap 20
node agent/scripts/log/logctx.cjs "provider error" 5    # custom needle, cap 5
OPENCODE_LOG=C:/path/to.log node agent/scripts/log/logctx.cjs ERROR

node agent/scripts/log/summarize_intercept.cjs          # default .opencode/temp/intercept.log
node agent/scripts/log/summarize_intercept.cjs <logfile>
node agent/scripts/log/intercept_sweep.cjs --verdict=edit-hint --lines=8    # per-event view, <=120 chars per event
node agent/scripts/log/intercept_sweep.cjs --session=ses_e9b4 --grep=oldString   # both filters at once, default last 20
```

The `maxHits` cap (default 20) plus the per-line 380-char truncation keep the
output bounded even when a needle is common.

`summarize_intercept.cjs` reads the R7 observer log (NOT the `OPENCODE_LOG`
host log) and never writes; its committed fixture + pinned smoke test live
under `tests/` (`intercept_fixture.log`, `expected_summary.txt`,
`summarize_intercept.smoke.cjs` — run the smoke with plain node, exit 0 iff
green).
