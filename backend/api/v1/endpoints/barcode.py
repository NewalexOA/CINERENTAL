"""Barcode API module.

This module provides API endpoints for barcode generation and validation.
"""

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.decorators import typed_get, typed_post
from backend.core.database import get_db
from backend.exceptions import ValidationError
from backend.services import BarcodeService
from backend.services.barcode import BarcodeType

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


@typed_post(
    barcode_router,
    '/generate',
    response_model=BarcodeGenerateResponse,
    summary='Generate barcode',
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
        ValidationError: If barcode generation fails
    """
    service = BarcodeService(db)
    barcode = await service.generate_barcode()
    return BarcodeGenerateResponse(
        success=True, barcode=barcode, message='Barcode generated successfully'
    )


@typed_post(
    barcode_router,
    '/validate',
    response_model=BarcodeValidateResponse,
    summary='Validate barcode',
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


@typed_get(
    barcode_router,
    '/next',
    response_model=NextSequenceResponse,
    summary='Get next sequence number',
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
    service = BarcodeService(db)
    next_number = await service.get_next_sequence_number()
    return NextSequenceResponse(
        success=True,
        message='Next sequence number retrieved successfully',
        next_sequence_number=next_number,
    )


@barcode_router.get(
    '/{barcode}/image',
    response_class=Response,
    summary='Get barcode image',
    description='Get a barcode image by its value',
)
async def get_barcode_image(
    barcode: str,
    barcode_type: BarcodeType = Query(
        BarcodeType.CODE128,
        description='Type of barcode to generate',
    ),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Get a barcode image by its value.

    Args:
        barcode: Barcode value
        barcode_type: Type of barcode to generate (code128 or datamatrix)
        db: Database session

    Returns:
        PNG image of the barcode or datamatrix

    Raises:
        ValidationError: If barcode is invalid or image generation fails
    """
    service = BarcodeService(db)

    # Relaxed validation for image generation: accept any non-empty string
    if not isinstance(barcode, str) or not barcode.strip():
        raise ValidationError(
            'Invalid barcode format',
            details={'barcode': barcode},
        )

    # Generate barcode image
    image_data, content_type = service.generate_barcode_image(barcode, barcode_type)
    return Response(content=image_data, media_type=content_type)
