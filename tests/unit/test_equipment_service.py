"""Unit tests for EquipmentService."""

from datetime import datetime, timedelta
from typing import AsyncGenerator

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.category import Category
from backend.models.equipment import Equipment, EquipmentStatus
from backend.services.category import CategoryService
from backend.services.equipment import EquipmentService


class TestEquipmentService:
    """Test cases for EquipmentService."""

    @pytest.fixture  # type: ignore[misc]
    async def service(self, db_session: AsyncSession) -> EquipmentService:
        """Create EquipmentService instance.

        Args:
            db_session: Database session

        Returns:
            EquipmentService instance
        """
        return EquipmentService(db_session)

    @pytest.fixture  # type: ignore[misc]
    async def category(self, db_session: AsyncSession) -> Category:
        """Create test category.

        Args:
            db_session: Database session

        Returns:
            Created category
        """
        category_service = CategoryService(db_session)
        return await category_service.create_category(
            name='Test Category',
            description='Test Description',
        )

    @pytest.fixture  # type: ignore[misc]
    async def equipment(
        self, service: EquipmentService, category: Category
    ) -> AsyncGenerator[Equipment, None]:
        """Create test equipment.

        Args:
            service: EquipmentService instance
            category: Test category

        Yields:
            Created equipment
        """
        equipment = await service.create_equipment(
            name='Test Equipment',
            category_id=category.id,
            description='Test Description',
            serial_number='TEST001',
            barcode='TEST001',
            daily_rate=100.0,
            replacement_cost=1000.0,
        )
        yield equipment

    async def test_create_equipment(
        self, service: EquipmentService, category: Category
    ) -> None:
        """Test equipment creation.

        Args:
            service: EquipmentService instance
            category: Test category
        """
        # Create equipment
        equipment = await service.create_equipment(
            name='Test Equipment',
            category_id=category.id,
            description='Test Description',
            serial_number='TEST001',
            barcode='TEST001',
            daily_rate=100.0,
            replacement_cost=1000.0,
        )

        # Check equipment properties
        assert equipment.name == 'Test Equipment'
        assert equipment.category_id == category.id
        assert equipment.description == 'Test Description'
        assert equipment.serial_number == 'TEST001'
        assert equipment.barcode == 'TEST001'
        assert equipment.daily_rate == 100.0
        assert equipment.replacement_cost == 1000.0
        assert equipment.status == EquipmentStatus.AVAILABLE

        # Try to create equipment with same serial number
        error_msg = 'Equipment with serial number TEST001 already exists'
        with pytest.raises(ValueError, match=error_msg):
            await service.create_equipment(
                name='Another Equipment',
                category_id=category.id,
                description='Another Description',
                serial_number='TEST001',  # Same serial number
                barcode='TEST002',
                daily_rate=200.0,
                replacement_cost=2000.0,
            )

        # Try to create equipment with same barcode
        error_msg = 'Equipment with barcode TEST001 already exists'
        with pytest.raises(ValueError, match=error_msg):
            await service.create_equipment(
                name='Another Equipment',
                category_id=category.id,
                description='Another Description',
                serial_number='TEST002',
                barcode='TEST001',  # Same barcode
                daily_rate=200.0,
                replacement_cost=2000.0,
            )

    async def test_update_equipment(
        self, service: EquipmentService, equipment: Equipment, category: Category
    ) -> None:
        """Test equipment update.

        Args:
            service: EquipmentService instance
            equipment: Test equipment
            category: Test category
        """
        # Create another category for update
        category_service = CategoryService(service.session)
        another_category = await category_service.create_category(
            name='Another Category',
            description='Another Description',
        )

        # Update equipment
        updated = await service.update_equipment(
            equipment_id=equipment.id,
            name='Updated Equipment',
            category_id=another_category.id,
            description='Updated Description',
            daily_rate=200.0,
            replacement_cost=2000.0,
        )

        # Check updated properties
        assert updated is not None
        assert updated.name == 'Updated Equipment'
        assert updated.category_id == another_category.id
        assert updated.description == 'Updated Description'
        assert updated.daily_rate == 200.0
        assert updated.replacement_cost == 2000.0

        # Update only some fields
        updated = await service.update_equipment(
            equipment_id=equipment.id,
            name='New Name',
        )

        # Check that only name was updated
        assert updated is not None
        assert updated.name == 'New Name'
        assert updated.category_id == another_category.id  # Unchanged
        assert updated.description == 'Updated Description'  # Unchanged
        assert updated.daily_rate == 200.0  # Unchanged
        assert updated.replacement_cost == 2000.0  # Unchanged

        # Try to update non-existent equipment
        updated = await service.update_equipment(
            equipment_id=9999,
            name='Non-existent',
        )
        assert updated is None

    async def test_change_status(
        self, service: EquipmentService, equipment: Equipment
    ) -> None:
        """Test equipment status change.

        Args:
            service: EquipmentService instance
            equipment: Test equipment
        """
        # Change status to MAINTENANCE
        updated = await service.change_status(
            equipment_id=equipment.id,
            status=EquipmentStatus.MAINTENANCE,
        )

        # Check updated status
        assert updated is not None
        assert updated.status == EquipmentStatus.MAINTENANCE

        # Try to change status of non-existent equipment
        updated = await service.change_status(
            equipment_id=9999,
            status=EquipmentStatus.MAINTENANCE,
        )
        assert updated is None

    async def test_check_availability(
        self, service: EquipmentService, equipment: Equipment
    ) -> None:
        """Test equipment availability check.

        Args:
            service: EquipmentService instance
            equipment: Test equipment
        """
        # Check availability for available equipment
        start_date = datetime.now()
        end_date = start_date + timedelta(days=1)
        is_available = await service.check_availability(
            equipment_id=equipment.id,
            start_date=start_date,
            end_date=end_date,
        )
        assert is_available is True

        # Change status to MAINTENANCE
        await service.change_status(
            equipment_id=equipment.id,
            status=EquipmentStatus.MAINTENANCE,
        )

        # Check availability for unavailable equipment
        is_available = await service.check_availability(
            equipment_id=equipment.id,
            start_date=start_date,
            end_date=end_date,
        )
        assert is_available is False

        # Check availability for non-existent equipment
        is_available = await service.check_availability(
            equipment_id=9999,
            start_date=start_date,
            end_date=end_date,
        )
        assert is_available is False

    async def test_get_available_equipment(
        self, service: EquipmentService, equipment: Equipment
    ) -> None:
        """Test getting available equipment.

        Args:
            service: EquipmentService instance
            equipment: Test equipment
        """
        # Get available equipment
        start_date = datetime.now()
        end_date = start_date + timedelta(days=1)
        available = await service.get_available_equipment(
            start_date=start_date,
            end_date=end_date,
        )
        assert len(available) == 1
        assert available[0].id == equipment.id

        # Change status to MAINTENANCE
        await service.change_status(
            equipment_id=equipment.id,
            status=EquipmentStatus.MAINTENANCE,
        )

        # Get available equipment after status change
        available = await service.get_available_equipment(
            start_date=start_date,
            end_date=end_date,
        )
        assert len(available) == 0

    async def test_search_equipment(
        self, service: EquipmentService, equipment: Equipment
    ) -> None:
        """Test equipment search.

        Args:
            service: EquipmentService instance
            equipment: Test equipment
        """
        # Search by name
        results = await service.search_equipment('Test Equipment')
        assert len(results) == 1
        assert results[0].id == equipment.id

        # Search by description
        results = await service.search_equipment('Test Description')
        assert len(results) == 1
        assert results[0].id == equipment.id

        # Search with no matches
        results = await service.search_equipment('Non-existent')
        assert len(results) == 0

    async def test_get_by_category(
        self, service: EquipmentService, equipment: Equipment, category: Category
    ) -> None:
        """Test getting equipment by category.

        Args:
            service: EquipmentService instance
            equipment: Test equipment
            category: Test category
        """
        # Get equipment by category
        results = await service.get_by_category(category_id=category.id)
        assert len(results) == 1
        assert results[0].id == equipment.id

        # Get equipment from non-existent category
        results = await service.get_by_category(category_id=9999)
        assert len(results) == 0

    async def test_get_by_barcode(
        self, service: EquipmentService, equipment: Equipment
    ) -> None:
        """Test getting equipment by barcode.

        Args:
            service: EquipmentService instance
            equipment: Test equipment
        """
        # Get equipment by barcode
        result = await service.get_by_barcode(barcode='TEST001')
        assert result is not None
        assert result.id == equipment.id

        # Get non-existent equipment by barcode
        result = await service.get_by_barcode(barcode='NON-EXISTENT')
        assert result is None
