"""Booking service module.

This module implements business logic for managing equipment bookings,
including availability checks, booking creation, and status management.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.booking import Booking, BookingStatus, PaymentStatus
from backend.repositories.booking import BookingRepository
from backend.repositories.equipment import EquipmentRepository


class BookingService:
    """Service for managing bookings."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize service.

        Args:
            session: SQLAlchemy async session
        """
        self.session = session
        self.repository = BookingRepository(session)
        self.equipment_repository = EquipmentRepository(session)

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
        """
        # Check equipment availability
        is_available = await self.equipment_repository.check_availability(
            equipment_id, start_date, end_date
        )
        if not is_available:
            msg = (
                f'Equipment {equipment_id} is not available '
                f'from {start_date} to {end_date}'
            )
            raise ValueError(msg)

        return await self.repository.create(
            client_id=client_id,
            equipment_id=equipment_id,
            start_date=start_date,
            end_date=end_date,
            total_amount=total_amount,
            deposit_amount=deposit_amount,
            paid_amount=0,
            notes=notes,
            booking_status=BookingStatus.PENDING,
            payment_status=PaymentStatus.PENDING,
        )

    async def update_booking(
        self,
        booking_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        total_amount: Optional[float] = None,
        deposit_amount: Optional[float] = None,
        paid_amount: Optional[float] = None,
        notes: Optional[str] = None,
    ) -> Optional[Booking]:
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
            Updated booking if found, None otherwise

        Raises:
            ValueError: If new dates overlap with other bookings
        """
        booking = await self.repository.get(booking_id)
        if not booking:
            return None

        if start_date or end_date:
            # Check equipment availability for new dates
            is_available = await self.equipment_repository.check_availability(
                booking.equipment_id,
                start_date or booking.start_date,
                end_date or booking.end_date,
            )
            if not is_available:
                msg = (
                    f'Equipment {booking.equipment_id} is not available '
                    f'for the new dates'
                )
                raise ValueError(msg)

        update_data: Dict[str, Any] = {}
        if start_date is not None:
            update_data['start_date'] = start_date
        if end_date is not None:
            update_data['end_date'] = end_date
        if total_amount is not None:
            update_data['total_amount'] = total_amount
        if deposit_amount is not None:
            update_data['deposit_amount'] = deposit_amount
        if paid_amount is not None:
            update_data['paid_amount'] = paid_amount
            # Update payment status based on paid amount
            if total_amount is not None and paid_amount >= total_amount:
                update_data['payment_status'] = PaymentStatus.PAID
            elif paid_amount > 0:
                update_data['payment_status'] = PaymentStatus.PARTIAL
        if notes is not None:
            update_data['notes'] = notes

        if update_data:
            return await self.repository.update(booking_id, **update_data)
        return booking

    async def change_status(
        self, booking_id: int, status: BookingStatus
    ) -> Optional[Booking]:
        """Change booking status.

        Args:
            booking_id: Booking ID
            status: New status

        Returns:
            Updated booking if found, None otherwise
        """
        return await self.repository.update(booking_id, booking_status=status)

    async def change_payment_status(
        self, booking_id: int, status: PaymentStatus
    ) -> Optional[Booking]:
        """Change booking payment status.

        Args:
            booking_id: Booking ID
            status: New payment status

        Returns:
            Updated booking if found, None otherwise
        """
        return await self.repository.update(booking_id, payment_status=status)

    async def get_bookings(self) -> List[Booking]:
        """Get all bookings.

        Returns:
            List of all bookings
        """
        return await self.repository.get_all()

    async def get_booking(self, booking_id: int) -> Optional[Booking]:
        """Get booking by ID.

        Args:
            booking_id: Booking ID

        Returns:
            Booking if found, None otherwise
        """
        return await self.repository.get(booking_id)

    async def get_by_client(self, client_id: int) -> List[Booking]:
        """Get all bookings for a client.

        Args:
            client_id: Client ID

        Returns:
            List of client's bookings
        """
        return await self.repository.get_by_client(client_id)

    async def get_by_equipment(self, equipment_id: int) -> List[Booking]:
        """Get all bookings for an equipment.

        Args:
            equipment_id: Equipment ID

        Returns:
            List of equipment's bookings
        """
        return await self.repository.get_by_equipment(equipment_id)

    async def get_active_for_period(
        self, start_date: datetime, end_date: datetime
    ) -> List[Booking]:
        """Get active bookings for a period.

        Args:
            start_date: Period start date
            end_date: Period end date

        Returns:
            List of active bookings
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
        return await self.repository.get_overdue()
