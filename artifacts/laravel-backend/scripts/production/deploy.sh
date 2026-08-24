#!/usr/bin/env sh
set -eu

compose_file="${COMPOSE_FILE:-compose.production.yaml}"
base_url="${BASE_URL:?BASE_URL is required}"

docker compose -f "$compose_file" config --quiet
docker compose -f "$compose_file" run --rm app php artisan ops:production-check
COMPOSE_FILE="$compose_file" ./scripts/production/backup.sh
docker compose -f "$compose_file" up -d --remove-orphans --wait --wait-timeout 180
docker compose -f "$compose_file" exec -T app php artisan down --render="errors::503" || true
docker compose -f "$compose_file" exec -T app php artisan migrate --force --isolated
docker compose -f "$compose_file" exec -T app php artisan optimize
docker compose -f "$compose_file" exec -T app php artisan queue:restart
docker compose -f "$compose_file" restart ssr
docker compose -f "$compose_file" exec -T app php artisan up
BASE_URL="$base_url" ./scripts/production/smoke.sh

echo "Release ${RELEASE_TAG:-unknown} deployed successfully."
