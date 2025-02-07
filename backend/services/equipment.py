"""Equipment service module.

This module implements business logic for managing rental equipment,
including inventory management, availability tracking, and equipment status updates.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import (
    AvailabilityError,
    ConflictError,
    NotFoundError,
    StateError,
    StatusTransitionError,
    ValidationError,
)
from backend.models.equipment import Equipment, EquipmentStatus
from backend.repositories import BookingRepository, EquipmentRepository


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
            ValidationError: If validation fails
            ConflictError: If equipment with given barcode/serial number exists
        """
        # Validate business rules
        if daily_rate <= 0:
            raise ValidationError('Daily rate must be positive')
        if replacement_cost <= 0:
            raise ValidationError('Replacement cost must be positive')

        # Check for duplicate barcode
        existing = await self.repository.get_by_barcode(barcode)
        if existing:
            raise ConflictError(
                f'Equipment with barcode {barcode} already exists',
                details={'barcode': barcode},
            )

        # Check for duplicate serial number
        existing = await self.repository.get_by_serial_number(serial_number)
        if existing:
            raise ConflictError(
                f'Equipment with serial number {serial_number} already exists',
                details={'serial_number': serial_number},
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

    async def get_equipment(
        self, equipment_id: int, include_deleted: bool = False
    ) -> Equipment:
        """Get equipment by ID.

        Args:
            equipment_id: Equipment ID
            include_deleted: Whether to include soft-deleted equipment

        Returns:
            Equipment instance

        Raises:
            NotFoundError: If equipment not found
        """
        equipment = await self.repository.get(equipment_id, include_deleted)
        if not equipment:
            raise NotFoundError(
                f'Equipment with ID {equipment_id} not found',
                details={'equipment_id': equipment_id},
            )
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
            ValidationError: If validation fails
        """
        # Validate business rules
        if available_from and available_to and available_from >= available_to:
            raise ValidationError(
                'Start date must be before end date',
                details={
                    'available_from': available_from.isoformat(),
                    'available_to': available_to.isoformat(),
                },
            )

        if skip < 0:
            raise ValidationError(
                'Skip value must be non-negative', details={'skip': skip}
            )
        if limit <= 0:
            raise ValidationError('Limit must be positive', details={'limit': limit})
        if limit > 1000:
            raise ValidationError(
                'Limit cannot exceed 1000', details={'limit': limit, 'max_limit': 1000}
            )

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
            NotFoundError: If equipment not found
            ValidationError: If validation fails
            ConflictError: If equipment with given barcode exists
            StateError: If status transition is invalid
        """
        equipment = await self.get_equipment(equipment_id)

        # Validate business rules
        if daily_rate is not None and daily_rate <= 0:
            raise ValidationError(
                'Daily rate must be positive',
                details={'daily_rate': daily_rate},
            )
        if replacement_cost is not None and replacement_cost <= 0:
            raise ValidationError(
                'Replacement cost must be positive',
                details={'replacement_cost': replacement_cost},
            )

        if barcode is not None:
            existing = await self.repository.get_by_barcode(barcode)
            if existing and existing.id != equipment_id:
                raise ConflictError(
                    f'Equipment with barcode {barcode} already exists',
                    details={'barcode': barcode},
                )

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
            if status == equipment.status:
                raise StateError(
                    f'Equipment is already in {status} status',
                    details={'current_status': status},
                )
            if status == EquipmentStatus.RETIRED:
                bookings = await self.booking_repository.get_by_equipment(equipment_id)
                if any(booking.is_active() for booking in bookings):
                    raise StateError(
                        'Cannot retire equipment with active bookings',
                        details={
                            'active_bookings': [b.id for b in bookings if b.is_active()]
                        },
                    )
            equipment.status = status

        return await self.repository.update(equipment)

    async def delete_equipment(self, equipment_id: int) -> bool:
        """Delete equipment by ID.

        Args:
            equipment_id: Equipment ID

        Returns:
            True if equipment was deleted

        Raises:
            NotFoundError: If equipment not found or already deleted
            StateError: If equipment has active bookings
            ValidationError: If equipment_id is invalid
        """
        if equipment_id <= 0:
            raise ValidationError(
                'Equipment ID must be positive',
                details={'equipment_id': equipment_id},
            )

        equipment = await self.get_equipment(equipment_id)
        bookings = await self.booking_repository.get_by_equipment(equipment.id)

        # Check for active bookings
        active_bookings = [b.id for b in bookings if b.is_active()]
        if active_bookings:
            raise StateError(
                'Cannot delete equipment with active bookings',
                details={'active_bookings': active_bookings},
            )

        return await self.repository.delete(equipment.id)

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
            NotFoundError: If equipment not found
            StatusTransitionError: If status transition is invalid
        """
        equipment = await self.get_equipment(equipment_id)
        await self._validate_status_transition(equipment, new_status)
        equipment.status = new_status
        return await self.repository.update(equipment)

    async def _validate_status_transition(
        self,
        equipment: Equipment,
        new_status: EquipmentStatus,
    ) -> None:
        """Validate equipment status transition.

        Args:
            equipment: Equipment instance
            new_status: New status

        Raises:
            StatusTransitionError: If status transition is invalid
        """
        if new_status == equipment.status:
            raise StatusTransitionError(
                f'Equipment is already in {new_status} status',
                current_status=str(equipment.status),
                new_status=str(new_status),
            )

        if new_status == EquipmentStatus.RETIRED:
            bookings = await self.booking_repository.get_by_equipment(equipment.id)
            active_bookings = [b.id for b in bookings if b.is_active()]
            if active_bookings:
                raise StatusTransitionError(
                    'Cannot retire equipment with active bookings',
                    current_status=str(equipment.status),
                    new_status=str(new_status),
                    details={'active_bookings': active_bookings},
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
            True if equipment is available

        Raises:
            NotFoundError: If equipment not found
            ValidationError: If dates are invalid
            AvailabilityError: If equipment is not available
        """
        equipment = await self.get_equipment(equipment_id)

        if start_date >= end_date:
            raise ValidationError(
                'Start date must be before end date',
                details={
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                },
            )

        if equipment.status != EquipmentStatus.AVAILABLE:
            raise AvailabilityError(
                message=f'Equipment is not available (status: {equipment.status})',
                resource_id=str(equipment_id),
                resource_type='equipment',
                details={'current_status': equipment.status},
            )

        is_available = await self.repository.check_availability(
            equipment_id, start_date, end_date
        )
        if not is_available:
            raise AvailabilityError(
                message='Equipment is not available for the specified period',
                resource_id=str(equipment_id),
                resource_type='equipment',
                details={
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                },
            )

        return True

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

    async def get_all(
        self,
        status: Optional[EquipmentStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Equipment]:
        """Get all equipment with optional filtering and pagination.

        Args:
            status: Filter by equipment status
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of equipment items

        Raises:
            ValidationError: If validation fails
        """
        if skip < 0:
            raise ValidationError(
                'Skip value must be non-negative', details={'skip': skip}
            )
        if limit < 1:
            raise ValidationError(
                'Limit value must be positive', details={'limit': limit}
            )

        return await self.repository.get_equipment_list(
            status=status,
            skip=skip,
            limit=limit,
        )

    async def search(self, query: str) -> List[Equipment]:
        """Search equipment by name or description.

        Args:
            query: Search query string

        Returns:
            List of matching equipment items

        Raises:
            ValidationError: If query is empty
        """
        if not query:
            raise ValidationError('Search query cannot be empty')

        return await self.repository.search(query)

    async def _is_available(
        self,
        equipment_id: int,
        available_from: datetime,
        available_to: datetime,
    ) -> bool:
        """Check if equipment is available for the given time period.

        Args:
            equipment_id: Equipment ID to check
            available_from: Start of the period
            available_to: End of the period

        Returns:
            True if equipment is available, False otherwise
        """
        return await self.repository.check_availability(
            equipment_id, available_from, available_to
        )

    async def _is_available_for_update(
        self,
        equipment_id: int,
        booking_id: int,
        available_from: datetime,
        available_to: datetime,
    ) -> bool:
        """Check if equipment is available for the given time period.

        This check excludes the current booking from availability verification.

        Args:
            equipment_id: Equipment ID to check
            booking_id: ID of the current booking to exclude from check
            available_from: Start of the period
            available_to: End of the period

        Returns:
            True if equipment is available, False otherwise
        """
        return await self.repository.check_availability(
            equipment_id, available_from, available_to, exclude_booking_id=booking_id
        )

    async def _check_availability(
        self,
        equipment_id: int,
        available_from: datetime,
        available_to: datetime,
    ) -> None:
        """Check if equipment is available for the given time period.

        Args:
            equipment_id: Equipment ID to check
            available_from: Start of the period
            available_to: End of the period

        Raises:
            AvailabilityError: If equipment is not available
        """
        if not await self._is_available(equipment_id, available_from, available_to):
            raise AvailabilityError(
                message='Equipment is not available for the specified time period',
                resource_id=str(equipment_id),
                resource_type='equipment',
                details={
                    'available_from': available_from.isoformat(),
                    'available_to': available_to.isoformat(),
                },
            )

    async def _check_availability_for_update(
        self,
        equipment_id: int,
        booking_id: int,
        available_from: datetime,
        available_to: datetime,
    ) -> None:
        """Check if equipment is available for the given time period.

        This check excludes the current booking from availability verification.

        Args:
            equipment_id: Equipment ID to check
            booking_id: ID of the current booking to exclude from check
            available_from: Start of the period
            available_to: End of the period

        Raises:
            AvailabilityError: If equipment is not available
        """
        if not await self._is_available_for_update(
            equipment_id, booking_id, available_from, available_to
        ):
            raise AvailabilityError(
                message='Equipment is not available for the specified time period',
                resource_id=str(equipment_id),
                resource_type='equipment',
                details={
                    'booking_id': str(booking_id),
                    'available_from': available_from.isoformat(),
                    'available_to': available_to.isoformat(),
                },
            )
