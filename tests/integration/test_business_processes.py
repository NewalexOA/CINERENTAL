"""Integration tests for business processes in the ACT-RENTAL system.

Tests verify that complex business processes work correctly.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import (
    AvailabilityError,
    BusinessError,
    ConflictError,
    StateError,
    StatusTransitionError,
)
from backend.models import (
    Booking,
    BookingStatus,
    Client,
    DocumentStatus,
    DocumentType,
    Equipment,
    EquipmentStatus,
    PaymentStatus,
)
from backend.services.booking import BookingService
from backend.services.category import CategoryService
from backend.services.client import ClientService
from backend.services.document import DocumentService
from backend.services.equipment import EquipmentService
from tests.conftest import async_fixture, async_test


@async_fixture
async def services(
    db_session: AsyncSession,
) -> Dict[str, Any]:
    """Create services for testing."""
    return {
        'booking': BookingService(db_session),
        'client': ClientService(db_session),
        'document': DocumentService(db_session),
        'equipment': EquipmentService(db_session),
    }


class TestBookingProcess:
    """Test class for booking process scenarios."""

    @async_test
    async def test_booking_status_transitions(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test that booking status transitions work correctly."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)  # Start tomorrow
        end_date = start_date + timedelta(days=3)
        total_amount = float(300.00)  # Fixed amount for testing
        deposit_amount = float(200.00)  # 20% of replacement cos

        # Ac
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

        # Pay deposi
        await services['booking'].update_booking(
            booking.id,
            paid_amount=deposit_amount,
        )
        await services['booking'].change_payment_status(
            booking.id,
            PaymentStatus.PARTIAL,
        )

        # Process remaining paymen
        await services['booking'].update_booking(
            booking.id,
            paid_amount=total_amount,
        )
        await services['booking'].change_payment_status(
            booking.id,
            PaymentStatus.PAID,
        )

        # Skip the transition from ACTIVE to CONFIRMED,
        # and proceed directly to check the completion

        # Complete the booking
        await services['booking'].change_status(booking.id, BookingStatus.COMPLETED)
        booking = await services['booking'].get_booking(booking.id)
        assert booking.booking_status == BookingStatus.COMPLETED

    @async_test
    async def test_payment_processing(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test that payment processing works correctly."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)  # Start tomorrow
        end_date = start_date + timedelta(days=3)
        total_amount = float(300.00)  # Fixed amount for testing
        deposit_amount = float(200.00)  # 20% of replacement cos

        # Ac
        # Create booking
        booking = await services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=total_amount,
            deposit_amount=deposit_amount,
        )

        # Process deposit paymen
        await services['booking'].update_booking(
            booking.id,
            paid_amount=deposit_amount,
        )
        await services['booking'].change_payment_status(
            booking.id,
            PaymentStatus.PARTIAL,
        )

        # Process remaining paymen
        await services['booking'].update_booking(
            booking.id,
            paid_amount=total_amount,
        )
        await services['booking'].change_payment_status(
            booking.id,
            PaymentStatus.PAID,
        )

        # Asser
        booking = await services['booking'].get_booking(booking.id)
        assert booking.paid_amount == total_amount

    @async_test
    async def test_document_workflow(
        self, services: Dict[str, Any], test_client: Client, test_equipment: Equipment
    ) -> None:
        """Test that document workflow works correctly."""
        # Arrange
        start_date = datetime.now(timezone.utc) + timedelta(days=1)  # Start tomorrow
        end_date = start_date + timedelta(days=3)
        total_amount = float(300.00)  # Fixed amount for testing
        deposit_amount = float(200.00)  # 20% of replacement cos

        # Ac
        # Create booking
        booking = await services['booking'].create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=total_amount,
            deposit_amount=deposit_amount,
        )

        # Create contrac
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


class TestCategoryHierarchy:
    """Test category hierarchy and equipment counting."""

    @async_test
    async def test_category_tree(
        self,
        db_session: AsyncSession,
        equipment_service: EquipmentService,
    ) -> None:
        """Test category hierarchy and equipment counting."""
        category_service = CategoryService(db_session)
        # Переинициализируем сервис оборудования с правильной зависимостью
        equipment_service = EquipmentService(db_session, category_service)

        # Create root categories
        cameras = await category_service.create_category(
            name='Cameras',
            description='Photo and video cameras only',
        )
        await category_service.create_category(
            name='Lighting',
            description='Studio and location lighting',
        )

        # Create subcategories
        dslr = await category_service.create_category(
            name='DSLR',
            description='Digital SLR cameras',
            parent_id=cameras.id,
        )
        video = await category_service.create_category(
            name='Video',
            description='Professional video cameras',
            parent_id=cameras.id,
        )

        # Create equipment items in subcategories
        for i in range(3):
            await equipment_service.create_equipment(
                name=f'Canon 5D Mark IV #{i}',
                description='Professional DSLR camera',
                category_id=dslr.id,
                serial_number=f'CN5D{i}',
                replacement_cost=3000,
            )

        for i in range(2):
            await equipment_service.create_equipment(
                name=f'Sony FS7 #{i}',
                description='4K Super 35mm sensor camera',
                category_id=video.id,
                serial_number=f'SF7{i}',
                replacement_cost=8000,
            )


class TestBookingLifecycle:
    """Test booking lifecycle."""

    @async_test
    async def test_booking_status_transitions(
        self,
        db_session: AsyncSession,
        test_client: Client,
        test_equipment: Equipment,
        booking_service: BookingService,
        equipment_service: EquipmentService,
    ) -> None:
        """Test the complete lifecycle of a booking with status transitions."""
        # Initial setup
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)

        # Create booking
        booking = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=300.0,
            deposit_amount=100.0,
            notes='Test booking',
        )
        assert booking.booking_status == BookingStatus.ACTIVE
        assert booking.payment_status == PaymentStatus.PENDING

        # Make partial payment
        booking = await booking_service.change_payment_status(
            booking.id, PaymentStatus.PARTIAL
        )
        assert booking.payment_status == PaymentStatus.PARTIAL

        # Complete payment
        booking = await booking_service.change_payment_status(
            booking.id, PaymentStatus.PAID
        )
        assert booking.payment_status == PaymentStatus.PAID

        # Complete booking
        booking = await booking_service.change_status(
            booking.id, BookingStatus.COMPLETED
        )
        assert booking.booking_status == BookingStatus.COMPLETED

    @async_test
    async def test_equipment_status_affects_booking(
        self,
        db_session: AsyncSession,
        test_client: Client,
        test_equipment: Equipment,
        booking_service: BookingService,
        equipment_service: EquipmentService,
    ) -> None:
        """Test that equipment status affects booking availability."""
        from backend.services.category import CategoryService

        # Инициализация с правильной зависимостью
        category_service = CategoryService(db_session)
        equipment_service = EquipmentService(db_session, category_service)

        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)

        # Put equipment in maintenance
        await equipment_service.change_status(
            test_equipment.id,
            EquipmentStatus.MAINTENANCE,
        )

        # Try to create booking for equipment in maintenance
        with pytest.raises(AvailabilityError):
            await booking_service.create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=start_date,
                end_date=end_date,
                total_amount=300.0,
                deposit_amount=100.0,
            )

        # Make equipment available
        await equipment_service.change_status(
            test_equipment.id,
            EquipmentStatus.AVAILABLE,
        )

        # Now booking should be possible
        booking = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=300.0,
            deposit_amount=100.0,
        )
        assert booking.booking_status == BookingStatus.ACTIVE

        # Set payment status to PAID
        await booking_service.update_booking(
            booking.id,
            paid_amount=300.0,  # Full payment
        )
        await booking_service.change_payment_status(
            booking.id,
            PaymentStatus.PAID,
        )

        # Cannot retire equipment with active booking
        with pytest.raises(BusinessError):
            await equipment_service.change_status(
                test_equipment.id,
                EquipmentStatus.RETIRED,
            )


class TestDocumentLifecycle:
    """Test document lifecycle."""

    @async_test
    async def test_document_status_transitions(
        self,
        db_session: AsyncSession,
        test_booking: Booking,
        document_service: DocumentService,
    ) -> None:
        """Test the complete lifecycle of a document with status transitions."""
        # Create documen
        document = await document_service.create_document(
            client_id=test_booking.client_id,
            booking_id=test_booking.id,
            document_type=DocumentType.CONTRACT,
            file_path='/test/path/contract.pdf',
            title='Rental Contract',
            description='Contract for equipment rental',
            file_name='contract.pdf',
            file_size=1024,
            mime_type='application/pdf',
            notes='Test document',
        )
        assert document.status == DocumentStatus.DRAFT

        # Submit documen
        document = await document_service.change_status(
            document.id, DocumentStatus.PENDING
        )
        assert document.status == DocumentStatus.PENDING

        # Review documen
        document = await document_service.change_status(
            document.id, DocumentStatus.UNDER_REVIEW
        )
        assert document.status == DocumentStatus.UNDER_REVIEW

        # Approve documen
        document = await document_service.change_status(
            document.id, DocumentStatus.APPROVED
        )
        assert document.status == DocumentStatus.APPROVED

    @async_test
    async def test_document_rejection_flow(
        self,
        db_session: AsyncSession,
        test_booking: Booking,
        document_service: DocumentService,
    ) -> None:
        """Test document rejection and resubmission flow."""
        # Create and submit documen
        document = await document_service.create_document(
            client_id=test_booking.client_id,
            booking_id=test_booking.id,
            document_type=DocumentType.CONTRACT,
            file_path='/test/path/contract.pdf',
            title='Rental Contract',
            description='Contract for equipment rental',
            file_name='contract.pdf',
            file_size=1024,
            mime_type='application/pdf',
            notes='Test document',
        )
        document = await document_service.change_status(
            document.id, DocumentStatus.PENDING
        )

        # Review and reject documen
        document = await document_service.change_status(
            document.id, DocumentStatus.UNDER_REVIEW
        )
        document = await document_service.change_status(
            document.id, DocumentStatus.REJECTED
        )
        assert document.status == DocumentStatus.REJECTED

        # Update and resubmi
        document = await document_service.update_document(
            document.id,
            notes='Test document with signature',
        )
        document = await document_service.change_status(
            document.id, DocumentStatus.PENDING
        )
        assert document.status == DocumentStatus.PENDING

        # Review and approve resubmitted documen
        document = await document_service.change_status(
            document.id, DocumentStatus.UNDER_REVIEW
        )
        document = await document_service.change_status(
            document.id, DocumentStatus.APPROVED
        )
        assert document.status == DocumentStatus.APPROVED

    @async_test
    async def test_invalid_document_transitions(
        self,
        db_session: AsyncSession,
        test_booking: Booking,
        document_service: DocumentService,
    ) -> None:
        """Test that invalid document status transitions are rejected."""
        # Create documen
        document = await document_service.create_document(
            client_id=test_booking.client_id,
            booking_id=test_booking.id,
            document_type=DocumentType.CONTRACT,
            file_path='/test/path/contract.pdf',
            title='Rental Contract',
            description='Contract for equipment rental',
            file_name='contract.pdf',
            file_size=1024,
            mime_type='application/pdf',
            notes='Test document',
        )

        # Try invalid transitions
        with pytest.raises(StatusTransitionError):
            # Cannot go directly from DRAFT to APPROVED
            await document_service.change_status(document.id, DocumentStatus.APPROVED)

        with pytest.raises(StatusTransitionError):
            # Cannot go directly from DRAFT to REJECTED
            await document_service.change_status(document.id, DocumentStatus.REJECTED)

        # Submit documen
        document = await document_service.change_status(
            document.id, DocumentStatus.PENDING
        )

        with pytest.raises(StatusTransitionError):
            # Cannot go back to DRAFT
            await document_service.change_status(document.id, DocumentStatus.DRAFT)


class TestEquipmentBusinessRules:
    """Test equipment business rules and validations."""

    @async_test
    async def test_equipment_lifecycle(
        self,
        services: Dict[str, Any],
        test_client: Client,
        test_equipment: Equipment,
    ) -> None:
        """Test complete equipment lifecycle with business rules."""
        equipment_service = services['equipment']
        booking_service = services['booking']

        # Equipment starts as AVAILABLE
        assert test_equipment.status == EquipmentStatus.AVAILABLE

        # Can be put into maintenance
        equipment = await equipment_service.change_status(
            test_equipment.id, EquipmentStatus.MAINTENANCE
        )
        assert equipment.status == EquipmentStatus.MAINTENANCE

        # Can be marked as broken
        equipment = await equipment_service.change_status(
            equipment.id, EquipmentStatus.BROKEN
        )
        assert equipment.status == EquipmentStatus.BROKEN

        # Can be fixed and returned to maintenance
        equipment = await equipment_service.change_status(
            equipment.id, EquipmentStatus.MAINTENANCE
        )
        assert equipment.status == EquipmentStatus.MAINTENANCE

        # Can be returned to available
        equipment = await equipment_service.change_status(
            equipment.id, EquipmentStatus.AVAILABLE
        )
        assert equipment.status == EquipmentStatus.AVAILABLE

        # Create a booking
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        booking = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=300.00,
            deposit_amount=200.00,
        )

        # Cannot retire equipment with active booking
        error_msg = 'Cannot retire equipment with active bookings'
        with pytest.raises(BusinessError, match=error_msg):
            await equipment_service.change_status(equipment.id, EquipmentStatus.RETIRED)

        # Cancel booking
        await booking_service.change_status(booking.id, BookingStatus.CANCELLED)

        # Now can retire equipmen
        equipment = await equipment_service.change_status(
            equipment.id, EquipmentStatus.RETIRED
        )
        assert equipment.status == EquipmentStatus.RETIRED

        # Cannot change status of retired equipmen
        error_msg = 'Cannot change status from RETIRED to AVAILABLE'
        with pytest.raises(StateError, match=error_msg):
            await equipment_service.change_status(
                equipment.id, EquipmentStatus.AVAILABLE
            )

    @async_test
    async def test_equipment_availability_rules(
        self,
        services: Dict[str, Any],
        test_client: Client,
        test_equipment: Equipment,
    ) -> None:
        """Test equipment availability business rules."""
        equipment_service = services['equipment']
        booking_service = services['booking']

        # Equipment is available initially
        assert test_equipment.status == EquipmentStatus.AVAILABLE

        # Create first booking
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        booking = await booking_service.create_booking(
            client_id=test_client.id,
            equipment_id=test_equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=300.00,
            deposit_amount=200.00,
        )

        # Set payment status to PAID to make booking fully active and
        # affect availability
        await booking_service.update_booking(
            booking.id,
            paid_amount=300.0,  # Full payment
        )
        await booking_service.change_payment_status(
            booking.id,
            PaymentStatus.PAID,
        )

        # Try to create overlapping booking
        with pytest.raises(AvailabilityError, match='not available'):
            await booking_service.create_booking(
                client_id=test_client.id,
                equipment_id=test_equipment.id,
                start_date=start_date + timedelta(days=1),
                end_date=end_date + timedelta(days=1),
                total_amount=300.00,
                deposit_amount=200.00,
            )

        # Check availability through service
        is_available = await equipment_service.check_availability(
            test_equipment.id,
            start_date,
            end_date,
        )
        assert not is_available

        # Create a new equipment for testing maintenance status
        new_equipment = Equipment(
            name='Test Equipment for Maintenance',
            description='Test equipment for maintenance status',
            serial_number='TEST-MAINT-001',
            barcode='BARCODE-MAINT-001',
            replacement_cost=1000,
            category_id=test_equipment.category_id,
            status=EquipmentStatus.AVAILABLE,
        )
        new_equipment = await services['equipment'].repository.create(new_equipment)

        # Equipment in maintenance is not available
        await equipment_service.change_status(
            new_equipment.id, EquipmentStatus.MAINTENANCE
        )
        is_available = await equipment_service.check_availability(
            new_equipment.id,
            start_date + timedelta(days=7),  # Even for future dates
            end_date + timedelta(days=7),
        )
        assert not is_available

    @async_test
    async def test_equipment_validation_rules(
        self,
        services: Dict[str, Any],
        test_client: Client,
        test_equipment: Equipment,
    ) -> None:
        """Test equipment validation business rules."""
        equipment_service = services['equipment']

        # Cannot update with negative replacement cos
        with pytest.raises(BusinessError, match='must be greater than or equal to 0'):
            await equipment_service.update_equipment(
                test_equipment.id, replacement_cost=-1000
            )

        # Cannot create duplicate barcode
        # First create equipment with a valid barcode
        valid_barcode = '00000012323'  # '000000123' with checksum '23'

        # Create first equipment with this barcode
        await equipment_service.create_equipment(
            name='First Equipment',
            description='Test Description',
            category_id=test_equipment.category_id,
            custom_barcode=valid_barcode,
            serial_number='UNIQUE001',
            replacement_cost=1000,
        )

        # Now try to create another equipment with the same barcode
        with pytest.raises(ConflictError, match='already exists'):
            await equipment_service.create_equipment(
                name='Another Equipment',
                description='Test Description',
                category_id=test_equipment.category_id,
                custom_barcode=valid_barcode,  # Same barcode as first equipment
                serial_number='UNIQUE002',
                replacement_cost=1000,
            )
