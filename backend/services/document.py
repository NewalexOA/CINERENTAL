"""Document service module.

This module implements business logic for managing rental documents,
including contracts, handover acts, and other related documents.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.booking import Booking
from backend.models.document import Document, DocumentStatus, DocumentType
from backend.repositories.document import DocumentRepository


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
        booking_id: Optional[int],
        document_type: DocumentType,
        file_path: str,
        title: str,
        description: Optional[str],
        file_name: str,
        file_size: int,
        mime_type: str,
        notes: Optional[str] = None,
        client_id: Optional[int] = None,
    ) -> Document:
        """Create new document.

        Args:
            booking_id: Related booking ID (optional)
            document_type: Type of document
            file_path: Path to document file
            title: Document title
            description: Document description (optional)
            file_name: Original file name
            file_size: File size in bytes
            mime_type: File MIME type
            notes: Additional notes (optional)
            client_id: Client ID (optional, will be taken from booking if not provided)

        Returns:
            Created document

        Raises:
            ValueError: If neither booking_id nor client_id is provided
        """
        if booking_id is not None:
            booking = await self.session.get(Booking, booking_id)
            if booking is None:
                raise ValueError(f'Booking with ID {booking_id} not found')
            client_id = booking.client_id
        elif client_id is None:
            raise ValueError('Either booking_id or client_id must be provided')

        return await self.repository.create(
            booking_id=booking_id,
            client_id=client_id,
            type=document_type,
            file_path=file_path,
            title=title,
            description=description,
            file_name=file_name,
            file_size=file_size,
            mime_type=mime_type,
            created_at=datetime.now(timezone.utc),
            notes=notes,
            status=DocumentStatus.DRAFT,
        )

    async def update_document(
        self,
        document_id: int,
        file_path: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Optional[Document]:
        """Update document details.

        Args:
            document_id: Document ID
            file_path: New file path (optional)
            notes: New notes (optional)

        Returns:
            Updated document if found, None otherwise
        """
        update_data: Dict[str, Any] = {}
        if file_path is not None:
            update_data['file_path'] = file_path
        if notes is not None:
            update_data['notes'] = notes

        if update_data:
            return await self.repository.update(document_id, **update_data)
        return await self.repository.get(document_id)

    async def change_status(
        self, document_id: int, status: DocumentStatus
    ) -> Optional[Document]:
        """Change document status.

        Args:
            document_id: Document ID
            status: New status

        Returns:
            Updated document if found, None otherwise
        """
        return await self.repository.update(document_id, status=status)

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
