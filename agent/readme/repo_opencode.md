# repo_opencode — opencode host specifics (need-to-know index)

Keep this file an INDEX: short facts plus pointers, no copies.
Details live under `agent/knowledge/`: the `opencode-plugins/` deep-dives
plus the area files. Read those on need-to-know.

## Host paths
- Log: `home\.local\share\opencode\log\opencode.log`
- npm install (opencode CLI): `home\AppData\Roaming\npm`
- SDK type defs (installed): `.opencode\node_modules\@opencode-ai\sdk\dist\gen\`.
  types.gen.d.ts = the `Event` union + the error classes. Plugin hooks live
  in `@opencode-ai/plugin` dist/index.d.ts; they are notification-only:
  `event?: (input: {
  Event }) => Promise<void>`.
- Live config: `opencode.jsonc` (repo root). It holds the agent roster,
  permissions, and the compaction defaults block. The maintainer LIVE-edits
  it. Verify the roster before a delegation. Never stage or flag his live files.

## Plugins (ours)
- The host auto-loads `.opencode/plugins/*.ts`. opencode.jsonc has NO
  registration key — measured: zero `plugin` hits in the file. The folder IS
  the registration: moving a file in or out of `deactivated/` activates or
  deactivates it.
- Smokes: `.opencode/plugins/tests/`. The probe:
  `.opencode/plugins/probes/handover_probe.mjs`.

## Behavior index (pointers, need-to-know)
- Plugin architecture + v1 SDK shapes: the `{ data }` unwrap, the
  `summarize` vs `compact` client surface, the `Event` union. Deep-dives:
  `agent/knowledge/opencode-plugins/` (surface report + A/B/C) +
  `agent/knowledge/knowledge_tools.md`.
- Compaction mechanics: budgets, keep, dumps, the auto-resume interplay.
  Docs: AGENTS.md `# Compaction Guidelines` +
  `maintainer/draft/archive/compaction_guide/full_guide.md`.
- auto_resume internals: units, scope, the spawn/restart path. Docs: TODO
  #75/#85/#90/#91 + `knowledge/opencode-plugins/auto-resume-*`.
- The single backend slot: NEVER launch raw inference-server requests.
  Route all model traffic through opencode sessions (`agent/knowledge/knowledge_tools.md`).

## Online Source Code of Opencode (as reference - may be not the same version as host install)
- Reference source of the session engine: `https://github.com/anomalyco/opencode/tree/dev/packages/opencode/src/session`
