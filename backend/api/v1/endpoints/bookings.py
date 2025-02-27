"""Bookings endpoints module.

This module implements API endpoints for managing equipment bookings.
It provides routes for creating, retrieving, updating, and canceling
rental bookings, as well as managing their status and payment information.
"""

from datetime import datetime
from typing import Annotated, List, Optional, cast

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.decorators import typed_delete, typed_get, typed_post, typed_put
from backend.core.database import get_db
from backend.exceptions import AvailabilityError, NotFoundError, ValidationError
from backend.models import Booking, BookingStatus, PaymentStatus
from backend.schemas import BookingCreate, BookingResponse, BookingUpdate
from backend.services import BookingService

bookings_router: APIRouter = APIRouter()


@typed_post(
    bookings_router,
    '/',
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_booking(
    booking: BookingCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BookingResponse:
    """Create a new booking.

    Args:
        booking: Booking data
        db: Database session

    Returns:
        Created booking

    Raises:
        HTTPException: If validation fails or equipment is not available
    """
    booking_service = BookingService(db)
    try:
        booking_obj = await booking_service.create_booking(
            client_id=booking.client_id,
            equipment_id=booking.equipment_id,
            start_date=booking.start_date,
            end_date=booking.end_date,
            total_amount=float(booking.total_amount),
            deposit_amount=float(booking.total_amount) * 0.2,  # 20% deposit by default
            notes=None,
        )
        return cast(BookingResponse, booking_obj)
    except AvailabilityError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to create booking: {str(e)}',
        )


@typed_get(
    bookings_router,
    '/',
    response_model=List[BookingResponse],
)
async def get_bookings(
    db: Annotated[AsyncSession, Depends(get_db)],
    client_id: Optional[int] = Query(None, description='Filter by client ID'),
    equipment_id: Optional[int] = Query(None, description='Filter by equipment ID'),
    booking_status: Optional[BookingStatus] = Query(
        None, description='Filter by booking status'
    ),
    payment_status: Optional[PaymentStatus] = Query(
        None, description='Filter by payment status'
    ),
    start_date: Optional[datetime] = Query(
        None, description='Filter by start date (inclusive)'
    ),
    end_date: Optional[datetime] = Query(
        None, description='Filter by end date (inclusive)'
    ),
    skip: int = Query(0, description='Number of records to skip'),
    limit: int = Query(100, description='Maximum number of records to return'),
) -> List[BookingResponse]:
    """Get all bookings with optional filtering.

    Args:
        db: Database session
        client_id: Filter by client ID (optional)
        equipment_id: Filter by equipment ID (optional)
        booking_status: Filter by booking status (optional)
        payment_status: Filter by payment status (optional)
        start_date: Filter by start date (optional)
        end_date: Filter by end date (optional)
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return (pagination)

    Returns:
        List of bookings
    """
    booking_service = BookingService(db)
    try:
        # Get all bookings
        bookings = await booking_service.get_bookings()

        # Apply filters
        filtered_bookings: List[Booking] = bookings

        if client_id is not None:
            filtered_bookings = await booking_service.get_by_client(client_id)

        if equipment_id is not None:
            filtered_bookings = await booking_service.get_by_equipment(equipment_id)

        if booking_status is not None:
            filtered_bookings = await booking_service.get_by_status(booking_status)

        # Apply pagination
        paginated_bookings = filtered_bookings[skip : skip + limit]

        # Convert to response type
        return cast(List[BookingResponse], paginated_bookings)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get bookings: {str(e)}',
        )


@typed_get(
    bookings_router,
    '/{booking_id}',
    response_model=BookingResponse,
)
async def get_booking(
    booking_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BookingResponse:
    """Get a booking by ID.

    Args:
        booking_id: Booking ID
        db: Database session

    Returns:
        Booking details

    Raises:
        HTTPException: If booking is not found
    """
    booking_service = BookingService(db)
    try:
        booking = await booking_service.get_booking(booking_id)
        return cast(BookingResponse, booking)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Booking with ID {booking_id} not found',
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get booking: {str(e)}',
        )


@typed_put(
    bookings_router,
    '/{booking_id}',
    response_model=BookingResponse,
)
async def update_booking(
    booking_id: int,
    booking_update: BookingUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BookingResponse:
    """Update a booking.

    Args:
        booking_id: Booking ID
        booking_update: Updated booking data
        db: Database session

    Returns:
        Updated booking

    Raises:
        HTTPException: If booking is not found or validation fails
    """
    booking_service = BookingService(db)
    try:
        booking = await booking_service.update_booking(
            booking_id=booking_id,
            start_date=booking_update.start_date,
            end_date=booking_update.end_date,
            notes=None,
        )
        return cast(BookingResponse, booking)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Booking with ID {booking_id} not found',
        )
    except AvailabilityError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to update booking: {str(e)}',
        )


@typed_delete(
    bookings_router,
    '/{booking_id}',
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_booking(
    booking_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Delete a booking.

    Args:
        booking_id: Booking ID
        db: Database session

    Raises:
        HTTPException: If booking is not found
    """
    booking_service = BookingService(db)
    try:
        await booking_service.delete_booking(booking_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Booking with ID {booking_id} not found',
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to delete booking: {str(e)}',
        )


@typed_put(
    bookings_router,
    '/{booking_id}/status',
    response_model=BookingResponse,
)
async def update_booking_status(
    booking_id: int,
    booking_status: BookingStatus,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BookingResponse:
    """Update booking status.

    Args:
        booking_id: Booking ID
        booking_status: New booking status
        db: Database session

    Returns:
        Updated booking

    Raises:
        HTTPException: If booking is not found or status transition is invalid
    """
    booking_service = BookingService(db)
    try:
        booking = await booking_service.change_status(booking_id, booking_status)
        return cast(BookingResponse, booking)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Booking with ID {booking_id} not found',
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to update booking status: {str(e)}',
        )
