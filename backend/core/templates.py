"""Templates configuration module."""

from datetime import datetime
from typing import Optional, Union

from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from jinja2 import Environment

# Initialize templates
templates = Jinja2Templates(directory='frontend/templates')

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


# Get Jinja2 environment
env: Environment = templates.env

# Register filters
env.filters['date'] = format_date
