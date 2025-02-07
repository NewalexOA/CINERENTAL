"""Exception handlers for FastAPI."""

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

    return JSONResponse(
        status_code=status_code,
        content={
            'detail': exc.message,
            'details': exc.details,
        },
    )


async def validation_exception_handler(
    request: Request, exc: PydanticValidationError | RequestValidationError
) -> JSONResponse:
    """Handle Pydantic and FastAPI validation errors.

    Convert validation errors to HTTP 400 Bad Request responses.
    """
    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={'detail': exc.errors()},
        )

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            'detail': exc.errors(),
            'body': exc.model.model_dump() if hasattr(exc, 'model') else None,
        },
    )
