"""Unit tests for booking service."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.booking import Booking, BookingStatus, PaymentStatus
from backend.models.category import Category
from backend.models.client import Client
from backend.models.equipment import Equipment
from backend.services.booking import BookingService
from backend.services.category import CategoryService
from backend.services.client import ClientService
from backend.services.equipment import EquipmentService


class TestBookingService:
    """Test cases for BookingService."""

    @pytest.fixture  # type: ignore[misc]
    async def service(self, db_session: AsyncSession) -> BookingService:
        """Create BookingService instance.

        Args:
            db_session: Database session

        Returns:
            BookingService instance
        """
        return BookingService(db_session)

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
        self, db_session: AsyncSession, category: Category
    ) -> Equipment:
        """Create test equipment.

        Args:
            db_session: Database session
            category: Test category

        Returns:
            Created equipment
        """
        equipment_service = EquipmentService(db_session)
        return await equipment_service.create_equipment(
            name='Test Equipment',
            category_id=category.id,
            description='Test Description',
            serial_number='TEST001',
            barcode='TEST001',
            daily_rate=100.0,
            replacement_cost=1000.0,
        )

    @pytest.fixture  # type: ignore[misc]
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

    @pytest.fixture(scope='function')  # type: ignore[misc]
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

    async def test_create_booking(
        self, service: BookingService, client: Client, equipment: Equipment
    ) -> None:
        """Test booking creation.

        Args:
            service: BookingService instance
            client: Test client
            equipment: Test equipment
        """
        # Create booking
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        total_amount = float(300.00)  # 3 days * 100.00 daily rate
        deposit_amount = float(200.00)  # 20% of replacement cost

        booking = await service.create_booking(
            client_id=client.id,
            equipment_id=equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=total_amount,
            deposit_amount=deposit_amount,
            notes='Test booking',
        )

        # Check booking properties
        assert booking.client_id == client.id
        assert booking.equipment_id == equipment.id
        assert booking.start_date == start_date
        assert booking.end_date == end_date
        assert float(booking.total_amount) == total_amount
        assert float(booking.deposit_amount) == deposit_amount
        assert booking.notes == 'Test booking'
        assert booking.booking_status == BookingStatus.PENDING
        assert booking.payment_status == PaymentStatus.PENDING
        assert booking.paid_amount == 0

        # Try to create booking for unavailable equipment
        error_msg = f'Equipment {equipment.id} is not available'
        with pytest.raises(ValueError, match=error_msg):
            await service.create_booking(
                client_id=client.id,
                equipment_id=equipment.id,
                start_date=start_date,
                end_date=end_date,
                total_amount=total_amount,
                deposit_amount=deposit_amount,
                notes='Another booking',
            )

    async def test_get_booking(self, service: BookingService, booking: Booking) -> None:
        """Test getting a booking by ID."""
        # Get the booking
        result = await service.get_booking(booking.id)

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
        result = await service.get_booking(999)
        assert result is None

    async def test_update_booking(
        self,
        service: BookingService,
        booking: Booking,
    ) -> None:
        """Test updating a booking."""
        # Update the booking
        new_notes = 'Updated booking notes'
        new_total = 200.0
        new_deposit = 50.0

        # Update basic booking details
        updated = await service.update_booking(
            booking.id,
            notes=new_notes,
            total_amount=new_total,
            deposit_amount=new_deposit,
        )

        # Update statuses
        updated = await service.change_status(booking.id, BookingStatus.CONFIRMED)
        updated = await service.change_payment_status(booking.id, PaymentStatus.PAID)

        # Check that the booking was updated correctly
        assert updated.id == booking.id
        assert updated.notes == new_notes
        assert updated.booking_status == BookingStatus.CONFIRMED
        assert updated.payment_status == PaymentStatus.PAID
        assert updated.total_amount == new_total
        assert updated.deposit_amount == new_deposit

        # Original values should remain unchanged
        assert updated.client_id == booking.client_id
        assert updated.equipment_id == booking.equipment_id
        assert updated.start_date == booking.start_date
        assert updated.end_date == booking.end_date

        # Test updating a non-existent booking
        msg = 'Booking not found'
        with pytest.raises(ValueError, match=msg):
            await service.update_booking(999, notes='Non-existent booking')

        # Test changing status of non-existent booking
        with pytest.raises(ValueError, match=msg):
            await service.change_status(999, BookingStatus.CONFIRMED)

        # Test changing payment status of non-existent booking
        with pytest.raises(ValueError, match=msg):
            await service.change_payment_status(999, PaymentStatus.PAID)

    async def test_get_bookings(
        self, service: BookingService, booking: Booking
    ) -> None:
        """Test getting all bookings."""
        # Get all bookings
        bookings = await service.get_bookings()

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

    async def test_get_by_client(
        self,
        service: BookingService,
        booking: Booking,
        client: Client,
    ) -> None:
        """Test getting bookings by client."""
        # Get bookings for client
        bookings = await service.get_by_client(client.id)

        # Check that the list contains our booking
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Check that all bookings belong to the client
        for b in bookings:
            assert b.client_id == client.id

        # Test getting bookings for non-existent client
        result = await service.get_by_client(999)
        assert len(result) == 0

    async def test_get_by_equipment(
        self,
        service: BookingService,
        booking: Booking,
        equipment: Equipment,
    ) -> None:
        """Test getting bookings by equipment."""
        # Get bookings for equipment
        bookings = await service.get_by_equipment(equipment.id)

        # Check that the list contains our booking
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Check that all bookings are for the equipment
        for b in bookings:
            assert b.equipment_id == equipment.id

        # Test getting bookings for non-existent equipment
        result = await service.get_by_equipment(999)
        assert len(result) == 0

    async def test_get_active_for_period(
        self,
        service: BookingService,
        booking: Booking,
    ) -> None:
        """Test getting active bookings for period."""
        # Initially our booking is not active
        start = datetime.now(timezone.utc)
        end = start + timedelta(days=7)
        active = await service.get_active_for_period(start, end)
        assert not any(b.id == booking.id for b in active)

        # Change status to CONFIRMED first
        await service.change_status(booking.id, BookingStatus.CONFIRMED)

        # Then change to ACTIVE
        await service.change_status(booking.id, BookingStatus.ACTIVE)

        # Now booking should be in active bookings
        active = await service.get_active_for_period(start, end)
        assert len(active) >= 1
        assert any(b.id == booking.id for b in active)

    async def test_get_by_status(
        self,
        service: BookingService,
        booking: Booking,
    ) -> None:
        """Test getting bookings by status."""
        # Initially booking is PENDING
        bookings = await service.get_by_status(BookingStatus.PENDING)
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Change status to CONFIRMED
        await service.change_status(booking.id, BookingStatus.CONFIRMED)
        bookings = await service.get_by_status(BookingStatus.CONFIRMED)
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Change status to ACTIVE
        await service.change_status(booking.id, BookingStatus.ACTIVE)
        bookings = await service.get_by_status(BookingStatus.ACTIVE)
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Change status to COMPLETED
        await service.change_status(booking.id, BookingStatus.COMPLETED)
        bookings = await service.get_by_status(BookingStatus.COMPLETED)
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

    async def test_get_by_payment_status(
        self,
        service: BookingService,
        booking: Booking,
    ) -> None:
        """Test getting bookings by payment status."""
        # Initially booking is PENDING
        bookings = await service.get_by_payment_status(PaymentStatus.PENDING)
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Change payment status to PARTIAL
        await service.change_payment_status(booking.id, PaymentStatus.PARTIAL)
        bookings = await service.get_by_payment_status(PaymentStatus.PARTIAL)
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Change payment status to PAID
        await service.change_payment_status(booking.id, PaymentStatus.PAID)
        bookings = await service.get_by_payment_status(PaymentStatus.PAID)
        assert len(bookings) >= 1
        assert any(b.id == booking.id for b in bookings)

        # Cannot change from PAID to PENDING
        with pytest.raises(ValueError, match='Invalid payment status transition'):
            await service.change_payment_status(booking.id, PaymentStatus.PENDING)

    async def test_update_booking_dates(
        self,
        service: BookingService,
        booking: Booking,
    ) -> None:
        """Test updating booking dates."""
        # Update booking dates
        new_start = booking.start_date + timedelta(days=5)
        new_end = booking.end_date + timedelta(days=5)

        updated = await service.update_booking(
            booking.id,
            start_date=new_start,
            end_date=new_end,
        )

        # Check that dates were updated
        assert updated.start_date == new_start
        assert updated.end_date == new_end

        # Create another booking for the same equipment
        another_booking = await service.create_booking(
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
            await service.update_booking(
                another_booking.id,
                start_date=new_start,
                end_date=new_end,
            )

    async def test_update_booking_payment(
        self,
        service: BookingService,
        booking: Booking,
    ) -> None:
        """Test updating booking payment."""
        total = float(300.00)

        # Update total amount
        updated = await service.update_booking(
            booking.id,
            total_amount=total,
        )
        assert updated.total_amount == total

        # Make partial payment
        partial = total / 2
        updated = await service.update_booking(
            booking.id,
            paid_amount=partial,
            total_amount=total,
        )
        assert updated.paid_amount == partial
        # Change payment status
        updated = await service.change_payment_status(
            booking.id,
            PaymentStatus.PARTIAL,
        )
        assert updated.payment_status == PaymentStatus.PARTIAL

        # Pay in full
        updated = await service.update_booking(
            booking.id,
            paid_amount=total,
            total_amount=total,
        )
        assert updated.paid_amount == total
        # Change payment status to PAID
        updated = await service.change_payment_status(
            booking.id,
            PaymentStatus.PAID,
        )
        assert updated.payment_status == PaymentStatus.PAID

    async def test_get_overdue(
        self,
        service: BookingService,
        booking: Booking,
    ) -> None:
        """Test getting overdue bookings."""
        # Initially our booking is not overdue
        overdue = await service.get_overdue()
        assert not any(b.id == booking.id for b in overdue)

        # Update booking to be overdue
        past_start = datetime.now(timezone.utc) - timedelta(days=5)
        past_end = datetime.now(timezone.utc) - timedelta(days=2)
        await service.update_booking(
            booking.id,
            start_date=past_start,
            end_date=past_end,
        )

        # Change status to CONFIRMED first
        await service.change_status(booking.id, BookingStatus.CONFIRMED)

        # Then change to ACTIVE
        await service.change_status(booking.id, BookingStatus.ACTIVE)

        # Now booking should be in overdue bookings
        overdue = await service.get_overdue()
        assert len(overdue) >= 1
        assert any(b.id == booking.id for b in overdue)
