"""Barcode sequence model module.

This module defines the BarcodeSequence model for tracking the last used
sequence number for each category and subcategory prefix combination.
This is used for automatic barcode generation.
"""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.core import Base
from backend.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from backend.models.category import Category


class BarcodeSequence(TimestampMixin, Base):
    """Barcode sequence model.

    Attributes:
        id: Primary key.
        category_id: Reference to category.
        subcategory_prefix: Subcategory prefix.
        last_number: Last used sequence number.
        category: Category relationship.
    """

    __tablename__ = 'barcode_sequences'
    __table_args__ = (
        UniqueConstraint(
            'category_id',
            'subcategory_prefix',
            name='uq_category_subcategory',
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey('categories.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    subcategory_prefix: Mapped[str] = mapped_column(
        String(2),
        nullable=False,
        index=True,
        comment='Subcategory prefix (2 characters)',
    )
    last_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment='Last used sequence number',
    )

    # Relationships
    category: Mapped['Category'] = relationship('Category')

    def __repr__(self) -> str:
        """Get string representation.

        Returns:
            String representation
        """
        return (
            f'BarcodeSequence(category_id={self.category_id}, '
            f'subcategory_prefix={self.subcategory_prefix}, '
            f'last_number={self.last_number})'
        )
