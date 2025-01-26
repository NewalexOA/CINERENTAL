"""Equipment category model module.

This module defines the Category model for equipment categorization.
Categories can be hierarchical (have parent categories) and are used
to organize equipment items into logical groups.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import Base, TimestampMixin


class Category(TimestampMixin, Base):
    """Equipment category model.

    Attributes:
        id: Primary key.
        name: Category name.
        description: Optional category description.
        parent_id: Optional reference to parent category.
        parent: Parent category relationship.
        children: Child categories relationship.
        equipment: Equipment items in this category.
        equipment_count: Virtual attribute for equipment count.
        deleted_at: Deletion timestamp
    """

    __tablename__ = 'categories'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str] = mapped_column(String(500))
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey('categories.id', ondelete='RESTRICT'),
        nullable=True,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    parent: Mapped['Category | None'] = relationship(
        'Category',
        back_populates='children',
        remote_side=[id],
    )
    children: Mapped[list['Category']] = relationship(
        'Category',
        back_populates='parent',
        cascade='all, delete-orphan',
    )
    equipment = relationship(
        'Equipment',
        back_populates='category',
        cascade='all, delete-orphan',
    )

    # Virtual attribute for equipment count
    equipment_count: int = 0

    def __repr__(self) -> str:
        """Get string representation.

        Returns:
            String representation
        """
        return f'Category(id={self.id}, name={self.name})'
