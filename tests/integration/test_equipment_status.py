"""Integration tests for equipment status management in booking system."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions.exceptions_base import BusinessError
from backend.models import (
    BookingStatus,
    Client,
    Equipment,
    EquipmentStatus,
    PaymentStatus,
)
from backend.services import BookingService, EquipmentService
from tests.conftest import async_test


@pytest.fixture
def services(
    db_session: AsyncSession,
) -> Dict[str, Any]:
    """Create services for testing."""
    return {
        'booking': BookingService(db_session),
        'equipment': EquipmentService(db_session),
    }


class TestEquipmentStatusManagement:
    """Test equipment status management during booking lifecycle."""

    @async_test
    async def test_equipment_status_during_booking_lifecycle(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test equipment status changes during the complete booking lifecycle."""
        booking_service = services['booking']
        equipment_service = services['equipment']

        # Initial equipment status should be AVAILABLE
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.AVAILABLE

        # Create booking
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        booking = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=300.0,
            deposit_amount=100.0,
            notes='Test booking lifecycle',
        )

        # After creation, equipment status should still be AVAILABLE
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.AVAILABLE
        assert booking.booking_status == BookingStatus.ACTIVE

        # Refresh equipment status to update it to RENTED
        await equipment_service.refresh_equipment_status(test_equipment.id)

        # After refresh, equipment status should be RENTED because booking is ACTIVE
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.RENTED

        # Set payment status to PAID before completing booking
        await booking_service.update_booking(
            booking.id, paid_amount=300.0  # Full payment
        )
        await booking_service.change_payment_status(booking.id, PaymentStatus.PAID)

        # Complete booking (equipment is returned)
        booking = await booking_service.change_status(
            booking.id, BookingStatus.COMPLETED
        )

        # After completion, equipment status should be AVAILABLE again
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.AVAILABLE
        assert booking.booking_status == BookingStatus.COMPLETED

    @async_test
    async def test_equipment_status_on_booking_cancellation(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test equipment status changes when booking is cancelled."""
        booking_service = services['booking']
        equipment_service = services['equipment']

        # Create and confirm booking
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        booking = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=300.0,
            deposit_amount=100.0,
        )

        # Refresh equipment status to update it to RENTED
        await equipment_service.refresh_equipment_status(test_equipment.id)

        # Verify equipment is RENTED
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.RENTED

        # Cancel booking
        await booking_service.change_status(booking.id, BookingStatus.CANCELLED)

        # After cancellation, equipment status should be AVAILABLE again
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.AVAILABLE

    @async_test
    async def test_equipment_status_on_multiple_bookings(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test equipment status with multiple sequential bookings."""
        booking_service = services['booking']
        equipment_service = services['equipment']

        # Create first booking
        start_date1 = datetime.now(timezone.utc) + timedelta(days=1)
        end_date1 = start_date1 + timedelta(days=3)
        booking1 = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date1,
            end_date=end_date1,
            total_amount=300.0,
            deposit_amount=100.0,
        )

        # Create second booking (after first one)
        start_date2 = end_date1 + timedelta(days=1)
        end_date2 = start_date2 + timedelta(days=2)
        booking2 = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date2,
            end_date=end_date2,
            total_amount=200.0,
            deposit_amount=100.0,
        )

        # Refresh equipment status to update it to RENTED based on first booking
        await equipment_service.refresh_equipment_status(test_equipment.id)

        # Equipment should be RENTED
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.RENTED

        # Set payment status for first booking to PAID before completing it
        await booking_service.update_booking(
            booking1.id, paid_amount=300.0  # Full payment
        )
        await booking_service.change_payment_status(booking1.id, PaymentStatus.PAID)

        # Complete first booking
        await booking_service.change_status(booking1.id, BookingStatus.COMPLETED)

        # Equipment should be AVAILABLE again
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.AVAILABLE

        # Second booking is already ACTIVE by default
        # Refresh equipment status to update it to RENTED based on second booking
        await equipment_service.refresh_equipment_status(test_equipment.id)

        # Equipment should be RENTED again
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.RENTED

        # Set payment status for second booking to PAID before completing it
        await booking_service.update_booking(
            booking2.id, paid_amount=200.0  # Full payment
        )
        await booking_service.change_payment_status(booking2.id, PaymentStatus.PAID)

        # Complete second booking
        await booking_service.change_status(booking2.id, BookingStatus.COMPLETED)

        # Equipment should be AVAILABLE again
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.AVAILABLE

    @async_test
    async def test_equipment_maintenance_during_booking(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test handling equipment maintenance status during booking process."""
        booking_service = services['booking']
        equipment_service = services['equipment']

        # Create booking
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        booking = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=300.0,
            deposit_amount=100.0,
        )

        # Then try to put equipment in maintenance
        with pytest.raises(
            BusinessError,
            match='Cannot change status of equipment with active bookings',
        ):
            await equipment_service.change_status(
                test_equipment.id, EquipmentStatus.MAINTENANCE
            )

        # Try to cancel the booking first
        await booking_service.change_status(booking.id, BookingStatus.CANCELLED)

        # Now maintenance should be allowed
        equipment = await equipment_service.change_status(
            test_equipment.id, EquipmentStatus.MAINTENANCE
        )
        assert equipment.status == EquipmentStatus.MAINTENANCE
