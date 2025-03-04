"""Subcategory prefix schema module.

This module defines Pydantic models for subcategory prefix data validation,
including request/response schemas for managing subcategory prefixes.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SubcategoryPrefixBase(BaseModel):
    """Base subcategory prefix schema."""

    name: str = Field(..., description='Subcategory name')
    prefix: str = Field(
        ...,
        description='Subcategory prefix for barcode generation (2 characters)',
        min_length=2,
        max_length=2,
    )
    description: Optional[str] = Field(None, description='Subcategory description')


class SubcategoryPrefixCreate(SubcategoryPrefixBase):
    """Subcategory prefix create schema."""

    category_id: int = Field(..., description='Category ID')

    @field_validator('prefix')
    @classmethod
    def validate_prefix(cls, v: str) -> str:
        """Validate prefix format.

        Args:
            v: Prefix value

        Returns:
            Validated prefix

        Raises:
            ValueError: If prefix is not valid
        """
        if not v.isalnum():
            raise ValueError('Prefix must contain only alphanumeric characters')
        return v.upper()


class SubcategoryPrefixUpdate(BaseModel):
    """Subcategory prefix update schema."""

    name: Optional[str] = Field(None, description='Subcategory name')
    prefix: Optional[str] = Field(
        None,
        description='Subcategory prefix for barcode generation (2 characters)',
        min_length=2,
        max_length=2,
    )
    description: Optional[str] = Field(None, description='Subcategory description')

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


class SubcategoryPrefixResponse(SubcategoryPrefixBase):
    """Subcategory prefix response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    created_at: datetime
    updated_at: datetime
