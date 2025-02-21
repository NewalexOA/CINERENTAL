"""Booking schema module.

This module defines Pydantic models for booking data validation,
including request/response schemas for creating and managing rental records.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.models import BookingStatus, PaymentStatus


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

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
    )
