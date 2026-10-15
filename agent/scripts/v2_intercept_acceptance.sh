#!/usr/bin/env bash
# v2_intercept_acceptance.sh — LIVE acceptance for the v2 intercept
# observer (Unit A, TODO #137). MAINTAINER-RUN only: the worker never runs
# the clone's opencode (task boundary).
#
# Run (the script cd's to the clone root itself):
#   bash agent/scripts/v2_intercept_acceptance.sh
#
# What it does:
#   1. Ensures the fixture agent/scripts/v2_intercept/acceptance/file-4.txt
#      exists (the existing twin of the mistyped file-f4.txt). It NEVER
#      creates file-f4.txt — that path must stay missing for the near-miss.
#   2. Starts ONE scripted v2 session (`opencode run --auto`) that is told
#      to make exactly two tool calls:
#        a. read  agent/scripts/v2_intercept/acceptance/file-f4.txt
#           -> expected: ONE `fuzzy-resolved` log line (d=1); the read
#            SUCCEEDS against the corrected path.
#        b. write home/Repos/v2-accept-missing-dir/x.txt
#           -> expected: ONE `out-of-sandbox` note line + ONE
#            `intercept-error` line (the B' hard-stop); the write FAILS.
#   3. Prints the NEW .opencode/temp/intercept.log lines from the run.
#
# Notes:
#   - `opencode` must be the installed v2 binary on PATH.
#   - The first v2 run against the default data dir migrates the live
#     opencode.db (research doc 2026-10-15_opencode-v2-impact.md sec. 6) —
#     point the v2 data dir at a copy first if that matters.
#   - `--auto` auto-approves permissions not explicitly denied. The B'
#     hard-stop fires in the execute.before hook, BEFORE the permission
#     gate, so the blocked write fails regardless of `--auto`.
#   - The B' target is outside every allowed root in opencode.jsonc
#     (workspace + scratchpad + external_directory allows) and its
#     containing directory does not exist — the B' condition.

set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 1

FIX_DIR="agent/scripts/v2_intercept/acceptance"
mkdir -p "$FIX_DIR"
if [ ! -f "$FIX_DIR/file-4.txt" ]; then
  printf 'NEAR-MISS TWIN\n' > "$FIX_DIR/file-4.txt"
fi

LOG=".opencode/temp/intercept.log"
mkdir -p ".opencode/temp"
before=0
[ -f "$LOG" ] && before=$(wc -l < "$LOG")

opencode run --auto "Make exactly these two tool calls, in this order, and no other tools:
1) Call the read tool with path agent/scripts/v2_intercept/acceptance/file-f4.txt
2) Call the write tool with path home/Repos/v2-accept-missing-dir/x.txt and content test
After the two calls, report one line per call: succeeded or failed."

after=0
[ -f "$LOG" ] && after=$(wc -l < "$LOG")
echo
echo "--- new intercept.log lines ($before -> $after) ---"
if [ "$after" -gt "$before" ]; then
  tail -n +"$((before + 1))" "$LOG"
else
  echo "(no new lines)"
fi
echo "--- expected ---"
echo "1x fuzzy-resolved   (read near-miss file-f4.txt -> file-4.txt, d=1)"
echo "1x out-of-sandbox   (the write span, note only)"
echo "1x intercept-error  (the B' hard-stop on the write)"
