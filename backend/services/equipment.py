"""Equipment service module.

This module implements business logic for managing rental equipment,
including inventory management, availability tracking, and equipment status updates.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Set

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import (
    AvailabilityError,
    BusinessError,
    ConflictError,
    NotFoundError,
    StateError,
    ValidationError,
)
from backend.models import Equipment, EquipmentStatus
from backend.repositories import BookingRepository, EquipmentRepository
from backend.schemas import EquipmentResponse


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

    async def _load_equipment_with_category(self, equipment: Equipment) -> Equipment:
        """Load equipment with category relationship.

        Args:
            equipment: Equipment instance

        Returns:
            Equipment instance with loaded category
        """
        stmt = select(Equipment).filter(Equipment.id == equipment.id)
        result = await self.session.execute(stmt)
        loaded_equipment = result.unique().scalar_one()
        return loaded_equipment

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
    ) -> EquipmentResponse:
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
        db_equipment = await self.repository.create(equipment)
        loaded_equipment = await self._load_equipment_with_category(db_equipment)
        return EquipmentResponse.model_validate(loaded_equipment)

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
        loaded_equipment = await self._load_equipment_with_category(equipment)
        return loaded_equipment

    async def get_equipment_list(
        self,
        category_id: Optional[int] = None,
        status: Optional[EquipmentStatus] = None,
        available_from: Optional[datetime] = None,
        available_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[EquipmentResponse]:
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
        if available_from and available_to:
            # Convert to UTC if not already
            if available_from.tzinfo is None:
                available_from = available_from.replace(tzinfo=timezone.utc)
            if available_to.tzinfo is None:
                available_to = available_to.replace(tzinfo=timezone.utc)

            if available_from >= available_to:
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

        equipment_list = await self.repository.get_equipment_list(
            category_id=category_id,
            status=status,
            available_from=available_from,
            available_to=available_to,
            skip=skip,
            limit=limit,
        )

        # Load equipment with categories
        loaded_equipment = []
        for equipment in equipment_list:
            loaded = await self._load_equipment_with_category(equipment)
            loaded_equipment.append(loaded)

        return [EquipmentResponse.model_validate(e) for e in loaded_equipment]

    async def update_equipment(
        self,
        equipment_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        category_id: Optional[int] = None,
        barcode: Optional[str] = None,
        serial_number: Optional[str] = None,
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
            serial_number: New serial number
            daily_rate: New daily rate
            replacement_cost: New replacement cost
            notes: New notes
            status: New status

        Returns:
            Updated equipment

        Raises:
            NotFoundError: If equipment not found
            ValidationError: If validation fails
            ConflictError: If equipment with given barcode/serial number exists
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

        if serial_number is not None:
            existing = await self.repository.get_by_serial_number(serial_number)
            if existing and existing.id != equipment_id:
                msg = f'Equipment with serial number {serial_number} already exists'
                raise ConflictError(msg, details={'serial_number': serial_number})

        # Apply updates
        if name is not None:
            equipment.name = name
        if description is not None:
            equipment.description = description
        if category_id is not None:
            equipment.category_id = category_id
        if barcode is not None:
            equipment.barcode = barcode
        if serial_number is not None:
            equipment.serial_number = serial_number
        if daily_rate is not None:
            equipment.daily_rate = Decimal(str(daily_rate))
        if replacement_cost is not None:
            equipment.replacement_cost = Decimal(str(replacement_cost))
        if notes is not None:
            equipment.notes = notes
        if status is not None:
            if status == equipment.status:
                return equipment

            # Check for active bookings
            active_bookings = await self.booking_repository.get_active_by_equipment(
                equipment_id
            )
            if active_bookings:
                raise StateError(
                    'Cannot change status of equipment with active bookings',
                    details={
                        'equipment_id': equipment_id,
                        'current_status': equipment.status,
                        'new_status': status,
                        'active_bookings': len(active_bookings),
                    },
                )

            # Validate status transition
            if not self._is_valid_status_transition(equipment.status, status):
                current = equipment.status.value
                target = status.value
                raise StateError(
                    f'Cannot change status from {current} to {target}',
                    details={
                        'current_status': current,
                        'new_status': target,
                        'message': f'Cannot change status from {current} to {target}',
                    },
                )

            equipment.status = status

        await self.repository.update(equipment)
        return equipment

    def _is_valid_status_transition(
        self, current_status: EquipmentStatus, new_status: EquipmentStatus
    ) -> bool:
        """Check if status transition is valid.

        Args:
            current_status: Current equipment status
            new_status: New equipment status

        Returns:
            True if transition is valid, False otherwise
        """
        # Allow transition to the same status
        if current_status.value == new_status.value:
            return True

        allowed_transitions: Dict[str, Set[str]] = {
            EquipmentStatus.AVAILABLE.value: {
                EquipmentStatus.RENTED.value,
                EquipmentStatus.MAINTENANCE.value,
                EquipmentStatus.RETIRED.value,
            },
            EquipmentStatus.RENTED.value: {
                EquipmentStatus.AVAILABLE.value,
                EquipmentStatus.BROKEN.value,
                EquipmentStatus.MAINTENANCE.value,
            },
            EquipmentStatus.MAINTENANCE.value: {
                EquipmentStatus.AVAILABLE.value,
                EquipmentStatus.BROKEN.value,
                EquipmentStatus.RETIRED.value,
            },
            EquipmentStatus.BROKEN.value: {
                EquipmentStatus.MAINTENANCE.value,
                EquipmentStatus.RETIRED.value,
            },
            EquipmentStatus.RETIRED.value: set(),  # No transitions allowed from RETIRED
        }
        return new_status.value in allowed_transitions[current_status.value]

    async def delete_equipment(self, equipment_id: int) -> bool:
        """Delete equipment.

        Args:
            equipment_id: Equipment ID

        Returns:
            True if equipment was deleted

        Raises:
            NotFoundError: If equipment not found
            StateError: If equipment has active bookings
        """
        equipment = await self.get_equipment(equipment_id)

        # Check for active bookings
        active_bookings = await self.booking_repository.get_active_by_equipment(
            equipment_id
        )
        if active_bookings:
            raise StateError(
                'Cannot delete equipment with active bookings',
                details={'equipment_id': equipment_id},
            )

        return await self.repository.delete(equipment.id)

    async def search_equipment(self, query: str) -> List[EquipmentResponse]:
        """Search equipment by name or description.

        Args:
            query: Search query

        Returns:
            List of matching equipment
        """
        equipment_list = await self.repository.search(query)
        return [EquipmentResponse.model_validate(e) for e in equipment_list]

    async def get_by_category(self, category_id: int) -> List[EquipmentResponse]:
        """Get equipment by category.

        Args:
            category_id: Category ID

        Returns:
            List of equipment in category
        """
        equipment_list = await self.repository.get_by_category(category_id)
        return [EquipmentResponse.model_validate(e) for e in equipment_list]

    async def get_by_barcode(self, barcode: str) -> Optional[EquipmentResponse]:
        """Get equipment by barcode.

        Args:
            barcode: Equipment barcode

        Returns:
            Equipment if found, None otherwise
        """
        equipment = await self.repository.get_by_barcode(barcode)
        if equipment:
            return EquipmentResponse.model_validate(equipment)
        return None

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
            StateError: If status transition is invalid
            BusinessError: If equipment has active bookings
        """
        equipment = await self.get_equipment(equipment_id)

        # Check if status transition is valid
        if not self._is_valid_status_transition(equipment.status, new_status):
            current = equipment.status.value
            target = new_status.value
            raise StateError(
                f'Cannot change status from {current} to {target}',
                details={
                    'current_status': current,
                    'new_status': target,
                    'message': f'Cannot change status from {current} to {target}',
                },
            )

        # Check for active bookings
        if new_status != EquipmentStatus.RENTED:
            active_bookings = await self.booking_repository.get_active_by_equipment(
                equipment_id
            )
            if active_bookings:
                error_msg = (
                    'Cannot retire equipment with active bookings'
                    if new_status == EquipmentStatus.RETIRED
                    else 'Cannot change status of equipment with active bookings'
                )
                raise BusinessError(
                    error_msg,
                    details={
                        'equipment_id': equipment_id,
                        'active_bookings': len(active_bookings),
                    },
                )

        equipment.status = new_status
        return await self.repository.update(equipment)

    async def check_availability(
        self, equipment_id: int, start_date: datetime, end_date: datetime
    ) -> bool:
        """Check if equipment is available for period.

        Args:
            equipment_id: Equipment ID
            start_date: Start date
            end_date: End date

        Returns:
            True if equipment is available

        Raises:
            NotFoundError: If equipment not found
            ValidationError: If dates are invalid
        """
        equipment = await self.get_equipment(equipment_id)

        # Ensure dates are timezone-aware
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)

        # Validate dates
        if start_date >= end_date:
            raise ValidationError(
                'Start date must be before end date',
                details={
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                },
            )

        # Check equipment status
        if equipment.status != EquipmentStatus.AVAILABLE:
            return False

        # Check for overlapping bookings
        active_bookings = await self.booking_repository.get_active_by_equipment(
            equipment_id
        )
        for booking in active_bookings:
            if start_date < booking.end_date and end_date > booking.start_date:
                return False

        return True

    async def get_available_equipment(
        self, start_date: datetime, end_date: datetime
    ) -> List[EquipmentResponse]:
        """Get all available equipment for period.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            List of available equipment
        """
        equipment_list = await self.repository.get_available(start_date, end_date)
        return [EquipmentResponse.model_validate(e) for e in equipment_list]

    async def get_all(
        self,
        status: Optional[EquipmentStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[EquipmentResponse]:
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
        # Validate pagination
        if skip < 0:
            raise ValidationError(
                'Skip value must be non-negative', details={'skip': skip}
            )
        if limit <= 0:
            raise ValidationError('Limit must be positive', details={'limit': limit})
        if limit > 1000:
            raise ValidationError(
                'Limit cannot exceed 1000',
                details={'limit': limit, 'max_limit': 1000},
            )

        # Get equipment with categories in a single query
        stmt = (
            select(Equipment)
            .filter(Equipment.deleted_at.is_(None))
            .order_by(Equipment.name)
        )

        if status:
            stmt = stmt.filter(Equipment.status == status)

        stmt = stmt.offset(skip).limit(limit)

        result = await self.session.execute(stmt)
        equipment_list = result.unique().scalars().all()

        # Transform data for response
        return [EquipmentResponse.model_validate(e) for e in equipment_list]

    async def search(self, query: str) -> List[EquipmentResponse]:
        """Search equipment by name or description.

        Args:
            query: Search query

        Returns:
            List of matching equipment

        Raises:
            ValidationError: If query is empty or contains only whitespace
        """
        if not query or query.isspace():
            raise ValidationError('Search query cannot be empty')

        equipment_list = await self.repository.search(query)

        # Load equipment with categories
        loaded_equipment = []
        for equipment in equipment_list:
            loaded = await self._load_equipment_with_category(equipment)
            loaded_equipment.append(loaded)

        return [EquipmentResponse.model_validate(e) for e in loaded_equipment]

    async def _is_available(
        self,
        equipment_id: int,
        available_from: datetime,
        available_to: datetime,
    ) -> bool:
        """Check if equipment is available for period.

        Args:
            equipment_id: Equipment ID
            available_from: Start date
            available_to: End date

        Returns:
            True if equipment is available
        """
        equipment = await self.get_equipment(equipment_id)
        if equipment.status != EquipmentStatus.AVAILABLE:
            return False

        active_bookings = await self.booking_repository.get_active_by_equipment(
            equipment_id
        )
        for booking in active_bookings:
            if available_from < booking.end_date and available_to > booking.start_date:
                return False

        return True

    async def _is_available_for_update(
        self,
        equipment_id: int,
        booking_id: int,
        available_from: datetime,
        available_to: datetime,
    ) -> bool:
        """Check if equipment is available for period, excluding current booking.

        Args:
            equipment_id: Equipment ID
            booking_id: Current booking ID
            available_from: Start date
            available_to: End date

        Returns:
            True if equipment is available
        """
        equipment = await self.get_equipment(equipment_id)
        if equipment.status != EquipmentStatus.AVAILABLE:
            return False

        active_bookings = await self.booking_repository.get_active_by_equipment(
            equipment_id
        )
        for booking in active_bookings:
            if booking.id != booking_id and (
                available_from < booking.end_date and available_to > booking.start_date
            ):
                return False

        return True

    async def _check_availability(
        self,
        equipment_id: int,
        available_from: datetime,
        available_to: datetime,
    ) -> None:
        """Check if equipment is available for period.

        Args:
            equipment_id: Equipment ID
            available_from: Start date
            available_to: End date

        Raises:
            AvailabilityError: If equipment is not available
        """
        if not await self._is_available(equipment_id, available_from, available_to):
            raise AvailabilityError(
                str(equipment_id),  # resource_id
                'Equipment is not available for the specified period',
                details={
                    'equipment_id': equipment_id,
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
        """Check if equipment is available for period, excluding current booking.

        Args:
            equipment_id: Equipment ID
            booking_id: Current booking ID
            available_from: Start date
            available_to: End date

        Raises:
            AvailabilityError: If equipment is not available
        """
        if not await self._is_available_for_update(
            equipment_id, booking_id, available_from, available_to
        ):
            raise AvailabilityError(
                str(equipment_id),  # resource_id
                'Equipment is not available for the specified period',
                details={
                    'equipment_id': equipment_id,
                    'booking_id': booking_id,
                    'available_from': available_from.isoformat(),
                    'available_to': available_to.isoformat(),
                },
            )
