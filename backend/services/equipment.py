"""Equipment service module.

This module implements business logic for managing rental equipment,
including inventory management, availability tracking, and equipment status updates.
"""

from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional

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
        description: str,
        category_id: int,
        barcode: str,
        serial_number: str,
        daily_rate: float,
        replacement_cost: float,
        notes: Optional[str] = None,
    ) -> Equipment:
        """Create new equipment.

        Args:
            name: Equipment name
            description: Equipment description
            category_id: Category ID
            barcode: Equipment barcode
            serial_number: Equipment serial number
            daily_rate: Daily rental rate
            replacement_cost: Replacement cost
            notes: Additional notes (optional)

        Returns:
            Created equipment

        Raises:
            ValueError: If equipment with given barcode exists or if parameters are
                invalid
        """
        # Validate input parameters
        if not name or not name.strip():
            raise ValueError('Equipment name cannot be empty')
        if not description or not description.strip():
            raise ValueError('Equipment description cannot be empty')
        if not barcode or not barcode.strip():
            raise ValueError('Equipment barcode cannot be empty')
        if not serial_number or not serial_number.strip():
            raise ValueError('Equipment serial number cannot be empty')
        if daily_rate <= 0:
            raise ValueError('Daily rate must be positive')
        if replacement_cost <= 0:
            raise ValueError('Replacement cost must be positive')

        # Check if equipment with given barcode exists
        existing = await self.repository.get_by_barcode(barcode)
        if existing:
            msg = f'Equipment with barcode {barcode} already exists'
            raise ValueError(msg)

        # Check if equipment with given serial number exists
        existing = await self.repository.get_by_serial_number(serial_number)
        if existing:
            msg = f'Equipment with serial number {serial_number} already exists'
            raise ValueError(msg)

        equipment = Equipment(
            name=name,
            description=description,
            category_id=category_id,
            barcode=barcode,
            serial_number=serial_number,
            daily_rate=Decimal(str(daily_rate)),
            replacement_cost=Decimal(str(replacement_cost)),
            notes=notes,
            status=EquipmentStatus.AVAILABLE,
        )
        return await self.repository.create(equipment)

    async def update_equipment(
        self,
        equipment_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        category_id: Optional[int] = None,
        barcode: Optional[str] = None,
        daily_rate: Optional[float] = None,
        replacement_cost: Optional[float] = None,
        notes: Optional[str] = None,
    ) -> Equipment:
        """Update equipment details.

        Args:
            equipment_id: Equipment ID
            name: New equipment name (optional)
            description: New equipment description (optional)
            category_id: New category ID (optional)
            barcode: New equipment barcode (optional)
            daily_rate: New daily rental rate (optional)
            replacement_cost: New replacement cost (optional)
            notes: New notes (optional)

        Returns:
            Updated equipment

        Raises:
            ValueError: If equipment not found or if new barcode already exists
        """
        # Get equipment
        equipment = await self.repository.get(equipment_id)
        if not equipment:
            msg = f'Equipment with ID {equipment_id} not found'
            raise ValueError(msg)

        # Check if new barcode is unique
        if barcode and barcode != equipment.barcode:
            existing = await self.repository.get_by_barcode(barcode)
            if existing:
                msg = f'Equipment with barcode {barcode} already exists'
                raise ValueError(msg)

        # Update fields
        if name is not None:
            equipment.name = name
        if description is not None:
            equipment.description = description
        if category_id is not None:
            equipment.category_id = category_id
        if barcode is not None:
            equipment.barcode = barcode
        if daily_rate is not None:
            equipment.daily_rate = Decimal(str(daily_rate))
        if replacement_cost is not None:
            equipment.replacement_cost = Decimal(str(replacement_cost))
        if notes is not None:
            equipment.notes = notes

        return await self.repository.update(equipment)

    async def change_status(
        self,
        equipment_id: int,
        status: EquipmentStatus,
    ) -> Equipment:
        """Change equipment status.

        Args:
            equipment_id: Equipment ID
            status: New status

        Returns:
            Updated equipment

        Raises:
            ValueError: If equipment not found or status transition not allowed
        """
        # Get equipment
        equipment = await self.repository.get(equipment_id)
        if not equipment:
            msg = f'Equipment with ID {equipment_id} not found'
            raise ValueError(msg)

        # Check if status transition is allowed
        allowed_transitions: Dict[EquipmentStatus, List[EquipmentStatus]] = {
            EquipmentStatus.AVAILABLE: [
                EquipmentStatus.MAINTENANCE,
                EquipmentStatus.RETIRED,
            ],
            EquipmentStatus.MAINTENANCE: [
                EquipmentStatus.AVAILABLE,
                EquipmentStatus.RETIRED,
            ],
            EquipmentStatus.RETIRED: [],
        }

        if status not in allowed_transitions[equipment.status]:
            msg = f'Invalid status transition from {equipment.status} to {status}'
            raise ValueError(msg)

        # Update status
        equipment.status = status
        return await self.repository.update(equipment)

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
