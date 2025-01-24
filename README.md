# CINERENTAL - Cinema Equipment Rental Management System

[![Python](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/release/python-3120/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![Imports: isort](https://img.shields.io/badge/%20imports-isort-%231674b1?style=flat&labelColor=ef8336)](https://pycqa.github.io/isort/)
[![pre-commit](https://img.shields.io/badge/pre--commit-enabled-brightgreen?logo=pre-commit)](https://github.com/pre-commit/pre-commit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Description
CINERENTAL is a comprehensive system for managing cinema equipment rentals. It allows managers to control equipment availability, handle bookings, and track equipment returns efficiently.

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
```
cinerental/
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
│   └── integration/ # Integration tests
├── docker/          # Docker configuration files
└── requirements.txt # Python dependencies
```

## Prerequisites
- Docker and Docker Compose
- Python 3.10+
- PostgreSQL 14+
- Redis 6+

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/cinerental.git
   cd cinerental
   ```

2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Copy environment example and configure:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Start services with Docker Compose:
   ```bash
   docker-compose up -d
   ```

6. Run migrations:
   ```bash
   alembic upgrade head
   ```

7. Start the application:
   ```bash
   uvicorn backend.main:app --reload
   ```

## Development
- Follow [Code Style Guide](docs/code_style.md)
- Use pre-commit hooks
- Write tests for new features
- Update documentation

## Testing
```