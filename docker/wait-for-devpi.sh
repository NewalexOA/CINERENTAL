#!/bin/bash

set -e

HOST=${1:-"devpi"}
PORT=${2:-"3141"}
TIMEOUT=${3:-30}

echo "Waiting for DevPi server at ${HOST}:${PORT} to be available..."

start_time=$(date +%s)
end_time=$((start_time + TIMEOUT))

while [ $(date +%s) -lt $end_time ]; do
    if nc -z ${HOST} ${PORT}; then
        echo "DevPi server is available!"
        exit 0
    fi
    echo "DevPi server is not available yet. Retrying in 1 second..."
    sleep 1
done

echo "DevPi server did not become available within ${TIMEOUT} seconds."
echo "Using default PyPI instead."
exit 1
