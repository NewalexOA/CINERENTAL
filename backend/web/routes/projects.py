"""Project web routes.

This module contains routes for project management web pages.
"""

from typing import Union

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request
from starlette.templating import _TemplateResponse

from backend.core.database import get_db
from backend.core.templates import templates
from backend.services import ProjectService

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
    session_id: Union[str, None] = None,
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


@router.get('/{project_id}', response_class=HTMLResponse)
async def view_project(
    request: Request,
    project_id: int,
    db: AsyncSession = Depends(get_db),
) -> _TemplateResponse:
    """Render project details page.

    Args:
        request: FastAPI request object
        project_id: Project ID
        db: Database session

    Returns:
        Rendered template for project details
    """
    logger.debug(f'Request to view project: ID={project_id}')

    # Check if project exists and get project data
    try:
        service = ProjectService(db)

        # Get project data directly in a dictionary format
        # to avoid serialization issues
        project_dict = await service.get_project_as_dict(project_id)
        logger.debug(f'Project {project_id} found, rendering view page')

        # Log more detailed project information for debugging
        logger.debug(f'Project keys: {list(project_dict.keys())}')

        # Debug log some important fields for verification
        logger.debug(f'Project name: {project_dict.get("name", "NOT SET")}')
        logger.debug(f'Project client: {project_dict.get("client_name", "NOT SET")}')
        logger.debug(f'Project status: {project_dict.get("status", "NOT SET")}')
        logger.debug(f'Bookings count: {len(project_dict.get("bookings", []))}')

        import json

        try:
            # Try to encode to ensure it can be serialized properly
            json_test = json.dumps(project_dict)
            logger.debug(f'Project JSON length: {len(json_test)} characters')
            if len(json_test) > 100:
                logger.debug(f'JSON start: {json_test[:100]}...')
                logger.debug(f'JSON end: ...{json_test[-100:]}')

            # Add debug check for valid JSON
            try:
                # See if we can parse back what we serialized
                json.loads(json_test)
                logger.debug('JSON validation check: Successfully parsed back')
            except json.JSONDecodeError as json_err:
                logger.error(f'JSON validation error: {str(json_err)}')
        except Exception as json_err:
            logger.error(f'JSON serialization error: {str(json_err)}')
            # If needed, sanitize the data structure further

        template_context = {
            'request': request,
            'project_id': str(project_id),  # Ensure it's a string
            'project_data': project_dict,  # Pass project data as dict
        }

        # Log the context keys for debugging
        log_keys = list(template_context.keys())
        logger.debug(f'Template context keys: {log_keys}')

        # Pass the project data directly to template
        return templates.TemplateResponse('projects/view.html', template_context)
    except Exception as e:
        logger.error(f'Error loading project {project_id}: {str(e)}')
        import traceback

        logger.error(f'Error traceback: {traceback.format_exc()}')

        # Still render the template but without project data
        return templates.TemplateResponse(
            'projects/view.html',
            {
                'request': request,
                'project_id': str(project_id),  # Ensure it's a string
                'error': str(e),
            },
        )
