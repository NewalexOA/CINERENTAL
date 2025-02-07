"""Models package for database entities.

This package contains SQLAlchemy models that represent database tables
and their relationships. It also includes common functionality like
timestamp tracking and soft delete support.
"""

from backend.models.base import Base, SoftDeleteMixin, TimestampMixin
from backend.models.booking import Booking, BookingStatus, PaymentStatus
from backend.models.category import Category
from backend.models.client import Client, ClientStatus
from backend.models.document import Document, DocumentStatus, DocumentType
from backend.models.equipment import Equipment, EquipmentStatus

__all__ = [
    # Base models and mixins
    'Base',
    'TimestampMixin',
    'SoftDeleteMixin',
    # Entity models
    'Category',
    'Equipment',
    'Client',
    'Booking',
    'Document',
    # Status and type enums
    'BookingStatus',
    'PaymentStatus',
    'ClientStatus',
    'DocumentStatus',
    'DocumentType',
    'EquipmentStatus',
]
