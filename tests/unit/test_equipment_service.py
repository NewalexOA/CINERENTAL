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
from tests.conftest import async_fixture, async_test


class TestEquipmentService:
    """Equipment service tests."""

    @async_fixture
    async def service(self, db_session: AsyncSession) -> EquipmentService:
        """Create equipment service."""
        return EquipmentService(db_session)

    @async_fixture
    async def booking_service(self, db_session: AsyncSession) -> BookingService:
        """Create booking service."""
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
            serial_number='SN001',
            daily_rate=100.00,
            replacement_cost=1000.00,
        )

        assert equipment.name == 'Test Equipment'
        assert equipment.description == 'Test Description'
        assert equipment.category_id == test_category.id
        assert equipment.barcode == 'TEST-001'
        assert equipment.serial_number == 'SN001'
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
        # Create first equipment
        await service.create_equipment(
            name='Test Equipment 1',
            description='Test Description',
            category_id=test_category.id,
            barcode='TEST-001',
            serial_number='SN001',
            daily_rate=100.00,
            replacement_cost=1000.00,
        )

        # Try to create second equipment with same barcode
        with pytest.raises(BusinessError, match='already exists'):
            await service.create_equipment(
                name='Test Equipment 2',
                description='Test Description',
                category_id=test_category.id,
                barcode='TEST-001',  # Same barcode
                serial_number='SN002',
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
                name='Test Equipment',
                description='Test Description',
                category_id=test_category.id,
                barcode='TEST-001',
                serial_number='SN001',
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
        """Test getting equipment list."""
        equipment_list = await service.get_all()
        assert len(equipment_list) >= 1
        assert any(e.id == test_equipment.id for e in equipment_list)

    @async_test
    async def test_get_equipment_by_category(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test getting equipment by category."""
        equipment_list = await service.get_by_category(test_equipment.category_id)
        assert len(equipment_list) >= 1
        assert any(e.id == test_equipment.id for e in equipment_list)

    @async_test
    async def test_get_equipment_by_status(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test getting equipment by status."""
        equipment_list = await service.get_all(status=test_equipment.status)
        assert len(equipment_list) >= 1
        assert any(e.id == test_equipment.id for e in equipment_list)

    @async_test
    async def test_get_equipment_by_availability(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test getting equipment by availability."""
        start_date = datetime.now(timezone.utc)
        end_date = start_date + timedelta(days=1)
        equipment_list = await service.get_available_equipment(start_date, end_date)
        assert len(equipment_list) >= 1
        assert any(e.id == test_equipment.id for e in equipment_list)

    @async_test
    async def test_update_equipment(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test updating equipment."""
        updated = await service.update_equipment(
            test_equipment.id,
            name='Updated Equipment',
            description='Updated Description',
            daily_rate=200.00,
            replacement_cost=2000.00,
        )

        assert updated.name == 'Updated Equipment'
        assert updated.description == 'Updated Description'
        assert float(updated.daily_rate) == 200.00
        assert float(updated.replacement_cost) == 2000.00

    @async_test
    async def test_update_equipment_not_found(
        self,
        service: EquipmentService,
    ) -> None:
        """Test updating non-existent equipment."""
        with pytest.raises(BusinessError, match='not found'):
            await service.update_equipment(999, name='Updated Equipment')

    @async_test
    async def test_delete_equipment(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test deleting equipment."""
        result = await service.delete_equipment(test_equipment.id)
        assert result is True

        with pytest.raises(BusinessError):
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
        """Test searching equipment."""
        results = await service.search(test_equipment.name[:4])
        assert len(results) >= 1
        assert any(e.id == test_equipment.id for e in results)

    @async_test
    async def test_get_equipment_list_invalid_pagination(
        self,
        service: EquipmentService,
    ) -> None:
        """Test getting equipment list with invalid pagination."""
        with pytest.raises(BusinessError):
            await service.get_all(skip=-1)

        with pytest.raises(BusinessError):
            await service.get_all(limit=0)

        with pytest.raises(BusinessError):
            await service.get_all(limit=1001)

    @async_test
    async def test_get_equipment_invalid_dates(
        self,
        service: EquipmentService,
    ) -> None:
        """Test getting equipment with invalid dates."""
        end_date = datetime.now(timezone.utc)
        start_date = end_date + timedelta(days=1)

        with pytest.raises(BusinessError):
            await service.get_available_equipment(start_date, end_date)

    @async_test
    async def test_update_equipment_invalid_rate(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test updating equipment with invalid rate."""
        with pytest.raises(BusinessError):
            await service.update_equipment(
                test_equipment.id,
                daily_rate=-100.00,
            )

    @async_test
    async def test_search_equipment_invalid_query(
        self,
        service: EquipmentService,
    ) -> None:
        """Test searching equipment with invalid query."""
        with pytest.raises(BusinessError):
            await service.search('')

    @async_test
    async def test_status_transition_valid(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test valid equipment status transition."""
        equipment = await service.change_status(
            test_equipment.id,
            EquipmentStatus.MAINTENANCE,
        )
        assert equipment.status == EquipmentStatus.MAINTENANCE

        equipment = await service.change_status(
            test_equipment.id,
            EquipmentStatus.AVAILABLE,
        )
        assert equipment.status == EquipmentStatus.AVAILABLE

    @async_test
    async def test_status_transition_invalid(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test invalid equipment status transition."""
        with pytest.raises(BusinessError):
            await service.change_status(
                test_equipment.id,
                EquipmentStatus.RETIRED,
            )

    @async_test
    async def test_status_transition_with_bookings(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        booking_service: BookingService,
        test_client: Client,
    ) -> None:
        """Test equipment status transition with active bookings."""
        # Create active booking
        start_date = datetime.now(timezone.utc)
        end_date = start_date + timedelta(days=1)
        await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=Decimal('100.00'),
            deposit_amount=Decimal('50.00'),
        )

        # Try to change status to maintenance
        with pytest.raises(BusinessError):
            await service.change_status(
                test_equipment.id,
                EquipmentStatus.MAINTENANCE,
            )

    @async_test
    async def test_create_equipment_invalid_replacement_cost(
        self,
        service: EquipmentService,
        test_category: Category,
    ) -> None:
        """Test creating equipment with invalid replacement cost."""
        with pytest.raises(BusinessError):
            await service.create_equipment(
                name='Test Equipment',
                description='Test Description',
                category_id=test_category.id,
                barcode='TEST-001',
                serial_number='SN001',
                daily_rate=100.00,
                replacement_cost=-1000.00,
            )

    @async_test
    async def test_create_equipment_duplicate_serial_number(
        self,
        service: EquipmentService,
        test_category: Category,
        test_equipment: Equipment,
    ) -> None:
        """Test creating equipment with duplicate serial number."""
        with pytest.raises(BusinessError):
            await service.create_equipment(
                name='Another Equipment',
                description='Test Description',
                category_id=test_category.id,
                barcode='UNIQUE-001',
                serial_number=test_equipment.serial_number,  # Duplicate
                daily_rate=100.00,
                replacement_cost=1000.00,
            )

    @async_test
    async def test_update_equipment_invalid_replacement_cost(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test updating equipment with invalid replacement cost."""
        with pytest.raises(BusinessError):
            await service.update_equipment(
                test_equipment.id,
                replacement_cost=-1000.00,
            )

    @async_test
    async def test_get_by_barcode(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test getting equipment by barcode."""
        equipment = await service.get_by_barcode(test_equipment.barcode)
        assert equipment is not None
        assert equipment.id == test_equipment.id
        assert equipment.barcode == test_equipment.barcode

        # Test non-existent barcode
        equipment = await service.get_by_barcode('NON-EXISTENT')
        assert equipment is None

    @async_test
    async def test_check_availability(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        booking_service: BookingService,
        test_client: Client,
    ) -> None:
        """Test checking equipment availability."""
        start_date = datetime.now(timezone.utc)
        end_date = start_date + timedelta(days=1)

        # Should be available initially
        is_available = await service.check_availability(
            test_equipment.id,
            start_date,
            end_date,
        )
        assert is_available is True

        # Create booking
        await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=Decimal('100.00'),
            deposit_amount=Decimal('50.00'),
        )

        # Should not be available after booking
        is_available = await service.check_availability(
            test_equipment.id,
            start_date,
            end_date,
        )
        assert is_available is False

    @async_test
    async def test_get_available_equipment(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test getting available equipment."""
        start_date = datetime.now(timezone.utc)
        end_date = start_date + timedelta(days=1)

        # Should be available initially
        equipment_list = await service.get_available_equipment(start_date, end_date)
        assert len(equipment_list) >= 1
        assert any(e.id == test_equipment.id for e in equipment_list)

        # Change status to maintenance
        await service.change_status(test_equipment.id, EquipmentStatus.MAINTENANCE)

        # Should not be available after status change
        equipment_list = await service.get_available_equipment(start_date, end_date)
        assert not any(e.id == test_equipment.id for e in equipment_list)

    @async_test
    async def test_update_equipment_with_all_fields(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test updating all equipment fields."""
        updated = await service.update_equipment(
            test_equipment.id,
            name='Updated Equipment',
            description='Updated Description',
            barcode='UPDATED-001',
            daily_rate=200.00,
            replacement_cost=2000.00,
            notes='Updated notes',
        )

        assert updated.name == 'Updated Equipment'
        assert updated.description == 'Updated Description'
        assert updated.barcode == 'UPDATED-001'
        assert float(updated.daily_rate) == 200.00
        assert float(updated.replacement_cost) == 2000.00
        assert updated.notes == 'Updated notes'

    @async_test
    async def test_update_equipment_duplicate_barcode(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        equipment_repository: EquipmentRepository,
    ) -> None:
        """Test updating equipment with duplicate barcode."""
        # Create another equipment
        another_equipment = await service.create_equipment(
            name='Another Equipment',
            description='Test Description',
            category_id=test_equipment.category_id,
            barcode='UNIQUE-001',
            serial_number='UNIQUE-001',
            daily_rate=100.00,
            replacement_cost=1000.00,
        )

        # Try to update with existing barcode
        with pytest.raises(BusinessError):
            await service.update_equipment(
                another_equipment.id,
                barcode=test_equipment.barcode,
            )

    @async_test
    async def test_get_by_category_not_found(
        self,
        service: EquipmentService,
    ) -> None:
        """Test getting equipment by non-existent category."""
        equipment_list = await service.get_by_category(999999)
        assert len(equipment_list) == 0

    @async_test
    async def test_change_status_not_found(
        self,
        service: EquipmentService,
    ) -> None:
        """Test changing status of non-existent equipment."""
        with pytest.raises(BusinessError):
            await service.change_status(999999, EquipmentStatus.MAINTENANCE)

    @async_test
    async def test_change_status_same_status(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test changing status to the same value."""
        equipment = await service.change_status(
            test_equipment.id,
            test_equipment.status,
        )
        assert equipment.status == test_equipment.status

    @async_test
    async def test_change_status_with_completed_booking(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        booking_repository: BookingRepository,
        test_client: Client,
    ) -> None:
        """Test changing status with completed booking."""
        # Create completed booking
        booking = Booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=datetime.now(timezone.utc) - timedelta(days=2),
            end_date=datetime.now(timezone.utc) - timedelta(days=1),
            total_amount=Decimal('100.00'),
            deposit_amount=Decimal('50.00'),
            booking_status=BookingStatus.COMPLETED,
        )
        booking_repository.session.add(booking)
        await booking_repository.session.commit()

        # Should be able to change status
        equipment = await service.change_status(
            test_equipment.id,
            EquipmentStatus.MAINTENANCE,
        )
        assert equipment.status == EquipmentStatus.MAINTENANCE

    @async_test
    async def test_update_equipment_no_changes(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test updating equipment without changes."""
        updated = await service.update_equipment(
            test_equipment.id,
            name=test_equipment.name,
            description=test_equipment.description,
            barcode=test_equipment.barcode,
            daily_rate=float(test_equipment.daily_rate),
            replacement_cost=float(test_equipment.replacement_cost),
            notes=test_equipment.notes,
        )

        assert updated.name == test_equipment.name
        assert updated.description == test_equipment.description
        assert updated.barcode == test_equipment.barcode
        assert updated.daily_rate == test_equipment.daily_rate
        assert updated.replacement_cost == test_equipment.replacement_cost
        assert updated.notes == test_equipment.notes

    @async_test
    async def test_get_by_category_empty_list(
        self,
        service: EquipmentService,
        test_category: Category,
    ) -> None:
        """Test getting equipment by category with no equipment."""
        # Create new category without equipment
        new_category = await service._create_category(
            name='Empty Category',
            description='No equipment',
        )

        equipment_list = await service.get_by_category(new_category.id)
        assert len(equipment_list) == 0

    @pytest.mark.asyncio
    async def test_get_by_barcode_case_sensitive(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test getting equipment by barcode with different cases."""
        # Original barcode
        equipment = await service.get_by_barcode(test_equipment.barcode)
        assert equipment is not None
        assert equipment.id == test_equipment.id

        # Lowercase barcode
        equipment = await service.get_by_barcode(test_equipment.barcode.lower())
        assert equipment is None

        # Uppercase barcode
        equipment = await service.get_by_barcode(test_equipment.barcode.upper())
        assert equipment is None

    @async_test
    async def test_validate_equipment_data(self) -> None:
        """Test equipment data validation."""
        # Test validation functions here
        pass
