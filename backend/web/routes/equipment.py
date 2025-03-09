"""Equipment web routes module.

This module defines routes for the equipment web interface.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
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
) -> _TemplateResponse:
    """Render equipment detail page.

    Args:
        request: FastAPI request
        equipment_id: Equipment ID
        db: Database session

    Returns:
        _TemplateResponse: Rendered template
    """
    equipment_service = EquipmentService(db)
    equipment = await equipment_service.get_equipment(equipment_id)

    # Transform equipment data for template with full category info
    equipment_data = prepare_equipment_data(equipment, include_full_category=True)

    return templates.TemplateResponse(
        'equipment/detail.html',
        {
            'request': request,
            'equipment': equipment_data,
        },
    )
