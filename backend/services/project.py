"""Project service module.

This module provides service functionality for project management.
"""

from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import NotFoundError, ValidationError
from backend.models import Project, ProjectStatus
from backend.repositories import BookingRepository, ClientRepository, ProjectRepository


class ProjectService:
    """Service for managing projects."""

    def __init__(self, db_session: AsyncSession) -> None:
        """Initialize service.

        Args:
            db_session: Database session
        """
        self.db_session = db_session
        self.repository = ProjectRepository(db_session)
        self.client_repository = ClientRepository(db_session)
        self.booking_repository = BookingRepository(db_session)

    async def create_project(
        self,
        name: str,
        client_id: int,
        start_date: datetime,
        end_date: datetime,
        description: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Project:
        """Create new project.

        Args:
            name: Project name
            client_id: Client ID
            start_date: Start date of project
            end_date: End date of project
            description: Project description
            notes: Additional notes

        Returns:
            Created project

        Raises:
            ValidationError: If validation fails
            NotFoundError: If client not found
        """
        # Validate dates
        if start_date >= end_date:
            raise ValidationError('Start date must be before end date')

        # Check if client exists
        client = await self.client_repository.get(client_id)
        if client is None:
            raise NotFoundError(f'Client with ID {client_id} not found')

        # Create project
        project = Project(
            name=name,
            client_id=client_id,
            start_date=start_date,
            end_date=end_date,
            description=description,
            notes=notes,
            status=ProjectStatus.DRAFT,
        )

        # Save project
        return await self.repository.create(project)

    async def get_project(
        self, project_id: int, with_bookings: bool = False
    ) -> Project:
        """Get project by ID.

        Args:
            project_id: Project ID
            with_bookings: Whether to include bookings

        Returns:
            Project

        Raises:
            NotFoundError: If project not found
        """
        # Get project
        if with_bookings:
            project = await self.repository.get_by_id_with_bookings(project_id)
        else:
            project = await self.repository.get_by_id(project_id)

        # Check if project exists
        if project is None:
            raise NotFoundError(f'Project with ID {project_id} not found')

        # Get client name for response
        client = await self.client_repository.get(project.client_id)
        if client is None:
            raise NotFoundError(f'Client with ID {project.client_id} not found')
        setattr(project, 'client_name', client.name)

        # Get equipment names for bookings if needed
        if with_bookings and project.bookings:
            for booking in project.bookings:
                # Get equipment information
                equipment = booking.equipment

                # Set names for response
                if equipment:
                    setattr(booking, 'equipment_name', equipment.name)

        return project

    async def get_projects(
        self,
        limit: int = 100,
        offset: int = 0,
        client_id: Optional[int] = None,
        status: Optional[ProjectStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Tuple[List[Project], int]:
        """Get projects with pagination and filtering.

        Args:
            limit: Maximum number of projects to return
            offset: Number of projects to skip
            client_id: Filter by client ID
            status: Filter by project status
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            Tuple of list of projects and total count
        """
        # Validate client_id if provided
        if client_id is not None:
            client = await self.client_repository.get(client_id)
            if client is None:
                raise NotFoundError(f'Client with ID {client_id} not found')

        # Get projects
        return await self.repository.get_projects_with_filters(
            limit=limit,
            offset=offset,
            client_id=client_id,
            status=status,
            start_date=start_date,
            end_date=end_date,
        )

    async def update_project(
        self,
        project_id: int,
        name: Optional[str] = None,
        client_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[ProjectStatus] = None,
        description: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Project:
        """Update project.

        Args:
            project_id: Project ID
            name: Project name
            client_id: Client ID
            start_date: Start date of project
            end_date: End date of project
            status: Project status
            description: Project description
            notes: Additional notes

        Returns:
            Updated project

        Raises:
            NotFoundError: If project or client not found
            ValidationError: If validation fails
        """
        # Check if project exists
        project = await self.repository.get_by_id(project_id)
        if project is None:
            raise NotFoundError(f'Project with ID {project_id} not found')

        # Validate client_id if provided
        if client_id is not None:
            client = await self.client_repository.get(client_id)
            if client is None:
                raise NotFoundError(f'Client with ID {client_id} not found')

        # Prepare update data
        update_data = {
            'name': name,
            'client_id': client_id,
            'start_date': start_date,
            'end_date': end_date,
            'status': status,
            'description': description,
            'notes': notes,
        }

        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}

        # Check dates if both provided
        if start_date is not None and end_date is not None:
            if start_date >= end_date:
                raise ValidationError('Start date must be before end date')
        elif start_date is not None and project.end_date:
            if start_date >= project.end_date:
                raise ValidationError('Start date must be before end date')
        elif end_date is not None and project.start_date:
            if project.start_date >= end_date:
                raise ValidationError('Start date must be before end date')

        # Update project
        updated_project = await self.repository.update_project(project_id, update_data)
        if updated_project is None:
            raise NotFoundError(f'Project with ID {project_id} not found')

        # Get client name for response
        client = await self.client_repository.get(updated_project.client_id)
        if client is None:
            msg = f'Client with ID {updated_project.client_id} not found'
            raise NotFoundError(msg)
        setattr(updated_project, 'client_name', client.name)

        return updated_project

    async def delete_project(self, project_id: int) -> bool:
        """Delete project.

        Args:
            project_id: Project ID

        Returns:
            True if project was deleted, False otherwise

        Raises:
            NotFoundError: If project not found
        """
        # Check if project exists
        project = await self.repository.get_by_id(project_id)
        if project is None:
            raise NotFoundError(f'Project with ID {project_id} not found')

        # Delete project
        return await self.repository.delete(project_id)

    async def add_booking_to_project(self, project_id: int, booking_id: int) -> Project:
        """Add booking to project.

        Args:
            project_id: Project ID
            booking_id: Booking ID

        Returns:
            Updated project

        Raises:
            NotFoundError: If project or booking not found
        """
        # Check if project exists
        project = await self.repository.get_by_id(project_id)
        if project is None:
            raise NotFoundError(f'Project with ID {project_id} not found')

        # Check if booking exists
        booking = await self.booking_repository.get(booking_id)
        if booking is None:
            raise NotFoundError(f'Booking with ID {booking_id} not found')

        # Update booking with project_id
        booking.project_id = project_id
        await self.db_session.flush()

        # Refresh project with bookings
        return await self.get_project(project_id, with_bookings=True)

    async def remove_booking_from_project(
        self, project_id: int, booking_id: int
    ) -> Project:
        """Remove booking from project.

        Args:
            project_id: Project ID
            booking_id: Booking ID

        Returns:
            Updated project

        Raises:
            NotFoundError: If project or booking not found
        """
        # Check if project exists
        project = await self.repository.get_by_id(project_id)
        if project is None:
            raise NotFoundError(f'Project with ID {project_id} not found')

        # Check if booking exists
        booking = await self.booking_repository.get(booking_id)
        if booking is None:
            raise NotFoundError(f'Booking with ID {booking_id} not found')

        # Check if booking belongs to project
        if booking.project_id != project_id:
            msg = f'Booking {booking_id} does not belong to project {project_id}'
            raise ValidationError(msg)

        # Update booking to remove project_id
        booking.project_id = None
        await self.db_session.flush()

        # Refresh project with bookings
        return await self.get_project(project_id, with_bookings=True)
