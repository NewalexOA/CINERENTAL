#!/bin/bash
set -e

# Install PostgreSQL client if not installed
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL client..."
    apt-get update -qq
    apt-get install -y --no-install-recommends postgresql-client
fi

# Check if required services are running
if ! nc -z test-db 5432 &> /dev/null; then
    echo "ERROR: test-db service is not available. Run tests using docker-compose.test.yml:"
    echo "docker compose -f docker-compose.test.yml run --rm test [test_path/and_options]"
    exit 1
fi

if ! nc -z test-redis 6379 &> /dev/null; then
    echo "ERROR: test-redis service is not available. Run tests using docker-compose.test.yml:"
    echo "docker compose -f docker-compose.test.yml run --rm test [test_path/and_options]"
    exit 1
fi

# Wait for database to be ready
echo "Waiting for PostgreSQL..."
until nc -z test-db 5432; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done
echo "PostgreSQL is up"

# Wait for Redis to be ready
echo "Waiting for Redis..."
until nc -z test-redis 6379; do
  echo "Redis is unavailable - sleeping"
  sleep 1
done
echo "Redis is up"

# Apply migrations
echo "Running migrations..."
export PYTHONPATH=/app
alembic upgrade head

# Run tests with coverage report generation
pytest --cov=backend --cov-report=html:htmlcov --cov-report=term-missing ${@:-tests/}
