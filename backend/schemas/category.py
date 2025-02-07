"""Category schema module.

This module defines Pydantic models for category data validation,
including request/response schemas for managing equipment categories.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    """Base category schema."""

    name: str = Field(..., title='Name', description='Category name')
    description: Optional[str] = Field(
        None, title='Description', description='Category description'
    )


class CategoryCreate(CategoryBase):
    """Create category request schema."""

    pass


class CategoryUpdate(BaseModel):
    """Update category request schema."""

    name: Optional[str] = Field(None, title='Name', description='Category name')
    description: Optional[str] = Field(
        None, title='Description', description='Category description'
    )
    parent_id: Optional[int] = Field(
        None, title='Parent ID', description='Parent category ID'
    )


class CategoryResponse(CategoryBase):
    """Category response schema."""

    id: int
    parent_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic configuration."""

        orm_mode = True


class CategoryWithEquipmentCount(CategoryResponse):
    """Category with equipment count schema."""

    equipment_count: int

    model_config = ConfigDict(from_attributes=True)
