"""Bookings endpoints module.

This module implements API endpoints for managing equipment bookings.
It provides routes for creating, retrieving, updating, and canceling
rental bookings, as well as managing their status and payment information.
"""

import traceback
from datetime import datetime
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from fastapi_pagination import Page, Params
from fastapi_pagination.ext.sqlalchemy import paginate
from loguru import logger
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
from backend.models import BookingStatus, PaymentStatus
from backend.schemas import BookingCreate, BookingResponse, BookingUpdate
from backend.services import BookingService, ClientService

bookings_router: APIRouter = APIRouter()


def _extract_safe_name(
    obj: Any, name_attr: str, fallback_id: int, fallback_prefix: str
) -> str:
    """Extract name safely with fallback logic.

    Args:
        obj: Object to extract name from (can be None)
        name_attr: Name of the attribute to extract (e.g., 'name')
        fallback_id: ID to use in fallback name
        fallback_prefix: Prefix for fallback name (e.g., 'Client', 'Equipment')

    Returns:
        Safe name string with fallback logic
    """
    if obj is None:
        return f'{fallback_prefix} {fallback_id}'

    if hasattr(obj, name_attr):
        name_value = getattr(obj, name_attr)
        if name_value:  # Check if name is not None and not empty
            return str(name_value)

    # Fallback to ID-based name
    return f'{fallback_prefix} {fallback_id}'


async def _booking_to_response(
    booking_obj: Any, db: Optional[AsyncSession] = None
) -> BookingResponse:
    """Convert Booking model to BookingResponse schema.

    Args:
        booking_obj: Booking model instance or BookingWithDetails
        db: Database session (optional)

    Returns:
        BookingResponse schema
    """
    equipment_name = ''
    if hasattr(booking_obj, 'equipment'):
        if booking_obj.equipment is not None:
            if hasattr(booking_obj.equipment, 'name'):
                equipment_name = booking_obj.equipment.name
            else:
                equipment_name = f'Equipment {booking_obj.equipment_id}'

    # Get client name
    client_name = ''

    # Check if we can get client name from client object
    if hasattr(booking_obj, 'client') and booking_obj.client is not None:
        logger.debug('Client object found for booking {}', booking_obj.id)
        if hasattr(booking_obj.client, 'name'):
            client_name = booking_obj.client.name
            logger.debug('Client name from client object: {}', client_name)

    # If name not found, check for explicit client_name
    if (
        not client_name
        and hasattr(booking_obj, 'client_name')
        and booking_obj.client_name
    ):
        client_name = booking_obj.client_name
        logger.debug('Client name from booking_obj.client_name: {}', client_name)

    # If still no name and we have DB session, fetch client from database
    if not client_name and hasattr(booking_obj, 'client_id') and db is not None:
        # Fetch client from database
        client_id = booking_obj.client_id
        logger.debug('Getting client name from database for client_id: {}', client_id)

        try:
            client_service = ClientService(db)
            client = await client_service.get_client(client_id)
            if client:
                client_name = client.name
                logger.debug('Found client name from database: {}', client_name)
        except Exception as e:
            logger.error('Error fetching client from database: {}', str(e))

    # If still no name, use ID-based name as last resort
    if not client_name and hasattr(booking_obj, 'client_id'):
        client_id = booking_obj.client_id
        client_name = f'Client {client_id}'
        logger.debug('Using fallback client name: {}', client_name)

    project_name = None
    if hasattr(booking_obj, 'project') and booking_obj.project is not None:
        if hasattr(booking_obj.project, 'name'):
            project_name = booking_obj.project.name
            # Log project found
            log_msg = 'Found project for booking {}: {}'
            logger.debug(log_msg, booking_obj.id, project_name)
        else:
            project_name = f'Project {booking_obj.project_id}'
            logger.debug(
                'Found project without name for booking {}: {}',
                booking_obj.id,
                project_name,
            )
    else:
        logger.debug('No project found for booking {}', booking_obj.id)

    return BookingResponse(
        id=booking_obj.id,
        equipment_id=booking_obj.equipment_id,
        project_id=booking_obj.project_id,
        client_id=booking_obj.client_id,
        start_date=booking_obj.start_date,
        end_date=booking_obj.end_date,
        total_amount=booking_obj.total_amount,
        booking_status=(
            booking_obj.booking_status
            if hasattr(booking_obj, 'booking_status')
            else booking_obj.status
        ),
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
    logger.debug('Creating new booking: {}', booking.model_dump())
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

        # Commit transaction after booking creation
        logger.debug('Committing transaction after booking creation')
        await db.commit()
        logger.debug('Transaction committed successfully')

        # Create a proper BookingResponse object with all required fields
        response = await _booking_to_response(booking_obj, db)
        logger.debug('Booking created successfully: ID {}', booking_obj.id)

        return response
    except AvailabilityError as e:
        logger.error('Availability error: {}', str(e))
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    except ValidationError as e:
        logger.error('Validation error: {}', str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error('Unexpected error creating booking: {}', str(e))
        logger.error(traceback.format_exc())
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to create booking: {str(e)}',
        )


@typed_get(
    bookings_router,
    '/',
    response_model=Page[BookingResponse],
)
async def get_bookings(
    db: Annotated[AsyncSession, Depends(get_db)],
    params: Params = Depends(),
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
    active_only: bool = Query(False, description='Return only active bookings'),
) -> Page[BookingResponse]:
    """Get bookings with pagination and filtering."""
    booking_service = BookingService(db)
    try:
        bookings_query = await booking_service.get_filtered_bookings_query(
            query=query,
            equipment_query=equipment_query,
            equipment_id=equipment_id,
            booking_status=booking_status,
            payment_status=payment_status,
            start_date=start_date,
            end_date=end_date,
            active_only=active_only,
        )

        result: Page[BookingResponse] = await paginate(
            db,
            bookings_query,
            params,
            transformer=lambda bookings: [
                BookingResponse(
                    id=booking.id,
                    equipment_id=booking.equipment_id,
                    project_id=booking.project_id,
                    client_id=booking.client_id,
                    start_date=booking.start_date,
                    end_date=booking.end_date,
                    total_amount=booking.total_amount,
                    booking_status=booking.booking_status,
                    payment_status=booking.payment_status,
                    created_at=booking.created_at,
                    updated_at=booking.updated_at,
                    equipment_name=_extract_safe_name(
                        booking.equipment, 'name', booking.equipment_id, 'Equipment'
                    ),
                    client_name=_extract_safe_name(
                        booking.client, 'name', booking.client_id, 'Client'
                    ),
                    project_name=(
                        _extract_safe_name(
                            booking.project, 'name', booking.project_id, 'Project'
                        )
                        if booking.project_id
                        else None
                    ),
                    quantity=booking.quantity,
                )
                for booking in bookings
            ],
        )

        return result
    except Exception as e:
        logger.error('Error in get_bookings: {}', str(e))
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
        booking_obj = await booking_service.get_booking_with_relations(booking_id)

        # Convert Booking object to BookingResponse
        response = await _booking_to_response(booking_obj, db)

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
    logger.debug(
        'Updating booking {}. Data: {}', booking_id, booking_update.model_dump()
    )
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

        if booking_update.booking_status is not None:
            logger.debug('Updating booking status to {}', booking_update.booking_status)
            await booking_service.change_status(
                booking_id=booking_id,
                new_status=booking_update.booking_status,
            )
        if booking_update.payment_status is not None:
            logger.debug('Updating payment status to {}', booking_update.payment_status)
            await booking_service.change_payment_status(
                booking_id=booking_id,
                status=booking_update.payment_status,
            )

        # Commit transaction after booking update
        logger.debug('Committing transaction after booking update')
        await db.commit()
        logger.debug('Transaction committed successfully')

        # Convert Booking object to BookingResponse
        response = await _booking_to_response(booking_obj, db)
        logger.debug('Booking {} updated successfully', booking_id)

        return response
    except NotFoundError:
        logger.error('Booking not found. ID: {}', booking_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Booking with ID {booking_id} not found',
        )
    except AvailabilityError as e:
        logger.error(
            'Availability error updating booking {}. Error: {}', booking_id, str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    except ValidationError as e:
        logger.error(
            'Validation error updating booking {}. Error: {}', booking_id, str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(
            'Unexpected error updating booking {}. Error: {}', booking_id, str(e)
        )
        logger.error(traceback.format_exc())
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
    logger.debug(
        'Updating booking status. Booking ID: {}, New status: {}',
        booking_id,
        booking_status,
    )
    booking_service = BookingService(db)
    try:
        booking_obj = await booking_service.change_status(
            booking_id=booking_id, new_status=booking_status
        )

        # Commit transaction after status update
        logger.debug(
            'Committing transaction after status update for booking {}', booking_id
        )
        await db.commit()
        logger.debug('Transaction committed successfully')

        # Convert Booking object to BookingResponse
        response = await _booking_to_response(booking_obj, db)
        logger.debug(
            'Status update successful. Booking ID: {}, New status: {}',
            booking_id,
            booking_obj.booking_status,
        )

        return response
    except NotFoundError:
        logger.error('Booking not found. ID: {}', booking_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Booking with ID {booking_id} not found',
        )
    except StatusTransitionError as e:
        logger.error(
            'Invalid status transition. Booking ID: {}, Error: {}', booking_id, str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(
            'Unexpected error updating booking status. Booking ID: {}, Error: {}',
            booking_id,
            str(e),
        )
        logger.error(traceback.format_exc())
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
    logger.debug('Updating payment status for booking {}', booking_id)
    logger.debug('Payment data: {}', payment_data)

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
                logger.debug('Converted payment status: {}', payment_status)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f'Invalid payment status: {payment_status}',
                )

        booking_obj = await booking_service.change_payment_status(
            booking_id=booking_id, status=payment_status
        )

        # Commit transaction after payment status update
        logger.debug('Committing transaction after payment status update')
        await db.commit()
        logger.debug('Transaction committed successfully')

        # Convert Booking object to BookingResponse
        response = await _booking_to_response(booking_obj, db)
        logger.debug(
            'Payment status update successful. Booking ID: {}, New status: {}',
            booking_id,
            booking_obj.payment_status,
        )

        return response
    except NotFoundError:
        logger.error('Booking not found. ID: {}', booking_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Booking with ID {booking_id} not found',
        )
    except StateError as e:
        logger.error(
            'State error updating payment status. Booking ID: {}, Error: {}',
            booking_id,
            str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(
            'Unexpected error updating payment status. Booking ID: {}, Error: {}',
            booking_id,
            str(e),
        )
        logger.error(traceback.format_exc())
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
    """Partially update a booking.

    Args:
        booking_id: ID of the booking to update
        booking_update: Partial booking data
        db: Database session

    Returns:
        Updated booking

    Raises:
        HTTPException: If booking not found or update fails
    """
    logger.debug(
        'Partially updating booking {}: {}', booking_id, booking_update.model_dump()
    )
    booking_service = BookingService(db)
    try:
        booking_obj = await booking_service.update_booking(
            booking_id=booking_id, **booking_update.model_dump(exclude_unset=True)
        )

        if not booking_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f'Booking with id {booking_id} not found',
            )

        await db.commit()
        logger.debug('Successfully updated booking {}', booking_id)

        return await _booking_to_response(booking_obj, db)

    except ValidationError as e:
        logger.error('Validation error updating booking {}: {}', booking_id, str(e))
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except StateError as e:
        logger.error('State error updating booking {}: {}', booking_id, str(e))
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except NotFoundError as e:
        logger.error('Booking {} not found: {}', booking_id, str(e))
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error('Unexpected error updating booking {}: {}', booking_id, str(e))
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Internal server error',
        )


@typed_post(
    bookings_router,
    '/batch',
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
)
async def create_bookings_batch(
    bookings_data: list[BookingCreate],
    db: Annotated[AsyncSession, Depends(get_db)],
    project_id: Optional[int] = Query(
        None, description='Project ID to assign to all bookings'
    ),
) -> dict:
    """Create multiple bookings from cart in a single transaction.

    Args:
        bookings_data: List of booking data from cart
        db: Database session
        project_id: Optional project ID to assign to all bookings

    Returns:
        Dict with created bookings and any errors

    Raises:
        HTTPException: If critical validation fails
    """
    logger.info(
        'Creating batch bookings: {} items, project_id: {}',
        len(bookings_data),
        project_id,
    )

    if not bookings_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail='No booking data provided'
        )

    if len(bookings_data) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Maximum 100 bookings per batch',
        )

    booking_service = BookingService(db)
    created_bookings = []
    failed_bookings = []

    try:
        # Start transaction
        logger.debug('Starting batch booking transaction')

        for i, booking_data in enumerate(bookings_data):
            try:
                # Assign project_id if provided
                if project_id:
                    booking_data.project_id = project_id

                logger.debug(
                    'Creating booking {}/{}: {}',
                    i + 1,
                    len(bookings_data),
                    booking_data.model_dump(),
                )

                booking_obj = await booking_service.create_booking(
                    client_id=booking_data.client_id,
                    equipment_id=booking_data.equipment_id,
                    start_date=booking_data.start_date,
                    end_date=booking_data.end_date,
                    total_amount=float(booking_data.total_amount),
                    deposit_amount=float(booking_data.total_amount) * 0.2,
                    quantity=booking_data.quantity,
                    notes=None,
                )

                booking_response = await _booking_to_response(booking_obj, db)
                created_bookings.append(booking_response)
                logger.debug(
                    'Successfully created booking {}: {}',
                    booking_obj.id,
                    booking_obj.equipment_id,
                )

            except (ValidationError, AvailabilityError, StateError) as e:
                error_detail = {
                    'equipment_id': booking_data.equipment_id,
                    'error': str(e),
                    'error_type': type(e).__name__,
                }
                failed_bookings.append(error_detail)
                logger.warning(
                    'Failed to create booking for equipment {}: {}',
                    booking_data.equipment_id,
                    str(e),
                )
                continue

            except Exception as e:
                error_detail = {
                    'equipment_id': booking_data.equipment_id,
                    'error': f'Unexpected error: {str(e)}',
                    'error_type': 'UnexpectedError',
                }
                failed_bookings.append(error_detail)
                logger.error(
                    'Unexpected error creating booking for equipment {}: {}',
                    booking_data.equipment_id,
                    str(e),
                )
                continue

        # Commit transaction if we have any successful bookings
        if created_bookings:
            await db.commit()
            logger.info(
                'Committed batch booking transaction: {} created, {} failed',
                len(created_bookings),
                len(failed_bookings),
            )
        else:
            await db.rollback()
            logger.warning(
                'Rolling back batch booking transaction: no bookings created'
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='No bookings could be created',
            )

        return {
            'success': True,
            'created_count': len(created_bookings),
            'failed_count': len(failed_bookings),
            'created_bookings': created_bookings,
            'failed_bookings': failed_bookings,
            'message': f'Created {len(created_bookings)} bookings successfully',
        }

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error('Critical error in batch booking creation: {}', str(e))
        logger.error('Traceback: {}', traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Internal server error during batch booking creation',
        )
