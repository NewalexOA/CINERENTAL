"""Clients endpoints module.

This module implements API endpoints for managing rental service clients.
It provides routes for client registration, profile management,
and accessing rental history and related documents.
"""

from fastapi import APIRouter

clients_router = APIRouter()


@clients_router.get('/health')
async def health_check() -> dict[str, str]:
    """Health check endpoint.

    Returns:
        Status message indicating service is running
    """
    return {'status': 'Service is running'}
