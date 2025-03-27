"""Schema package.

This package defines Pydantic models for request/response validation.
"""

from backend.models.booking import BookingStatus, PaymentStatus
from backend.models.client import ClientStatus
from backend.models.document import DocumentStatus, DocumentType
from backend.models.equipment import EquipmentStatus
from backend.models.project import ProjectStatus
from backend.schemas.booking import (
    BookingBase,
    BookingCreate,
    BookingResponse,
    BookingUpdate,
)
from backend.schemas.category import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    CategoryWithEquipmentCount,
)
from backend.schemas.client import (
    ClientBase,
    ClientCreate,
    ClientResponse,
    ClientUpdate,
)
from backend.schemas.document import (
    DocumentBase,
    DocumentCreate,
    DocumentResponse,
    DocumentUpdate,
)
from backend.schemas.equipment import (
    BookingConflictInfo,
    EquipmentAvailabilityResponse,
    EquipmentBase,
    EquipmentCreate,
    EquipmentResponse,
    EquipmentUpdate,
    EquipmentWithCategory,
    RegenerateBarcodeRequest,
    StatusTimelineResponse,
)
from backend.schemas.project import (
    BookingInProject,
    ProjectBase,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    ProjectWithBookings,
)
from backend.schemas.scan_session import (
    EquipmentItem,
    ScanSessionCreate,
    ScanSessionResponse,
    ScanSessionUpdate,
)

__all__ = [
    # Status enums
    'BookingStatus',
    'PaymentStatus',
    'ClientStatus',
    'DocumentStatus',
    'DocumentType',
    'EquipmentStatus',
    'ProjectStatus',
    # Booking schemas
    'BookingBase',
    'BookingCreate',
    'BookingResponse',
    'BookingUpdate',
    # Client schemas
    'ClientBase',
    'ClientCreate',
    'ClientResponse',
    'ClientUpdate',
    # Document schemas
    'DocumentBase',
    'DocumentCreate',
    'DocumentResponse',
    'DocumentUpdate',
    # Equipment schemas
    'EquipmentBase',
    'EquipmentCreate',
    'EquipmentResponse',
    'EquipmentUpdate',
    'EquipmentWithCategory',
    'RegenerateBarcodeRequest',
    'StatusTimelineResponse',
    'EquipmentAvailabilityResponse',
    'BookingConflictInfo',
    # Category schemas
    'CategoryCreate',
    'CategoryResponse',
    'CategoryUpdate',
    'CategoryWithEquipmentCount',
    'CategoryTree',
    # Project schemas
    'ProjectBase',
    'ProjectCreate',
    'ProjectResponse',
    'ProjectUpdate',
    'ProjectWithBookings',
    'BookingInProject',
    # Scan Session
    'EquipmentItem',
    'ScanSessionCreate',
    'ScanSessionUpdate',
    'ScanSessionResponse',
]
