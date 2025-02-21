"""Schema package.

This package defines Pydantic models for request/response validation.
"""

from backend.models.booking import BookingStatus, PaymentStatus
from backend.models.client import ClientStatus
from backend.models.document import DocumentStatus, DocumentType
from backend.models.equipment import EquipmentStatus
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
    EquipmentBase,
    EquipmentCreate,
    EquipmentResponse,
    EquipmentUpdate,
    EquipmentWithCategory,
)

__all__ = [
    'BookingStatus',
    'PaymentStatus',
    'ClientStatus',
    'DocumentStatus',
    'DocumentType',
    'EquipmentStatus',
    'BookingBase',
    'BookingCreate',
    'BookingResponse',
    'BookingUpdate',
    'ClientBase',
    'ClientCreate',
    'ClientResponse',
    'ClientUpdate',
    'DocumentBase',
    'DocumentCreate',
    'DocumentResponse',
    'DocumentUpdate',
    'EquipmentBase',
    'EquipmentCreate',
    'EquipmentResponse',
    'EquipmentUpdate',
    'EquipmentWithCategory',
    'CategoryCreate',
    'CategoryResponse',
    'CategoryUpdate',
    'CategoryWithEquipmentCount',
]
