"""Booking schema module.

This module defines Pydantic models for booking data validation,
including request/response schemas for creating and managing rental records.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.models import BookingStatus, PaymentStatus
from backend.schemas.equipment import EquipmentResponse
from backend.schemas.project import ProjectBase


class BookingBase(BaseModel):
    """Base booking schema."""

    equipment_id: int = Field(
        ..., title='Equipment ID', description='ID of the equipment being booked'
    )
    client_id: int = Field(
        ..., title='Client ID', description='ID of the client making the booking'
    )
    start_date: datetime = Field(
        ..., title='Start Date', description='Start date of the booking'
    )
    end_date: datetime = Field(
        ..., title='End Date', description='End date of the booking'
    )
    total_amount: Decimal = Field(
        ..., title='Total Amount', description='Total amount for the booking'
    )
    quantity: int = Field(
        1, title='Quantity', description='Quantity of equipment items in this booking'
    )
    project_id: Optional[int] = Field(
        None,
        title='Project ID',
        description='ID of the project this booking belongs to',
    )

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
    )


class BookingCreate(BookingBase):
    """Create booking request schema."""

    pass


class BookingUpdate(BaseModel):
    """Update booking request schema."""

    start_date: Optional[datetime] = Field(
        None, title='Start Date', description='Start date of the booking'
    )
    end_date: Optional[datetime] = Field(
        None, title='End Date', description='End date of the booking'
    )
    status: Optional[BookingStatus] = Field(
        None, title='Status', description='Booking status'
    )
    payment_status: Optional[PaymentStatus] = Field(
        None, title='Payment Status', description='Payment status'
    )
    quantity: Optional[int] = Field(
        None, title='Quantity', description='Quantity of equipment items'
    )
    project_id: Optional[int] = Field(
        None,
        title='Project ID',
        description='ID of the project this booking belongs to',
    )

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
    )


class BookingResponse(BookingBase):
    """Booking response schema."""

    id: int
    status: BookingStatus
    payment_status: PaymentStatus
    created_at: datetime
    updated_at: datetime
    equipment_name: str
    client_name: str
    project_name: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
    )


class BookingWithDetails(BookingBase):
    """Booking schema with additional details.

    Extends:
        BookingBase

    Attributes:
        id: Booking ID
        created_at: Creation timestamp
        updated_at: Last update timestamp
        status: Current booking status
        payment_status: Current payment status
        equipment: Equipment details
        project: Project details if associated
        client_name: Client name (optional)
    """

    id: int
    created_at: datetime
    updated_at: datetime
    status: BookingStatus
    payment_status: PaymentStatus
    equipment: Optional[EquipmentResponse] = None
    project: Optional[ProjectBase] = None
    client_name: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
    )
