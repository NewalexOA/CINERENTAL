#!/bin/bash
set -e

# Wait for services to be ready
echo "Waiting for PostgreSQL..."
./docker/wait-for-it.sh test_db 5432

echo "Waiting for Redis..."
./docker/wait-for-it.sh redis 6379

# Run migrations on test database
echo "Running migrations..."
alembic upgrade head

# Run tests with coverage
echo "Running tests..."
if [ $# -eq 0 ]; then
    echo "No tests specified. Please provide test path or options."
    echo "Usage: docker compose run --rm test ./docker/run-tests.sh [test_path_or_options]"
    echo "Example: docker compose run --rm test ./docker/run-tests.sh tests/unit/test_equipment_service.py -v"
    exit 1
else
    python -m pytest "$@" --cov=backend --cov-report=html --cov-report=term-missing
fi
