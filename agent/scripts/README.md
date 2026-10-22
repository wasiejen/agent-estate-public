# agent/scripts

Curated, documented, tested helper scripts for agents — REUSE these instead
of re-deriving throwaway one-shots. Plain node (v24, built-in
`node:sqlite`/`node:fs`, no deps). Machine-specific paths are env-overridable
with the current host value as default, and DB/log access is READ-ONLY.

Adapt, don't edit: if you need a variant, COPY the script first (maintainer
ruling, `analyse_helper_scripts.md`).

## Categories

- [`binary/`](binary/README.md) — string search in big binaries (needle windows,
  offsets, hit lists) without reading the binary into context.
- [`db/`](db/README.md) — read-only inspectors for the live opencode DB
  (schema, sessions, message slim dumps, compaction summary, corpus dump).
- [`git/`](git/README.md) — cross-tree git helpers: `port_sync.cjs` merges MAIN's
  `main` into the v2 clone's `migration` (dry-run default + zero-mutation proof;
  `--apply` stages only, gate-verified, never commits) and
  `port_sync.selftest.cjs` (scratchpad repo pair, `SELFTEST: ALL PASS`).
- [`log/`](log/README.md) — bounded context windows around needle lines in big logs.
- [`numword/`](numword/) — word→digit for dense-number hygiene (lane 5.2): ONE
  shared `numwords.json` map read by both entry points — `numword.cjs` (node CLI
  + module: `w2n`, `numword_check`, CLI `check` subcommand) and `w2n.py`
  (python twin, same grammar; unknown input → loud, never a guess).

Env overrides: `OPENCODE_EXE`, `OPENCODE_DB`, `OPENCODE_LOG`
(see each category README).

Machine-path single source of truth (#125, the #86 audit doc-only
finding): each standalone CLI carries its default inline
(`process.env.X || "<host value>"`) — the constants are DELIBERATELY
duplicated per script (each script must stay standalone-runnable; no
shared .cjs helper). The current host values: `OPENCODE_DB` =
`home/.local/share/opencode/opencode.db` (canonical form:
`DEFAULT_DB_PATH` in `.opencode/plugin/scripts/gauge.mjs`, derived from
`os.homedir()`) and `OPENCODE_EXE` =
`home/AppData/Roaming/npm/node_modules/opencode-ai/bin/opencode.exe`.

## grep_snippets.md

[grep_snippets.md](grep_snippets.md) — ready-made, output-limited
grep/navigation commands for big files/folders (incl. the maintainer-marker
sweep).

## Scratchpad inventory

[INVENTORY.md](INVENTORY.md) — the machine-generated inventory of the
scratchpad (`~\AppData\Local\Temp\opencode\`) the collection was curated
from: file list + one-line purpose. Originals are NOT deleted (maintainer's
call).

## Dump before compaction

When the context gauge hits ~85-90% or just before `compact_memory`, dump the
current session (id from your `ctx:` line) so the fine-grained context that
compaction destroys is preserved in the corpus:
`node agent/scripts/db/dump_session.cjs <sessionID>`
