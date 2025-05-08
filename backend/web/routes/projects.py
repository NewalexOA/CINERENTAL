"""Project web routes.

This module contains routes for project management web pages.
"""

import json
import traceback
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


@router.get('/{project_id}/print', response_class=HTMLResponse)
async def print_project(
    request: Request,
    project_id: int,
    db: AsyncSession = Depends(get_db),
) -> _TemplateResponse:
    """Render project print form.

    Args:
        request: FastAPI request object
        project_id: Project ID
        db: Database session

    Returns:
        Rendered template for project print form
    """
    logger.debug(f'Request to print project: ID={project_id}')

    try:
        # Use service directly instead of API request
        service = ProjectService(db)

        # Get project with bookings
        project = await service.get_project(project_id, with_bookings=True)
        await db.refresh(project, ['client'])

        # Create project response
        from datetime import datetime

        from backend.schemas import ClientInfo, EquipmentPrintItem, ProjectResponse

        # Create project response
        project_response = ProjectResponse.model_validate(project, from_attributes=True)

        # Create client info
        client_info = ClientInfo(
            id=project.client.id,
            name=project.client.name,
            company=project.client.company or '',
            phone=project.client.phone or '',
        )

        # Get equipment items
        equipment_items = []
        total_liability = 0.0

        for booking in project.bookings:
            # Ensure equipment data is loaded
            await db.refresh(booking, ['equipment'])
            equipment = booking.equipment
            # Skip if equipment somehow missing
            if not equipment:
                logger.warning(
                    f'Booking ID {booking.id} has no associated equipment. '
                    'Skipping in print.'
                )
                continue

            await db.refresh(equipment, ['category'])

            # Get equipment serial number and replacement cost
            serial_number = getattr(equipment, 'serial_number', None) or ''
            replacement_cost = getattr(equipment, 'replacement_cost', 0) or 0

            # Get booking quantity (default to 1 for backward compatibility)
            quantity = getattr(booking, 'quantity', 1) or 1

            # Calculate total liability amount for this booking (unit price * quantity)
            booking_liability = replacement_cost * quantity

            # Get category info
            category_id = getattr(equipment, 'category_id', None)
            category_name = (
                getattr(equipment.category, 'name', 'Без категории')
                if getattr(equipment, 'category', None)
                else 'Без категории'
            )

            # Create equipment item
            equipment_item = EquipmentPrintItem(
                id=equipment.id,
                name=equipment.name,
                serial_number=serial_number,
                liability_amount=replacement_cost,
                quantity=quantity,
                category_id=category_id,
                category_name=category_name,
            )

            equipment_items.append(equipment_item)
            total_liability += booking_liability

        # Sort equipment items by category name, then by equipment name
        equipment_items.sort(
            key=lambda item: (item.category_name or '', item.name or '')
        )

        # Create print form data
        print_data = {
            'project': project_response.model_dump(),
            'client': client_info.model_dump(),
            'equipment': [item.model_dump() for item in equipment_items],
            'total_items': len(equipment_items),
            'total_liability': total_liability,
            'generated_at': datetime.now(),
        }

        # Render template with data
        return templates.TemplateResponse(
            'print/project.html',
            {
                'request': request,
                'project': print_data['project'],
                'client': print_data['client'],
                'equipment': print_data['equipment'],
                'total_items': print_data['total_items'],
                'total_liability': print_data['total_liability'],
                'generated_at': print_data['generated_at'],
            },
        )
    except Exception as e:
        logger.error(f'Error printing project {project_id}: {str(e)}')
        logger.error(f'Error traceback: {traceback.format_exc()}')

        # Return error page
        return templates.TemplateResponse(
            'print/error.html',
            {
                'request': request,
                'error': str(e),
            },
        )
