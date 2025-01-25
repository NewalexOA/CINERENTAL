"""Equipment service module.

This module implements business logic for managing rental equipment,
including inventory management, availability tracking, and equipment status updates.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.equipment import Equipment, EquipmentStatus
from backend.repositories.equipment import EquipmentRepository


class EquipmentService:
    """Service for managing equipment."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize service.

        Args:
            session: SQLAlchemy async session
        """
        self.session = session
        self.repository = EquipmentRepository(session)

    async def create_equipment(
        self,
        name: str,
        category_id: int,
        description: str,
        serial_number: str,
        barcode: str,
        daily_rate: float,
        replacement_cost: float,
    ) -> Equipment:
        """Create new equipment.

        Args:
            name: Equipment name
            category_id: Category ID
            description: Equipment description
            serial_number: Serial number
            barcode: Barcode for scanning
            daily_rate: Daily rental rate
            replacement_cost: Cost to replace if damaged

        Returns:
            Created equipment

        Raises:
            ValueError: If equipment with given serial number or barcode already exists
        """
        # Check if equipment with given serial number or barcode exists
        existing = await self.repository.get_by_serial_number(serial_number)
        if existing:
            msg = f'Equipment with serial number {serial_number} already exists'
            raise ValueError(msg)

        existing = await self.repository.get_by_barcode(barcode)
        if existing:
            msg = f'Equipment with barcode {barcode} already exists'
            raise ValueError(msg)

        return await self.repository.create(
            name=name,
            category_id=category_id,
            description=description,
            serial_number=serial_number,
            barcode=barcode,
            daily_rate=daily_rate,
            replacement_cost=replacement_cost,
            status=EquipmentStatus.AVAILABLE,
        )

    async def update_equipment(
        self,
        equipment_id: int,
        name: Optional[str] = None,
        category_id: Optional[int] = None,
        description: Optional[str] = None,
        daily_rate: Optional[float] = None,
        replacement_cost: Optional[float] = None,
    ) -> Optional[Equipment]:
        """Update equipment details.

        Args:
            equipment_id: Equipment ID
            name: New name (optional)
            category_id: New category ID (optional)
            description: New description (optional)
            daily_rate: New daily rate (optional)
            replacement_cost: New replacement cost (optional)

        Returns:
            Updated equipment if found, None otherwise
        """
        update_data: Dict[str, Any] = {}
        if name is not None:
            update_data['name'] = name
        if category_id is not None:
            update_data['category_id'] = category_id
        if description is not None:
            update_data['description'] = description
        if daily_rate is not None:
            update_data['daily_rate'] = daily_rate
        if replacement_cost is not None:
            update_data['replacement_cost'] = replacement_cost

        if update_data:
            return await self.repository.update(
                equipment_id,
                **update_data,
            )
        return await self.repository.get(equipment_id)

    async def change_status(
        self, equipment_id: int, status: EquipmentStatus
    ) -> Optional[Equipment]:
        """Change equipment status.

        Args:
            equipment_id: Equipment ID
            status: New status

        Returns:
            Updated equipment if found, None otherwise
        """
        return await self.repository.update(equipment_id, status=status)

    async def check_availability(
        self, equipment_id: int, start_date: datetime, end_date: datetime
    ) -> bool:
        """Check if equipment is available for booking.

        Args:
            equipment_id: Equipment ID
            start_date: Start date
            end_date: End date

        Returns:
            True if equipment is available, False otherwise
        """
        equipment = await self.repository.get(equipment_id)
        if not equipment or equipment.status != EquipmentStatus.AVAILABLE:
            return False

        return await self.repository.check_availability(
            equipment_id,
            start_date,
            end_date,
        )

    async def get_available_equipment(
        self, start_date: datetime, end_date: datetime
    ) -> List[Equipment]:
        """Get all available equipment for period.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            List of available equipment
        """
        return await self.repository.get_available(start_date, end_date)

    async def search_equipment(self, query: str) -> List[Equipment]:
        """Search equipment by name or description.

        Args:
            query: Search query

        Returns:
            List of matching equipment
        """
        return await self.repository.search(query)

    async def get_by_category(self, category_id: int) -> List[Equipment]:
        """Get equipment by category.

        Args:
            category_id: Category ID

        Returns:
            List of equipment in category
        """
        return await self.repository.get_by_category(category_id)

    async def get_by_barcode(self, barcode: str) -> Optional[Equipment]:
        """Get equipment by barcode.

        Args:
            barcode: Equipment barcode

        Returns:
            Equipment if found, None otherwise
        """
        return await self.repository.get_by_barcode(barcode)
