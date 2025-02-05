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
from backend.repositories.booking import BookingRepository
from backend.exceptions import BusinessError


class EquipmentService:
    """Service for managing equipment."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize service.

        Args:
            session: SQLAlchemy async session
        """
        self.session = session
        self.repository = EquipmentRepository(session)
        self.booking_repository = BookingRepository(session)

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
            replacement_cost: Cost to replace if damaged
            notes: Optional notes

        Returns:
            Created equipment

        Raises:
            BusinessError: If validation fails
        """
        # Validate business rules
        if daily_rate <= 0:
            raise BusinessError("Daily rate must be positive")
        if replacement_cost <= 0:
            raise BusinessError("Replacement cost must be positive")

        # Check for duplicate barcode
        existing = await self.repository.get_by_barcode(barcode)
        if existing:
            raise BusinessError(f"Equipment with barcode {barcode} already exists")

        # Check for duplicate serial number
        existing = await self.repository.get_by_serial_number(serial_number)
        if existing:
            raise BusinessError(
                f"Equipment with serial number {serial_number} already exists"
            )

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

    async def get_equipment(self, equipment_id: int) -> Equipment:
        """Get equipment by ID.

        Args:
            equipment_id: Equipment ID

        Returns:
            Equipment instance

        Raises:
            BusinessError: If equipment not found
        """
        equipment = await self.repository.get(equipment_id)
        if not equipment:
            raise BusinessError(f"Equipment with ID {equipment_id} not found")
        return equipment

    async def get_equipment_list(
        self,
        category_id: Optional[int] = None,
        status: Optional[EquipmentStatus] = None,
        available_from: Optional[datetime] = None,
        available_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Equipment]:
        """Get equipment list with optional filtering and pagination.

        Args:
            category_id: Filter by category ID
            status: Filter by equipment status
            available_from: Filter by availability start date
            available_to: Filter by availability end date
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of equipment items

        Raises:
            BusinessError: If validation fails
        """
        # Validate business rules
        if available_from and available_to and available_from >= available_to:
            raise BusinessError("Start date must be before end date")

        if skip < 0:
            raise BusinessError("Skip must be non-negative")
        if limit <= 0:
            raise BusinessError("Limit must be positive")
        if limit > 100:
            raise BusinessError("Limit cannot exceed 100")

        return await self.repository.get_equipment_list(
            category_id=category_id,
            status=status,
            available_from=available_from,
            available_to=available_to,
            skip=skip,
            limit=limit,
        )

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
        status: Optional[EquipmentStatus] = None,
    ) -> Equipment:
        """Update equipment.

        Args:
            equipment_id: Equipment ID
            name: New name
            description: New description
            category_id: New category ID
            barcode: New barcode
            daily_rate: New daily rate
            replacement_cost: New replacement cost
            notes: New notes
            status: New status

        Returns:
            Updated equipment

        Raises:
            BusinessError: If equipment not found or validation fails
        """
        try:
            equipment = await self.get_equipment(equipment_id)
        except BusinessError:
            raise BusinessError(f"Equipment with ID {equipment_id} not found")

        # Validate business rules
        if daily_rate is not None and daily_rate <= 0:
            raise BusinessError("Daily rate must be positive")
        if replacement_cost is not None and replacement_cost <= 0:
            raise BusinessError("Replacement cost must be positive")

        if barcode is not None:
            existing = await self.repository.get_by_barcode(barcode)
            if existing and existing.id != equipment_id:
                raise BusinessError(f"Equipment with barcode {barcode} already exists")

        # Apply updates
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
        if status is not None:
            await self._validate_status_transition(equipment, status)
            equipment.status = status

        return await self.repository.update(equipment)

    async def delete_equipment(self, equipment_id: int) -> bool:
        """Delete equipment by ID.

        Args:
            equipment_id: Equipment ID

        Returns:
            True if equipment was deleted

        Raises:
            BusinessError: If equipment not found or has active bookings
        """
        # Check if equipment exists
        await self.get_equipment(equipment_id)

        # Check for active bookings
        bookings = await self.booking_repository.get_by_equipment(equipment_id)
        if any(booking.is_active() for booking in bookings):
            raise BusinessError("Cannot delete equipment with active bookings")

        return await self.repository.delete(equipment_id)

    async def search_equipment(self, query: str) -> List[Equipment]:
        """Search equipment by name or description.

        Args:
            query: Search query

        Returns:
            List of matching equipment

        Raises:
            BusinessError: If query is empty or too short
        """
        if not query or len(query.strip()) < 3:
            raise BusinessError("Search query must be at least 3 characters long")

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

        Raises:
            BusinessError: If barcode is invalid
        """
        if not barcode or not barcode.strip():
            raise BusinessError("Barcode cannot be empty")

        return await self.repository.get_by_barcode(barcode)

    async def change_status(
        self,
        equipment_id: int,
        new_status: EquipmentStatus,
    ) -> Equipment:
        """Change equipment status.

        Args:
            equipment_id: Equipment ID
            new_status: New status

        Returns:
            Updated equipment

        Raises:
            BusinessError: If equipment not found or status transition not allowed
        """
        try:
            equipment = await self.get_equipment(equipment_id)
        except BusinessError:
            raise BusinessError(f"Equipment with ID {equipment_id} not found")

        await self._validate_status_transition(equipment, new_status)
        equipment.status = new_status
        return await self.repository.update(equipment)

    async def _validate_status_transition(
        self,
        equipment: Equipment,
        new_status: EquipmentStatus,
    ) -> None:
        """Validate status transition according to business rules.

        Args:
            equipment: Equipment to update
            new_status: New status

        Raises:
            BusinessError: If transition is not allowed
        """
        allowed_transitions: Dict[EquipmentStatus, List[EquipmentStatus]] = {
            EquipmentStatus.AVAILABLE: [
                EquipmentStatus.MAINTENANCE,
                EquipmentStatus.BROKEN,
                EquipmentStatus.RENTED,
            ],
            EquipmentStatus.MAINTENANCE: [
                EquipmentStatus.AVAILABLE,
                EquipmentStatus.BROKEN,
                EquipmentStatus.RETIRED,
            ],
            EquipmentStatus.BROKEN: [
                EquipmentStatus.MAINTENANCE,
                EquipmentStatus.RETIRED,
            ],
            EquipmentStatus.RETIRED: [],  # No transitions from retired
            EquipmentStatus.RENTED: [EquipmentStatus.AVAILABLE],
        }

        # Additional validation for specific transitions
        if new_status == EquipmentStatus.RETIRED:
            # Check for active bookings before retiring
            bookings = await self.booking_repository.get_by_equipment(equipment.id)
            if any(booking.is_active() for booking in bookings):
                msg = f"Cannot transition from {equipment.status} to {new_status}"
                raise BusinessError(f"{msg} with active bookings")

        if new_status not in allowed_transitions.get(equipment.status, []):
            raise BusinessError(
                f"Cannot transition from {equipment.status} to {new_status}"
            )

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
