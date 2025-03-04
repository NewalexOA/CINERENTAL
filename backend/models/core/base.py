"""Base model module.

This module provides base model class for all models.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer
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
