"""Integration tests for equipment status management in booking system."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

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
        assert booking.booking_status == BookingStatus.PENDING

        # Confirm booking
        booking = await booking_service.change_status(
            booking.id, BookingStatus.CONFIRMED
        )

        # After confirmation, equipment status should still be AVAILABLE
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.AVAILABLE
        assert booking.booking_status == BookingStatus.CONFIRMED

        # Set payment status to PAID before activating
        await booking_service.update_booking(
            booking.id,
            paid_amount=300.0,  # Full payment
        )
        await booking_service.change_payment_status(
            booking.id,
            PaymentStatus.PAID,
        )

        # Activate booking (equipment is handed over to client)
        booking = await booking_service.change_status(booking.id, BookingStatus.ACTIVE)

        # After activation, equipment status should be RENTED
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.RENTED
        assert booking.booking_status == BookingStatus.ACTIVE

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

        await booking_service.change_status(booking.id, BookingStatus.CONFIRMED)

        # Set payment status to PAID before activating
        await booking_service.update_booking(
            booking.id,
            paid_amount=300.0,
        )
        await booking_service.change_payment_status(
            booking.id,
            PaymentStatus.PAID,
        )

        # Activate booking
        await booking_service.change_status(booking.id, BookingStatus.ACTIVE)

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

        # Confirm and activate first booking
        await booking_service.change_status(booking1.id, BookingStatus.CONFIRMED)
        await booking_service.update_booking(booking1.id, paid_amount=300.0)
        await booking_service.change_payment_status(booking1.id, PaymentStatus.PAID)
        await booking_service.change_status(booking1.id, BookingStatus.ACTIVE)

        # Equipment should be RENTED
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.RENTED

        # Complete first booking
        await booking_service.change_status(booking1.id, BookingStatus.COMPLETED)

        # Equipment should be AVAILABLE again
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.AVAILABLE

        # Confirm and activate second booking
        await booking_service.change_status(booking2.id, BookingStatus.CONFIRMED)
        await booking_service.update_booking(booking2.id, paid_amount=200.0)
        await booking_service.change_payment_status(booking2.id, PaymentStatus.PAID)
        await booking_service.change_status(booking2.id, BookingStatus.ACTIVE)

        # Equipment should be RENTED again
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.RENTED

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

        # Try to set equipment to maintenance while it has a pending booking
        # This should be allowed since the booking is only PENDING
        await equipment_service.change_status(
            test_equipment.id,
            EquipmentStatus.MAINTENANCE,
        )

        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.MAINTENANCE

        # Set equipment back to available
        await equipment_service.change_status(
            test_equipment.id,
            EquipmentStatus.AVAILABLE,
        )

        # Now confirm booking
        await booking_service.change_status(booking.id, BookingStatus.CONFIRMED)

        # Try to set equipment to maintenance while it has a confirmed booking
        # This should be allowed for CONFIRMED bookings with our new logic
        await equipment_service.change_status(
            test_equipment.id,
            EquipmentStatus.MAINTENANCE,
        )

        # Equipment status should now be MAINTENANCE
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.MAINTENANCE

        # Set equipment back to available
        await equipment_service.change_status(
            test_equipment.id,
            EquipmentStatus.AVAILABLE,
        )

        # Set payment status to PAID before activating
        await booking_service.update_booking(
            booking.id,
            paid_amount=300.0,
        )
        await booking_service.change_payment_status(
            booking.id,
            PaymentStatus.PAID,
        )

        # Activate booking
        await booking_service.change_status(booking.id, BookingStatus.ACTIVE)

        # Try to set equipment to maintenance while it has an ACTIVE booking
        # This should fail
        with pytest.raises(Exception):
            await equipment_service.change_status(
                test_equipment.id,
                EquipmentStatus.MAINTENANCE,
            )

        # Equipment status should be RENTED after activation
        equipment = await equipment_service.get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.RENTED
