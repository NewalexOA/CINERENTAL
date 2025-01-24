"""Equipment repository module.

This module provides database operations for managing rental equipment,
including inventory tracking, availability status, and maintenance records.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from backend.models.booking import Booking, BookingStatus
from backend.models.equipment import Equipment, EquipmentStatus
from backend.repositories.base import BaseRepository


class EquipmentRepository(BaseRepository[Equipment]):
    """Repository for equipment."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            session: SQLAlchemy async session
        """
        super().__init__(Equipment, session)

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
        query: Select = select(self.model).where(self.model.serial_number == serial_number)
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
        result: List[Equipment] = (await self.session.scalars(query)).all()
        return result

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
        # 2. It has no bookings for the specified period
        query: Select = select(self.model).where(
            and_(
                self.model.status == EquipmentStatus.AVAILABLE,
                ~self.model.bookings.any(
                    and_(
                        Booking.start_date < end_date,
                        Booking.end_date > start_date,
                        Booking.status != BookingStatus.CANCELLED,
                    )
                ),
            )
        )
        result: List[Equipment] = (await self.session.scalars(query)).all()
        return result

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
        result: List[Equipment] = (await self.session.scalars(query)).all()
        return result
