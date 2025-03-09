"""Barcode API module.

This module provides API endpoints for barcode generation and validation.
"""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.exceptions import ValidationError
from backend.services import BarcodeService

barcode_router = APIRouter()

# TODO: Restore get_current_active_user import when its location is determined
# For now, endpoints requiring authentication will need to be modified


class ApiResponse(BaseModel):
    """Base API response schema."""

    success: bool = Field(True, description='Whether the operation was successful')
    message: str = Field(
        'Operation completed successfully', description='Response message'
    )


class BarcodeGenerateResponse(ApiResponse):
    """Barcode generation response schema."""

    barcode: str = Field(..., description='Generated barcode')


class BarcodeValidateRequest(BaseModel):
    """Barcode validation request schema."""

    barcode: str = Field(..., description='Barcode to validate')


class BarcodeValidateResponse(ApiResponse):
    """Barcode validation response schema."""

    is_valid: bool = Field(..., description='Whether the barcode is valid')
    sequence_number: int = Field(
        0, description='Sequence number extracted from the barcode'
    )


class NextSequenceResponse(ApiResponse):
    """Next sequence number response schema."""

    next_sequence_number: int = Field(
        ..., description='Next sequence number for barcode generation'
    )


class ErrorResponse(BaseModel):
    """Error response schema."""

    success: bool = Field(False, description='Operation failed')
    error: str = Field(..., description='Error message')
    details: Optional[Dict[str, Any]] = Field(None, description='Error details')


@barcode_router.post(
    '/generate',
    response_model=BarcodeGenerateResponse,
    responses={400: {'model': ErrorResponse}},
    summary='Generate barcode',
    description='Generate a new barcode for equipment',
)
async def generate_barcode(
    db: AsyncSession = Depends(get_db),
    # current_user: User = Depends(get_current_active_user),
) -> BarcodeGenerateResponse:
    """Generate a new barcode.

    Args:
        db: Database session
        current_user: Current authenticated user (temporarily disabled)

    Returns:
        Generated barcode

    Raises:
        HTTPException: If barcode generation fails
    """
    service = BarcodeService(db)
    try:
        barcode = await service.generate_barcode()
        return BarcodeGenerateResponse(
            success=True, barcode=barcode, message='Barcode generated successfully'
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                success=False, error=str(e), details=getattr(e, 'details', None)
            ).dict(),
        )


@barcode_router.post(
    '/validate',
    response_model=BarcodeValidateResponse,
    responses={400: {'model': ErrorResponse}},
    summary='Validate barcode',
    description='Validate a barcode and return its sequence number',
)
async def validate_barcode(
    request: BarcodeValidateRequest,
    db: AsyncSession = Depends(get_db),
    # current_user: User = Depends(get_current_active_user),
) -> BarcodeValidateResponse:
    """Validate a barcode.

    Args:
        request: Barcode validation request
        db: Database session
        current_user: Current authenticated user (temporarily disabled)

    Returns:
        Validation result and sequence number
    """
    service = BarcodeService(db)

    # First check basic format
    is_valid = service.validate_barcode_format(request.barcode)
    if not is_valid:
        return BarcodeValidateResponse(
            success=True,
            message='Barcode validation completed',
            is_valid=False,
            sequence_number=0,
        )

    # Then try to parse components
    try:
        sequence_number = await service.parse_barcode(request.barcode)
        return BarcodeValidateResponse(
            success=True,
            message='Barcode is valid',
            is_valid=True,
            sequence_number=sequence_number,
        )
    except ValidationError:
        return BarcodeValidateResponse(
            success=True,
            message='Barcode validation completed',
            is_valid=False,
            sequence_number=0,
        )


@barcode_router.get(
    '/next',
    response_model=NextSequenceResponse,
    responses={400: {'model': ErrorResponse}},
    summary='Get next sequence number',
    description='Get the next sequence number that will be used for a barcode',
)
async def get_next_sequence_number(
    db: AsyncSession = Depends(get_db),
    # current_user: User = Depends(get_current_active_user),
) -> NextSequenceResponse:
    """Get the next sequence number that will be used for a barcode.

    Args:
        db: Database session
        current_user: Current authenticated user (temporarily disabled)

    Returns:
        Response with the next sequence number
    """
    try:
        service = BarcodeService(db)
        next_number = await service.get_next_sequence_number()
        return NextSequenceResponse(
            success=True,
            message='Next sequence number retrieved successfully',
            next_sequence_number=next_number,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                success=False,
                error='Failed to retrieve next sequence number',
                details={'error': str(e)},
            ).dict(),
        )
