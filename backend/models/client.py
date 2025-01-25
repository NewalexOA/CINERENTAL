"""Client model module.

This module defines the Client model representing rental service customers.
Each client record contains personal information, contact details,
and rental history references.
"""

from enum import Enum

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base, SoftDeleteMixin, TimestampMixin


class ClientStatus(str, Enum):
    """Client status enumeration."""

    ACTIVE = 'active'
    BLOCKED = 'blocked'
    ARCHIVED = 'archived'


class Client(TimestampMixin, SoftDeleteMixin, Base):
    """Client model.

    Attributes:
        id: Primary key.
        first_name: Client's first name.
        last_name: Client's last name.
        email: Unique email address.
        phone: Contact phone number.
        company: Optional company name.
        status: Client's account status.
        notes: Optional internal notes.
        passport_number: Passport or ID number.
        address: Physical address.
        bookings: Client's bookings relationship.
        documents: Client's documents relationship.
    """

    __tablename__ = 'clients'

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    company: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[ClientStatus] = mapped_column(
        SQLEnum(ClientStatus),
        default=ClientStatus.ACTIVE,
        nullable=False,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(String(1000))
    passport_number: Mapped[str] = mapped_column(String(50), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)

    # Relationships
    bookings = relationship(
        'Booking', back_populates='client', cascade='all, delete-orphan'
    )
    documents = relationship(
        'Document', back_populates='client', cascade='all, delete-orphan'
    )
