"""Clients web routes module.

This module defines routes for the clients web interface.
"""

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from starlette.templating import _TemplateResponse

from backend.core.templates import templates

router = APIRouter()


@router.get('/', response_class=HTMLResponse)
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
