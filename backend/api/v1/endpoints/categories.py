"""Categories endpoints module.

This module implements API endpoints for managing equipment categories.
It provides routes for creating, retrieving, updating, and deleting
categories, as well as managing their hierarchical relationships.
"""

from fastapi import APIRouter

categories_router = APIRouter()


@categories_router.get('/health', response_model=dict[str, str])  # type: ignore[misc]
async def health_check() -> dict[str, str]:
    """Health check endpoint.

    Returns:
        Status message indicating service is running
    """
    return {'status': 'Service is running'}
