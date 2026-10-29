# tools/ — legacy v1 tool-file lane (all `.ts` deactivated, 2026-10-29)

Purpose: historical home of v1-format `export default tool({...})` modules.
Registration verdict (wake-15, TODO #240): NO loader exists in fork v2 core;
every live tool registers via its `.opencode/plugins/**` twin
(`ctx.tool.transform` + `editor.add`). All `.ts` files here were inert twins.

Allowed now: `README.md`, per-file `.md` docs (kept beside their deactivated
code), `deactivated/` holding the moved `.ts` twins + `dev/` test copies.
Excluded: new tool modules — write plugins instead (plugins lane is the only
registration path); reactivation needs a maintainer call.

Usage: twins live in `deactivated/` (provenance in dir README); the live code
is `../plugins/<same-name>.ts`. Do not measure these files as rendered bytes.
