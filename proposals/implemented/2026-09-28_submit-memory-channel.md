# submit memory channel — close the knowledge-gain loop per role

**One idea:** extend the `submit` tool with a `memory` channel that appends
verified, role-relevant knowledge/experience straight into the agent role's
memory inbox (`memory/<role>/memory_inbox.md`) — completing the loop your
ideas.md "codify knowledge gain" block + 2026-09-23_00-20 describe (gain →
confirm → inbox → curation → retrieval feedback). Origin: agent_ideas.md
2026-09-28_01-22 idea (3) (from the maintainer ideas.md scan, plan28).

## Design (proposed, minimal v1)
- **New `memory` arg on `submit`** (`.opencode/tools/submit.ts`): same
  auto-stamp contract as the existing channels (`<date> <role> <session>` —
  role/session from the tool context, never agent-supplied), append-only,
  several channels fireable in one call (an empty string is still "skip
  this channel").
- **Target:** `.opencode/agent/memory/<role>/memory_inbox.md`, role = the
  context.agent prefix before the first `_` (`planner_Q3S_245K_slow` →
  `planner`, `worker_Q3S_245K_slow` → `worker`; fallback `agent` when
  absent). The inbox file is auto-created with a one-line purpose header;
  the role FOLDER is NOT created (seeding `memory.md` / `destilled_mem.md` /
  README stays the curation lane — the #56 per-role distill rework owns the
  folder layout).
- **Entry format** = the other submit channels verbatim:
  `### <YYYY-MM-DD_HH-MM> <role> <session>` + raw text.
- **Curation:** the role's memory README (write/review policy, per
  `memory/template/README.md`) gains one line — inbox entries are cured
  into `memory.md` (full entry) + `destilled_mem.md` (one-liner) at the
  maintenance pass, then the inbox line is marked cured (the same inbox-
 then-cure rhythm as `knowledge_inbox.md`).
- **Retrieval feedback:** v1 keeps it FREE-FORM (an entry can say "used
  MEM-XXXX today — confirmed / misled / stale" in its text); a structured
  `mem:use` token only if curation shows a real need (avoid building a
  query surface before the first curation run).
- **Prompt text** (planner text-work, post-approval): a short
  "memory channel" bullet in the role prompts distinguishing the two
  channels — `submit(knowledge=...)` = repo-general fact (the shared
  knowledge inbox), `submit(memory=...)` = role-scoped experience/procedure
  (this role's memory inbox).

## Where it plugs in (no new machinery)
- The tool is already registered in the live config; adding an arg is a
  code change only (no `opencode.jsonc` edit — your domain untouched).
- Re-pins: the submit smoke gains the new-channel checks (stamp + append +
  skip-on-empty + the role-prefix resolution); the probe is unaffected
  unless you want a pin — my recommendation: smoke only (the submit smoke
  already pins the channel surface).

## Recommendation
Build as a SMALL unit (est. ~0.5 day wall: ~30 tool lines + smoke re-pin +
prompt bullet + memory README line + a knowledge one-liner). Pre-approved
class (agent-usage friction/bookkeeping), but it adds a tool surface +
prompt text — hence this proposal.

## Decisions for you (ordered by priority)
1. **GO** — and the role-prefix target convention above (vs a single
   shared inbox).
2. **v1 free-form** (recommended) vs a structured retrieval-feedback
   token now.
3. **Missing role folder** — inbox-file-only (recommended, curation seeds
   the folder) vs tool-created folder + README stub.

## Open notes (no decision needed)
- Worker-role memory folders don't exist yet (`memory/worker/` is absent) —
  the first worker `submit(memory=...)` fires into a non-existent folder
  per the recommendation: the tool creates the FILE only; the #56 rework
  seeds the rest when it lifts.
- This does not touch the `knowledge` channel or the knowledge base
  (separate lane, separate curation).

comment 2026-09-29_19-20:
as long as in the description is enough information to actually create a valid and helpful memory then go ahead. keep in mind the agent\knowledge\plugin_tools\2026-09-18_tool-plugin-design-handout.md.
- optimize when potential is seen

1. go
2. to form a valid memory according to the format of the memory.md as least some guideline need to be in the description of the memory submit tool part. see comment above - not overboarding with detailed instruction but enough to have the most important parts to make it a reliable memory
3. inbox file and folder created when not already existing.

## Verdict (moved to implemented/ 2026-09-29, direct session ses_f11b625d3ffeio02fDzjzypbN2)
LANDED 2026-09-29 (planner-direct, per his 19-20 comment: GO + the three
decisions): `memory` arg on `submit` (`.opencode/tools/submit.ts`) — target
`agent/memory/<role>/memory_inbox.md` (`<role>` = the context.agent prefix
before the first `_`, fallback `agent`), the inbox FILE + role FOLDER
auto-created (his ruling 3), same stamp/append/return contract as the other
channels (block order feedback/knowledge/todo/ideas/memory); the format
guideline (one concise self-contained statement + type / confidence / scope /
evidence locator / review trigger — not overboard, per his ruling 2) lives in
the tool description + the memory README, not the prompts. Pins: submit smoke
23 → 31 (new (H)/(H2)/(H3)/(H4) role-prefix + fallback + append-only pins +
5-channel multi-param), probe S22 re-pins only (arg list / arg schema /
no-params string — no new probe check per the proposal's recommendation).
Prompt bullets (planner/worker/explorer friction sections) + the memory
README curation lines (inbox cured into memory.md + destilled_mem.md at the
maintenance pass) + the knowledge one-liner. Gate: submit smoke 31/31,
compact_memory 80/80 (the #119 pins ride the same session), probe = 335 PASS +
11 #113 env, all 10 smokes green. Commit hash: the same commit that carries
this move (no self-reference).
