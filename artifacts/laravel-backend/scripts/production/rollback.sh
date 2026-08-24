#!/usr/bin/env sh
set -eu

previous_release="${1:?Usage: rollback.sh PREVIOUS_RELEASE_TAG}"
compose_file="${COMPOSE_FILE:-compose.production.yaml}"
base_url="${BASE_URL:?BASE_URL is required}"

export RELEASE_TAG="$previous_release"
docker compose -f "$compose_file" up -d --no-build app web queue scheduler ssr
docker compose -f "$compose_file" exec -T app php artisan optimize
docker compose -f "$compose_file" exec -T app php artisan queue:restart
BASE_URL="$base_url" ./scripts/production/smoke.sh

echo "Application rolled back to ${previous_release}. Database migrations were not reversed; use forward-fix policy."
