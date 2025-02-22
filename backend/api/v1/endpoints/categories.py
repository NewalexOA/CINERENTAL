"""Categories endpoints module.

This module implements API endpoints for managing equipment categories.
It provides routes for creating, retrieving, updating, and deleting
categories, as well as managing their hierarchical relationships.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.decorators import typed_delete, typed_get, typed_post, typed_put
from backend.core.database import get_db
from backend.exceptions import BusinessError
from backend.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    CategoryWithEquipmentCount,
)
from backend.services import CategoryService

categories_router: APIRouter = APIRouter()


@typed_post(
    categories_router,
    '/',
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
    category: CategoryCreate,
    db: AsyncSession = Depends(get_db),
) -> CategoryResponse:
    """Create a new category.

    Args:
        category: Category data
        db: Database session

    Returns:
        Created category

    Raises:
        HTTPException: If category with given name already exists
    """
    try:
        service = CategoryService(db)
        db_category = await service.create_category(
            name=category.name,
            description=category.description or '',
            parent_id=None,
        )
        return CategoryResponse.model_validate(db_category)
    except BusinessError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_get(
    categories_router,
    '/',
    response_model=List[CategoryResponse],
)
async def get_categories(
    session: AsyncSession = Depends(get_db),
) -> List[CategoryResponse]:
    """Get all categories.

    Args:
        session: Database session

    Returns:
        List of all categories
    """
    service = CategoryService(session)
    categories = await service.get_categories()
    return [CategoryResponse.model_validate(cat) for cat in categories]


@typed_get(
    categories_router,
    '/with-equipment-count',
    response_model=List[CategoryWithEquipmentCount],
)
async def get_categories_with_equipment_count(
    session: AsyncSession = Depends(get_db),
) -> List[CategoryWithEquipmentCount]:
    """Get all categories with equipment count.

    Args:
        session: Database session

    Returns:
        List of categories with equipment count
    """
    service = CategoryService(session)
    categories = await service.get_with_equipment_count()
    return [CategoryWithEquipmentCount.model_validate(cat) for cat in categories]


@typed_get(
    categories_router,
    '/{category_id}',
    response_model=CategoryResponse,
)
async def get_category(
    category_id: int,
    session: AsyncSession = Depends(get_db),
) -> CategoryResponse:
    """Get category by ID.

    Args:
        category_id: Category ID
        session: Database session

    Returns:
        Category data

    Raises:
        HTTPException: If category not found
    """
    service = CategoryService(session)
    category = await service.get_category(category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Category with ID {category_id} not found',
        )
    return CategoryResponse.model_validate(category)


@typed_put(
    categories_router,
    '/{category_id}',
    response_model=CategoryResponse,
)
async def update_category(
    category_id: int,
    category: CategoryUpdate,
    session: AsyncSession = Depends(get_db),
) -> CategoryResponse:
    """Update category.

    Args:
        category_id: Category ID
        category: Updated category data
        session: Database session

    Returns:
        Updated category

    Raises:
        HTTPException: If category not found or if new name already exists
    """
    service = CategoryService(session)
    try:
        db_category = await service.update_category(
            category_id=category_id,
            name=category.name,
            description=category.description,
            parent_id=category.parent_id,
        )
        return CategoryResponse.model_validate(db_category)
    except BusinessError as e:
        if 'not found' in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            ) from e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_delete(
    categories_router,
    '/{category_id}',
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_category(
    category_id: int,
    session: AsyncSession = Depends(get_db),
) -> None:
    """Delete category.

    Args:
        category_id: Category ID
        session: Database session

    Raises:
        HTTPException: If category not found or has equipment/subcategories
    """
    service = CategoryService(session)
    try:
        success = await service.delete_category(category_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f'Category with ID {category_id} not found',
            )
    except BusinessError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_get(
    categories_router,
    '/search/{query}',
    response_model=List[CategoryResponse],
)
async def search_categories(
    query: str,
    session: AsyncSession = Depends(get_db),
) -> List[CategoryResponse]:
    """Search categories by name or description.

    Args:
        query: Search query string
        session: Database session

    Returns:
        List of matching categories
    """
    service = CategoryService(session)
    categories = await service.search_categories(query)
    return [CategoryResponse.model_validate(cat) for cat in categories]
