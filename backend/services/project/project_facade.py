"""Project service module.

This module provides service functionality for project management.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Project, ProjectPaymentStatus, ProjectStatus
from backend.repositories import BookingRepository, ClientRepository, ProjectRepository
from backend.services.booking import BookingService
from backend.services.project.formatters import FormattersOperations
from backend.services.project.operations import (
    BookingOperations,
    CrudOperations,
    QueryOperations,
)


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
        self.booking_service = BookingService(db_session)
        self.crud_operations = CrudOperations(db_session)
        self.query_operations = QueryOperations(db_session)
        self.booking_operations = BookingOperations(db_session)
        self.formatters_operations = FormattersOperations(db_session)

    async def create_project_with_bookings(
        self,
        name: str,
        client_id: int,
        start_date: datetime,
        end_date: datetime,
        bookings: List[Dict[str, Any]],
        description: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Project:
        """Create new project with bookings.

        This method creates a project and associated bookings in a single transaction.
        If the project creation succeeds but some bookings fail, the transaction will
        still be committed and the method will return the project with the successfully
        created bookings.

        Args:
            name: Project name
            client_id: Client ID
            start_date: Start date of project
            end_date: End date of project
            bookings: List of booking data (equipment_id, start_date, end_date)
            description: Project description
            notes: Additional notes

        Returns:
            Created project with bookings

        Raises:
            ValidationError: If validation fails
            NotFoundError: If client or equipment not found
            DateError: If date validation fails
        """
        return await self.booking_operations.create_project_with_bookings(
            name=name,
            client_id=client_id,
            start_date=start_date,
            end_date=end_date,
            bookings=bookings,
            description=description,
            notes=notes,
        )

    async def get_projects(
        self,
        limit: int = 100,
        offset: int = 0,
        client_id: Optional[int] = None,
        status: Optional[ProjectStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        query: Optional[str] = None,
    ) -> Tuple[List[Project], int]:
        """Get projects with pagination and filtering.

        Args:
            limit: Maximum number of projects to return
            offset: Number of projects to skip
            client_id: Filter by client ID
            status: Filter by project status
            start_date: Filter by start date
            end_date: Filter by end date
            query: Search by project name (case-insensitive)

        Returns:
            Tuple of list of projects and total count

        Raises:
            NotFoundError: If client not found
        """
        return await self.query_operations.get_projects(
            limit=limit,
            offset=offset,
            client_id=client_id,
            status=status,
            start_date=start_date,
            end_date=end_date,
            query=query,
        )

    async def get_projects_list_query(
        self,
        client_id: Optional[int] = None,
        status: Optional[ProjectStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        include_deleted: bool = False,
        query: Optional[str] = None,
    ) -> Any:
        """Get projects list query for pagination.

        Args:
            client_id: Filter by client ID
            status: Filter by project status
            start_date: Filter by start date
            end_date: Filter by end date
            include_deleted: Whether to include deleted projects
            query: Search by project name (case-insensitive)

        Returns:
            SQLAlchemy query object

        Raises:
            NotFoundError: If client not found
        """
        return await self.query_operations.get_projects_list_query(
            client_id=client_id,
            status=status,
            start_date=start_date,
            end_date=end_date,
            include_deleted=include_deleted,
            query=query,
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
            DateError: If date validation fails
        """
        return await self.crud_operations.update_project(
            project_id=project_id,
            name=name,
            client_id=client_id,
            start_date=start_date,
            end_date=end_date,
            status=status,
            description=description,
            notes=notes,
        )

    async def delete_project(self, project_id: int) -> bool:
        """Soft delete project.

        Args:
            project_id: Project ID

        Returns:
            True if project was deleted, False otherwise

        Raises:
            NotFoundError: If project not found
        """
        return await self.crud_operations.delete_project(project_id)

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
            DateError: If date validation fails
        """
        return await self.crud_operations.create_project(
            name=name,
            client_id=client_id,
            start_date=start_date,
            end_date=end_date,
            description=description,
            notes=notes,
        )

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
        return await self.crud_operations.get_project(project_id, with_bookings)

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
        return await self.booking_operations.add_booking_to_project(
            project_id, booking_id
        )

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
            ValidationError: If booking does not belong to project
        """
        return await self.booking_operations.remove_booking_from_project(
            project_id, booking_id
        )

    async def get_project_bookings(self, project_id: int) -> List[dict]:
        """Get bookings for project.

        Args:
            project_id: Project ID

        Returns:
            List of bookings with equipment information

        Raises:
            NotFoundError: If project not found
        """
        return await self.formatters_operations.get_project_bookings(project_id)

    async def get_project_as_dict(self, project_id: int) -> dict:
        """Get project by ID and return as dictionary.

        Args:
            project_id: Project ID

        Returns:
            Project data as dictionary

        Raises:
            NotFoundError: If project not found
        """
        return await self.formatters_operations.get_project_as_dict(project_id)

    async def get_project_bookings_paginated(
        self,
        project_id: int,
        query: Optional[str] = None,
        category_id: Optional[int] = None,
        date_filter: str = 'all',
    ) -> Any:
        """Get paginated project bookings with filtering.

        Args:
            project_id: Project ID
            query: Search query (name, serial_number, barcode)
            category_id: Filter by category
            date_filter: Filter by date comparison with project
                ('all', 'different', 'matching')

        Returns:
            SQLAlchemy Query for pagination

        Raises:
            NotFoundError: If project not found
        """
        return await self.query_operations.get_project_bookings_paginated(
            project_id=project_id,
            query=query,
            category_id=category_id,
            date_filter=date_filter,
        )

    async def update_payment_status(
        self,
        project_id: int,
        payment_status: ProjectPaymentStatus,
        captcha_code: str,
    ) -> Project:
        """Update project payment status with captcha validation.

        Args:
            project_id: Project ID
            payment_status: New payment status
            captcha_code: Captcha code for validation

        Returns:
            Updated project

        Raises:
            NotFoundError: If project not found
            CaptchaError: If captcha code is invalid
        """
        return await self.crud_operations.update_payment_status(
            project_id=project_id,
            payment_status=payment_status,
            captcha_code=captcha_code,
        )
