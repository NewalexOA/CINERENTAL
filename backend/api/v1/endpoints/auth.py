"""Authentication endpoints module.

This module implements API endpoints for user authentication and authorization.
It provides routes for user login, token refresh, and password management.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get('/health-check')
async def health_check() -> dict:
    """Health check endpoint."""
    return {'status': 'ok', 'message': 'Service is running'}
