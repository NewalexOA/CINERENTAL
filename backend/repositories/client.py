"""Client repository module.

This module provides database operations for managing client records,
including registration, profile updates, and rental history tracking.
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select, func

from backend.models import Booking, BookingStatus, Client, ClientStatus
from backend.repositories import BaseRepository


class ClientRepository(BaseRepository[Client]):
    """Repository for clients."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            session: SQLAlchemy async session
        """
        super().__init__(session, Client)

    async def get_by_email(self, email: str) -> Optional[Client]:
        """Get client by email.

        Args:
            email: Client email

        Returns:
            Client if found, None otherwise
        """
        query = select(self.model).where(self.model.email == email)
        result = await self.session.scalar(query)  # type: Optional[Client]
        return result

    async def get_by_phone(self, phone: str) -> Optional[Client]:
        """Get client by phone number.

        Args:
            phone: Client phone number

        Returns:
            Client if found, None otherwise
        """
        query = select(self.model).where(self.model.phone == phone)
        result = await self.session.scalar(query)  # type: Optional[Client]
        return result

    async def search(
        self,
        query_str: str,
        include_deleted: bool = False,
    ) -> List[Client]:
        """Search clients by name, email or phone.

        Args:
            query_str: Search query string
            include_deleted: Whether to include deleted clients

        Returns:
            List of matching clients
        """
        query = query_str.lower()
        stmt: Select[Tuple[Client]] = select(self.model).where(
            or_(
                func.lower(self.model.first_name).contains(query),
                func.lower(self.model.last_name).contains(query),
                func.lower(self.model.email).contains(query),
                func.lower(self.model.phone).contains(query),
            )
        )
        if not include_deleted:
            stmt = stmt.where(self.model.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_with_active_bookings(self, client_id: int) -> Optional[Client]:
        """Get client with active bookings.

        Args:
            client_id: Client ID

        Returns:
            Client with active bookings if found, None otherwise
        """
        query = (
            select(self.model)
            .where(self.model.id == client_id)
            .join(self.model.bookings)
            .where(Booking.booking_status == BookingStatus.ACTIVE)
        )
        result = await self.session.scalar(query)  # type: Optional[Client]
        return result

    async def get_with_overdue_bookings(self) -> List[Client]:
        """Get clients with overdue bookings.

        Returns:
            List of clients with overdue bookings
        """
        now = datetime.now(timezone.utc)
        query: Select[Tuple[Client]] = (
            select(self.model)
            .join(self.model.bookings)
            .where(
                and_(
                    Booking.booking_status == BookingStatus.ACTIVE,
                    Booking.end_date < now,
                )
            )
            .distinct()
        )
        result = await self.session.scalars(query)
        return list(result.all())

    async def get_by_status(self, status: ClientStatus) -> List[Client]:
        """Get clients by status.

        Args:
            status: Client status

        Returns:
            List of clients with specified status
        """
        query: Select[Tuple[Client]] = select(self.model).where(
            self.model.status == status
        )
        result = await self.session.scalars(query)
        return list(result.all())
