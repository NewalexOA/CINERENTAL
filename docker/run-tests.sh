#!/bin/bash
set -e

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Set environment variables
export ENVIRONMENT=testing
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Function to check if a service is available
check_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=$4
    local attempt=1

    echo -e "${YELLOW}Checking if $service_name is available at $host:$port...${NC}"

    while ! nc -z $host $port >/dev/null 2>&1; do
        if [ $attempt -ge $max_attempts ]; then
            echo -e "${RED}$service_name service is not available. Run tests using docker-compose.test.yml:${NC}"
            echo -e "${YELLOW}docker compose -f docker-compose.test.yml run --rm test [test_path/and_options]${NC}"
            exit 1
        fi
        echo -e "${YELLOW}Waiting for $service_name service... Attempt $attempt/$max_attempts${NC}"
        attempt=$((attempt+1))
        sleep 1
    done
    echo -e "${GREEN}$service_name is available!${NC}"
}

# Check if required services are available
check_service test_db 5432 "PostgreSQL" 30
check_service test-redis 6379 "Redis" 30

# Run the tests
echo -e "${GREEN}All services are available. Running tests...${NC}"

# If no arguments are provided, run all tests
if [ $# -eq 0 ]; then
    python -m pytest
else
    python -m pytest "$@"
fi
