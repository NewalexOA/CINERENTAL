"""Categories web routes module.

This module defines routes for the categories web interface.
"""

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.templating import _TemplateResponse

from backend.core.database import get_db
from backend.core.templates import templates
from backend.services import CategoryService
from backend.web.routes.utils import prepare_model_list_for_template

router = APIRouter()


@router.get('/', response_class=HTMLResponse)
async def categories_list(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> _TemplateResponse:
    """Render categories list page.

    Args:
        request: FastAPI request
        db: Database session

    Returns:
        _TemplateResponse: Rendered template
    """
    category_service = CategoryService(db)
    categories = await category_service.get_all()

    return templates.TemplateResponse(
        'categories/list.html',
        {
            'request': request,
            'categories': prepare_model_list_for_template(categories),
        },
    )


@router.get('/api')
async def get_categories(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Get all categories as JSON.

    Args:
        request: FastAPI request
        db: Database session

    Returns:
        List[Dict[str, Any]]: List of categories
    """
    category_service = CategoryService(db)
    categories = await category_service.get_all()
    return prepare_model_list_for_template(categories)
