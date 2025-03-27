#!/bin/bash
set -e

# Install PostgreSQL client if not installed
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL client..."
    apt-get update -qq
    apt-get install -y --no-install-recommends postgresql-client
fi

# Function to check service availability
check_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=30
    local attempt=1

    echo "Checking $service_name availability..."
    while ! nc -z "$host" "$port"; do
        if [ $attempt -ge $max_attempts ]; then
            echo "ERROR: $service_name service is not available after $max_attempts attempts"
            echo "Please ensure the service is running using docker-compose.test.yml:"
            echo "docker compose -f docker-compose.test.yml up -d"
            exit 1
        fi
        echo "$service_name is unavailable - attempt $attempt/$max_attempts - sleeping"
        attempt=$((attempt + 1))
        sleep 1
    done
    echo "$service_name is available"
}

# Check and wait for required services
check_service test-db 5432 "PostgreSQL"
check_service test-redis 6379 "Redis"

# Apply migrations
echo "Running migrations..."
export PYTHONPATH=/app
alembic upgrade head

# Run tests with coverage report generation
pytest --cov=backend --cov-report=html:htmlcov --cov-report=term-missing ${@:-tests/}
