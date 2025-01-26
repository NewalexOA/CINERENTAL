"""Documents endpoints module.

This module implements API endpoints for managing rental documents.
It provides routes for uploading, retrieving, and managing various
documents like contracts, invoices, and other rental paperwork.
"""

from fastapi import APIRouter

documents_router = APIRouter()


@documents_router.get('/health', response_model=dict[str, str])  # type: ignore[misc]
async def health_check() -> dict[str, str]:
    """Health check endpoint.

    Returns:
        Status message indicating service is running
    """
    return {'status': 'Service is running'}
