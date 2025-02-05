"""Equipment model module.

This module defines the Equipment model representing physical items
available for rental. Each equipment item belongs to a category
and has various attributes like name, description, rental rates,
and availability status.
"""

from decimal import Decimal
from typing import Optional

from sqlalchemy import ForeignKey, String, Numeric
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import ENUM

from backend.models.base import Base, SoftDeleteMixin, TimestampMixin
from backend.schemas.equipment import EquipmentStatus

# Create ENUM type for PostgreSQL
equipment_status_enum = ENUM(
    EquipmentStatus,
    name='equipmentstatus',
    create_type=True,
    values_callable=lambda obj: [e.value for e in obj],
    metadata=Base.metadata,
)


class Equipment(TimestampMixin, SoftDeleteMixin, Base):
    """Equipment model.

    Attributes:
        id: Primary key.
        name: Equipment name.
        description: Optional equipment description.
        serial_number: Unique serial number.
        barcode: Unique barcode for scanning.
        category_id: Reference to equipment category.
        status: Current equipment status.
        daily_rate: Rental rate per day.
        replacement_cost: Cost to replace if damaged.
        notes: Optional internal notes.
        category: Category relationship.
        bookings: Equipment bookings relationship.
    """

    __tablename__ = 'equipment'

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(1000))
    serial_number: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    barcode: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey('categories.id', ondelete='RESTRICT')
    )
    status: Mapped[EquipmentStatus] = mapped_column(
        equipment_status_enum,
        default=EquipmentStatus.AVAILABLE,
        nullable=False,
        index=True,
    )
    daily_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    replacement_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(1000))

    # Relationships
    category = relationship('Category', back_populates='equipment')
    bookings = relationship('Booking', back_populates='equipment')

    @property
    def category_name(self) -> Optional[str]:
        """Get category name."""
        if self.category:
            return self.category.name
        return None
