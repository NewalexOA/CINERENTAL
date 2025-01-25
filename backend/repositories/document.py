"""Document repository module.

This module provides database operations for managing rental documents,
including storing, retrieving, and organizing contracts, invoices,
and other rental-related files.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from backend.models.document import Document, DocumentType
from backend.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    """Repository for documents."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            session: SQLAlchemy async session
        """
        super().__init__(Document, session)

    async def get_by_booking(self, booking_id: int) -> List[Document]:
        """Get all documents for a booking.

        Args:
            booking_id: Booking ID

        Returns:
            List of documents
        """
        query: Select = select(self.model).where(self.model.booking_id == booking_id)
        result = await self.session.scalars(query)
        return list(result.all())

    async def get_by_client(self, client_id: int) -> List[Document]:
        """Get all documents for a client.

        Args:
            client_id: Client ID

        Returns:
            List of documents
        """
        query: Select = select(self.model).where(self.model.client_id == client_id)
        result = await self.session.scalars(query)
        return list(result.all())

    async def get_by_type(
        self,
        document_type: DocumentType,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Document]:
        """Get documents by type and optional date range.

        Args:
            document_type: Document type
            start_date: Optional start date
            end_date: Optional end date

        Returns:
            List of documents
        """
        conditions = [self.model.type == document_type]
        if start_date:
            conditions.append(self.model.created_at >= start_date)
        if end_date:
            conditions.append(self.model.created_at <= end_date)

        query: Select = select(self.model).where(and_(*conditions))
        result = await self.session.scalars(query)
        return list(result.all())

    async def search(self, query_str: str) -> List[Document]:
        """Search documents by title or description.

        Args:
            query_str: Search query

        Returns:
            List of matching documents
        """
        query: Select = select(self.model).where(
            or_(
                self.model.title.ilike(f'%{query_str}%'),
                self.model.description.ilike(f'%{query_str}%'),
            )
        )
        result = await self.session.scalars(query)
        return list(result.all())
