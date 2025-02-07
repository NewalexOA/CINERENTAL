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

from backend.api.dependencies import get_db
from backend.api.v1.decorators import typed_delete, typed_get, typed_post, typed_put
from backend.exceptions import BusinessError, NotFoundError
from backend.models.equipment import EquipmentStatus
from backend.schemas.equipment import (
    EquipmentCreate,
    EquipmentResponse,
    EquipmentUpdate,
    EquipmentWithCategory,
)
from backend.services.equipment import EquipmentService

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
    service = EquipmentService(db)
    try:
        data = equipment.model_dump()
        db_equipment = await service.create_equipment(
            name=data['name'],
            description=data['description'],
            category_id=data['category_id'],
            barcode=data['barcode'],
            serial_number=data['serial_number'],
            daily_rate=float(data['daily_rate']),
            replacement_cost=float(data['replacement_cost']),
            notes=data['notes'],
        )
        return EquipmentResponse.model_validate(db_equipment)
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_get(
    equipment_router,
    '/',
    response_model=List[EquipmentWithCategory],
)
async def get_equipment_list(
    category_id: Optional[int] = None,
    equipment_status: Optional[EquipmentStatus] = None,
    available_from: Optional[datetime] = None,
    available_to: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    session: AsyncSession = Depends(get_db),
) -> List[EquipmentWithCategory]:
    """Get equipment list with optional filtering.

    Args:
        category_id: Filter by category ID
        equipment_status: Filter by equipment status
        available_from: Filter by availability start date
        available_to: Filter by availability end date
        skip: Number of records to skip
        limit: Maximum number of records to return
        session: Database session

    Returns:
        List of equipment items

    Raises:
        HTTPException: If validation fails
    """
    service = EquipmentService(session)
    try:
        equipment_list = await service.get_equipment_list(
            category_id=category_id,
            status=equipment_status,
            available_from=available_from,
            available_to=available_to,
            skip=skip,
            limit=limit,
        )
        return [EquipmentWithCategory.model_validate(eq) for eq in equipment_list]
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_get(
    equipment_router,
    '/{equipment_id}',
    response_model=EquipmentWithCategory,
)
async def get_equipment_by_id(
    equipment_id: int,
    session: AsyncSession = Depends(get_db),
) -> EquipmentWithCategory:
    """Get equipment by ID.

    Args:
        equipment_id: Equipment ID
        session: Database session

    Returns:
        Equipment data

    Raises:
        HTTPException: If equipment not found
    """
    service = EquipmentService(session)
    try:
        equipment = await service.get_equipment(equipment_id)
        if not equipment:
            raise NotFoundError(
                f'Equipment with ID {equipment_id} not found',
                details={'equipment_id': equipment_id},
            )
        return EquipmentWithCategory.model_validate(equipment)
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
    '/{equipment_id}',
    response_model=EquipmentResponse,
)
async def update_equipment(
    equipment_id: int,
    equipment: EquipmentUpdate,
    session: AsyncSession = Depends(get_db),
) -> EquipmentResponse:
    """Update equipment.

    Args:
        equipment_id: Equipment ID
        equipment: Updated equipment data
        session: Database session

    Returns:
        Updated equipment

    Raises:
        HTTPException: If equipment not found or validation error
    """
    service = EquipmentService(session)
    try:
        db_equipment = await service.update_equipment(
            equipment_id=equipment_id,
            **equipment.model_dump(exclude_unset=True),
        )
        return EquipmentResponse.model_validate(db_equipment)
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


@typed_delete(
    equipment_router,
    '/{equipment_id}',
    status_code=http_status.HTTP_204_NO_CONTENT,
)
async def delete_equipment(
    equipment_id: int,
    session: AsyncSession = Depends(get_db),
) -> None:
    """Delete equipment.

    Args:
        equipment_id: Equipment ID
        session: Database session

    Raises:
        HTTPException: If equipment not found or has active bookings
    """
    service = EquipmentService(session)
    try:
        success = await service.delete_equipment(equipment_id)
        if not success:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f'Equipment with ID {equipment_id} not found',
            )
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
    '/barcode/{barcode}',
    response_model=EquipmentWithCategory,
)
async def get_equipment_by_barcode(
    barcode: str,
    session: AsyncSession = Depends(get_db),
) -> EquipmentWithCategory:
    """Get equipment by barcode.

    Args:
        barcode: Equipment barcode
        session: Database session

    Returns:
        Equipment data

    Raises:
        HTTPException: If equipment not found
    """
    service = EquipmentService(session)
    try:
        equipment = await service.get_by_barcode(barcode)
        if not equipment:
            raise NotFoundError(
                f'Equipment with barcode {barcode} not found',
                details={'barcode': barcode},
            )
        return EquipmentWithCategory.model_validate(equipment)
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
    response_model=List[EquipmentWithCategory],
)
async def search_equipment(
    query: str,
    session: AsyncSession = Depends(get_db),
) -> List[EquipmentWithCategory]:
    """Search equipment by name or description.

    Args:
        query: Search query
        session: Database session

    Returns:
        List of matching equipment
    """
    service = EquipmentService(session)
    try:
        equipment_list = await service.search_equipment(query)
        return [EquipmentWithCategory.model_validate(eq) for eq in equipment_list]
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
async def update_equipment_status(
    equipment_id: int,
    status_update: EquipmentStatus,
    db: AsyncSession = Depends(get_db),
) -> EquipmentResponse:
    """Update equipment status.

    Args:
        equipment_id: Equipment ID
        status_update: New equipment status
        db: Database session

    Returns:
        Updated equipment

    Raises:
        HTTPException: If invalid status or equipment not found
    """
    if status_update not in EquipmentStatus:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f'Invalid status: {status_update}',
        )

    service = EquipmentService(db)
    try:
        db_equipment = await service.change_status(equipment_id, status_update)
        return EquipmentResponse.model_validate(db_equipment)
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
