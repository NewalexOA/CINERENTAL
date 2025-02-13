"""Base exceptions module.

This module defines the base exception class for all business logic errors.
"""

from typing import Any, Optional


class BusinessError(Exception):
    """Base class for all business logic errors.

    This class serves as the foundation for all custom exceptions in the system.
    It provides a standardized way to include error messages and additional details.

    Attributes:
        message: Human-readable error description
        details: Additional error context as a dictionary
    """

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None) -> None:
        """Initialize business error.

        Args:
            message: Error message describing what went wrong
            details: Optional dictionary with additional error context
        """
        super().__init__(message)
        self.message = message
        self.details = details or {}
