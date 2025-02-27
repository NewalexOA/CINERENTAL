"""Booking service module.

This module implements business logic for managing equipment bookings.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import (
    AvailabilityError,
    DateError,
    DurationError,
    NotFoundError,
    StateError,
    StatusTransitionError,
    ValidationError,
)
from backend.models import Booking, BookingStatus, EquipmentStatus, PaymentStatus
from backend.repositories import BookingRepository, EquipmentRepository
from backend.services.equipment import EquipmentService

# Constants for booking validation
MIN_BOOKING_DURATION = timedelta(days=1)  # Minimum booking duration
MAX_BOOKING_DURATION = timedelta(days=365)  # Maximum booking duration
MAX_ADVANCE_DAYS = 365  # Maximum days in advance for booking


class BookingService:
    """Service for managing bookings."""

    def __init__(self, db_session: AsyncSession) -> None:
        """Initialize service.

        Args:
            db_session: Database session
        """
        self.repository = BookingRepository(db_session)
        self.equipment_repository = EquipmentRepository(db_session)
        self.equipment_service = EquipmentService(db_session)

    async def create_booking(
        self,
        client_id: int,
        equipment_id: int,
        start_date: datetime,
        end_date: datetime,
        total_amount: float,
        deposit_amount: float,
        notes: Optional[str] = None,
    ) -> Booking:
        """Create new booking.

        Args:
            client_id: Client ID
            equipment_id: Equipment ID
            start_date: Start date of booking
            end_date: End date of booking
            total_amount: Total booking amount
            deposit_amount: Required deposit amount
            notes: Additional notes (optional)

        Returns:
            Created booking with related objects loaded

        Raises:
            ValueError: If any validation fails
            NotFoundError: If equipment is not found
        """
        try:
            # Validate IDs
            if client_id <= 0:
                raise ValidationError('Client ID must be positive')
            if equipment_id <= 0:
                raise ValidationError('Equipment ID must be positive')

            # Ensure dates are timezone-aware
            if start_date.tzinfo is None:
                start_date = start_date.replace(tzinfo=timezone.utc)
            if end_date.tzinfo is None:
                end_date = end_date.replace(tzinfo=timezone.utc)

            # Get current time in UTC
            now = datetime.now(timezone.utc)

            # Validate start date
            if start_date < now:
                raise DateError(
                    'Start date cannot be in the past',
                    start_date=start_date,
                    end_date=end_date,
                )

            # Validate end date
            if end_date <= start_date:
                raise DateError(
                    'End date must be after start date',
                    start_date=start_date,
                    end_date=end_date,
                )

            # Validate booking duration
            duration = end_date - start_date
            duration_days = duration.days
            if duration < MIN_BOOKING_DURATION:
                raise DurationError(
                    'Booking duration must be at least '
                    f'{MIN_BOOKING_DURATION.days} day(s)',
                    min_days=MIN_BOOKING_DURATION.days,
                    actual_days=duration_days,
                )
            if duration > MAX_BOOKING_DURATION:
                raise DurationError(
                    f'Booking duration cannot exceed {MAX_BOOKING_DURATION.days} days',
                    max_days=MAX_BOOKING_DURATION.days,
                    actual_days=duration_days,
                )

            # Validate advance booking
            max_advance = now + timedelta(days=MAX_ADVANCE_DAYS)
            if start_date > max_advance:
                raise DateError(
                    'Booking too far in advance',
                    start_date=start_date,
                    details={'max_advance_date': max_advance.isoformat()},
                )

            # Check if equipment exists
            equipment = await self.equipment_repository.get(equipment_id)
            if not equipment:
                raise NotFoundError(
                    f'Equipment {equipment_id} not found',
                    details={'equipment_id': equipment_id},
                )

            # Check equipment availability
            if not await self.equipment_repository.check_availability(
                equipment_id, start_date, end_date
            ):
                raise AvailabilityError(
                    message=f'Equipment {equipment_id} is not available',
                    resource_id=str(equipment_id),
                    resource_type='equipment',
                    details={
                        'equipment_id': equipment_id,
                        'start_date': start_date.isoformat(),
                        'end_date': end_date.isoformat(),
                    },
                )

            # Create booking
            booking = Booking(
                client_id=client_id,
                equipment_id=equipment_id,
                start_date=start_date,
                end_date=end_date,
                total_amount=Decimal(str(total_amount)),
                deposit_amount=Decimal(str(deposit_amount)),
                notes=notes,
            )
            created_booking = await self.repository.create(booking)

            # Load related objects
            return await self.get_booking_with_relations(created_booking.id)
        except (
            ValidationError,
            DateError,
            DurationError,
            StateError,
        ) as e:
            # Convert domain-specific errors to ValueError for compatibility
            raise ValueError(str(e)) from e
        except AvailabilityError:
            # Re-raise AvailabilityError without converting
            raise

    async def update_booking(
        self,
        booking_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        total_amount: Optional[float] = None,
        deposit_amount: Optional[float] = None,
        paid_amount: Optional[float] = None,
        notes: Optional[str] = None,
    ) -> Booking:
        """Update booking.

        Args:
            booking_id: Booking ID
            start_date: New start date (optional)
            end_date: New end date (optional)
            total_amount: New total amount (optional)
            deposit_amount: New deposit amount (optional)
            paid_amount: New paid amount (optional)
            notes: New notes (optional)

        Returns:
            Updated booking with related objects loaded

        Raises:
            ValidationError: If booking_id is not positive
            NotFoundError: If booking is not found
            DateError: If new dates are invalid
            StateError: If equipment is not available for new dates
            ValueError: If any validation fails
        """
        try:
            if booking_id <= 0:
                raise ValidationError('Booking ID must be positive')

            booking = await self.repository.get(booking_id)
            if not booking:
                raise NotFoundError(
                    f'Booking with ID {booking_id} not found',
                    details={'booking_id': booking_id},
                )

            if start_date and end_date:
                # Validate dates
                if start_date >= end_date:
                    raise DateError(
                        'End date must be after start date',
                        start_date=start_date,
                        end_date=end_date,
                    )

                # Check if new dates overlap with other bookings
                if not await self.equipment_repository.check_availability(
                    booking.equipment_id,
                    start_date,
                    end_date,
                    exclude_booking_id=booking_id,
                ):
                    raise AvailabilityError(
                        message=f'Equipment {booking.equipment_id} is not available',
                        resource_id=str(booking.equipment_id),
                        resource_type='equipment',
                        details={
                            'equipment_id': booking.equipment_id,
                            'start_date': start_date.isoformat(),
                            'end_date': end_date.isoformat(),
                        },
                    )

            # Update fields if provided
            if start_date:
                booking.start_date = start_date
            if end_date:
                booking.end_date = end_date
            if total_amount is not None:
                booking.total_amount = Decimal(str(total_amount))
            if deposit_amount is not None:
                booking.deposit_amount = Decimal(str(deposit_amount))
            if paid_amount is not None:
                booking.paid_amount = Decimal(str(paid_amount))
            if notes is not None:
                booking.notes = notes

            # Ensure equipment_id is preserved
            booking.equipment_id = booking.equipment_id

            updated_booking = await self.repository.update(booking)
            return await self.get_booking_with_relations(updated_booking.id)
        except (ValidationError, DateError, StateError) as e:
            # Do not convert domain-specific errors to ValueError
            if isinstance(e, NotFoundError):
                raise
            raise e
        except AvailabilityError:
            # Re-raise AvailabilityError without converting
            raise

    async def get_booking(self, booking_id: int) -> Booking:
        """Get booking by ID.

        Args:
            booking_id: Booking ID

        Returns:
            Booking if found

        Raises:
            ValidationError: If booking_id is not positive
            NotFoundError: If booking is not found
        """
        if booking_id <= 0:
            raise ValidationError('Booking ID must be positive')

        booking = await self.repository.get(booking_id)
        if not booking:
            raise NotFoundError(
                f'Booking with ID {booking_id} not found',
                details={'booking_id': booking_id},
            )
        return booking

    async def get_bookings(self) -> List[Booking]:
        """Get all bookings.

        Returns:
            List of all bookings
        """
        return await self.repository.get_all()

    async def get_by_client(self, client_id: int) -> List[Booking]:
        """Get bookings by client.

        Args:
            client_id: Client ID

        Returns:
            List of client's bookings

        Raises:
            ValidationError: If client_id is not positive
        """
        if client_id <= 0:
            raise ValidationError('Client ID must be positive')
        return await self.repository.get_by_client(client_id)

    async def get_by_equipment(self, equipment_id: int) -> List[Booking]:
        """Get bookings by equipment.

        Args:
            equipment_id: Equipment ID

        Returns:
            List of equipment's bookings

        Raises:
            ValidationError: If equipment_id is not positive
        """
        if equipment_id <= 0:
            raise ValidationError('Equipment ID must be positive')
        return await self.repository.get_by_equipment(equipment_id)

    async def get_active_for_period(
        self, start_date: datetime, end_date: datetime
    ) -> List[Booking]:
        """Get active bookings for period.

        Args:
            start_date: Period start date
            end_date: Period end date

        Returns:
            List of active bookings for period

        Raises:
            DateError: If dates are invalid
        """
        if start_date >= end_date:
            raise DateError(
                'End date must be after start date',
                start_date=start_date,
                end_date=end_date,
            )
        return await self.repository.get_active_for_period(start_date, end_date)

    async def get_by_status(self, status: BookingStatus) -> List[Booking]:
        """Get bookings by status.

        Args:
            status: Booking status

        Returns:
            List of bookings with specified status

        Raises:
            ValidationError: If status is invalid
        """
        if not isinstance(status, BookingStatus):
            raise ValidationError(
                'Invalid booking status',
                details={'status': str(status)},
            )
        return await self.repository.get_by_status(status)

    async def get_by_payment_status(self, status: PaymentStatus) -> List[Booking]:
        """Get bookings by payment status.

        Args:
            status: Payment status

        Returns:
            List of bookings with specified status

        Raises:
            ValidationError: If status is invalid
        """
        if not isinstance(status, PaymentStatus):
            raise ValidationError(
                'Invalid payment status',
                details={'status': str(status)},
            )
        return await self.repository.get_by_payment_status(status)

    async def get_overdue(self, now: datetime) -> List[Booking]:
        """Get overdue bookings.

        Args:
            now: Current datetime

        Returns:
            List of overdue bookings
        """
        now = datetime.now(timezone.utc)
        return await self.repository.get_overdue(now)

    async def delete_booking(self, booking_id: int) -> None:
        """Delete booking.

        This is a soft delete that changes the booking status to CANCELLED.

        Args:
            booking_id: Booking ID

        Raises:
            NotFoundError: If booking is not found
        """
        # First check if booking exists
        await self.get_booking(booking_id)

        # Then change status to CANCELLED
        await self.change_status(booking_id, BookingStatus.CANCELLED)

    async def change_status(
        self,
        booking_id: int,
        new_status: BookingStatus,
    ) -> Booking:
        """Change booking status.

        Args:
            booking_id: Booking ID
            new_status: New booking status

        Returns:
            Updated booking with related objects loaded

        Raises:
            NotFoundError: If booking not found
            StatusTransitionError: If status transition is not allowed
            StateError: If booking cannot be activated without payment
        """
        booking = await self.repository.get(booking_id)
        if not booking:
            raise NotFoundError(f'Booking with ID {booking_id} not found')

        # Check if status transition is allowed
        allowed_transitions: dict[BookingStatus, list[BookingStatus]] = {
            BookingStatus.PENDING: [
                BookingStatus.CONFIRMED,
                BookingStatus.CANCELLED,
                BookingStatus.ACTIVE,  # Allow direct activation for quick bookings
            ],
            BookingStatus.CONFIRMED: [
                BookingStatus.ACTIVE,
                BookingStatus.CANCELLED,
            ],
            BookingStatus.ACTIVE: [
                BookingStatus.COMPLETED,
                BookingStatus.OVERDUE,
                BookingStatus.CANCELLED,
            ],
            BookingStatus.COMPLETED: [],  # Terminal state
            BookingStatus.CANCELLED: [],  # Terminal state
            BookingStatus.OVERDUE: [
                BookingStatus.COMPLETED,
                BookingStatus.CANCELLED,
            ],
        }

        current_status = booking.booking_status
        if current_status not in allowed_transitions:
            allowed = []
        else:
            allowed = allowed_transitions[current_status]

        if new_status not in allowed:
            msg = f'Invalid status transition from {current_status} to {new_status}'
            raise StatusTransitionError(
                msg,
                current_status=current_status,
                new_status=new_status,
            )

        # Additional validation for specific transitions
        if new_status == BookingStatus.ACTIVE:
            # Check payment status
            if booking.payment_status != PaymentStatus.PAID:
                raise StateError('Cannot activate booking without payment')

            # Check equipment availability
            equipment = await self.equipment_repository.get(booking.equipment_id)
            if not equipment or equipment.status not in [
                EquipmentStatus.AVAILABLE,
                EquipmentStatus.RENTED,
            ]:
                raise StateError('Equipment is not available for booking')

            # Check for overlapping bookings
            is_available = await self.equipment_repository.check_availability(
                equipment.id,
                booking.start_date,
                booking.end_date,
                exclude_booking_id=booking.id,
            )
            if not is_available:
                raise StateError('Equipment is already booked for this period')

        booking.booking_status = new_status

        if new_status == BookingStatus.ACTIVE:
            await self.equipment_service.change_status(
                booking.equipment_id,
                EquipmentStatus.RENTED,
            )
        elif new_status in [BookingStatus.COMPLETED, BookingStatus.CANCELLED]:
            await self.equipment_service.change_status(
                booking.equipment_id,
                EquipmentStatus.AVAILABLE,
            )

        updated_booking = await self.repository.update(booking)

        return await self.get_booking_with_relations(updated_booking.id)

    async def change_payment_status(
        self, booking_id: int, status: PaymentStatus
    ) -> Booking:
        """Change booking payment status.

        Args:
            booking_id: Booking ID
            status: New payment status

        Returns:
            Updated booking with related objects loaded

        Raises:
            NotFoundError: If booking is not found
            StatusTransitionError: If status transition is invalid
        """
        booking = await self.repository.get(booking_id)
        if not booking:
            raise NotFoundError(
                f'Booking with ID {booking_id} not found',
                details={'booking_id': booking_id},
            )

        # Define allowed transitions
        allowed_transitions: dict[str, list[str]] = {
            PaymentStatus.PENDING.value: [
                PaymentStatus.PARTIAL.value,
                PaymentStatus.PAID.value,
            ],
            PaymentStatus.PARTIAL.value: [PaymentStatus.PAID.value],
            PaymentStatus.PAID.value: [],
            PaymentStatus.REFUNDED.value: [],
            PaymentStatus.OVERDUE.value: [PaymentStatus.PAID.value],
        }

        current_status = booking.payment_status.value
        new_status = status.value
        allowed = allowed_transitions.get(current_status, [])
        if new_status not in allowed:
            raise StatusTransitionError(
                f'Invalid payment status transition from {current_status} '
                f'to {new_status}',
                current_status=current_status,
                new_status=new_status,
                allowed_transitions=allowed,
            )

        booking.payment_status = status
        updated_booking = await self.repository.update(booking)

        return await self.get_booking_with_relations(updated_booking.id)

    async def _check_equipment_availability(
        self,
        equipment_ids: list[int],
        available_from: datetime,
        available_to: datetime,
    ) -> None:
        """Check if all equipment is available for the given time period.

        Args:
            equipment_ids: List of equipment IDs to check
            available_from: Start of the period
            available_to: End of the period

        Raises:
            AvailabilityError: If any equipment is not available
        """
        for equipment_id in equipment_ids:
            if not await self.equipment_repository.check_availability(
                equipment_id, available_from, available_to
            ):
                raise AvailabilityError(
                    message='Equipment is not available for the specified time period',
                    resource_id=str(equipment_id),
                    resource_type='equipment',
                    details={
                        'available_from': available_from.isoformat(),
                        'available_to': available_to.isoformat(),
                    },
                )

    async def _check_equipment_availability_for_update(
        self,
        equipment_ids: list[int],
        booking_id: int,
        available_from: datetime,
        available_to: datetime,
    ) -> None:
        """Check if all equipment is available for the given time period.

        This check excludes the current booking from availability verification.

        Args:
            equipment_ids: List of equipment IDs to check
            booking_id: ID of the current booking to exclude from check
            available_from: Start of the period
            available_to: End of the period

        Raises:
            AvailabilityError: If any equipment is not available
        """
        for equipment_id in equipment_ids:
            is_available = await self.equipment_repository.check_availability(
                equipment_id,
                available_from,
                available_to,
                exclude_booking_id=booking_id,
            )
            if not is_available:
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

    async def get_booking_with_relations(self, booking_id: int) -> Booking:
        """Get booking with related objects loaded.

        Args:
            booking_id: Booking ID

        Returns:
            Booking with related objects loaded

        Raises:
            NotFoundError: If booking is not found
        """
        # First check if the booking exists
        if booking_id <= 0:
            raise ValidationError('Booking ID must be positive')

        # Use the repository to get the booking with relations
        booking = await self.repository.get_with_relations(booking_id)
        if booking is None:
            raise NotFoundError(
                f'Booking with ID {booking_id} not found',
                details={'booking_id': booking_id},
            )

        return booking
