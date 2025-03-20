"""Projects web routes module.

This module defines routes for the projects web interface.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.templating import _TemplateResponse

from backend.core.database import get_db
from backend.core.templates import templates

router = APIRouter()


@router.get('/', response_class=HTMLResponse)
async def projects_list(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> _TemplateResponse:
    """Render projects list page.

    Args:
        request: FastAPI request
        db: Database session

    Returns:
        _TemplateResponse: Rendered template
    """
    return templates.TemplateResponse(
        'projects/index.html',
        {'request': request},
    )


@router.get('/new', response_class=HTMLResponse)
async def new_project(
    request: Request,
    db: AsyncSession = Depends(get_db),
    session_id: Optional[str] = None,
) -> _TemplateResponse:
    """Render new project creation page.

    Args:
        request: FastAPI request
        db: Database session
        session_id: Optional scan session ID to initialize the project

    Returns:
        _TemplateResponse: Rendered template
    """
    return templates.TemplateResponse(
        'projects/new.html',
        {'request': request, 'session_id': session_id},
    )
