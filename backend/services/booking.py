"""Booking service module.

This module implements business logic for managing equipment bookings.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.booking import Booking, BookingStatus, PaymentStatus
from backend.models.equipment import EquipmentStatus
from backend.repositories.booking import BookingRepository
from backend.repositories.equipment import EquipmentRepository


class BookingService:
    """Service for managing bookings."""

    def __init__(self, db_session: AsyncSession) -> None:
        """Initialize service.

        Args:
            db_session: Database session
        """
        self.repository = BookingRepository(db_session)
        self.equipment_repository = EquipmentRepository(db_session)

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
            Created booking

        Raises:
            ValueError: If equipment is not available for the specified period
                      or if start date is in the past
                      or if end date is before start date
                      or if booking is too far in advance
        """
        # Validate start date
        now = datetime.now(timezone.utc)
        if start_date < now:
            raise ValueError('Start date cannot be in the past')

        # Validate end date
        if end_date <= start_date:
            raise ValueError('End date must be after start date')

        # Validate booking period
        max_advance = now + timedelta(days=365)
        if start_date > max_advance:
            raise ValueError('Booking too far in advance')

        # Check equipment availability
        if not await self.equipment_repository.check_availability(
            equipment_id, start_date, end_date
        ):
            raise ValueError(f'Equipment {equipment_id} is not available')

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
        return await self.repository.create(booking)

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
        """Update booking details.

        Args:
            booking_id: Booking ID
            start_date: New start date (optional)
            end_date: New end date (optional)
            total_amount: New total amount (optional)
            deposit_amount: New deposit amount (optional)
            paid_amount: New paid amount (optional)
            notes: New notes (optional)

        Returns:
            Updated booking

        Raises:
            ValueError: If booking is not found or new dates overlap with other bookings
        """
        booking = await self.repository.get(booking_id)
        if not booking:
            raise ValueError('Booking not found')

        if start_date and end_date:
            # Check if new dates overlap with other bookings
            if not await self.equipment_repository.check_availability(
                booking.equipment_id,
                start_date,
                end_date,
                exclude_booking_id=booking_id,
            ):
                raise ValueError(f'Equipment {booking.equipment_id} is not available')

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

        return await self.repository.update(booking)

    async def get_booking(self, booking_id: int) -> Optional[Booking]:
        """Get booking by ID.

        Args:
            booking_id: Booking ID

        Returns:
            Booking if found, None otherwise
        """
        return await self.repository.get(booking_id)

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
        """
        return await self.repository.get_by_client(client_id)

    async def get_by_equipment(self, equipment_id: int) -> List[Booking]:
        """Get bookings by equipment.

        Args:
            equipment_id: Equipment ID

        Returns:
            List of equipment's bookings
        """
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
        """
        return await self.repository.get_active_for_period(start_date, end_date)

    async def get_by_status(self, status: BookingStatus) -> List[Booking]:
        """Get bookings by status.

        Args:
            status: Booking status

        Returns:
            List of bookings with specified status
        """
        return await self.repository.get_by_status(status)

    async def get_by_payment_status(self, status: PaymentStatus) -> List[Booking]:
        """Get bookings by payment status.

        Args:
            status: Payment status

        Returns:
            List of bookings with specified payment status
        """
        return await self.repository.get_by_payment_status(status)

    async def get_overdue(self) -> List[Booking]:
        """Get overdue bookings.

        Returns:
            List of overdue bookings
        """
        now = datetime.now(timezone.utc)
        return await self.repository.get_overdue(now)

    async def change_status(self, booking_id: int, status: BookingStatus) -> Booking:
        """Change booking status.

        Args:
            booking_id: Booking ID
            status: New status

        Returns:
            Updated booking

        Raises:
            ValueError: If booking is not found or status transition is invalid
        """
        booking = await self.repository.get(booking_id)
        if not booking:
            raise ValueError('Booking not found')

        # Define allowed transitions
        allowed_transitions = {
            BookingStatus.PENDING: [
                BookingStatus.CONFIRMED,
                BookingStatus.ACTIVE,
                BookingStatus.CANCELLED,
            ],
            BookingStatus.CONFIRMED: [
                BookingStatus.ACTIVE,
                BookingStatus.CANCELLED,
            ],
            BookingStatus.ACTIVE: [
                BookingStatus.COMPLETED,
                BookingStatus.CANCELLED,
                BookingStatus.OVERDUE,
            ],
            BookingStatus.COMPLETED: [],
            BookingStatus.CANCELLED: [],
            BookingStatus.OVERDUE: [
                BookingStatus.COMPLETED,
                BookingStatus.CANCELLED,
            ],
        }

        allowed = allowed_transitions.get(booking.booking_status, [])
        if not isinstance(allowed, list):
            allowed = []
        if status not in allowed:
            msg = f'Invalid status transition from {booking.booking_status} to {status}'
            raise ValueError(msg)

        booking.booking_status = status

        # Update equipment status based on booking status
        if status == BookingStatus.ACTIVE:
            equipment = await self.equipment_repository.get(booking.equipment_id)
            if equipment:
                equipment.status = EquipmentStatus.RENTED
                await self.equipment_repository.update(equipment)
        elif status in [BookingStatus.COMPLETED, BookingStatus.CANCELLED]:
            equipment = await self.equipment_repository.get(booking.equipment_id)
            if equipment:
                equipment.status = EquipmentStatus.AVAILABLE
                await self.equipment_repository.update(equipment)

        return await self.repository.update(booking)

    async def change_payment_status(
        self, booking_id: int, status: PaymentStatus
    ) -> Booking:
        """Change booking payment status.

        Args:
            booking_id: Booking ID
            status: New payment status

        Returns:
            Updated booking

        Raises:
            ValueError: If booking is not found or status transition is invalid
        """
        booking = await self.repository.get(booking_id)
        if not booking:
            raise ValueError('Booking not found')

        # Define allowed transitions
        allowed_transitions = {
            PaymentStatus.PENDING: [PaymentStatus.PARTIAL, PaymentStatus.PAID],
            PaymentStatus.PARTIAL: [PaymentStatus.PAID],
            PaymentStatus.PAID: [],
            PaymentStatus.REFUNDED: [],
        }

        allowed = allowed_transitions.get(booking.payment_status, [])
        if not isinstance(allowed, list):
            allowed = []
        if status not in allowed:
            msg = (
                f'Invalid payment status transition from '
                f'{booking.payment_status} to {status}'
            )
            raise ValueError(msg)

        booking.payment_status = status
        return await self.repository.update(booking)
