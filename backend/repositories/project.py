"""Project repository module.

This module provides repository functionality for Project model.
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple, Union, cast
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy.sql import Select

from backend.models import Booking, Client, Equipment, Project, ProjectStatus
from backend.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    """Project repository.

    This repository provides CRUD operations for Project model.
    """

    model = Project

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            session: Database session
        """
        super().__init__(session=session, model=self.model)

    async def create(self, project: Project) -> Project:
        """Create new project.

        Args:
            project: Project to create

        Returns:
            Created project
        """
        self.session.add(project)
        await self.session.flush()
        await self.session.refresh(project)
        return project

    async def get_by_id(self, project_id: Union[int, UUID]) -> Optional[Project]:
        """Get project by ID.

        Args:
            project_id: Project ID

        Returns:
            Project if found, None otherwise (excluding soft deleted)
        """
        query = select(Project).where(
            Project.id == project_id, Project.deleted_at.is_(None)
        )
        result = await self.session.execute(query)
        return result.scalars().first()

    async def get_by_id_with_bookings(
        self, project_id: Union[int, UUID]
    ) -> Optional[Project]:
        """Get project by ID with bookings preloaded.

        Args:
            project_id: Project ID

        Returns:
            Project with bookings if found, None otherwise (excluding soft deleted)
        """
        query = (
            select(Project)
            .where(Project.id == project_id, Project.deleted_at.is_(None))
            .options(
                selectinload(Project.bookings)
                .selectinload(Booking.equipment)
                .selectinload(Equipment.category)
            )
        )
        result = await self.session.execute(query)
        return result.scalars().first()

    async def get_projects_with_filters(
        self,
        limit: int = 100,
        offset: int = 0,
        client_id: Optional[int] = None,
        status: Optional[ProjectStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        query: Optional[str] = None,
    ) -> Tuple[List[Project], int]:
        """Get all projects with pagination and filtering.

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
        """
        query_obj = select(Project).where(Project.deleted_at.is_(None))
        count_query = select(func.count(Project.id)).where(Project.deleted_at.is_(None))

        # Apply filters
        if client_id is not None:
            query_obj = query_obj.where(Project.client_id == client_id)
            count_query = count_query.where(Project.client_id == client_id)

        if status is not None:
            query_obj = query_obj.where(Project.status == status)
            count_query = count_query.where(Project.status == status)

        if start_date is not None and end_date is not None:
            date_filter = (Project.start_date <= end_date) & (
                Project.end_date >= start_date
            )
            query_obj = query_obj.where(date_filter)
            count_query = count_query.where(date_filter)
        elif start_date is not None:
            query_obj = query_obj.where(Project.end_date >= start_date)
            count_query = count_query.where(Project.end_date >= start_date)
        elif end_date is not None:
            query_obj = query_obj.where(Project.start_date <= end_date)
            count_query = count_query.where(Project.start_date <= end_date)

        # Add search filter
        if query is not None and query.strip():
            search_filter = Project.name.ilike(f'%{query.strip()}%')
            query_obj = query_obj.where(search_filter)
            count_query = count_query.where(search_filter)

        # Add client relationship for response
        query_obj = query_obj.join(Client).add_columns(Client.name.label('client_name'))

        # Apply pagination
        query_obj = query_obj.limit(limit).offset(offset)

        # Execute queries
        result = await self.session.execute(query_obj)
        count_result = await self.session.execute(count_query)

        # Process results
        records = result.all()
        projects = []

        for record in records:
            project = record[0]
            project.client_name = record.client_name
            projects.append(project)

        total = cast(int, count_result.scalar())

        return projects, total

    async def update_project(
        self, project_id: int, update_data: dict
    ) -> Optional[Project]:
        """Update project.

        Args:
            project_id: Project ID
            update_data: Updated data

        Returns:
            Updated project if found, None otherwise
        """
        project = await self.get_by_id(project_id)
        if project is None:
            return None

        for key, value in update_data.items():
            if hasattr(project, key):
                setattr(project, key, value)

        await self.session.flush()
        await self.session.refresh(project)
        return project

    def get_paginatable_query(
        self,
        client_id: Optional[int] = None,
        status: Optional[ProjectStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        include_deleted: bool = False,
        query: Optional[str] = None,
    ) -> Select:
        """Get a paginatable query for projects with optional filtering.

        Args:
            client_id: Filter by client ID
            status: Filter by project status
            start_date: Filter by start date
            end_date: Filter by end date
            include_deleted: Whether to include deleted projects
            query: Search by project name (case-insensitive)

        Returns:
            SQLAlchemy Select query object
        """
        query_obj = select(Project).join(Client).options(joinedload(Project.client))

        if not include_deleted:
            query_obj = query_obj.where(Project.deleted_at.is_(None))

        if client_id is not None:
            query_obj = query_obj.where(Project.client_id == client_id)

        if status is not None:
            query_obj = query_obj.where(Project.status == status)

        if start_date is not None and end_date is not None:
            query_obj = query_obj.where(
                (Project.start_date <= end_date) & (Project.end_date >= start_date)
            )
        elif start_date is not None:
            query_obj = query_obj.where(Project.end_date >= start_date)
        elif end_date is not None:
            query_obj = query_obj.where(Project.start_date <= end_date)

        # Add search filter
        if query is not None and query.strip():
            search_filter = Project.name.ilike(f'%{query.strip()}%')
            query_obj = query_obj.where(search_filter)

        query_obj = query_obj.order_by(Project.created_at.desc())

        return query_obj

    async def delete(self, project_id: Union[int, UUID]) -> bool:
        """Soft delete project.

        Args:
            project_id: Project ID

        Returns:
            True if project was deleted, False otherwise
        """
        project = await self.get_by_id(project_id)
        if project is None:
            return False

        # Use soft delete instead of physical deletion
        project.deleted_at = datetime.now(timezone.utc)
        await self.session.flush()
        return True
