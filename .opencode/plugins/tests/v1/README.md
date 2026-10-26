# tests/v1 — smokes for the custom tools (plain-node harness)

Relocated 2026-10-26 (#150 unit B) from the deleted v1 estate
(`.opencode/plugin/tests/`); the files here test the SURVIVING subjects only.

Purpose: one smoke file per tested tool, same stem as the tool (behavior
suffix where two anchors exist). Run each from the repo root with plain
`node` (v24, type-stripping): `node .opencode/plugins/tests/v1/<file>.smoke.mjs`
— exit 0 iff all checks pass. Use `node`, NOT `bun` (TODO #160: the bun
teardown EBUSY flake hits this suite). Shared boilerplate (repo-root
resolution, type-stripped import, sandbox setup, assert/fail-count) lives in
`_smoke_base.mjs` — do not copy-paste it into new smokes.

What goes here: behavior smokes for the tools in `.opencode/tools/`, and the
gauge core (`.opencode/plugins/scripts/gauge.mjs`). Runtime fixture files are
created under the host scratchpad `home/AppData/Local/Temp/opencode/`
(each smoke in its own subdir, cleaned on start) — that hardcoded path is
deliberate (runtime sandbox, not a source path); no absolute SOURCE path
belongs here.

What does NOT go here: the v2 plugin smokes (parent folder
`.opencode/plugins/tests` — `bun run` from there), `probes/` (the gate probe,
`.opencode/plugins/probes/handover_probe.mjs`), and anything that touches the
live loop folder `loop/` or the live `opencode.jsonc` (smokes sandbox instead).
New smokes need a green run before commit.
