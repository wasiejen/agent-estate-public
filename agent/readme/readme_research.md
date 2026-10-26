# readme_research.md — the research lane

Read when researching a topic and producing a comprehensive research doc or proposal.

The lane INVESTIGATES and RECOMMENDS. The maintainer DECIDES. It builds
nothing. `agent/research/README.md` binds the folder rules.
`agent/readme/readme_task_spec.md` is the shape reference for the phase
drafts. The intent source is `maintainer/ideas/ideas.md` lines 154-163
(read-only).

## When this lane runs
- The maintainer asks for an analysis of an idea: `maintainer/ideas/ideas.md`, or a file under `maintainer/inbox_*`.
- A delegable `TODO.md` entry asks for research (e.g. #173, #174).
- An idle-lane planner pass triages ideas — precedent: `agent/research/2026-10-26_ideas-disposition-map.md`.
- Skip the lane when the disposition map already answers the topic. Skip it
  too when the change is a small local fix.

## Phases

Run the phases in order. Commit after each one — an interrupted session loses at most one phase.

1. **Intent capture.** Record the topic. Record the maintainer's words
   verbatim. Record the one question the doc answers. Name the source file
   and line range.
2. **Check the record — no re-deriving.** Grep before you read:
   - `agent/research/2026-10-26_ideas-disposition-map.md` — read your topic's row first.
   - `agent/research/`, `agent/knowledge/`, `TODO.md` — grep the topic keywords, bounded (`head -30`).
   - A committed doc answers the question → cite it and research only the delta.
3. **Viability check in THIS build.** List what already exists: plugins,
   tools, prompts, pins, prior rulings. Cite each claim by full
   repo-relative path. Read the file before marking a claim verified. State
   what you did not verify.
4. **Bounded external search.** Fetch at most three sources. Distill each
   source immediately — a fetched page consumes the window. Check the gauge
   first (`ctx_gauge` tool, or `node .opencode/plugins/scripts/peek.mjs`).
   End the phase at `REM ≤ 20k` or ≥ 90% used (`AGENTS.md` §Context Budget).
   Keep 10–15k for the write-up. Never re-fetch a distilled source; record
   its URL and finding instead.
5. **Comprehensive overview doc.** Write one dated doc per
   `agent/research/README.md`. Cover: problem framing with short citations,
   reference design(s), options, cost (files, sessions, context), expected
   benefit, risks, a ranked recommendation, and a priority order. Start with
   `Session_ID:` and `Agent:` header lines. Build nothing.
6. **Phase drafts.** Split an approved build into ordered stages. Give each
   stage one spec, sized and shaped by `agent/readme/readme_task_spec.md`:
   one goal, measurable DoD, verified facts, a DO-NOT-touch list, under 100
   lines. Store the staged specs in the topic folder. Copy the launchable
   one to `agent/handover/handover_task.md`.

## History preservation — the topic folder

A topic that grows past one doc gets `agent/research/<topic>/`.

- `README.md` — states what goes in and what stays out. Worked convention: `agent/research/fuzzy-numword/README.md`.
- `decision-record.md` — the canonical decisions and their reasoning. Append new dated sections; never rewrite history.
- `drafting/` — the immutable record: the seed research doc, dated addenda, and the maintainer's feedback files (`FB_<date>_<slug>.md`). Corrections land in an addendum, never by editing the seed.
- `spec_R<n>_<name>.md` — one staged task spec per roadmap stage, launchable as-is.
- The folder points at the drafting record. It does not copy it.

## Output placement
- A dated research finding → `agent/research/YYYY-MM-DD_<topic>.md`.
- A procedure or convention → `agent/readme/readme_*.md`. Never inside `agent/research/`.
- A verified, actionable fact → `submit` with the `knowledge` arg; the curator moves it into `agent/knowledge/`.
- A loose finding → `submit` with the `todo` arg. A maintainer decision → a `TODO.md` entry.
- The short rule agents must follow belongs in `AGENTS.md` (maintainer paste).
  The folder keeps the detailed basis.

## Bounded reads
- Never read a large artifact whole. Take the heading skeleton (`grep -n "^#" | head -40`) and the head (`head -40`), then read only the cited sections.
- Session dumps under `archive/sessions/` are optional and expensive. Prefer committed artifacts. Use a dump only when the task spec allows it and a script narrows the range.
- Bound every initial search with `head -30` (`AGENTS.md` §Discovery and Adjacent Fixes).

## Worked example — the fuzzy-numword run

Read the minimum in this order. Every path is repo-relative.

1. `agent/research/fuzzy-numword/README.md` (23 lines) — the folder convention: decision-record canonical, staged `spec_R*.md` per stage, drafting record pointed at and not copied.
2. `agent/research/fuzzy-numword/drafting/2026-09-16_fuzzy-and-numword-tool-reliability.md` (564) — the seed. Heading skeleton plus the first 50 lines. Shows the shape: measured problem framing, feasibility marked "verified — do not re-derive", risks and non-recommendations, ranked options 5.1 prompt-rule → 5.2 scriptlet → 5.3 plugin, a one-shot live-host verification plan, a machine-checked source appendix, and a dated verdict appended at the end.
3. `agent/research/fuzzy-numword/drafting/2026-09-16_fuzzy-numword-addendum.md` (153) — the maintainer-comment review phase: per-comment rulings and their scope consequences. Head 60 lines.
4. `agent/research/fuzzy-numword/drafting/FB_2026-09-16_number-w2n-convention.md` (147) — his feedback file, `--comment` lines preserved as his input record. Head 60 lines.
5. `agent/research/fuzzy-numword/decision-record.md` (482) — the canonical record. Heading skeleton plus the first 40 lines. §5 carries the roadmap with each stage's gate result; §8.1/§8.2 show the LANDED-addendum pattern.
6. `agent/research/fuzzy-numword/spec_R1_read_scope_pair_resolution.md` — a staged spec: STATUS and design-source pointer, verified facts to build on, bounded scope.

The demonstrated flow: seed research → his comments → addendum rulings →
decision record → staged specs → one green commit per stage.
