"""Soft delete mixin module.

This module provides mixin for soft delete functionality.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column


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
