"""Category schema module.

This module defines Pydantic models for category data validation,
including request/response schemas for managing equipment categories.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    """Base category schema."""

    name: str = Field(..., description='Category name')
    description: Optional[str] = Field(None, description='Category description')

    model_config = ConfigDict(from_attributes=True)


class CategoryCreate(CategoryBase):
    """Create category request schema."""

    pass


class CategoryUpdate(BaseModel):
    """Update category request schema."""

    name: Optional[str] = Field(None, description='Category name')
    description: Optional[str] = Field(None, description='Category description')
    parent_id: Optional[int] = Field(None, description='Parent category ID')

    model_config = ConfigDict(from_attributes=True)


class CategoryResponse(CategoryBase):
    """Category response schema."""

    id: int = Field(..., description='Category ID')
    parent_id: Optional[int] = Field(None, description='Parent category ID')
    created_at: datetime = Field(..., description='Creation timestamp')
    updated_at: datetime = Field(..., description='Last update timestamp')

    model_config = ConfigDict(from_attributes=True)


class CategoryWithEquipmentCount(CategoryResponse):
    """Category with equipment count schema."""

    equipment_count: int = Field(
        ..., description='Number of equipment items in this category'
    )

    model_config = ConfigDict(from_attributes=True)
