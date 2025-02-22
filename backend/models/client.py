"""Client model module.

This module defines the Client model representing rental service customers.
Each client has personal information, contact details, and rental history.
"""

from enum import Enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models import Base, SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.models import Booking, Document


class ClientStatus(str, Enum):
    """Client status enumeration."""

    ACTIVE = 'ACTIVE'
    BLOCKED = 'BLOCKED'
    ARCHIVED = 'ARCHIVED'


# Create ENUM type for PostgreSQL
client_status_enum = ENUM(
    ClientStatus,
    name='clientstatus',
    create_type=True,
    values_callable=lambda obj: [e.value for e in obj],
    metadata=Base.metadata,
)


class Client(TimestampMixin, SoftDeleteMixin, Base):
    """Client model.

    Attributes:
        id: Primary key
        first_name: Client's first name
        last_name: Client's last name
        email: Client's email address
        phone: Client's phone number
        passport_number: Client's passport number
        address: Client's address
        company: Client's company name
        status: Client's status
        notes: Optional internal notes
        bookings: Client's bookings relationship
        documents: Client's documents relationship
    """

    __tablename__ = 'clients'

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    passport_number: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False
    )
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(200))
    status: Mapped[ClientStatus] = mapped_column(
        client_status_enum,
        default=ClientStatus.ACTIVE,
        nullable=False,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(String(1000))

    # Relationships
    bookings: Mapped[List['Booking']] = relationship(back_populates='client')
    documents: Mapped[List['Document']] = relationship(back_populates='client')
