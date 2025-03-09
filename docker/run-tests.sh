#!/bin/bash
set -e

# Set the environment variable for tests
# export ENVIRONMENT=testing
# echo "Setting ENVIRONMENT=testing for all tests"

# Wait for services to be ready
echo "Waiting for PostgreSQL..."
./docker/wait-for.sh postgres test_db 5432

echo "Waiting for Redis..."
./docker/wait-for.sh redis redis 6379

# Run migrations on test database
echo "Running migrations..."
export PYTHONPATH=/app
alembic upgrade head

# Run tests with coverage
echo "Running tests..."
if [ $# -eq 0 ]; then
    echo "No tests specified. Please provide test path or options."
    echo "Usage: docker compose run --rm test [test_path/and_options]"
    echo "Example: docker compose run --rm test tests/unit/test_equipment_service.py -v"
    exit 1
else
    python -m pytest "$@" --cov=backend --cov-report=html --cov-report=term-missing
fi
