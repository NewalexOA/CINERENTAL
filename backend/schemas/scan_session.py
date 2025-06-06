"""Scan session schemas module.

This module provides Pydantic schemas for scan sessions.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class EquipmentItem(BaseModel):
    """Schema for scanned equipment item."""

    equipment_id: int
    barcode: str
    name: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    booking_start_date: Optional[datetime] = None
    booking_end_date: Optional[datetime] = None


class ScanSessionEquipmentAdd(BaseModel):
    """Schema for adding equipment to a scan session."""

    equipment_id: int = Field(..., description='Equipment ID')
    booking_start_date: Optional[datetime] = Field(
        None, description='Booking start date'
    )
    booking_end_date: Optional[datetime] = Field(None, description='Booking end date')


class ScanSessionBase(BaseModel):
    """Base schema for scan session."""

    name: str
    items: List[EquipmentItem] = Field(default_factory=list)


class ScanSessionCreate(ScanSessionBase):
    """Schema for creating a scan session."""

    user_id: Optional[int] = None


class ScanSessionUpdate(BaseModel):
    """Schema for updating a scan session."""

    name: Optional[str] = None
    items: Optional[List[EquipmentItem]] = None


class ScanSessionResponse(ScanSessionBase):
    """Schema for scan session response."""

    id: int
    user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    expires_at: datetime

    model_config = {
        'from_attributes': True,
    }
