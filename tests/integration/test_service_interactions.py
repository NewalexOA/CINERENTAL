"""Integration tests for service interactions in the CINERENTAL system.

Tests verify that different services work together correctly.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.booking import BookingStatus, PaymentStatus
from backend.models.client import Client
from backend.models.document import DocumentStatus, DocumentType
from backend.models.equipment import Equipment
from backend.services.booking import BookingService
from backend.services.client import ClientService
from backend.services.document import DocumentService
from backend.services.equipment import EquipmentService
from tests.conftest import async_test


@pytest.fixture  # type: ignore[misc]
def services(
    db_session: AsyncSession,
) -> Dict[str, Any]:
    """Fixture providing initialized services for testing."""
    return {
        'booking': BookingService(db_session),
        'client': ClientService(db_session),
        'document': DocumentService(db_session),
        'equipment': EquipmentService(db_session),
    }


class TestBookingFlow:
    """Test class for booking flow scenarios."""

    @async_test
    async def test_create_booking_with_documents(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test creating a booking with required documents."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)  # Start tomorrow
        end_date = start_date + timedelta(days=3)
        total_amount = float(300.00)  # 3 days * 100.00 daily rate
        deposit_amount = float(200.00)  # 20% of replacement cost

        # Act
        # Create booking
        booking = await services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=total_amount,
            deposit_amount=deposit_amount,
        )

        # Add required documents
        contract = await services['document'].create_document(
            client_id=test_client.id,
            booking_id=booking.id,
            document_type=DocumentType.CONTRACT,
            file_path='/path/to/contract.pdf',
            title='Rental Contract',
            description='Equipment rental contract',
            file_name='contract.pdf',
            file_size=1024,
            mime_type='application/pdf',
        )

        passport = await services['document'].create_document(
            client_id=test_client.id,
            booking_id=booking.id,
            document_type=DocumentType.PASSPORT,
            file_path='/path/to/passport.pdf',
            title='Passport Scan',
            description='Client passport scan',
            file_name='passport.pdf',
            file_size=512,
            mime_type='application/pdf',
        )

        # Assert
        assert contract.booking_id == booking.id
        assert contract.type == DocumentType.CONTRACT
        assert passport.booking_id == booking.id
        assert passport.type == DocumentType.PASSPORT

    @async_test
    async def test_complete_booking_flow(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test complete booking flow from creation to return."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)  # Start tomorrow
        end_date = start_date + timedelta(days=3)
        total_amount = float(300.00)  # 3 days * 100.00 daily rate
        deposit_amount = float(200.00)  # 20% of replacement cost

        # Act
        # Create booking
        booking = await services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=total_amount,
            deposit_amount=deposit_amount,
        )

        # Add required documents
        contract = await services['document'].create_document(
            client_id=test_client.id,
            booking_id=booking.id,
            document_type=DocumentType.CONTRACT,
            file_path='/path/to/contract.pdf',
            title='Rental Contract',
            description='Equipment rental contract',
            file_name='contract.pdf',
            file_size=1024,
            mime_type='application/pdf',
        )

        # Approve documents
        doc_service = services['document']
        await doc_service.change_status(contract.id, DocumentStatus.PENDING)
        await doc_service.change_status(contract.id, DocumentStatus.UNDER_REVIEW)
        await doc_service.change_status(contract.id, DocumentStatus.APPROVED)

        # Pay deposit
        await services['booking'].update_booking(
            booking.id,
            paid_amount=deposit_amount,
        )
        await services['booking'].change_payment_status(
            booking.id,
            PaymentStatus.PARTIAL,
        )

        # Confirm booking
        await services['booking'].change_status(booking.id, BookingStatus.CONFIRMED)

        # Pay remaining amount
        await services['booking'].update_booking(
            booking.id,
            paid_amount=total_amount,
        )
        await services['booking'].change_payment_status(
            booking.id,
            PaymentStatus.PAID,
        )

        # Start rental
        await services['booking'].change_status(booking.id, BookingStatus.ACTIVE)

        # Return equipment
        await services['booking'].change_status(booking.id, BookingStatus.COMPLETED)

        # Assert
        updated_booking = await services['booking'].get_booking(booking.id)
        assert updated_booking.booking_status == BookingStatus.COMPLETED

        # Verify equipment is available again
        assert await services['equipment'].check_availability(
            test_equipment.id, start_date, end_date
        )

        # Verify client history is updated
        client_bookings = await services['booking'].get_by_client(test_client.id)
        assert any(b.id == booking.id for b in client_bookings)


class TestEquipmentAvailability:
    """Test class for equipment availability scenarios."""

    @async_test
    async def test_overlapping_bookings(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test that overlapping bookings are handled correctly."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)  # Start tomorrow
        end_date = start_date + timedelta(days=3)
        total_amount = float(300.00)  # 3 days * 100.00 daily rate
        deposit_amount = float(200.00)  # 20% of replacement cost

        # Act
        # Create first booking
        await services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=total_amount,
            deposit_amount=deposit_amount,
        )

        # Try to create overlapping booking
        with pytest.raises(
            ValueError,
            match=f'Equipment {test_equipment.id} is not available',
        ):
            await services['booking'].create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=start_date + timedelta(days=1),
                end_date=end_date + timedelta(days=1),
                total_amount=total_amount,
                deposit_amount=deposit_amount,
            )

        # Assert
        assert not await services['equipment'].check_availability(
            test_equipment.id,
            start_date + timedelta(days=1),
            end_date + timedelta(days=1),
        )
