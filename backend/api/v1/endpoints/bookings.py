"""Bookings endpoints module.

This module implements API endpoints for managing equipment bookings.
It provides routes for creating, retrieving, updating, and canceling
rental bookings, as well as managing their status and payment information.
"""

# from typing import Annotated

from fastapi import APIRouter

# , Depends, status
from fastapi.responses import JSONResponse

from backend.api.v1.decorators import typed_get

# from sqlalchemy.ext.asyncio import AsyncSession


# , typed_post

# from backend.core.database import get_db
# TODO: Раскомментировать после создания схем
# from backend.schemas import BookingCreate, BookingResponse
# from backend.services import BookingService

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


# @typed_post(
#     bookings_router,
#     '/',
#     response_model=BookingResponse,
#     status_code=status.HTTP_201_CREATED,
# )
# async def create_booking(
#     booking: BookingCreate,
#     db: Annotated[AsyncSession, Depends(get_db)],
# ) -> BookingResponse:
#     """Create a new booking.

#     Args:
#         booking: Booking data
#         db: Database session

#     Returns:
#         Created booking
#     """
#     booking_service = BookingService(db)
#     return await booking_service.create_booking(booking)
