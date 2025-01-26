"""Integration tests for edge cases in the CINERENTAL system.

Tests verify system behavior in non-standard situations and edge cases.
"""

from datetime import datetime, timedelta, timezone
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
def services(db_session: AsyncSession) -> Dict[str, Any]:
    """Fixture providing initialized services for testing."""
    return {
        'booking': BookingService(db_session),
        'client': ClientService(db_session),
        'document': DocumentService(db_session),
        'equipment': EquipmentService(db_session),
    }


class TestBookingEdgeCases:
    """Test class for booking edge cases."""

    @pytest.mark.asyncio  # type: ignore[misc]
    async def test_booking_date_validation(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test booking date validation edge cases."""
        # Past start date
        past_start = datetime.now(timezone.utc) - timedelta(days=1)
        total_amount = float(300.00)  # 3 days * 100.00 daily rate
        deposit_amount = float(200.00)  # 20% of replacement cost

        with pytest.raises(ValueError, match='Start date cannot be in the past'):
            await services['booking'].create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=past_start,
                end_date=datetime.now(timezone.utc) + timedelta(days=1),
                total_amount=total_amount,
                deposit_amount=deposit_amount,
            )

        # End date before start date
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date - timedelta(hours=1)
        with pytest.raises(ValueError, match='End date must be after start date'):
            await services['booking'].create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=start_date,
                end_date=end_date,
                total_amount=total_amount,
                deposit_amount=deposit_amount,
            )

        # Booking too far in future
        far_future = datetime.now(timezone.utc) + timedelta(days=366)
        with pytest.raises(ValueError, match='Booking too far in advance'):
            await services['booking'].create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=far_future,
                end_date=far_future + timedelta(days=1),
                total_amount=total_amount,
                deposit_amount=deposit_amount,
            )


class TestDocumentEdgeCases:
    """Test class for document edge cases."""

    @pytest.mark.asyncio  # type: ignore[misc]
    async def test_document_status_transitions(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test document status transition edge cases."""
        # Create booking and document
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=1)
        total_amount = float(200.00)  # 2 days * 100.00 daily rate
        deposit_amount = float(200.00)  # 20% of replacement cost

        booking = await services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=total_amount,
            deposit_amount=deposit_amount,
        )

        # Create document
        document = await services['document'].create_document(
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

        # Try invalid transitions
        with pytest.raises(ValueError, match='Invalid status transition'):
            await services['document'].change_status(
                document.id,
                DocumentStatus.APPROVED,
            )

        # Valid transition: DRAFT -> PENDING
        await services['document'].change_status(
            document.id,
            DocumentStatus.PENDING,
        )
        document = await services['document'].get_document(document.id)
        assert document.status == DocumentStatus.PENDING

        # Valid transition: PENDING -> UNDER_REVIEW
        await services['document'].change_status(
            document.id,
            DocumentStatus.UNDER_REVIEW,
        )
        document = await services['document'].get_document(document.id)
        assert document.status == DocumentStatus.UNDER_REVIEW

        # Valid transition: UNDER_REVIEW -> APPROVED
        await services['document'].change_status(
            document.id,
            DocumentStatus.APPROVED,
        )
        document = await services['document'].get_document(document.id)
        assert document.status == DocumentStatus.APPROVED

        # Invalid transition: APPROVED -> DRAFT
        with pytest.raises(ValueError, match='Invalid status transition'):
            await services['document'].change_status(
                document.id,
                DocumentStatus.DRAFT,
            )


class TestEquipmentEdgeCases:
    """Test class for equipment edge cases."""

    @pytest.mark.asyncio  # type: ignore[misc]
    async def test_equipment_availability_edge_cases(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test equipment availability edge cases."""
        # Create booking that ends exactly when another starts
        start1 = datetime.now(timezone.utc) + timedelta(days=1)
        end1 = start1 + timedelta(days=1)
        total_amount = float(200.00)  # 2 days * 100.00 daily rate
        deposit_amount = float(200.00)  # 20% of replacement cost

        booking1 = await services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start1,
            end_date=end1,
            total_amount=total_amount,
            deposit_amount=deposit_amount,
        )

        # This should succeed (back-to-back bookings allowed)
        booking2 = await services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=end1,
            end_date=end1 + timedelta(days=1),
            total_amount=total_amount,
            deposit_amount=deposit_amount,
        )

        assert booking1.id != booking2.id
        assert booking2.start_date == booking1.end_date

        # Verify equipment is not available during either booking
        assert not await services['equipment'].check_availability(
            test_equipment.id, start1, end1
        )
        assert not await services['equipment'].check_availability(
            test_equipment.id, end1, end1 + timedelta(days=1)
        )

        # But is available before and after
        assert await services['equipment'].check_availability(
            test_equipment.id, start1 - timedelta(days=1), start1
        )
        assert await services['equipment'].check_availability(
            test_equipment.id, end1 + timedelta(days=1), end1 + timedelta(days=2)
        )
