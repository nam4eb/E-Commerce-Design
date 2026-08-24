#!/usr/bin/env sh
set -eu

compose_file="${COMPOSE_FILE:-compose.production.yaml}"
backup_dir="${BACKUP_DIR:-./backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${backup_dir}/dienmay365-${timestamp}.sql.gz"

mkdir -p "$backup_dir"
docker compose -f "$compose_file" exec -T mysql sh -c \
  'exec mysqldump --single-transaction --quick --routines --triggers -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip > "$backup_file"

gzip -t "$backup_file"
test -s "$backup_file"
sha256sum "$backup_file" > "${backup_file}.sha256"
printf '%s\n' "$backup_file"
