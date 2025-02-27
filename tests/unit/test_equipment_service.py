"""Unit tests for equipment service."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions.exceptions_base import BusinessError
from backend.exceptions.state_exceptions import StateError
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
            barcode='TEST-001',
            serial_number='SN-001',
            category_id=test_category.id,
            daily_rate=Decimal('100.00'),
            replacement_cost=Decimal('1000.00'),
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
        equipment_response = await service.create_equipment(
            name='Test Equipment',
            description='Test Description',
            category_id=test_category.id,
            barcode='TEST-001',
            serial_number='SN001',
            daily_rate=100.00,
            replacement_cost=1000.00,
        )

        assert isinstance(equipment_response, EquipmentResponse)
        assert equipment_response.name == 'Test Equipment'
        assert equipment_response.description == 'Test Description'
        assert equipment_response.category_id == test_category.id
        assert equipment_response.barcode == 'TEST-001'
        assert equipment_response.serial_number == 'SN001'
        assert float(equipment_response.daily_rate) == 100.00
        assert float(equipment_response.replacement_cost) == 1000.00
        assert equipment_response.status == EquipmentStatus.AVAILABLE

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
                daily_rate=-100.00,  # Invalid rate
                replacement_cost=1000.00,
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
        equipment = await service.create_equipment(
            name='Test Equipment',
            description='Test Description',
            category_id=test_category.id,
            barcode='TEST-001',
            serial_number='SN001',
            daily_rate=100.00,
            replacement_cost=1000.00,
        )

        equipment_list = await service.get_equipment_list(
            available_from=test_dates['start_date'],
            available_to=test_dates['end_date'],
        )

        assert len(equipment_list) > 0
        assert all(isinstance(e, EquipmentResponse) for e in equipment_list)
        assert equipment.id in [e.id for e in equipment_list]

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

        # Confirm booking and set payment status to PAID
        await booking_service.change_status(booking.id, BookingStatus.CONFIRMED)
        await booking_service.update_booking(booking.id, paid_amount=300.0)
        await booking_service.change_payment_status(booking.id, PaymentStatus.PAID)

        # Activate booking (now it's ACTIVE, not just PENDING or CONFIRMED)
        await booking_service.change_status(booking.id, BookingStatus.ACTIVE)

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
            barcode='UPDATED-001',
            daily_rate=200.00,
            replacement_cost=2000.00,
            notes='Updated notes',
        )

        assert equipment.name == 'Updated Equipment'
        assert equipment.description == 'Updated Description'
        assert equipment.barcode == 'UPDATED-001'
        assert float(equipment.daily_rate) == 200.00
        assert float(equipment.replacement_cost) == 2000.00
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
            daily_rate=float(test_equipment.daily_rate),
            replacement_cost=float(test_equipment.replacement_cost),
            notes=test_equipment.notes,
        )

        assert equipment.name == test_equipment.name
        assert equipment.description == test_equipment.description
        assert equipment.barcode == test_equipment.barcode
        assert equipment.daily_rate == test_equipment.daily_rate
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
        """Test getting equipment by barcode with different cases."""
        # Original barcode
        equipment = await service.get_by_barcode(test_equipment.barcode)
        assert equipment is not None
        assert equipment.id == test_equipment.id

        # Create equipment with lowercase barcode
        lower_barcode = test_equipment.barcode.lower()
        await service.create_equipment(
            name='Test Camera 2',
            description='Another camera for testing',
            category_id=test_equipment.category_id,
            barcode=lower_barcode,
            serial_number='SN-002',
            daily_rate=100.00,
            replacement_cost=1000.00,
        )

        # Original barcode should still match original equipment
        equipment = await service.get_by_barcode(test_equipment.barcode)
        assert equipment is not None
        assert equipment.id == test_equipment.id

        # Lowercase barcode should match second equipment
        equipment = await service.get_by_barcode(lower_barcode)
        assert equipment is not None
        assert equipment.serial_number == 'SN-002'

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
        # First set to RETIRED
        await service.change_status(test_equipment.id, EquipmentStatus.RETIRED)

        # Try to change from RETIRED (not allowed)
        with pytest.raises(StateError, match='Cannot change status from'):
            await service.change_status(test_equipment.id, EquipmentStatus.AVAILABLE)

        # Try invalid transition from AVAILABLE to BROKEN
        test_equipment.status = EquipmentStatus.AVAILABLE
        await service.repository.update(test_equipment)

        with pytest.raises(StateError, match='Cannot change status from'):
            await service.change_status(test_equipment.id, EquipmentStatus.BROKEN)

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

        # Confirm booking and set payment status to PAID
        await booking_service.change_status(booking.id, BookingStatus.CONFIRMED)
        await booking_service.update_booking(booking.id, paid_amount=300.0)
        await booking_service.change_payment_status(booking.id, PaymentStatus.PAID)

        # Activate booking (now it's ACTIVE, not just PENDING or CONFIRMED)
        await booking_service.change_status(booking.id, BookingStatus.ACTIVE)

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
        equipment2 = await service.create_equipment(
            name='Another Test Equipment',
            description='Test Description',
            category_id=test_category.id,
            barcode='TEST-002',
            serial_number='SN002',
            daily_rate=100.00,
            replacement_cost=1000.00,
        )

        # Update its status to MAINTENANCE
        await service.update_equipment(
            equipment2.id,
            status=EquipmentStatus.MAINTENANCE,
        )

        # Search with query only
        results = await service.search('test')
        assert len(results) == 2  # Both equipment should be found

        # Search with query and status
        results = await service.search('test')
        results = [r for r in results if r.status == test_equipment.status]
        assert len(results) == 1
        assert results[0].id == test_equipment.id

        # Search with query and category
        results = await service.search('test')
        results = [r for r in results if r.category_id == test_category.id]
        assert len(results) == 2
        assert all(e.category_id == test_category.id for e in results)

        # Search with all filters
        results = await service.search('test')
        results = [
            r
            for r in results
            if r.category_id == test_category.id and r.status == test_equipment.status
        ]
        assert len(results) == 1
        assert results[0].id == test_equipment.id

    @async_test
    async def test_search_pagination(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        test_category: Category,
    ) -> None:
        """Test equipment search pagination."""
        # Create multiple equipment items with unique barcodes
        for i in range(5):
            await service.create_equipment(
                name=f'Test Equipment {i}',
                description='Test Description',
                category_id=test_category.id,
                barcode=f'TEST-SEARCH-{i:03d}',  # Unique barcode
                serial_number=f'SN-SEARCH-{i:03d}',  # Unique serial
                daily_rate=100.00,
                replacement_cost=1000.00,
            )

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
