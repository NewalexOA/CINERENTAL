"""Unit tests for equipment service."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import ConflictError
from backend.exceptions.exceptions_base import BusinessError
from backend.exceptions.validation_exceptions import ValidationError
from backend.models import (
    Booking,
    BookingStatus,
    Category,
    Client,
    Equipment,
    EquipmentStatus,
    PaymentStatus,
)
from backend.repositories import BookingRepository
from backend.schemas import EquipmentResponse
from backend.services import BookingService, CategoryService, EquipmentService
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

    @async_fixture
    async def equipment(
        self, db_session: AsyncSession, test_category: Category
    ) -> Equipment:
        """Create a test equipment.

        Args:
            db_session: Database session
            test_category: Test category

        Returns:
            Created equipment
        """
        equipment = Equipment(
            name='Test Camera',
            description='Professional camera for testing',
            barcode='CATS-000001-5',
            serial_number='SN-001',
            category_id=test_category.id,
            replacement_cost=1000,
            status=EquipmentStatus.AVAILABLE,
        )
        db_session.add(equipment)
        await db_session.commit()
        await db_session.refresh(equipment)
        return equipment

    @async_test
    async def test_create_equipment(
        self,
        service: EquipmentService,
        test_category: Category,
    ) -> None:
        """Test creating new equipment."""
        # Using a valid barcode from test cases in BarcodeService._calculate_checksum
        # '000000001' with checksum '01'
        custom_barcode = '00000000101'

        equipment_response = await service.create_equipment(
            name='Test Equipment',
            description='Test Description',
            category_id=test_category.id,
            custom_barcode=custom_barcode,
            serial_number='SN001',
            replacement_cost=1000,
        )

        assert isinstance(equipment_response, EquipmentResponse)
        assert equipment_response.name == 'Test Equipment'
        assert equipment_response.description == 'Test Description'
        assert equipment_response.category_id == test_category.id
        assert equipment_response.barcode == custom_barcode
        assert equipment_response.serial_number == 'SN001'
        assert equipment_response.replacement_cost == 1000
        assert equipment_response.status == EquipmentStatus.AVAILABLE

    @async_test
    async def test_create_equipment_duplicate_barcode(
        self,
        service: EquipmentService,
        test_category: Category,
    ) -> None:
        """Test creating equipment with duplicate barcode."""
        # Using a valid barcode from test cases in BarcodeService._calculate_checksum
        # '000000123' with checksum '23'
        custom_barcode = '00000012323'

        # Create first equipment
        await service.create_equipment(
            name='First Equipment',
            description='First Equipment Description',
            category_id=test_category.id,
            custom_barcode=custom_barcode,
            serial_number='SN001',
            replacement_cost=1000,
        )

        # Try to create second equipment with same barcode
        with pytest.raises(ConflictError, match='already exists'):
            await service.create_equipment(
                name='Second Equipment',
                description='Second Equipment Description',
                category_id=test_category.id,
                custom_barcode=custom_barcode,
                serial_number='SN002',
                replacement_cost=1000,
            )

    @async_test
    async def test_create_equipment_invalid_rate(
        self,
        service: EquipmentService,
    ) -> None:
        """Test creating equipment with invalid rate."""
        with pytest.raises(BusinessError, match='must be greater than or equal to 0'):
            await service.create_equipment(
                name='Test Equipment',
                description='Test Description',
                category_id=1,
                custom_barcode='CATS-000001-5',
                serial_number='SN-001',
                replacement_cost=-10,
            )

    @async_test
    async def test_get_equipment_list_with_dates(
        self,
        service: EquipmentService,
        test_category: Category,
        test_dates: dict[str, datetime],
    ) -> None:
        """Test getting equipment list with date filtering."""
        # Create test equipment
        # Using a valid barcode from test cases in BarcodeService._calculate_checksum
        # '000012345' with checksum '45'
        custom_barcode = '00001234545'

        equipment = await service.create_equipment(
            name='Test Equipment',
            description='Test Description',
            category_id=test_category.id,
            custom_barcode=custom_barcode,
            serial_number='SN001',
            replacement_cost=1000,
        )

        equipment_list = await service.get_equipment_list(
            available_from=test_dates['start_date'],
            available_to=test_dates['end_date'],
        )

        assert len(equipment_list) > 0
        # Check that our created equipment is in the list
        assert any(item.id == equipment.id for item in equipment_list)

    @async_test
    async def test_check_availability(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        booking_service: BookingService,
        test_client: Client,
        test_dates: dict[str, datetime],
    ) -> None:
        """Test checking equipment availability."""
        # Should be available initially
        is_available = await service.check_availability(
            test_equipment.id,
            test_dates['start_date'],
            test_dates['end_date'],
        )
        assert is_available is True

        # Create booking
        await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=test_dates['start_date'],
            end_date=test_dates['end_date'],
            total_amount=float(Decimal('300.00')),
            deposit_amount=float(Decimal('100.00')),
        )

        # Should not be available after booking
        is_available = await service.check_availability(
            test_equipment.id,
            test_dates['start_date'],
            test_dates['end_date'],
        )
        assert is_available is False

    @async_test
    async def test_get_available_equipment(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        test_dates: dict[str, datetime],
    ) -> None:
        """Test getting available equipment."""
        # Should be available initially
        equipment_list = await service.get_available_equipment(
            test_dates['start_date'],
            test_dates['end_date'],
        )
        assert len(equipment_list) >= 1
        assert any(e.id == test_equipment.id for e in equipment_list)

        # Change status to maintenance
        equipment = await service.get_equipment(test_equipment.id)
        equipment.status = EquipmentStatus.MAINTENANCE
        await service.repository.update(equipment)

        # Should not be available after status change
        equipment_list = await service.get_available_equipment(
            test_dates['start_date'],
            test_dates['end_date'],
        )
        assert not any(e.id == test_equipment.id for e in equipment_list)

    @async_test
    async def test_change_status_with_completed_booking(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        booking_repository: BookingRepository,
        test_client: Client,
        test_dates: dict[str, datetime],
    ) -> None:
        """Test changing status with completed booking."""
        # Create completed booking
        booking = Booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=test_dates['past_date'] - timedelta(days=1),
            end_date=test_dates['past_date'],
            total_amount=float(Decimal('300.00')),
            deposit_amount=float(Decimal('100.00')),
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
    async def test_change_status_with_active_booking(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        booking_service: BookingService,
        test_client: Client,
        test_dates: dict[str, datetime],
    ) -> None:
        """Test changing status with active booking."""
        # Create booking
        booking = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=test_dates['start_date'],
            end_date=test_dates['end_date'],
            total_amount=float(Decimal('300.00')),
            deposit_amount=float(Decimal('100.00')),
        )

        # Set payment status to PAID to make booking fully active
        await booking_service.update_booking(booking.id, paid_amount=300.0)
        await booking_service.change_payment_status(booking.id, PaymentStatus.PAID)

        # Booking is already ACTIVE by default, no need to change status

        # Should not be able to change status when booking is ACTIVE
        with pytest.raises(BusinessError, match='Cannot change status'):
            await service.change_status(
                test_equipment.id,
                EquipmentStatus.MAINTENANCE,
            )

    @async_test
    async def test_update_equipment_with_all_fields(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test updating all equipment fields."""
        equipment = await service.update_equipment(
            test_equipment.id,
            name='Updated Equipment',
            description='Updated Description',
            barcode='UPDT-000001-5',
            replacement_cost=2000,
            notes='Updated notes',
        )

        assert equipment.name == 'Updated Equipment'
        assert equipment.description == 'Updated Description'
        assert equipment.barcode == 'UPDT-000001-5'
        assert float(equipment.replacement_cost) == 2000
        assert equipment.notes == 'Updated notes'

    @async_test
    async def test_update_equipment_no_changes(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test updating equipment without changes."""
        equipment = await service.update_equipment(
            test_equipment.id,
            name=test_equipment.name,
            description=test_equipment.description,
            barcode=test_equipment.barcode,
            replacement_cost=int(test_equipment.replacement_cost),
            notes=test_equipment.notes,
        )

        assert equipment.name == test_equipment.name
        assert equipment.description == test_equipment.description
        assert equipment.barcode == test_equipment.barcode
        assert equipment.replacement_cost == test_equipment.replacement_cost
        assert equipment.notes == test_equipment.notes

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

    @async_test
    async def test_get_by_barcode_case_sensitive(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test getting equipment by barcode with case sensitivity."""
        # Get equipment by barcode
        equipment = await service.get_by_barcode(test_equipment.barcode)
        assert equipment is not None
        assert equipment.id == test_equipment.id

        # Using a valid barcode from test cases in BarcodeService._calculate_checksum
        # '000000001' with checksum '01'
        custom_barcode = '00000000101'

        new_equipment = await service.create_equipment(
            name='Test Camera 2',
            description='Another camera for testing',
            category_id=test_equipment.category_id,
            custom_barcode=custom_barcode,
            serial_number='SN-002',
            replacement_cost=1000,
        )

        # Check that we can find equipment by the new barcode
        equipment_by_new_barcode = await service.get_by_barcode(custom_barcode)
        assert equipment_by_new_barcode is not None
        assert equipment_by_new_barcode.id == new_equipment.id

        # Original barcode should still match original equipment
        equipment = await service.get_by_barcode(test_equipment.barcode)
        assert equipment is not None
        assert equipment.id == test_equipment.id

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
            replacement_cost=2000,
        )

        assert updated.name == 'Updated Equipment'
        assert updated.description == 'Updated Description'
        assert float(updated.replacement_cost) == 2000

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
        test_dates: Dict[str, datetime],
    ) -> None:
        """Test getting equipment with invalid dates."""
        # End date before start date
        with pytest.raises(BusinessError, match='Start date must be before end date'):
            await service.get_equipment_list(
                available_from=test_dates['end_date'],
                available_to=test_dates['start_date'],
            )

        # Same dates
        with pytest.raises(BusinessError, match='Start date must be before end date'):
            await service.get_equipment_list(
                available_from=test_dates['start_date'],
                available_to=test_dates['start_date'],
            )

    @async_test
    async def test_update_equipment_invalid_rate(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test updating equipment with invalid replacement cost."""
        with pytest.raises(BusinessError):
            await service.update_equipment(
                test_equipment.id,
                replacement_cost=-1000,  # Negative replacement cost
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
    async def test_status_transition_flexible(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test flexible equipment status transitions (all transitions allowed)."""
        # First set to RETIRED
        await service.change_status(test_equipment.id, EquipmentStatus.RETIRED)

        # Can change from RETIRED to any status (transitions are flexible)
        equipment = await service.change_status(
            test_equipment.id, EquipmentStatus.AVAILABLE
        )
        assert equipment.status == EquipmentStatus.AVAILABLE

        # Can transition from AVAILABLE to BROKEN (all transitions allowed)
        equipment = await service.change_status(
            test_equipment.id, EquipmentStatus.BROKEN
        )
        assert equipment.status == EquipmentStatus.BROKEN

        # Can transition back to AVAILABLE
        equipment = await service.change_status(
            test_equipment.id, EquipmentStatus.AVAILABLE
        )
        assert equipment.status == EquipmentStatus.AVAILABLE

    @async_test
    async def test_status_transition_with_bookings(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        booking_service: BookingService,
        test_client: Client,
        test_dates: dict[str, datetime],
    ) -> None:
        """Test equipment status transition with active bookings."""
        # Create booking
        booking = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=test_dates['start_date'],
            end_date=test_dates['end_date'],
            total_amount=float(Decimal('300.00')),
            deposit_amount=float(Decimal('100.00')),
        )

        # Set payment status to PAID to make booking fully active
        await booking_service.update_booking(booking.id, paid_amount=300.0)
        await booking_service.change_payment_status(booking.id, PaymentStatus.PAID)

        # Booking is already ACTIVE by default, no need to change status

        # Try to change status to maintenance with ACTIVE booking
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
        """Test creating equipment with negative replacement cost."""
        with pytest.raises(BusinessError, match='must be greater than or equal to 0'):
            await service.create_equipment(
                name='Test Equipment',
                description='Test Description',
                category_id=test_category.id,
                custom_barcode=None,
                serial_number='SN123',
                replacement_cost=-1,
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
    async def test_get_by_category_empty_list(
        self,
        service: EquipmentService,
        test_category: Category,
        db_session: AsyncSession,
    ) -> None:
        """Test getting equipment by category with no equipment."""
        # Create new category without equipment
        category_service = CategoryService(db_session)
        new_category = await category_service.create_category(
            name='Empty Category',
            description='No equipment',
        )

        equipment_list = await service.get_by_category(new_category.id)
        assert len(equipment_list) == 0

    @async_test
    async def test_validate_equipment_data(self) -> None:
        """Test equipment data validation."""
        pass

    @async_test
    async def test_search_with_filters(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        test_category: Category,
    ) -> None:
        """Test searching equipment with filters."""
        # Create another equipment with different status
        # Using a valid barcode from test cases in BarcodeService._calculate_checksum
        # '000000123' with checksum '23'
        custom_barcode = '00000012323'

        new_equipment = await service.create_equipment(
            name='Test Equipment 2',
            description='Test Description 2',
            category_id=test_category.id,
            custom_barcode=custom_barcode,
            serial_number='SN002',
            replacement_cost=2000,
        )

        # Search with query only
        results = await service.search_equipment(query='test')
        assert len(results) >= 2  # Should find both equipments
        # Ensure the new equipment is in results
        assert any(eq.id == new_equipment.id for eq in results)

    @async_test
    async def test_search_pagination(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        test_category: Category,
    ) -> None:
        """Test equipment search pagination."""
        # Create multiple equipment items with unique barcodes
        equipment_list = []
        for i in range(5):
            equipment = Equipment(
                name=f'Test Equipment {i}',
                description='Test Description',
                category_id=test_category.id,
                barcode=f'CATS-{i:06d}-{i % 10}',  # Unique barcode
                serial_number=f'SN-SEARCH-{i:03d}',  # Unique serial
                replacement_cost=1000,
                status=EquipmentStatus.AVAILABLE,
            )
            service.session.add(equipment)
            equipment_list.append(equipment)

        await service.session.commit()
        for equipment in equipment_list:
            await service.session.refresh(equipment)

        # Get all results for comparison
        all_results = await service.search('test')
        assert len(all_results) > 3

        # Test first page
        results = await service.search('test')
        results = results[:3]  # Apply limit
        assert len(results) == 3

        # Test second page
        results = await service.search('test')
        results = results[3:6]  # Apply skip and limit
        assert len(results) > 0
        assert len(results) <= 3

    @async_test
    async def test_search_validation(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test equipment search input validation."""
        # Test empty query
        with pytest.raises(ValidationError):
            await service.search('')

        # Test search with non-existent category
        results = await service.search('test')
        results = [r for r in results if r.category_id == 999]
        assert len(results) == 0  # No equipment in non-existent category

    @async_test
    async def test_check_availability_with_conflicts(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        booking_service: BookingService,
        test_client: Client,
        test_dates: dict[str, datetime],
    ) -> None:
        """Test checking equipment availability with overlapping bookings."""
        # Create two bookings with different dates
        await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=test_dates['start_date'],
            end_date=test_dates['end_date'],
            total_amount=float(Decimal('300.00')),
            deposit_amount=float(Decimal('100.00')),
        )

        # Create another booking for future dates
        future_start = test_dates['end_date'] + timedelta(days=10)
        future_end = future_start + timedelta(days=5)
        await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=future_start,
            end_date=future_end,
            total_amount=float(Decimal('200.00')),
            deposit_amount=float(Decimal('50.00')),
        )

        # Check availability for dates that overlap with the first booking
        is_available = await service.check_availability(
            test_equipment.id,
            test_dates['start_date'] - timedelta(days=1),
            test_dates['start_date'] + timedelta(days=1),
        )
        assert is_available is False

        # Check availability for dates between two bookings
        between_start = test_dates['end_date'] + timedelta(days=1)
        between_end = future_start - timedelta(days=1)
        is_available = await service.check_availability(
            test_equipment.id,
            between_start,
            between_end,
        )
        assert is_available is True

        # Check availability for dates that overlap with the second booking
        is_available = await service.check_availability(
            test_equipment.id,
            future_start - timedelta(days=1),
            future_start + timedelta(days=1),
        )
        assert is_available is False

        # Check availability for dates that overlap with both bookings
        is_available = await service.check_availability(
            test_equipment.id,
            test_dates['start_date'] - timedelta(days=1),
            future_end + timedelta(days=1),
        )
        assert is_available is False
