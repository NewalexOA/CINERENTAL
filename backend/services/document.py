"""Document service module.

This module implements business logic for managing rental documents,
including contracts, handover acts, and other related documents.
"""

from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import NotFoundError, StatusTransitionError
from backend.models import Booking, Document, DocumentStatus, DocumentType
from backend.repositories import DocumentRepository


class DocumentService:
    """Service for managing rental documents."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize service.

        Args:
            session: SQLAlchemy async session
        """
        self.session = session
        self.repository = DocumentRepository(session)

    async def create_document(
        self,
        client_id: int,
        booking_id: Optional[int],
        document_type: DocumentType,
        file_path: str,
        title: str,
        description: str,
        file_name: str,
        file_size: int,
        mime_type: str,
        notes: Optional[str] = None,
    ) -> Document:
        """Create new document.

        Args:
            client_id: Client ID
            booking_id: Booking ID (optional)
            document_type: Document type
            file_path: Path to document file
            title: Document title
            description: Document description
            file_name: Document file name
            file_size: Document file size
            mime_type: Document MIME type
            notes: Additional notes (optional)

        Returns:
            Created document

        Raises:
            NotFoundError: If booking not found
            DocumentError: If document creation fails
        """
        # Check if booking exists
        if booking_id is not None:
            booking = await self.session.get(Booking, booking_id)
            if not booking:
                raise NotFoundError(
                    f'Booking with ID {booking_id} not found',
                    {'booking_id': booking_id},
                )

        document = Document(
            client_id=client_id,
            booking_id=booking_id,
            type=document_type,
            file_path=file_path,
            title=title,
            description=description,
            file_name=file_name,
            file_size=file_size,
            mime_type=mime_type,
            notes=notes,
            status=DocumentStatus.DRAFT,
            created_at=datetime.now(),
        )
        return await self.repository.create(document)

    async def update_document(
        self,
        document_id: int,
        file_path: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Document:
        """Update document details.

        Args:
            document_id: Document ID
            file_path: New file path (optional)
            notes: New notes (optional)

        Returns:
            Updated document

        Raises:
            NotFoundError: If document not found
            DocumentError: If document update fails
        """
        # Get document
        document = await self.repository.get(document_id)
        if not document:
            raise NotFoundError(
                f'Document with ID {document_id} not found',
                {'document_id': document_id},
            )

        # Update fields
        if file_path is not None:
            document.file_path = file_path
        if notes is not None:
            document.notes = notes

        return await self.repository.update(document)

    async def change_status(
        self,
        document_id: int,
        status: DocumentStatus,
    ) -> Document:
        """Change document status.

        Args:
            document_id: Document ID
            status: New status

        Returns:
            Updated document

        Raises:
            NotFoundError: If document not found
            StatusTransitionError: If status transition not allowed
        """
        # Get document
        document = await self.repository.get(document_id)
        if not document:
            raise NotFoundError(
                f'Document with ID {document_id} not found',
                {'document_id': document_id},
            )

        # Check if status transition is allowed
        allowed_transitions: Dict[DocumentStatus, List[DocumentStatus]] = {
            DocumentStatus.DRAFT: [
                DocumentStatus.PENDING,
                DocumentStatus.UNDER_REVIEW,
            ],
            DocumentStatus.PENDING: [
                DocumentStatus.UNDER_REVIEW,
                DocumentStatus.APPROVED,
                DocumentStatus.REJECTED,
            ],
            DocumentStatus.UNDER_REVIEW: [
                DocumentStatus.APPROVED,
                DocumentStatus.REJECTED,
            ],
            DocumentStatus.APPROVED: [],
            DocumentStatus.REJECTED: [DocumentStatus.PENDING],
        }

        if status not in allowed_transitions[document.status]:
            raise StatusTransitionError(
                f'Invalid status transition from {document.status} to {status}',
                current_status=str(document.status),
                new_status=str(status),
                allowed_transitions=[
                    str(s) for s in allowed_transitions[document.status]
                ],
            )

        # Update status
        document.status = status
        return await self.repository.update(document)

    async def get_documents(self) -> List[Document]:
        """Get all documents.

        Returns:
            List of all documents
        """
        return await self.repository.get_all()

    async def get_document(self, document_id: int) -> Optional[Document]:
        """Get document by ID.

        Args:
            document_id: Document ID

        Returns:
            Document if found, None otherwise
        """
        return await self.repository.get(document_id)

    async def get_by_booking(self, booking_id: int) -> List[Document]:
        """Get all documents for a booking.

        Args:
            booking_id: Booking ID

        Returns:
            List of booking's documents
        """
        return await self.repository.get_by_booking(booking_id)

    async def get_by_type(self, document_type: DocumentType) -> List[Document]:
        """Get documents by type.

        Args:
            document_type: Document type

        Returns:
            List of documents with specified type
        """
        return await self.repository.get_by_type(document_type)

    async def get_by_status(self, status: DocumentStatus) -> List[Document]:
        """Get documents by status.

        Args:
            status: Document status

        Returns:
            List of documents with specified status
        """
        return await self.repository.get_by_status(status)

    async def get_by_date_range(
        self, start_date: datetime, end_date: datetime
    ) -> List[Document]:
        """Get documents created within date range.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            List of documents created within specified date range
        """
        return await self.repository.get_by_date_range(start_date, end_date)

    async def search(
        self,
        query_str: str,
        include_deleted: bool = False,
    ) -> List[Document]:
        """Search documents by title or description.

        Args:
            query_str: Search query string
            include_deleted: Whether to include deleted documents

        Returns:
            List of matching documents
        """
        return await self.repository.search(query_str, include_deleted=include_deleted)
