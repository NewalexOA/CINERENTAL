"""Integration tests for business processes in the CINERENTAL system.

Tests verify that business rules and workflows are correctly implemented
across different services and components.
"""

from datetime import datetime, timedelta
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


@pytest.fixture(scope='function')  # type: ignore[misc]
def services(session: AsyncSession) -> Dict[str, Any]:
    """Fixture providing initialized services for testing."""
    return {
        'booking': BookingService(session),
        'client': ClientService(session),
        'document': DocumentService(session),
        'equipment': EquipmentService(session),
    }


class TestRentalProcess:
    """Test class for rental business process validation."""

    def test_booking_status_transitions(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test that booking status transitions follow business rules."""
        # Arrange
        start_date = datetime.now()
        end_date = start_date + timedelta(days=3)

        # Act - Create booking
        booking = services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
        )

        # Assert initial state
        assert booking.status == BookingStatus.PENDING
        assert booking.payment_status == PaymentStatus.PENDING

        # Try to confirm without documents
        with pytest.raises(ValueError, match='Required documents are missing'):
            services['booking'].confirm_booking(booking.id)

        # Add required documents
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

        # Update document status
        services['document'].change_status(contract.id, DocumentStatus.APPROVED)

        # Now confirm booking
        services['booking'].confirm_booking(booking.id)
        updated_booking = services['booking'].get_booking(booking.id)
        assert updated_booking.status == BookingStatus.CONFIRMED.value

        # Try to return without payment
        with pytest.raises(ValueError, match='Payment is required before return'):
            services['booking'].return_equipment(booking.id)

        # Process payment
        services['booking'].process_payment(
            booking.id, amount=1000.0, payment_method='CARD'
        )

        # Return equipment
        services['booking'].return_equipment(booking.id)
        final_booking = services['booking'].get_booking(booking.id)
        assert final_booking.status == BookingStatus.COMPLETED.value


class TestClientLimits:
    """Test class for client-related business rules."""

    def test_concurrent_bookings_limit(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test that client cannot exceed maximum concurrent bookings."""
        # Arrange
        start_date = datetime.now()

        # Act - Create maximum allowed bookings
        for i in range(3):  # Assuming max_concurrent_bookings = 3
            services['booking'].create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=start_date + timedelta(days=i * 7),
                end_date=start_date + timedelta(days=i * 7 + 3),
            )

        # Try to create one more booking
        with pytest.raises(
            ValueError, match='Maximum concurrent bookings limit reached'
        ):
            services['booking'].create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=start_date + timedelta(days=21),
                end_date=start_date + timedelta(days=24),
            )

        # Verify client's active bookings count
        active_bookings = services['client'].get_active_bookings(test_client.id)
        assert len(active_bookings) == 3

    def test_deposit_requirement(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test that expensive equipment requires deposit."""
        # Arrange
        start_date = datetime.now()
        end_date = start_date + timedelta(days=3)

        # Act - Create booking for expensive equipment
        booking = services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
        )

        # Add required documents
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

        services['document'].change_status(contract.id, DocumentStatus.APPROVED)

        # Try to confirm without deposit
        with pytest.raises(ValueError, match='Deposit payment required'):
            services['booking'].confirm_booking(booking.id)

        # Pay deposit
        services['booking'].process_payment(
            booking.id, amount=500.0, payment_method='CARD', is_deposit=True
        )

        # Now confirm booking
        services['booking'].confirm_booking(booking.id)
        assert booking.status == BookingStatus.CONFIRMED.value
