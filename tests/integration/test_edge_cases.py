"""Integration tests for edge cases in the ACT-RENTAL system.

Tests verify system behavior in non-standard situations and edge cases.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions.resource_exceptions import AvailabilityError, NotFoundError
from backend.exceptions.state_exceptions import StatusTransitionError
from backend.models import (
    BookingStatus,
    Client,
    DocumentStatus,
    DocumentType,
    Equipment,
    EquipmentStatus,
    PaymentStatus,
)
from backend.services import BookingService, ClientService, DocumentService
from backend.services.equipment import EquipmentService
from tests.conftest import async_test


@pytest.fixture
def services(
    db_session: AsyncSession,
) -> Dict[str, Any]:
    """Create services for testing."""
    return {
        'booking': BookingService(db_session),
        'client': ClientService(db_session),
        'document': DocumentService(db_session),
        'equipment': EquipmentService(db_session),
    }


class TestBookingEdgeCases:
    """Test class for booking edge cases."""

    @async_test
    async def test_booking_date_validation(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test booking date validation edge cases."""
        # Past start date - now allowed
        past_start = datetime.now(timezone.utc) - timedelta(days=1)
        total_amount = float(300.00)
        deposit_amount = float(200.00)  # 20% of replacement cost

        # Past dates are now allowed, so this should succeed
        booking = await services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=past_start,
            end_date=datetime.now(timezone.utc) + timedelta(days=1),
            total_amount=total_amount,
            deposit_amount=deposit_amount,
        )
        
        # Verify booking was created successfully
        assert booking is not None
        assert booking.start_date == past_start

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

    @async_test
    async def test_document_status_transitions(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test document status transition edge cases."""
        # Create booking and document
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=1)
        total_amount = float(200.00)
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
        with pytest.raises(StatusTransitionError, match='Invalid status transition'):
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


class TestEquipmentEdgeCases:
    """Test class for equipment edge cases."""

    @async_test
    async def test_equipment_availability_edge_cases(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test equipment availability edge cases."""
        # Create booking that ends exactly when another starts
        start1 = datetime.now(timezone.utc) + timedelta(days=1)
        end1 = start1 + timedelta(days=1)
        total_amount = float(200.00)
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


class TestSoftDelete:
    """Test class for soft delete functionality."""

    @async_test
    async def test_equipment_soft_delete(
        self, services: Dict[str, Any], test_equipment: Equipment
    ) -> None:
        """Test equipment soft delete functionality."""
        # Get equipment by ID
        equipment = await services['equipment'].get_equipment(test_equipment.id)
        assert equipment is not None
        assert equipment.deleted_at is None

        # Soft delete equipment
        await services['equipment'].delete_equipment(equipment.id)

        # Try to get deleted equipment - should raise NotFoundError
        with pytest.raises(NotFoundError):
            await services['equipment'].get_equipment(test_equipment.id)

        # Get with include_deleted=True
        equipment = await services['equipment'].get_equipment(
            test_equipment.id, include_deleted=True
        )
        assert equipment is not None
        assert equipment.deleted_at is not None

        # Verify equipment doesn't appear in search
        search_results = await services['equipment'].search(test_equipment.name)
        assert len(search_results) == 0

        # But appears in search with include_deleted=True
        search_results = await services['equipment'].search(
            test_equipment.name, include_deleted=True
        )
        assert len(search_results) == 1
        assert search_results[0].id == test_equipment.id

    @async_test
    async def test_client_soft_delete(
        self, services: Dict[str, Any], test_client: Client
    ) -> None:
        """Test client soft delete functionality."""
        # Get client by ID
        client = await services['client'].get_client(test_client.id)
        assert client is not None
        assert client.deleted_at is None

        # Soft delete client
        await services['client'].delete_client(client.id)

        # Try to get deleted client
        client = await services['client'].get_client(test_client.id)
        assert client is None

        # Get with include_deleted=True
        client = await services['client'].get_client(
            test_client.id, include_deleted=True
        )
        assert client is not None
        assert client.deleted_at is not None

        # Verify client doesn't appear in search
        search_results = await services['client'].search(test_client.email)
        assert len(search_results) == 0

        # But appears in search with include_deleted=True
        search_results = await services['client'].search(
            test_client.email, include_deleted=True
        )
        assert len(search_results) == 1
        assert search_results[0].id == test_client.id

    @async_test
    async def test_delete_with_relations(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test soft delete with related records."""
        # Create booking
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        booking = await services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=300.0,
            deposit_amount=200.0,
        )

        # Create document
        await services['document'].create_document(
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

        # Try to delete client with active booking
        with pytest.raises(
            ValueError, match='Cannot delete client with active bookings'
        ):
            await services['client'].delete_client(test_client.id)

        # Set payment status to PAID before completing the booking
        await services['booking'].update_booking(
            booking.id,
            paid_amount=300.0,  # Full payment
        )
        await services['booking'].change_payment_status(
            booking.id,
            PaymentStatus.PAID,
        )

        # Complete the booking
        await services['booking'].change_status(booking.id, BookingStatus.COMPLETED)

        # Now try to delete client
        await services['client'].delete_client(test_client.id)

        # Verify client is deleted
        client = await services['client'].get_client(test_client.id)
        assert client is None

        # Get with include_deleted=True
        client = await services['client'].get_client(
            test_client.id, include_deleted=True
        )
        assert client is not None
        assert client.deleted_at is not None


class TestEquipmentStatus:
    """Test class for equipment status scenarios."""

    @async_test
    async def test_equipment_status_changes(
        self, services: Dict[str, Any], test_equipment: Equipment
    ) -> None:
        """Test equipment status changes and their effect on availability."""
        # Initially equipment should be available
        assert test_equipment.status == EquipmentStatus.AVAILABLE
        assert await services['equipment'].check_availability(
            test_equipment.id,
            datetime.now(timezone.utc) + timedelta(days=1),
            datetime.now(timezone.utc) + timedelta(days=2),
        )

        # Set equipment to maintenance
        await services['equipment'].update_equipment(
            test_equipment.id,
            status=EquipmentStatus.MAINTENANCE,
        )

        # Equipment should not be available while in maintenance
        assert not await services['equipment'].check_availability(
            test_equipment.id,
            datetime.now(timezone.utc) + timedelta(days=1),
            datetime.now(timezone.utc) + timedelta(days=2),
        )

        # Set equipment back to available
        await services['equipment'].update_equipment(
            test_equipment.id,
            status=EquipmentStatus.AVAILABLE,
        )

        # Equipment should be available again
        assert await services['equipment'].check_availability(
            test_equipment.id,
            datetime.now(timezone.utc) + timedelta(days=1),
            datetime.now(timezone.utc) + timedelta(days=2),
        )

    @async_test
    async def test_booking_with_status_changes(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test booking interactions with equipment status changes."""
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)

        # Create booking
        booking = await services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=300.0,
            deposit_amount=200.0,
        )

        # Equipment should be marked as rented when booking becomes active
        # Set payment status to PAID before activating
        await services['booking'].update_booking(
            booking.id,
            paid_amount=300.0,  # Full payment
        )
        await services['booking'].change_payment_status(
            booking.id,
            PaymentStatus.PAID,
        )

        # Booking is already ACTIVE by default, no need to set status again
        # Refresh equipment status to make sure it's updated to RENTED
        await services['equipment'].refresh_equipment_status(test_equipment.id)

        equipment = await services['equipment'].get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.RENTED

        # Equipment should be available again when booking is completed
        await services['booking'].change_status(booking.id, BookingStatus.COMPLETED)
        equipment = await services['equipment'].get_equipment(test_equipment.id)
        assert equipment.status == EquipmentStatus.AVAILABLE

    @async_test
    async def test_booking_unavailable_equipment(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test that unavailable equipment cannot be booked."""
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)

        # Set equipment to maintenance
        await services['equipment'].update_equipment(
            test_equipment.id,
            status=EquipmentStatus.MAINTENANCE,
        )

        # Try to book equipment in maintenance
        with pytest.raises(
            AvailabilityError,
            match=f'Equipment {test_equipment.id} is not available',
        ):
            await services['booking'].create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=start_date,
                end_date=end_date,
                total_amount=300.0,
                deposit_amount=200.0,
            )

        # Set equipment to broken
        await services['equipment'].update_equipment(
            test_equipment.id,
            status=EquipmentStatus.BROKEN,
        )

        # Try to book broken equipment
        with pytest.raises(
            AvailabilityError,
            match=f'Equipment {test_equipment.id} is not available',
        ):
            await services['booking'].create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=start_date,
                end_date=end_date,
                total_amount=300.0,
                deposit_amount=200.0,
            )

        # Set equipment to retired
        await services['equipment'].update_equipment(
            test_equipment.id,
            status=EquipmentStatus.RETIRED,
        )

        # Try to book retired equipment
        with pytest.raises(
            AvailabilityError,
            match=f'Equipment {test_equipment.id} is not available',
        ):
            await services['booking'].create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=start_date,
                end_date=end_date,
                total_amount=300.0,
                deposit_amount=200.0,
            )
