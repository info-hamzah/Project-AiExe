#!/bin/sh
# Ordered, once-only SQL migration runner (tracks applied files in schema_migrations).
set -e
psql -v ON_ERROR_STOP=1 -q -c "CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());"
for f in $(ls /migrations/*.sql | sort); do
  name=$(basename "$f")
  applied=$(psql -tA -c "SELECT 1 FROM schema_migrations WHERE filename = '$name'")
  if [ "$applied" = "1" ]; then
    echo "skip  $name"
  else
    echo "apply $name"
    psql -v ON_ERROR_STOP=1 -q -f "$f"
    psql -q -c "INSERT INTO schema_migrations (filename) VALUES ('$name');"
  fi
done
echo "migrations complete"
