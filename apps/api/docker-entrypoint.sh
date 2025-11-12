#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/apps/api
npx prisma migrate deploy

echo "Starting application..."
cd /app
exec "$@"
