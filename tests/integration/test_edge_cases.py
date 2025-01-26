"""Integration tests for edge cases in the CINERENTAL system.

Tests verify system behavior in non-standard situations and edge cases.
"""

from datetime import datetime, timedelta
from typing import Any, Dict

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

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


class TestBookingEdgeCases:
    """Test class for booking edge cases."""

    def test_booking_date_validation(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test booking date validation edge cases."""
        # Past start date
        past_start = datetime.now() - timedelta(days=1)
        with pytest.raises(ValueError, match='Start date cannot be in the past'):
            services['booking'].create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=past_start,
                end_date=datetime.now() + timedelta(days=1),
            )

        # End date before start date
        start_date = datetime.now() + timedelta(days=1)
        end_date = start_date - timedelta(hours=1)
        with pytest.raises(ValueError, match='End date must be after start date'):
            services['booking'].create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=start_date,
                end_date=end_date,
            )

        # Booking too far in future
        far_future = datetime.now() + timedelta(days=366)
        with pytest.raises(ValueError, match='Booking too far in advance'):
            services['booking'].create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=far_future,
                end_date=far_future + timedelta(days=1),
            )


class TestDocumentEdgeCases:
    """Test class for document edge cases."""

    def test_document_status_transitions(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test document status transition edge cases."""
        # Create booking and document
        booking = services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=datetime.now() + timedelta(days=1),
            end_date=datetime.now() + timedelta(days=2),
        )

        doc = services['document'].create_document(
            booking_id=booking.id,
            document_type=DocumentType.CONTRACT,
            file_path='/path/to/contract.pdf',
            title='Test Contract',
            description='Test contract',
            file_name='contract.pdf',
            file_size=1024,
            mime_type='application/pdf',
        )

        # Try invalid status transition
        with pytest.raises(ValueError, match='Invalid status transition'):
            services['document'].change_status(doc.id, DocumentStatus.EXPIRED)

        # Try to approve document for cancelled booking
        services['booking'].cancel_booking(booking.id)
        with pytest.raises(
            ValueError, match='Cannot approve document for cancelled booking'
        ):
            services['document'].change_status(doc.id, DocumentStatus.APPROVED)


class TestEquipmentEdgeCases:
    """Test class for equipment edge cases."""

    def test_equipment_availability_edge_cases(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test equipment availability edge cases."""
        # Create booking that ends exactly when another starts
        start1 = datetime.now() + timedelta(days=1)
        end1 = start1 + timedelta(days=1)

        booking1 = services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start1,
            end_date=end1,
        )

        # This should succeed (back-to-back bookings allowed)
        booking2 = services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=end1,
            end_date=end1 + timedelta(days=1),
        )

        assert booking1.id != booking2.id
        assert booking2.start_date == booking1.end_date

        # Verify equipment is not available during either booking
        assert not services['equipment'].is_available(test_equipment.id, start1, end1)
        assert not services['equipment'].is_available(
            test_equipment.id, end1, end1 + timedelta(days=1)
        )

        # But is available before and after
        assert services['equipment'].is_available(
            test_equipment.id, start1 - timedelta(days=1), start1
        )
        assert services['equipment'].is_available(
            test_equipment.id, end1 + timedelta(days=1), end1 + timedelta(days=2)
        )
