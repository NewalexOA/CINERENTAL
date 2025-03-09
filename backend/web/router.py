"""Frontend router module.

This module initializes the main router for the web interface and
includes all modular routes from the routes package.
"""

from typing import TypeVar

from fastapi import APIRouter

from backend.web.routes import bookings, categories, clients, equipment, home, scanner

web_router = APIRouter()

# Type variables for route handlers
T = TypeVar('T')
R = TypeVar('R')


def typed_route(route_handler: T) -> T:
    """Add typing to route handlers to satisfy mypy."""
    return route_handler


# Include modular routes
web_router.include_router(home.router, prefix='', tags=['Home Web'])
web_router.include_router(
    equipment.router,
    prefix='/equipment',
    tags=['Equipment Web'],
)
web_router.include_router(
    categories.router,
    prefix='/categories',
    tags=['Categories Web'],
)
web_router.include_router(
    clients.router,
    prefix='/clients',
    tags=['Clients Web'],
)
web_router.include_router(
    bookings.router,
    prefix='/bookings',
    tags=['Bookings Web'],
)
web_router.include_router(
    scanner.router,
    prefix='/scanner',
    tags=['Scanner Web'],
)
