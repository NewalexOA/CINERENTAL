#!/bin/bash

# Script to extract extended data from SQL dump to JSON format
#
# Usage (from project root): ./backend/scripts/extract_from_sql_dump.sh [path_to_sql_dump]
#
# If no SQL dump path is provided, the script will automatically search for
# *.sql files in the backend/scripts/ directory and use the first found file.
# This makes it easy to work with any SQL dump you place in the scripts folder.
#
# Examples:
#   ./backend/scripts/extract_from_sql_dump.sh                           # Auto-detect first *.sql file
#   ./backend/scripts/extract_from_sql_dump.sh backend/scripts/dump.sql  # Use specific file
#   ./backend/scripts/extract_from_sql_dump.sh /path/to/backup.sql       # Use file from any location

set -e  # Exit on any error

# Check if running from project root
if [ ! -d "backend/scripts" ]; then
    echo -e "\033[0;31m[ERROR]\033[0m This script must be run from the project root directory"
    echo "Usage: ./backend/scripts/extract_from_sql_dump.sh [path_to_sql_dump]"
    exit 1
fi

# Function to find first SQL file in backend/scripts/ directory
find_sql_file() {
    local sql_files=($(find backend/scripts -name "*.sql" -type f | sort))

    if [ ${#sql_files[@]} -eq 0 ]; then
        return 1  # No SQL files found
    else
        echo "${sql_files[0]}"  # Return first SQL file
        return 0
    fi
}

# Configuration - auto-detect SQL file if not provided
if [ -n "$1" ]; then
    SQL_DUMP_FILE="$1"
    log_info() { echo -e "\033[0;32m[INFO]\033[0m $1"; }  # Define function early for usage
    log_info "Using provided SQL dump: $SQL_DUMP_FILE"
else
    # Try to auto-detect SQL file
    if detected_sql=$(find_sql_file); then
        SQL_DUMP_FILE="$detected_sql"
        log_info() { echo -e "\033[0;32m[INFO]\033[0m $1"; }  # Define function early for usage
        log_info "Auto-detected SQL dump: $SQL_DUMP_FILE"
    else
        echo -e "\033[0;31m[ERROR]\033[0m No SQL files found in backend/scripts/ directory"
        echo "Please provide SQL dump file path as argument:"
        echo "Usage: $0 [path_to_sql_dump]"
        exit 1
    fi
fi

TEMP_DB_NAME="temp_data_extract_$(date +%s)"
TEMP_DB_PORT="5433"
CONTAINER_NAME="temp-postgres-extract"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to list available SQL files
list_sql_files() {
    local sql_files=($(find backend/scripts -name "*.sql" -type f | sort))

    if [ ${#sql_files[@]} -gt 0 ]; then
        log_info "Available SQL files in backend/scripts/:"
        for i in "${!sql_files[@]}"; do
            local file="${sql_files[$i]}"
            local filename=$(basename "$file")
            local filesize=$(du -h "$file" | cut -f1)
            if [ $i -eq 0 ]; then
                echo "  $((i+1)). $filename ($filesize) <- [AUTO-SELECTED]"
            else
                echo "  $((i+1)). $filename ($filesize)"
            fi
        done
    else
        log_warn "No SQL files found in backend/scripts/"
    fi
}

# Function to cleanup on exit
cleanup() {
    log_info "Cleaning up..."

    # Remove Docker container if it exists
    if docker ps -a --format 'table {{.Names}}' | grep -q "$CONTAINER_NAME"; then
        log_info "Removing Docker container: $CONTAINER_NAME"
        docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
    fi

    log_info "Cleanup completed"
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Main function
main() {
    log_info "=== Extended Data Extraction from SQL Dump ==="

    # Show available SQL files for user information
    list_sql_files
    echo

    # Check if SQL dump file exists
    if [ ! -f "$SQL_DUMP_FILE" ]; then
        log_error "SQL dump file not found: $SQL_DUMP_FILE"
        log_info "Usage: $0 [path_to_sql_dump]"
        exit 1
    fi

    log_info "Using SQL dump: $(basename "$SQL_DUMP_FILE") ($(du -h "$SQL_DUMP_FILE" | cut -f1))"
    log_info "Temporary database: $TEMP_DB_NAME"
    log_info "Port: $TEMP_DB_PORT"

    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi

    # Step 1: Create temporary PostgreSQL container
    log_info "Step 1: Creating temporary PostgreSQL container..."
    docker run --name "$CONTAINER_NAME" \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB="$TEMP_DB_NAME" \
        -p "$TEMP_DB_PORT:5432" \
        -d postgres:13

    # Step 2: Wait for PostgreSQL to be ready
    log_info "Step 2: Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; then
            log_info "PostgreSQL is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL failed to start within 30 seconds"
            exit 1
        fi
        sleep 1
    done

    # Step 3: Restore SQL dump
    log_info "Step 3: Restoring SQL dump to temporary database..."
    if docker exec -i "$CONTAINER_NAME" psql -U postgres "$TEMP_DB_NAME" < "$SQL_DUMP_FILE"; then
        log_info "SQL dump restored successfully"
    else
        log_error "Failed to restore SQL dump"
        exit 1
    fi

    # Step 4: Extract data to JSON using our Python script
    log_info "Step 4: Extracting data to JSON..."
    # SQL dump creates and switches to 'act-rental' database
    TEMP_DATABASE_URL="postgresql://postgres:postgres@localhost:$TEMP_DB_PORT/act-rental"

    # Use Python from venv if available, otherwise system Python
    PYTHON_CMD="python"
    if [ -f ".venv/bin/python" ]; then
        PYTHON_CMD=".venv/bin/python"
        log_info "Using Python from virtual environment"
    elif [ -f "venv/bin/python" ]; then
        PYTHON_CMD="venv/bin/python"
        log_info "Using Python from virtual environment"
    fi

    if $PYTHON_CMD backend/scripts/extract_extended_data.py --database-url "$TEMP_DATABASE_URL"; then
        log_info "Data extraction completed successfully!"

        # Check if JSON file was created
        JSON_FILE="backend/scripts/extended_data.json"
        if [ -f "$JSON_FILE" ]; then
            JSON_SIZE=$(du -h "$JSON_FILE" | cut -f1)
            log_info "Created JSON file: $JSON_FILE ($JSON_SIZE)"

            # Show summary from JSON
            if command -v jq >/dev/null 2>&1; then
                log_info "Data summary:"
                jq -r '.summary | to_entries[] | "  \(.key): \(.value)"' "$JSON_FILE"
            fi
        else
            log_warn "JSON file was not created"
        fi
    else
        log_error "Data extraction failed"
        exit 1
    fi

    log_info "=== Extraction completed successfully! ==="
    log_info "You can now use: python backend/scripts/seed_data.py --extended-data"
}

# Check if we're being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
