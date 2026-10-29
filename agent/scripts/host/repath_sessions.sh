#!/usr/bin/env bash
# repath_sessions.sh — rewrite OpenCode's session/path bindings after a repo
# folder rename or remote rename. Dry-run by default; --apply writes.
#
# Facts this script is built on (fork `packages/core/src/project.ts`):
#   - project.id = sha1("git-remote:<host.lowercase>/<path>") — the ORIGIN URL
#     decides the project row, not the folder name.
#   - session_v2.directory is an absolute path — a folder rename orphans
#     sessions; a remote rename orphans the whole project row.
#   - shell state dirs are keyed by project id.
#
# Usage (host STOPPED for --apply):
#   bash agent/scripts/host/repath_sessions.sh                 # dry-run
#   bash agent/scripts/host/repath_sessions.sh --apply
#   overrides: --db PATH --from-dir D --to-dir D --from-id ID --to-id ID
set -euo pipefail

DB="${OPENCODE_DB:-$HOME/.local/share/opencode/opencode.db}"
FROM_DIR="repo-root"
TO_DIR="repo-root"
FROM_ID="00ad292f31bafe388d67ea7213d6db8659767a11"   # git-remote:github.com/wasiejen/the estate (former name)
TO_ID="a80d10e672d6229fbb5e4a605c8e4a234c107b98"     # git-remote:github.com/wasiejen/agent-estate
APPLY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --apply) APPLY=1 ;;
    --db) DB="$2"; shift ;;
    --from-dir) FROM_DIR="$2"; shift ;;
    --to-dir) TO_DIR="$2"; shift ;;
    --from-id) FROM_ID="$2"; shift ;;
    --to-id) TO_ID="$2"; shift ;;
    *) echo "unknown arg: $1"; exit 2 ;;
  esac
  shift
done

[ -f "$DB" ] || { echo "DB not found: $DB"; exit 1; }

q() { sqlite3 -readonly "$DB" "$1"; }
w() { sqlite3 "$DB" "$1"; }

echo "db=$DB"
echo "dirs: $FROM_DIR -> $TO_DIR"
echo "ids:  $FROM_ID -> $TO_ID"

# Live-host guard: refuse --apply while the WAL is busy (the host writes there).
if [ "$APPLY" = "1" ] && [ -f "$DB-wal" ]; then
  wal_size=$(stat -c%s "$DB-wal" 2>/dev/null || echo 0)
  if [ "$wal_size" -gt 0 ]; then
    echo "REFUSE: $DB-wal is non-empty ($wal_size B) — stop the OpenCode host first."
    exit 1
  fi
fi

echo "== rows matching FROM_DIR:"
q "SELECT 'session_v2.directory', COUNT(*) FROM session_v2 WHERE directory LIKE '$FROM_DIR%';"
q "SELECT 'session_v2.path', COUNT(*) FROM session_v2 WHERE path LIKE '$FROM_DIR%';"
q "SELECT 'project_directory', COUNT(*) FROM project_directory WHERE directory LIKE '$FROM_DIR%';"
echo "== rows on FROM_ID:"
q "SELECT 'project', COUNT(*) FROM project WHERE id='$FROM_ID';"
q "SELECT 'session_v2.project_id', COUNT(*) FROM session_v2 WHERE project_id='$FROM_ID';"
q "SELECT 'worktree', COUNT(*) FROM worktree WHERE project_id='$FROM_ID';"

if [ "$APPLY" != "1" ]; then
  echo "DRY RUN — nothing written. Re-run with --apply after stopping the host."
  exit 0
fi

cp "$DB" "$DB.bak-$(date +%Y%m%d-%H%M%S)"
[ -f "$DB-wal" ] && cp "$DB-wal" "$DB-wal.bak-$(date +%Y%m%d-%H%M%S)" || true
echo "backup written"

w "UPDATE session_v2 SET directory=REPLACE(directory,'$FROM_DIR','$TO_DIR') WHERE directory LIKE '$FROM_DIR%';"
w "UPDATE session_v2 SET path=REPLACE(path,'$FROM_DIR','$TO_DIR') WHERE path LIKE '$FROM_DIR%';"
w "UPDATE project_directory SET directory=REPLACE(directory,'$FROM_DIR','$TO_DIR') WHERE directory LIKE '$FROM_DIR%';"
w "UPDATE OR IGNORE project_directory SET project_id='$TO_ID' WHERE project_id='$FROM_ID';"
w "DELETE FROM project_directory WHERE project_id='$FROM_ID';"
w "UPDATE OR IGNORE worktree SET project_id='$TO_ID' WHERE project_id='$FROM_ID';"
w "DELETE FROM worktree WHERE project_id='$FROM_ID';"
w "UPDATE session_v2 SET project_id='$TO_ID' WHERE project_id='$FROM_ID';"
w "UPDATE OR IGNORE project SET id='$TO_ID' WHERE id='$FROM_ID';"
w "DELETE FROM project WHERE id='$FROM_ID';"
w "UPDATE project SET worktree='$TO_DIR' WHERE id='$TO_ID';"

# shell state dir keyed by the old project id
SHELL_DIR="$HOME/.local/share/opencode/shell"
if [ -d "$SHELL_DIR/$FROM_ID" ]; then
  if [ -d "$SHELL_DIR/$TO_ID" ]; then
    cp -rn "$SHELL_DIR/$FROM_ID/." "$SHELL_DIR/$TO_ID/" && rm -rf "$SHELL_DIR/$FROM_ID"
  else
    mv "$SHELL_DIR/$FROM_ID" "$SHELL_DIR/$TO_ID"
  fi
  echo "shell state dir migrated"
fi

echo "== after:"
q "SELECT 'sessions on TO_ID', COUNT(*) FROM session_v2 WHERE project_id='$TO_ID';"
q "SELECT 'sessions on FROM_ID', COUNT(*) FROM session_v2 WHERE project_id='$FROM_ID';"
q "SELECT 'dirs still FROM_DIR', COUNT(*) FROM session_v2 WHERE directory LIKE '$FROM_DIR%';"
q "SELECT 'project row', id||' '||worktree FROM project WHERE id IN ('$FROM_ID','$TO_ID');"
echo "APPLIED. Start the host from $TO_DIR and open the old sessions."
