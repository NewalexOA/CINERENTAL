"""Tests for equipment rental status functionality after refactoring."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.equipment import EquipmentStatus
from backend.repositories.equipment import EquipmentRepository
from backend.services.booking import BookingService
from backend.services.category import CategoryService
from backend.services.client import ClientService
from backend.services.equipment import EquipmentService
from backend.services.project import ProjectService


@pytest.mark.asyncio
class TestEquipmentRentalStatus:
    """Test equipment rental status functionality."""

    async def test_repository_get_active_projects_for_equipment(
        self, db_session: AsyncSession
    ) -> None:
        """Test repository method returns correct raw data."""
        # Create test data using services
        category_service = CategoryService(db_session)
        category = await category_service.create_category(
            name='Test Category', description='Test Description'
        )

        equipment_service = EquipmentService(db_session)
        equipment = await equipment_service.create_equipment(
            name='Test Equipment',
            category_id=category.id,
            description='Test Description',
        )

        client_service = ClientService(db_session)
        client = await client_service.create_client(
            name='Test Client',
            email='test@example.com',
        )

        project_service = ProjectService(db_session)
        project = await project_service.create_project(
            name='Test Project',
            description='Test Description',
            client_id=client.id,
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=7),
        )

        # Create active booking
        booking_service = BookingService(db_session)
        await booking_service.create_booking(
            client_id=client.id,
            equipment_id=equipment.id,
            project_id=project.id,
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=7),
            total_amount=100,
            deposit_amount=50,
        )

        # Test repository method
        repository = EquipmentRepository(db_session)
        result = await repository.get_active_projects_for_equipment([equipment.id])

        assert len(result) == 1
        assert result[0]['equipment_id'] == equipment.id
        assert result[0]['project_id'] == project.id
        assert result[0]['project_name'] == project.name
        assert 'start_date' in result[0]
        assert 'end_date' in result[0]

    async def test_repository_get_active_projects_empty_list(
        self, db_session: AsyncSession
    ) -> None:
        """Test repository method handles empty equipment list."""
        repository = EquipmentRepository(db_session)
        result = await repository.get_active_projects_for_equipment([])

        assert result == []

    async def test_service_get_active_projects_for_equipment(
        self, db_session: AsyncSession
    ) -> None:
        """Test service method processes data correctly."""
        # Create test data using services
        category_service = CategoryService(db_session)
        category = await category_service.create_category(
            name='Test Category', description='Test Description'
        )

        equipment_service = EquipmentService(db_session)
        equipment = await equipment_service.create_equipment(
            name='Test Equipment',
            category_id=category.id,
            description='Test Description',
        )

        client_service = ClientService(db_session)
        client = await client_service.create_client(
            name='Test Client',
            email='test@example.com',
        )

        project_service = ProjectService(db_session)
        project = await project_service.create_project(
            name='Test Project',
            description='Test Description',
            client_id=client.id,
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=7),
        )

        # Create active booking
        booking_service = BookingService(db_session)
        await booking_service.create_booking(
            client_id=client.id,
            equipment_id=equipment.id,
            project_id=project.id,
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=7),
            total_amount=100,
            deposit_amount=50,
        )

        # Test service method
        service = EquipmentService(db_session)
        result = await service._get_active_projects_for_equipment([equipment.id])

        assert equipment.id in result
        projects = result[equipment.id]
        assert len(projects) == 1
        assert projects[0]['id'] == project.id
        assert projects[0]['name'] == project.name
        assert 'dates' in projects[0]
        assert ' - ' in projects[0]['dates']  # Date range format

    async def test_service_get_equipment_list_with_rental_status(
        self, db_session: AsyncSession
    ) -> None:
        """Test service method returns equipment with rental status."""
        # Create test data using services
        category_service = CategoryService(db_session)
        category = await category_service.create_category(
            name='Test Category', description='Test Description'
        )

        equipment_service = EquipmentService(db_session)
        equipment = await equipment_service.create_equipment(
            name='Test Equipment',
            category_id=category.id,
            description='Test Description',
        )

        client_service = ClientService(db_session)
        client = await client_service.create_client(
            name='Test Client',
            email='test@example.com',
        )

        project_service = ProjectService(db_session)
        project = await project_service.create_project(
            name='Test Project',
            description='Test Description',
            client_id=client.id,
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=7),
        )

        # Create active booking
        booking_service = BookingService(db_session)
        await booking_service.create_booking(
            client_id=client.id,
            equipment_id=equipment.id,
            project_id=project.id,
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=7),
            total_amount=100,
            deposit_amount=50,
        )

        # Test service method
        service = EquipmentService(db_session)
        result = await service.get_equipment_list_with_rental_status(skip=0, limit=10)

        assert len(result) >= 1
        equipment_item = next(
            (item for item in result if item.id == equipment.id), None
        )
        assert equipment_item is not None
        assert hasattr(equipment_item, 'active_projects')
        assert len(equipment_item.active_projects) == 1
        assert equipment_item.active_projects[0]['id'] == project.id

    async def test_service_get_equipment_list_with_rental_status_pagination(
        self, db_session: AsyncSession
    ) -> None:
        """Test service method respects pagination parameters."""
        # Create test category
        category_service = CategoryService(db_session)
        category = await category_service.create_category(
            name='Test Category', description='Test Description'
        )

        # Create multiple equipment items
        equipment_service = EquipmentService(db_session)
        equipment_list = []
        for i in range(5):
            equipment = await equipment_service.create_equipment(
                name=f'Equipment {i}',
                category_id=category.id,
                description=f'Test Description {i}',
            )
            equipment_list.append(equipment)

        # Test pagination
        service = EquipmentService(db_session)
        result = await service.get_equipment_list_with_rental_status(skip=0, limit=3)

        assert len(result) == 3

        # Test second page
        result_page2 = await service.get_equipment_list_with_rental_status(
            skip=3, limit=3
        )
        assert len(result_page2) == 2  # Remaining items

        # Ensure no overlap
        page1_ids = {item.id for item in result}
        page2_ids = {item.id for item in result_page2}
        assert page1_ids.isdisjoint(page2_ids)

    async def test_service_get_equipment_list_with_rental_status_filters(
        self, db_session: AsyncSession
    ) -> None:
        """Test service method applies filters correctly."""
        # Create test category
        category_service = CategoryService(db_session)
        category = await category_service.create_category(
            name='Test Category', description='Test Description'
        )

        # Create equipment with different statuses
        equipment_service = EquipmentService(db_session)
        await equipment_service.create_equipment(
            name='Available Equipment',
            category_id=category.id,
            description='Test Description',
        )
        equipment_maintenance = await equipment_service.create_equipment(
            name='Maintenance Equipment',
            category_id=category.id,
            description='Test Description',
        )

        # Change status of second equipment
        await equipment_service.change_status(
            equipment_maintenance.id, EquipmentStatus.MAINTENANCE
        )

        # Test status filter
        service = EquipmentService(db_session)
        result = await service.get_equipment_list_with_rental_status(
            skip=0, limit=10, filters={'status': EquipmentStatus.AVAILABLE}
        )

        # Should only return available equipment
        assert len(result) >= 1
        for item in result:
            assert item.status == EquipmentStatus.AVAILABLE

        # Verify maintenance equipment is not included
        maintenance_ids = {item.id for item in result}
        assert equipment_maintenance.id not in maintenance_ids

    async def test_architectural_separation_of_concerns(
        self, db_session: AsyncSession
    ) -> None:
        """Test that repository and service layers are properly separated."""
        # Test repository returns raw data
        repository = EquipmentRepository(db_session)

        # Create test data using services
        category_service = CategoryService(db_session)
        category = await category_service.create_category(
            name='Test Category', description='Test Description'
        )

        equipment_service = EquipmentService(db_session)
        equipment = await equipment_service.create_equipment(
            name='Test Equipment',
            category_id=category.id,
            description='Test Description',
        )

        client_service = ClientService(db_session)
        client = await client_service.create_client(
            name='Test Client',
            email='test@example.com',
        )

        project_service = ProjectService(db_session)
        project = await project_service.create_project(
            name='Test Project',
            description='Test Description',
            client_id=client.id,
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=7),
        )

        # Create active booking
        booking_service = BookingService(db_session)
        await booking_service.create_booking(
            client_id=client.id,
            equipment_id=equipment.id,
            project_id=project.id,
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=7),
            total_amount=100,
            deposit_amount=50,
        )

        # Repository should return raw data (dict)
        repo_result = await repository.get_active_projects_for_equipment([equipment.id])
        assert isinstance(repo_result, list)
        assert len(repo_result) == 1
        assert isinstance(repo_result[0], dict)
        assert 'equipment_id' in repo_result[0]
        assert 'project_id' in repo_result[0]
        assert 'project_name' in repo_result[0]
        assert 'start_date' in repo_result[0]
        assert 'end_date' in repo_result[0]

        # Service should process data (formatted dates, grouping)
        service = EquipmentService(db_session)
        service_result = await service._get_active_projects_for_equipment(
            [equipment.id]
        )
        assert isinstance(service_result, dict)
        assert equipment.id in service_result
        assert isinstance(service_result[equipment.id], list)
        assert isinstance(service_result[equipment.id][0], dict)
        assert 'dates' in service_result[equipment.id][0]  # Formatted date range
        assert 'id' in service_result[equipment.id][0]
        assert 'name' in service_result[equipment.id][0]
