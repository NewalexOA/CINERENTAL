"""Equipment schema module.

This module defines Pydantic models for equipment data validation,
including request/response schemas for managing rental items.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field

from backend.models.equipment import EquipmentStatus


class CategoryInfo(BaseModel):
    """Category information schema."""

    id: int = Field(..., description='Category ID')
    name: str = Field(..., description='Category name')

    model_config = ConfigDict(from_attributes=True)


class EquipmentBase(BaseModel):
    """Base equipment schema."""

    name: str = Field(..., title='Name', description='Equipment name')
    description: str = Field(
        ..., title='Description', description='Equipment description'
    )
    category_id: int = Field(..., title='Category ID', description='Category ID')


class EquipmentCreate(EquipmentBase):
    """Create equipment request schema."""

    replacement_cost: Optional[Decimal] = Field(
        None, title='Replacement Cost', description='Cost to replace if damaged'
    )
    barcode: Optional[str] = Field(
        None, title='Barcode', description='Equipment barcode'
    )
    serial_number: Optional[str] = Field(
        None, title='Serial Number', description='Serial number'
    )
    notes: Optional[str] = Field(None, title='Notes', description='Additional notes')
    subcategory_prefix_id: Optional[int] = Field(
        None,
        title='Subcategory Prefix ID',
        description='ID of subcategory prefix for barcode generation',
    )
    generate_barcode: bool = Field(
        False,
        title='Generate Barcode',
        description='Whether to generate barcode automatically',
    )


class EquipmentUpdate(BaseModel):
    """Update equipment request schema."""

    name: Optional[str] = Field(None, title='Name', description='Equipment name')
    description: Optional[str] = Field(
        None, title='Description', description='Equipment description'
    )
    replacement_cost: Optional[Decimal] = Field(
        None, title='Replacement Cost', description='Cost to replace if damaged'
    )
    barcode: Optional[str] = Field(
        None, title='Barcode', description='Equipment barcode'
    )
    serial_number: Optional[str] = Field(
        None, title='Serial Number', description='Serial number'
    )
    category_id: Optional[int] = Field(
        None, title='Category ID', description='Category ID'
    )
    status: Optional[EquipmentStatus] = Field(
        None, title='Status', description='Equipment status'
    )


class EquipmentResponse(BaseModel):
    """Equipment response schema."""

    id: int
    name: str
    description: str
    replacement_cost: Optional[Decimal]
    barcode: str
    serial_number: Optional[str]
    category_id: int
    status: EquipmentStatus
    created_at: datetime
    updated_at: datetime
    category_name: str = Field(default='Без категории', description='Category name')
    category: Optional[CategoryInfo] = Field(None, description='Category information')

    @computed_field
    def is_available(self) -> bool:
        """Check if equipment is available for rent."""
        return self.status == EquipmentStatus.AVAILABLE

    model_config = ConfigDict(from_attributes=True)


class EquipmentWithCategory(EquipmentResponse):
    """Equipment with category details."""

    category_description: str = Field(..., description='Category description')

    model_config = ConfigDict(from_attributes=True)


class RegenerateBarcodeRequest(BaseModel):
    """Regenerate barcode request schema."""

    subcategory_prefix_id: int = Field(
        ...,
        title='Subcategory Prefix ID',
        description='ID of subcategory prefix for barcode generation',
    )
