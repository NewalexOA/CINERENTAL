"""Document model module.

This module defines the Document model representing rental documents.
Each document is associated with a booking and can be of different types
like contracts, handover acts, etc.
"""

from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.models import Booking, Client


class DocumentStatus(str, Enum):
    """Document status enumeration."""

    DRAFT = 'DRAFT'
    PENDING = 'PENDING'
    UNDER_REVIEW = 'UNDER_REVIEW'
    APPROVED = 'APPROVED'
    REJECTED = 'REJECTED'
    EXPIRED = 'EXPIRED'
    CANCELLED = 'CANCELLED'


class DocumentType(str, Enum):
    """Document type enumeration."""

    CONTRACT = 'CONTRACT'
    INVOICE = 'INVOICE'
    RECEIPT = 'RECEIPT'
    PASSPORT = 'PASSPORT'
    DAMAGE_REPORT = 'DAMAGE_REPORT'
    INSURANCE = 'INSURANCE'
    OTHER = 'OTHER'


# Create ENUM types for PostgreSQL
document_status_enum = ENUM(
    DocumentStatus,
    name='documentstatus',
    create_type=True,
    values_callable=lambda obj: [e.value for e in obj],
    metadata=Base.metadata,
)

document_type_enum = ENUM(
    DocumentType,
    name='documenttype',
    create_type=True,
    values_callable=lambda obj: [e.value for e in obj],
    metadata=Base.metadata,
)


class Document(TimestampMixin, Base):
    """Document model.

    Attributes:
        id: Primary key
        client_id: Reference to client
        booking_id: Reference to booking
        type: Type of document
        status: Document status
        title: Document title
        description: Document description
        file_path: Path to document file
        file_name: Original file name
        file_size: File size in bytes
        mime_type: File MIME type
        notes: Optional notes
        booking: Booking relationship
        client: Client relationship
    """

    __tablename__ = 'documents'

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey('clients.id', ondelete='RESTRICT'),
        nullable=False,
        index=True,
    )
    booking_id: Mapped[int] = mapped_column(
        ForeignKey('bookings.id', ondelete='CASCADE')
    )
    type: Mapped[DocumentType] = mapped_column(
        document_type_enum,
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000))
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(
        document_status_enum,
        default=DocumentStatus.DRAFT,
        nullable=False,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(String(1000))

    # Relationships
    booking: Mapped['Booking'] = relationship(back_populates='documents')
    client: Mapped['Client'] = relationship(back_populates='documents')
