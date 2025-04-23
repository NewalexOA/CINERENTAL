"""Clients web routes module.

This module defines routes for the clients web interface.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.templating import _TemplateResponse

from backend.core.database import get_db
from backend.core.templates import templates
from backend.services import ClientService

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


@router.get('/{client_id}', response_class=HTMLResponse)
async def client_detail(
    request: Request,
    client_id: int,
    db: AsyncSession = Depends(get_db),
) -> _TemplateResponse:
    """Render client detail page.

    Args:
        request: FastAPI request
        client_id: Client ID
        db: Database session

    Returns:
        _TemplateResponse: Rendered template

    Raises:
        HTTPException: If client not found
    """
    service = ClientService(db)
    client = await service.get_client(client_id)

    if not client:
        raise HTTPException(status_code=404, detail='Client not found')

    return templates.TemplateResponse(
        'clients/detail.html',
        {
            'request': request,
            'client': client,
        },
    )
