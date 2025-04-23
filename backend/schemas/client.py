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

    name: str = Field(..., title='Full Name', description='Client full name')
    email: Optional[str] = Field(
        None, title='Email', description='Client email address'
    )
    phone: Optional[str] = Field(None, title='Phone', description='Client phone number')
    company: Optional[str] = Field(
        None, title='Company', description='Client company name'
    )
    notes: Optional[str] = Field(None, title='Notes', description='Additional notes')


class ClientCreate(ClientBase):
    """Create client request schema."""

    pass


class ClientUpdate(BaseModel):
    """Update client request schema."""

    name: Optional[str] = Field(None, title='Full Name', description='Client full name')
    email: Optional[str] = Field(
        None, title='Email', description='Client email address'
    )
    phone: Optional[str] = Field(None, title='Phone', description='Client phone number')
    company: Optional[str] = Field(
        None, title='Company', description='Client company name'
    )
    notes: Optional[str] = Field(None, title='Notes', description='Additional notes')
    status: Optional[ClientStatus] = Field(
        None, title='Status', description='Client status'
    )


class ClientResponse(ClientBase):
    """Client response schema."""

    id: int
    status: ClientStatus
    created_at: datetime
    updated_at: datetime
    bookings_count: Optional[int] = Field(0, description='Number of client bookings')

    model_config = ConfigDict(from_attributes=True)
