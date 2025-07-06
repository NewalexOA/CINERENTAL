"""Equipment service module.

This module implements business logic for managing rental equipment,
including inventory management, availability tracking, and equipment status updates.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy.sql import Select

from backend.exceptions import (
    AvailabilityError,
    BusinessError,
    ConflictError,
    NotFoundError,
    StateError,
    ValidationError,
)
from backend.models.booking import Booking, BookingStatus
from backend.models.equipment import Equipment, EquipmentStatus
from backend.repositories import BookingRepository, EquipmentRepository
from backend.schemas import EquipmentResponse
from backend.services.barcode import BarcodeService


class EquipmentService:
    """Service for managing equipment."""

    def __init__(
        self,
        session: AsyncSession,
        category_service: Optional[Any] = None,
    ) -> None:
        """Initialize service.

        Args:
            session: SQLAlchemy async session
            category_service: Optional Category service instance
        """
        self.session = session
        self.repository = EquipmentRepository(session)
        self.booking_repository = BookingRepository(session)
        self.barcode_service = BarcodeService(session)
        # Use injected category service or create a new one
        from backend.services.category import CategoryService

        self.category_service = category_service or CategoryService(session)

    async def _load_equipment_with_category(self, equipment: Equipment) -> Equipment:
        """Load equipment with category relationship.

        Args:
            equipment: Equipment instance

        Returns:
            Equipment instance with loaded category
        """
        stmt = (
            select(Equipment)
            .filter(Equipment.id == equipment.id)
            .options(joinedload(Equipment.category))
        )
        result = await self.session.execute(stmt)
        loaded_equipment = result.unique().scalar_one()
        return loaded_equipment

    async def create_equipment(
        self,
        name: str,
        description: Optional[str],
        category_id: int,
        replacement_cost: Optional[int] = 0,
        custom_barcode: Optional[str] = None,
        serial_number: Optional[str] = None,
        notes: Optional[str] = None,
        validate_barcode_format: bool = True,
    ) -> EquipmentResponse:
        """Create new equipment item.

        Args:
            name: Equipment name
            description: Equipment description
            category_id: Category ID
            replacement_cost: Equipment replacement cost
            custom_barcode: Optional custom barcode
            serial_number: Equipment serial number
            notes: Additional notes
            validate_barcode_format: Whether to validate custom barcode format

        Returns:
            Created equipment

        Raises:
            ValidationError: If validation fails
            ConflictError: If equipment with given barcode/serial number exists
            NotFoundError: If category not found
        """
        # Validate business rules
        if replacement_cost is not None and replacement_cost < 0:
            raise ValidationError('Replacement cost must be greater than or equal to 0')

        # Check if category exists
        await self.category_service.get_category(category_id)

        # Handle barcode generation or validation
        if custom_barcode:
            # Validate provided barcode if validation is enabled
            if (
                validate_barcode_format
                and not self.barcode_service.validate_barcode_format(custom_barcode)
            ):
                raise ValidationError(
                    'Invalid barcode format',
                    details={'barcode': custom_barcode},
                )

            # Check for duplicate barcode
            existing = await self.repository.get_by_barcode(custom_barcode)
            if existing:
                raise ConflictError(
                    f'Equipment with barcode {custom_barcode} already exists',
                    details={'barcode': custom_barcode},
                )

            barcode = custom_barcode
        else:
            # Generate barcode automatically
            barcode = await self.barcode_service.generate_barcode()

        # Create equipment object
        equipment = Equipment(
            name=name,
            description=description,
            category_id=category_id,
            barcode=barcode,
            serial_number=serial_number,
            replacement_cost=replacement_cost,
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

    async def get_equipment_list_query(
        self,
        status: Optional[EquipmentStatus] = None,
        category_id: Optional[int] = None,
        query: Optional[str] = None,
        available_from: Optional[datetime] = None,
        available_to: Optional[datetime] = None,
        include_deleted: bool = False,
    ) -> Select:
        """Get a paginatable query for equipment list with optional filtering.

        This method prepares the query for pagination by fastapi-pagination.

        Args:
            status: Filter by equipment status
            category_id: Filter by category ID (includes subcategories)
            query: Search query
            available_from: Filter by availability start date
            available_to: Filter by availability end date
            include_deleted: Whether to include deleted equipment

        Returns:
            SQLAlchemy Select query object

        Raises:
            BusinessError: If validation fails
            NotFoundError: If category not found
        """
        # Validate dates if both are provided
        if available_from and available_to and available_from >= available_to:
            raise BusinessError(
                'Start date must be before end date',
                details={
                    'available_from': available_from.isoformat(),
                    'available_to': available_to.isoformat(),
                },
            )

        # Ensure dates are timezone-aware
        if available_from and available_from.tzinfo is None:
            available_from = available_from.replace(tzinfo=timezone.utc)
        if available_to and available_to.tzinfo is None:
            available_to = available_to.replace(tzinfo=timezone.utc)

        # Get all category IDs including subcategories if category_id is provided
        category_ids = None
        if category_id is not None:
            try:
                category_ids = await self.category_service.get_all_subcategory_ids(
                    category_id
                )
            except ValueError:
                raise NotFoundError(f'Category with ID {category_id} not found')

        # Get the base query from the repository
        return self.repository.get_paginatable_query(
            status=status,
            category_id=category_id,
            category_ids=category_ids,
            query=query,
            available_from=available_from,
            available_to=available_to,
            include_deleted=include_deleted,
        )

    async def get_equipment_count_query(
        self,
        status: Optional[EquipmentStatus] = None,
        category_id: Optional[int] = None,
        query: Optional[str] = None,
        available_from: Optional[datetime] = None,
        available_to: Optional[datetime] = None,
        include_deleted: bool = False,
    ) -> Select:
        """Get a count query for equipment list with optional filtering.

        This method prepares the query for counting without ORDER BY clause
        to avoid PostgreSQL GROUP BY issues.

        Args:
            status: Filter by equipment status
            category_id: Filter by category ID (includes subcategories)
            query: Search query
            available_from: Filter by availability start date
            available_to: Filter by availability end date
            include_deleted: Whether to include deleted equipment

        Returns:
            SQLAlchemy Select query object without ORDER BY

        Raises:
            BusinessError: If validation fails
            NotFoundError: If category not found
        """
        # Validate dates if both are provided
        if available_from and available_to and available_from >= available_to:
            raise BusinessError(
                'Start date must be before end date',
                details={
                    'available_from': available_from.isoformat(),
                    'available_to': available_to.isoformat(),
                },
            )

        # Ensure dates are timezone-aware
        if available_from and available_from.tzinfo is None:
            available_from = available_from.replace(tzinfo=timezone.utc)
        if available_to and available_to.tzinfo is None:
            available_to = available_to.replace(tzinfo=timezone.utc)

        # Get all category IDs including subcategories if category_id is provided
        category_ids = None
        if category_id is not None:
            try:
                category_ids = await self.category_service.get_all_subcategory_ids(
                    category_id
                )
            except ValueError:
                raise NotFoundError(f'Category with ID {category_id} not found')

        # Get the count query from the repository
        return self.repository.get_count_query(
            status=status,
            category_id=category_id,
            category_ids=category_ids,
            query=query,
            available_from=available_from,
            available_to=available_to,
            include_deleted=include_deleted,
        )

    async def get_equipment_list(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[EquipmentStatus] = None,
        category_id: Optional[int] = None,
        query: Optional[str] = None,
        available_from: Optional[datetime] = None,
        available_to: Optional[datetime] = None,
        include_deleted: bool = False,
    ) -> List[EquipmentResponse]:
        """Get list of equipment with optional filtering.

        Args:
            skip: Number of items to skip
            limit: Maximum number of items to return
            status: Filter by equipment status
            category_id: Filter by category ID (includes subcategories)
            query: Search query
            available_from: Filter by availability start date
            available_to: Filter by availability end date
            include_deleted: Whether to include deleted equipment

        Returns:
            List of equipment items as EquipmentResponse objects

        Raises:
            BusinessError: If validation fails
            NotFoundError: If category not found
        """
        # Validate dates if both are provided
        if available_from and available_to and available_from >= available_to:
            raise BusinessError(
                'Start date must be before end date',
                details={
                    'available_from': available_from.isoformat(),
                    'available_to': available_to.isoformat(),
                },
            )

        # Get all category IDs including subcategories if category_id is provided
        category_ids = None
        if category_id is not None:
            try:
                category_ids = await self.category_service.get_all_subcategory_ids(
                    category_id
                )
            except ValueError:
                raise NotFoundError(f'Category with ID {category_id} not found')

        # Ensure dates are timezone-aware
        if available_from and available_from.tzinfo is None:
            available_from = available_from.replace(tzinfo=timezone.utc)
        if available_to and available_to.tzinfo is None:
            available_to = available_to.replace(tzinfo=timezone.utc)

        # Get equipment list using repository
        equipment_list = await self.repository.get_list(
            skip=skip,
            limit=limit,
            status=status,
            category_id=category_id,
            category_ids=category_ids,
            query=query,
            available_from=available_from,
            available_to=available_to,
            include_deleted=include_deleted,
        )

        # Load equipment with categories
        loaded_equipment = []
        for equipment in equipment_list:
            loaded = await self._load_equipment_with_category(equipment)
            loaded_equipment.append(loaded)

        # Convert to response objects with category names
        responses = []
        for equipment in loaded_equipment:
            # Create a dictionary with all equipment attributes
            equipment_dict = {
                'id': equipment.id,
                'name': equipment.name,
                'description': equipment.description,
                'category_id': equipment.category_id,
                'barcode': equipment.barcode,
                'serial_number': equipment.serial_number,
                'replacement_cost': equipment.replacement_cost,
                'status': equipment.status,
                'created_at': equipment.created_at,
                'updated_at': equipment.updated_at,
                'category_name': (
                    equipment.category.name if equipment.category else 'Без категории'
                ),
            }
            responses.append(EquipmentResponse.model_validate(equipment_dict))

        return responses

    async def update_equipment(
        self,
        equipment_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        category_id: Optional[int] = None,
        barcode: Optional[str] = None,
        serial_number: Optional[str] = None,
        replacement_cost: Optional[int] = None,
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
            replacement_cost: New replacement cost
            notes: New notes
            status: New status

        Returns:
            Updated equipment

        Raises:
            NotFoundError: If equipment or category not found
            ValidationError: If validation fails
            ConflictError: If equipment with given barcode/serial number exists
            StateError: If status transition is invalid
        """
        # Get existing equipment
        equipment = await self.get_equipment(equipment_id)

        # Check if category exists if provided
        if category_id is not None:
            await self.category_service.get_category(category_id)

        # Check for duplicate barcode
        if barcode and barcode != equipment.barcode:
            existing = await self.repository.get_by_barcode(barcode)
            if existing:
                raise ConflictError(
                    f'Equipment with barcode {barcode} already exists',
                    details={'barcode': barcode},
                )

        # Validate replacement cost
        if replacement_cost is not None and replacement_cost < 0:
            raise ValidationError('Replacement cost must be greater than or equal to 0')

        # Check status transition
        if status and not self._is_valid_status_transition(equipment.status, status):
            raise StateError(
                f'Invalid status transition from {equipment.status} to {status}',
                details={
                    'current_status': equipment.status,
                    'new_status': status,
                },
            )

        # Update fields
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
        if replacement_cost is not None:
            equipment.replacement_cost = replacement_cost
        if notes is not None:
            equipment.notes = notes
        if status is not None:
            equipment.status = status

        # Save changes
        updated_equipment = await self.repository.update(equipment)
        loaded_equipment = await self._load_equipment_with_category(updated_equipment)
        return loaded_equipment

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
        # Allow any status transitions - all transitions are now valid
        return True

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

        deleted_equipment = await self.repository.soft_delete(equipment.id)
        return deleted_equipment is not None

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

    async def get_by_barcode(self, barcode: str) -> Optional[Equipment]:
        """Get equipment by barcode.

        Args:
            barcode: Equipment barcode

        Returns:
            Equipment if found, None otherwise
        """
        equipment = await self.repository.get_by_barcode(barcode)
        if equipment:
            # Load associated category
            return await self._load_equipment_with_category(equipment)
        return None

    async def regenerate_barcode(self, equipment_id: int) -> EquipmentResponse:
        """Regenerate barcode for equipment.

        Args:
            equipment_id: Equipment ID

        Returns:
            Updated equipment with new barcode

        Raises:
            NotFoundError: If equipment not found
        """
        # Get equipment
        equipment = await self.get_equipment(equipment_id)
        if not equipment:
            raise NotFoundError(
                f'Equipment with ID {equipment_id} not found',
                details={'equipment_id': equipment_id},
            )

        # Use barcode service to generate new barcode
        barcode_service = BarcodeService(self.session)
        new_barcode = await barcode_service.generate_barcode()

        # Update equipment
        equipment.barcode = new_barcode
        # Save changes to DB
        await self.session.commit()
        await self.session.refresh(equipment)

        # Load equipment with category for response
        loaded_equipment = await self._load_equipment_with_category(equipment)

        return EquipmentResponse.model_validate(loaded_equipment)

    async def get_by_serial_number(self, serial_number: str) -> Optional[Equipment]:
        """Get equipment by serial number.

        Args:
            serial_number: Equipment serial number

        Returns:
            Equipment if found, None otherwise
        """
        equipment = await self.repository.get_by_serial_number(serial_number)
        if equipment:
            # Load associated category
            return await self._load_equipment_with_category(equipment)
        return None

    async def change_status(
        self,
        equipment_id: int,
        new_status: EquipmentStatus,
    ) -> EquipmentResponse:
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
        if (
            new_status != EquipmentStatus.RENTED
            and new_status != EquipmentStatus.AVAILABLE
        ):
            active_bookings = await self.booking_repository.get_active_by_equipment(
                equipment_id
            )
            # Filter out PENDING and CONFIRMED bookings for certain status transitions
            if new_status == EquipmentStatus.MAINTENANCE:
                # For maintenance, only block if there are ACTIVE or OVERDUE bookings
                active_bookings = [
                    b
                    for b in active_bookings
                    if b.booking_status in [BookingStatus.ACTIVE, BookingStatus.OVERDUE]
                ]

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

        # Update equipment status
        equipment.status = new_status
        updated_equipment = await self.repository.update(equipment)
        loaded_equipment = await self._load_equipment_with_category(updated_equipment)
        return EquipmentResponse.model_validate(loaded_equipment)

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

        # Equipment without serial number (consumables/cables) is always available
        if not equipment.serial_number or equipment.serial_number.strip() == '':
            return True

        # Ensure dates are timezone-aware
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)

        # Validate dates
        if start_date > end_date:
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

        # Load equipment with categories
        loaded_equipment = []
        for equipment in equipment_list:
            loaded = await self._load_equipment_with_category(equipment)
            loaded_equipment.append(loaded)

        # Convert to response objects with category names
        responses = []
        for equipment in loaded_equipment:
            equipment_dict = {
                'id': equipment.id,
                'name': equipment.name,
                'description': equipment.description,
                'category_id': equipment.category_id,
                'barcode': equipment.barcode,
                'serial_number': equipment.serial_number,
                'replacement_cost': equipment.replacement_cost,
                'status': equipment.status,
                'created_at': equipment.created_at,
                'updated_at': equipment.updated_at,
                'category_name': (
                    equipment.category.name if equipment.category else 'Без категории'
                ),
            }
            responses.append(EquipmentResponse.model_validate(equipment_dict))

        return responses

    async def search(
        self,
        query: str,
        include_deleted: bool = False,
    ) -> List[Equipment]:
        """Search equipment by name or description.

        Args:
            query: Search query
            include_deleted: Whether to include deleted equipment in search results

        Returns:
            List of matching equipment

        Raises:
            ValidationError: If query is empty or contains only whitespace
        """
        if not query or query.isspace():
            raise ValidationError('Search query cannot be empty')

        # Use keyword arguments to match the repository signature
        equipment_list = await self.repository.search(
            query_str=query,
            include_deleted=include_deleted,
            # Add sort_by, sort_order here if needed
        )

        # Load equipment with categories
        loaded_equipment = []
        for equipment in equipment_list:
            loaded = await self._load_equipment_with_category(equipment)
            loaded_equipment.append(loaded)

        return loaded_equipment

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

    async def get_equipment_bookings(self, equipment_id: int) -> List[Booking]:
        """Get equipment bookings.

        Args:
            equipment_id: Equipment ID

        Returns:
            List of bookings

        Raises:
            NotFoundError: If equipment not found
        """
        # Check if equipment exists
        await self.get_equipment(equipment_id)

        # Query bookings directly
        query = select(Booking).where(Booking.equipment_id == equipment_id)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def refresh_equipment_status(self, equipment_id: int) -> Equipment:
        """Refresh equipment status based on its active bookings.

        Args:
            equipment_id: Equipment ID

        Returns:
            Updated equipment

        Raises:
            NotFoundError: If equipment not found
        """
        equipment = await self.get_equipment(equipment_id)

        # Get active bookings for this equipment
        active_bookings = await self.booking_repository.get_active_by_equipment(
            equipment_id
        )

        # Filter to truly active bookings (only ACTIVE status matters, not payment)
        active_bookings = [
            b for b in active_bookings if b.booking_status == BookingStatus.ACTIVE
        ]

        # If there are active bookings, set status to RENTED
        if active_bookings and equipment.status == EquipmentStatus.AVAILABLE:
            equipment.status = EquipmentStatus.RENTED
            updated_equipment = await self.repository.update(equipment)
            return updated_equipment
        # If no active bookings and equipment is RENTED, set it back to AVAILABLE
        elif not active_bookings and equipment.status == EquipmentStatus.RENTED:
            equipment.status = EquipmentStatus.AVAILABLE
            updated_equipment = await self.repository.update(equipment)
            return updated_equipment

        return equipment

    async def get_equipment_list_with_rental_status(
        self, skip: int = 0, limit: int = 100, filters: Optional[Dict] = None
    ) -> List[EquipmentResponse]:
        """Get equipment list with rental status information.

        Uses two-query approach for optimal performance:
        1. Main query for equipment with pagination
        2. Separate query for active projects data

        Args:
            skip: Number of items to skip for pagination
            limit: Maximum number of items to return
            filters: Optional filters dictionary

        Returns:
            List of EquipmentResponse with rental status information
        """
        # Use proper pagination parameters
        equipment_list = await self.get_equipment_list(
            skip=skip,
            limit=limit,
            status=filters.get('status') if filters else None,
            category_id=filters.get('category_id') if filters else None,
            query=filters.get('query') if filters else None,
            include_deleted=filters.get('include_deleted', False) if filters else False,
        )

        # Get equipment IDs for project lookup
        equipment_ids = [eq.id for eq in equipment_list]

        # Get active projects for these equipment items
        active_projects = await self._get_active_projects_for_equipment(equipment_ids)

        # Combine data and create enhanced responses
        enhanced_items = []
        for equipment_response in equipment_list:
            projects = active_projects.get(equipment_response.id, [])
            # Convert to dict and add active_projects
            equipment_dict = equipment_response.model_dump()
            equipment_dict['active_projects'] = projects
            enhanced_item = EquipmentResponse.model_validate(equipment_dict)
            enhanced_items.append(enhanced_item)

        return enhanced_items

    async def _get_active_projects_for_equipment(
        self, equipment_ids: List[int]
    ) -> Dict[int, List[Dict]]:
        """Get active projects for given equipment IDs.

        Args:
            equipment_ids: List of equipment IDs

        Returns:
            Mapping: equipment_id -> list of project info
        """
        if not equipment_ids:
            return {}

        # Use repository method to get raw data
        rows = await self.repository.get_active_projects_for_equipment(equipment_ids)

        # Group by equipment_id (business logic stays in service)
        projects_by_equipment: Dict[int, List[Dict]] = {}
        for row in rows:
            equipment_id = row['equipment_id']
            if equipment_id not in projects_by_equipment:
                projects_by_equipment[equipment_id] = []

            date_range = (
                f"{row['start_date'].strftime('%d.%m')} - "
                f"{row['end_date'].strftime('%d.%m')}"
            )
            projects_by_equipment[equipment_id].append(
                {
                    'id': row['project_id'],
                    'name': row['project_name'],
                    'dates': date_range,
                }
            )

        return projects_by_equipment
