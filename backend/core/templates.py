"""Templates configuration module."""

import json
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional, Union

from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from jinja2 import Environment

from backend.core.config import settings

# Initialize templates
templates = Jinja2Templates(directory='frontend/templates')

# Add global context to templates
templates.env.globals.update(
    {
        'APP_NAME': settings.APP_NAME,
        'COMPANY_SINCE': settings.COMPANY_SINCE,
    }
)

# Initialize static files
static_files = StaticFiles(directory='frontend/static')


def format_date(date_value: Optional[Union[datetime, str]]) -> str:
    """Format date for display.

    Args:
        date_value: Date to format

    Returns:
        Formatted date string
    """
    if not date_value:
        return ''

    if isinstance(date_value, str):
        try:
            date_value = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
        except ValueError:
            return str(date_value)

    return date_value.strftime('%d.%m.%Y')


def format_datetime(date_value: Optional[Union[datetime, str]]) -> str:
    """Format datetime for display.

    Args:
        date_value: Datetime to format

    Returns:
        Formatted datetime string
    """
    if not date_value:
        return ''

    if isinstance(date_value, str):
        try:
            date_value = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
        except ValueError:
            return str(date_value)

    return date_value.strftime('%d.%m.%Y %H:%M')


def tojson_filter(obj: Any) -> str:
    """Convert Python object to JSON string for use in templates.

    This filter ensures all objects can be properly serialized to JSON.
    It handles special types like datetime and Decimal.

    Args:
        obj: Python object to convert to JSON

    Returns:
        JSON string representation of the object
    """

    def default_handler(o: Any) -> Any:
        if isinstance(o, datetime):
            return o.isoformat()
        elif isinstance(o, Decimal):
            return float(o)
        elif hasattr(o, '__dict__'):
            return o.__dict__
        else:
            return str(o)

    try:
        # Use ensure_ascii=False to properly handle Unicode characters
        # and indent=None for compact representation
        return json.dumps(
            obj,
            default=default_handler,
            ensure_ascii=False,
            indent=None,
            separators=(',', ':'),
        )
    except Exception as e:
        # If serialization fails, try a more robust approach
        import logging

        logging.error(f'JSON serialization error in tojson_filter: {str(e)}')

        # For debugging - can be removed in production
        logging.debug(f'Problem object type: {type(obj)}')

        # Fall back to string representation if all else fails
        return json.dumps(str(obj))


# Get Jinja2 environment
env: Environment = templates.env

# Register filters
env.filters['format_date'] = format_date
env.filters['format_datetime'] = format_datetime
env.filters['custom_tojson'] = tojson_filter
