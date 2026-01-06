"""Project schema module.

This module defines Pydantic models for project data validation,
including request/response schemas for creating and managing project records.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.models import ProjectPaymentStatus, ProjectStatus


class DateRange(BaseModel):
    """Date range schema for future multi-period support."""

    start_date: datetime = Field(..., title='Start Date')
    end_date: datetime = Field(..., title='End Date')

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
    )


class ProjectBase(BaseModel):
    """Base project schema."""

    name: str = Field(..., title='Project Name', description='Name of the project')
    client_id: int = Field(
        ..., title='Client ID', description='ID of the client for the project'
    )
    start_date: datetime = Field(
        ..., title='Start Date', description='Start date of the project'
    )
    end_date: datetime = Field(
        ..., title='End Date', description='End date of the project'
    )
    description: Optional[str] = Field(
        None, title='Description', description='Description of the project'
    )
    notes: Optional[str] = Field(
        None, title='Notes', description='Additional notes for the project'
    )

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
    )


class ProjectCreate(ProjectBase):
    """Create project request schema."""

    status: ProjectStatus = Field(default=ProjectStatus.DRAFT, title='Project Status')
    payment_status: ProjectPaymentStatus = Field(
        default=ProjectPaymentStatus.UNPAID, title='Payment Status'
    )


class BookingCreateForProject(BaseModel):
    """Booking schema for project creation."""

    equipment_id: int = Field(..., title='Equipment ID')
    start_date: datetime = Field(..., title='Booking Start Date')
    end_date: datetime = Field(..., title='Booking End Date')
    quantity: int = Field(
        1,
        title='Quantity',
        description='Quantity of equipment items in this booking',
    )


class ProjectCreateWithBookings(ProjectCreate):
    """Create project with bookings request schema."""

    bookings: List[BookingCreateForProject] = Field(
        default_factory=list, title='Bookings'
    )


class ProjectUpdate(BaseModel):
    """Update project request schema.

    Note: payment_status is not included here as it requires captcha validation
    and must be updated via the dedicated /payment-status endpoint.
    """

    name: Optional[str] = Field(None, title='Project Name')
    description: Optional[str] = Field(None, title='Description')
    client_id: Optional[int] = Field(None, title='Client ID')
    start_date: Optional[datetime] = Field(None, title='Start Date')
    end_date: Optional[datetime] = Field(None, title='End Date')
    status: Optional[ProjectStatus] = Field(None, title='Status')
    notes: Optional[str] = Field(None, title='Notes')

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
    )


class ProjectResponse(ProjectBase):
    """Project response schema."""

    id: int
    status: ProjectStatus
    payment_status: ProjectPaymentStatus
    created_at: datetime
    updated_at: datetime
    client_name: str

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
    )


class BookingInProject(BaseModel):
    """Simplified booking schema for project response."""

    id: int
    equipment_id: int
    equipment_name: str
    serial_number: Optional[str] = None
    barcode: Optional[str] = None
    category_name: Optional[str] = None
    start_date: datetime
    end_date: datetime
    booking_status: str
    payment_status: str
    quantity: int = 1
    has_different_dates: Optional[bool] = Field(
        default=False,
        title='Has Different Dates',
        description='True if booking dates (ignoring time) differ from project dates',
    )

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
    )


class BookingInProjectFuture(BookingInProject):
    """Extended booking schema for future multi-period support."""

    date_ranges: List[DateRange] = Field(
        default_factory=list,
        title='Date Ranges',
        description='List of date ranges for multi-period bookings (future feature)',
    )


class ProjectWithBookings(ProjectResponse):
    """Project response schema with bookings."""

    bookings: List[BookingInProject]

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
    )


class ClientInfo(BaseModel):
    """Client information for print form."""

    id: int
    name: str
    company: str
    phone: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
    )


class PrintableCategoryInfo(BaseModel):
    """Schema for printable category information."""

    id: int
    name: str
    level: int

    model_config = ConfigDict(from_attributes=True)


class EquipmentPrintItem(BaseModel):
    """Equipment item for project print form."""

    id: int
    name: str
    description: Optional[str] = None
    serial_number: Optional[str] = None
    liability_amount: float
    quantity: int
    printable_categories: List[PrintableCategoryInfo]
    start_date: Optional[datetime] = Field(
        None, title='Booking Start Date', description='Start date of equipment booking'
    )
    end_date: Optional[datetime] = Field(
        None, title='Booking End Date', description='End date of equipment booking'
    )
    has_different_dates: Optional[bool] = Field(
        default=False,
        title='Has Different Dates',
        description='True if booking dates differ from project dates',
    )

    model_config = ConfigDict(from_attributes=True)


class ProjectPrint(BaseModel):
    """Project print form schema."""

    project: ProjectResponse
    client: ClientInfo
    equipment: List[EquipmentPrintItem]
    total_items: int
    total_liability: float
    generated_at: datetime = Field(default_factory=datetime.now)
    show_dates_column: bool = Field(
        default=False,
        title='Show Dates Column',
        description='True if any equipment has different dates from project',
    )

    model_config = ConfigDict(
        from_attributes=True,
    )


# New schemas for enhanced equipment filtering and pagination
class DateFilterType(str, Enum):
    """Enum for date filter types in project equipment view."""

    ALL = 'all'
    DIFFERENT = 'different'  # Equipment with dates different from project
    MATCHING = 'matching'  # Equipment with dates matching project


class ProjectBookingResponse(BaseModel):
    """Response schema for paginated project bookings with enhanced information."""

    id: int = Field(..., title='Booking ID')
    equipment_id: int = Field(..., title='Equipment ID')
    equipment_name: str = Field(..., title='Equipment Name')
    serial_number: Optional[str] = Field(None, title='Serial Number')
    barcode: Optional[str] = Field(None, title='Barcode')
    category_name: Optional[str] = Field(None, title='Category Name')
    category_id: Optional[int] = Field(None, title='Category ID')
    start_date: datetime = Field(..., title='Booking Start Date')
    end_date: datetime = Field(..., title='Booking End Date')
    booking_status: str = Field(..., title='Booking Status')
    payment_status: str = Field(..., title='Payment Status')
    quantity: int = Field(1, title='Quantity')
    has_different_dates: bool = Field(
        False,
        title='Has Different Dates',
        description='True if booking dates differ from project dates',
    )

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
    )


class ProjectPaymentStatusUpdate(BaseModel):
    """Update project payment status with captcha validation."""

    payment_status: ProjectPaymentStatus = Field(
        ...,
        title='Payment Status',
        description='New payment status for the project',
    )
    captcha_code: str = Field(
        ...,
        title='Captcha Code',
        description='4-digit captcha code for validation',
        min_length=4,
        max_length=4,
        pattern=r'^\d{4}$',
    )

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        validate_default=True,
    )
