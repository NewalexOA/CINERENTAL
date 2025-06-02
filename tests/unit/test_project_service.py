"""Unit tests for ProjectService."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import DateError, NotFoundError
from backend.models.client import Client
from backend.models.equipment import Equipment
from backend.models.project import Project, ProjectStatus
from backend.services.project import ProjectService


class TestProjectServiceCreateProject:
    """Test cases for ProjectService.create_project method."""

    @pytest.mark.asyncio
    async def test_create_project_success(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_client: Client,
    ) -> None:
        """Test successful project creation."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        # Act
        result = await project_service.create_project(
            name='Test Project',
            client_id=test_client.id,
            start_date=start_date,
            end_date=end_date,
            description='Test description',
            notes='Test notes',
        )

        # Assert
        assert result is not None
        assert result.name == 'Test Project'
        assert result.client_id == test_client.id
        assert result.start_date == start_date
        assert result.end_date == end_date
        assert result.description == 'Test description'
        assert result.notes == 'Test notes'
        assert result.status == ProjectStatus.DRAFT

    @pytest.mark.asyncio
    async def test_create_project_invalid_dates(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_client: Client,
    ) -> None:
        """Test project creation with invalid dates (end_date before start_date)."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=7)
        end_date = start_date - timedelta(days=1)  # Invalid: end before start

        # Act & Assert
        with pytest.raises(DateError):
            await project_service.create_project(
                name='Test Project',
                client_id=test_client.id,
                start_date=start_date,
                end_date=end_date,
            )

    @pytest.mark.asyncio
    async def test_create_project_client_not_found(
        self, db_session: AsyncSession, project_service: ProjectService
    ) -> None:
        """Test project creation with nonexistent client."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        # Act & Assert
        with pytest.raises(NotFoundError):
            await project_service.create_project(
                name='Test Project',
                client_id=99999,  # Nonexistent client
                start_date=start_date,
                end_date=end_date,
            )

    @pytest.mark.asyncio
    async def test_create_project_minimal_data(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_client: Client,
    ) -> None:
        """Test project creation with minimal required data."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        # Act
        result = await project_service.create_project(
            name='Minimal Project',
            client_id=test_client.id,
            start_date=start_date,
            end_date=end_date,
        )

        # Assert
        assert result is not None
        assert result.name == 'Minimal Project'
        assert result.description is None
        assert result.notes is None
        assert result.status == ProjectStatus.DRAFT


class TestProjectServiceCreateProjectWithBookings:
    """Test cases for ProjectService.create_project_with_bookings method."""

    @pytest.mark.asyncio
    async def test_create_project_with_bookings_success(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_client: Client,
        test_equipment: Equipment,
    ) -> None:
        """Test successful project creation with bookings."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        bookings_data = [
            {
                'equipment_id': test_equipment.id,
                'start_date': start_date,
                'end_date': end_date,
                'quantity': 1,
            }
        ]

        # Act
        result = await project_service.create_project_with_bookings(
            name='Project with Bookings',
            client_id=test_client.id,
            start_date=start_date,
            end_date=end_date,
            bookings=bookings_data,
            description='Test project with bookings',
        )

        # Assert
        assert result is not None
        assert result.name == 'Project with Bookings'
        assert result.client_id == test_client.id
        assert len(result.bookings) >= 1

        # Verify booking details
        booking = result.bookings[0]
        assert booking.equipment_id == test_equipment.id
        assert booking.project_id == result.id

    @pytest.mark.asyncio
    async def test_create_project_with_bookings_no_bookings(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_client: Client,
    ) -> None:
        """Test project creation with empty bookings list."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        # Act
        result = await project_service.create_project_with_bookings(
            name='Project with No Bookings',
            client_id=test_client.id,
            start_date=start_date,
            end_date=end_date,
            bookings=[],
        )

        # Assert
        assert result is not None
        assert result.name == 'Project with No Bookings'
        assert len(result.bookings) == 0

    @pytest.mark.asyncio
    async def test_create_project_with_bookings_invalid_equipment(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_client: Client,
    ) -> None:
        """Test project creation with invalid equipment in bookings."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        bookings_data = [
            {
                'equipment_id': 99999,  # Nonexistent equipment
                'start_date': start_date,
                'end_date': end_date,
            }
        ]

        # Act
        result = await project_service.create_project_with_bookings(
            name='Project with Invalid Equipment',
            client_id=test_client.id,
            start_date=start_date,
            end_date=end_date,
            bookings=bookings_data,
        )

        # Assert
        # Project should be created even if bookings fail
        assert result is not None
        assert result.name == 'Project with Invalid Equipment'
        # Bookings should be empty since equipment doesn't exist
        assert len(result.bookings) == 0

    @pytest.mark.asyncio
    async def test_create_project_with_bookings_mixed_success_failure(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_client: Client,
        test_equipment: Equipment,
    ) -> None:
        """Test project creation with mix of valid and invalid bookings."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        bookings_data = [
            {
                'equipment_id': test_equipment.id,  # Valid
                'start_date': start_date,
                'end_date': end_date,
            },
            {
                'equipment_id': 99999,  # Invalid
                'start_date': start_date,
                'end_date': end_date,
            },
        ]

        # Act
        result = await project_service.create_project_with_bookings(
            name='Project with Mixed Bookings',
            client_id=test_client.id,
            start_date=start_date,
            end_date=end_date,
            bookings=bookings_data,
        )

        # Assert
        assert result is not None
        assert result.name == 'Project with Mixed Bookings'
        # Only valid booking should be created
        assert len(result.bookings) == 1
        assert result.bookings[0].equipment_id == test_equipment.id

    @pytest.mark.asyncio
    async def test_create_project_with_bookings_invalid_booking_dates(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_client: Client,
        test_equipment: Equipment,
    ) -> None:
        """Test project creation with invalid booking dates."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        bookings_data = [
            {
                'equipment_id': test_equipment.id,
                'start_date': 'invalid_date',  # Invalid date format
                'end_date': end_date,
            }
        ]

        # Act
        result = await project_service.create_project_with_bookings(
            name='Project with Invalid Booking Dates',
            client_id=test_client.id,
            start_date=start_date,
            end_date=end_date,
            bookings=bookings_data,
        )

        # Assert
        # Project should be created even if bookings fail
        assert result is not None
        assert result.name == 'Project with Invalid Booking Dates'
        # Bookings should be empty since dates are invalid
        assert len(result.bookings) == 0


class TestProjectServiceGetProject:
    """Test cases for ProjectService.get_project method."""

    @pytest.mark.asyncio
    async def test_get_project_existing(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_project: Project,
    ) -> None:
        """Test getting existing project."""
        # Act
        result = await project_service.get_project(test_project.id)

        # Assert
        assert result is not None
        assert result.id == test_project.id
        assert result.name == test_project.name

    @pytest.mark.asyncio
    async def test_get_project_nonexistent(
        self, db_session: AsyncSession, project_service: ProjectService
    ) -> None:
        """Test getting nonexistent project."""
        # Act & Assert
        with pytest.raises(NotFoundError):
            await project_service.get_project(99999)

    @pytest.mark.asyncio
    async def test_get_project_with_bookings(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_project: Project,
    ) -> None:
        """Test getting project with bookings."""
        # Act
        result = await project_service.get_project(test_project.id, with_bookings=True)

        # Assert
        assert result is not None
        assert result.id == test_project.id
        assert hasattr(result, 'bookings')


class TestProjectServiceUpdateProject:
    """Test cases for ProjectService.update_project method."""

    @pytest.mark.asyncio
    async def test_update_project_success(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_project: Project,
    ) -> None:
        """Test successful project update."""
        # Act
        result = await project_service.update_project(
            test_project.id,
            name='Updated Project Name',
            description='Updated description',
            notes='Updated notes',
        )

        # Assert
        assert result is not None
        assert result.id == test_project.id
        assert result.name == 'Updated Project Name'
        assert result.description == 'Updated description'
        assert result.notes == 'Updated notes'

    @pytest.mark.asyncio
    async def test_update_project_nonexistent(
        self, db_session: AsyncSession, project_service: ProjectService
    ) -> None:
        """Test updating nonexistent project."""
        # Act & Assert
        with pytest.raises(NotFoundError):
            await project_service.update_project(99999, name='Updated Name')

    @pytest.mark.asyncio
    async def test_update_project_invalid_dates(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_project: Project,
    ) -> None:
        """Test updating project with invalid dates."""
        # Arrange
        invalid_start_date = test_project.end_date + timedelta(days=1)

        # Act & Assert
        with pytest.raises(DateError):
            await project_service.update_project(
                test_project.id, start_date=invalid_start_date
            )

    @pytest.mark.asyncio
    async def test_update_project_nonexistent_client(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_project: Project,
    ) -> None:
        """Test updating project with nonexistent client."""
        # Act & Assert
        with pytest.raises(NotFoundError):
            await project_service.update_project(test_project.id, client_id=99999)

    @pytest.mark.asyncio
    async def test_update_project_partial_update(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_project: Project,
    ) -> None:
        """Test partial project update (only some fields)."""
        # Arrange
        original_description = test_project.description

        # Act
        result = await project_service.update_project(
            test_project.id, name='Only Name Updated'
        )

        # Assert
        assert result is not None
        assert result.name == 'Only Name Updated'
        assert result.description == original_description  # Should remain unchanged


class TestProjectServiceDeleteProject:
    """Test cases for ProjectService.delete_project method."""

    @pytest.mark.asyncio
    async def test_delete_project_success(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_client: Client,
    ) -> None:
        """Test successful project deletion."""
        # Arrange - create a project specifically for deletion
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        project = await project_service.create_project(
            name='Project to Delete',
            client_id=test_client.id,
            start_date=start_date,
            end_date=end_date,
        )

        # Act
        result = await project_service.delete_project(project.id)

        # Assert
        assert result is True

        # Verify project is deleted
        with pytest.raises(NotFoundError):
            await project_service.get_project(project.id)

    @pytest.mark.asyncio
    async def test_delete_project_nonexistent(
        self, db_session: AsyncSession, project_service: ProjectService
    ) -> None:
        """Test deleting nonexistent project."""
        # Act & Assert
        with pytest.raises(NotFoundError):
            await project_service.delete_project(99999)


class TestProjectServiceGetProjects:
    """Test cases for ProjectService.get_projects method."""

    @pytest.mark.asyncio
    async def test_get_projects_success(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_project: Project,
    ) -> None:
        """Test getting projects list."""
        # Act
        projects, total = await project_service.get_projects()

        # Assert
        assert isinstance(projects, list)
        assert total >= 1
        assert any(p.id == test_project.id for p in projects)

    @pytest.mark.asyncio
    async def test_get_projects_with_filters(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_project: Project,
        test_client: Client,
    ) -> None:
        """Test getting projects with filters."""
        # Act
        projects, total = await project_service.get_projects(
            client_id=test_client.id, status=ProjectStatus.DRAFT, limit=10, offset=0
        )

        # Assert
        assert isinstance(projects, list)
        assert all(p.client_id == test_client.id for p in projects)
        assert all(p.status == ProjectStatus.DRAFT for p in projects)


class TestProjectServiceGetProjectAsDict:
    """Test cases for ProjectService.get_project_as_dict method."""

    @pytest.mark.asyncio
    async def test_get_project_as_dict_success(
        self,
        db_session: AsyncSession,
        project_service: ProjectService,
        test_project: Project,
    ) -> None:
        """Test getting project as dictionary."""
        # Act
        result = await project_service.get_project_as_dict(test_project.id)

        # Assert
        assert isinstance(result, dict)
        assert result['id'] == test_project.id
        assert result['name'] == test_project.name
        assert 'client' in result
        assert 'bookings' in result

    @pytest.mark.asyncio
    async def test_get_project_as_dict_nonexistent(
        self, db_session: AsyncSession, project_service: ProjectService
    ) -> None:
        """Test getting nonexistent project as dictionary."""
        # Act & Assert
        with pytest.raises(NotFoundError):
            await project_service.get_project_as_dict(99999)
