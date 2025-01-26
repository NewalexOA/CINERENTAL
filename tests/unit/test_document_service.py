"""Unit tests for document service."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.booking import Booking
from backend.models.category import Category
from backend.models.client import Client
from backend.models.document import Document, DocumentStatus, DocumentType
from backend.models.equipment import Equipment
from backend.services.booking import BookingService
from backend.services.category import CategoryService
from backend.services.client import ClientService
from backend.services.document import DocumentService
from backend.services.equipment import EquipmentService


class TestDocumentService:
    """Test cases for DocumentService."""

    @pytest.fixture  # type: ignore[misc]
    async def service(self, db_session: AsyncSession) -> DocumentService:
        """Create DocumentService instance."""
        return DocumentService(db_session)

    @pytest.fixture  # type: ignore[misc]
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

    @pytest.fixture  # type: ignore[misc]
    async def category(self, db_session: AsyncSession) -> Category:
        """Create test category."""
        category_service = CategoryService(db_session)
        return await category_service.create_category(
            name='Test Category',
            description='Test Description',
        )

    @pytest.fixture  # type: ignore[misc]
    async def equipment(
        self, db_session: AsyncSession, category: Category
    ) -> Equipment:
        """Create test equipment."""
        equipment_service = EquipmentService(db_session)
        return await equipment_service.create_equipment(
            name='Test Equipment',
            category_id=category.id,
            description='Test Description',
            serial_number='TEST001',
            barcode='TEST001',
            daily_rate=100.0,
            replacement_cost=1000.0,
        )

    @pytest.fixture  # type: ignore[misc]
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

    @pytest.fixture  # type: ignore[misc]
    async def document(
        self,
        service: DocumentService,
        booking: Booking,
    ) -> Document:
        """Create test document."""
        return await service.create_document(
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

    async def test_create_document(
        self,
        service: DocumentService,
        booking: Booking,
    ) -> None:
        """Test document creation."""
        # Create document with booking
        document = await service.create_document(
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

        # Check document properties
        assert document.booking_id == booking.id
        assert document.client_id == booking.client_id
        assert document.type == DocumentType.CONTRACT
        assert document.title == 'Test Contract'
        assert document.description == 'Test contract description'
        assert document.file_path == '/test/contract.pdf'
        assert document.file_name == 'contract.pdf'
        assert document.file_size == 1024
        assert document.mime_type == 'application/pdf'
        assert document.notes == 'Test document'
        assert document.status == DocumentStatus.DRAFT

        # Create document with client_id only
        document = await service.create_document(
            booking_id=None,
            client_id=booking.client_id,
            document_type=DocumentType.PASSPORT,
            file_path='/test/passport.pdf',
            title='Test Passport',
            description='Test passport scan',
            file_name='passport.pdf',
            file_size=512,
            mime_type='application/pdf',
            notes='Test passport scan',
        )

        # Check document properties
        assert document.booking_id is None
        assert document.client_id == booking.client_id
        assert document.type == DocumentType.PASSPORT
        assert document.title == 'Test Passport'
        assert document.description == 'Test passport scan'
        assert document.file_path == '/test/passport.pdf'
        assert document.file_name == 'passport.pdf'
        assert document.file_size == 512
        assert document.mime_type == 'application/pdf'
        assert document.notes == 'Test passport scan'
        assert document.status == DocumentStatus.DRAFT

        # Test error when neither booking_id nor client_id is provided
        with pytest.raises(
            ValueError,
            match='Either booking_id or client_id must be provided',
        ):
            await service.create_document(
                booking_id=None,
                client_id=None,
                document_type=DocumentType.OTHER,
                file_path='/test/other.pdf',
                title='Test Other',
                description='Test other document',
                file_name='other.pdf',
                file_size=256,
                mime_type='application/pdf',
                notes='Test other document',
            )

        # Test error when booking is not found
        with pytest.raises(ValueError, match='Booking with ID .* not found'):
            await service.create_document(
                booking_id=999,
                document_type=DocumentType.OTHER,
                file_path='/test/other.pdf',
                title='Test Other',
                description='Test other document',
                file_name='other.pdf',
                file_size=256,
                mime_type='application/pdf',
                notes='Test other document',
            )

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
        result = await service.update_document(999, file_path='/non-existent.pdf')
        assert result is None

    async def test_change_status(
        self, service: DocumentService, document: Document
    ) -> None:
        """Test changing document status."""
        # Change status to PENDING
        updated = await service.change_status(document.id, DocumentStatus.PENDING)
        assert updated is not None
        assert updated.status == DocumentStatus.PENDING

        # Change status to APPROVED
        updated = await service.change_status(document.id, DocumentStatus.APPROVED)
        assert updated is not None
        assert updated.status == DocumentStatus.APPROVED

        # Test changing status of non-existent document
        result = await service.change_status(999, DocumentStatus.APPROVED)
        assert result is None

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

    async def test_get_by_status(
        self, service: DocumentService, document: Document
    ) -> None:
        """Test getting documents by status."""
        # Initially document is DRAFT
        documents = await service.get_by_status(DocumentStatus.DRAFT)
        assert len(documents) >= 1
        assert any(d.id == document.id for d in documents)

        # Change status to APPROVED
        await service.change_status(document.id, DocumentStatus.APPROVED)
        documents = await service.get_by_status(DocumentStatus.APPROVED)
        assert len(documents) >= 1
        assert any(d.id == document.id for d in documents)

        # Check that document is not in DRAFT anymore
        documents = await service.get_by_status(DocumentStatus.DRAFT)
        assert not any(d.id == document.id for d in documents)

    async def test_get_by_date_range(
        self, service: DocumentService, document: Document
    ) -> None:
        """Test getting documents by date range."""
        # Get documents for current month
        start_date = datetime.now(timezone.utc).replace(day=1)
        end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        documents = await service.get_by_date_range(start_date, end_date)
        assert len(documents) >= 1
        assert any(d.id == document.id for d in documents)

        # Test getting documents for future month
        future_start = start_date + timedelta(days=32)
        future_end = future_start + timedelta(days=32)

        documents = await service.get_by_date_range(future_start, future_end)
        assert not any(d.id == document.id for d in documents)
