"""Frontend router module."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.templating import _TemplateResponse

from backend.core.database import get_db
from backend.core.templates import templates
from backend.schemas.equipment import EquipmentResponse
from backend.services.equipment import EquipmentService

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

    return templates.TemplateResponse(
        'equipment/list.html',
        {
            'request': request,
            'equipment_list': [item.model_dump() for item in equipment_list],
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
