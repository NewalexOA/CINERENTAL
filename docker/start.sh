#!/bin/bash

# Wait for dependencies
./docker/wait-for-it.sh db 5432
./docker/wait-for-it.sh redis 6379

# Apply migrations
alembic upgrade head

# Start the application
exec uvicorn backend.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers ${WORKERS_COUNT:-1} \
    --log-level ${LOG_LEVEL:-info} \
    ${DEBUG:+--reload}
