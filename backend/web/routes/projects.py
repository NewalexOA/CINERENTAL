"""Project web routes.

This module contains routes for project management web pages.
"""

import json
import traceback
from datetime import datetime
from typing import Optional, Tuple, Union

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request
from starlette.templating import _TemplateResponse

from backend.core.database import get_db
from backend.core.templates import templates
from backend.schemas import ClientInfo, EquipmentPrintItem, ProjectResponse
from backend.services.category import CategoryService
from backend.services.project import ProjectService

router = APIRouter()
logger = logger.bind(name=__name__)


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
        project_service = ProjectService(db)
        category_service = CategoryService(db)

        project = await project_service.get_project(project_id, with_bookings=True)
        await db.refresh(project, ['client'])

        project_response = ProjectResponse.model_validate(project, from_attributes=True)
        client_info = ClientInfo(
            id=project.client.id,
            name=project.client.name,
            company=project.client.company or '',
            phone=project.client.phone or '',
        )

        equipment_items_data = []
        total_liability = 0.0
        show_dates_column = False

        for booking in project.bookings:
            await db.refresh(booking, ['equipment'])
            equipment = booking.equipment
            if not equipment:
                logger.warning(f'Booking ID {booking.id} has no equipment. Skipping.')
                continue

            serial_number = getattr(equipment, 'serial_number', None) or ''
            replacement_cost = getattr(equipment, 'replacement_cost', 0) or 0.0
            quantity = getattr(booking, 'quantity', 1) or 1
            booking_liability = replacement_cost * quantity

            # Check if booking dates differ from project dates
            # (compare only dates, not time)
            booking_start_date = booking.start_date.date()
            booking_end_date = booking.end_date.date()
            project_start_date = project.start_date.date()
            project_end_date = project.end_date.date()

            has_different_dates = (
                booking_start_date != project_start_date
                or booking_end_date != project_end_date
            )

            # If any equipment has different dates, we need to show the dates column
            if has_different_dates:
                show_dates_column = True

            original_direct_category_id = getattr(equipment, 'category_id', None)

            # Correctly call get_print_hierarchy_and_sort_path
            sort_path, printable_categories = (
                await category_service.get_print_hierarchy_and_sort_path(
                    original_direct_category_id
                )
            )

            # Correctly initialize EquipmentPrintItem with printable_categories
            equipment_item_schema = EquipmentPrintItem(
                id=equipment.id,
                name=equipment.name,
                description=getattr(equipment, 'description', None),
                serial_number=serial_number,
                liability_amount=replacement_cost,
                quantity=quantity,
                printable_categories=printable_categories,
                start_date=booking.start_date,
                end_date=booking.end_date,
                has_different_dates=has_different_dates,
            )

            # Add sort_path to the dict for sorting
            item_dict_for_sorting = equipment_item_schema.model_dump()
            item_dict_for_sorting['sort_path'] = sort_path
            equipment_items_data.append(item_dict_for_sorting)

            total_liability += booking_liability

        equipment_items_data.sort(key=lambda item: item.get('name', '').lower())

        def serial_sort_key_desc(serial_value: Optional[str]) -> Tuple[int, str]:
            if serial_value is None or serial_value == '':
                return (1, ' ')
            return (0, serial_value.lower())

        equipment_items_data.sort(
            key=lambda item: serial_sort_key_desc(item.get('serial_number')),
            reverse=True,
        )

        equipment_items_data.sort(key=lambda item: item.get('sort_path', []))

        print_data = {
            'project': project_response.model_dump(),
            'client': client_info.model_dump(),
            'equipment': equipment_items_data,
            'total_items': len(equipment_items_data),
            'total_liability': total_liability,
            'generated_at': datetime.now(),
            'show_dates_column': show_dates_column,
        }

        return templates.TemplateResponse(
            'print/project.html',
            {'request': request, **print_data},
        )
    except Exception as e:
        logger.error(f'Error printing project {project_id}: {str(e)}')
        logger.error(f'Error traceback: {traceback.format_exc()}')
        return templates.TemplateResponse(
            'print/error.html',
            {'request': request, 'error': str(e)},
        )
