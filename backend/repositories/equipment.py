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
        query: Select = select(self.model).where(self.model.barcode == barcode)
        result: Optional[Equipment] = await self.session.scalar(query)
        return result

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
        query: Select = select(self.model).where(self.model.category_id == category_id)
        result = await self.session.scalars(query)
        return cast(List[Equipment], list(result.all()))

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
        # Equipment is available if:
        # 1. It has status 'available'
        # 2. It has no active bookings for the specified period
        query: Select = select(self.model).where(
            and_(
                self.model.status == EquipmentStatus.AVAILABLE,
                ~self.model.bookings.any(
                    and_(
                        Booking.start_date < end_date,
                        Booking.end_date > start_date,
                        Booking.booking_status.in_(
                            [
                                BookingStatus.PENDING,
                                BookingStatus.CONFIRMED,
                                BookingStatus.ACTIVE,
                            ]
                        ),
                    )
                ),
            )
        )
        result = await self.session.scalars(query)
        return cast(List[Equipment], list(result.all()))

    async def search(self, query_str: str) -> List[Equipment]:
        """Search equipment by name or description.

        Args:
            query: Search query

        Returns:
            List of matching equipment
        """
        query: Select = select(self.model).where(
            or_(
                self.model.name.ilike(f'%{query_str}%'),
                self.model.description.ilike(f'%{query_str}%'),
            )
        )
        result = await self.session.scalars(query)
        return cast(List[Equipment], list(result.all()))

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
                Booking.booking_status.in_(
                    [
                        BookingStatus.PENDING,
                        BookingStatus.CONFIRMED,
                        BookingStatus.ACTIVE,
                    ]
                ),
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
