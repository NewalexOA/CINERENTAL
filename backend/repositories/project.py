"""Project repository module.

This module provides repository functionality for Project model.
"""

from datetime import datetime
from typing import List, Optional, Tuple, Union, cast
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models import Client, Project, ProjectStatus
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
            Project if found, None otherwise
        """
        query = select(Project).where(Project.id == project_id)
        result = await self.session.execute(query)
        return result.scalars().first()

    async def get_by_id_with_bookings(
        self, project_id: Union[int, UUID]
    ) -> Optional[Project]:
        """Get project by ID with bookings preloaded.

        Args:
            project_id: Project ID

        Returns:
            Project with bookings if found, None otherwise
        """
        query = (
            select(Project)
            .where(Project.id == project_id)
            .options(selectinload(Project.bookings))
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
    ) -> Tuple[List[Project], int]:
        """Get all projects with pagination and filtering.

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
        query = select(Project)
        count_query = select(func.count(Project.id))

        # Apply filters
        if client_id is not None:
            query = query.where(Project.client_id == client_id)
            count_query = count_query.where(Project.client_id == client_id)

        if status is not None:
            query = query.where(Project.status == status)
            count_query = count_query.where(Project.status == status)

        if start_date is not None:
            query = query.where(Project.start_date >= start_date)
            count_query = count_query.where(Project.start_date >= start_date)

        if end_date is not None:
            query = query.where(Project.end_date <= end_date)
            count_query = count_query.where(Project.end_date <= end_date)

        # Add client relationship for response
        query = query.join(Client).add_columns(Client.name.label('client_name'))

        # Apply pagination
        query = query.limit(limit).offset(offset)

        # Execute queries
        result = await self.session.execute(query)
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
            if hasattr(project, key) and value is not None:
                setattr(project, key, value)

        await self.session.flush()
        await self.session.refresh(project)
        return project

    async def delete(self, project_id: Union[int, UUID]) -> bool:
        """Delete project.

        Args:
            project_id: Project ID

        Returns:
            True if project was deleted, False otherwise
        """
        project = await self.get_by_id(project_id)
        if project is None:
            return False

        await self.session.delete(project)
        await self.session.flush()
        return True
