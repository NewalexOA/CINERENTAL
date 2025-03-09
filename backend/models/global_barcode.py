"""Global barcode sequence model module.

This module defines the GlobalBarcodeSequence model for tracking the last used
sequence number for auto-incremented barcodes. Unlike the previous approach with
category and subcategory prefixes, this model stores a single global counter
that is used for all barcodes regardless of equipment category.
"""

from datetime import datetime

from sqlalchemy import DateTime, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.core import Base


class GlobalBarcodeSequence(Base):
    """Global barcode sequence model.

    This model maintains a single global counter for auto-incremented barcodes.
    Only one record (with id=1) should exist in the table.

    Attributes:
        id: Primary key (should always be 1).
        last_number: Last used sequence number for barcode generation.
        created_at: Record creation timestamp.
        updated_at: Record last update timestamp.
    """

    __tablename__ = 'global_barcode_sequence'

    id: Mapped[int] = mapped_column(primary_key=True)
    last_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment='Last used sequence number for auto-incremented barcodes',
    )

    # Timestamp fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        """Get string representation.

        Returns:
            String representation
        """
        return f'GlobalBarcodeSequence(id={self.id}, last_number={self.last_number})'
