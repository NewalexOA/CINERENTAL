"""Scan session schemas module.

This module provides Pydantic schemas for scan sessions.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class EquipmentItem(BaseModel):
    """Schema for scanned equipment item."""

    equipment_id: Optional[int] = None
    barcode: str
    name: str


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

    class Config:
        """Pydantic configuration."""

        from_attributes = True
