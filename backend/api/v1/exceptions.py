"""Exception handlers for FastAPI."""

from typing import Any

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError

from backend.exceptions import (
    AvailabilityError,
    BusinessError,
    ConflictError,
    DocumentError,
    NotFoundError,
    PaymentError,
    StateError,
    ValidationError,
)


async def business_exception_handler(
    request: Request, exc: BusinessError
) -> JSONResponse:
    """Handle business logic errors.

    Maps different types of business errors to appropriate HTTP status codes.
    """
    status_code = status.HTTP_400_BAD_REQUEST

    if isinstance(exc, NotFoundError):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, ConflictError):
        status_code = status.HTTP_409_CONFLICT
    elif isinstance(exc, ValidationError):
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    elif isinstance(exc, StateError):
        status_code = status.HTTP_409_CONFLICT
    elif isinstance(exc, AvailabilityError):
        status_code = status.HTTP_409_CONFLICT
    elif isinstance(exc, PaymentError):
        status_code = status.HTTP_400_BAD_REQUEST
    elif isinstance(exc, DocumentError):
        status_code = status.HTTP_400_BAD_REQUEST

    content: dict[str, Any] = {
        'detail': str(exc.message),  # Ensure message is a string
    }

    if exc.details:
        # Convert any non-serializable values in details to strings
        serializable_details = {}
        for key, value in exc.details.items():
            if isinstance(value, (str, int, float, bool, type(None))):
                serializable_details[key] = value
            else:
                serializable_details[key] = str(value)
        content['details'] = serializable_details

    return JSONResponse(
        status_code=status_code,
        content=content,
    )


async def validation_exception_handler(
    request: Request, exc: PydanticValidationError | RequestValidationError
) -> JSONResponse:
    """Handle Pydantic and FastAPI validation errors.

    Convert validation errors to HTTP 400 Bad Request responses.
    """
    if isinstance(exc, RequestValidationError):
        errors = exc.errors()
        # Convert any non-serializable objects in error details to strings
        for error in errors:
            if 'ctx' in error and 'error' in error['ctx']:
                error['ctx']['error'] = str(error['ctx']['error'])
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={'detail': errors},
        )

    errors = exc.errors()
    # Convert any non-serializable objects in error details to strings
    for error in errors:
        if 'ctx' in error and 'error' in error['ctx']:
            error['ctx']['error'] = str(error['ctx']['error'])

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            'detail': errors,
            'body': exc.model.model_dump() if hasattr(exc, 'model') else None,
        },
    )
