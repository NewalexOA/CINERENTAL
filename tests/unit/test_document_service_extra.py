"""Additional unit tests for document service."""

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Client, DocumentStatus, DocumentType
from backend.services import DocumentService
from tests.conftest import async_fixture, async_test


@dataclass
class TestCase:
    """Test case data structure."""

    doc_type: DocumentType
    path: str
    title: str
    description: str
    file_name: str
    notes: str


class TestDocumentServiceExtra:
    """Additional test cases for DocumentService."""

    @async_fixture
    async def service(self, db_session: AsyncSession) -> DocumentService:
        """Create DocumentService instance."""
        return DocumentService(db_session)

    @async_test
    async def test_create_document_without_booking(
        self,
        document_service: DocumentService,
        test_client: Client,
    ) -> None:
        """Test creating document without booking."""
        # Define test cases
        test_cases = [
            TestCase(
                doc_type=DocumentType.CONTRACT,
                path='/test/contract.pdf',
                title='Test Contract',
                description='Test contract description',
                file_name='contract.pdf',
                notes='Test contract',
            ),
            TestCase(
                doc_type=DocumentType.INVOICE,
                path='/test/invoice.pdf',
                title='Test Invoice',
                description='Test invoice description',
                file_name='invoice.pdf',
                notes='Test invoice',
            ),
        ]

        for case in test_cases:
            # Create document
            document = await document_service.create_document(
                client_id=test_client.id,
                booking_id=None,
                document_type=case.doc_type,
                file_path=case.path,
                title=case.title,
                description=case.description,
                file_name=case.file_name,
                file_size=1024,
                mime_type='application/pdf',
                notes=case.notes,
            )

            # Basic assertions
            assert document.client_id == test_client.id
            assert document.booking_id is None
            assert document.type == case.doc_type
            assert document.status == DocumentStatus.DRAFT

            # File-related assertions
            assert document.file_path == case.path
            assert document.title == case.title
            assert document.description == case.description
            assert document.file_name == case.file_name
