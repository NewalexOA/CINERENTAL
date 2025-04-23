"""Equipment endpoints module.

This module implements API endpoints for managing rental equipment.
It provides routes for adding, updating, and retrieving equipment items,
including their specifications, availability, and replacement costs.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional, cast

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi import status as http_status
from fastapi_pagination import Page, Params
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.decorators import (
    typed_delete,
    typed_get,
    typed_patch,
    typed_post,
    typed_put,
)
from backend.api.v1.endpoints.bookings import _booking_to_response
from backend.core.database import get_db
from backend.exceptions import BusinessError, NotFoundError, StateError, ValidationError
from backend.models.booking import BookingStatus
from backend.models.equipment import EquipmentStatus
from backend.schemas import (
    BookingConflictInfo,
    BookingResponse,
    EquipmentAvailabilityResponse,
    EquipmentCreate,
    EquipmentResponse,
    EquipmentUpdate,
    RegenerateBarcodeRequest,
    StatusTimelineResponse,
)
from backend.services import BookingService, EquipmentService

equipment_router: APIRouter = APIRouter()


@typed_post(
    equipment_router,
    '/',
    response_model=EquipmentResponse,
    status_code=http_status.HTTP_201_CREATED,
)
async def create_equipment_endpoint(
    equipment: EquipmentCreate,
    db: AsyncSession = Depends(get_db),
) -> EquipmentResponse:
    """Create new equipment.

    Args:
        equipment: Equipment data
        db: Database session

    Returns:
        Created equipment

    Raises:
        HTTPException: If equipment creation fails
    """
    try:
        # Validate replacement cost if provided
        if equipment.replacement_cost is not None and equipment.replacement_cost < 0:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail='Replacement cost must be greater than or equal to 0',
            )

        # Check that replacement cost is within reasonable limits (adjust if needed)
        if (
            equipment.replacement_cost is not None
            and equipment.replacement_cost >= 100000000
        ):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail='Replacement cost must be less than 100,000,000',
            )

        service = EquipmentService(db)
        replacement_cost_value = (
            equipment.replacement_cost if equipment.replacement_cost is not None else 0
        )

        # Check if we should validate barcode format
        # If custom_barcode comes from frontend manual input, don't validate format
        validate_barcode_format = True
        if (
            hasattr(equipment, 'validate_barcode')
            and equipment.validate_barcode is False
        ):
            validate_barcode_format = False

        return await service.create_equipment(
            name=equipment.name,
            description=equipment.description,
            category_id=equipment.category_id,
            custom_barcode=equipment.custom_barcode,
            serial_number=equipment.serial_number,
            replacement_cost=replacement_cost_value,
            notes=equipment.notes,
            validate_barcode_format=validate_barcode_format,
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_get(
    equipment_router,
    '/',
    response_model=List[EquipmentResponse],
)
async def get_equipment_list(
    skip: Optional[int] = Query(0),
    limit: Optional[int] = Query(100),
    status: Optional[EquipmentStatus] = None,
    category_id: Optional[int] = None,
    query: Optional[str] = None,
    available_from: Optional[datetime] = None,
    available_to: Optional[datetime] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    include_deleted: bool = Query(
        False, description='Whether to include deleted equipment'
    ),
    db: AsyncSession = Depends(get_db),
) -> List[EquipmentResponse]:
    """Get list of equipment with optional filtering."""
    try:
        # Validate pagination parameters manually to ensure 422 status code
        if skip is None or skip < 0:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail='Skip parameter must be a non-negative integer',
            )
        if limit is None or limit < 1:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail='Limit parameter must be a positive integer',
            )
        if limit > 1000:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail='Limit parameter must be less than or equal to 1000',
            )

        # Parse date range if provided
        if start_date and end_date:
            try:
                available_from = datetime.fromisoformat(start_date).replace(
                    tzinfo=timezone.utc
                )
                available_to = datetime.fromisoformat(end_date).replace(
                    tzinfo=timezone.utc
                )
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail='Invalid date format. Use ISO format (YYYY-MM-DD)',
                )

            # Validate date range
            if available_from >= available_to:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail='Start date must be before end date',
                )

        # Validate query parameter length
        if query and len(query) > 255:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail='Search query is too long. Maximum length is 255 characters.',
            )

        # Get equipment list
        equipment_service = EquipmentService(db)
        equipment_list = await equipment_service.get_equipment_list(
            skip=skip,
            limit=limit,
            status=status,
            category_id=category_id,
            query=query,
            available_from=available_from,
            available_to=available_to,
            include_deleted=include_deleted,
        )
        return equipment_list
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@typed_get(
    equipment_router,
    '/paginated',
    response_model=Page[EquipmentResponse],
    summary='Get Paginated Equipment List',
)
async def get_equipment_list_paginated(
    params: Params = Depends(),
    status: Optional[EquipmentStatus] = Query(None, description='Filter by status'),
    category_id: Optional[int] = Query(None, description='Filter by category ID'),
    query: Optional[str] = Query(
        None, description='Search by name, description, barcode, serial number'
    ),
    available_from: Optional[datetime] = Query(
        None, description='Filter by availability start date (ISO format)'
    ),
    available_to: Optional[datetime] = Query(
        None, description='Filter by availability end date (ISO format)'
    ),
    include_deleted: bool = Query(
        False, description='Whether to include deleted equipment'
    ),
    db: AsyncSession = Depends(get_db),
) -> Page[EquipmentResponse]:
    """Get paginated list of equipment with optional filtering and search."""
    try:
        if available_from and available_to and available_from >= available_to:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail='Start date must be before end date',
            )

        if query and len(query) > 255:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail='Search query is too long. Maximum length is 255 characters.',
            )

        if available_from and available_from.tzinfo is None:
            available_from = available_from.replace(tzinfo=timezone.utc)
        if available_to and available_to.tzinfo is None:
            available_to = available_to.replace(tzinfo=timezone.utc)

        equipment_service = EquipmentService(db)

        equipment_query = await equipment_service.get_equipment_list_query(
            status=status,
            category_id=category_id,
            query=query,
            available_from=available_from,
            available_to=available_to,
            include_deleted=include_deleted,
        )

        result = await paginate(db, equipment_query, params)
        return cast(Page[EquipmentResponse], result)

    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'An unexpected error occurred: {e}',
        ) from e


@typed_get(
    equipment_router,
    '/{equipment_id}',
    response_model=EquipmentResponse,
)
async def get_equipment(
    equipment_id: int,
    db: AsyncSession = Depends(get_db),
) -> EquipmentResponse:
    """Get equipment by ID."""
    try:
        service = EquipmentService(db)
        equipment = await service.get_equipment(equipment_id)

        # Create a dictionary with all required fields
        equipment_dict = {
            'id': equipment.id,
            'name': equipment.name,
            'description': equipment.description,
            'category_id': equipment.category_id,
            'barcode': equipment.barcode,
            'serial_number': equipment.serial_number,
            'replacement_cost': equipment.replacement_cost,
            'status': equipment.status,
            'created_at': equipment.created_at,
            'updated_at': equipment.updated_at,
            'category_name': (
                equipment.category.name if equipment.category else 'Без категории'
            ),
        }

        # Add category information if available
        if equipment.category:
            equipment_dict['category'] = {
                'id': equipment.category.id,
                'name': equipment.category.name,
            }

        return EquipmentResponse.model_validate(equipment_dict)
    except NotFoundError:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail='Equipment not found',
        )
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_put(
    equipment_router,
    '/{equipment_id}',
    response_model=EquipmentResponse,
)
async def update_equipment(
    equipment_id: int,
    equipment: EquipmentUpdate,
    db: AsyncSession = Depends(get_db),
) -> EquipmentResponse:
    """Update equipment by ID."""
    try:
        # Validate replacement cost
        if equipment.replacement_cost is not None and equipment.replacement_cost < 0:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail='Replacement cost must be greater than or equal to 0',
            )

        service = EquipmentService(db)

        # Get current equipment to check status transition
        if equipment.status is not None:
            current_equipment = await service.get_equipment(equipment_id)

            # Validate status transition
            if current_equipment.status != equipment.status:
                # Check if transition is valid
                if equipment.status == EquipmentStatus.RENTED:
                    # Check if equipment is available for rent
                    is_available = await service.check_availability(
                        equipment_id,
                        datetime.now(),
                        datetime.now() + timedelta(days=1),
                    )
                    if not is_available:
                        raise HTTPException(
                            status_code=http_status.HTTP_400_BAD_REQUEST,
                            detail=(
                                'Invalid status transition: '
                                'Equipment is not available for rent'
                            ),
                        )

                # Add other status transition validations as needed
                if (
                    current_equipment.status == EquipmentStatus.MAINTENANCE
                    and equipment.status == EquipmentStatus.RENTED
                ):
                    raise HTTPException(
                        status_code=http_status.HTTP_400_BAD_REQUEST,
                        detail=(
                            'Invalid status transition: '
                            'Cannot rent equipment under maintenance'
                        ),
                    )

                # Validate that equipment can only be marked as RENTED through a booking
                if equipment.status == EquipmentStatus.RENTED:
                    raise HTTPException(
                        status_code=http_status.HTTP_400_BAD_REQUEST,
                        detail=(
                            'Invalid status transition: '
                            'Equipment can only be rented through a booking'
                        ),
                    )

        # Update equipment
        try:
            # Convert model to dict and update equipment
            equipment_data = equipment.model_dump(exclude_unset=True)

            replacement_cost_value = None
            if (
                'replacement_cost' in equipment_data
                and equipment_data['replacement_cost'] is not None
            ):
                replacement_cost_value = equipment_data['replacement_cost']

            updated_equipment = await service.update_equipment(
                equipment_id,
                name=equipment_data.get('name'),
                description=equipment_data.get('description'),
                replacement_cost=replacement_cost_value,
                barcode=equipment_data.get('barcode'),
                serial_number=equipment_data.get('serial_number'),
                category_id=equipment_data.get('category_id'),
                status=equipment_data.get('status'),
            )
            return EquipmentResponse.model_validate(updated_equipment)
        except NotFoundError as e:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        except BusinessError as e:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f'Invalid data: {str(e)}',
        )


@typed_delete(
    equipment_router,
    '/{equipment_id}',
    status_code=http_status.HTTP_204_NO_CONTENT,
)
async def delete_equipment(
    equipment_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete equipment by ID."""
    try:
        # Check if equipment has active bookings
        booking_service = BookingService(db)
        bookings = await booking_service.get_by_equipment(equipment_id)

        # Filter for active, pending, or confirmed bookings
        active_bookings = [
            b
            for b in bookings
            if b.booking_status
            in [BookingStatus.ACTIVE, BookingStatus.PENDING, BookingStatus.CONFIRMED]
        ]

        if active_bookings:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=(
                    f'Equipment with ID {equipment_id} has active bookings '
                    'and cannot be deleted'
                ),
            )

        # If no active bookings, proceed with deletion
        equipment_service = EquipmentService(db)
        await equipment_service.delete_equipment(equipment_id)
    except NotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@typed_get(
    equipment_router,
    '/barcode/{barcode}',
    response_model=EquipmentResponse,
)
async def get_equipment_by_barcode(
    barcode: str,
    db: AsyncSession = Depends(get_db),
) -> EquipmentResponse:
    """Get equipment by barcode.

    Args:
        barcode: Equipment barcode
        db: Database session

    Returns:
        Equipment data

    Raises:
        HTTPException: If equipment not found
    """
    try:
        service = EquipmentService(db)
        equipment = await service.get_by_barcode(barcode)
        if not equipment:
            raise NotFoundError(
                f'Equipment with barcode {barcode} not found',
                details={'barcode': barcode},
            )
        return EquipmentResponse.model_validate(equipment)
    except BusinessError as e:
        if isinstance(e, NotFoundError):
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=str(e),
            ) from e
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_put(
    equipment_router,
    '/{equipment_id}/status',
    response_model=EquipmentResponse,
)
async def change_equipment_status(
    equipment_id: int,
    status: EquipmentStatus,
    db: AsyncSession = Depends(get_db),
) -> EquipmentResponse:
    """Change equipment status.

    Args:
        equipment_id: Equipment ID
        status: New equipment status
        db: Database session

    Returns:
        Updated equipment

    Raises:
        HTTPException: If invalid status or equipment not found
    """
    if status not in EquipmentStatus:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f'Invalid status: {status}',
        )

    try:
        service = EquipmentService(db)
        return await service.change_status(equipment_id, status)
    except ValidationError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except NotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except StateError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_post(
    equipment_router,
    '/{equipment_id}/regenerate-barcode',
    response_model=EquipmentResponse,
)
async def regenerate_equipment_barcode(
    equipment_id: int,
    request: Optional[RegenerateBarcodeRequest] = None,
    db: AsyncSession = Depends(get_db),
) -> EquipmentResponse:
    """Regenerate barcode for equipment.

    Args:
        equipment_id: Equipment ID
        request: Empty request, kept for backwards compatibility
        db: Database session

    Returns:
        Updated equipment with new barcode

    Raises:
        HTTPException: If equipment not found or validation fails
    """
    try:
        service = EquipmentService(db)
        updated_equipment = await service.regenerate_barcode(
            equipment_id=equipment_id,
        )

        return updated_equipment
    except BusinessError as e:
        if isinstance(e, NotFoundError):
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=str(e),
            ) from e
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_get(
    equipment_router,
    '/{equipment_id}/bookings',
    response_model=List[BookingResponse],
)
async def get_equipment_bookings(
    equipment_id: int,
    db: AsyncSession = Depends(get_db),
) -> List[BookingResponse]:
    """Get bookings for a specific equipment item.

    Args:
        equipment_id: Equipment ID
        db: Database session

    Returns:
        List of bookings for the specified equipment

    Raises:
        HTTPException: If equipment not found
    """
    try:
        service = EquipmentService(db)
        # Verify equipment exists
        equipment = await service.get_equipment(equipment_id)
        if not equipment:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f'Equipment with ID {equipment_id} not found',
            )

        # Get equipment bookings using the service
        # The repository now loads client, project, AND equipment
        booking_service = BookingService(db)
        bookings = await booking_service.get_by_equipment(equipment_id)

        # Use the helper function to correctly format the response
        return [_booking_to_response(booking) for booking in bookings]
    except NotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to retrieve bookings: {str(e)}',
        ) from e


@typed_get(
    equipment_router,
    '/{equipment_id}/timeline',
    response_model=List[StatusTimelineResponse],
)
async def get_equipment_status_timeline(
    equipment_id: int,
    db: AsyncSession = Depends(get_db),
) -> List[StatusTimelineResponse]:
    """Get status timeline for a specific equipment item.

    Args:
        equipment_id: Equipment ID
        db: Database session

    Returns:
        Status timeline for the specified equipment

    Raises:
        HTTPException: If equipment not found
    """
    try:
        service = EquipmentService(db)
        # Verify equipment exists
        equipment = await service.get_equipment(equipment_id)
        if not equipment:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f'Equipment with ID {equipment_id} not found',
            )

        # For now, return a mock timeline since we don't have a dedicated method yet
        # In a real implementation, we would have a service method like
        # get_status_timeline
        return [
            StatusTimelineResponse(
                id=1,
                equipment_id=equipment_id,
                status=equipment.status,
                timestamp=datetime.now(),
                notes='Current status',
            )
        ]
    except NotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except Exception as e:
        # Log the exception
        print(f'Error checking equipment availability: {str(e)}')
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Error checking equipment availability: {str(e)}',
        ) from e


@typed_patch(
    equipment_router,
    '/{equipment_id}/notes',
    response_model=EquipmentResponse,
)
async def update_equipment_notes(
    equipment_id: int,
    notes: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
) -> EquipmentResponse:
    """Update equipment notes.

    Args:
        equipment_id: Equipment ID
        notes: New notes text
        db: Database session

    Returns:
        Updated equipment

    Raises:
        HTTPException: If equipment not found
    """
    try:
        service = EquipmentService(db)

        # Update equipment notes
        updated_equipment = await service.update_equipment(
            equipment_id,
            notes=notes,
        )

        return EquipmentResponse.model_validate(updated_equipment)
    except NotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to update notes: {str(e)}',
        ) from e


@typed_get(
    equipment_router,
    '/{equipment_id}/availability',
    response_model=EquipmentAvailabilityResponse,
)
async def check_equipment_availability(
    equipment_id: int,
    start_date: str,
    end_date: str,
    db: AsyncSession = Depends(get_db),
) -> EquipmentAvailabilityResponse:
    """Check equipment availability for a given date range.

    Args:
        equipment_id: Equipment ID
        start_date: Start date in ISO format (YYYY-MM-DD)
        end_date: End date in ISO format (YYYY-MM-DD)
        db: Database session

    Returns:
        Equipment availability information including any conflicts

    Raises:
        HTTPException: If dates are invalid or equipment not found
    """
    # Parse dates
    try:
        # Add timezone info to make them timezone-aware (UTC)
        start_date_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
        end_date_dt = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail='Invalid date format. Use ISO format (YYYY-MM-DD)',
        )

    # Validate date range
    if start_date_dt >= end_date_dt:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail='Start date must be before end date',
        )

    # Get equipment service
    equipment_service = EquipmentService(db)
    booking_service = BookingService(db)

    try:
        # Check if equipment exists
        equipment = await equipment_service.get_equipment(equipment_id)

        # Check if equipment is in a bookable status
        bookable_statuses = [EquipmentStatus.AVAILABLE]
        if equipment.status not in bookable_statuses:
            status_msg = (
                f'Equipment is {equipment.status.value} ' 'and cannot be booked'
            )
            return EquipmentAvailabilityResponse(
                equipment_id=equipment_id,
                is_available=False,
                equipment_status=equipment.status,
                conflicts=[],
                message=status_msg,
            )

        # Check availability for the given date range
        is_available = await equipment_service.check_availability(
            equipment_id=equipment_id,
            start_date=start_date_dt,
            end_date=end_date_dt,
        )

        # If available, return response
        if is_available:
            return EquipmentAvailabilityResponse(
                equipment_id=equipment_id,
                is_available=True,
                equipment_status=equipment.status,
                conflicts=[],
                message='Equipment is available for the specified date range',
            )

        # Get conflicting bookings
        conflicting_bookings = await booking_service.get_by_equipment(
            equipment_id=equipment_id,
        )

        # Filter active bookings that conflict with the requested period
        conflicts = []
        for booking in conflicting_bookings:
            # Skip non-active bookings
            if hasattr(booking, 'booking_status'):
                status = booking.booking_status
            elif hasattr(booking, 'status'):
                status = booking.status
            else:
                continue

            if status not in [
                BookingStatus.ACTIVE,
                BookingStatus.CONFIRMED,
                BookingStatus.PENDING,
            ]:
                continue

            # Check for date overlap
            if booking.start_date <= end_date_dt and booking.end_date >= start_date_dt:
                # Add project information if available
                project_id = None
                project_name = None
                if hasattr(booking, 'project') and booking.project:
                    project_id = booking.project.id
                    project_name = booking.project.name

                conflict = BookingConflictInfo(
                    booking_id=booking.id,
                    start_date=booking.start_date.isoformat(),
                    end_date=booking.end_date.isoformat(),
                    status=status,
                    project_id=project_id,
                    project_name=project_name,
                )

                conflicts.append(conflict)

        # Return unavailable response with conflicts
        return EquipmentAvailabilityResponse(
            equipment_id=equipment_id,
            is_available=False,
            equipment_status=equipment.status,
            conflicts=conflicts,
            message='Equipment is not available for the specified date range',
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except ValidationError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        # Log the exception
        print(f'Error checking equipment availability: {str(e)}')
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Error checking equipment availability: {str(e)}',
        ) from e
