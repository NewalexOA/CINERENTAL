"""Project model module.

This module defines the Project model for grouping bookings.
Each project can contain multiple bookings for different equipment.
"""

import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.core import Base
from backend.models.mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.models.booking import Booking
    from backend.models.client import Client


class ProjectStatus(str, enum.Enum):
    """Project status enumeration."""

    DRAFT = 'DRAFT'
    ACTIVE = 'ACTIVE'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'


class ProjectPaymentStatus(str, enum.Enum):
    """Project payment status enumeration."""

    UNPAID = 'UNPAID'
    PARTIALLY_PAID = 'PARTIALLY_PAID'
    PAID = 'PAID'


# Create ENUM type for PostgreSQL
project_status_enum = ENUM(
    ProjectStatus,
    name='projectstatus',
    create_type=True,
    values_callable=lambda obj: [e.value for e in obj],
    metadata=Base.metadata,
)

project_payment_status_enum = ENUM(
    ProjectPaymentStatus,
    name='projectpaymentstatus',
    create_type=True,
    values_callable=lambda obj: [e.value for e in obj],
    metadata=Base.metadata,
)


class Project(TimestampMixin, SoftDeleteMixin, Base):
    """Project model.

    Attributes:
        id: Primary key
        name: Project name
        description: Optional project description
        client_id: Reference to client
        start_date: Project start date
        end_date: Project end date
        status: Current project status
        payment_status: Payment status of the project
        notes: Optional project notes
        client: Client relationship
        bookings: Bookings relationship
    """

    __tablename__ = 'projects'

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000))
    client_id: Mapped[int] = mapped_column(
        ForeignKey('clients.id', ondelete='RESTRICT')
    )
    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[ProjectStatus] = mapped_column(
        project_status_enum,
        default=ProjectStatus.DRAFT,
        nullable=False,
        index=True,
    )
    payment_status: Mapped[ProjectPaymentStatus] = mapped_column(
        project_payment_status_enum,
        default=ProjectPaymentStatus.UNPAID,
        nullable=False,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(String(1000))

    # Relationships
    client: Mapped['Client'] = relationship(back_populates='projects')
    bookings: Mapped[List['Booking']] = relationship(back_populates='project')
