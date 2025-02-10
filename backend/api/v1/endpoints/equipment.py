"""Equipment endpoints module.

This module implements API endpoints for managing rental equipment.
It provides routes for adding, updating, and retrieving equipment items,
including their specifications, availability, and rental rates.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.decorators import typed_delete, typed_get, typed_post, typed_put
from backend.core.database import get_db
from backend.exceptions import BusinessError, NotFoundError
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
            notes=equipment.notes,
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
    status: Optional[EquipmentStatus] = None,
    category_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
) -> List[EquipmentResponse]:
    """Get list of equipment."""
    try:
        service = EquipmentService(db)
        equipment_list = await service.get_equipment_list(
            skip=skip,
            limit=limit,
            status=status,
            category_id=category_id,
        )
        return [EquipmentResponse.model_validate(e) for e in equipment_list]
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
        return EquipmentResponse.model_validate(equipment)
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
            notes=equipment.notes,
            status=equipment.status,
        )
        return EquipmentResponse.model_validate(updated)
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


@typed_get(
    equipment_router,
    '/search/{query}',
    response_model=List[EquipmentResponse],
)
async def search_equipment(
    query: str,
    db: AsyncSession = Depends(get_db),
) -> List[EquipmentResponse]:
    """Search equipment by name, description, barcode, or serial number.

    Args:
        query: Search query
        db: Database session

    Returns:
        List of matching equipment

    Raises:
        HTTPException: If query is too short
    """
    if len(query) < 3:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail='Search query must be at least 3 characters long',
        )

    try:
        service = EquipmentService(db)
        equipment_list = await service.search(query)
        return [EquipmentResponse.model_validate(e) for e in equipment_list]
    except BusinessError as e:
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
        return EquipmentResponse.model_validate(equipment)
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
