"""Equipment endpoints module.

This module implements API endpoints for managing rental equipment.
It provides routes for adding, updating, and retrieving equipment items,
including their specifications, availability, and rental rates.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from backend.api.v1.decorators import typed_get

equipment_router: APIRouter = APIRouter()


@typed_get(
    equipment_router,
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
