"""Unit tests for barcode service."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import ValidationError
from backend.services.barcode import BarcodeService
from tests.conftest import async_fixture, async_test


@async_fixture
async def barcode_service(db_session: AsyncSession) -> BarcodeService:
    """Create barcode service for tests.

    Args:
        db_session: Database session

    Returns:
        Barcode service instance
    """
    return BarcodeService(db_session)


class TestBarcodeService:
    """Tests for barcode service."""

    @async_test
    async def test_generate_barcode(
        self,
        barcode_service: BarcodeService,
    ) -> None:
        """Test generating a barcode."""
        barcode = await barcode_service.generate_barcode()

        # Check barcode format
        assert isinstance(barcode, str)
        assert len(barcode) == 11  # 9 digits for sequence + 2 digits for checksum

    @async_test
    async def test_validate_barcode_format(
        self,
        barcode_service: BarcodeService,
    ) -> None:
        """Test validating barcode format."""
        # Valid barcode
        valid_barcode = '000000001XX'  # Replace XX with valid checksum
        valid_barcode = await barcode_service.generate_barcode()  # Get a valid barcode

        # Should not raise exception
        barcode_service.validate_barcode_format(valid_barcode)

        # Invalid barcode - wrong length
        with pytest.raises(ValidationError):
            barcode_service.validate_barcode_format('12345')

        # Invalid barcode - non-numeric
        with pytest.raises(ValidationError):
            barcode_service.validate_barcode_format('ABCDEFGHIJK')

    @async_test
    async def test_sequential_barcode_generation(
        self,
        barcode_service: BarcodeService,
    ) -> None:
        """Test sequential barcode generation."""
        # Generate multiple barcodes
        barcode1 = await barcode_service.generate_barcode()
        barcode2 = await barcode_service.generate_barcode()
        barcode3 = await barcode_service.generate_barcode()

        # Extract sequence numbers
        sequence1 = int(barcode1[:-2])
        sequence2 = int(barcode2[:-2])
        sequence3 = int(barcode3[:-2])

        # Check that sequences are sequential
        assert sequence2 == sequence1 + 1
        assert sequence3 == sequence2 + 1
