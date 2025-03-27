#!/bin/bash
set -e

# Usage: ./wait-for.sh <service_type> <host> <port> [timeout]
# Example: ./wait-for.sh postgres db 5432 30

service_type="$1"
host="$2"
port="$3"
timeout="${4:-30}"  # Default timeout 30 seconds
elapsed=0

echo "Waiting for $service_type ($host:$port)..."

case "$service_type" in
  "postgres")
    # Используем базовую TCP проверку вместо pg_isready
    until (echo > /dev/tcp/$host/$port) >/dev/null 2>&1; do
      [ "$elapsed" -gt "$timeout" ] && echo "Timeout waiting for PostgreSQL" && exit 1
      echo "PostgreSQL is unavailable - sleeping"
      sleep 1
      elapsed=$((elapsed+1))
    done
    ;;

  "redis")
    until (echo > /dev/tcp/$host/$port) >/dev/null 2>&1; do
      [ "$elapsed" -gt "$timeout" ] && echo "Timeout waiting for Redis" && exit 1
      echo "Redis is unavailable - sleeping"
      sleep 1
      elapsed=$((elapsed+1))
    done
    ;;

  *)
    until (echo > /dev/tcp/$host/$port) >/dev/null 2>&1; do
      [ "$elapsed" -gt "$timeout" ] && echo "Timeout waiting for service" && exit 1
      echo "Service is unavailable - sleeping"
      sleep 1
      elapsed=$((elapsed+1))
    done
    ;;
esac

echo "$service_type is up"
