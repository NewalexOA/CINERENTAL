"""Category schema module.

This module defines Pydantic models for category data validation,
including request/response schemas for managing equipment categories.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CategoryBase(BaseModel):
    """Base category schema."""

    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryCreate(CategoryBase):
    """Category create schema."""

    prefix: Optional[str] = Field(
        None,
        description='Category prefix for barcode generation (2 characters)',
        min_length=2,
        max_length=2,
    )

    @field_validator('prefix')
    @classmethod
    def validate_prefix(cls, v: Optional[str]) -> Optional[str]:
        """Validate prefix format.

        Args:
            v: Prefix value

        Returns:
            Validated prefix

        Raises:
            ValueError: If prefix is not valid
        """
        if v is None:
            return None
        if not v.isalnum():
            raise ValueError('Prefix must contain only alphanumeric characters')
        return v.upper()


class CategoryUpdate(BaseModel):
    """Category update schema."""

    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None
    prefix: Optional[str] = Field(
        None,
        description='Category prefix for barcode generation (2 characters)',
        min_length=2,
        max_length=2,
    )

    @field_validator('prefix')
    @classmethod
    def validate_prefix(cls, v: Optional[str]) -> Optional[str]:
        """Validate prefix format.

        Args:
            v: Prefix value

        Returns:
            Validated prefix

        Raises:
            ValueError: If prefix is not valid
        """
        if v is None:
            return None
        if not v.isalnum():
            raise ValueError('Prefix must contain only alphanumeric characters')
        return v.upper()


class CategoryResponse(CategoryBase):
    """Category response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    prefix: Optional[str] = Field(
        None, description='Category prefix for barcode generation (2 characters)'
    )
    created_at: datetime
    updated_at: datetime


class CategoryWithEquipmentCount(CategoryResponse):
    """Category with equipment count schema."""

    equipment_count: int = Field(
        ..., description='Number of equipment items in this category'
    )

    model_config = ConfigDict(from_attributes=True)
