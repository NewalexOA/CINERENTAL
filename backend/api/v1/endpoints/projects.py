"""Projects API routes.

This module contains API endpoints for managing projects.
"""

from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_pagination import Page, Params
from fastapi_pagination.ext.sqlalchemy import paginate
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.decorators import (
    typed_delete,
    typed_get,
    typed_patch,
    typed_post,
    typed_put,
)
from backend.core.database import get_db
from backend.exceptions import BusinessError, DateError, NotFoundError, ValidationError
from backend.models import ProjectStatus
from backend.schemas import (
    ClientInfo,
    EquipmentPrintItem,
    ProjectCreateWithBookings,
    ProjectPrint,
    ProjectResponse,
    ProjectUpdate,
    ProjectWithBookings,
)
from backend.services import CategoryService, ProjectService

projects_router: APIRouter = APIRouter()


@typed_get(
    projects_router,
    '/',
    response_model=List[ProjectResponse],
    summary='Get all projects',
)
async def get_projects(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 100,
    offset: int = 0,
    client_id: Optional[int] = None,
    project_status: Optional[ProjectStatus] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[ProjectResponse]:
    """Get all projects with pagination and filtering.

    Args:
        db: Database session
        limit: Maximum number of projects to return
        offset: Number of projects to skip
        client_id: Filter by client ID
        project_status: Filter by project status
        start_date: Filter by start date
        end_date: Filter by end date

    Returns:
        List of projects
    """
    log = logger.bind(
        limit=limit,
        offset=offset,
        client_id=client_id,
        status=project_status.value if project_status else None,
        start_date=start_date,
        end_date=end_date,
    )

    service = ProjectService(db)
    try:
        projects, _ = await service.get_projects(
            limit=limit,
            offset=offset,
            client_id=client_id,
            status=project_status,
            start_date=start_date,
            end_date=end_date,
        )

        log.debug('Retrieved {} projects', len(projects))
        return [ProjectResponse.model_validate(project) for project in projects]
    except NotFoundError as e:
        log.error('Not found error: {}', str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
            headers={'X-Error-Details': str(getattr(e, 'details', {}))},
        )
    except ValidationError as e:
        log.error('Validation error: {}', str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
            headers={'X-Error-Details': str(getattr(e, 'details', {}))},
        )


@typed_get(
    projects_router,
    '/paginated',
    response_model=Page[ProjectResponse],
    summary='Get projects with pagination',
)
async def get_projects_paginated(
    db: Annotated[AsyncSession, Depends(get_db)],
    params: Params = Depends(),
    client_id: Optional[int] = None,
    project_status: Optional[ProjectStatus] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Page[ProjectResponse]:
    """Get projects with pagination.

    Args:
        db: Database session
        params: Pagination parameters
        client_id: Filter by client ID
        project_status: Filter by project status
        start_date: Filter by start date
        end_date: Filter by end date

    Returns:
        Paginated list of projects
    """
    log = logger.bind(
        client_id=client_id,
        status=project_status.value if project_status else None,
        start_date=start_date,
        end_date=end_date,
    )

    try:
        service = ProjectService(db)

        # Get query for pagination
        projects_query = await service.get_projects_list_query(
            client_id=client_id,
            status=project_status,
            start_date=start_date,
            end_date=end_date,
        )

        # Use fastapi-pagination to paginate the query with transformer
        result: Page[ProjectResponse] = await paginate(
            db,
            projects_query,
            params,
            transformer=lambda projects: [
                ProjectResponse(
                    id=project.id,
                    name=project.name,
                    description=project.description,
                    client_id=project.client_id,
                    start_date=project.start_date,
                    end_date=project.end_date,
                    status=project.status,
                    notes=project.notes,
                    created_at=project.created_at,
                    updated_at=project.updated_at,
                    client_name=project.client.name if project.client else '',
                )
                for project in projects
            ],
        )

        log.debug('Retrieved {} projects', len(result.items))
        return result
    except NotFoundError as e:
        log.error('Not found error: {}', str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
            headers={'X-Error-Details': str(getattr(e, 'details', {}))},
        )
    except ValidationError as e:
        log.error('Validation error: {}', str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
            headers={'X-Error-Details': str(getattr(e, 'details', {}))},
        )
    except Exception as e:
        log.error('Unexpected error: {}', str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'An unexpected error occurred: {e}',
        )


@typed_get(
    projects_router,
    '/{project_id}',
    response_model=ProjectWithBookings,
    summary='Get project by ID',
)
async def get_project(
    project_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectWithBookings:
    """Get project by ID.

    Args:
        project_id: Project ID
        db: Database session

    Returns:
        Project with bookings
    """
    service = ProjectService(db)
    try:
        project_dict = await service.get_project_as_dict(project_id)

        for booking in project_dict.get('bookings', []):
            logger.debug(
                f"API response booking: {booking.get('id')} "
                f"equipment: {booking.get('equipment_name')} "
                f"serial: {booking.get('serial_number')}"
            )

        return ProjectWithBookings.model_validate(project_dict)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@typed_post(
    projects_router,
    '/',
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary='Create new project',
)
async def create_project(
    project: ProjectCreateWithBookings,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectResponse:
    """Create new project.

    This endpoint creates a new project. If 'bookings' data is provided,
    it will also create bookings for the project. It handles validation of input data
    and returns the created project with a 201 Created status.

    Args:
        project: Project data with optional bookings
        db: Database session

    Returns:
        Created project

    Raises:
        HTTPException: If project creation fails, client not found, or validation
        error occurs
    """
    log = logger.bind(
        project_name=project.name,
        client_id=project.client_id,
        start_date=project.start_date,
        end_date=project.end_date,
        has_bookings=hasattr(project, 'bookings') and bool(project.bookings),
    )

    service = ProjectService(db)
    try:
        log.debug('Project data: {}', project.model_dump())

        # Check if we have bookings data
        has_bookings = hasattr(project, 'bookings') and project.bookings

        if has_bookings:
            # Log the attempt to create project with bookings
            log.info(
                'Creating project "{}" with {} bookings',
                project.name,
                len(project.bookings),
            )
            log.debug('Bookings data: {}', [b.model_dump() for b in project.bookings])

            # Create project with bookings
            created_project = await service.create_project_with_bookings(
                name=project.name,
                client_id=project.client_id,
                start_date=project.start_date,
                end_date=project.end_date,
                description=project.description,
                notes=project.notes,
                bookings=[booking.model_dump() for booking in project.bookings],
            )
        else:
            # Determine why bookings are not detected
            log.warning(
                'No bookings found: hasattr(project, "bookings")={}, '
                'project.bookings={}',
                hasattr(project, 'bookings'),
                getattr(project, 'bookings', None),
            )

            # Create simple project without bookings
            log.info('Creating project "{}" without bookings', project.name)
            created_project = await service.create_project(
                name=project.name,
                client_id=project.client_id,
                start_date=project.start_date,
                end_date=project.end_date,
                description=project.description,
                notes=project.notes,
            )

        log.info('Project created successfully, ID: {}', created_project.id)

        await db.refresh(created_project, ['client'])

        response_data = {
            **created_project.__dict__,
            'client_name': created_project.client.name,
        }

        return ProjectResponse.model_validate(response_data)
    except NotFoundError as e:
        log.error('Not found error: {}', str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
            headers={'X-Error-Details': str(getattr(e, 'details', {}))},
        )
    except (ValidationError, DateError) as e:
        log.error('Validation error: {}', str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
            headers={'X-Error-Details': str(getattr(e, 'details', {}))},
        )
    except BusinessError as e:
        log.error('Business error: {}', str(e))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
            headers={'X-Error-Details': str(getattr(e, 'details', {}))},
        )
    except Exception as e:
        log.error('Unexpected error creating project: {}', str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to create project: {str(e)}',
        )


@typed_put(
    projects_router,
    '/{project_id}',
    response_model=ProjectResponse,
    summary='Update project',
)
async def update_project(
    project_id: int,
    project: ProjectUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectResponse:
    """Update project.

    Args:
        project_id: Project ID
        project: Project data
        db: Database session

    Returns:
        Updated project
    """
    service = ProjectService(db)
    try:
        updated_project = await service.update_project(
            project_id=project_id,
            name=project.name,
            client_id=project.client_id,
            start_date=project.start_date,
            end_date=project.end_date,
            status=project.status,
            description=project.description,
            notes=project.notes,
        )
        return ProjectResponse.model_validate(updated_project)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@typed_delete(
    projects_router,
    '/{project_id}',
    response_model=bool,
    summary='Delete project',
)
async def delete_project(
    project_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> bool:
    """Delete project.

    Args:
        project_id: Project ID
        db: Database session

    Returns:
        True if project was deleted, False otherwise
    """
    service = ProjectService(db)
    try:
        return await service.delete_project(project_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@typed_post(
    projects_router,
    '/{project_id}/bookings/{booking_id}',
    response_model=ProjectWithBookings,
    summary='Add booking to project',
)
async def add_booking_to_project(
    project_id: int,
    booking_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectWithBookings:
    """Add booking to project.

    Args:
        project_id: Project ID
        booking_id: Booking ID
        db: Database session

    Returns:
        Updated project
    """
    service = ProjectService(db)
    try:
        project = await service.add_booking_to_project(project_id, booking_id)
        return ProjectWithBookings.model_validate(project)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@typed_delete(
    projects_router,
    '/{project_id}/bookings/{booking_id}',
    response_model=ProjectWithBookings,
    summary='Remove booking from project',
)
async def remove_booking_from_project(
    project_id: int,
    booking_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectWithBookings:
    """Remove booking from project.

    Args:
        project_id: Project ID
        booking_id: Booking ID
        db: Database session

    Returns:
        Updated project
    """
    service = ProjectService(db)
    try:
        project = await service.remove_booking_from_project(project_id, booking_id)
        return ProjectWithBookings.model_validate(project)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@typed_get(
    projects_router,
    '/{project_id}/bookings',
    response_model=List[dict],
    summary='Get project bookings',
)
async def get_project_bookings(
    project_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> List[dict]:
    """Get bookings for a project.

    Args:
        project_id: Project ID
        db: Database session

    Returns:
        List of bookings
    """
    service = ProjectService(db)
    try:
        bookings = await service.get_project_bookings(project_id)
        return bookings
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@typed_get(
    projects_router,
    '/{project_id}/print',
    response_model=ProjectPrint,
    summary='Get project print data',
)
async def get_project_print_data(
    project_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectPrint:
    """Get project data for print form.

    Args:
        project_id: Project ID
        db: Database session

    Returns:
        Project print data including client and equipment information

    Raises:
        HTTPException: If project not found or other error occurs
    """
    log = logger.bind(project_id=project_id)
    log.debug('Getting project print data')

    service = ProjectService(db)
    category_service = CategoryService(db)
    try:
        # Get project with bookings
        project = await service.get_project(project_id, with_bookings=True)
        await db.refresh(project, ['client'])

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
        show_dates_column = False

        for booking in project.bookings:
            # Ensure equipment data is loaded
            await db.refresh(booking, ['equipment'])
            equipment = booking.equipment

            # Get equipment serial number and liability amount
            serial_number = getattr(equipment, 'serial_number', None) or ''
            liability_amount = getattr(equipment, 'liability_amount', 0.0) or 0.0
            quantity = getattr(booking, 'quantity', 1) or 1

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

            # Get category hierarchy info
            original_direct_category_id = getattr(equipment, 'category_id', None)
            _, printable_categories = (
                await category_service.get_print_hierarchy_and_sort_path(
                    original_direct_category_id
                )
            )

            # Create equipment item
            equipment_item = EquipmentPrintItem(
                id=equipment.id,
                name=equipment.name,
                serial_number=serial_number,
                liability_amount=float(liability_amount),
                quantity=quantity,
                printable_categories=printable_categories,
                start_date=booking.start_date,
                end_date=booking.end_date,
                has_different_dates=has_different_dates,
            )

            equipment_items.append(equipment_item)
            total_liability += float(liability_amount)

        # Create print form response
        print_data = ProjectPrint(
            project=project_response,
            client=client_info,
            equipment=equipment_items,
            total_items=len(equipment_items),
            total_liability=total_liability,
            generated_at=datetime.now(),
            show_dates_column=show_dates_column,
        )

        return print_data

    except NotFoundError as e:
        log.error('Project not found: {}', str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Project with ID {project_id} not found',
        )
    except Exception as e:
        log.error('Error getting project print data: {}', str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Error retrieving project print data: {str(e)}',
        )


@typed_patch(
    projects_router,
    '/{project_id}',
    response_model=ProjectResponse,
    summary='Partially update project',
)
async def patch_project(
    project_id: int,
    project: ProjectUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectResponse:
    """Partially update project.

    Args:
        project_id: Project ID
        project: Project data for update
        db: Database session

    Returns:
        Updated project

    Raises:
        HTTPException: If project not found or validation fails
    """
    service = ProjectService(db)
    try:
        update_data = project.model_dump(exclude_unset=True)

        updated_project = await service.update_project(
            project_id=project_id, **update_data
        )

        # Ensure client data is loaded for response
        await db.refresh(updated_project, ['client'])
        response_data = {
            **updated_project.__dict__,
            'client_name': updated_project.client.name,
        }

        return ProjectResponse.model_validate(response_data)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except BusinessError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
