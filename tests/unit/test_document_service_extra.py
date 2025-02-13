"""Additional unit tests for document service."""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Booking, DocumentType
from backend.services import DocumentService
from tests.conftest import async_fixture, async_test


class TestDocumentServiceExtra:
    """Additional test cases for DocumentService."""

    @async_fixture
    async def service(self, db_session: AsyncSession) -> DocumentService:
        """Create DocumentService instance."""
        return DocumentService(db_session)

    @async_test
    async def test_create_document_without_booking_client_id(
        self,
        service: DocumentService,
        booking: Booking,
    ) -> None:
        """Test document creation without booking - client ID check."""
        document = await service.create_document(
            client_id=booking.client_id,
            booking_id=None,
            document_type=DocumentType.PASSPORT,
            file_path='/test/passport.pdf',
            title='Test Passport',
            description='Test passport scan',
            file_name='passport.pdf',
            file_size=2048,
            mime_type='application/pdf',
        )
        assert document.client_id == booking.client_id

    @async_test
    async def test_create_document_without_booking_null_booking(
        self,
        service: DocumentService,
        booking: Booking,
    ) -> None:
        """Test document creation without booking - null booking check."""
        document = await service.create_document(
            client_id=booking.client_id,
            booking_id=None,
            document_type=DocumentType.PASSPORT,
            file_path='/test/passport.pdf',
            title='Test Passport',
            description='Test passport scan',
            file_name='passport.pdf',
            file_size=2048,
            mime_type='application/pdf',
        )
        assert document.booking_id is None

    @async_test
    async def test_create_document_without_booking_type(
        self,
        service: DocumentService,
        booking: Booking,
    ) -> None:
        """Test document creation without booking - document type check."""
        document = await service.create_document(
            client_id=booking.client_id,
            booking_id=None,
            document_type=DocumentType.PASSPORT,
            file_path='/test/passport.pdf',
            title='Test Passport',
            description='Test passport scan',
            file_name='passport.pdf',
            file_size=2048,
            mime_type='application/pdf',
        )
        assert document.type == DocumentType.PASSPORT
