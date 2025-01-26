"""Integration tests for service interactions in the CINERENTAL system.

Tests verify the correct interaction between different services in the system.
Tests ensure that the services work together as expected in real scenarios.
"""

from datetime import datetime, timedelta
from typing import Any, Dict

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.booking import BookingStatus
from backend.models.client import Client
from backend.models.document import DocumentType
from backend.models.equipment import Equipment
from backend.services.booking import BookingService
from backend.services.client import ClientService
from backend.services.document import DocumentService
from backend.services.equipment import EquipmentService


@pytest.fixture(scope='function')  # type: ignore[misc]
def services(session: AsyncSession) -> Dict[str, Any]:
    """Fixture providing initialized services for testing."""
    return {
        'booking': BookingService(session),
        'client': ClientService(session),
        'document': DocumentService(session),
        'equipment': EquipmentService(session),
    }


class TestBookingFlow:
    """Test class for the complete booking flow integration."""

    def test_create_booking_with_documents(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test creating a booking with required documents."""
        # Arrange
        start_date = datetime.now()
        end_date = start_date + timedelta(days=3)

        # Act
        # Create booking
        booking = services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
        )

        # Create contract document
        contract = services['document'].create_document(
            booking_id=booking.id,
            document_type=DocumentType.CONTRACT,
            file_path='/path/to/contract.pdf',
            title='Rental Contract',
            description='Equipment rental contract',
            file_name='contract.pdf',
            file_size=1024,
            mime_type='application/pdf',
        )

        # Assert
        assert booking.status == BookingStatus.PENDING
        assert contract.booking_id == booking.id
        assert contract.document_type == DocumentType.CONTRACT

        # Verify equipment availability is updated
        equipment = services['equipment'].get_equipment(test_equipment.id)
        assert not services['equipment'].is_available(
            equipment.id, start_date, end_date
        )

    def test_complete_booking_flow(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test the complete booking flow from creation to return."""
        # Arrange
        start_date = datetime.now()
        end_date = start_date + timedelta(days=1)

        # Act - Create booking
        booking = services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
        )

        # Create required documents
        services['document'].create_document(
            booking_id=booking.id,
            document_type=DocumentType.CONTRACT,
            file_path='/path/to/contract.pdf',
            title='Rental Contract',
            description='Equipment rental contract',
            file_name='contract.pdf',
            file_size=1024,
            mime_type='application/pdf',
        )

        services['document'].create_document(
            booking_id=booking.id,
            document_type=DocumentType.PASSPORT,
            file_path='/path/to/passport.pdf',
            title='Client Passport',
            description='Client identification document',
            file_name='passport.pdf',
            file_size=512,
            mime_type='application/pdf',
        )

        # Confirm booking
        services['booking'].confirm_booking(booking.id)

        # Return equipment
        services['booking'].return_equipment(booking.id)

        # Assert
        updated_booking = services['booking'].get_booking(booking.id)
        assert updated_booking.status == BookingStatus.COMPLETED.value

        # Verify equipment is available again
        assert services['equipment'].is_available(
            test_equipment.id, start_date, end_date
        )

        # Verify client history is updated
        client_bookings = services['client'].get_client_bookings(test_client.id)
        assert any(b.id == booking.id for b in client_bookings)


class TestEquipmentAvailability:
    """Test class for equipment availability scenarios."""

    def test_overlapping_bookings(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test that overlapping bookings are handled correctly."""
        # Arrange
        start_date = datetime.now()
        end_date = start_date + timedelta(days=3)

        # Act
        # Create first booking
        services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
        )

        # Try to create overlapping booking
        error_msg = 'Equipment is not available for the selected dates'
        with pytest.raises(ValueError, match=error_msg):
            services['booking'].create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=start_date + timedelta(days=1),
                end_date=end_date + timedelta(days=1),
            )

        # Assert
        assert not services['equipment'].is_available(
            test_equipment.id,
            start_date + timedelta(days=1),
            end_date + timedelta(days=1),
        )
