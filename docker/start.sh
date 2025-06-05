#!/bin/bash

# Wait for dependencies
./docker/wait-for.sh postgres db 5432
./docker/wait-for.sh redis redis 6379

# Apply migrations
alembic upgrade head

# Debug output
echo "Current environment: $ENVIRONMENT"

# Seed data based on environment
if [ "$ENVIRONMENT" = "development" ]; then
    # Check if extended data file exists
    if [ -f "backend/scripts/extended_data.json" ]; then
        echo "Found extended data file, seeding extended dataset..."
        python -m backend.scripts.seed_data --extended-data || {
            echo "Error seeding extended dataset, falling back to basic data..."
            python -m backend.scripts.seed_data || {
                echo "Error seeding basic data"
                exit 1
            }
        }
    else
        echo "No extended data found, seeding basic dataset..."
        python -m backend.scripts.seed_data || {
            echo "Error seeding basic data"
            exit 1
        }
    fi
fi

# Start the application
exec uvicorn backend.main:app \
    --app-dir . \
    --host 0.0.0.0 \
    --port 8000 \
    --workers ${WORKERS_COUNT:-1} \
    --log-level ${LOG_LEVEL:-info} \
    ${DEBUG:+--reload}
