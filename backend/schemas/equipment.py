"""Equipment schema module.

This module defines Pydantic models for equipment data validation,
including request/response schemas for managing rental items.
"""

from datetime import datetime
from decimal import Decimal
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator
from pydantic.functional_validators import BeforeValidator

from backend.models.equipment import EquipmentStatus


def validate_decimal(value: str | Decimal) -> Decimal:
    """Validate decimal value."""
    if isinstance(value, str):
        return Decimal(value)
    return value


DecimalField = Annotated[
    Decimal,
    BeforeValidator(validate_decimal),
]


class EquipmentBase(BaseModel):
    """Base equipment schema."""

    name: str = Field(..., description='Equipment name')
    description: str = Field(..., description='Equipment description')
    daily_rate: Decimal = Field(..., description='Daily rental rate')
    replacement_cost: Decimal = Field(..., description='Replacement cost')
    category_id: int = Field(..., description='Category ID')
    barcode: str = Field(..., description='Equipment barcode')
    serial_number: str = Field(..., description='Equipment serial number')
    notes: Optional[str] = Field(None, description='Additional notes')

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
    )

    @field_validator('daily_rate', 'replacement_cost')
    @classmethod
    def validate_decimal(cls, v: Decimal) -> Decimal:
        """Validate decimal values are positive."""
        if v <= 0:
            raise ValueError('Value must be positive')
        return v


class EquipmentCreate(EquipmentBase):
    """Equipment creation schema."""

    pass


class EquipmentUpdate(BaseModel):
    """Equipment update schema."""

    name: Optional[str] = None
    description: Optional[str] = None
    daily_rate: Optional[Decimal] = None
    replacement_cost: Optional[Decimal] = None
    barcode: Optional[str] = None
    serial_number: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[EquipmentStatus] = None

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
    )

    @field_validator('daily_rate', 'replacement_cost')
    @classmethod
    def validate_decimal(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        """Validate decimal values are positive."""
        if v is not None and v <= 0:
            raise ValueError('Value must be positive')
        return v


class EquipmentResponse(EquipmentBase):
    """Equipment response schema."""

    id: int = Field(..., description='Equipment ID')
    status: EquipmentStatus = Field(..., description='Equipment status')
    category_name: Optional[str] = Field(None, description='Category name')
    created_at: datetime = Field(..., description='Creation timestamp')
    updated_at: datetime = Field(..., description='Last update timestamp')

    @computed_field
    def is_available(self) -> bool:
        """Check if equipment is available for rent."""
        return self.status == EquipmentStatus.AVAILABLE


class EquipmentWithCategory(EquipmentResponse):
    """Equipment with category details."""

    category_description: str = Field(..., description='Category description')

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: str(v),
            EquipmentStatus: lambda v: v.value,
        },
    )
