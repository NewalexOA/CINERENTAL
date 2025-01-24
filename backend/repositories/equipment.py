"""Equipment repository module.

This module provides database operations for managing rental equipment,
including inventory tracking, availability status, and maintenance records.
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.equipment import Equipment, EquipmentStatus
from backend.repositories.base import BaseRepository


class EquipmentRepository(BaseRepository[Equipment]):
    """Repository for equipment."""

    def __init__(self, session: AsyncSession):
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
        query = select(self.model).where(self.model.barcode == barcode)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_serial_number(self, serial_number: str) -> Optional[Equipment]:
        """Get equipment by serial number.

        Args:
            serial_number: Equipment serial number

        Returns:
            Equipment if found, None otherwise
        """
        query = select(self.model).where(self.model.serial_number == serial_number)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_category(self, category_id: int) -> List[Equipment]:
        """Get equipment by category.

        Args:
            category_id: Category ID

        Returns:
            List of equipment in category
        """
        query = select(self.model).where(self.model.category_id == category_id)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_available(self, start_date: datetime, end_date: datetime) -> List[Equipment]:
        """Get available equipment for given period.

        Args:
            start_date: Start date of period
            end_date: End date of period

        Returns:
            List of available equipment
        """
        # Оборудование доступно если:
        # 1. Оно в статусе 'available'
        # 2. У него нет бронирований на указанный период
        query = (
            select(self.model)
            .where(
                and_(
                    self.model.status == EquipmentStatus.available,
                    ~self.model.bookings.any(
                        and_(
                            or_(
                                and_(
                                    self.model.bookings.start_date <= end_date,
                                    self.model.bookings.end_date >= start_date
                                ),
                                and_(
                                    self.model.bookings.start_date <= start_date,
                                    self.model.bookings.end_date >= end_date
                                )
                            )
                        )
                    )
                )
            )
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def search(self, query: str) -> List[Equipment]:
        """Search equipment by name or description.

        Args:
            query: Search query

        Returns:
            List of matching equipment
        """
        search = f"%{query}%"
        query = select(self.model).where(
            or_(
                self.model.name.ilike(search),
                self.model.description.ilike(search)
            )
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())
