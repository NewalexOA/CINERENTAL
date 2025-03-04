"""Barcode API module.

This module provides API endpoints for barcode generation and validation.
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.exceptions import ValidationError
from backend.services import BarcodeService

barcode_router = APIRouter()

# TODO: Restore get_current_active_user import when its location is determined
# For now, endpoints requiring authentication will need to be modified


class BarcodeGenerateRequest(BaseModel):
    """Barcode generation request schema."""

    category_id: int = Field(..., description='Category ID')
    subcategory_prefix_id: int = Field(..., description='Subcategory prefix ID')


class BarcodeGenerateResponse(BaseModel):
    """Barcode generation response schema."""

    barcode: str = Field(..., description='Generated barcode')


class BarcodeValidateRequest(BaseModel):
    """Barcode validation request schema."""

    barcode: str = Field(..., description='Barcode to validate')


class BarcodeValidateResponse(BaseModel):
    """Barcode validation response schema."""

    is_valid: bool = Field(..., description='Whether the barcode is valid')
    details: Dict[str, Any] = Field(
        default_factory=dict, description='Barcode details if valid'
    )


@barcode_router.post(
    '/generate',
    response_model=BarcodeGenerateResponse,
    summary='Generate barcode',
    description='Generate a new barcode for equipment',
)
async def generate_barcode(
    request: BarcodeGenerateRequest,
    db: AsyncSession = Depends(get_db),
    # current_user: User = Depends(get_current_active_user),
) -> BarcodeGenerateResponse:
    """Generate a new barcode.

    Args:
        request: Barcode generation request
        db: Database session
        current_user: Current authenticated user (temporarily disabled)

    Returns:
        Generated barcode

    Raises:
        HTTPException: If barcode generation fails
    """
    service = BarcodeService(db)
    try:
        barcode = await service.generate_barcode(
            category_id=request.category_id,
            subcategory_prefix_id=request.subcategory_prefix_id,
        )
        return BarcodeGenerateResponse(barcode=barcode)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@barcode_router.post(
    '/validate',
    response_model=BarcodeValidateResponse,
    summary='Validate barcode',
    description='Validate a barcode and return its components',
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
        Validation result and barcode details
    """
    service = BarcodeService(db)

    # First check basic format
    is_valid = service.validate_barcode_format(request.barcode)
    if not is_valid:
        return BarcodeValidateResponse(is_valid=False)

    # Then try to parse components
    try:
        category, subcategory_prefix, sequence_number = await service.parse_barcode(
            request.barcode
        )
        return BarcodeValidateResponse(
            is_valid=True,
            details={
                'category': category,
                'subcategory_prefix': subcategory_prefix,
                'sequence_number': sequence_number,
            },
        )
    except ValidationError:
        return BarcodeValidateResponse(is_valid=False)
