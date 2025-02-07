"""Process exceptions module.

This module defines exceptions related to business process operations.
"""

from typing import Any, Optional

from backend.exceptions.exceptions_base import BusinessError


class PaymentError(BusinessError):
    """Payment error exception.

    Raised when payment operation fails.

    Examples:
    - Payment declined
    - Invalid payment method
    - Insufficient funds
    """

    def __init__(
        self,
        message: str,
        payment_id: Optional[str] = None,
        payment_method: Optional[str] = None,
        amount: Optional[float] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize payment error.

        Args:
            message: Error message
            payment_id: ID of failed payment
            payment_method: Payment method that failed
            amount: Payment amount
            details: Additional error details
        """
        error_details = details or {}
        if payment_id:
            error_details['payment_id'] = payment_id
        if payment_method:
            error_details['payment_method'] = payment_method
        if amount is not None:
            error_details['amount'] = amount
        super().__init__(message, error_details)


class DocumentError(BusinessError):
    """Document error exception.

    Raised when document operation fails.

    Examples:
    - Invalid document format
    - Document generation failed
    - Document signing failed
    """

    def __init__(
        self,
        message: str,
        document_id: Optional[str] = None,
        document_type: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize document error.

        Args:
            message: Error message
            document_id: ID of document that failed
            document_type: Type of document
            details: Additional error details
        """
        error_details = details or {}
        if document_id:
            error_details['document_id'] = document_id
        if document_type:
            error_details['document_type'] = document_type
        super().__init__(message, error_details)
