#!/usr/bin/env sh
set -eu

if [ "${CONFIRM_RESTORE:-}" != "RESTORE" ]; then
  echo "Refusing restore. Set CONFIRM_RESTORE=RESTORE after verifying the target environment." >&2
  exit 2
fi

backup_file="${1:?Usage: restore.sh path/to/backup.sql.gz}"
compose_file="${COMPOSE_FILE:-compose.production.yaml}"

test -f "$backup_file"
test -f "${backup_file}.sha256"
sha256sum -c "${backup_file}.sha256"
gzip -t "$backup_file"

gzip -dc "$backup_file" | docker compose -f "$compose_file" exec -T mysql sh -c \
  'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'

docker compose -f "$compose_file" exec -T app php artisan migrate:status
echo "Restore completed and migration state verified."
