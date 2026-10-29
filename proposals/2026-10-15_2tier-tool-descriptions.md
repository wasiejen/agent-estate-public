# Proposal: 2-tier tool descriptions (Tier 1 in prompt + `inspect_tool` Tier 2 on demand)

## Problem

The initial prompt of the post-rework planner session measured **23,040 starting
tokens** (maintainer, this session). Reconstructed from files and the installed
binary (chars / 3.5 ≈ tokens):

| Block | chars | ~tokens |
|---|---|---|
| Tool definitions, all 19 tools (descriptions + JSON schema) | ~48,000 | ~13.5k |
| AGENTS.md | 14,189 | ~3.8k |
| agent_planner.md | 12,678 | ~3.4k |
| destilled_mem.md | 6,040 | ~1.6k |
| env + references + skills + model line | ~3,000 | ~0.8k |

Tool definitions are the largest single block of the initial prompt. Custom tool
description sizes (measured, chars):

| Tool | Description |
|---|---|
| block_transfer | 7,896 |
| context_trim | 4,761 |
| compact_memory | 2,591 |
| submit | 2,161 |
| loop_log | 1,178 |
| state_snapshot | 928 |
| ctx_gauge | 907 |
| dev_get_tool_context_contents | 83 |
| session_info | 36 |

JSON arg descriptions add ~14k chars across all tools (e.g. `block_transfer`'s
`mode` arg alone is ~350 chars). The cost is paid at every prefill — session start
and every single-slot eviction re-prefill — even for tools the session never
uses.

**Design authority:** `agent/knowledge/plugin_tools/2026-09-18_tool-plugin-design-handout.md`
(especially §Description: the description is the only contract text read before
calling; §Return messages: errors teach).

## Rulings recorded (direct session 2026-10-15, this design exchange)

1. Scope: **our custom tools only** for now (the 9); built-ins are a later
   extension.
2. **submit** stays in-place: it fires at every session close, so tiering it is
   the breakeven case. It gets trimmed, not tiered.
3. **compact_memory + context_trim** are excluded from tiering until the planned
   two-tools-into-one consolidation lands (the consolidation doubles the
   description today; tiering both now would be rework).
4. **`inspect_tool` returns the whole manual at first.** Section returns are an
   optional unit (D).
5. **Tiering priority: block_transfer.**
6. Gating corrections: the **planner keeps block_transfer** (it moves/writes into
   TODO.md and operation files); **workers keep loop_log** (they use it).

## Design

The change is prompt-surface only: no `execute` behavior changes. It takes
effect after an opencode restart (tool descriptions load at session start).

### Unit A — `inspect_tool` + block_transfer tiering (priority)

1. New tool `.opencode/tools/inspect_tool.ts` (host names by filename,
   auto-detected — no config registration, cf. context_trim's precedent):
   - args: `name` (required, string).
   - Valid names = the `.opencode/tools/*.manual.md` files that exist
     (discovered at call time — no hardcoded list; new tiered tools appear
     automatically).
   - Returns the manual file content verbatim.
   - Errors teach: unknown name → error listing the valid tiered names;
     missing/empty manual file → error naming the path.
   - Own description ~200–250 chars, with trigger condition per the handout:
     "Returns the full manual of a tiered custom tool. Fire before the first
     call of that tool in a session: `inspect_tool({name:'block_transfer'})`."
2. `block_transfer` Tier 1 description (~700 chars, still carrying the handout
   checklist in compressed form): one-line purpose; when to use (multi-line
   block surgery across files/buffers); when NOT to (`edit` for small exact
   string replacements); the 11 mode names; the arg-name inventory; the core
   anchor rule (all-digit = 1-based line number, else short unique line prefix,
   leading whitespace ignored); one copy-pasteable example call; the Tier-2
   pointer ("call `inspect_tool('block_transfer')` before your first
   block_transfer call for full mode/anchor/return-line semantics").
3. Arg descriptions of `block_transfer` shrink to one-liners (full text moves
   into the manual). Current: description 7,896 + arg descriptions ~1,800.
   Target: ~700 + ~700.
4. Full manual in a new file `.opencode/tools/block_transfer.manual.md`
   (distinct from the existing developer doc `block_transfer.md`): the current
   full description, organized in `##` sections (modes / anchors / buffers /
   sandbox / return lines / errors). Sections are staged now; only Unit D wires
   them.
5. Smoke test `tests/inspect_tool.smoke.mjs`: verbatim return; unknown name →
   error listing valid names; missing manual → error. Existing block_transfer
   smokes (131/131 + sandbox 64/64) stay green unchanged.
6. The measurement script used for the inventory is committed as
   `agent/scripts/measure_tool_descs.mjs` so before/after numbers are
   reproducible.

### Unit B — trim the remaining custom descriptions in place (Tier 1, no pointer)

Trim to minimal-workable per the handout checklist (what / when / when-not /
one example / edge behavior); these stay self-contained (no inspect pointer):

- submit: 2,161 → ~1,200 (channel list + one-line semantics each; the
  memory-entry format details keep a pointer to `agent/memory/README.md`).
- loop_log: 1,178 → ~500 (status keywords + the one-line format).
- state_snapshot: 928 → ~600; ctx_gauge: 907 → ~500 (keep the lag warning).
- dev_get_tool_context_contents / session_info: leave as-is.
- context_trim + context_trim's sibling compact_memory: **deferred** with the
  consolidation (ruling 3).

### Unit C — per-agent tool gating (zero-cost, config only)

- worker/explorer agents: drop `state_snapshot` (planner-only by its own
  description) and `dev_get_tool_context_contents` (a dev tool).
- planner keeps block_transfer (ruling 6); workers keep loop_log (ruling 6).
- The exact `opencode.jsonc` snippet is drafted in the task spec; applying the
  registration is the maintainer's domain.

### Unit D (OPTIONAL) — section returns

- `inspect_tool` gains an optional `section` arg; the manual files already carry
  `##` sections from Unit A; the tool returns one section instead of the whole
  manual.
- Trigger to build it: a transcript where the whole block_transfer manual
  (~8k chars ≈ 2.3k tokens) visibly crowds the context in a session that only
  needed one mode.

### Deferred / out of scope

- Tiering compact_memory + context_trim after the two→one consolidation.
- Built-in tool descriptions (fork side: bash ~3.4k rendered, task 2.3k,
  todowrite 2.0k).
- System-text trimming (AGENTS.md, role prompts, memory) — separate track.

## Expected saving

| Unit | chars saved | ~tokens |
|---|---|---|
| A (block_transfer tiered) | ~8,300 | ~2.3k |
| B (trims) | ~4,000 | ~1.1k |
| C (gating, worker sessions) | ~1,300 | ~0.4k |
| **Total, planner session** | **~12,300** | **~3.5k ≈ 15% of the 23,040 start** |

The deferred pair (context_trim + compact_memory) adds ~2.5–3k tokens once the
consolidation settles.

## Acceptance

1. **Measurement:** before/after description+arg-description char sums via
   `agent/scripts/measure_tool_descs.mjs`; the numbers land in the worker
   summary and the implemented/ verdict.
2. **Session-start tokens:** the next fresh planner session's first-step input
   tokens vs the 23,040 baseline; expect ~19.5k ± 1k after A+B.
3. **New-hire gate (handout §Verify before done):** one held-out worker session
   doing a realistic multi-step block_transfer task with ONLY Tier 1 visible.
   Read the raw transcript: the first block_transfer call is correct, OR one
   cheap error → `inspect_tool` → correct retry (≤ 2 calls to success); no
   repeated error class; count `inspect_tool` calls per session (expect 0–1).
4. **Smokes:** `inspect_tool.smoke.mjs` green; block_transfer smokes unchanged
   (131/131 + 64/64); standard gate unchanged.
5. **Errors teach:** unknown-name and missing-manual errors return a usable
   example (smoke-pinned).

## Recommendation

Approve Units A + B + C now; hold D until a transcript shows the whole manual
crowding a context. A is the experiment that answers "does Tier 1 work well
enough" — B and C ride the same commit wave and are pure removal.

## Status

Awaiting maintainer approval.

## Re-baseline 2026-10-27 (post-2.2.0, post global `execute: deny`) — planner review notes

Gating status, so nobody re-pitches the timing: this was **not approved on
purpose** — the maintainer held it until the v2 migration finished, so a
tool-usage change could not interfere with the tools needed for the migration.
Nothing below touches that decision; it only re-bases the numbers.

Numbers that moved since 2026-10-15, all measured from `session_message`:
- First-request (fresh session) prompt tokens: worker with `execute` allowed
  **12,617** (2026-10-26, GyroM); worker with `execute` denied **19,215**
  (2026-10-27, IQ3S). The global deny therefore ADDED roughly +6.6k tokens of
  fixed prompt (confounded by destill + `AGENTS.md` growth between the two
  dates), because the 8 custom tools and the 8 `opencode_*` host tools are now
  injected natively instead of living behind the Code Mode catalog.
- The saving is paid **per re-prefill, not per session**: planner-36 logged 5
  requests with `cache.read=0` (full re-prefill) in one day. ~3.5k tokens saved
  times the bust count is the real value.
- Description prose re-measured in `.opencode/tools/` (template literals):
  block_transfer 9,951; context_trim 4,299; submit 2,161; loop_log 1,553;
  state_snapshot 943; ctx_gauge 679; dev_get_tool_context_contents 0;
  session_info 0 — total 19,586. Unit A's block_transfer estimate still holds
  (7,896 + ~1,800 arg text ≈ today's 9,951).
- Remove from the inventory: `session_info` no longer exists (probe `a0d86bc`
  measured it absent from the schema).

Adds:
1. **Unit C gains new targets** the 2026-10-15 text could not know about: the
   `opencode_*` host tools are now native per agent
   (`opencode_worktree_create|list|remove`, `opencode_session_move|rename`,
   `opencode_models`, the MCP resource readers). Workers need none of them, and
   dropping them is the same config-only trick.
2. **New coupling:** with `execute` denied, the Code Mode `search` discovery path
   is gone. Tier 1 is now the ONLY discovery contract, so the new-hire gate must
   run BEFORE a trim lands, not after — and it should use the dedicated `newhire`
   agent (see the idle-unit menu in `agent/orientation.md`).
3. **Ruling 3 needs a decision:** the compact_memory + context_trim consolidation
   never landed (12 days, still two tools), while the pair now costs ~2k tokens
   of always-injected prose. Either schedule the consolidation or tier the pair.
4. Unit A step 6 names `agent/scripts/measure_tool_descs.mjs`; that script was
   never created. Today's numbers came from a scratchpad script — land it with
   Unit A so the before/after is reproducible (and reusable by TODO).

## Update 2026-10-29 (wake-8, planner-38) — baseline refreshed, ranking available
Figures from `agent/research/2026-10-29_wake8-216-triage-183-ranking.md`: custom-tool
description literals ≈ 27.8 KB total (up from ≈13.2 KB at 2026-10-15); block_transfer
desc 13,249 B (9,384 main + 3,865 args); planner destill 19,999 B (MEM-0142 baseline
15.6 KB — condensation filed as TODO); AGENTS.md 18,154 B. `compact_memory` and
`session_info` are NOT in live tool lists (registration verdict pending — TODO),
so this table's compact_memory row is stale. Top-3 trim targets (one cold batch):
block_transfer prose −4.5 KB, planner destill −4–6 KB, context_trim −2 KB ≈
2.7–3.3k tokens/request. Ranking decision still maintainer's (orientation rule);
TODO stays the hygiene-pass vehicle.
