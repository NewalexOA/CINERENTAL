"""CINERENTAL exceptions package.

This package provides a comprehensive set of exceptions for handling various error cases
in the CINERENTAL application.
"""

from backend.exceptions.exceptions_base import BusinessError
from backend.exceptions.process_exceptions import DocumentError, PaymentError
from backend.exceptions.resource_exceptions import (
    AvailabilityError,
    ConflictError,
    NotFoundError,
)
from backend.exceptions.state_exceptions import StateError, StatusTransitionError
from backend.exceptions.validation_exceptions import (
    DateError,
    DurationError,
    ValidationError,
)

__all__ = [
    # Base exceptions
    'BusinessError',
    # Validation exceptions
    'ValidationError',
    'DateError',
    'DurationError',
    # State exceptions
    'StateError',
    'StatusTransitionError',
    # Resource exceptions
    'NotFoundError',
    'ConflictError',
    'AvailabilityError',
    # Process exceptions
    'PaymentError',
    'DocumentError',
]
