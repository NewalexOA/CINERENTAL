"""Resource exceptions module.

This module defines exceptions related to resource operations.
"""

from typing import Any, Optional

from backend.exceptions.exceptions_base import BusinessError


class NotFoundError(BusinessError):
    """Not found error exception.

    Raised when requested resource does not exist.

    Examples:
    - Equipment not found
    - Booking not found
    - User not found
    """

    pass


class ConflictError(BusinessError):
    """Conflict error exception.

    Raised when resource operation causes conflict.

    Examples:
    - Duplicate equipment ID
    - Overlapping bookings
    - Concurrent modifications
    """

    pass


class AvailabilityError(BusinessError):
    """Availability error exception.

    Raised when resource is not available.

    Examples:
    - Equipment already booked
    - Insufficient inventory
    - Resource temporarily unavailable
    """

    def __init__(
        self,
        message: str,
        resource_id: str,
        resource_type: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize availability error.

        Args:
            message: Error message
            resource_id: ID of unavailable resource
            resource_type: Type of resource (equipment, document etc)
            details: Additional error details
        """
        error_details = details or {}
        error_details.update(
            {
                'resource_id': resource_id,
            }
        )
        if resource_type:
            error_details['resource_type'] = resource_type
        super().__init__(message, error_details)
