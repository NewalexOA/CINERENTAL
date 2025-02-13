"""Booking model module.

This module defines the Booking model representing equipment rental bookings.
Each booking is associated with a client and equipment item, and tracks
rental period, payment status, and other booking-related information.
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.models.client import Client
    from backend.models.document import Document
    from backend.models.equipment import Equipment


class BookingStatus(str, Enum):
    """Booking status enumeration."""

    PENDING = 'pending'
    CONFIRMED = 'confirmed'
    ACTIVE = 'active'
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'
    OVERDUE = 'overdue'


class PaymentStatus(str, Enum):
    """Payment status enumeration."""

    PENDING = 'pending'
    PARTIAL = 'partial'
    PAID = 'paid'
    REFUNDED = 'refunded'
    OVERDUE = 'overdue'


# Create ENUM types for PostgreSQL
booking_status_enum = ENUM(
    BookingStatus,
    name='bookingstatus',
    create_type=True,
    values_callable=lambda obj: [e.value for e in obj],
    metadata=Base.metadata,
)

payment_status_enum = ENUM(
    PaymentStatus,
    name='paymentstatus',
    create_type=True,
    values_callable=lambda obj: [e.value for e in obj],
    metadata=Base.metadata,
)


class Booking(TimestampMixin, Base):
    """Booking model.

    Attributes:
        id: Primary key
        client_id: Reference to client
        equipment_id: Reference to equipment
        start_date: Rental start date
        end_date: Rental end date
        booking_status: Current booking status
        payment_status: Current payment status
        total_amount: Total rental amount
        deposit_amount: Required deposit amount
        paid_amount: Amount paid so far
        notes: Optional booking notes
        client: Client relationship
        equipment: Equipment relationship
        documents: Documents relationship
    """

    __tablename__ = 'bookings'

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey('clients.id', ondelete='RESTRICT')
    )
    equipment_id: Mapped[int] = mapped_column(
        ForeignKey('equipment.id', ondelete='RESTRICT')
    )
    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    booking_status: Mapped[BookingStatus] = mapped_column(
        booking_status_enum,
        default=BookingStatus.PENDING,
        nullable=False,
        index=True,
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        payment_status_enum,
        default=PaymentStatus.PENDING,
        nullable=False,
        index=True,
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    deposit_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=0
    )
    notes: Mapped[Optional[str]] = mapped_column(String(1000))

    # Relationships
    client: Mapped['Client'] = relationship(back_populates='bookings')
    equipment: Mapped['Equipment'] = relationship(back_populates='bookings')
    documents: Mapped[List['Document']] = relationship(back_populates='booking')

    def is_active(self) -> bool:
        """Check if booking is active.

        Returns:
            True if booking is active
        """
        return self.booking_status == BookingStatus.ACTIVE
