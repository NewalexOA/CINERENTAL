"""Booking model module.

This module defines the Booking model for rental bookings.
This includes the main booking entity and status enums.
"""

import enum
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.core import Base
from backend.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from backend.models.client import Client
    from backend.models.document import Document
    from backend.models.equipment import Equipment
    from backend.models.project import Project


class BookingStatus(str, enum.Enum):
    """Booking status enumeration."""

    PENDING = 'PENDING'
    CONFIRMED = 'CONFIRMED'
    ACTIVE = 'ACTIVE'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'
    OVERDUE = 'OVERDUE'


class PaymentStatus(str, enum.Enum):
    """Payment status enumeration."""

    PENDING = 'PENDING'
    PARTIAL = 'PARTIAL'
    PAID = 'PAID'
    REFUNDED = 'REFUNDED'
    OVERDUE = 'OVERDUE'


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
        project_id: Reference to project (optional)
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
        project: Project relationship
    """

    __tablename__ = 'bookings'

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey('clients.id', ondelete='RESTRICT')
    )
    equipment_id: Mapped[int] = mapped_column(
        ForeignKey('equipment.id', ondelete='RESTRICT')
    )
    project_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey('projects.id', ondelete='CASCADE'),
        nullable=True,
        index=True,
    )
    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    booking_status: Mapped[BookingStatus] = mapped_column(
        booking_status_enum,
        default=BookingStatus.ACTIVE,
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
    project: Mapped[Optional['Project']] = relationship(back_populates='bookings')

    def is_active(self) -> bool:
        """Check if booking is active.

        Returns:
            True if booking is active
        """
        return self.booking_status == BookingStatus.ACTIVE
