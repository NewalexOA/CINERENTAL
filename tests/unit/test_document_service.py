"""Unit tests for document service."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import (
    Booking,
    Category,
    Client,
    Document,
    DocumentStatus,
    DocumentType,
    Equipment,
    EquipmentStatus,
)
from backend.services import (
    BookingService,
    CategoryService,
    ClientService,
    DocumentService,
)
from tests.conftest import async_fixture, async_test


class TestDocumentService:
    """Test cases for DocumentService."""

    @async_fixture
    async def service(self, db_session: AsyncSession) -> DocumentService:
        """Create DocumentService instance."""
        return DocumentService(db_session)

    @async_fixture
    async def client(self, db_session: AsyncSession) -> Client:
        """Create test client."""
        client_service = ClientService(db_session)
        return await client_service.create_client(
            first_name='John',
            last_name='Doe',
            email='john.doe@example.com',
            phone='+1234567890',
            passport_number='AB123456',
            address='123 Test St',
            company='Test Company',
            notes='Test client',
        )

    @async_fixture
    async def category(self, db_session: AsyncSession) -> Category:
        """Create test category."""
        category_service = CategoryService(db_session)
        return await category_service.create_category(
            name='Test Category',
            description='Test Description',
        )

    @async_fixture
    async def equipment(
        self, db_session: AsyncSession, category: Category
    ) -> Equipment:
        """Create test equipment.

        Args:
            db_session: Database session
            category: Test category

        Returns:
            Created equipment
        """
        equipment = Equipment(
            name='Test Equipment',
            category_id=category.id,
            description='Test Description',
            serial_number='TEST001',
            barcode='TEST001',
            daily_rate=Decimal('100.00'),
            replacement_cost=Decimal('1000.00'),
            status=EquipmentStatus.AVAILABLE,
        )
        db_session.add(equipment)
        await db_session.commit()
        await db_session.refresh(equipment)
        return equipment

    @async_fixture
    async def booking(
        self,
        db_session: AsyncSession,
        client: Client,
        equipment: Equipment,
    ) -> Booking:
        """Create test booking."""
        booking_service = BookingService(db_session)
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        total_amount = float(300.00)  # 3 days * 100.00 daily rate
        deposit_amount = float(200.00)  # 20% of replacement cost

        return await booking_service.create_booking(
            client_id=client.id,
            equipment_id=equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=total_amount,
            deposit_amount=deposit_amount,
            notes='Test booking',
        )

    @async_fixture
    async def document(
        self,
        service: DocumentService,
        booking: Booking,
    ) -> Document:
        """Create test document."""
        return await service.create_document(
            client_id=booking.client_id,
            booking_id=booking.id,
            document_type=DocumentType.CONTRACT,
            file_path='/test/contract.pdf',
            title='Test Contract',
            description='Test contract description',
            file_name='contract.pdf',
            file_size=1024,
            mime_type='application/pdf',
            notes='Test document',
        )

    @async_test
    async def test_create_document_with_booking(
        self,
        service: DocumentService,
        booking: Booking,
    ) -> None:
        """Test document creation with booking."""
        document = await service.create_document(
            client_id=booking.client_id,
            booking_id=booking.id,
            document_type=DocumentType.CONTRACT,
            file_path='/test/contract.pdf',
            title='Test Contract',
            description='Test contract description',
            file_name='contract.pdf',
            file_size=1024,
            mime_type='application/pdf',
            notes='Test document',
        )

        # Verify document properties
        assert document.client_id == booking.client_id
        assert document.booking_id == booking.id
        assert document.type == DocumentType.CONTRACT
        assert document.file_path == '/test/contract.pdf'
        assert document.title == 'Test Contract'
        assert document.description == 'Test contract description'
        assert document.file_name == 'contract.pdf'
        assert document.file_size == 1024
        assert document.mime_type == 'application/pdf'
        assert document.notes == 'Test document'
        assert document.status == DocumentStatus.DRAFT

    @async_test
    async def test_update_document(
        self, service: DocumentService, document: Document
    ) -> None:
        """Test document update."""
        # Update document
        updated = await service.update_document(
            document_id=document.id,
            file_path='/test/updated.pdf',
            notes='Updated notes',
        )

        # Check that document was updated
        assert updated is not None
        assert updated.id == document.id
        assert updated.file_path == '/test/updated.pdf'
        assert updated.notes == 'Updated notes'

        # Test updating with None values (no changes)
        result = await service.update_document(
            document_id=document.id,
            file_path=None,
            notes=None,
        )
        assert result is not None
        assert result.id == document.id
        assert result.file_path == '/test/updated.pdf'  # Should remain unchanged
        assert result.notes == 'Updated notes'  # Should remain unchanged

        # Test updating non-existent document
        with pytest.raises(ValueError, match='Document with ID 999 not found'):
            await service.update_document(999, file_path='/non-existent.pdf')

    @async_test
    async def test_change_status(
        self, service: DocumentService, document: Document
    ) -> None:
        """Test changing document status."""
        # Change status to PENDING
        updated = await service.change_status(document.id, DocumentStatus.PENDING)
        assert updated is not None
        assert updated.status == DocumentStatus.PENDING

        # Change status to UNDER_REVIEW
        updated = await service.change_status(document.id, DocumentStatus.UNDER_REVIEW)
        assert updated is not None
        assert updated.status == DocumentStatus.UNDER_REVIEW

        # Change status to APPROVED
        updated = await service.change_status(document.id, DocumentStatus.APPROVED)
        assert updated is not None
        assert updated.status == DocumentStatus.APPROVED

        # Test changing status of non-existent document
        with pytest.raises(ValueError, match='Document with ID .* not found'):
            await service.change_status(999, DocumentStatus.APPROVED)

    @async_test
    async def test_get_document(
        self, service: DocumentService, document: Document
    ) -> None:
        """Test getting document by ID."""
        # Get document
        result = await service.get_document(document.id)

        # Check that document was retrieved correctly
        assert result is not None
        assert result.id == document.id
        assert result.booking_id == document.booking_id
        assert result.type == document.type
        assert result.file_path == document.file_path
        assert result.notes == document.notes
        assert result.status == document.status

        # Test getting non-existent document
        result = await service.get_document(999)
        assert result is None

    @async_test
    async def test_get_documents(
        self, service: DocumentService, document: Document
    ) -> None:
        """Test getting all documents."""
        # Get all documents
        documents = await service.get_documents()

        # Check that list contains our document
        assert len(documents) >= 1
        assert any(d.id == document.id for d in documents)

        # Create another document
        another_document = await service.create_document(
            client_id=document.client_id,
            booking_id=document.booking_id,
            document_type=DocumentType.INVOICE,
            file_path='/test/invoice.pdf',
            title='Test Invoice',
            description='Test invoice description',
            file_name='invoice.pdf',
            file_size=512,
            mime_type='application/pdf',
            notes='Test invoice',
        )

        # Get all documents again
        documents = await service.get_documents()

        # Check that both documents are in the list
        assert len(documents) >= 2
        assert any(d.id == document.id for d in documents)
        assert any(d.id == another_document.id for d in documents)

    @async_test
    async def test_get_by_booking(
        self, service: DocumentService, document: Document, booking: Booking
    ) -> None:
        """Test getting documents by booking."""
        # Get documents for booking
        documents = await service.get_by_booking(booking.id)

        # Check that list contains our document
        assert len(documents) >= 1
        assert any(d.id == document.id for d in documents)

        # Test getting documents for non-existent booking
        documents = await service.get_by_booking(999)
        assert len(documents) == 0

    @async_test
    async def test_get_by_type(
        self, service: DocumentService, document: Document
    ) -> None:
        """Test getting documents by type."""
        # Get documents by type
        documents = await service.get_by_type(DocumentType.CONTRACT)

        # Check that list contains our document
        assert len(documents) >= 1
        assert any(d.id == document.id for d in documents)

        # Test getting documents of different type
        documents = await service.get_by_type(DocumentType.INVOICE)
        assert not any(d.id == document.id for d in documents)

    @async_test
    async def test_get_by_status(
        self, service: DocumentService, document: Document
    ) -> None:
        """Test getting documents by status."""
        # Initially document is DRAFT
        documents = await service.get_by_status(DocumentStatus.DRAFT)
        assert len(documents) >= 1
        assert any(d.id == document.id for d in documents)

        # Change status to PENDING
        await service.change_status(document.id, DocumentStatus.PENDING)
        documents = await service.get_by_status(DocumentStatus.PENDING)
        assert len(documents) >= 1
        assert any(d.id == document.id for d in documents)

        # Change status to UNDER_REVIEW
        await service.change_status(document.id, DocumentStatus.UNDER_REVIEW)
        documents = await service.get_by_status(DocumentStatus.UNDER_REVIEW)
        assert len(documents) >= 1
        assert any(d.id == document.id for d in documents)

        # Change status to APPROVED
        await service.change_status(document.id, DocumentStatus.APPROVED)
        documents = await service.get_by_status(DocumentStatus.APPROVED)
        assert len(documents) >= 1
        assert any(d.id == document.id for d in documents)

    @async_test
    async def test_get_by_date_range(
        self, service: DocumentService, document: Document
    ) -> None:
        """Test getting documents by date range."""
        now = datetime.now(timezone.utc)

        # Get documents for current month
        current_month_start = now.replace(day=1)
        next_month = current_month_start + timedelta(days=32)
        current_month_end = next_month.replace(day=1) - timedelta(days=1)

        current_documents = await service.get_by_date_range(
            current_month_start, current_month_end
        )
        assert len(current_documents) >= 1
        assert any(d.id == document.id for d in current_documents)

        # Test getting documents for next month
        next_month_start = next_month.replace(day=1)
        next_month_with_days = next_month_start + timedelta(days=32)
        next_month_end = next_month_with_days.replace(day=1) - timedelta(days=1)

        next_month_documents = await service.get_by_date_range(
            next_month_start, next_month_end
        )
        assert len(next_month_documents) == 0
