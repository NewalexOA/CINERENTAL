"""Web routes package.

This package contains route modules for the web interface.
Each module defines routes for a specific feature or section of the application.
"""

from typing import List

# Import routes modules
from backend.web.routes import (
    bookings,
    categories,
    clients,
    equipment,
    home,
    projects,
    scanner,
)

__all__: List[str] = [
    'bookings',
    'categories',
    'clients',
    'equipment',
    'home',
    'projects',
    'scanner',
]
