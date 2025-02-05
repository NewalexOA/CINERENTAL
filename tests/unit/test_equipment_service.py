"""Unit tests for equipment service."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import BusinessError
from backend.models.booking import BookingStatus, Booking
from backend.models.category import Category
from backend.models.client import Client
from backend.models.equipment import Equipment, EquipmentStatus
from backend.repositories.booking import BookingRepository
from backend.repositories.equipment import EquipmentRepository
from backend.services.booking import BookingService
from backend.services.equipment import EquipmentService
from tests.conftest import async_test, async_fixture


class TestEquipmentService:
    """Test cases for EquipmentService."""

    @async_fixture
    async def service(self, db_session: AsyncSession) -> EquipmentService:
        """Create EquipmentService instance.

        Args:
            db_session: Database session

        Returns:
            EquipmentService instance
        """
        return EquipmentService(db_session)

    @async_fixture
    async def booking_service(self, db_session: AsyncSession) -> BookingService:
        """Create BookingService instance."""
        return BookingService(db_session)

    @async_test
    async def test_create_equipment(
        self,
        service: EquipmentService,
        test_category: Category,
    ) -> None:
        """Test creating new equipment."""
        equipment = await service.create_equipment(
            name='Test Equipment',
            description='Test Description',
            category_id=test_category.id,
            barcode='TEST-001',
            serial_number='SN-001',
            daily_rate=100.00,
            replacement_cost=1000.00,
        )

        assert equipment.name == 'Test Equipment'
        assert equipment.description == 'Test Description'
        assert equipment.category_id == test_category.id
        assert equipment.barcode == 'TEST-001'
        assert equipment.serial_number == 'SN-001'
        assert float(equipment.daily_rate) == 100.00
        assert float(equipment.replacement_cost) == 1000.00
        assert equipment.status == EquipmentStatus.AVAILABLE

    @async_test
    async def test_create_equipment_duplicate_barcode(
        self,
        service: EquipmentService,
        test_category: Category,
    ) -> None:
        """Test creating equipment with duplicate barcode."""
        await service.create_equipment(
            name='Test Equipment 1',
            description='Test Description 1',
            category_id=test_category.id,
            barcode='TEST-001',
            serial_number='SN-001',
            daily_rate=100.00,
            replacement_cost=1000.00,
        )

        with pytest.raises(BusinessError, match='already exists'):
            await service.create_equipment(
                name='Test Equipment 2',
                description='Test Description 2',
                category_id=test_category.id,
                barcode='TEST-001',  # Duplicate
                serial_number='SN-002',
                daily_rate=100.00,
                replacement_cost=1000.00,
            )

    @async_test
    async def test_create_equipment_invalid_rate(
        self,
        service: EquipmentService,
        test_category: Category,
    ) -> None:
        """Test creating equipment with invalid daily rate."""
        with pytest.raises(BusinessError, match='must be positive'):
            await service.create_equipment(
                name='Test Camera',
                description='Professional camera for testing',
                barcode='TEST-001',
                serial_number='SN-001',
                category_id=test_category.id,
                daily_rate=-100.00,  # Invalid negative rate
                replacement_cost=1000.00,
            )

    @async_test
    async def test_get_equipment_by_id_not_found(
        self,
        service: EquipmentService,
    ) -> None:
        """Test getting non-existent equipment by ID."""
        with pytest.raises(BusinessError, match='not found'):
            await service.get_equipment(999)

    @async_test
    async def test_get_equipment_list(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test getting list of equipment."""
        equipment_list = await service.get_equipment_list()
        assert len(equipment_list) > 0
        assert any(item.id == test_equipment.id for item in equipment_list)

    @async_test
    async def test_get_equipment_by_category(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test getting equipment filtered by category."""
        equipment_list = await service.get_equipment_list(
            category_id=test_equipment.category_id
        )
        assert len(equipment_list) > 0
        assert all(
            item.category_id == test_equipment.category_id for item in equipment_list
        )

    @async_test
    async def test_get_equipment_by_status(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test getting equipment filtered by status."""
        equipment_list = await service.get_equipment_list(
            status=EquipmentStatus.AVAILABLE
        )
        assert len(equipment_list) > 0
        assert all(item.status == EquipmentStatus.AVAILABLE for item in equipment_list)

    @async_test
    async def test_get_equipment_by_availability(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test getting equipment filtered by availability dates."""
        now = datetime.now()
        equipment_list = await service.get_equipment_list(
            available_from=now, available_to=now + timedelta(days=7)
        )
        assert len(equipment_list) > 0

    @async_test
    async def test_update_equipment(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test updating equipment."""
        updated = await service.update_equipment(
            equipment_id=test_equipment.id,
            name='Updated Name',
            daily_rate=200.00,
        )

        assert updated.name == 'Updated Name'
        assert updated.daily_rate == Decimal('200.00')
        assert updated.barcode == test_equipment.barcode  # Unchanged

    @async_test
    async def test_update_equipment_not_found(
        self,
        service: EquipmentService,
    ) -> None:
        """Test updating non-existent equipment."""
        with pytest.raises(BusinessError, match='not found'):
            await service.update_equipment(equipment_id=999, name='Updated Name')

    @async_test
    async def test_delete_equipment(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test deleting equipment."""
        success = await service.delete_equipment(test_equipment.id)
        assert success is True

        # Verify equipment was deleted
        with pytest.raises(BusinessError, match='not found'):
            await service.get_equipment(test_equipment.id)

    @async_test
    async def test_delete_equipment_not_found(
        self,
        service: EquipmentService,
    ) -> None:
        """Test deleting non-existent equipment."""
        with pytest.raises(BusinessError, match='not found'):
            await service.delete_equipment(999)

    @async_test
    async def test_search_equipment(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test searching equipment by name or description."""
        results = await service.search_equipment(test_equipment.name[:4])

        assert len(results) > 0
        assert any(item.id == test_equipment.id for item in results)

    @async_test
    async def test_get_equipment_list_invalid_pagination(
        self,
        service: EquipmentService,
    ) -> None:
        """Test getting equipment list with invalid pagination."""
        with pytest.raises(BusinessError, match='must be non-negative'):
            await service.get_equipment_list(skip=-1)

        with pytest.raises(BusinessError, match='must be positive'):
            await service.get_equipment_list(limit=0)

        with pytest.raises(BusinessError, match='cannot exceed 100'):
            await service.get_equipment_list(limit=101)

    @async_test
    async def test_get_equipment_invalid_dates(
        self,
        service: EquipmentService,
    ) -> None:
        """Test getting equipment with invalid date range."""
        now = datetime.now()
        with pytest.raises(BusinessError, match='Start date must be before end date'):
            await service.get_equipment_list(
                available_from=now + timedelta(days=7), available_to=now
            )

    @async_test
    async def test_update_equipment_invalid_rate(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test updating equipment with invalid rate."""
        with pytest.raises(BusinessError, match='must be positive'):
            await service.update_equipment(
                equipment_id=test_equipment.id, daily_rate=-100.00
            )

    @async_test
    async def test_search_equipment_invalid_query(
        self,
        service: EquipmentService,
    ) -> None:
        """Test searching equipment with invalid query."""
        with pytest.raises(BusinessError, match='must be at least 3 characters'):
            await service.search_equipment('ab')

    @async_test
    async def test_status_transition_valid(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test valid equipment status transitions."""
        # Test transition from AVAILABLE to MAINTENANCE
        equipment = await service.change_status(
            test_equipment.id, EquipmentStatus.MAINTENANCE
        )
        assert equipment.status == EquipmentStatus.MAINTENANCE

        # Test transition from MAINTENANCE to AVAILABLE
        equipment = await service.change_status(
            test_equipment.id, EquipmentStatus.AVAILABLE
        )
        assert equipment.status == EquipmentStatus.AVAILABLE

    @async_test
    async def test_status_transition_invalid(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test invalid equipment status transitions."""
        # Cannot transition from AVAILABLE to RETIRED directly
        with pytest.raises(BusinessError, match='Invalid status transition'):
            await service.change_status(test_equipment.id, EquipmentStatus.RETIRED)

    @async_test
    async def test_status_transition_with_bookings(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        booking_service: BookingService,
        test_client: Client,
    ):
        """Test status transitions with active bookings."""
        # Create a booking for the equipment
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)

        booking = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=300.00,
            deposit_amount=100.00,
        )
        await booking_service.change_status(booking.id, BookingStatus.CONFIRMED)

        # Try to retire equipment with active booking
        with pytest.raises(BusinessError, match='with active bookings'):
            await service.change_status(test_equipment.id, EquipmentStatus.RETIRED)

    @async_test
    async def test_create_equipment_invalid_replacement_cost(
        self,
        service: EquipmentService,
        test_category: Category,
    ):
        """Test creating equipment with invalid replacement cost."""
        with pytest.raises(BusinessError, match="must be positive"):
            await service.create_equipment(
                name="Test Camera",
                description="Professional camera for testing",
                barcode="TEST-001",
                serial_number="SN-001",
                category_id=test_category.id,
                daily_rate=100.00,
                replacement_cost=-1000.00,  # Invalid negative cost
            )

    @async_test
    async def test_create_equipment_duplicate_serial_number(
        self,
        service: EquipmentService,
        test_category: Category,
    ):
        """Test creating equipment with duplicate serial number."""
        await service.create_equipment(
            name='Test Camera 1',
            description='Professional camera for testing',
            barcode='TEST-001',
            serial_number='SN-001',
            category_id=test_category.id,
            daily_rate=100.00,
            replacement_cost=1000.00,
        )

        with pytest.raises(BusinessError, match="already exists"):
            await service.create_equipment(
                name='Test Camera 2',
                description='Another camera for testing',
                barcode='TEST-002',
                serial_number='SN-001',  # Same serial number
                category_id=test_category.id,
                daily_rate=150.00,
                replacement_cost=1500.00,
            )

    @async_test
    async def test_update_equipment_invalid_replacement_cost(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ):
        """Test updating equipment with invalid replacement cost."""
        with pytest.raises(BusinessError, match="must be positive"):
            await service.update_equipment(
                equipment_id=test_equipment.id,
                replacement_cost=-1000.00,
            )

    @async_test
    async def test_get_by_barcode(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ):
        """Test getting equipment by barcode."""
        # Test valid barcode
        found = await service.get_by_barcode(test_equipment.barcode)
        assert found is not None
        assert found.id == test_equipment.id

        # Test non-existent barcode
        not_found = await service.get_by_barcode('NON-EXISTENT')
        assert not_found is None

        # Test empty barcode
        with pytest.raises(BusinessError, match='cannot be empty'):
            await service.get_by_barcode('')

    @async_test
    async def test_check_availability(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        booking_service: BookingService,
        test_client: Client,
    ):
        """Test checking equipment availability."""
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)

        # Test available equipment
        is_available = await service.check_availability(
            test_equipment.id,
            start_date,
            end_date,
        )
        assert is_available is True

        # Create booking
        booking = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=300.00,
            deposit_amount=100.00,
        )
        await booking_service.change_status(booking.id, BookingStatus.CONFIRMED)

        # Test unavailable equipment
        is_available = await service.check_availability(
            test_equipment.id,
            start_date,
            end_date,
        )
        assert is_available is False

        # Test non-existent equipment
        is_available = await service.check_availability(
            999,
            start_date,
            end_date,
        )
        assert is_available is False

    @async_test
    async def test_get_available_equipment(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ):
        """Test getting available equipment for period."""
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)

        # Test getting available equipment
        available = await service.get_available_equipment(start_date, end_date)
        assert len(available) > 0
        assert any(item.id == test_equipment.id for item in available)

        # Change equipment status to maintenance
        await service.change_status(test_equipment.id, EquipmentStatus.MAINTENANCE)

        # Test that maintenance equipment is not available
        available = await service.get_available_equipment(start_date, end_date)
        assert not any(item.id == test_equipment.id for item in available)

    @async_test
    async def test_update_equipment_with_all_fields(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test updating equipment with all fields."""
        updated = await service.update_equipment(
            equipment_id=test_equipment.id,
            name='Updated Equipment',
            barcode='UPDATED123',
            category_id=test_equipment.category_id,
            daily_rate=150.00,
            replacement_cost=2000.00,
            notes='Updated notes',
        )

        assert updated.name == 'Updated Equipment'
        assert updated.barcode == 'UPDATED123'
        assert updated.category_id == test_equipment.category_id
        assert updated.daily_rate == Decimal('150.00')
        assert updated.replacement_cost == Decimal('2000.00')
        assert updated.notes == 'Updated notes'

    @async_test
    async def test_update_equipment_duplicate_barcode(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        equipment_repository: EquipmentRepository,
    ) -> None:
        """Test updating equipment with duplicate barcode."""
        other_equipment = Equipment(
            name='Other Equipment',
            barcode='OTHER123',
            serial_number='SN_OTHER',
            category_id=test_equipment.category_id,
            daily_rate=Decimal('100.00'),
            replacement_cost=Decimal('1000.00'),
        )
        await equipment_repository.create(other_equipment)

        with pytest.raises(BusinessError, match='already exists'):
            await service.update_equipment(
                equipment_id=test_equipment.id, barcode=other_equipment.barcode
            )

    @async_test
    async def test_get_by_category_not_found(
        self,
        service: EquipmentService,
    ) -> None:
        """Test getting equipment by non-existent category."""
        result = await service.get_by_category(999)  # Using non-existent ID
        assert len(result) == 0

    @async_test
    async def test_change_status_not_found(
        self,
        service: EquipmentService,
    ) -> None:
        """Test changing status of non-existent equipment."""
        with pytest.raises(BusinessError, match='not found'):
            await service.change_status(999, 'IN_REPAIR')

    @async_test
    async def test_change_status_same_status(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test changing status to the same value."""
        with pytest.raises(
            BusinessError,
            match='Cannot transition from EquipmentStatus.AVAILABLE to AVAILABLE',
        ):
            await service.change_status(test_equipment.id, 'AVAILABLE')

    @async_test
    async def test_change_status_with_completed_booking(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        booking_repository: BookingRepository,
        test_client: Client,
    ) -> None:
        """Test changing status with completed booking."""
        booking = Booking(
            equipment_id=test_equipment.id,
            client_id=test_client.id,
            start_date=datetime.now(timezone.utc) - timedelta(days=7),
            end_date=datetime.now(timezone.utc) - timedelta(days=1),
            booking_status=BookingStatus.COMPLETED,
            total_amount=Decimal('100.00'),
            deposit_amount=Decimal('50.00'),
            paid_amount=Decimal('100.00'),
        )
        await booking_repository.create(booking)

        await service.change_status(test_equipment.id, EquipmentStatus.MAINTENANCE)
        updated = await service.get_equipment(test_equipment.id)
        assert updated.status == EquipmentStatus.MAINTENANCE

    @async_test
    async def test_update_equipment_no_changes(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ):
        """Test updating equipment without any changes."""
        # Update with the same values
        updated = await service.update_equipment(
            equipment_id=test_equipment.id,
            name=test_equipment.name,
            description=test_equipment.description,
            barcode=test_equipment.barcode,
            daily_rate=float(test_equipment.daily_rate),
            replacement_cost=float(test_equipment.replacement_cost),
            category_id=test_equipment.category_id,
        )

        # Verify no changes were made
        assert updated.name == test_equipment.name
        assert updated.description == test_equipment.description
        assert updated.barcode == test_equipment.barcode
        assert updated.daily_rate == test_equipment.daily_rate
        assert updated.replacement_cost == test_equipment.replacement_cost
        assert updated.category_id == test_equipment.category_id
        assert updated.updated_at == test_equipment.updated_at

    @async_test
    async def test_get_by_category_empty_list(
        self,
        service: EquipmentService,
        test_category: Category,
    ):
        """Test getting equipment by category with no items."""
        # Get equipment for a category that exists but has no items
        # First, delete the fixture equipment
        equipment_list = await service.get_equipment_list(category_id=test_category.id)
        for equipment in equipment_list:
            await service.delete_equipment(equipment.id)

        # Now get equipment for this category
        empty_list = await service.get_equipment_list(category_id=test_category.id)
        assert len(empty_list) == 0

    @async_test
    async def test_get_by_barcode_case_sensitive(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ):
        """Test getting equipment by barcode is case sensitive."""
        # Test with original barcode
        found = await service.get_by_barcode(test_equipment.barcode)
        assert found is not None
        assert found.id == test_equipment.id

        # Test with different case (should not find)
        lower_barcode = test_equipment.barcode.lower()
        if lower_barcode != test_equipment.barcode:
            not_found = await service.get_by_barcode(lower_barcode)
            assert not_found is None

        upper_barcode = test_equipment.barcode.upper()
        if upper_barcode != test_equipment.barcode:
            not_found = await service.get_by_barcode(upper_barcode)
            assert not_found is None

        # Test with mixed case (should not find)
        mixed_case = ''.join(
            c.upper() if i % 2 == 0 else c.lower()
            for i, c in enumerate(test_equipment.barcode)
        )
        if mixed_case != test_equipment.barcode:
            not_found = await service.get_by_barcode(mixed_case)
            assert not_found is None
