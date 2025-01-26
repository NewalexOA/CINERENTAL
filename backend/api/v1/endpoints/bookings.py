"""Bookings endpoints module.

This module implements API endpoints for managing equipment bookings.
It provides routes for creating, retrieving, updating, and canceling
rental bookings, as well as managing their status and payment information.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from backend.api.v1.decorators import typed_get

bookings_router: APIRouter = APIRouter()


@typed_get(
    bookings_router,
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
