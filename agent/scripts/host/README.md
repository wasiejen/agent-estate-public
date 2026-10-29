# host/ — maintainer-run scripts for this machine (outside the agent sandbox)

Purpose: scripts the AGENT cannot run itself (host state, live DB), handed to
the maintainer to execute.
Allowed: read-only probes and explicitly owner-gated writes (backup first,
refuse while the host runs). Current: `repath_sessions.sh` — rewrites
OpenCode's session/path bindings after a folder or remote rename.
Excluded: anything the agent can run natively (that is `agent/scripts/`);
destructive ops without a backup.
Usage: run manually with the OpenCode host STOPPED; dry-run first. Derivation
facts are documented in the script header (fork `project.ts`).
