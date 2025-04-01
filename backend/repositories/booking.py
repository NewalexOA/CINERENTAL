"""Booking repository module.

This module provides database operations for managing equipment bookings,
including creating, retrieving, updating, and canceling rental records.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from backend.models import Booking, BookingStatus, Equipment, PaymentStatus
from backend.repositories import BaseRepository


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
        """Get all bookings for client.

        Args:
            client_id: Client ID

        Returns:
            List of bookings
        """
        stmt = select(self.model).where(self.model.client_id == client_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_active_by_client(self, client_id: int) -> List[Booking]:
        """Get active bookings for client.

        Args:
            client_id: Client ID

        Returns:
            List of active bookings
        """
        stmt = select(self.model).where(
            self.model.client_id == client_id,
            self.model.booking_status.in_(
                [
                    BookingStatus.PENDING,
                    BookingStatus.CONFIRMED,
                    BookingStatus.ACTIVE,
                    BookingStatus.OVERDUE,
                ]
            ),
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_equipment(self, equipment_id: int) -> List[Booking]:
        """Get all bookings for equipment.

        Args:
            equipment_id: Equipment ID

        Returns:
            List of bookings
        """
        stmt = select(self.model).where(self.model.equipment_id == equipment_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_active_by_equipment(self, equipment_id: int) -> List[Booking]:
        """Get active bookings for equipment.

        Args:
            equipment_id: Equipment ID

        Returns:
            List of active bookings
        """
        stmt = select(self.model).where(
            self.model.equipment_id == equipment_id,
            self.model.booking_status.in_(
                [
                    BookingStatus.PENDING,
                    BookingStatus.CONFIRMED,
                    BookingStatus.ACTIVE,
                    BookingStatus.OVERDUE,
                ]
            ),
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_overlapping(
        self, equipment_id: int, start_date: datetime, end_date: datetime
    ) -> List[Booking]:
        """Get overlapping bookings for equipment.

        Args:
            equipment_id: Equipment ID
            start_date: Start date
            end_date: End date

        Returns:
            List of overlapping bookings
        """
        stmt = select(self.model).where(
            self.model.equipment_id == equipment_id,
            self.model.booking_status.in_(
                [
                    BookingStatus.PENDING,
                    BookingStatus.CONFIRMED,
                    BookingStatus.ACTIVE,
                    BookingStatus.OVERDUE,
                ]
            ),
            or_(
                and_(
                    self.model.start_date <= start_date,
                    self.model.end_date > start_date,
                ),
                and_(
                    self.model.start_date < end_date,
                    self.model.end_date >= end_date,
                ),
                and_(
                    self.model.start_date >= start_date,
                    self.model.end_date <= end_date,
                ),
            ),
        )
        result = await self.session.execute(stmt)
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

    async def get_all(self) -> List[Booking]:
        """Get all bookings with related objects.

        Overrides the base method to include related objects.

        Returns:
            List of all bookings that are not marked as deleted
        """
        stmt = (
            select(self.model)
            .options(
                joinedload(self.model.client),
                joinedload(self.model.equipment),
                joinedload(self.model.project),
            )
            .where(self.model.deleted_at.is_(None))
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_with_relations(self, booking_id: int) -> Optional[Booking]:
        """Get booking with related data.

        Args:
            booking_id: Booking ID

        Returns:
            Booking with equipment and client or None if not found
        """
        query = (
            select(Booking)
            .where(Booking.id == booking_id)
            .options(
                joinedload(Booking.equipment).joinedload(Equipment.category),
                joinedload(Booking.client),
                joinedload(Booking.project),
            )
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_equipment_for_booking(self, booking_id: int) -> dict:
        """Get equipment information for a booking.

        Args:
            booking_id: Booking ID

        Returns:
            Equipment information as a dictionary
        """
        booking = await self.get_with_relations(booking_id)
        if booking is None or booking.equipment is None:
            return {}

        category_name = 'Не указана'
        category_id = None

        # Safe category retrieval
        has_category = hasattr(booking.equipment, 'category')
        if has_category and booking.equipment.category is not None:
            category_name = booking.equipment.category.name
            category_id = booking.equipment.category.id

        return {
            'id': booking.equipment.id,
            'name': booking.equipment.name,
            'category_id': category_id,
            'category': category_name,
            'replacement_cost': booking.equipment.replacement_cost,
            'serial_number': booking.equipment.serial_number,
        }
