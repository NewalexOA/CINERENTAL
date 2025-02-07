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
    from backend.models.booking import Booking


class DocumentStatus(str, Enum):
    """Document status enumeration."""

    DRAFT = 'draft'
    PENDING = 'pending'
    UNDER_REVIEW = 'under_review'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    EXPIRED = 'expired'
    CANCELLED = 'cancelled'


class DocumentType(str, Enum):
    """Document type enumeration."""

    CONTRACT = 'contract'
    INVOICE = 'invoice'
    RECEIPT = 'receipt'
    PASSPORT = 'passport'
    DAMAGE_REPORT = 'damage_report'
    INSURANCE = 'insurance'
    OTHER = 'other'


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
        booking_id: Reference to booking
        document_type: Type of document
        file_path: Path to document file
        status: Document status
        notes: Optional notes
        booking: Booking relationship
    """

    __tablename__ = 'documents'

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(
        ForeignKey('bookings.id', ondelete='CASCADE')
    )
    document_type: Mapped[DocumentType] = mapped_column(
        document_type_enum,
        nullable=False,
        index=True,
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(
        document_status_enum,
        default=DocumentStatus.DRAFT,
        nullable=False,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(String(1000))

    # Relationships
    booking: Mapped['Booking'] = relationship(back_populates='documents')
