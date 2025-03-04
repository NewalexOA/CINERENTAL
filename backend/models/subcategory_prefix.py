"""Subcategory prefix model module.

This module defines the SubcategoryPrefix model for storing subcategory prefixes
used in barcode generation. Each subcategory prefix is associated with a category
and has a unique prefix within that category.
"""

from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.models.category import Category


class SubcategoryPrefix(TimestampMixin, Base):
    """Subcategory prefix model.

    Attributes:
        id: Primary key.
        category_id: Reference to category.
        name: Subcategory name.
        prefix: Subcategory prefix for barcode generation (2 characters).
        category: Category relationship.
    """

    __tablename__ = 'subcategory_prefixes'
    __table_args__ = (
        UniqueConstraint('category_id', 'prefix', name='uq_subcategory_prefix'),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey('categories.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment='Subcategory name',
    )
    prefix: Mapped[str] = mapped_column(
        String(2),
        nullable=False,
        index=True,
        comment='Subcategory prefix for barcode generation (2 characters)',
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment='Subcategory description',
    )

    # Relationships
    category: Mapped['Category'] = relationship(
        'Category',
        back_populates='subcategory_prefixes',
    )

    def __repr__(self) -> str:
        """Get string representation.

        Returns:
            String representation
        """
        return (
            f'SubcategoryPrefix(id={self.id}, name={self.name}, '
            f'prefix={self.prefix})'
        )
