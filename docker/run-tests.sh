#!/bin/bash
set -e

# Устанавливаем утилиты PostgreSQL, если они не установлены
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL client..."
    apt-get update -qq
    apt-get install -y --no-install-recommends postgresql-client
fi

# Проверяем, запущены ли необходимые сервисы
if ! nc -z test_db 5432 &> /dev/null; then
    echo "ОШИБКА: Сервис test_db не доступен. Запустите тесты через docker-compose.test.yml:"
    echo "docker compose -f docker-compose.test.yml run --rm test [test_path/and_options]"
    exit 1
fi

if ! nc -z redis 6379 &> /dev/null; then
    echo "ОШИБКА: Сервис redis не доступен. Запустите тесты через docker-compose.test.yml:"
    echo "docker compose -f docker-compose.test.yml run --rm test [test_path/and_options]"
    exit 1
fi

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
