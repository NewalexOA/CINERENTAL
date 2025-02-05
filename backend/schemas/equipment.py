"""Equipment schema module.

This module defines Pydantic models for equipment data validation,
including request/response schemas for managing rental items.
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, Annotated

from pydantic import BaseModel, Field, ConfigDict
from pydantic.functional_validators import BeforeValidator


def validate_decimal(value: str | Decimal) -> Decimal:
    """Validate decimal value."""
    if isinstance(value, str):
        return Decimal(value)
    return value


DecimalField = Annotated[
    Decimal,
    BeforeValidator(validate_decimal),
]


class EquipmentStatus(str, Enum):
    """Equipment status enumeration."""
    AVAILABLE = "available"
    RENTED = "rented"
    MAINTENANCE = "maintenance"
    BROKEN = "broken"
    RETIRED = "retired"


class EquipmentBase(BaseModel):
    """Base equipment schema."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    barcode: str = Field(..., min_length=1, max_length=100)
    serial_number: str = Field(..., min_length=1, max_length=100)
    category_id: int = Field(..., gt=0)
    daily_rate: DecimalField = Field(..., gt=0)
    replacement_cost: DecimalField = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=1000)


class EquipmentCreate(EquipmentBase):
    """Create equipment request schema."""
    pass


class EquipmentUpdate(BaseModel):
    """Update equipment request schema."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    barcode: Optional[str] = Field(None, min_length=1, max_length=100)
    serial_number: Optional[str] = Field(None, min_length=1, max_length=100)
    category_id: Optional[int] = Field(None, gt=0)
    daily_rate: Optional[DecimalField] = Field(None, gt=0)
    replacement_cost: Optional[DecimalField] = Field(None, gt=0)
    notes: Optional[str] = Field(None, max_length=1000)
    status: Optional[EquipmentStatus] = None


class EquipmentResponse(EquipmentBase):
    """Equipment response schema."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: EquipmentStatus
    created_at: datetime
    updated_at: datetime


class EquipmentWithCategory(EquipmentResponse):
    """Equipment response schema with category information."""
    category_name: str
