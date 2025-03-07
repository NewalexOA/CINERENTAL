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
from backend.schemas import EquipmentResponse
from backend.services import CategoryService, EquipmentService

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

    # Transform data for template
    equipment_data = []
    for item in equipment_list:
        equipment_response = EquipmentResponse.model_validate(item.__dict__)
        item_dict = equipment_response.model_dump()
        # Use category_name directly from EquipmentResponse
        item_dict['category_name'] = item_dict.get('category_name', 'Без категории')

        # Handle status display
        status = item_dict['status']
        item_dict['status'] = status.value if status is not None else None
        equipment_data.append(item_dict)

    return templates.TemplateResponse(
        'equipment/list.html',
        {
            'request': request,
            'equipment_list': equipment_data,
            'categories': [category.model_dump() for category in categories],
            'current_category_id': category_id,
            'current_status': status.value if status else None,
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

    return templates.TemplateResponse(
        'equipment/detail.html',
        {
            'request': request,
            'equipment': EquipmentResponse.model_validate(equipment_dict).model_dump(),
        },
    )
