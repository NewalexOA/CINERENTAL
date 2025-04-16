"""Project schema module.

This module defines Pydantic models for project data validation,
including request/response schemas for creating and managing project records.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.models import ProjectStatus


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
    """Update project request schema."""

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
    start_date: datetime
    end_date: datetime
    booking_status: str
    payment_status: str

    model_config = ConfigDict(
        from_attributes=True,
        ser_json_bytes='utf8',
        ser_json_timedelta='iso8601',
        validate_default=True,
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


class EquipmentPrintItem(BaseModel):
    """Equipment item for project print form."""

    id: int
    name: str
    serial_number: Optional[str] = None
    liability_amount: float = 0.0

    model_config = ConfigDict(
        from_attributes=True,
    )


class ProjectPrint(BaseModel):
    """Project print form schema."""

    project: ProjectResponse
    client: ClientInfo
    equipment: List[EquipmentPrintItem]
    total_items: int
    total_liability: float
    generated_at: datetime = Field(default_factory=datetime.now)

    model_config = ConfigDict(
        from_attributes=True,
    )
