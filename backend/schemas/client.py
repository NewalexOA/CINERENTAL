"""Client schema module.

This module defines Pydantic models for client data validation,
including request/response schemas for user registration and profile management.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.models.client import ClientStatus


class ClientBase(BaseModel):
    """Base client schema."""

    first_name: str = Field(..., title='First Name', description='Client first name')
    last_name: str = Field(..., title='Last Name', description='Client last name')
    email: str = Field(..., title='Email', description='Client email address')
    phone: str = Field(..., title='Phone', description='Client phone number')
    passport_number: str = Field(
        ..., title='Passport', description='Client passport number'
    )
    address: str = Field(..., title='Address', description='Client address')


class ClientCreate(ClientBase):
    """Create client request schema."""

    pass


class ClientUpdate(BaseModel):
    """Update client request schema."""

    first_name: Optional[str] = Field(
        None, title='First Name', description='Client first name'
    )
    last_name: Optional[str] = Field(
        None, title='Last Name', description='Client last name'
    )
    email: Optional[str] = Field(
        None, title='Email', description='Client email address'
    )
    phone: Optional[str] = Field(None, title='Phone', description='Client phone number')
    passport_number: Optional[str] = Field(
        None, title='Passport', description='Client passport number'
    )
    address: Optional[str] = Field(None, title='Address', description='Client address')
    status: Optional[ClientStatus] = Field(
        None, title='Status', description='Client status'
    )


class ClientResponse(ClientBase):
    """Client response schema."""

    id: int
    status: ClientStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
