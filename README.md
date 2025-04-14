# ACT-Rental - Cinema Equipment Rental Management System

[![Python](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/release/python-3120/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![Imports: isort](https://img.shields.io/badge/%20imports-isort-%231674b1?style=flat&labelColor=ef8336)](https://pycqa.github.io/isort/)
[![pre-commit](https://img.shields.io/badge/pre--commit-enabled-brightgreen?logo=pre-commit)](https://github.com/pre-commit/pre-commit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Description

ACT-Rental is a comprehensive system for managing cinema equipment rentals. It allows managers to control equipment availability, handle bookings, and track equipment returns efficiently.

## Documentation

- [Project Architecture](docs/architecture.md) - Detailed system architecture and design decisions
- [Development Plan](docs/development_plan.md) - Current development status and roadmap
- [Code Style Guide](docs/code_style.md) - Coding standards and best practices
- [Project Structure](docs/project_structure.md) - Detailed explanation of project organization
- [Technical Requirements](docs/техническое_задание.md) - Project specifications and requirements

## Features

- Equipment management with hierarchical categories
- Client management
- Booking system
- Barcode scanner integration
- Real-time equipment status updates
- Document generation (rental agreements, handover acts)

## Tech Stack

- Backend: FastAPI
- Frontend: Bootstrap
- Database: PostgreSQL
- Cache: Redis
- Containerization: Docker

## Project Structure

```text
act-rental/
├── backend/             # Backend application
│   ├── api/            # API endpoints and routers
│   │   └── v1/        # API version 1
│   ├── core/          # Core functionality and config
│   ├── models/        # Database models
│   ├── schemas/       # Pydantic schemas
│   ├── services/      # Business logic layer
│   └── repositories/  # Database access layer
├── docs/              # Project documentation
│   ├── architecture.md       # System architecture
│   ├── code_style.md        # Coding standards
│   ├── development_plan.md  # Development roadmap
│   └── project_structure.md # Project organization
├── frontend/          # Frontend application
│   ├── static/       # Static assets (CSS, JS, images)
│   └── templates/    # Jinja2 HTML templates
├── tests/            # Test suite
│   ├── unit/        # Unit tests
│   ├── integration/ # Integration tests
│   ├── e2e/         # End-to-end tests
│   └── factories/   # Test data factories
├── docker/          # Docker configuration files
├── migrations/       # Alembic migration scripts
├── pyproject.toml    # Project metadata and dependencies definition
└── requirements.txt  # Python dependencies (potentially generated or for specific use cases)
```

## Prerequisites

- Docker and Docker Compose
- Python 3.12
- PostgreSQL 14+
- Redis 6+

## Environment Variables

### Database Settings

- `POSTGRES_USER` - PostgreSQL username (default: postgres)
- `POSTGRES_PASSWORD` - PostgreSQL password (default: postgres)
- `POSTGRES_DB` - Database name (default: act-rental)
- `POSTGRES_SERVER` - Database host (default: db)

### Redis Settings

- `REDIS_HOST` - Redis host (default: redis)
- `REDIS_PASSWORD` - Redis password (optional)

### Application Settings

- `SECRET_KEY` - Secret key for JWT tokens and security
- `DEBUG` - Enable debug mode (default: false)
- `WORKERS_COUNT` - Number of uvicorn workers (default: 1)
- `LOG_LEVEL` - Logging level (default: info)

### Security Settings

- `ALLOWED_HOSTS` - Comma-separated list of allowed hosts
- `CORS_ORIGINS` - Comma-separated list of allowed CORS origins

## Development setup

1. Clone the repository
2. Copy `.env.example` to `.env` and adjust values
3. Run development server:

```bash
docker compose up
```

## Testing

To run the entire test suite, including unit, integration, and E2E tests with coverage reporting, use the following Make command:

```bash
make test
```

This command utilizes the `docker-compose.test.yml` configuration. It performs the following steps:

1. Builds the necessary Docker images using `Dockerfile.test`.
2. Starts the required services (test database and Redis) in the background.
3. Runs `pytest` within a dedicated container, executing all tests found in the `tests/` directory.
4. Collects code coverage for the `backend` directory.
5. Displays a coverage report with missing lines in the terminal.
6. Generates an HTML coverage report (usually in the `htmlcov/` directory).

To run specific tests or pass additional options to `pytest`, you can execute the `docker compose run` command directly:

```bash
# Example: Run only tests in a specific file
docker compose -f docker-compose.test.yml run --rm test python -m pytest tests/integration/test_bookings.py

# Example: Run tests matching a keyword expression (-k)
docker compose -f docker-compose.test.yml run --rm test python -m pytest -k "test_create_booking"
```

## CI/CD with GitHub Actions

This project uses GitHub Actions for continuous integration:

### Automated Workflows

1. **Run Tests** - Runs all tests in Docker containers when code is pushed to `main` or `develop` branches
   - Builds test containers
   - Runs tests with PostgreSQL and Redis in containers
   - Generates and uploads test coverage reports as GitHub artifacts

2. **Code Quality** - Checks code quality when code is pushed to `main` or `develop` branches
   - Runs Black for code formatting
   - Runs isort for import sorting
   - Runs flake8 for code style
   - Runs mypy for type checking

3. **Build Docker Image** - Builds and tests Docker image
   - Builds Docker image with optimized layers
   - Verifies the image works correctly
   - Creates and uploads instructions for local deployment

### Local Development

For local development, you can use Docker Compose:

```bash
# Start all services in development mode with auto-reload
docker compose up

# Run in detached mode
docker compose up -d

# Run tests
docker compose up test
```

## Production

1. Copy `.env.example` to `.env.production` and set secure values
2. Build and run production services:

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Dependencies Installation

This project uses `uv` for fast dependency management. The dependencies are defined in `pyproject.toml`. You can install them using the provided Make commands or manually with `uv`.

### For Development

```bash
# Create virtual environment and install dependencies
make install

# Or manually
python -m venv .venv
source .venv/bin/activate  # for Linux/macOS
# or
.venv\Scripts\activate  # for Windows

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install development dependencies (including core dependencies)
uv pip install -e ".[dev]"
```

### For Testing

```bash
# Install testing dependencies
make install-test

# Or manually with uv
uv pip install -e ".[test]"
```

## Development

- Follow [Code Style Guide](docs/code_style.md)
- Use pre-commit hooks
- Write tests for new features
- Update documentation

## Migrations

To apply migrations and update the database schema:

```bash
# Apply all migrations
alembic upgrade head

# Create a new migration
alembic revision -m "your_migration_name"

# Roll back the last migration
alembic downgrade -1

# Check migration history
alembic history
```

### Future Migrations

The `migrations/versions/future` directory contains migrations that are prepared but not yet applied:

To apply a future migration:

```bash
# Move the migration to the main versions directory
mv migrations/versions/future/your_migration_name.py migrations/versions/

# Apply the migration
alembic upgrade head
```
