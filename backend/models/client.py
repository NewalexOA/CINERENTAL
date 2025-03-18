"""Client model module.

This module defines the Client model representing rental service customers.
Each client has personal information, contact details, and rental history.
"""

import enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.core import Base
from backend.models.mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.models.booking import Booking
    from backend.models.document import Document


class ClientStatus(str, enum.Enum):
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
        name: Client's full name
        email: Client's email address (optional)
        phone: Client's phone number (optional)
        company: Client's company name (optional)
        status: Client's status
        notes: Optional internal notes
        bookings: Client's bookings relationship
        documents: Client's documents relationship
    """

    __tablename__ = 'clients'

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
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
