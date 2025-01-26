"""Models package for database entities.

This package contains SQLAlchemy models that represent database tables
and their relationships. It also includes common functionality like
timestamp tracking and soft delete support.
"""

from backend.models.base import Base, SoftDeleteMixin, TimestampMixin
from backend.models.booking import Booking
from backend.models.category import Category
from backend.models.client import Client
from backend.models.document import Document
from backend.models.equipment import Equipment

__all__ = [
    'Base',
    'TimestampMixin',
    'SoftDeleteMixin',
    'Category',
    'Equipment',
    'Client',
    'Booking',
    'Document',
]
