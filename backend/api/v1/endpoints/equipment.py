"""Equipment endpoints module.

This module implements API endpoints for managing rental equipment.
It provides routes for adding, updating, and retrieving equipment items,
including their specifications, availability, and rental rates.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.decorators import typed_delete, typed_get, typed_post, typed_put
from backend.core.database import get_db
from backend.exceptions import BusinessError, NotFoundError, StateError
from backend.models import EquipmentStatus
from backend.schemas import EquipmentCreate, EquipmentResponse, EquipmentUpdate
from backend.services import EquipmentService

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
    skip: int = Query(0, ge=0),
    limit: int = Query(100, gt=0, le=1000),
    status: Optional[str] = None,
    category_id: Optional[int] = None,
    query: Optional[str] = None,
    available_from: Optional[datetime] = None,
    available_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
) -> List[EquipmentResponse]:
    """Get list of equipment with optional filtering and search.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        status: Filter by equipment status
        category_id: Filter by category ID
        query: Search query for name, description, barcode, or serial number
        available_from: Filter by availability start date
        available_to: Filter by availability end date
        db: Database session

    Returns:
        List of equipment items
    """
    try:
        # Validate dates if both are provided
        if available_from and available_to and available_from >= available_to:
            raise BusinessError(
                'Start date must be before end date',
                details={
                    'available_from': available_from.isoformat(),
                    'available_to': available_to.isoformat(),
                },
            )

        service = EquipmentService(db)

        # Convert status string to enum if provided
        equipment_status = EquipmentStatus(status) if status else None

        # If search query is provided and long enough, use search
        if query and len(query) >= 3:
            equipment_list = await service.search(query)
            # Apply additional filters after search
            if equipment_status:
                filtered_list = [
                    e for e in equipment_list if e.status == equipment_status
                ]
                equipment_list = filtered_list
            if category_id:
                filtered_list = [
                    e for e in equipment_list if e.category_id == category_id
                ]
                equipment_list = filtered_list
            # Apply pagination
            return equipment_list[skip : skip + limit]
        else:
            # Use regular list with filters
            equipment_list = await service.get_equipment_list(
                skip=skip,
                limit=limit,
                status=equipment_status,
                category_id=category_id,
                available_from=available_from,
                available_to=available_to,
            )
            return equipment_list
    except ValueError as e:
        status_values = [s.value for s in EquipmentStatus]
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'Invalid status value: {status}. Must be one of: {status_values}',
        ) from e
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
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
    """Update equipment.

    Args:
        equipment_id: Equipment ID
        equipment: Updated equipment data
        db: Database session

    Returns:
        Updated equipment

    Raises:
        HTTPException: If equipment not found or validation error
    """
    try:
        service = EquipmentService(db)
        updated = await service.update_equipment(
            equipment_id,
            name=equipment.name,
            description=equipment.description,
            daily_rate=float(equipment.daily_rate) if equipment.daily_rate else None,
            replacement_cost=(
                float(equipment.replacement_cost)
                if equipment.replacement_cost
                else None
            ),
            barcode=equipment.barcode,
            serial_number=equipment.serial_number,
            status=equipment.status,
        )
        return EquipmentResponse.model_validate(updated.__dict__)
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


@typed_delete(
    equipment_router,
    '/{equipment_id}',
    status_code=http_status.HTTP_204_NO_CONTENT,
)
async def delete_equipment(
    equipment_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete equipment.

    Args:
        equipment_id: Equipment ID
        db: Database session

    Raises:
        HTTPException: If equipment not found or has active bookings
    """
    try:
        service = EquipmentService(db)
        await service.delete_equipment(equipment_id)
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
