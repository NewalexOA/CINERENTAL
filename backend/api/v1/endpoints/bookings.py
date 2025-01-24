"""Bookings endpoints module.

This module implements API endpoints for managing equipment bookings.
It provides routes for creating, retrieving, updating, and canceling
rental bookings, as well as managing their status and payment information.
"""

from fastapi import APIRouter

bookings_router = APIRouter()


@bookings_router.get('/health')
async def health_check() -> dict[str, str]:
    """Health check endpoint.

    Returns:
        Status message indicating service is running
    """
    return {'status': 'Service is running'}
