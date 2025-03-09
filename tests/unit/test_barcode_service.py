"""Unit tests for barcode service."""

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.barcode import BarcodeService
from tests.conftest import async_test


@pytest_asyncio.fixture
async def barcode_service(db_session: AsyncSession) -> BarcodeService:
    """Create a barcode service for tests."""
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
        assert barcode.isdigit(), 'Barcode should be numeric'
        assert len(barcode) > 0, 'Barcode should not be empty'

    @async_test
    async def test_validate_barcode_format(
        self,
        barcode_service: BarcodeService,
    ) -> None:
        """Test validating barcode format."""
        # Generate a valid barcode
        valid_barcode = await barcode_service.generate_barcode()

        # Should not raise exception - valid barcode
        assert barcode_service.validate_barcode_format(valid_barcode)

        # Invalid barcode - wrong length
        assert not barcode_service.validate_barcode_format('12345')

        # Invalid barcode - non-numeric
        assert not barcode_service.validate_barcode_format('ABCDEFGHIJK')

        # Invalid barcode - wrong checksum
        sequence_part = valid_barcode[: barcode_service.SEQUENCE_LENGTH]
        invalid_checksum = '99'  # Unlikely to be the correct checksum
        invalid_barcode = f'{sequence_part}{invalid_checksum}'
        assert not barcode_service.validate_barcode_format(invalid_barcode)

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

        # Convert to integers to check sequence
        int1 = int(barcode1)
        int2 = int(barcode2)
        int3 = int(barcode3)

        # Check that sequences are increasing
        assert int2 > int1
        assert int3 > int2
