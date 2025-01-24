"""Booking model module.

This module defines the Booking model representing equipment rental records.
Each booking links a client with equipment items for a specific time period
and includes rental terms, status, and payment information.
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import ForeignKey, String, DateTime, Numeric, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base, TimestampMixin


class BookingStatus(str, Enum):
    """Booking status enumeration."""

    PENDING = 'pending'  # Just created, waiting for confirmation
    CONFIRMED = 'confirmed'  # Confirmed but not yet started
    ACTIVE = 'active'  # Equipment is currently rented out
    COMPLETED = 'completed'  # Equipment returned, all payments made
    CANCELLED = 'cancelled'  # Booking was cancelled
    OVERDUE = 'overdue'  # Equipment not returned on time


class PaymentStatus(str, Enum):
    """Payment status enumeration."""

    PENDING = 'pending'  # Payment not yet made
    PARTIAL = 'partial'  # Partial payment received
    PAID = 'paid'  # Fully paid
    REFUNDED = 'refunded'  # Payment was refunded
    OVERDUE = 'overdue'  # Payment is overdue


class Booking(TimestampMixin, Base):
    """Booking model.

    Attributes:
        id: Primary key.
        client_id: Reference to the client.
        equipment_id: Reference to the equipment.
        start_date: Rental start date and time.
        end_date: Expected return date and time.
        actual_return_date: Actual return date and time.
        booking_status: Current booking status.
        payment_status: Current payment status.
        total_amount: Total rental amount.
        paid_amount: Amount already paid.
        deposit_amount: Security deposit amount.
        notes: Optional booking notes.
        client: Client relationship.
        equipment: Equipment relationship.
        documents: Related documents relationship.
    """

    __tablename__ = 'bookings'

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey('clients.id', ondelete='RESTRICT'))
    equipment_id: Mapped[int] = mapped_column(ForeignKey('equipment.id', ondelete='RESTRICT'))
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    actual_return_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    booking_status: Mapped[BookingStatus] = mapped_column(
        SQLEnum(BookingStatus),
        default=BookingStatus.PENDING,
        nullable=False,
        index=True,
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        SQLEnum(PaymentStatus),
        default=PaymentStatus.PENDING,
        nullable=False,
        index=True,
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    deposit_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(1000))

    # Relationships
    client = relationship('Client', back_populates='bookings')
    equipment = relationship('Equipment', back_populates='bookings')
    documents = relationship('Document', back_populates='booking', cascade='all, delete-orphan')
