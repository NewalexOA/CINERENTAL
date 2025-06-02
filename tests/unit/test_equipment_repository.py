"""Unit tests for EquipmentRepository - soft delete availability check."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.booking import Booking, BookingStatus
from backend.models.equipment import EquipmentStatus
from backend.repositories.equipment import EquipmentRepository
from tests.factories.booking import BookingFactory
from tests.factories.client import ClientFactory
from tests.factories.equipment import EquipmentFactory


class TestEquipmentRepositorySoftDelete:
    """Test cases for EquipmentRepository soft delete handling."""

    @pytest.mark.asyncio
    async def test_check_availability_excludes_soft_deleted_bookings(
        self,
        db_session: AsyncSession,
    ) -> None:
        """Test that soft-deleted bookings don't affect availability check."""
        # Arrange
        repository = EquipmentRepository(db_session)

        # Create equipment with serial number (unique equipment)
        equipment = EquipmentFactory(
            status=EquipmentStatus.AVAILABLE, serial_number='TEST-001'
        )
        db_session.add(equipment)
        await db_session.commit()

        # Create client
        client = ClientFactory()
        db_session.add(client)
        await db_session.commit()

        # Create date range for test
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        # Create a booking for this period and then soft delete it
        booking = BookingFactory(
            equipment_id=equipment.id,
            client_id=client.id,
            start_date=start_date,
            end_date=end_date,
            booking_status=BookingStatus.CONFIRMED,
        )
        db_session.add(booking)
        await db_session.commit()

        # Soft delete the booking
        booking.deleted_at = datetime.now(timezone.utc)
        await db_session.commit()

        # Act - check availability for the same period
        is_available = await repository.check_availability(
            equipment_id=equipment.id, start_date=start_date, end_date=end_date
        )

        # Assert - equipment should be available since booking is soft-deleted
        assert is_available is True

    @pytest.mark.asyncio
    async def test_check_availability_respects_active_bookings(
        self,
        db_session: AsyncSession,
    ) -> None:
        """Test that active bookings still block availability."""
        # Arrange
        repository = EquipmentRepository(db_session)

        # Create equipment with serial number
        equipment = EquipmentFactory(
            status=EquipmentStatus.AVAILABLE, serial_number='TEST-002'
        )
        db_session.add(equipment)
        await db_session.commit()

        # Create client
        client = ClientFactory()
        db_session.add(client)
        await db_session.commit()

        # Create date range for test
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        # Create an ACTIVE booking (not soft-deleted)
        booking = Booking(
            equipment_id=equipment.id,
            client_id=client.id,
            start_date=start_date,
            end_date=end_date,
            booking_status=BookingStatus.CONFIRMED,
            quantity=1,
            total_amount=100.00,
            deposit_amount=50.00,
            paid_amount=0.00,
        )
        db_session.add(booking)
        await db_session.commit()

        # Act - check availability for the same period
        is_available = await repository.check_availability(
            equipment_id=equipment.id, start_date=start_date, end_date=end_date
        )

        # Assert - equipment should NOT be available due to active booking
        assert is_available is False

    @pytest.mark.asyncio
    async def test_get_list_excludes_soft_deleted_bookings_from_availability(
        self,
        db_session: AsyncSession,
    ) -> None:
        """Test that get_list availability filtering excludes soft-deleted bookings."""
        # Arrange
        repository = EquipmentRepository(db_session)

        # Create equipment with serial number
        equipment = EquipmentFactory(
            status=EquipmentStatus.AVAILABLE, serial_number='TEST-003'
        )
        db_session.add(equipment)
        await db_session.commit()

        # Create client
        client = ClientFactory()
        db_session.add(client)
        await db_session.commit()

        # Create date range for test
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        # Create a booking and soft delete it
        booking = Booking(
            equipment_id=equipment.id,
            client_id=client.id,
            start_date=start_date,
            end_date=end_date,
            booking_status=BookingStatus.CONFIRMED,
            quantity=1,
            total_amount=100.00,
            deposit_amount=50.00,
            paid_amount=0.00,
        )
        db_session.add(booking)
        await db_session.commit()

        # Soft delete the booking
        booking.deleted_at = datetime.now(timezone.utc)
        await db_session.commit()

        # Act - get available equipment for the same period
        available_equipment = await repository.get_list(
            available_from=start_date, available_to=end_date
        )

        # Assert - equipment should be in the list since booking is soft-deleted
        equipment_ids = [eq.id for eq in available_equipment]
        assert equipment.id in equipment_ids

    @pytest.mark.asyncio
    async def test_consumable_equipment_always_available_regardless_of_bookings(
        self,
        db_session: AsyncSession,
    ) -> None:
        """Test that equipment without serial number is always available."""
        # Arrange
        repository = EquipmentRepository(db_session)

        # Create consumable equipment (no serial number)
        equipment = EquipmentFactory(
            status=EquipmentStatus.AVAILABLE,
            serial_number=None,  # No serial number = consumable
        )
        db_session.add(equipment)
        await db_session.commit()

        # Create client
        client = ClientFactory()
        db_session.add(client)
        await db_session.commit()

        # Create date range for test
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=7)

        # Create active booking for this equipment (should not affect availability)
        booking = Booking(
            equipment_id=equipment.id,
            client_id=client.id,
            start_date=start_date,
            end_date=end_date,
            booking_status=BookingStatus.CONFIRMED,
            quantity=1,
            total_amount=100.00,
            deposit_amount=50.00,
            paid_amount=0.00,
        )
        db_session.add(booking)
        await db_session.commit()

        # Act - check availability
        is_available = await repository.check_availability(
            equipment_id=equipment.id, start_date=start_date, end_date=end_date
        )

        # Assert - consumable equipment should always be available
        assert is_available is True
