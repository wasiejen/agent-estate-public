# plan29 summary (autorun-2026-09-21_15-33, iter 29)

Session `ses_f1aacd085ffeRONA7LZvTViDgw`, planner-29,
Qwen3.8-27B-Q3S-245K-slow. Unit-4 restart branch (after planner-28
`action: restart`). No compactions this session.

## What was done

Pre-approved friction batch, planner-direct (TRIAGE: the small
plan28-filed items #107/#108/#111 finished as one coherent unit; the
#105 (c)/(d) research delegations queued for iter 30, where the
counter-triggered maintenance pass also runs):

1. **#107 LANDED** (7c91ecc) — the DUMP-OK / DUMP-RETRY= / DUMP-FAIL
   ctx.log lines now carry the FULL repo-relative dump path
   (`.opencode/archive/sessions/` + name) so a live acceptance is a
   single `ls`. The `DUMP_ARCHIVE_REL` constant is shared with the
   archive-dir join; the spawn's `--out` keeps the corpus-relative name
   (the script's OUT_DIR-relative arg — unchanged). The COMPACT line
   names no file path (checked — unchanged). Pins: probe S14 check 104
   (4 `includes()`) + S25 check 255 (regex + label) + the compact_memory
   smoke's two DUMP-OK pins (md + json). Measured: compact_memory smoke
   78/78; probe all green except the 11 pre-existing environmental
   failures (see #113).
2. **#108 LANDED** (c0f96b8) — the #96 (c) trim-restore fixture's 10
   pairs are now generated PROGRAMMATICALLY in the child script
   (`L(i) = charCode 97+i` + `Array.from({length: 10})` — the same
   pattern the cap-config sibling already carried) + a PAIR-COUNT
   assert (`pairCount !== 10` → `PAIR_COUNT <n>` + non-zero exit BEFORE
   the log is seeded — a dropped pair fails instantly with the count).
   The sibling multi-pair fixture was already programmatic; no other
   hand-typed pair blocks exist (grep-verified). Measured: auto_resume
   smoke 140/140.
3. **#111 LANDED** (03a1fc6, no behavior change) — (1) worker prompt
   `Checkpoint & handoff` gains the commit-message worked example
   (subject + ≤~3 body lines; the hash NEVER in the commit — `LANDED`
   (hash recorded in the planner's follow-up bookkeeping commit), the
   spec doc's hash DoD rule); (2) `repo_testgate.md` gains the
   `node --check .opencode/plugin/probes/handover_probe.mjs` line
   (before the gate after each probe edit batch); (3) the intercept
   smoke header names the MODULE-STATE FLIP convention ((12f) second
   factory re-points the shared module state to proj2 — from (12f) on
   only `before2`/`read2` may be used).
4. **TODO #113 FILED** (9a12594) — ENVIRONMENT break, maintainer call:
   the repo venv's `python.exe` is broken — `pyvenv.cfg` points at
   `home\Projects\OpenCodeProjects\Free-Snap-Tap\python312`
   (one level ABOVE the repo root), whose `python.exe` is ABSENT (the
   dir holds only `Doc`). Measured: `./.venv/Scripts/python.exe -c
   "print(...)"` fails; the probe's 11 numword-python checks (136-146)
   all fail with `No Python at '...python312\python.exe'`; the standard
   gate's pytest half is UNRUNNABLE (the venv is the only python with
   the repo deps). The 2026-09-27 baselines predate the break.

## Baselines

- auto_resume smoke **140/140** (was recorded 139 — the 3914181
  cap-config check added one; the Standing baseline corrected).
- compact_memory smoke 78/78 (re-pinned for #107).
- probe: all checks green EXCEPT the 11 environmental numword-python
  failures (136-146, #113) — the re-pinned S14/S25 checks pass; the
  self-annotated total is unchanged (345).
- pytest: UNRUNNABLE this session (#113) — no Python code was touched
  by this batch (plugins + tests + docs only); no regression possible
  from this change set, re-baseline on the next green gate.
- ruff: not run (the venv python is broken — #113); no TS/JS lint
  concern from doc/comment changes, and `node --check` passed on all
  touched JS files.

## Open / next

- **#113 (MAINTAINER CALL):** fix the venv / base python, then a full
  standard-gate re-run to re-establish the baselines.
- **#105 remaining:** (c) v2 main-branch identification + hardening
  plan, (d) compaction-summary customization (both explorer-shaped
  research — queued for iter 30 after the maintenance pass), (e)
  explorer/researcher makeover (his opencode.jsonc write-access
  tightening pending — his domain).
- **Fork decision (from #105 (b)):** the maintainer either does the
  Phase 1-3 build+swap (~3-5 h, his domain) or falls back to config-
  only (the plugin's `tok=` stays advisory).
- **#106 / #109 / #110 / #112** (plan28-filed queue) — next iterations.
- Stale-header curation candidates for the iter-30 pass: #70 (status
  text all landed; header still `OPEN`), #78 (LANDED 2026-09-23,
  header `open`), #97 (LANDED + LIVE-ACCEPTED, header `open`), the
  four implemented proposals left in `proposals/approved/`.
- Maintainer pending: none new (the `AGENTS_pending_2026-09-27.md`
  copy was consumed — the live AGENTS.md carries the #103 gauge
  wording, verified in the loaded context + 643ca2a).

## Friction

One: the venv/python312 break cost a failure-triage detour in the gate
run (11 identical probe failures to attribute) — recorded in TODO
#113 + a feedback entry. No protocol/tool friction this session.
