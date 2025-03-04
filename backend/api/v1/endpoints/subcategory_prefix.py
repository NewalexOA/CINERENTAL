"""Subcategory prefix API module.

This module provides API endpoints for managing subcategory prefixes,
which are used in barcode generation for equipment items.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.exceptions import ConflictError, NotFoundError
from backend.schemas import (
    SubcategoryPrefixCreate,
    SubcategoryPrefixResponse,
    SubcategoryPrefixUpdate,
)
from backend.services import SubcategoryPrefixService

subcategory_prefix_router = APIRouter()

# TODO: Restore get_current_active_user import when its location is determined
# For now, endpoints requiring authentication will need to be modified


@subcategory_prefix_router.post(
    '/',
    response_model=SubcategoryPrefixResponse,
    status_code=status.HTTP_201_CREATED,
    summary='Create subcategory prefix',
    description='Create a new subcategory prefix for barcode generation',
)
async def create_subcategory_prefix(
    subcategory_prefix: SubcategoryPrefixCreate,
    db: AsyncSession = Depends(get_db),
    # current_user: User = Depends(get_current_active_user),
) -> SubcategoryPrefixResponse:
    """Create a new subcategory prefix.

    Args:
        subcategory_prefix: Subcategory prefix data
        db: Database session
        current_user: Current authenticated user (temporarily disabled)

    Returns:
        Created subcategory prefix

    Raises:
        HTTPException: If subcategory prefix creation fails
    """
    service = SubcategoryPrefixService(db)
    try:
        created = await service.create_subcategory_prefix(
            category_id=subcategory_prefix.category_id,
            name=subcategory_prefix.name,
            prefix=subcategory_prefix.prefix,
            description=subcategory_prefix.description,
        )
        return SubcategoryPrefixResponse.model_validate(created)
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@subcategory_prefix_router.get(
    '/',
    response_model=List[SubcategoryPrefixResponse],
    summary='Get subcategory prefixes',
    description='Get list of subcategory prefixes with optional filtering',
)
async def get_subcategory_prefixes(
    category_id: Optional[int] = Query(None, description='Filter by category ID'),
    query: Optional[str] = Query(None, description='Search query'),
    db: AsyncSession = Depends(get_db),
    # current_user: User = Depends(get_current_active_user),
) -> List[SubcategoryPrefixResponse]:
    """Get list of subcategory prefixes.

    Args:
        category_id: Filter by category ID (optional)
        query: Search query (optional)
        db: Database session
        current_user: Current authenticated user (temporarily disabled)

    Returns:
        List of subcategory prefixes
    """
    service = SubcategoryPrefixService(db)
    if query:
        prefixes = await service.search(query, category_id)
    elif category_id:
        prefixes = await service.get_by_category(category_id)
    else:
        prefixes = await service.repository.get_all()

    return [SubcategoryPrefixResponse.model_validate(p) for p in prefixes]


@subcategory_prefix_router.get(
    '/{subcategory_prefix_id}',
    response_model=SubcategoryPrefixResponse,
    summary='Get subcategory prefix',
    description='Get subcategory prefix by ID',
)
async def get_subcategory_prefix(
    subcategory_prefix_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user: User = Depends(get_current_active_user),
) -> SubcategoryPrefixResponse:
    """Get subcategory prefix by ID.

    Args:
        subcategory_prefix_id: Subcategory prefix ID
        db: Database session
        current_user: Current authenticated user (temporarily disabled)

    Returns:
        Subcategory prefix

    Raises:
        HTTPException: If subcategory prefix not found
    """
    service = SubcategoryPrefixService(db)
    prefix = await service.get_subcategory_prefix(subcategory_prefix_id)
    if not prefix:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Subcategory prefix with ID {subcategory_prefix_id} not found',
        )
    return SubcategoryPrefixResponse.model_validate(prefix)


@subcategory_prefix_router.put(
    '/{subcategory_prefix_id}',
    response_model=SubcategoryPrefixResponse,
    summary='Update subcategory prefix',
    description='Update subcategory prefix by ID',
)
async def update_subcategory_prefix(
    subcategory_prefix_id: int,
    subcategory_prefix: SubcategoryPrefixUpdate,
    db: AsyncSession = Depends(get_db),
    # current_user: User = Depends(get_current_active_user),
) -> SubcategoryPrefixResponse:
    """Update subcategory prefix.

    Args:
        subcategory_prefix_id: Subcategory prefix ID
        subcategory_prefix: Updated subcategory prefix data
        db: Database session
        current_user: Current authenticated user (temporarily disabled)

    Returns:
        Updated subcategory prefix

    Raises:
        HTTPException: If subcategory prefix update fails
    """
    service = SubcategoryPrefixService(db)
    try:
        updated = await service.update_subcategory_prefix(
            subcategory_prefix_id=subcategory_prefix_id,
            name=subcategory_prefix.name,
            prefix=subcategory_prefix.prefix,
            description=subcategory_prefix.description,
        )
        return SubcategoryPrefixResponse.model_validate(updated)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@subcategory_prefix_router.delete(
    '/{subcategory_prefix_id}',
    status_code=status.HTTP_204_NO_CONTENT,
    summary='Delete subcategory prefix',
    description='Delete subcategory prefix by ID',
)
async def delete_subcategory_prefix(
    subcategory_prefix_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete subcategory prefix.

    Args:
        subcategory_prefix_id: Subcategory prefix ID
        db: Database session
        current_user: Current authenticated user (temporarily disabled)

    Raises:
        HTTPException: If subcategory prefix not found
    """
    service = SubcategoryPrefixService(db)
    result = await service.delete_subcategory_prefix(subcategory_prefix_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Subcategory prefix with ID {subcategory_prefix_id} not found',
        )
