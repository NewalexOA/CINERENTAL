"""Clients endpoints module.

This module implements API endpoints for managing rental service clients.
It provides routes for client registration, profile management,
and accessing rental history and related documents.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from backend.api.v1.decorators import typed_get

clients_router: APIRouter = APIRouter()


@typed_get(
    clients_router,
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
