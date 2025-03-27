#!/bin/bash
set -e

# Install PostgreSQL client if not installed
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL client..."
    apt-get update -qq
    apt-get install -y --no-install-recommends postgresql-client
fi

# Check if required services are running
if ! nc -z test_db 5432 &> /dev/null; then
    echo "ERROR: test_db service is not available. Run tests using docker-compose.test.yml:"
    echo "docker compose -f docker-compose.test.yml run --rm test [test_path/and_options]"
    exit 1
fi

if ! nc -z redis 6379 &> /dev/null; then
    echo "ERROR: redis service is not available. Run tests using docker-compose.test.yml:"
    echo "docker compose -f docker-compose.test.yml run --rm test [test_path/and_options]"
    exit 1
fi

# Wait for database to be ready
./docker/wait-for.sh test-db:5432 -t 60 -- echo "PostgreSQL is up"

# Wait for Redis to be ready
./docker/wait-for.sh test-redis:6379 -t 60 -- echo "Redis is up"

# Apply migrations
echo "Running migrations..."
export PYTHONPATH=/app
alembic upgrade head

# Run tests with coverage report generation
pytest --cov=backend --cov-report=html:htmlcov --cov-report=term-missing ${@:-tests/}
