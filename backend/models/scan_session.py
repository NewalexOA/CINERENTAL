"""Scan session model module.

This module provides model for storing temporary scan sessions.
"""

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base, TimestampMixin


class ScanSession(TimestampMixin, Base):
    """Scan session model for temporary storage of scanned equipment.

    Attributes:
        id: Primary key
        user_id: Reference to user (optional)
        name: Session name
        items: JSON array of scanned items
        expires_at: Expiration date
    """

    __tablename__ = 'scan_sessions'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    items: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    @classmethod
    def create_with_expiration(
        cls,
        name: str,
        user_id: Optional[int] = None,
        items: Optional[list] = None,
        days: int = 7,
    ) -> 'ScanSession':
        """Factory method to create a scan session with calculated expiration date."""
        return cls(
            name=name,
            user_id=user_id,
            items=items or [],
            expires_at=datetime.now() + timedelta(days=days),
        )
