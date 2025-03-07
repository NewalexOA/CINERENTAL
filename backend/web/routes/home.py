"""Home web routes module.

This module defines routes for the home/index page.
"""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.templating import _TemplateResponse

from backend.core.database import get_db
from backend.core.templates import templates
from backend.services import EquipmentService

router = APIRouter()


@router.get('/', response_class=HTMLResponse)
async def index(
    request: Request,
    db: AsyncSession = Depends(get_db),
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
