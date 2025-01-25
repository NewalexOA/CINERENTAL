"""Document model module.

This module defines the Document model for storing rental-related files.
Documents can include contracts, invoices, and other paperwork associated
with equipment rentals and client interactions.
"""

from enum import Enum

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base, TimestampMixin


class DocumentType(str, Enum):
    """Document type enumeration."""

    CONTRACT = 'contract'  # Rental agreement
    INVOICE = 'invoice'  # Payment invoice
    RECEIPT = 'receipt'  # Payment receipt
    PASSPORT = 'passport'  # Client's ID scan
    DAMAGE_REPORT = 'damage_report'  # Equipment damage documentation
    INSURANCE = 'insurance'  # Insurance documentation
    OTHER = 'other'  # Other document types


class DocumentStatus(str, Enum):
    """Document status enumeration."""

    DRAFT = 'draft'  # Document is being prepared
    PENDING = 'pending'  # Document is awaiting approval
    APPROVED = 'approved'  # Document has been approved
    REJECTED = 'rejected'  # Document has been rejected
    EXPIRED = 'expired'  # Document has expired
    CANCELLED = 'cancelled'  # Document has been cancelled


class Document(TimestampMixin, Base):
    """Document model.

    Attributes:
        id: Primary key.
        client_id: Reference to the client.
        booking_id: Optional reference to the booking.
        type: Document type.
        title: Document title.
        description: Optional document description.
        file_path: Path to the stored file.
        file_name: Original file name.
        file_size: File size in bytes.
        mime_type: File MIME type.
        notes: Optional internal notes.
        status: Document status.
        client: Client relationship.
        booking: Booking relationship.
    """

    __tablename__ = 'documents'

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey('clients.id', ondelete='RESTRICT')
    )
    booking_id: Mapped[int | None] = mapped_column(
        ForeignKey('bookings.id', ondelete='SET NULL')
    )
    type: Mapped[DocumentType] = mapped_column(
        SQLEnum(DocumentType),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000))
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(1000))
    status: Mapped[DocumentStatus] = mapped_column(
        SQLEnum(DocumentStatus),
        nullable=False,
        default=DocumentStatus.DRAFT,
        index=True,
    )

    # Relationships
    client = relationship('Client', back_populates='documents')
    booking = relationship('Booking', back_populates='documents')
