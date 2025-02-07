"""State exceptions module.

This module defines exceptions related to state transitions and status changes.
"""

from typing import Any, List, Optional

from backend.exceptions.exceptions_base import BusinessError


class StateError(BusinessError):
    """State error exception.

    Raised when operation is not allowed in current state.

    Examples:
    - Cannot delete equipment with active bookings
    - Cannot modify completed booking
    - Cannot retire equipment in use
    """

    pass


class StatusTransitionError(StateError):
    """Status transition error exception.

    Raised when status change is not allowed.

    Examples:
    - Invalid equipment status transition
    - Invalid booking status change
    - Invalid document status update
    """

    def __init__(
        self,
        message: str,
        current_status: str,
        new_status: str,
        allowed_transitions: Optional[List[str]] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize status transition error.

        Args:
            message: Error message
            current_status: Current status
            new_status: Attempted new status
            allowed_transitions: List of allowed transitions
            details: Additional error details
        """
        error_details = details or {}
        error_details.update(
            {
                'current_status': current_status,
                'new_status': new_status,
            }
        )
        if allowed_transitions:
            error_details['allowed_transitions'] = allowed_transitions
        super().__init__(message, error_details)
