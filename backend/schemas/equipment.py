"""Equipment schema module.

This module defines Pydantic models for equipment data validation,
including request/response schemas for managing rental items.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

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
    description: Optional[str] = Field(
        '', title='Description', description='Equipment description'
    )
    category_id: int = Field(..., title='Category ID', description='Category ID')


class EquipmentCreate(EquipmentBase):
    """Create equipment request schema."""

    replacement_cost: Optional[Decimal] = Field(
        None, title='Replacement Cost', description='Cost to replace if damaged'
    )
    custom_barcode: Optional[str] = Field(
        None,
        title='Custom Barcode',
        description='Optional custom barcode (auto-generated if not provided)',
    )
    validate_barcode: Optional[bool] = Field(
        True,
        title='Validate Barcode',
        description='Whether to validate the custom barcode format',
    )
    serial_number: Optional[str] = Field(
        None, title='Serial Number', description='Serial number'
    )
    notes: Optional[str] = Field(None, title='Notes', description='Additional notes')


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
    description: Optional[str] = None
    replacement_cost: Optional[Decimal]
    barcode: str
    serial_number: Optional[str]
    category_id: int
    status: EquipmentStatus
    created_at: datetime
    updated_at: datetime
    notes: Optional[str] = None
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

    # No additional parameters needed for auto-increment barcode generation
    pass


class StatusTimelineResponse(BaseModel):
    """Status timeline response schema."""

    id: int
    equipment_id: int
    status: EquipmentStatus
    timestamp: datetime
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BookingConflictInfo(BaseModel):
    """Booking conflict information schema."""

    booking_id: int = Field(..., description='Booking ID')
    start_date: str = Field(..., description='Booking start date')
    end_date: str = Field(..., description='Booking end date')
    status: str = Field(..., description='Booking status')
    project_id: Optional[int] = Field(None, description='Project ID if available')
    project_name: Optional[str] = Field(None, description='Project name if available')


class EquipmentAvailabilityResponse(BaseModel):
    """Equipment availability response schema."""

    equipment_id: int = Field(..., description='Equipment ID')
    is_available: bool = Field(
        ..., description='Whether equipment is available for the specified period'
    )
    equipment_status: EquipmentStatus = Field(
        ..., description='Current equipment status'
    )
    conflicts: List[BookingConflictInfo] = Field(
        default_factory=list,
        description='List of booking conflicts if not available',
    )
    message: str = Field(..., description='Availability message')

    model_config = ConfigDict(from_attributes=True)
