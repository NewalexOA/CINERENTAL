"""Bookings endpoints module.

This module implements API endpoints for managing equipment bookings.
It provides routes for creating, retrieving, updating, and canceling
rental bookings, as well as managing their status and payment information.
"""

from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.decorators import (
    typed_delete,
    typed_get,
    typed_patch,
    typed_post,
    typed_put,
)
from backend.core.database import get_db
from backend.exceptions import AvailabilityError, NotFoundError, StatusTransitionError
from backend.exceptions.state_exceptions import StateError
from backend.exceptions.validation_exceptions import ValidationError
from backend.models import Booking, BookingStatus, PaymentStatus
from backend.schemas import BookingCreate, BookingResponse, BookingUpdate
from backend.services import BookingService

bookings_router: APIRouter = APIRouter()


def _booking_to_response(booking_obj: Booking) -> BookingResponse:
    """Convert Booking model to BookingResponse schema.

    Args:
        booking_obj: Booking model instance

    Returns:
        BookingResponse schema
    """
    equipment_name = ''
    if booking_obj.equipment is not None:
        equipment_name = booking_obj.equipment.name

    client_name = ''
    if booking_obj.client is not None:
        client_name = booking_obj.client.name

    project_name = None
    if booking_obj.project is not None:
        project_name = booking_obj.project.name
        print(f'Found project for booking {booking_obj.id}: {project_name}')
    else:
        print(f'No project found for booking {booking_obj.id}')

    return BookingResponse(
        id=booking_obj.id,
        equipment_id=booking_obj.equipment_id,
        project_id=booking_obj.project_id,
        client_id=booking_obj.client_id,
        start_date=booking_obj.start_date,
        end_date=booking_obj.end_date,
        total_amount=booking_obj.total_amount,
        status=booking_obj.booking_status,
        payment_status=booking_obj.payment_status,
        created_at=booking_obj.created_at,
        updated_at=booking_obj.updated_at,
        equipment_name=equipment_name,
        client_name=client_name,
        project_name=project_name,
        quantity=booking_obj.quantity,
    )


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
            deposit_amount=float(booking.total_amount) * 0.2,
            quantity=booking.quantity,
            notes=None,
        )

        # Create a proper BookingResponse object with all required fields
        response = _booking_to_response(booking_obj)

        return response
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
        await db.rollback()
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
    query: Optional[str] = Query(
        None, description='Search by client name, email, or phone'
    ),
    equipment_query: Optional[str] = Query(
        None, description='Search by equipment name or serial number'
    ),
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
    """Get bookings with optional filtering.

    Args:
        db: Database session
        query: Search by client name, email, or phone
        equipment_query: Search by equipment name or serial number
        equipment_id: Filter by equipment ID
        booking_status: Filter by booking status
        payment_status: Filter by payment status
        start_date: Filter by start date
        end_date: Filter by end date
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        List of bookings
    """
    booking_service = BookingService(db)
    try:
        # Fetch bookings using the service layer, passing filters
        # The service/repository should handle the actual filtering logic
        filtered_bookings = await booking_service.get_filtered_bookings(
            query=query,
            equipment_query=equipment_query,
            equipment_id=equipment_id,
            booking_status=booking_status,
            payment_status=payment_status,
            start_date=start_date,
            end_date=end_date,
        )

        # Apply pagination (consider moving to service/repo)
        paginated_bookings = filtered_bookings[skip : skip + limit]

        # Convert Booking objects to BookingResponse objects
        responses = []
        for booking_obj in paginated_bookings:
            # Ensure related objects are loaded or handle potential None values
            response = _booking_to_response(booking_obj)
            responses.append(response)

        return responses
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to retrieve bookings: {str(e)}',
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
    """Get booking by ID."""
    booking_service = BookingService(db)
    try:
        # Use get_booking to include soft-deleted records
        booking_obj = await booking_service.get_booking(booking_id)

        # Convert Booking object to BookingResponse
        # Note: _booking_to_response might need adjustment if it relies on
        # eagerly loaded relations from get_booking_with_relations
        response = _booking_to_response(booking_obj)

        return response
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
    """Update booking.

    Args:
        booking_id: Booking ID
        booking_update: Updated booking data
        db: Database session

    Returns:
        Updated booking

    Raises:
        HTTPException: If booking not found or validation fails
    """
    booking_service = BookingService(db)
    try:
        # Get current booking to check if it exists
        await booking_service.get_booking(booking_id)

        # Update booking
        booking_obj = await booking_service.update_booking(
            booking_id=booking_id,
            start_date=booking_update.start_date,
            end_date=booking_update.end_date,
            quantity=booking_update.quantity,
            notes=None,
        )

        if booking_update.status is not None:
            await booking_service.change_status(
                booking_id=booking_id,
                new_status=booking_update.status,
            )
        if booking_update.payment_status is not None:
            await booking_service.change_payment_status(
                booking_id=booking_id,
                status=booking_update.payment_status,
            )

        # Convert Booking object to BookingResponse
        response = _booking_to_response(booking_obj)

        return response
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
        await db.rollback()  # Explicit transaction rollback on error
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
        await db.rollback()  # Explicit transaction rollback on error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to delete booking: {str(e)}',
        )


@typed_patch(
    bookings_router,
    '/{booking_id}/status',
    response_model=BookingResponse,
)
async def update_booking_status(
    booking_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    booking_status: BookingStatus = Body(..., embed=True),
) -> BookingResponse:
    """Update booking status.

    Args:
        booking_id: Booking ID
        db: Database session
        booking_status: New booking status

    Returns:
        Updated booking

    Raises:
        HTTPException: If booking not found or status transition invalid
    """
    booking_service = BookingService(db)
    try:
        booking_obj = await booking_service.change_status(
            booking_id=booking_id, new_status=booking_status
        )

        # Convert Booking object to BookingResponse
        response = _booking_to_response(booking_obj)

        return response
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Booking with ID {booking_id} not found',
        )
    except StatusTransitionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        await db.rollback()  # Explicit transaction rollback on error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to update booking status: {str(e)}',
        )


@typed_patch(
    bookings_router,
    '/{booking_id}/payment',
    response_model=BookingResponse,
)
async def update_payment_status(
    booking_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    payment_data: dict = Body(...),
) -> BookingResponse:
    """Update booking payment status.

    Args:
        booking_id: Booking ID
        db: Database session
        payment_data: Payment data with payment_status

    Returns:
        Updated booking

    Raises:
        HTTPException: If booking not found or payment status transition invalid
    """
    booking_service = BookingService(db)
    try:
        # Extract payment status from data
        payment_status = payment_data.get('payment_status')
        if not payment_status:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Payment status is required',
            )

        # Convert string to enum if needed
        if isinstance(payment_status, str):
            try:
                payment_status = PaymentStatus(payment_status)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f'Invalid payment status: {payment_status}',
                )

        booking_obj = await booking_service.change_payment_status(
            booking_id=booking_id, status=payment_status
        )

        # Convert Booking object to BookingResponse
        response = _booking_to_response(booking_obj)

        return response
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Booking with ID {booking_id} not found',
        )
    except StateError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        await db.rollback()  # Explicit transaction rollback on error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to update payment status: {str(e)}',
        )


@typed_patch(
    bookings_router,
    '/{booking_id}',
    response_model=BookingResponse,
)
async def patch_booking(
    booking_id: int,
    booking_update: BookingUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BookingResponse:
    """Partially update booking.

    Args:
        booking_id: Booking ID
        booking_update: Updated booking data (partial)
        db: Database session

    Returns:
        Updated booking

    Raises:
        HTTPException: If booking not found or validation fails
    """
    booking_service = BookingService(db)
    try:
        # Get current booking to check if it exists
        await booking_service.get_booking(booking_id)

        # Update booking with provided fields
        booking_obj = await booking_service.update_booking(
            booking_id=booking_id,
            start_date=booking_update.start_date,
            end_date=booking_update.end_date,
            quantity=booking_update.quantity,
            notes=None,
        )

        # Handle status updates if provided
        if booking_update.status is not None:
            await booking_service.change_status(
                booking_id=booking_id,
                new_status=booking_update.status,
            )
        if booking_update.payment_status is not None:
            await booking_service.change_payment_status(
                booking_id=booking_id,
                status=booking_update.payment_status,
            )

        # Convert Booking object to BookingResponse
        response = _booking_to_response(booking_obj)

        return response
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
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to update booking: {str(e)}',
        )
