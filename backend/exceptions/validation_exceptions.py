"""Validation exceptions module.

This module defines exceptions related to data validation.
"""

from datetime import datetime
from typing import Any, Optional

from backend.exceptions.exceptions_base import BusinessError


class ValidationError(BusinessError):
    """Validation error exception.

    Raised when input data fails validation.

    Examples:
    - Invalid email format
    - Missing required field
    - Value out of allowed range
    """

    pass


class DateError(ValidationError):
    """Date validation error exception.

    Raised when date validation fails.

    Examples:
    - Start date after end date
    - Date in past
    - Date outside allowed range
    """

    def __init__(
        self,
        message: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize date error.

        Args:
            message: Error message
            start_date: Start date that failed validation
            end_date: End date that failed validation
            details: Additional error details
        """
        error_details = details or {}
        if start_date:
            error_details['start_date'] = start_date.isoformat()
        if end_date:
            error_details['end_date'] = end_date.isoformat()
        super().__init__(message, error_details)


class DurationError(ValidationError):
    """Duration validation error exception.

    Raised when duration validation fails.

    Examples:
    - Duration too short
    - Duration too long
    - Invalid rental period
    """

    def __init__(
        self,
        message: str,
        min_days: Optional[int] = None,
        max_days: Optional[int] = None,
        actual_days: Optional[int] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize duration error.

        Args:
            message: Error message
            min_days: Minimum allowed days
            max_days: Maximum allowed days
            actual_days: Actual duration in days
            details: Additional error details
        """
        error_details = details or {}
        if min_days is not None:
            error_details['min_days'] = min_days
        if max_days is not None:
            error_details['max_days'] = max_days
        if actual_days is not None:
            error_details['actual_days'] = actual_days
        super().__init__(message, error_details)
