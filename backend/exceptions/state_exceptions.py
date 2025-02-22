"""State-related exceptions."""

from typing import Any, List, Optional

from backend.exceptions import BusinessError


class StateError(BusinessError):
    """Base exception for state-related errors.

    This exception is raised when an operation cannot be performed
    due to the current state of an object.

    Args:
        message: Error message
        details: Additional error details
    """

    pass


class StatusTransitionError(StateError):
    """Exception for invalid status transitions.

    This exception is raised when attempting to transition an object
    to an invalid status.

    Args:
        message: Error message
        current_status: Current status
        new_status: Attempted new status
        allowed_transitions: List of allowed transitions
        details: Additional error details
    """

    def __init__(
        self,
        message: str,
        current_status: str,
        new_status: str,
        allowed_transitions: Optional[List[str]] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize exception.

        Args:
            message: Error message
            current_status: Current status
            new_status: Attempted new status
            allowed_transitions: List of allowed transitions
            details: Additional error details
        """
        # Create a descriptive message if not provided
        if not message:
            message = f'Cannot transition from {current_status} to {new_status}'
            if allowed_transitions:
                message += f'. Allowed transitions: {", ".join(allowed_transitions)}'

        error_details = details or {}
        error_details.update(
            {
                'current_status': str(current_status),
                'new_status': str(new_status),
            }
        )
        if allowed_transitions:
            error_details['allowed_transitions'] = [str(t) for t in allowed_transitions]
        super().__init__(message, error_details)
