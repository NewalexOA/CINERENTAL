"""Booking repository module.

This module provides database operations for managing equipment bookings,
including creating, retrieving, updating, and canceling rental records.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

# Keep Project import as it's used in joinedload
from backend.models import Project  # noqa: F401
from backend.models import Booking, BookingStatus, Client, Equipment, PaymentStatus
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
        # Check for conflicting bookings in relevant statuses
        conflicting_statuses = [
            BookingStatus.CONFIRMED,
            BookingStatus.ACTIVE,
            BookingStatus.OVERDUE,
        ]
        # Query explanation:
        # Find any booking for the given equipment_id
        # that is in a conflicting status
        # AND overlaps with the requested [start_date, end_date] period.
        # Overlap condition: (ExistingStart <= ReqEnd) AND (ExistingEnd >= ReqStart)
        query = select(Booking.id).where(
            Booking.equipment_id == equipment_id,
            Booking.booking_status.in_(conflicting_statuses),
            Booking.start_date <= end_date,  # Existing starts before or when Req ends
            Booking.end_date >= start_date,  # Existing ends after or when Req starts
        )

        if exclude_booking_id:
            query = query.where(Booking.id != exclude_booking_id)

        # Limit 1 because we only need to know if *any* conflict exists
        query = query.limit(1)

        result = await self.session.execute(query)
        # If any row is returned, it means there is a conflict (not available)
        return result.scalar_one_or_none() is None

    async def get_by_client(self, client_id: int) -> List[Booking]:
        """Get all bookings for client.

        Args:
            client_id: Client ID

        Returns:
            List of bookings
        """
        stmt = (
            select(self.model)
            .where(self.model.client_id == client_id)
            .options(
                joinedload(self.model.equipment),
                joinedload(self.model.project),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_active_by_client(self, client_id: int) -> List[Booking]:
        """Get active bookings for client.

        Active means bookings that are PENDING, CONFIRMED, ACTIVE, or OVERDUE.

        Args:
            client_id: Client ID

        Returns:
            List of active bookings
        """
        active_statuses = [
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.ACTIVE,
            BookingStatus.OVERDUE,
        ]
        stmt = (
            select(self.model)
            .where(
                self.model.client_id == client_id,
                self.model.booking_status.in_(active_statuses),
            )
            .options(
                joinedload(self.model.equipment),
                joinedload(self.model.project),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_by_equipment(self, equipment_id: int) -> List[Booking]:
        """Get all bookings for equipment.

        Args:
            equipment_id: Equipment ID

        Returns:
            List of bookings
        """
        stmt = (
            select(self.model)
            .where(self.model.equipment_id == equipment_id)
            .options(
                joinedload(self.model.client),
                joinedload(self.model.project),
                joinedload(self.model.equipment),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_active_by_equipment(self, equipment_id: int) -> List[Booking]:
        """Get active bookings for equipment.

        Active means bookings that are PENDING, CONFIRMED, ACTIVE, or OVERDUE.

        Args:
            equipment_id: Equipment ID

        Returns:
            List of active bookings
        """
        active_statuses = [
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.ACTIVE,
            BookingStatus.OVERDUE,
        ]
        stmt = (
            select(self.model)
            .where(
                self.model.equipment_id == equipment_id,
                self.model.booking_status.in_(active_statuses),
            )
            .options(
                joinedload(self.model.client),
                joinedload(self.model.project),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_overlapping_bookings(
        self,
        equipment_id: int,
        start_date: datetime,
        end_date: datetime,
        exclude_booking_id: Optional[int] = None,
    ) -> List[Booking]:
        """Get bookings for equipment that overlap with a given time period.

        Args:
            equipment_id: Equipment ID
            start_date: Start date of the period
            end_date: End date of the period
            exclude_booking_id: Booking ID to exclude from the check (optional)

        Returns:
            List of overlapping bookings
        """
        # Bookings considered conflicting if they are in these statuses
        conflicting_statuses = [
            BookingStatus.CONFIRMED,
            BookingStatus.ACTIVE,
            BookingStatus.OVERDUE,
        ]

        # Overlap condition: A booking overlaps if its period intersects
        # with the [start_date, end_date] interval.
        # (ExistingStart <= ReqEnd) AND (ExistingEnd >= ReqStart)
        stmt = select(self.model).where(
            self.model.equipment_id == equipment_id,
            self.model.booking_status.in_(conflicting_statuses),
            self.model.start_date <= end_date,
            self.model.end_date >= start_date,
        )

        if exclude_booking_id:
            stmt = stmt.where(self.model.id != exclude_booking_id)

        # Load relations for context
        stmt = stmt.options(
            joinedload(self.model.client),
            joinedload(self.model.project),
        )

        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_active_for_period(
        self, start_date: datetime, end_date: datetime
    ) -> List[Booking]:
        """Get bookings that are ACTIVE during any part of the specified period.

        Args:
            start_date: Period start date
            end_date: Period end date

        Returns:
            List of active bookings overlapping the period
        """
        # Overlap condition: (ExistingStart <= PeriodEnd)
        # AND (ExistingEnd >= PeriodStart)
        stmt = (
            select(Booking)
            .where(
                Booking.booking_status == BookingStatus.ACTIVE,
                Booking.start_date <= end_date,
                Booking.end_date >= start_date,
            )
            .options(
                joinedload(Booking.client),
                joinedload(Booking.equipment),
                joinedload(Booking.project),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_by_status(self, status: BookingStatus) -> List[Booking]:
        """Get bookings by status.

        Args:
            status: Booking status

        Returns:
            List of bookings with specified status
        """
        stmt = (
            select(Booking)
            .where(Booking.booking_status == status)
            .options(
                joinedload(Booking.client),
                joinedload(Booking.equipment),
                joinedload(Booking.project),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_by_payment_status(self, status: PaymentStatus) -> List[Booking]:
        """Get bookings by payment status.

        Args:
            status: Payment status

        Returns:
            List of bookings with specified payment status
        """
        stmt = (
            select(Booking)
            .where(Booking.payment_status == status)
            .options(
                joinedload(Booking.client),
                joinedload(Booking.equipment),
                joinedload(Booking.project),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_overdue(self, now: datetime) -> List[Booking]:
        """Get bookings overdue (status ACTIVE/CONFIRMED, end_date past).

        Args:
            now: Current datetime

        Returns:
            List of overdue bookings
        """
        # Status should ideally be OVERDUE, but we can also find potential ones
        # that haven't been updated yet.
        potential_overdue_statuses = [BookingStatus.ACTIVE, BookingStatus.CONFIRMED]
        stmt = (
            select(Booking)
            .where(
                Booking.booking_status.in_(potential_overdue_statuses),
                Booking.end_date < now,
            )
            .options(
                joinedload(Booking.client),
                joinedload(Booking.equipment),
                joinedload(Booking.project),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_by_date_range(
        self, start_date: datetime, end_date: datetime
    ) -> List[Booking]:
        """Get bookings overlapping with a specific date range.

        Args:
            start_date: Range start date.
            end_date: Range end date.

        Returns:
            List of bookings within the range.
        """
        # Overlap condition: (ExistingStart <= RangeEnd) AND (ExistingEnd >= RangeStart)
        stmt = (
            select(Booking)
            .where(Booking.start_date <= end_date, Booking.end_date >= start_date)
            .options(
                joinedload(Booking.client),
                joinedload(Booking.equipment),
                joinedload(Booking.project),
            )
            .order_by(Booking.start_date)
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_all(
        self, skip: int = 0, limit: int = 100, include_deleted: bool = False
    ) -> List[Booking]:
        """Get all bookings with pagination and optional deleted.

        Args:
            skip: Number of records to skip.
            limit: Maximum number of records to return.
            include_deleted: Whether to include soft-deleted records.

        Returns:
            List of bookings.
        """
        stmt = (
            select(self.model)
            .options(
                joinedload(self.model.client),
                joinedload(self.model.equipment),
                joinedload(self.model.project),
            )
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        if not include_deleted:
            stmt = stmt.where(self.model.deleted_at.is_(None))

        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_with_relations(self, booking_id: int) -> Optional[Booking]:
        """Get booking by ID with related client, equipment, project loaded.

        Args:
            booking_id: Booking ID

        Returns:
            Booking instance with relations loaded, or None if not found.
        """
        stmt = (
            select(self.model)
            .where(self.model.id == booking_id)
            .options(
                joinedload(self.model.client),
                joinedload(self.model.equipment),
                joinedload(self.model.project),
            )
        )
        result = await self.session.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def get_equipment_for_booking(self, booking_id: int) -> Optional[Equipment]:
        """Get the equipment associated with a booking.

        Args:
            booking_id: The ID of the booking.

        Returns:
            The Equipment object or None if not found.
        """
        # Select the Equipment model
        # Join from Booking to Equipment using the foreign key
        # Filter where Booking.id matches the provided booking_id
        stmt = (
            select(Equipment)
            .join(Booking, Booking.equipment_id == Equipment.id)
            .where(Booking.id == booking_id)
        )

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_filtered(
        self,
        query: Optional[str] = None,
        equipment_query: Optional[str] = None,
        equipment_id: Optional[int] = None,
        booking_status: Optional[BookingStatus] = None,
        payment_status: Optional[PaymentStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        # skip: int = 0,  # Add if pagination is handled here
        # limit: int = 100, # Add if pagination is handled here
    ) -> List[Booking]:
        """Get bookings based on various filter criteria with relations loaded.

        Args:
            query: Search query for client name, email, or phone.
            equipment_query: Search query for equipment name or serial number.
            equipment_id: Filter by equipment ID.
            booking_status: Filter by booking status.
            payment_status: Filter by payment status.
            start_date: Filter by start date (overlap).
            end_date: Filter by end date (overlap).
            # skip: Number of records to skip.
            # limit: Maximum number of records to return.

        Returns:
            List of filtered bookings.
        """
        stmt = (
            select(Booking)
            .options(
                joinedload(Booking.client),
                joinedload(Booking.equipment),
                joinedload(Booking.project),
            )
            .order_by(Booking.created_at.desc())  # Default sort order
        )

        # Apply filters conditionally
        if query:
            search_query = f'%{query}%'
            # Ensure Client relationship is joined before filtering on it
            stmt = stmt.join(Booking.client).where(
                or_(
                    Client.name.ilike(search_query),
                    Client.email.ilike(search_query),
                    Client.phone.ilike(search_query),
                )
            )

        if equipment_query:
            search_eq_query = f'%{equipment_query}%'
            # Ensure Equipment relationship is joined before filtering on it
            stmt = stmt.join(Booking.equipment).where(
                or_(
                    Equipment.name.ilike(search_eq_query),
                    # Add serial number search if Equipment model has it
                    Equipment.serial_number.ilike(search_eq_query),
                    # Add barcode search
                    Equipment.barcode.ilike(search_eq_query),
                )
            )

        if equipment_id is not None:
            stmt = stmt.where(Booking.equipment_id == equipment_id)

        if booking_status is not None:
            stmt = stmt.where(Booking.booking_status == booking_status)

        if payment_status is not None:
            stmt = stmt.where(Booking.payment_status == payment_status)

        # Apply date range filter (overlap logic)
        if start_date and end_date:
            # Find bookings that overlap with the [start_date, end_date] range
            # Overlap condition: booking.start_date <= end_date
            # AND booking.end_date >= start_date
            stmt = stmt.where(
                and_(
                    Booking.start_date <= end_date,
                    Booking.end_date >= start_date,
                )
            )
        elif start_date:
            # If only start_date, find bookings ending on or after start_date
            stmt = stmt.where(Booking.end_date >= start_date)
        elif end_date:
            # If only end_date, find bookings starting on or before end_date
            stmt = stmt.where(Booking.start_date <= end_date)

        # Apply pagination if handled here
        # stmt = stmt.offset(skip).limit(limit)

        result = await self.session.execute(stmt)
        # Use unique() to handle potential duplicates from joins when using joinedload
        return list(result.unique().scalars().all())

    async def update(self, instance: Booking) -> Booking:
        """Update booking record.

        Args:
            instance: Booking instance to update

        Returns:
            Updated booking

        Raises:
            SQLAlchemyError: If database operation fails
        """
        try:
            # Get current state from database
            current = await self.get(instance.id)
            if not current:
                raise ValueError(f'Booking with ID {instance.id} not found')

            # Update fields that can change
            current.quantity = instance.quantity
            current.start_date = instance.start_date
            current.end_date = instance.end_date
            current.booking_status = instance.booking_status
            current.payment_status = instance.payment_status
            current.total_amount = instance.total_amount
            current.deposit_amount = instance.deposit_amount
            current.paid_amount = instance.paid_amount
            current.notes = instance.notes

            # Save changes
            self.session.add(current)
            await self.session.flush()
            await self.session.refresh(current)
            await self.session.commit()

            return current
        except Exception as e:
            await self.session.rollback()
            raise e
