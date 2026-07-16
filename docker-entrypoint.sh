#!/bin/sh
set -e

DB_FILE=$(echo "$DATABASE_URL" | sed 's|^file:||')

sqlite3 "$DB_FILE" "CREATE TABLE IF NOT EXISTS __migrations (name TEXT PRIMARY KEY);"

fresh=$(sqlite3 "$DB_FILE" "SELECT count(*) FROM __migrations;" 2>/dev/null || echo 0)

if [ "$fresh" = "0" ]; then
	echo "Creating fresh database from schema..."
	sqlite3 "$DB_FILE" < /app/schema.sql
	for f in /app/drizzle/*.sql; do
		name=$(basename "$f")
		sqlite3 "$DB_FILE" "INSERT INTO __migrations (name) VALUES ('$name');"
	done
	echo "Schema initialized with all migrations marked applied."
else
	echo "Database already initialized."
	echo "Running pending migrations..."
	for f in /app/drizzle/*.sql; do
		name=$(basename "$f")
		if sqlite3 "$DB_FILE" "SELECT 1 FROM __migrations WHERE name = '$name';" | grep -q 1; then
			echo "  Skipping (already applied): $name"
		else
			echo "  Migration: $name"
			sqlite3 "$DB_FILE" < "$f"
			sqlite3 "$DB_FILE" "INSERT INTO __migrations (name) VALUES ('$name');"
		fi
	done
fi

echo "Migrations complete"

echo "Starting application..."
exec node build/index.js
