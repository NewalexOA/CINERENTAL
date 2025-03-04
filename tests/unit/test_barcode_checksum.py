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
        # Test with different barcode parts
        test_cases = [
            # Camera category, Tripod subcategory, sequence 1
            ('CATS-000001', 5),
            # Lens category, Zoom subcategory, sequence 123
            ('LNZM-000123', 8),
            # Lighting category, Flood subcategory, sequence 12345
            ('LTFL-012345', 3),
            # Sound category, Microphone subcategory, sequence 654321
            ('SDMC-654321', 0),
            # Accessories category, Bag subcategory, sequence 999999
            ('ACBG-999999', 9),
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
        barcode_part = 'CATS-000001'

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
            'CATS-000001-5',
            'LNZM-000123-8',
            'LTFL-012345-3',
            'SDMC-654321-0',
            'ACBG-999999-9',
        ]

        for barcode in valid_barcodes:
            assert barcode_service.validate_barcode_format(
                barcode
            ), f'Barcode {barcode} should be valid'

        # Invalid barcodes with incorrect checksums
        invalid_barcodes = [
            'CATS-000001-6',  # Incorrect checksum
            'LNZM-000123-7',  # Incorrect checksum
            'LTFL-012345-4',  # Incorrect checksum
            'SDMC-654321-1',  # Incorrect checksum
            'ACBG-999999-8',  # Incorrect checksum
        ]

        for barcode in invalid_barcodes:
            assert not barcode_service.validate_barcode_format(
                barcode
            ), f'Barcode {barcode} should be invalid'

    def test_checksum_with_special_characters(
        self, barcode_service: BarcodeService
    ) -> None:
        """Test checksum calculation with special characters."""
        # Test with barcode parts containing special characters
        test_cases = [
            ('CATS-000001', 5),  # Normal case
            ('CATS_000001', 5),  # With underscore
            ('CATS/000001', 5),  # With slash
            ('CATS-000001-', 5),  # With trailing dash
        ]

        for barcode_part, expected_checksum in test_cases:
            actual_checksum = barcode_service._calculate_checksum(barcode_part)
            assert actual_checksum == expected_checksum, (
                f'Checksum for {barcode_part} should be {expected_checksum}, '
                f'got {actual_checksum}'
            )

    def test_checksum_with_lowercase(self, barcode_service: BarcodeService) -> None:
        """Test checksum calculation with lowercase letters."""
        # Test with barcode parts containing lowercase letters
        uppercase_part = 'CATS-000001'
        lowercase_part = 'cats-000001'

        # Checksums should be the same regardless of case
        uppercase_checksum = barcode_service._calculate_checksum(uppercase_part)
        lowercase_checksum = barcode_service._calculate_checksum(lowercase_part)

        assert (
            uppercase_checksum == lowercase_checksum
        ), f'Checksum for {uppercase_part} and {lowercase_part} should be the same'
