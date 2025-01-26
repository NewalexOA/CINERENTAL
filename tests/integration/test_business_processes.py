"""Integration tests for business processes in the CINERENTAL system.

Tests verify that complex business processes work correctly.
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


@pytest.fixture(scope='function')  # type: ignore[misc]
def services(db_session: AsyncSession) -> Dict[str, Any]:
    """Fixture providing initialized services for testing."""
    return {
        'booking': BookingService(db_session),
        'client': ClientService(db_session),
        'document': DocumentService(db_session),
        'equipment': EquipmentService(db_session),
    }


class TestBookingProcess:
    """Test class for booking process scenarios."""

    @pytest.mark.asyncio  # type: ignore[misc]
    async def test_booking_status_transitions(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test that booking status transitions work correctly."""
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
        await services['document'].change_status(contract.id, DocumentStatus.PENDING)
        await services['document'].change_status(contract.id, DocumentStatus.APPROVED)

        # Pay deposit
        await services['booking'].update_booking(
            booking.id,
            paid_amount=deposit_amount,
        )
        await services['booking'].change_payment_status(
            booking.id,
            PaymentStatus.PARTIAL,
        )

        # Process remaining payment
        await services['booking'].update_booking(
            booking.id,
            paid_amount=total_amount,
        )
        await services['booking'].change_payment_status(
            booking.id,
            PaymentStatus.PAID,
        )

        # Confirm booking
        await services['booking'].change_status(booking.id, BookingStatus.CONFIRMED)
        booking = await services['booking'].get_booking(booking.id)
        assert booking.booking_status == BookingStatus.CONFIRMED

        # Start rental
        await services['booking'].change_status(booking.id, BookingStatus.ACTIVE)
        booking = await services['booking'].get_booking(booking.id)
        assert booking.booking_status == BookingStatus.ACTIVE

        # Return equipment
        await services['booking'].change_status(booking.id, BookingStatus.COMPLETED)
        booking = await services['booking'].get_booking(booking.id)
        assert booking.booking_status == BookingStatus.COMPLETED

    @pytest.mark.asyncio  # type: ignore[misc]
    async def test_payment_processing(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test that payment processing works correctly."""
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

        # Process deposit payment
        await services['booking'].update_booking(
            booking.id,
            paid_amount=deposit_amount,
        )
        await services['booking'].change_payment_status(
            booking.id,
            PaymentStatus.PARTIAL,
        )

        # Process remaining payment
        await services['booking'].update_booking(
            booking.id,
            paid_amount=total_amount,
        )
        await services['booking'].change_payment_status(
            booking.id,
            PaymentStatus.PAID,
        )

        # Assert
        booking = await services['booking'].get_booking(booking.id)
        assert booking.paid_amount == total_amount

    @pytest.mark.asyncio  # type: ignore[misc]
    async def test_document_workflow(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test that document workflow works correctly."""
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

        # Create contract
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

        # Update contract status
        await services['document'].change_status(contract.id, DocumentStatus.PENDING)
        contract = await services['document'].get_document(contract.id)
        assert contract.status == DocumentStatus.PENDING

        await services['document'].change_status(contract.id, DocumentStatus.APPROVED)
        contract = await services['document'].get_document(contract.id)
        assert contract.status == DocumentStatus.APPROVED
