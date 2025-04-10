"""Unit tests for document service."""

from datetime import datetime, timedelta, timezone

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
            name='John Doe',
            email='john.doe@example.com',
            phone='+1234567890',
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
            replacement_cost=1000.00,
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
        total_amount = float(300.00)
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
        document_service: DocumentService,
        booking: Booking,
    ) -> None:
        """Test document creation with booking."""
        document = await document_service.create_document(
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
        self, document_service: DocumentService, document: Document
    ) -> None:
        """Test document update."""
        # Update document
        updated = await document_service.update_document(
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
        result = await document_service.update_document(
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
            await document_service.update_document(999, file_path='/non-existent.pdf')

    @async_test
    async def test_change_status(
        self, document_service: DocumentService, document: Document
    ) -> None:
        """Test changing document status."""
        # Change status to PENDING
        updated = await document_service.change_status(
            document.id, DocumentStatus.PENDING
        )
        assert updated is not None
        assert updated.status == DocumentStatus.PENDING

        # Change status to UNDER_REVIEW
        updated = await document_service.change_status(
            document.id, DocumentStatus.UNDER_REVIEW
        )
        assert updated is not None
        assert updated.status == DocumentStatus.UNDER_REVIEW

        # Change status to APPROVED
        updated = await document_service.change_status(
            document.id, DocumentStatus.APPROVED
        )
        assert updated is not None
        assert updated.status == DocumentStatus.APPROVED

        # Test changing status of non-existent document
        with pytest.raises(ValueError, match='Document with ID .* not found'):
            await document_service.change_status(999, DocumentStatus.APPROVED)

    @async_test
    async def test_get_document(
        self, document_service: DocumentService, document: Document
    ) -> None:
        """Test getting document by ID."""
        # Get document
        result = await document_service.get_document(document.id)

        # Check that document was retrieved correctly
        assert result is not None
        assert result.id == document.id
        assert result.booking_id == document.booking_id
        assert result.type == document.type
        assert result.file_path == document.file_path
        assert result.notes == document.notes
        assert result.status == document.status

        # Test getting non-existent document
        result = await document_service.get_document(999)
        assert result is None

    @async_test
    async def test_get_documents(
        self, document_service: DocumentService, document: Document
    ) -> None:
        """Test getting all documents."""
        # Get all documents
        documents = await document_service.get_documents()

        # Check that the list contains our document
        assert len(documents) > 0
        assert any(d.id == document.id for d in documents)

    @async_test
    async def test_get_by_booking(
        self, document_service: DocumentService, document: Document, booking: Booking
    ) -> None:
        """Test getting documents by booking."""
        # Get documents for booking
        documents = await document_service.get_by_booking(booking.id)

        # Check that the list contains our document
        assert len(documents) > 0
        assert any(d.id == document.id for d in documents)

    @async_test
    async def test_get_by_type(
        self, document_service: DocumentService, document: Document
    ) -> None:
        """Test getting documents by type."""
        # Get documents by type
        documents = await document_service.get_by_type(DocumentType.CONTRACT)

        # Check that the list contains our document
        assert len(documents) > 0
        assert all(d.type == DocumentType.CONTRACT for d in documents)

    @async_test
    async def test_get_by_status(
        self, document_service: DocumentService, document: Document
    ) -> None:
        """Test getting documents by status."""
        # Get documents by status
        documents = await document_service.get_by_status(DocumentStatus.DRAFT)

        # Check that the list contains our document
        assert len(documents) > 0
        assert all(d.status == DocumentStatus.DRAFT for d in documents)

    @async_test
    async def test_get_by_date_range(
        self,
        document_service: DocumentService,
        document: Document,
    ) -> None:
        """Test getting documents by date range."""
        # Get current date range
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=1)
        end_date = now + timedelta(days=1)

        # Get documents within date range
        current_documents = await document_service.get_by_date_range(
            start_date=start_date,
            end_date=end_date,
        )

        # Check that the list contains our document
        assert len(current_documents) > 0
        assert any(d.id == document.id for d in current_documents)

        # Test past date range
        past_start = now - timedelta(days=30)
        past_end = now - timedelta(days=29)
        past_documents = await document_service.get_by_date_range(
            start_date=past_start,
            end_date=past_end,
        )
        assert len(past_documents) == 0

        # Test future date range
        future_start = now + timedelta(days=29)
        future_end = now + timedelta(days=30)
        future_documents = await document_service.get_by_date_range(
            start_date=future_start,
            end_date=future_end,
        )
        assert len(future_documents) == 0
