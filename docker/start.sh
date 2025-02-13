#!/bin/bash

# Wait for dependencies
./docker/wait-for.sh postgres db 5432
./docker/wait-for.sh redis redis 6379

# Apply migrations
alembic upgrade head

# Debug output
echo "Current environment: $ENVIRONMENT"

# Seed test data if environment is development
if [ "$ENVIRONMENT" = "development" ]; then
    echo "Seeding test data..."
    python -m backend.scripts.seed_data || {
        echo "Error seeding data"
        exit 1
    }
fi

# Start the application
exec uvicorn backend.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers ${WORKERS_COUNT:-1} \
    --log-level ${LOG_LEVEL:-info} \
    ${DEBUG:+--reload}
