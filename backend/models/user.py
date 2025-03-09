"""User model module."""

from typing import Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.core import Base
from backend.models.mixins import TimestampMixin


class User(TimestampMixin, Base):
    """User model for authentication."""

    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)
    is_superuser: Mapped[bool] = mapped_column(default=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
