"""Categories endpoints module.

This module implements API endpoints for managing equipment categories.
It provides routes for creating, retrieving, updating, and deleting
categories, as well as managing their hierarchical relationships.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from backend.api.v1.decorators import typed_get

categories_router: APIRouter = APIRouter()


@typed_get(
    categories_router,
    '/health',
    response_model=dict[str, str],
    response_class=JSONResponse,
    response_model_exclude_none=True,
)
async def health_check() -> dict[str, str]:
    """Health check endpoint.

    Returns:
        Status message indicating service is running
    """
    return {'status': 'Service is running'}
