"""Query operations for project service.

This module contains methods for querying and filtering projects.
"""

from datetime import datetime
from typing import Any, List, Optional, Tuple

from loguru import logger
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants.log_messages import ClientLogMessages, ProjectLogMessages
from backend.exceptions import NotFoundError
from backend.exceptions.messages import ProjectErrorMessages
from backend.models import Project, ProjectStatus
from backend.models.booking import Booking
from backend.models.category import Category
from backend.models.equipment import Equipment
from backend.repositories import ClientRepository, ProjectRepository


class QueryOperations:
    """Class for handling project query operations."""

    def __init__(self, db_session: AsyncSession) -> None:
        """Initialize query operations.

        Args:
            db_session: Database session
        """
        self.db_session = db_session
        self.repository = ProjectRepository(db_session)
        self.client_repository = ClientRepository(db_session)

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
        log = logger.bind(
            limit=limit,
            offset=offset,
            client_id=client_id,
            status=status.value if status else None,
            start_date=start_date,
            end_date=end_date,
            query=query,
        )

        # Validate client_id if provided
        if client_id is not None:
            client = await self.client_repository.get(client_id)
            if client is None:
                log.warning(ClientLogMessages.CLIENT_NOT_FOUND, client_id)
                raise NotFoundError(
                    ProjectErrorMessages.CLIENT_NOT_FOUND.format(client_id),
                    details={'client_id': client_id},
                )

        # Get projects
        result = await self.repository.get_projects_with_filters(
            limit=limit,
            offset=offset,
            client_id=client_id,
            status=status,
            start_date=start_date,
            end_date=end_date,
            query=query,
        )

        log.debug(ProjectLogMessages.PROJECT_LISTING, len(result[0]))
        return result

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
        # Validate client_id if provided
        if client_id is not None:
            client = await self.client_repository.get(client_id)
            if client is None:
                raise NotFoundError(
                    ProjectErrorMessages.CLIENT_NOT_FOUND.format(client_id),
                    details={'client_id': client_id},
                )

        # Get paginatable query
        return self.repository.get_paginatable_query(
            client_id=client_id,
            status=status,
            start_date=start_date,
            end_date=end_date,
            include_deleted=include_deleted,
            query=query,
        )

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
        log = logger.bind(project_id=project_id)
        log.debug('Getting paginated project bookings with filters')

        # Check if project exists
        project = await self.repository.get_by_id(project_id)
        if project is None:
            log.warning(ProjectLogMessages.PROJECT_NOT_FOUND, project_id)
            raise NotFoundError(
                ProjectErrorMessages.PROJECT_NOT_FOUND.format(project_id),
                details={'project_id': project_id},
            )

        # Build base query with joins
        base_query = (
            select(
                Booking.id,
                Booking.equipment_id,
                Equipment.name.label('equipment_name'),
                Equipment.serial_number,
                Equipment.barcode,
                Category.name.label('category_name'),
                Category.id.label('category_id'),
                Booking.start_date,
                Booking.end_date,
                Booking.booking_status,
                Booking.payment_status,
                Booking.quantity,
                # Calculate has_different_dates using SQL
                or_(
                    func.date(Booking.start_date) != func.date(project.start_date),
                    func.date(Booking.end_date) != func.date(project.end_date),
                ).label('has_different_dates'),
            )
            .join(Equipment, Booking.equipment_id == Equipment.id)
            .outerjoin(Category, Equipment.category_id == Category.id)
            .where(Booking.project_id == project_id)
        )

        # Apply search query filter
        if query and len(query.strip()) >= 3:
            search_term = f'%{query.strip().lower()}%'
            search_conditions = or_(
                func.lower(Equipment.name).like(search_term),
                func.lower(Equipment.serial_number).like(search_term),
                func.lower(Equipment.barcode).like(search_term),
            )
            base_query = base_query.where(search_conditions)

        # Apply category filter
        if category_id:
            base_query = base_query.where(Equipment.category_id == category_id)

        # Apply date filter
        if date_filter == 'different':
            base_query = base_query.where(
                or_(
                    func.date(Booking.start_date) != func.date(project.start_date),
                    func.date(Booking.end_date) != func.date(project.end_date),
                )
            )
        elif date_filter == 'matching':
            base_query = base_query.where(
                and_(
                    func.date(Booking.start_date) == func.date(project.start_date),
                    func.date(Booking.end_date) == func.date(project.end_date),
                )
            )
        # "all" - no additional filter needed

        # Order by equipment name for consistent pagination
        base_query = base_query.order_by(Equipment.name, Booking.id)

        log.debug(
            'Built paginated query with filters: query={}, category_id={}, '
            'date_filter={}',
            query,
            category_id,
            date_filter,
        )

        return base_query
