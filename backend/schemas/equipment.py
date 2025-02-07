"""Equipment schema module.

This module defines Pydantic models for equipment data validation,
including request/response schemas for managing rental items.
"""

from decimal import Decimal
from typing import Annotated, Optional

from pydantic import BaseModel, Field
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

    name: str = Field(..., title='Name', description='Equipment name')
    description: str = Field(
        ..., title='Description', description='Equipment description'
    )
    daily_rate: Decimal = Field(
        ..., title='Daily Rate', description='Daily rental rate'
    )
    replacement_cost: Decimal = Field(
        ..., title='Replacement Cost', description='Cost to replace if damaged'
    )
    category_id: int = Field(
        ..., title='Category ID', description='ID of the equipment category'
    )


class EquipmentCreate(EquipmentBase):
    """Create equipment request schema."""

    pass


class EquipmentUpdate(BaseModel):
    """Update equipment request schema."""

    name: Optional[str] = Field(None, title='Name', description='Equipment name')
    description: Optional[str] = Field(
        None, title='Description', description='Equipment description'
    )
    daily_rate: Optional[Decimal] = Field(
        None, title='Daily Rate', description='Daily rental rate'
    )
    replacement_cost: Optional[Decimal] = Field(
        None, title='Replacement Cost', description='Cost to replace if damaged'
    )
    category_id: Optional[int] = Field(
        None, title='Category ID', description='ID of the equipment category'
    )
    status: Optional[EquipmentStatus] = Field(
        None, title='Status', description='Equipment status'
    )


class EquipmentResponse(EquipmentBase):
    """Equipment response schema."""

    id: int
    status: EquipmentStatus
    category_name: str

    class Config:
        """Pydantic configuration."""

        orm_mode = True


class EquipmentWithCategory(EquipmentResponse):
    """Equipment response schema with category information."""

    category_name: str
