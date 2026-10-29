# Repo rename — drop the vendor name from the repo identity

Status: awaiting approval. Your note (2026-10-29): opencode discourages
direct vendor mentions to avoid confusion with their project.

## Intention
Keep the repo's identity about WHAT it is (the agent estate: protocol,
roles, loop, tools, memory) instead of naming the host product.

## Problem
- Repo folder + remote are `agent-estate`; the name appears in 117 tracked
  files (`grep -rl "agent-estate" *.md *.ts *.mjs *.jsonc` measured
  2026-10-29), including absolute paths used by plugins/tools and docs.
- The host itself is referenced functionally elsewhere (`opencode.jsonc`,
  `.opencode/` dirs) — those are host-mandated literals, NOT naming choices;
  they stay.

## Options
1. **RECOMMENDED — `agent-estate`** (folder + remote). Matches vocabulary
   already used here (`repo_overview.md` "the opencode agent bookkeeping",
   TODO "v1-estate removal"); short, no vendor token, no collision.
2. `agent-bookkeeping` — literal, less distinctive.
3. `selfmanaged-agents` — describes the trim/self-management angle, longer.
4. Keep the name until upstream complains (cheapest; you said it is
   discouraged, not forbidden).

## Execution parts (independently approvable)
- A. Remote rename on your host + local `git remote set-url` + folder rename
  (you run the folder move; agents adapt paths from there).
- B. Text sweep: replace `agent-estate` → new name in the 117 files, ONE
  commit, then re-run probe + smokes (they resolve paths from repo root
  dynamically — expected green).
- C. README note: state the naming rationale once (belongs in the new
  `README.md`, see inbox item).

## Acceptance
- `git remote -v` shows the new remote; `grep -r "agent-estate"` returns
  only historical/archive mentions; probe 115/115 + typecheck green; a fresh
  session starts clean from the new folder.

comment: accepted agent-estate — commited clean, pushed, renamed the remote (maintainer, 2026-10-29; marker converted per convention).

Planner note (2026-10-29, wake-18): remote URL updated in the working clone
and verified reachable; README naming note rewritten to the new name; LICENSE
(MIT) added per the maintainer's license ruling; the public-extract procedure
(pending local folder move + ~117-file text sweep) is documented in
`docs/public-extract.md`. Deviation: the acceptance grep-clean for
`agent-estate` is NOT met yet — it needs the folder rename + sweep.
