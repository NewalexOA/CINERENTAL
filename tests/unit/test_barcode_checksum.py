"""Unit tests for barcode checksum algorithm."""

from sqlalchemy.ext.asyncio import AsyncSession

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


class TestBarcodeChecksum:
    """Tests for barcode checksum algorithm."""

    def test_calculate_checksum(self, barcode_service: BarcodeService) -> None:
        """Test calculating checksum for a barcode."""
        # Test with different barcode parts (first 9 digits of 11-digit barcode)
        test_cases = [
            # Sequence 000000001
            ('000000001', 1),
            # Sequence 000000123
            ('000000123', 23),
            # Sequence 000012345
            ('000012345', 45),
            # Sequence 000654321
            ('000654321', 22),
            # Sequence 000999999
            ('000999999', 60),
        ]

        for barcode_part, expected_checksum in test_cases:
            actual_checksum = barcode_service._calculate_checksum(barcode_part)
            assert actual_checksum == expected_checksum, (
                f'Checksum for {barcode_part} should be {expected_checksum}, '
                f'got {actual_checksum}'
            )

    def test_checksum_consistency(self, barcode_service: BarcodeService) -> None:
        """Test that checksum calculation is consistent."""
        # Calculate checksum multiple times for the same barcode part
        barcode_part = '000000001'

        # Calculate checksum 10 times
        checksums = [
            barcode_service._calculate_checksum(barcode_part) for _ in range(10)
        ]

        # All checksums should be the same
        assert len(set(checksums)) == 1, 'Checksum calculation is not consistent'

    @async_test
    async def test_validate_barcode_with_checksum(
        self, barcode_service: BarcodeService
    ) -> None:
        """Test validating barcode with checksum."""
        # Valid barcodes with correct checksums
        valid_barcodes = [
            '00000000101',
            '00000012323',
            '00001234545',
            '00065432122',
            '00099999960',
        ]

        for barcode in valid_barcodes:
            assert barcode_service.validate_barcode_format(
                barcode
            ), f'Barcode {barcode} should be valid'

        # Invalid barcodes with incorrect checksums
        invalid_barcodes = [
            '00000000102',  # Incorrect checksum
            '00000012324',  # Incorrect checksum
            '00001234546',  # Incorrect checksum
            '00065432123',  # Incorrect checksum
            '00099999961',  # Incorrect checksum
        ]

        for barcode in invalid_barcodes:
            assert not barcode_service.validate_barcode_format(
                barcode
            ), f'Barcode {barcode} should be invalid'

    def test_checksum_with_special_characters(
        self, barcode_service: BarcodeService
    ) -> None:
        """Test that special characters in input are not allowed."""
        # Test with inputs containing non-numeric characters
        invalid_inputs = [
            'A00000001',  # With letter
            '00000_001',  # With underscore
            '00000/001',  # With slash
            '-00000001',  # With dash
        ]

        for invalid_input in invalid_inputs:
            try:
                barcode_service._calculate_checksum(invalid_input)
                assert False, f'Expected ValueError for input {invalid_input}'
            except ValueError:
                # This is expected - non-numeric characters should raise ValueError
                pass

    def test_checksum_with_lowercase(self, barcode_service: BarcodeService) -> None:
        """Test that only numeric input is acceptable."""
        # Numeric input should work
        numeric_input = '000000001'
        try:
            barcode_service._calculate_checksum(numeric_input)
        except ValueError:
            assert (
                False
            ), f'No error should occur for valid numeric input {numeric_input}'

        # Lowercase letters should cause ValueErrors
        try:
            barcode_service._calculate_checksum('abcdefghi')
            assert False, 'Expected ValueError for lowercase letters'
        except ValueError:
            # This is expected
            pass
