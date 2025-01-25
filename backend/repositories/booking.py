"""Booking repository module.

This module provides database operations for managing equipment bookings,
including creating, retrieving, updating, and canceling rental records.
"""

from datetime import datetime
from typing import List

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from backend.models.booking import Booking, BookingStatus, PaymentStatus
from backend.repositories.base import BaseRepository


class BookingRepository(BaseRepository[Booking]):
    """Repository for bookings."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            session: SQLAlchemy async session
        """
        super().__init__(Booking, session)

    async def get_by_client(self, client_id: int) -> List[Booking]:
        """Get all bookings for a client.

        Args:
            client_id: Client ID

        Returns:
            List of bookings
        """
        query: Select = select(self.model).where(self.model.client_id == client_id)
        result = await self.session.scalars(query)
        return list(result.all())

    async def get_by_equipment(self, equipment_id: int) -> List[Booking]:
        """Get all bookings for an equipment.

        Args:
            equipment_id: Equipment ID

        Returns:
            List of bookings
        """
        query: Select = select(self.model).where(
            self.model.equipment_id == equipment_id
        )
        result = await self.session.scalars(query)
        return list(result.all())

    async def get_active_for_period(
        self, start_date: datetime, end_date: datetime
    ) -> List[Booking]:
        """Get active bookings for a period.

        Args:
            start_date: Period start date
            end_date: Period end date

        Returns:
            List of active bookings
        """
        query: Select = select(self.model).where(
            and_(
                self.model.start_date <= end_date,
                self.model.end_date >= start_date,
                self.model.booking_status == BookingStatus.ACTIVE,
            )
        )
        result = await self.session.scalars(query)
        return list(result.all())

    async def get_by_status(self, status: BookingStatus) -> List[Booking]:
        """Get bookings by status.

        Args:
            status: Booking status

        Returns:
            List of bookings
        """
        query: Select = select(self.model).where(self.model.booking_status == status)
        result = await self.session.scalars(query)
        return list(result.all())

    async def get_by_payment_status(self, status: PaymentStatus) -> List[Booking]:
        """Get bookings by payment status.

        Args:
            status: Payment status

        Returns:
            List of bookings
        """
        query: Select = select(self.model).where(self.model.payment_status == status)
        result = await self.session.scalars(query)
        return list(result.all())

    async def get_overdue(self) -> List[Booking]:
        """Get overdue bookings.

        Returns:
            List of overdue bookings
        """
        current_time = datetime.now()
        query: Select = select(self.model).where(
            and_(
                self.model.end_date < current_time,
                self.model.booking_status == BookingStatus.ACTIVE,
            )
        )
        result = await self.session.scalars(query)
        return list(result.all())

    async def check_availability(
        self, equipment_id: int, start_date: datetime, end_date: datetime
    ) -> bool:
        """Check if equipment is available for booking.

        Args:
            equipment_id: Equipment ID
            start_date: Booking start date
            end_date: Booking end date

        Returns:
            True if equipment is available, False otherwise
        """
        query: Select = select(self.model).where(
            and_(
                self.model.equipment_id == equipment_id,
                self.model.start_date < end_date,
                self.model.end_date > start_date,
                self.model.booking_status != BookingStatus.CANCELLED,
            )
        )
        result = await self.session.scalar(query)
        return result is None
