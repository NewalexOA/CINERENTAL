#!/bin/bash

# Script to build the test Docker image with local mirrors for faster builds
# Usage: ./docker/build-test-image.sh [local|remote]

set -e

# Default to local mirrors unless specified otherwise
BUILD_MODE=${1:-local}

# Directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Root directory of the project
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# Function to determine the Docker host IP
get_docker_host_ip() {
  # For Linux
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Check if running inside Docker
    if [ -f /.dockerenv ]; then
      echo "172.17.0.1"  # Default Docker gateway
    else
      # Get the default route's interface
      INTERFACE=$(ip route | grep default | awk '{print $5}')
      ip -4 addr show $INTERFACE | grep -oP '(?<=inet\s)\d+(\.\d+){3}'
    fi
  # For macOS
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # On macOS we use localhost because we're port-forwarding
    echo "localhost"
  # For Windows
  elif [[ "$OSTYPE" == "cygwin" || "$OSTYPE" == "msys" ]]; then
    # Windows also uses localhost with Docker Desktop
    echo "localhost"
  else
    # Fallback to localhost
    echo "localhost"
  fi
}

# Function to check if a service is running on a specific port
check_service() {
  local host=$1
  local port=$2
  local service_name=$3

  if nc -z -w 2 $host $port > /dev/null 2>&1; then
    echo "✓ $service_name is running at $host:$port"
    return 0
  else
    echo "✗ $service_name is not available at $host:$port"
    return 1
  fi
}

if [ "$BUILD_MODE" = "local" ]; then
  echo "Building test image using local mirrors..."

  # Get the Docker host IP
  DOCKER_HOST_IP=$(get_docker_host_ip)
  echo "Detected Docker host IP: $DOCKER_HOST_IP"

  # Check if cache services are running
  PYPI_CACHE_AVAILABLE=false
  APT_CACHE_AVAILABLE=false

  if check_service $DOCKER_HOST_IP 3141 "PyPI cache (devpi)"; then
    PYPI_CACHE_AVAILABLE=true

    # For macOS and Windows, use host.docker.internal in the URL
    # that will be used inside the Docker container
    if [[ "$OSTYPE" == "darwin"* || "$OSTYPE" == "cygwin" || "$OSTYPE" == "msys" ]]; then
      DOCKER_URL_HOST="host.docker.internal"
    else
      DOCKER_URL_HOST=$DOCKER_HOST_IP
    fi

    PIP_MIRROR="http://$DOCKER_URL_HOST:3141/root/pypi/+simple/"
    PIP_HOST="$DOCKER_URL_HOST"

    echo "PyPI cache available. Using $PIP_MIRROR for build"
  else
    echo "PyPI cache not available, using default PyPI repository."
    PIP_MIRROR="https://pypi.org/simple/"
    PIP_HOST="pypi.org"
  fi

  if check_service $DOCKER_HOST_IP 3142 "APT cache (apt-cacher-ng)"; then
    APT_CACHE_AVAILABLE=true

    # For macOS and Windows, use host.docker.internal in the URL
    # that will be used inside the Docker container
    if [[ "$OSTYPE" == "darwin"* || "$OSTYPE" == "cygwin" || "$OSTYPE" == "msys" ]]; then
      DOCKER_URL_HOST="host.docker.internal"
    else
      DOCKER_URL_HOST=$DOCKER_HOST_IP
    fi

    APT_MIRROR="http://$DOCKER_URL_HOST:3142/debian"

    echo "APT cache available. Using $APT_MIRROR for build"
  else
    echo "APT cache not available, using default Debian repository."
    APT_MIRROR="http://deb.debian.org/debian"
  fi

  # Build with appropriate mirrors
  echo "Building with PIP_INDEX_URL=$PIP_MIRROR"
  echo "Building with APT_MIRROR=$APT_MIRROR"

  # Build the Docker image
  PIP_INDEX_URL=$PIP_MIRROR \
  PIP_TRUSTED_HOST=$PIP_HOST \
  APT_MIRROR=$APT_MIRROR \
  docker compose -f docker-compose.test.yml build test

  # Show cache status
  echo
  echo "Mirror Status:"
  echo "-------------"
  if [ "$PYPI_CACHE_AVAILABLE" = true ]; then
    echo "✓ Using local PyPI mirror: $PIP_MIRROR"
  else
    echo "✗ PyPI cache not used. Start it with: docker compose -f docker-compose.caches.yml up -d pypi-cache"
  fi

  if [ "$APT_CACHE_AVAILABLE" = true ]; then
    echo "✓ Using local APT mirror: $APT_MIRROR"
  else
    echo "✗ APT cache not used. Start it with: docker compose -f docker-compose.caches.yml up -d apt-cacher"
  fi
else
  echo "Building test image using default remote repositories..."
  docker compose -f docker-compose.test.yml build test
fi

echo
echo "Build completed successfully!"
