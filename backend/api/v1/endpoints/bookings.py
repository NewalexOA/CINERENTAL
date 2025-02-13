"""Bookings endpoints module.

This module implements API endpoints for managing equipment bookings.
It provides routes for creating, retrieving, updating, and canceling
rental bookings, as well as managing their status and payment information.
"""

# from typing import Annotated

from fastapi import APIRouter

# , Depends, status

# from sqlalchemy.ext.asyncio import AsyncSession

# , typed_post

# from backend.core.database import get_db
# TODO: Раскомментировать после создания схем
# from backend.schemas import BookingCreate, BookingResponse
# from backend.services import BookingService

bookings_router: APIRouter = APIRouter()

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
