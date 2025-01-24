# CINERENTAL - Cinema Equipment Rental Management System

[![Python](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/release/python-3120/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![Imports: isort](https://img.shields.io/badge/%20imports-isort-%231674b1?style=flat&labelColor=ef8336)](https://pycqa.github.io/isort/)
[![pre-commit](https://img.shields.io/badge/pre--commit-enabled-brightgreen?logo=pre-commit)](https://github.com/pre-commit/pre-commit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Description
CINERENTAL is a comprehensive system for managing cinema equipment rentals. It allows managers to control equipment availability, handle bookings, and track equipment returns efficiently.

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
├── backend/
│   ├── api/              # FastAPI routes
│   ├── services/         # Business logic
│   ├── repositories/     # Database operations
│   ├── models/          # Pydantic models and ORM models
│   └── core/            # Configuration, utilities
├── frontend/
│   ├── static/          # CSS, JS, images
│   └── templates/       # HTML templates
├── tests/               # Tests
└── docker/             # Docker configuration
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
- Follow PEP 8 style guide
- Use pre-commit hooks
- Write tests for new features
- Update documentation

## Testing
```bash
pytest
```

## License
[MIT License](LICENSE) 