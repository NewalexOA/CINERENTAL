"""Equipment endpoints module.

This module implements API endpoints for managing rental equipment.
It provides routes for adding, updating, and retrieving equipment items,
including their specifications, availability, and rental rates.
"""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.decorators import typed_delete, typed_get, typed_post, typed_put
from backend.core.database import get_db
from backend.exceptions import BusinessError, NotFoundError, StateError
from backend.models import BookingStatus, EquipmentStatus
from backend.schemas import EquipmentCreate, EquipmentResponse, EquipmentUpdate
from backend.services import BookingService, EquipmentService

equipment_router: APIRouter = APIRouter()


@typed_post(
    equipment_router,
    '/',
    response_model=EquipmentResponse,
    status_code=http_status.HTTP_201_CREATED,
)
async def create_equipment(
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
        HTTPException: If equipment with given barcode already exists
    """
    try:
        # Validate rates
        if float(equipment.daily_rate) <= 0:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail='Daily rate must be greater than 0',
            )
        if float(equipment.replacement_cost) <= 0:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail='Replacement cost must be greater than 0',
            )

        service = EquipmentService(db)
        return await service.create_equipment(
            name=equipment.name,
            description=equipment.description,
            category_id=equipment.category_id,
            barcode=equipment.barcode,
            serial_number=equipment.serial_number,
            daily_rate=float(equipment.daily_rate),
            replacement_cost=float(equipment.replacement_cost),
        )
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
    min_rate: Optional[str] = None,
    max_rate: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> List[EquipmentResponse]:
    """Get list of equipment with optional filtering."""
    try:
        # Validate pagination parameters manually to ensure 422 status code
        if skip is None or skip < 0:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=[
                    {
                        'loc': ['query', 'skip'],
                        'msg': 'Input should be greater than or equal to 0',
                        'type': 'value_error',
                    }
                ],
            )
        if limit is None or limit <= 0:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=[
                    {
                        'loc': ['query', 'limit'],
                        'msg': 'Input should be greater than 0',
                        'type': 'value_error',
                    }
                ],
            )
        if limit > 1000:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=[
                    {
                        'loc': ['query', 'limit'],
                        'msg': 'Input should be less than or equal to 1000',
                        'type': 'value_error',
                    }
                ],
            )

        # Validate date parameters
        if start_date or end_date:
            try:
                if start_date:
                    available_from = datetime.fromisoformat(start_date)
                if end_date:
                    available_to = datetime.fromisoformat(end_date)
                if available_from and available_to and available_from >= available_to:
                    raise HTTPException(
                        status_code=http_status.HTTP_400_BAD_REQUEST,
                        detail='Start date must be before end date',
                    )
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail='Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)',
                )

        # Validate rate parameters
        min_rate_float = None
        max_rate_float = None

        # Validate query parameter length
        if query and len(query) > 255:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail='Search query is too long. Maximum length is 255 characters.',
            )

        if min_rate or max_rate:
            try:
                if min_rate:
                    min_rate_float = float(min_rate)
                    if min_rate_float < 0:
                        raise ValueError('Minimum rate cannot be negative')
                if max_rate:
                    max_rate_float = float(max_rate)
                    if max_rate_float < 0:
                        raise ValueError('Maximum rate cannot be negative')
                if (
                    min_rate_float
                    and max_rate_float
                    and min_rate_float > max_rate_float
                ):
                    raise ValueError('Minimum rate cannot be greater than maximum rate')
            except ValueError as e:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail=f'Invalid rate format: {str(e)}',
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
        )
        return [EquipmentResponse.model_validate(e.__dict__) for e in equipment_list]
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
        return EquipmentResponse.model_validate(equipment.__dict__)
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
        # Validate rate and replacement cost
        if equipment.daily_rate is not None and float(equipment.daily_rate) <= 0:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail='Daily rate must be greater than 0',
            )
        if (
            equipment.replacement_cost is not None
            and float(equipment.replacement_cost) <= 0
        ):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail='Replacement cost must be greater than 0',
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

            daily_rate_value = None
            if (
                'daily_rate' in equipment_data
                and equipment_data['daily_rate'] is not None
            ):
                daily_rate_value = float(equipment_data['daily_rate'])

            replacement_cost_value = None
            if (
                'replacement_cost' in equipment_data
                and equipment_data['replacement_cost'] is not None
            ):
                replacement_cost_value = float(equipment_data['replacement_cost'])

            updated_equipment = await service.update_equipment(
                equipment_id,
                name=equipment_data.get('name'),
                description=equipment_data.get('description'),
                daily_rate=daily_rate_value,
                replacement_cost=replacement_cost_value,
                barcode=equipment_data.get('barcode'),
                serial_number=equipment_data.get('serial_number'),
                status=equipment_data.get('status'),
            )
            return EquipmentResponse.model_validate(updated_equipment.__dict__)
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
        return EquipmentResponse.model_validate(equipment.__dict__)
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
        equipment = await service.change_status(equipment_id, status)
        return EquipmentResponse.model_validate(equipment.__dict__)
    except NotFoundError:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail='Equipment not found',
        )
    except StateError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=e.details.get('message', str(e)),
        ) from e
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=e.details.get('message', str(e)),
        ) from e
