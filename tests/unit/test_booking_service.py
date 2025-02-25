"""Unit tests for booking service."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import NotFoundError, StateError
from backend.models import (
    Booking,
    BookingStatus,
    Category,
    Client,
    Equipment,
    EquipmentStatus,
    PaymentStatus,
)
from backend.services import BookingService, CategoryService, ClientService
from tests.conftest import async_fixture, async_test


class TestBookingService:
    """Test cases for BookingService."""

    @async_fixture
    async def service(self, db_session: AsyncSession) -> BookingService:
        """Create BookingService instance.

        Args:
            db_session: Database session

        Returns:
            BookingService instance
        """
        return BookingService(db_session)

    @async_fixture
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

    @async_fixture
    async def equipment(
        self, db_session: AsyncSession, category: Category
    ) -> Equipment:
        """Create test equipment.

        Args:
            db_session: Database session
            category: Test category

        Returns:
            Created equipment
        """
        equipment = Equipment(
            name='Test Equipment',
            category_id=category.id,
            description='Test Description',
            serial_number='TEST001',
            barcode='TEST001',
            daily_rate=Decimal('100.00'),
            replacement_cost=Decimal('1000.00'),
            status=EquipmentStatus.AVAILABLE,
        )
        db_session.add(equipment)
        await db_session.commit()
        await db_session.refresh(equipment)
        return equipment

    @async_fixture
    async def client(self, db_session: AsyncSession) -> Client:
        """Create test client.

        Args:
            db_session: Database session

        Returns:
            Created client
        """
        client_service = ClientService(db_session)
        return await client_service.create_client(
            first_name='John',
            last_name='Doe',
            email='john.doe@example.com',
            phone='+1234567890',
            address='123 Test St',
            passport_number='AB123456',
            notes='Test client',
        )

    @async_fixture
    async def booking(
        self, db_session: AsyncSession, client: Client, equipment: Equipment
    ) -> Booking:
        """Create test booking."""
        booking_service = BookingService(db_session)
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        total_amount = float(300.00)  # 3 days * 100.00 daily rate
        deposit_amount = float(200.00)  # 20% of replacement cost

        return await booking_service.create_booking(
            client_id=client.id,
            equipment_id=equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=total_amount,
            deposit_amount=deposit_amount,
            notes='Test booking',
        )

    @async_test
    async def test_create_booking(
        self,
        booking_service: BookingService,
        test_client: Client,
        test_equipment: Equipment,
    ) -> None:
        """Test booking creation."""
        # Create booking
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        total_amount = float(300.00)  # 3 days * 100.00 daily rate
        deposit_amount = float(200.00)  # 20% of replacement cost

        booking = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=total_amount,
            deposit_amount=deposit_amount,
            notes='Test booking',
        )

        # Check booking properties
        assert booking.client_id == test_client.id
        assert booking.equipment_id == test_equipment.id
        assert booking.start_date == start_date
        assert booking.end_date == end_date
        assert float(booking.total_amount) == total_amount
        assert float(booking.deposit_amount) == deposit_amount
        assert booking.notes == 'Test booking'
        assert booking.booking_status == BookingStatus.PENDING
        assert booking.payment_status == PaymentStatus.PENDING
        assert booking.paid_amount == 0

        # Try to create booking for unavailable equipment
        error_msg = f'Equipment {test_equipment.id} is not available'
        with pytest.raises(StateError, match=error_msg):
            await booking_service.create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=start_date,
                end_date=end_date,
                total_amount=total_amount,
                deposit_amount=deposit_amount,
                notes='Another booking',
            )

    @async_test
    async def test_get_booking(
        self,
        booking_service: BookingService,
        test_client: Client,
        test_equipment: Equipment,
    ) -> None:
        """Test getting a booking by ID."""
        # Create a test booking first
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        booking = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=300.00,
            deposit_amount=200.00,
            notes='Test booking',
        )

        # Get the booking
        result = await booking_service.get_booking(booking.id)

        # Check that the booking was retrieved correctly
        assert result is not None
        assert result.id == booking.id
        assert result.client_id == booking.client_id
        assert result.equipment_id == booking.equipment_id
        assert result.start_date == booking.start_date
        assert result.end_date == booking.end_date
        assert result.booking_status == booking.booking_status
        assert result.payment_status == booking.payment_status
        assert result.total_amount == booking.total_amount
        assert result.deposit_amount == booking.deposit_amount
        assert result.notes == booking.notes

        # Test getting a non-existent booking
        with pytest.raises(NotFoundError, match='Booking 999 not found'):
            await booking_service.get_booking(999)

    @async_test
    async def test_update_booking(
        self,
        booking_service: BookingService,
        test_client: Client,
        test_equipment: Equipment,
    ) -> None:
        """Test updating a booking."""
        # Create a test booking first
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        booking = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=300.00,
            deposit_amount=200.00,
            notes='Test booking',
        )

        # Update the booking
        new_notes = 'Updated booking notes'
        new_total = 200.0
        new_deposit = 50.0

        # Update basic booking details
        updated = await booking_service.update_booking(
            booking.id,
            notes=new_notes,
            total_amount=new_total,
            deposit_amount=new_deposit,
        )

        # Update statuses
        updated = await booking_service.change_status(
            booking.id, BookingStatus.CONFIRMED
        )
        updated = await booking_service.change_payment_status(
            booking.id, PaymentStatus.PAID
        )

        # Check that the booking was updated correctly
        assert updated.id == booking.id
        assert updated.notes == new_notes
        assert updated.booking_status == BookingStatus.CONFIRMED
        assert updated.payment_status == PaymentStatus.PAID
        assert float(updated.total_amount) == new_total
        assert float(updated.deposit_amount) == new_deposit

        # Original values should remain unchanged
        assert updated.client_id == booking.client_id
        assert updated.equipment_id == booking.equipment_id
        assert updated.start_date == booking.start_date
        assert updated.end_date == booking.end_date

        # Test updating a non-existent booking
        with pytest.raises(NotFoundError, match='Booking 999 not found'):
            await booking_service.update_booking(999, notes='Non-existent booking')

        # Test changing status of non-existent booking
        with pytest.raises(NotFoundError, match='Booking 999 not found'):
            await booking_service.change_status(999, BookingStatus.CONFIRMED)

        # Test changing payment status of non-existent booking
        with pytest.raises(NotFoundError, match='Booking 999 not found'):
            await booking_service.change_payment_status(999, PaymentStatus.PAID)

    @async_test
    async def test_get_bookings(
        self, booking_service: BookingService, booking: Booking
    ) -> None:
        """Test getting all bookings."""
        # Get all bookings
        bookings = await booking_service.get_bookings()

        # Check that the list contains our booking
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Check that the booking details are correct
        test_booking = next(b for b in bookings if b.id == booking.id)
        assert test_booking.client_id == booking.client_id
        assert test_booking.equipment_id == booking.equipment_id
        assert test_booking.start_date == booking.start_date
        assert test_booking.end_date == booking.end_date
        assert test_booking.booking_status == booking.booking_status
        assert test_booking.payment_status == booking.payment_status
        assert test_booking.total_amount == booking.total_amount
        assert test_booking.deposit_amount == booking.deposit_amount
        assert test_booking.notes == booking.notes

    @async_test
    async def test_get_by_client(
        self,
        booking_service: BookingService,
        booking: Booking,
        test_client: Client,
    ) -> None:
        """Test getting bookings by client."""
        # Get bookings for client
        bookings = await booking_service.get_by_client(test_client.id)

        # Check that the list contains our booking
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Check that all bookings belong to the client
        for b in bookings:
            assert b.client_id == test_client.id

        # Test getting bookings for non-existent client
        result = await booking_service.get_by_client(999)
        assert len(result) == 0

    @async_test
    async def test_get_by_equipment(
        self,
        booking_service: BookingService,
        booking: Booking,
        test_equipment: Equipment,
    ) -> None:
        """Test getting bookings by equipment."""
        # Get bookings for equipment
        bookings = await booking_service.get_by_equipment(test_equipment.id)

        # Check that the list contains our booking
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Check that all bookings are for the equipment
        for b in bookings:
            assert b.equipment_id == test_equipment.id

        # Test getting bookings for non-existent equipment
        result = await booking_service.get_by_equipment(999)
        assert len(result) == 0

    @async_test
    async def test_get_active_for_period(
        self,
        booking_service: BookingService,
        booking: Booking,
    ) -> None:
        """Test getting active bookings for period."""
        # Initially our booking is not active
        start = datetime.now(timezone.utc)
        end = start + timedelta(days=7)
        active = await booking_service.get_active_for_period(start, end)
        assert not any(b.id == booking.id for b in active)

        # Change status to CONFIRMED first
        await booking_service.change_status(booking.id, BookingStatus.CONFIRMED)

        # Then change to ACTIVE
        await booking_service.change_status(booking.id, BookingStatus.ACTIVE)

        # Now booking should be in active bookings
        active = await booking_service.get_active_for_period(start, end)
        assert len(active) >= 1
        assert any(b.id == booking.id for b in active)

    @async_test
    async def test_get_by_status(
        self,
        booking_service: BookingService,
        booking: Booking,
    ) -> None:
        """Test getting bookings by status."""
        # Initially booking is PENDING
        bookings = await booking_service.get_by_status(BookingStatus.PENDING)
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Change status to CONFIRMED
        await booking_service.change_status(booking.id, BookingStatus.CONFIRMED)
        bookings = await booking_service.get_by_status(BookingStatus.CONFIRMED)
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Change status to ACTIVE
        await booking_service.change_status(booking.id, BookingStatus.ACTIVE)
        bookings = await booking_service.get_by_status(BookingStatus.ACTIVE)
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Change status to COMPLETED
        await booking_service.change_status(booking.id, BookingStatus.COMPLETED)
        bookings = await booking_service.get_by_status(BookingStatus.COMPLETED)
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

    @async_test
    async def test_get_by_payment_status(
        self,
        booking_service: BookingService,
        booking: Booking,
    ) -> None:
        """Test getting bookings by payment status."""
        # Initially booking is PENDING
        bookings = await booking_service.get_by_payment_status(PaymentStatus.PENDING)
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Change payment status to PARTIAL
        await booking_service.change_payment_status(booking.id, PaymentStatus.PARTIAL)
        bookings = await booking_service.get_by_payment_status(PaymentStatus.PARTIAL)
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Change payment status to PAID
        await booking_service.change_payment_status(booking.id, PaymentStatus.PAID)
        bookings = await booking_service.get_by_payment_status(PaymentStatus.PAID)
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Cannot change from PAID to PENDING
        msg = 'Invalid payment status transition'
        with pytest.raises(ValueError, match=msg):
            await booking_service.change_payment_status(
                booking.id,
                PaymentStatus.PENDING,
            )

    @async_test
    async def test_update_booking_dates(
        self,
        booking_service: BookingService,
        booking: Booking,
    ) -> None:
        """Test updating booking dates."""
        # Update booking dates
        new_start = booking.start_date + timedelta(days=5)
        new_end = booking.end_date + timedelta(days=5)

        updated = await booking_service.update_booking(
            booking.id,
            start_date=new_start,
            end_date=new_end,
        )

        # Check that dates were updated
        assert updated.start_date == new_start
        assert updated.end_date == new_end

        # Create another booking for the same equipment
        another_booking = await booking_service.create_booking(
            client_id=booking.client_id,
            equipment_id=booking.equipment_id,
            start_date=new_start + timedelta(days=5),  # Different dates
            end_date=new_end + timedelta(days=5),  # Different dates
            total_amount=100.0,
            deposit_amount=50.0,
        )

        # Try to update to unavailable dates (overlapping with first booking)
        error_msg = f'Equipment {booking.equipment_id} is not available'
        with pytest.raises(ValueError, match=error_msg):
            await booking_service.update_booking(
                another_booking.id,
                start_date=new_start,
                end_date=new_end,
            )

    @async_test
    async def test_update_booking_payment(
        self,
        booking_service: BookingService,
        booking: Booking,
    ) -> None:
        """Test updating booking payment."""
        total = float(300.00)

        # Update total amount
        updated = await booking_service.update_booking(
            booking.id,
            total_amount=total,
        )
        assert updated.total_amount == total

        # Make partial payment
        partial = total / 2
        updated = await booking_service.update_booking(
            booking.id,
            paid_amount=partial,
            total_amount=total,
        )
        assert updated.paid_amount == partial
        # Change payment status
        updated = await booking_service.change_payment_status(
            booking.id,
            PaymentStatus.PARTIAL,
        )
        assert updated.payment_status == PaymentStatus.PARTIAL

        # Pay in full
        updated = await booking_service.update_booking(
            booking.id,
            paid_amount=total,
            total_amount=total,
        )
        assert updated.paid_amount == total
        # Change payment status to PAID
        updated = await booking_service.change_payment_status(
            booking.id,
            PaymentStatus.PAID,
        )
        assert updated.payment_status == PaymentStatus.PAID

    @async_test
    async def test_get_overdue(
        self,
        booking_service: BookingService,
        booking: Booking,
    ) -> None:
        """Test getting overdue bookings."""
        # Initially our booking is not overdue
        overdue = await booking_service.get_overdue()
        assert not any(b.id == booking.id for b in overdue)

        # Update booking to be overdue
        past_start = datetime.now(timezone.utc) - timedelta(days=5)
        past_end = datetime.now(timezone.utc) - timedelta(days=2)
        await booking_service.update_booking(
            booking.id,
            start_date=past_start,
            end_date=past_end,
        )

        # Change status to CONFIRMED first
        await booking_service.change_status(booking.id, BookingStatus.CONFIRMED)

        # Then change to ACTIVE
        await booking_service.change_status(booking.id, BookingStatus.ACTIVE)

        # Now booking should be in overdue bookings
        overdue = await booking_service.get_overdue()
        assert len(overdue) >= 1
        assert any(b.id == booking.id for b in overdue)
