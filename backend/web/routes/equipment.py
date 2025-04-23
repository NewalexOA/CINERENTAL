"""Equipment web routes module.

This module defines routes for the equipment web interface.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.templating import _TemplateResponse

from backend.core.database import get_db
from backend.core.templates import templates
from backend.models import EquipmentStatus
from backend.services import CategoryService, EquipmentService
from backend.web.routes.utils import (
    get_template_status_value,
    prepare_equipment_data,
    prepare_equipment_list_data,
)

router = APIRouter()


@router.get('/', response_class=HTMLResponse)
async def equipment_list(
    request: Request,
    db: AsyncSession = Depends(get_db),
    category_id: Optional[int] = None,
    status: Optional[EquipmentStatus] = None,
    query: Optional[str] = None,
) -> _TemplateResponse:
    """Render equipment list page.

    Args:
        request: FastAPI request
        db: Database session
        category_id: Optional category filter
        status: Optional status filter
        query: Optional search query

    Returns:
        _TemplateResponse: Rendered template
    """
    equipment_service = EquipmentService(db)
    category_service = CategoryService(db)

    # Get equipment with filters
    equipment_list = await equipment_service.get_equipment_list(
        category_id=category_id,
        status=status,
    )

    # Get all categories for filter dropdown
    categories = await category_service.get_all()

    # Transform data for template using utility function
    equipment_data = prepare_equipment_list_data(equipment_list)

    return templates.TemplateResponse(
        'equipment/list.html',
        {
            'request': request,
            'equipment_list': equipment_data,
            'categories': [category.model_dump() for category in categories],
            'current_category_id': category_id,
            'current_status': get_template_status_value(status),
        },
    )


@router.get('/{equipment_id}', response_class=HTMLResponse)
async def equipment_detail(
    request: Request,
    equipment_id: int,
    db: AsyncSession = Depends(get_db),
    category_id: Optional[int] = None,
) -> _TemplateResponse:
    """Render equipment detail page.

    Args:
        request: FastAPI request
        equipment_id: Equipment ID
        db: Database session
        category_id: Optional category ID to override equipment's category

    Returns:
        _TemplateResponse: Rendered template
    """
    equipment_service = EquipmentService(db)
    equipment = await equipment_service.get_equipment(equipment_id)

    equipment_data = prepare_equipment_data(equipment, include_full_category=True)

    logger.debug(
        f'Original equipment data: category_id={equipment_data.get("category_id")}'
    )

    if category_id is not None:
        try:
            category_service = CategoryService(db)
            category = await category_service.get_category(category_id)

            if category is not None:
                logger.debug(
                    f'Overriding equipment #{equipment_id} category with '
                    f'category #{category_id} ({category.name})'
                )
                equipment_data['category_id'] = category_id
                equipment_data['category'] = {
                    'id': category.id,
                    'name': category.name,
                }
                equipment_data['category_name'] = category.name
            else:
                logger.warning(
                    f'Category #{category_id} not found when overriding '
                    f'equipment #{equipment_id}'
                )
        except Exception as e:
            logger.error(
                f'Error fetching category #{category_id} for equipment '
                f'#{equipment_id}: {str(e)}'
            )
    # Ensure category_name consistency even if not provided in URL
    elif equipment_data.get('category_id') is not None:
        try:
            # Verify that the category actually exists and load its latest data
            category_service = CategoryService(db)
            category = await category_service.get_category(
                equipment_data['category_id']
            )

            if category is not None:
                # Ensure the category data is up-to-date
                equipment_data['category'] = {
                    'id': category.id,
                    'name': category.name,
                }
                equipment_data['category_name'] = category.name
                logger.debug(
                    f'Updated category data for equipment #{equipment_id}, '
                    f'category: {category.name}'
                )
            else:
                # If category doesn't exist, set to None to avoid inconsistency
                logger.warning(
                    f'Category #{equipment_data["category_id"]} not found, '
                    f'resetting equipment #{equipment_id}'
                )
                equipment_data['category_id'] = None
                equipment_data['category'] = None
                equipment_data['category_name'] = 'Без категории'
        except Exception as e:
            logger.error(
                f'Error verifying category #{equipment_data.get("category_id")} '
                f'for equipment #{equipment_id}: {str(e)}'
            )
    else:
        # Explicitly set null category data for consistency
        equipment_data['category_id'] = None
        equipment_data['category'] = None
        equipment_data['category_name'] = 'Без категории'
        logger.debug(f'Equipment #{equipment_id} has no category')

    logger.debug(
        f'Final equipment data: category_id={equipment_data.get("category_id")},'
        f' category_name={equipment_data.get("category_name")}'
    )

    return templates.TemplateResponse(
        'equipment/detail.html',
        {
            'request': request,
            'equipment': equipment_data,
        },
    )
