"""Scanner web routes module.

This module defines routes for the barcode scanner interface.
"""

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from starlette.templating import _TemplateResponse

from backend.core.templates import templates

router = APIRouter()


@router.get('/', response_class=HTMLResponse)
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
