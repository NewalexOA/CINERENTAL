"""Client repository module.

This module provides database operations for managing client records,
including registration, profile updates, and rental history tracking.
"""

from datetime import datetime, timezone
from typing import Any, List, Optional, Tuple

from sqlalchemy import and_, asc, desc, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

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

    def _apply_sorting(self, stmt: Select, sort_by: str, sort_order: str) -> Select:
        """Applies sorting to a SQLAlchemy query."""
        order_func = desc if sort_order.lower() == 'desc' else asc

        if sort_by == 'name':
            stmt = stmt.order_by(order_func(self.model.name))
        elif sort_by == 'created_at':
            stmt = stmt.order_by(order_func(self.model.created_at))
        elif sort_by == 'bookings_count':
            # Sort by the computed label using text()
            stmt = stmt.order_by(order_func(text('bookings_count')))
        # Add other sortable fields if needed
        # else: log warning about invalid sort_by field?

        return stmt

    def _create_base_query(self, include_deleted: bool = False) -> Select:
        """Creates base query with bookings count.

        Args:
            include_deleted: Whether to include deleted clients

        Returns:
            SQLAlchemy select statement with bookings count
        """
        # Select Client model and count bookings using a subquery
        bookings_sub = (
            select(Booking.client_id, func.count(Booking.id).label('bookings_count'))
            .group_by(Booking.client_id)
            .subquery()
        )

        stmt = select(
            self.model,
            func.coalesce(bookings_sub.c.bookings_count, 0).label('bookings_count'),
        ).outerjoin(bookings_sub, self.model.id == bookings_sub.c.client_id)

        if not include_deleted:
            stmt = stmt.where(self.model.deleted_at.is_(None))

        return stmt

    async def _process_query_results(self, result: Any) -> List[Client]:
        """Process query results and add bookings_count to client instances.

        Args:
            result: SQLAlchemy query result

        Returns:
            List of Client instances with bookings_count attribute
        """
        rows = result.all()
        clients = []
        for row in rows:
            client = row[0]
            client.bookings_count = row[1]  # Add bookings_count as dynamic attribute
            clients.append(client)
        return clients

    async def get_all(
        self,
        sort_by: Optional[str] = 'name',
        sort_order: Optional[str] = 'asc',
        include_deleted: bool = False,
    ) -> List[Client]:
        """Get all clients, optionally sorted and including deleted.

        Overrides BaseRepository.get_all to add sorting logic.
        """
        stmt = self._create_base_query(include_deleted)

        # Apply sorting using helper
        if sort_by and sort_order:
            stmt = self._apply_sorting(stmt, sort_by, sort_order)

        result = await self.session.execute(stmt)
        return await self._process_query_results(result)

    async def search(
        self,
        query_str: str,
        sort_by: Optional[str] = 'name',
        sort_order: Optional[str] = 'asc',
        include_deleted: bool = False,
    ) -> List[Client]:
        """Search clients by name, email or phone, optionally sorted.

        Overrides BaseRepository.search to implement search logic with sorting.
        """
        query = query_str.lower()
        stmt = self._create_base_query(include_deleted)

        # Apply search filters
        stmt = stmt.where(
            or_(
                func.lower(self.model.name).contains(query),
                func.lower(self.model.email).contains(query),
                func.lower(self.model.phone).contains(query),
            )
        )

        # Apply sorting using helper
        if sort_by and sort_order:
            stmt = self._apply_sorting(stmt, sort_by, sort_order)

        result = await self.session.execute(stmt)
        return await self._process_query_results(result)

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
