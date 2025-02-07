"""Schema package.

This package defines Pydantic models for request/response validation.
"""

from backend.schemas.booking import (
    BookingCreate,
    BookingResponse,
    BookingStatus,
    BookingUpdate,
    PaymentStatus,
)
from backend.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from backend.schemas.client import (
    ClientCreate,
    ClientResponse,
    ClientStatus,
    ClientUpdate,
)
from backend.schemas.document import (
    DocumentCreate,
    DocumentResponse,
    DocumentStatus,
    DocumentType,
    DocumentUpdate,
)
from backend.schemas.equipment import (
    EquipmentCreate,
    EquipmentResponse,
    EquipmentStatus,
    EquipmentUpdate,
)

__all__ = [
    'BookingCreate',
    'BookingResponse',
    'BookingStatus',
    'BookingUpdate',
    'PaymentStatus',
    'CategoryCreate',
    'CategoryResponse',
    'CategoryUpdate',
    'ClientCreate',
    'ClientResponse',
    'ClientStatus',
    'ClientUpdate',
    'DocumentCreate',
    'DocumentResponse',
    'DocumentStatus',
    'DocumentType',
    'DocumentUpdate',
    'EquipmentCreate',
    'EquipmentResponse',
    'EquipmentStatus',
    'EquipmentUpdate',
]
