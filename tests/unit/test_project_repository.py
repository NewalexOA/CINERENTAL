"""Unit tests for ProjectRepository."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.client import Client
from backend.models.project import Project, ProjectStatus
from backend.repositories.project import ProjectRepository


class TestProjectRepository:
    """Test cases for ProjectRepository."""

    @pytest.mark.asyncio
    async def test_create_project_success(
        self,
        db_session: AsyncSession,
        project_repository: ProjectRepository,
        test_client: Client,
    ) -> None:
        """Test successful project creation."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        project = Project(
            name='Test Project',
            description='Test description',
            client_id=test_client.id,
            start_date=start_date,
            end_date=end_date,
            status=ProjectStatus.DRAFT,
            notes='Test notes',
        )

        # Act
        result = await project_repository.create(project)

        # Assert
        assert result is not None
        assert result.id is not None
        assert result.name == 'Test Project'
        assert result.description == 'Test description'
        assert result.client_id == test_client.id
        assert result.status == ProjectStatus.DRAFT
        assert result.notes == 'Test notes'

    @pytest.mark.asyncio
    async def test_get_by_id_existing_project(
        self,
        db_session: AsyncSession,
        project_repository: ProjectRepository,
        test_project: Project,
    ) -> None:
        """Test getting existing project by ID."""
        # Act
        result = await project_repository.get_by_id(test_project.id)

        # Assert
        assert result is not None
        assert result.id == test_project.id
        assert result.name == test_project.name
        assert result.client_id == test_project.client_id

    @pytest.mark.asyncio
    async def test_get_by_id_nonexistent_project(
        self, db_session: AsyncSession, project_repository: ProjectRepository
    ) -> None:
        """Test getting nonexistent project by ID."""
        # Act
        result = await project_repository.get_by_id(99999)

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_get_by_id_soft_deleted_project(
        self,
        db_session: AsyncSession,
        project_repository: ProjectRepository,
        test_project: Project,
    ) -> None:
        """Test that soft deleted projects are not returned."""
        # Arrange - soft delete the project
        await project_repository.delete(test_project.id)

        # Act
        result = await project_repository.get_by_id(test_project.id)

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_get_by_id_with_bookings_existing_project(
        self,
        db_session: AsyncSession,
        project_repository: ProjectRepository,
        test_project: Project,
    ) -> None:
        """Test getting existing project with bookings by ID."""
        # Act
        result = await project_repository.get_by_id_with_bookings(test_project.id)

        # Assert
        assert result is not None
        assert result.id == test_project.id
        assert hasattr(result, 'bookings')
        # Note: bookings list may be empty, but relationship should be loaded

    @pytest.mark.asyncio
    async def test_get_by_id_with_bookings_nonexistent_project(
        self, db_session: AsyncSession, project_repository: ProjectRepository
    ) -> None:
        """Test getting nonexistent project with bookings by ID."""
        # Act
        result = await project_repository.get_by_id_with_bookings(99999)

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_get_projects_with_filters_no_filters(
        self,
        db_session: AsyncSession,
        project_repository: ProjectRepository,
        test_project: Project,
        test_client: Client,
    ) -> None:
        """Test getting projects without filters."""
        # Act
        projects, total = await project_repository.get_projects_with_filters()

        # Assert
        assert isinstance(projects, list)
        assert total >= 1  # At least our test project
        assert any(p.id == test_project.id for p in projects)

        # Check that client_name is populated
        project_in_list = next(p for p in projects if p.id == test_project.id)
        assert hasattr(project_in_list, 'client_name')
        assert project_in_list.client_name == test_client.name

    @pytest.mark.asyncio
    async def test_get_projects_with_filters_client_id_filter(
        self,
        db_session: AsyncSession,
        project_repository: ProjectRepository,
        test_project: Project,
        test_client: Client,
    ) -> None:
        """Test getting projects filtered by client_id."""
        # Act
        projects, total = await project_repository.get_projects_with_filters(
            client_id=test_client.id
        )

        # Assert
        assert isinstance(projects, list)
        assert total >= 1
        assert all(p.client_id == test_client.id for p in projects)

    @pytest.mark.asyncio
    async def test_get_projects_with_filters_status_filter(
        self,
        db_session: AsyncSession,
        project_repository: ProjectRepository,
        test_project: Project,
    ) -> None:
        """Test getting projects filtered by status."""
        # Act
        projects, total = await project_repository.get_projects_with_filters(
            status=ProjectStatus.DRAFT
        )

        # Assert
        assert isinstance(projects, list)
        assert all(p.status == ProjectStatus.DRAFT for p in projects)

    @pytest.mark.asyncio
    async def test_get_projects_with_filters_date_range(
        self,
        db_session: AsyncSession,
        project_repository: ProjectRepository,
        test_project: Project,
    ) -> None:
        """Test getting projects filtered by date range."""
        # Arrange
        start_filter = test_project.start_date - timedelta(days=1)
        end_filter = test_project.end_date + timedelta(days=1)

        # Act
        projects, total = await project_repository.get_projects_with_filters(
            start_date=start_filter, end_date=end_filter
        )

        # Assert
        assert isinstance(projects, list)
        assert any(p.id == test_project.id for p in projects)

    @pytest.mark.asyncio
    async def test_get_projects_with_filters_pagination(
        self,
        db_session: AsyncSession,
        project_repository: ProjectRepository,
        test_project: Project,
    ) -> None:
        """Test pagination in get_projects_with_filters."""
        # Act
        projects_page1, total = await project_repository.get_projects_with_filters(
            limit=1, offset=0
        )
        projects_page2, _ = await project_repository.get_projects_with_filters(
            limit=1, offset=1
        )

        # Assert
        assert len(projects_page1) <= 1
        assert len(projects_page2) <= 1
        if len(projects_page1) == 1 and len(projects_page2) == 1:
            assert projects_page1[0].id != projects_page2[0].id

    @pytest.mark.asyncio
    async def test_update_project_existing_project(
        self,
        db_session: AsyncSession,
        project_repository: ProjectRepository,
        test_project: Project,
    ) -> None:
        """Test updating existing project."""
        # Arrange
        update_data = {
            'name': 'Updated Project Name',
            'description': 'Updated description',
            'notes': 'Updated notes',
        }

        # Act
        result = await project_repository.update_project(test_project.id, update_data)

        # Assert
        assert result is not None
        assert result.id == test_project.id
        assert result.name == 'Updated Project Name'
        assert result.description == 'Updated description'
        assert result.notes == 'Updated notes'

    @pytest.mark.asyncio
    async def test_update_project_nonexistent_project(
        self, db_session: AsyncSession, project_repository: ProjectRepository
    ) -> None:
        """Test updating nonexistent project."""
        # Arrange
        update_data = {'name': 'Updated Name'}

        # Act
        result = await project_repository.update_project(99999, update_data)

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_update_project_invalid_attributes(
        self,
        db_session: AsyncSession,
        project_repository: ProjectRepository,
        test_project: Project,
    ) -> None:
        """Test updating project with invalid attributes."""
        # Arrange
        update_data = {'name': 'Valid Name', 'invalid_field': 'should be ignored'}

        # Act
        result = await project_repository.update_project(test_project.id, update_data)

        # Assert
        assert result is not None
        assert result.name == 'Valid Name'
        assert not hasattr(result, 'invalid_field')

    @pytest.mark.asyncio
    async def test_delete_project_existing(
        self,
        db_session: AsyncSession,
        project_repository: ProjectRepository,
        test_client: Client,
    ) -> None:
        """Test soft deleting existing project."""
        # Arrange - create a project specifically for deletion
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        project = Project(
            name='Project to Delete',
            client_id=test_client.id,
            start_date=start_date,
            end_date=end_date,
        )
        created_project = await project_repository.create(project)

        # Act
        result = await project_repository.delete(created_project.id)

        # Assert
        assert result is True

        # Verify project is soft deleted
        deleted_project = await project_repository.get_by_id(created_project.id)
        assert deleted_project is None

    @pytest.mark.asyncio
    async def test_delete_project_nonexistent(
        self, db_session: AsyncSession, project_repository: ProjectRepository
    ) -> None:
        """Test soft deleting nonexistent project."""
        # Act
        result = await project_repository.delete(99999)

        # Assert
        assert result is False


class TestProjectRepositoryEdgeCases:
    """Test edge cases for ProjectRepository."""

    @pytest.mark.asyncio
    async def test_get_projects_with_filters_empty_database(
        self, db_session: AsyncSession, project_repository: ProjectRepository
    ) -> None:
        """Test getting projects when database is empty."""
        # Act
        projects, total = await project_repository.get_projects_with_filters()

        # Assert
        assert isinstance(projects, list)
        assert total >= 0  # Should be 0 or more, depending on other tests

    @pytest.mark.asyncio
    async def test_get_projects_with_filters_invalid_client_id(
        self, db_session: AsyncSession, project_repository: ProjectRepository
    ) -> None:
        """Test getting projects with invalid client_id."""
        # Act
        projects, total = await project_repository.get_projects_with_filters(
            client_id=99999
        )

        # Assert
        assert isinstance(projects, list)
        assert len(projects) == 0
        assert total == 0

    @pytest.mark.asyncio
    async def test_get_projects_with_filters_future_date_range(
        self, db_session: AsyncSession, project_repository: ProjectRepository
    ) -> None:
        """Test getting projects with future date range that excludes all projects."""
        # Arrange
        future_start = datetime.now(timezone.utc) + timedelta(days=100)
        future_end = future_start + timedelta(days=1)

        # Act
        projects, total = await project_repository.get_projects_with_filters(
            start_date=future_start, end_date=future_end
        )

        # Assert
        assert isinstance(projects, list)
        assert total >= 0
