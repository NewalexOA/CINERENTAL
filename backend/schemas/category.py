"""Category schema module.

This module defines Pydantic models for category data validation,
including request/response schemas for managing equipment categories.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    """Base category schema."""

    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryCreate(CategoryBase):
    """Category create schema."""

    pass


class CategoryUpdate(BaseModel):
    """Category update schema."""

    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryResponse(CategoryBase):
    """Category response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class CategoryWithEquipmentCount(CategoryResponse):
    """Category with equipment count schema."""

    equipment_count: int = Field(
        ..., description='Number of equipment items in this category'
    )

    model_config = ConfigDict(from_attributes=True)
