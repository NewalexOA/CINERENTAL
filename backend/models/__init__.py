"""Models package for database entities.

This package contains SQLAlchemy models that represent database tables
and their relationships. It also includes common functionality like
timestamp tracking and soft delete support.
"""

# Then import models with dependencies
from backend.models.barcode_sequence import BarcodeSequence

# Then import models without dependencies or with minimal dependencies
from backend.models.booking import Booking, BookingStatus, PaymentStatus
from backend.models.category import Category
from backend.models.client import Client, ClientStatus

# First import from core and mixins packages
from backend.models.core import Base
from backend.models.document import Document, DocumentStatus, DocumentType
from backend.models.equipment import Equipment, EquipmentStatus
from backend.models.mixins import SoftDeleteMixin, TimestampMixin
from backend.models.subcategory_prefix import SubcategoryPrefix
from backend.models.user import User

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
    'User',
    'SubcategoryPrefix',
    'BarcodeSequence',
    # Status and type enums
    'BookingStatus',
    'PaymentStatus',
    'ClientStatus',
    'DocumentStatus',
    'DocumentType',
    'EquipmentStatus',
]
