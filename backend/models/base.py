"""Base model module.

This module provides base model class for all models.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class HasId:
    """Base class for models with ID."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class Base(DeclarativeBase, HasId):
    """Base model class."""

    pass


class TimestampMixin:
    """Mixin for timestamp fields.

    Provides created_at and updated_at fields that are automatically
    set when records are created and updated.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        index=True,
    )


class SoftDeleteMixin:
    """Mixin for soft delete functionality.

    Provides deleted_at field that is used to mark records as deleted
    instead of physically removing them from the database.
    """

    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        index=True,
    )
