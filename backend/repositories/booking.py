"""Booking repository module.

This module provides database operations for managing equipment bookings,
including creating, retrieving, updating, and canceling rental records.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.booking import Booking, BookingStatus, PaymentStatus
from backend.repositories.base import BaseRepository


class BookingRepository(BaseRepository[Booking]):
    """Repository for managing bookings."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            session: SQLAlchemy async session
        """
        super().__init__(session, Booking)

    async def check_availability(
        self,
        equipment_id: int,
        start_date: datetime,
        end_date: datetime,
        exclude_booking_id: Optional[int] = None,
    ) -> bool:
        """Check if equipment is available for the specified period.

        Args:
            equipment_id: Equipment ID
            start_date: Start date
            end_date: End date
            exclude_booking_id: Booking ID to exclude from check (optional)

        Returns:
            True if equipment is available, False otherwise
        """
        query = select(Booking).where(
            and_(
                Booking.equipment_id == equipment_id,
                Booking.booking_status.in_(
                    [
                        BookingStatus.PENDING,
                        BookingStatus.CONFIRMED,
                        BookingStatus.ACTIVE,
                    ]
                ),
                or_(
                    and_(
                        Booking.start_date <= end_date,
                        Booking.end_date >= start_date,
                    ),
                    and_(
                        Booking.start_date >= start_date,
                        Booking.end_date <= end_date,
                    ),
                ),
            )
        )

        if exclude_booking_id:
            query = query.where(Booking.id != exclude_booking_id)

        result = await self.session.execute(query)
        return not bool(result.scalar_one_or_none())

    async def get_by_client(self, client_id: int) -> List[Booking]:
        """Get bookings by client.

        Args:
            client_id: Client ID

        Returns:
            List of client's bookings
        """
        result = await self.session.execute(
            select(Booking).where(Booking.client_id == client_id)
        )
        return list(result.scalars().all())

    async def get_by_equipment(self, equipment_id: int) -> List[Booking]:
        """Get bookings by equipment.

        Args:
            equipment_id: Equipment ID

        Returns:
            List of equipment's bookings
        """
        result = await self.session.execute(
            select(Booking).where(Booking.equipment_id == equipment_id)
        )
        return list(result.scalars().all())

    async def get_active_for_period(
        self, start_date: datetime, end_date: datetime
    ) -> List[Booking]:
        """Get active bookings for period.

        Args:
            start_date: Period start date
            end_date: Period end date

        Returns:
            List of active bookings for period
        """
        result = await self.session.execute(
            select(Booking).where(
                and_(
                    Booking.booking_status == BookingStatus.ACTIVE,
                    Booking.start_date <= end_date,
                    Booking.end_date >= start_date,
                )
            )
        )
        return list(result.scalars().all())

    async def get_by_status(self, status: BookingStatus) -> List[Booking]:
        """Get bookings by status.

        Args:
            status: Booking status

        Returns:
            List of bookings with specified status
        """
        result = await self.session.execute(
            select(Booking).where(Booking.booking_status == status)
        )
        return list(result.scalars().all())

    async def get_by_payment_status(self, status: PaymentStatus) -> List[Booking]:
        """Get bookings by payment status.

        Args:
            status: Payment status

        Returns:
            List of bookings with specified payment status
        """
        result = await self.session.execute(
            select(Booking).where(Booking.payment_status == status)
        )
        return list(result.scalars().all())

    async def get_overdue(self, now: datetime) -> List[Booking]:
        """Get overdue bookings.

        Args:
            now: Current datetime

        Returns:
            List of overdue bookings
        """
        result = await self.session.execute(
            select(Booking).where(
                and_(
                    Booking.booking_status == BookingStatus.ACTIVE,
                    Booking.end_date < now,
                )
            )
        )
        return list(result.scalars().all())
