"""API endpoints package.

This package contains FastAPI route handlers for different API endpoints,
organized by resource type (auth, equipment, categories, etc.).
Each module implements CRUD operations and specific business logic
for its respective resource.
"""

from backend.api.v1.endpoints.auth import auth_router
from backend.api.v1.endpoints.barcode import barcode_router
from backend.api.v1.endpoints.bookings import bookings_router
from backend.api.v1.endpoints.categories import categories_router
from backend.api.v1.endpoints.clients import clients_router
from backend.api.v1.endpoints.documents import documents_router
from backend.api.v1.endpoints.equipment import equipment_router
from backend.api.v1.endpoints.health import health_router

__all__ = [
    'auth_router',
    'barcode_router',
    'bookings_router',
    'categories_router',
    'clients_router',
    'documents_router',
    'equipment_router',
    'health_router',
]
