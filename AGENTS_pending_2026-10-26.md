# AGENTS.md PENDING CHANGE (copy for the maintainer — he applies it himself)

## Proposed addition to §Command Output (append after the "Limit greps…" line)

**Custom tools via `execute` only.** Invoke this repo's custom tools/plugins
(`ctx_gauge`, `state_snapshot`, `loop_log`, `submit`, `block_transfer`,
`compact_memory`, `context_trim`) ONLY through the `execute` Code-Mode runtime
(`tools.<name>(...)`) — never as a direct top-level tool call. A tool call that
returns an EMPTY result is a FAILED call: the turn dies silently and no
observable effect is guaranteed. Verify the intended effect FROM FILES (log
tails, gauge self-read via `node .opencode/plugins/scripts/peek.mjs`), never
from the result slot; use the file/shell fallback when a tool returns empty.
(Host-side cause suspected: backend bug under maintainer tracking — TODO.md
#166 stays OPEN until that fix; then this block can be REMOVED as
single-source in this file.)

## Rationale (for his decision, not for the file)

- Maintainer ruling 2026-10-26: execute-only, placed ONLY here — role prompts
  would double the rule (his ruling 2026-10-26).
- Evidence: direct `ctx_gauge` empty ×2, `loop_log` empty ×1 (line absent in
  the log; hand-append fallback used), all 2026-10-26 plan33.
