"""Frontend router module."""

from typing import Annotated, List

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.templating import _TemplateResponse

from backend.core.database import get_db
from backend.core.templates import templates
from backend.schemas.equipment import EquipmentResponse
from backend.services import CategoryService, EquipmentService

web_router = APIRouter()


@web_router.get('/', response_class=HTMLResponse)
async def index(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> _TemplateResponse:
    """Render index page.

    Args:
        request: FastAPI request
        db: Database session

    Returns:
        _TemplateResponse: Rendered template
    """
    equipment_service = EquipmentService(db)
    equipment_list = await equipment_service.get_all()

    return templates.TemplateResponse(
        'index.html',
        {
            'request': request,
            'equipment_list': [item.model_dump() for item in equipment_list],
        },
    )


@web_router.get('/equipment', response_class=HTMLResponse)
async def equipment_list(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> _TemplateResponse:
    """Render equipment list page.

    Args:
        request: FastAPI request
        db: Database session

    Returns:
        _TemplateResponse: Rendered template
    """
    equipment_service = EquipmentService(db)
    equipment_list = await equipment_service.get_all()

    # Transform data for template
    equipment_data = []
    for item in equipment_list:
        item_dict = item.model_dump()
        # Handle category name
        item_dict['category_name'] = item_dict['category']['name']

        # Handle status display
        status = item_dict['status']
        item_dict['status'] = status.value if hasattr(status, 'value') else status
        equipment_data.append(item_dict)

    return templates.TemplateResponse(
        'equipment/list.html',
        {
            'request': request,
            'equipment_list': equipment_data,
        },
    )


@web_router.get('/equipment/{equipment_id}', response_class=HTMLResponse)
async def equipment_detail(
    request: Request,
    equipment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
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

    return templates.TemplateResponse(
        'equipment/detail.html',
        {
            'request': request,
            'equipment': EquipmentResponse.model_validate(equipment).model_dump(),
        },
    )


@web_router.get('/clients', response_class=HTMLResponse)
async def clients_list(request: Request) -> _TemplateResponse:
    """Render clients list page.

    Args:
        request: FastAPI request

    Returns:
        _TemplateResponse: Rendered template
    """
    return templates.TemplateResponse(
        'clients/list.html',
        {'request': request},
    )


@web_router.get('/bookings', response_class=HTMLResponse)
async def bookings_list(request: Request) -> _TemplateResponse:
    """Render bookings list page.

    Args:
        request: FastAPI request

    Returns:
        _TemplateResponse: Rendered template
    """
    return templates.TemplateResponse(
        'bookings/list.html',
        {'request': request},
    )


@web_router.get('/scanner', response_class=HTMLResponse)
async def scanner(request: Request) -> _TemplateResponse:
    """Render scanner page.

    Args:
        request: FastAPI request

    Returns:
        _TemplateResponse: Rendered template
    """
    return templates.TemplateResponse(
        'scanner.html',
        {'request': request},
    )


@web_router.get('/api/v1/categories')
async def get_categories(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> List[dict]:
    """Get all categories.

    Args:
        request: FastAPI request
        db: Database session

    Returns:
        List[dict]: List of categories
    """
    category_service = CategoryService(db)
    categories = await category_service.get_all()
    return [category.model_dump() for category in categories]
