"""Utility functions for web routes.

This module provides common utility functions used across web route modules.
"""

from typing import Any, Dict, List, Optional, TypeVar, Union

from backend.models import (
    Booking,
    BookingStatus,
    Equipment,
    EquipmentStatus,
    PaymentStatus,
)
from backend.schemas import EquipmentResponse

# Type variable for equipment types
EquipmentType = TypeVar('EquipmentType', Equipment, EquipmentResponse)


def prepare_equipment_data(
    equipment: Union[Equipment, Dict[str, Any]],
    include_full_category: bool = False,
) -> Dict[str, Any]:
    """Transform equipment model to template-ready dictionary.

    Args:
        equipment: Equipment model instance or dictionary
        include_full_category: Whether to include full category object

    Returns:
        Dict with prepared equipment data
    """
    # Convert to response model and then to dict for consistent data structure
    if isinstance(equipment, dict):
        equipment_response = EquipmentResponse.model_validate(equipment)
    else:
        equipment_response = EquipmentResponse.model_validate(equipment.__dict__)

    item_dict = equipment_response.model_dump()

    # Use category_name directly from EquipmentResponse or add default
    item_dict['category_name'] = item_dict.get('category_name', 'Без категории')

    # Handle status display for templates
    status = item_dict.get('status')
    if status is not None:
        item_dict['status'] = status.value if status is not None else None

    # Add category information if requested and available
    if include_full_category and hasattr(equipment, 'category') and equipment.category:
        item_dict['category'] = {
            'id': equipment.category.id,
            'name': equipment.category.name,
        }

    return item_dict


def prepare_equipment_list_data(
    equipment_list: List[Any],
) -> List[Dict[str, Any]]:
    """Transform a list of equipment models to template-ready data.

    Args:
        equipment_list: List of equipment model instances

    Returns:
        List of dicts with prepared equipment data
    """
    return [prepare_equipment_data(item) for item in equipment_list]


def prepare_booking_data(
    booking: Booking,
    include_relations: bool = False,
    client: Any = None,
    equipment: Any = None,
) -> Dict[str, Any]:
    """Transform booking model to template-ready dictionary.

    Args:
        booking: Booking model instance
        include_relations: Whether to include client and equipment data
        client: Optional pre-loaded client data
        equipment: Optional pre-loaded equipment data

    Returns:
        Dict with prepared booking data
    """
    booking_data = booking.__dict__.copy()

    # Convert status enums to string values for templates
    if hasattr(booking, 'booking_status') and booking.booking_status:
        booking_data['status'] = booking.booking_status.value

    if hasattr(booking, 'payment_status') and booking.payment_status:
        booking_data['payment_status'] = booking.payment_status.value

    if hasattr(booking, 'project') and booking.project:
        booking_data['project_name'] = booking.project.name
        booking_data['project_id'] = booking.project.id

    # Add relations if requested and available
    if include_relations:
        if client:
            booking_data['client'] = client.__dict__

        if equipment:
            booking_data['equipment'] = equipment.__dict__

    return booking_data


def prepare_model_list_for_template(model_list: List[Any]) -> List[Dict[str, Any]]:
    """Convert list of Pydantic or ORM models to list of dictionaries.

    Works with any model that has model_dump() method or can be accessed via __dict__.

    Args:
        model_list: List of model instances

    Returns:
        List of dictionaries suitable for templates
    """
    result = []
    for item in model_list:
        if hasattr(item, 'model_dump'):
            # Pydantic models or response schemas
            result.append(item.model_dump())
        else:
            # SQLAlchemy ORM models
            result.append(item.__dict__)

    return result


def get_template_status_value(
    status: Optional[EquipmentStatus],
) -> Optional[str]:
    """Convert EquipmentStatus enum to string value for templates.

    Args:
        status: Equipment status enum value or None

    Returns:
        String value of status or None
    """
    return status.value if status else None


def get_booking_status_values() -> List[str]:
    """Get list of booking status values for templates.

    Returns:
        List of booking status string values
    """
    return [status.value for status in BookingStatus]


def get_payment_status_values() -> List[str]:
    """Get list of payment status values for templates.

    Returns:
        List of payment status string values
    """
    return [status.value for status in PaymentStatus]
