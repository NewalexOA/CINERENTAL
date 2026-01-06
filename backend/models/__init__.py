"""Models package for database entities.

This package contains SQLAlchemy models that represent database tables
and their relationships. It also includes common functionality like
timestamp tracking and soft delete support.
"""

# Then import models without dependencies or with minimal dependencies
from backend.models.booking import Booking, BookingStatus, PaymentStatus
from backend.models.category import Category
from backend.models.client import Client, ClientStatus

# First import from core and mixins packages
from backend.models.core import Base
from backend.models.document import Document, DocumentStatus, DocumentType
from backend.models.equipment import Equipment, EquipmentStatus

# Import new global barcode model
from backend.models.global_barcode import GlobalBarcodeSequence
from backend.models.mixins import SoftDeleteMixin, TimestampMixin
from backend.models.project import Project, ProjectPaymentStatus, ProjectStatus
from backend.models.scan_session import ScanSession
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
    'GlobalBarcodeSequence',
    'Project',
    'ScanSession',
    # Status and type enums
    'BookingStatus',
    'PaymentStatus',
    'ClientStatus',
    'DocumentStatus',
    'DocumentType',
    'EquipmentStatus',
    'ProjectStatus',
    'ProjectPaymentStatus',
]
