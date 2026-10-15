# Unported v1 plugins (inert on the `migration` branch)

These v1 plugin files (and their doc twins) are moved OUT of
`.opencode/plugin/` so the v2 host boots clean.

Mechanism (code-verified against the fork `home\Repos\opencode`
on `production`, v2.0.29 generation):

- v2 discovers local plugins from `.opencode/plugin/` and `.opencode/plugins/`
  only (`packages/core/src/plugin/source-directory.ts:5-33`): every `.ts` /
  `.js` file is a load target, every subdirectory is a target too, but a
  directory without a `server.ts` / `index.ts` entrypoint is dropped at
  scan time (`packages/core/src/config/plugin/source.ts:164-167`).
- Each file target is decoded against a default export that must be
  `{ id, setup }` or `{ id, effect }`
  (`packages/core/src/plugin/module.ts:78-91,125-133`). A v1 plugin's
  default export (the async factory returning a hooks object) and the
  core files' named-only exports both fail that decode — a
  `failed to load plugin` warning + a `failed` plugin state per file
  (`packages/core/src/plugin/supervisor.ts:59-91`). Not a crash, but not a
  clean boot.
- Sibling directories of `.opencode/plugin/` / `.opencode/plugins/` are NOT
  discovery targets. Moving the files to this folder removes them from the
  v2 boot entirely. The v1 loader (npm `opencode-ai`) does not load from
  here either, so the files are inert under both hosts.

Restoration: the v1-side reduction + dual merge (a LATER unit on the main
repo) decides the fate of each file. Nothing here is deleted.

Files (7 modules): `auto_resume.ts`, `compact_memory.ts`,
`compaction_core.ts`, `context_recovery.ts`, `ctx_watchdog.ts`,
`intercept_observer.ts`, `intercept_observer_core.ts` + their doc `.md`
twins. The task spec named 6 unported v1 plugin files; the measured top
level of the clone's `.opencode/plugin/` held 7 `.ts` modules (the 5
default-export plugins + the 2 imported core modules). All 7 were moved —
both core modules fail the v2 default-export decode too, so leaving them
would not be a clean boot.
