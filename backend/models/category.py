"""Equipment category model module.

This module defines the Category model for equipment categorization.
Categories can be hierarchical (have parent categories) and are used
to organize equipment items into logical groups.
"""

from sqlalchemy import ForeignKey, String
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
    """

    __tablename__ = 'categories'

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(500))
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey('categories.id', ondelete='SET NULL')
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
