"""Documents endpoints module.

This module implements API endpoints for managing rental documents.
It provides routes for uploading, retrieving, and managing various
documents like contracts, invoices, and other rental paperwork.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from backend.api.v1.decorators import typed_get

documents_router: APIRouter = APIRouter()


@typed_get(
    documents_router,
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
