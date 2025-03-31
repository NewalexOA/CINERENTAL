"""Projects API routes.

This module contains API endpoints for managing projects.
"""

from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.decorators import typed_delete, typed_get, typed_post, typed_put
from backend.core.database import get_db
from backend.exceptions import BusinessError, DateError, NotFoundError, ValidationError
from backend.models import ProjectStatus
from backend.schemas import (
    ProjectCreateWithBookings,
    ProjectResponse,
    ProjectUpdate,
    ProjectWithBookings,
)
from backend.services import ProjectService

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
        project = await service.get_project(project_id, with_bookings=True)

        # Ensure client data is loaded
        await db.refresh(project, ['client'])

        # Create response with client data
        response_data = {**project.__dict__, 'client_name': project.client.name}

        return ProjectWithBookings.model_validate(response_data)
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
