# Docker Resources

This folder contains Docker-related resources and utilities.

## Contents

- `apt-cacher-ng/` - Dockerfile for APT package caching to speed up Debian package installation
- `devpi/` - Dockerfile for PyPI package caching to speed up Python package installation
- `caches/` - Documentation and configuration for package caching system
- `wait-for.sh` - Utility script to wait for services to be ready
- `run-tests.sh` - Script for running tests in Docker environment
- `build-test-image.sh` - Script for building test image with optional local mirrors

## Speeding Up Docker Builds

For faster Docker builds, use the `build-test-image.sh` script with local package mirrors:

```bash
# Start the local package caches
docker compose -f docker-compose.caches.yml up -d

# Build using local caches (if available)
./docker/build-test-image.sh local
```

For more information on using local mirrors for faster builds, see [docker/caches/README.md](caches/README.md).

## Test Environment

The test environment uses:
- PostgreSQL database (test-db)
- Redis cache server (test-redis)

The test setup is defined in `docker-compose.test.yml`.
