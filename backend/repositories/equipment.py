"""Equipment repository module.

This module provides database operations for managing rental equipment,
including inventory tracking, availability status, and maintenance records.
"""

from datetime import datetime
from typing import List, Optional, Protocol, cast

from sqlalchemy import Column, and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from backend.models.booking import Booking, BookingStatus
from backend.models.equipment import Equipment, EquipmentStatus
from backend.repositories.base import BaseRepository


class HasBookingStatus(Protocol):
    """Protocol for models with booking_status attribute."""

    booking_status: Column[BookingStatus]


class EquipmentRepository(BaseRepository[Equipment]):
    """Repository for equipment."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            session: SQLAlchemy async session
        """
        super().__init__(session, Equipment)

    async def get_by_barcode(self, barcode: str) -> Optional[Equipment]:
        """Get equipment by barcode.

        Args:
            barcode: Equipment barcode

        Returns:
            Equipment if found, None otherwise
        """
        query = select(Equipment).where(
            and_(
                Equipment.barcode == barcode,
                Equipment.deleted_at.is_(None)
            )
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_serial_number(self, serial_number: str) -> Optional[Equipment]:
        """Get equipment by serial number.

        Args:
            serial_number: Equipment serial number

        Returns:
            Equipment if found, None otherwise
        """
        query: Select = select(self.model).where(
            self.model.serial_number == serial_number
        )
        result: Optional[Equipment] = await self.session.scalar(query)
        return result

    async def get_by_category(self, category_id: int) -> List[Equipment]:
        """Get equipment by category.

        Args:
            category_id: Category ID

        Returns:
            List of equipment in category
        """
        query = select(Equipment).where(
            and_(
                Equipment.category_id == category_id,
                Equipment.deleted_at.is_(None)
            )
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_available(
        self, start_date: datetime, end_date: datetime
    ) -> List[Equipment]:
        """Get available equipment for given period.

        Args:
            start_date: Start date of period
            end_date: End date of period

        Returns:
            List of available equipment
        """
        query = select(Equipment).where(
            and_(
                Equipment.status == EquipmentStatus.AVAILABLE,
                ~Equipment.bookings.any(
                    and_(
                        Booking.start_date < end_date,
                        Booking.end_date > start_date,
                        Booking.booking_status.in_([
                            BookingStatus.PENDING,
                            BookingStatus.CONFIRMED,
                            BookingStatus.ACTIVE,
                        ]),
                    )
                ),
            )
        )
        result = await self.session.scalars(query)
        return cast(List[Equipment], list(result.all()))

    async def get_equipment_list(
        self,
        category_id: Optional[int] = None,
        status: Optional[EquipmentStatus] = None,
        available_from: Optional[datetime] = None,
        available_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Equipment]:
        """Get equipment list with filtering and pagination.

        Args:
            category_id: Filter by category ID
            status: Filter by equipment status
            available_from: Filter by availability start date
            available_to: Filter by availability end date
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of equipment items
        """
        query = select(Equipment).where(Equipment.deleted_at.is_(None))

        if category_id is not None:
            query = query.where(Equipment.category_id == category_id)
        if status is not None:
            query = query.where(Equipment.status == status)
        if available_from is not None and available_to is not None:
            bookings_subquery = self._build_availability_subquery(
                available_from, available_to
            )
            query = query.where(
                and_(
                    Equipment.status == EquipmentStatus.AVAILABLE,
                    Equipment.id.not_in(bookings_subquery)
                )
            )

        query = query.offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    def _build_availability_subquery(
        self,
        available_from: datetime,
        available_to: datetime
    ):
        """Build subquery for checking equipment availability.

        Args:
            available_from: Start date of availability period
            available_to: End date of availability period

        Returns:
            SQLAlchemy subquery
        """
        return (
            select(Booking.equipment_id)
            .where(
                and_(
                    Booking.booking_status != BookingStatus.CANCELLED,
                    or_(
                        and_(
                            Booking.start_date <= available_from,
                            Booking.end_date >= available_from
                        ),
                        and_(
                            Booking.start_date <= available_to,
                            Booking.end_date >= available_to
                        ),
                        and_(
                            Booking.start_date >= available_from,
                            Booking.end_date <= available_to
                        )
                    )
                )
            )
            .distinct()
            .scalar_subquery()
        )

    async def search(self, query: str) -> List[Equipment]:
        """Search equipment by name or description.

        Args:
            query: Search query string

        Returns:
            List of matching equipment
        """
        search_query = select(Equipment).where(
            and_(
                or_(
                    Equipment.name.ilike(f"%{query}%"),
                    Equipment.description.ilike(f"%{query}%")
                ),
                Equipment.deleted_at.is_(None)
            )
        )
        result = await self.session.execute(search_query)
        return list(result.scalars().all())

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
        # First check if equipment exists and is available
        equipment = await self.get(equipment_id)
        if not equipment or equipment.status != EquipmentStatus.AVAILABLE:
            return False

        # Then check for overlapping bookings
        query = select(Booking).where(
            and_(
                Booking.equipment_id == equipment_id,
                Booking.booking_status.in_([
                    BookingStatus.PENDING,
                    BookingStatus.CONFIRMED,
                    BookingStatus.ACTIVE,
                ]),
                or_(
                    and_(
                        Booking.start_date < end_date,
                        Booking.end_date > start_date,
                    ),
                    and_(
                        Booking.start_date >= start_date,
                        Booking.start_date < end_date,
                    ),
                ),
            )
        )

        if exclude_booking_id:
            query = query.where(Booking.id != exclude_booking_id)

        result = await self.session.execute(query)
        return not bool(result.scalar_one_or_none())

    async def get_by_status(self, status: EquipmentStatus) -> List[Equipment]:
        """Get equipment by status.

        Args:
            status: Equipment status

        Returns:
            List of equipment with specified status
        """
        result = await self.session.execute(
            select(Equipment).where(Equipment.status == status)
        )
        return list(result.scalars().all())
