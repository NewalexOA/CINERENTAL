"""Integration tests for Projects API endpoints."""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.client import Client
from backend.models.equipment import Equipment
from backend.models.project import Project


class TestProjectsAPIGet:
    """Test cases for GET /api/v1/projects endpoints."""

    @pytest.mark.asyncio
    async def test_get_projects_list_success(
        self, async_client: AsyncClient, test_project: Project
    ) -> None:
        """Test getting projects list."""
        # Act
        response = await async_client.get('/api/v1/projects/')

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        # Check if our test project is in the list
        project_ids = [item['id'] for item in data]
        assert test_project.id in project_ids

    @pytest.mark.asyncio
    async def test_get_projects_list_with_pagination(
        self, async_client: AsyncClient, test_project: Project
    ) -> None:
        """Test getting projects list with pagination."""
        # Act
        response = await async_client.get('/api/v1/projects/?limit=10&offset=0')

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 10

    @pytest.mark.asyncio
    async def test_get_projects_list_with_client_filter(
        self, async_client: AsyncClient, test_project: Project, test_client: Client
    ) -> None:
        """Test getting projects list filtered by client_id."""
        # Act
        url = f'/api/v1/projects/?client_id={test_client.id}'
        response = await async_client.get(url)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # All projects should belong to the specified client
        for item in data:
            assert item['client_id'] == test_client.id

    @pytest.mark.asyncio
    async def test_get_projects_list_with_status_filter(
        self, async_client: AsyncClient, test_project: Project
    ) -> None:
        """Test getting projects list filtered by status."""
        # Act
        response = await async_client.get('/api/v1/projects/?project_status=DRAFT')

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # All projects should have DRAFT status
        for item in data:
            assert item['status'] == 'DRAFT'

    @pytest.mark.asyncio
    async def test_get_project_by_id_success(
        self, async_client: AsyncClient, test_project: Project
    ) -> None:
        """Test getting specific project by ID."""
        # Act
        response = await async_client.get(f'/api/v1/projects/{test_project.id}')

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data['id'] == test_project.id
        assert data['name'] == test_project.name
        assert data['client_id'] == test_project.client_id
        assert data['status'] == test_project.status.value
        assert 'created_at' in data
        assert 'updated_at' in data

    @pytest.mark.asyncio
    async def test_get_project_by_id_not_found(self, async_client: AsyncClient) -> None:
        """Test getting nonexistent project by ID."""
        # Act
        response = await async_client.get('/api/v1/projects/99999')

        # Assert
        assert response.status_code == 404
        data = response.json()
        assert 'detail' in data


class TestProjectsAPIPost:
    """Test cases for POST /api/v1/projects endpoints."""

    @pytest.mark.asyncio
    async def test_create_project_success(
        self, async_client: AsyncClient, test_client: Client
    ) -> None:
        """Test successful project creation."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        project_data = {
            'name': 'API Test Project',
            'description': 'Project created via API test',
            'client_id': test_client.id,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'notes': 'Test notes',
        }

        # Act
        response = await async_client.post('/api/v1/projects/', json=project_data)

        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data['name'] == 'API Test Project'
        assert data['description'] == 'Project created via API test'
        assert data['client_id'] == test_client.id
        assert data['status'] == 'DRAFT'
        assert data['notes'] == 'Test notes'
        assert 'id' in data
        assert 'created_at' in data

    @pytest.mark.asyncio
    async def test_create_project_with_bookings_success(
        self, async_client: AsyncClient, test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test successful project creation with bookings."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        project_data = {
            'name': 'Project with Bookings API Test',
            'client_id': test_client.id,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'bookings': [
                {
                    'equipment_id': test_equipment.id,
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'quantity': 1,
                }
            ],
        }

        # Act
        response = await async_client.post('/api/v1/projects/', json=project_data)

        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data['name'] == 'Project with Bookings API Test'
        assert data['client_id'] == test_client.id
        # Check if project was created with bookings
        assert 'id' in data

    @pytest.mark.asyncio
    async def test_create_project_invalid_data(self, async_client: AsyncClient) -> None:
        """Test project creation with invalid data."""
        # Arrange
        invalid_project_data = {
            'name': '',  # Empty name
            'client_id': 99999,  # Nonexistent client
            'start_date': 'invalid_date',
            'end_date': 'invalid_date',
        }

        # Act
        url = '/api/v1/projects/'
        response = await async_client.post(url, json=invalid_project_data)

        # Assert
        assert response.status_code == 400  # Bad request for invalid data

    @pytest.mark.asyncio
    async def test_create_project_invalid_dates(
        self, async_client: AsyncClient, test_client: Client
    ) -> None:
        """Test project creation with invalid dates."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=7)
        end_date = start_date - timedelta(days=1)  # End before start

        project_data = {
            'name': 'Invalid Dates Project',
            'client_id': test_client.id,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        }

        # Act
        response = await async_client.post('/api/v1/projects/', json=project_data)

        # Assert
        assert response.status_code == 400  # Bad request
        data = response.json()
        assert 'detail' in data

    @pytest.mark.asyncio
    async def test_create_project_nonexistent_client(
        self, async_client: AsyncClient
    ) -> None:
        """Test project creation with nonexistent client."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        project_data = {
            'name': 'Project with Invalid Client',
            'client_id': 99999,  # Nonexistent client
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        }

        # Act
        response = await async_client.post('/api/v1/projects/', json=project_data)

        # Assert
        assert response.status_code == 404  # Not found
        data = response.json()
        assert 'detail' in data


class TestProjectsAPIPut:
    """Test cases for PUT /api/v1/projects/{id} endpoints."""

    @pytest.mark.asyncio
    async def test_update_project_success(
        self, async_client: AsyncClient, test_project: Project, test_client: Client
    ) -> None:
        """Test successful project update."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=2)
        end_date = start_date + timedelta(days=10)

        update_data = {
            'name': 'Updated Project Name',
            'description': 'Updated description',
            'client_id': test_client.id,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'status': 'ACTIVE',
            'notes': 'Updated notes',
        }

        # Act
        response = await async_client.put(
            f'/api/v1/projects/{test_project.id}', json=update_data
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data['id'] == test_project.id
        assert data['name'] == 'Updated Project Name'
        assert data['description'] == 'Updated description'
        assert data['status'] == 'ACTIVE'
        assert data['notes'] == 'Updated notes'

    @pytest.mark.asyncio
    async def test_update_project_not_found(
        self, async_client: AsyncClient, test_client: Client
    ) -> None:
        """Test updating nonexistent project."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        update_data = {
            'name': 'Updated Name',
            'client_id': test_client.id,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        }

        # Act
        response = await async_client.put('/api/v1/projects/99999', json=update_data)

        # Assert
        assert response.status_code == 404
        data = response.json()
        assert 'detail' in data

    @pytest.mark.asyncio
    async def test_update_project_invalid_dates(
        self, async_client: AsyncClient, test_project: Project, test_client: Client
    ) -> None:
        """Test updating project with invalid dates."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=7)
        end_date = start_date - timedelta(days=1)  # End before start

        update_data = {
            'name': 'Updated Name',
            'client_id': test_client.id,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        }

        # Act
        response = await async_client.put(
            f'/api/v1/projects/{test_project.id}', json=update_data
        )

        # Assert
        assert response.status_code == 400  # Bad request
        data = response.json()
        assert 'detail' in data


class TestProjectsAPIPatch:
    """Test cases for PATCH /api/v1/projects/{id} endpoints."""

    @pytest.mark.asyncio
    async def test_partial_update_project_success(
        self, async_client: AsyncClient, test_project: Project
    ) -> None:
        """Test successful partial project update."""
        # Arrange
        update_data = {'name': 'Partially Updated Name', 'status': 'ACTIVE'}

        # Act
        response = await async_client.patch(
            f'/api/v1/projects/{test_project.id}', json=update_data
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data['id'] == test_project.id
        assert data['name'] == 'Partially Updated Name'
        assert data['status'] == 'ACTIVE'
        # Other fields should remain unchanged

    @pytest.mark.asyncio
    async def test_partial_update_project_not_found(
        self, async_client: AsyncClient
    ) -> None:
        """Test partial update of nonexistent project."""
        # Arrange
        update_data = {'name': 'Updated Name'}

        # Act
        response = await async_client.patch('/api/v1/projects/99999', json=update_data)

        # Assert
        assert response.status_code == 404
        data = response.json()
        assert 'detail' in data


class TestProjectsAPIDelete:
    """Test cases for DELETE /api/v1/projects/{id} endpoints."""

    @pytest.mark.asyncio
    async def test_delete_project_success(
        self, async_client: AsyncClient, db_session: AsyncSession, test_client: Client
    ) -> None:
        """Test successful project deletion."""
        # Arrange - create a project specifically for deletion
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        project = Project(
            name='Project to Delete via API',
            client_id=test_client.id,
            start_date=start_date,
            end_date=end_date,
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        # Act
        response = await async_client.delete(f'/api/v1/projects/{project.id}')

        # Assert
        assert response.status_code == 200  # Returns boolean, not 204
        data = response.json()
        assert data is True  # Should return True for successful deletion

    @pytest.mark.asyncio
    async def test_delete_project_not_found(self, async_client: AsyncClient) -> None:
        """Test deleting nonexistent project."""
        # Act
        response = await async_client.delete('/api/v1/projects/99999')

        # Assert
        assert response.status_code == 404
        data = response.json()
        assert 'detail' in data


class TestProjectsAPIBookings:
    """Test cases for project bookings management endpoints."""

    @pytest.mark.asyncio
    async def test_get_project_bookings(
        self, async_client: AsyncClient, test_project: Project
    ) -> None:
        """Test getting project bookings."""
        # Act
        url = f'/api/v1/projects/{test_project.id}/bookings'
        response = await async_client.get(url)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Bookings list might be empty, which is fine

    @pytest.mark.asyncio
    async def test_get_project_print_data(
        self, async_client: AsyncClient, test_project: Project
    ) -> None:
        """Test getting project print data."""
        # Act
        response = await async_client.get(f'/api/v1/projects/{test_project.id}/print')

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert 'project' in data
        assert 'client' in data
        assert 'equipment' in data
        assert 'total_items' in data
        assert data['project']['id'] == test_project.id


class TestProjectsAPIValidation:
    """Test cases for input validation."""

    @pytest.mark.asyncio
    async def test_create_project_missing_required_fields(
        self, async_client: AsyncClient
    ) -> None:
        """Test project creation with missing required fields."""
        # Arrange
        invalid_data = {
            'description': 'Missing required fields'
            # Missing: name, client_id, start_date, end_date
        }

        # Act
        response = await async_client.post('/api/v1/projects/', json=invalid_data)

        # Assert
        assert response.status_code == 400  # Bad request for missing fields
        data = response.json()
        assert 'detail' in data

    @pytest.mark.asyncio
    async def test_create_project_invalid_field_types(
        self, async_client: AsyncClient
    ) -> None:
        """Test project creation with invalid field types."""
        # Arrange
        invalid_data = {
            'name': 123,  # Should be string
            'client_id': 'not_a_number',  # Should be integer
            'start_date': 'not_a_date',  # Should be datetime
            'end_date': 'not_a_date',  # Should be datetime
        }

        # Act
        response = await async_client.post('/api/v1/projects/', json=invalid_data)

        # Assert
        assert response.status_code == 400  # Bad request for invalid types
