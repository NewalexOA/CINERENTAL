"""Category schemas module.

This module defines Pydantic models for category-related data structures.
These schemas are used across the application, including API endpoints,
services, and internal data validation.
"""

from typing import Optional

from pydantic import BaseModel, ConfigDict


class CategoryBase(BaseModel):
    """Base category schema."""

    name: str
    description: str
    parent_id: Optional[int] = None


class CategoryCreate(CategoryBase):
    """Category creation schema."""

    model_config = ConfigDict(from_attributes=True)


class CategoryUpdate(BaseModel):
    """Category update schema."""

    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class CategoryResponse(CategoryBase):
    """Category response schema."""

    id: int

    model_config = ConfigDict(from_attributes=True)


class CategoryWithEquipmentCount(CategoryResponse):
    """Category with equipment count schema."""

    equipment_count: int

    model_config = ConfigDict(from_attributes=True)
