#!/usr/bin/env bash
# Consistent online backup of the SQLite database (safe while the app is running).
# Installed by setup-server.sh as /usr/local/bin/react-base-backup and run nightly by cron.
set -euo pipefail

DB="${DB:-/var/lib/react-base/app.db}"
DEST="${DEST:-/var/backups/react-base}"
KEEP_DAYS="${KEEP_DAYS:-14}"

[ -f "$DB" ] || { echo "No database at $DB yet"; exit 0; }
mkdir -p "$DEST"
FILE="$DEST/app-$(date -u +%Y%m%d-%H%M%S).db"
sqlite3 "$DB" ".backup '$FILE'"
gzip -f "$FILE"
find "$DEST" -name 'app-*.db.gz' -mtime +"$KEEP_DAYS" -delete
echo "$(date -u +%FT%TZ) backup ok: $FILE.gz"
