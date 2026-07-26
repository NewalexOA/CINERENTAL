"""Scan session schemas module.

This module provides Pydantic schemas for scan sessions.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class EquipmentItemInput(BaseModel):
    """Minimal item data for create/update — only ID and quantity are stored."""

    equipment_id: int
    quantity: int = 1


class EquipmentItemResponse(BaseModel):
    """Enriched equipment item in response — data from current DB state."""

    equipment_id: int
    barcode: str
    name: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    serial_number: Optional[str] = None
    quantity: int = 1


class ScanSessionEquipmentAdd(BaseModel):
    """Schema for adding equipment to a scan session."""

    equipment_id: int = Field(..., description='Equipment ID')
    booking_start_date: Optional[datetime] = Field(
        None, description='Booking start date'
    )
    booking_end_date: Optional[datetime] = Field(None, description='Booking end date')


class ScanSessionCreate(BaseModel):
    """Schema for creating a scan session."""

    name: str
    items: List[EquipmentItemInput] = Field(default_factory=list)
    user_id: Optional[int] = None


class ScanSessionUpdate(BaseModel):
    """Schema for updating a scan session."""

    name: Optional[str] = None
    items: Optional[List[EquipmentItemInput]] = None


class ScanSessionResponse(BaseModel):
    """Schema for scan session response with enriched items."""

    id: int
    name: str
    items: List[EquipmentItemResponse] = Field(default_factory=list)
    user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    expires_at: datetime

    model_config = {
        'from_attributes': True,
    }
