# loop_log.ts — the looprun activity-log tool

T3 (iter-13, the loop-tool-batch part 3) + v2 (plan24; approved design `proposals/approved/2026-09-12_loop_log-v2.md`, parts A-D). Replaces the hand-formatted loop-log lines: the agent fires one call per event; the tool machine-stamps, appends, and CONFIRMS — no hand-formatting, no per-agent folder-permission management.

## What it does

Appends ONE machine-timestamped line to the current looprun's `loop_log.md` (auto-creates the dated `autorun-*` folder when `loop/` is empty) and CONFIRMS the write (reads the file back, byte-compares the last line).

## Implementation sketch

- Entry: `export default tool({ description, args, execute })`.
- The 8-char status tokens (the line's established vocabulary, byte-stable): `-->START`, `DONE<---`, `-RETURN-`, `-WARNING`, `--INFO--`, `CORRECT-`. The `status` arg is FREE-FORM — normalized (lowercase + strip non-alphanumerics) against the keywords in the order done/return/warn/info/start/correct (case/dash/arrow variants normalize — `restart` → START); NO keyword matched → an Error naming the accepted keywords, NOTHING written (no folder creation, no append; never a silent INFO fallback).
- The AUTO-FILL SLOTS (Part A — `role`/`model`/`session` all OPTIONAL; best-effort chains, first hit wins, else the literal `unknown` in the line, never throws): session ← args.session → context.sessionID → context.sessionId → context.session?.id; role ← args.role → context.agent; model ← args.model → context.agent (the agent-identifier preference) → context.extra.model.id.
- Folder resolution: `loop/` against `context.directory ?? process.cwd()`; NO `autorun-*` → create `autorun-<YYYY-MM-DD_HH-MM>` (MACHINE-COMPUTED from the local clock, never retyped — the AGENTS.md pattern-5 discipline); EXACTLY ONE → use it; SEVERAL → the most-recently-MODIFIED one + the anomaly surfaced in the return (NEVER silently resolved).
- Line format: `<date_time> <status> <role> <session|unknown> <model> <content>`.
- `CORRECT-` (Part D): a clarification line — the return also carries `corrects: <previous log line>` (byte-exact; the log's last line BEFORE this append).

## Gotchas / lessons

- APPEND-ONLY is absolute — the tool NEVER rewrites or curates the file (corrections are NEW lines, not edits).
- The write confirmation (Part B) returns `verified: readback-match` or `readback-MISMATCH: <actual last line>` — a mismatch is evidence; act on it.

## Tests

`tests/loop_log.smoke.mjs`.
