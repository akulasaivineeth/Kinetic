#!/usr/bin/env bash
# Dump production Postgres via Supabase CLI (same approach as GitHub Actions).
# Usage:
#   export PRODUCTION_SUPABASE_DB_URL='postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres'
#   npm run db:backup:prod
#
# Get the URI from Supabase → Project Settings → Database → Connection string (URI, Direct).
# Do not leave the literal [YOUR-PASSWORD] in the string — use your real DB password (URI-encoded if needed).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${PRODUCTION_SUPABASE_DB_URL:-}" ]]; then
  echo "Set PRODUCTION_SUPABASE_DB_URL to your production database URI (direct connection, port 5432)." >&2
  exit 1
fi
if echo "$PRODUCTION_SUPABASE_DB_URL" | grep -qiE '\[YOUR-PASSWORD\]|YOUR-PASSWORD'; then
  echo "PRODUCTION_SUPABASE_DB_URL still contains placeholder [YOUR-PASSWORD]. Paste the real URI from Supabase." >&2
  exit 1
fi

RAW="$PRODUCTION_SUPABASE_DB_URL"
DB_URL="$RAW"
if [[ "$DB_URL" != *"sslmode="* ]]; then
  if [[ "$DB_URL" == *"?"* ]]; then
    DB_URL="${DB_URL}&sslmode=require"
  else
    DB_URL="${DB_URL}?sslmode=require"
  fi
fi

OUT_DIR="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$OUT_DIR/run-$STAMP"
mkdir -p "$RUN_DIR"

echo "Dumping to $RUN_DIR ..."

npx supabase db dump --db-url "$DB_URL" -f "$RUN_DIR/roles.sql" --role-only
npx supabase db dump --db-url "$DB_URL" -f "$RUN_DIR/schema.sql"
npx supabase db dump --db-url "$DB_URL" -f "$RUN_DIR/data.sql" --data-only --use-copy

(
  cd "$OUT_DIR"
  tar -czf "kinetic-prod-${STAMP}.tar.gz" "run-$STAMP"
  rm -rf "run-$STAMP"
)

echo "Done: $OUT_DIR/kinetic-prod-${STAMP}.tar.gz"
