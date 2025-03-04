"""Unit tests for barcode service."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import ValidationError
from backend.models import Category, SubcategoryPrefix
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
        test_category_with_prefix: Category,
        test_subcategory_prefix: SubcategoryPrefix,
    ) -> None:
        """Test generating a barcode."""
        barcode = await barcode_service.generate_barcode(
            category_id=test_category_with_prefix.id,
            subcategory_prefix_id=test_subcategory_prefix.id,
        )

        # Check barcode format
        assert isinstance(barcode, str)
        assert len(barcode.split('-')) == 3

        # Check prefix part
        prefix_part = barcode.split('-')[0]
        cat_prefix = test_category_with_prefix.prefix
        subcat_prefix = test_subcategory_prefix.prefix
        expected_prefix = f'{cat_prefix}{subcat_prefix}'
        assert prefix_part == expected_prefix

        # Check sequence part
        sequence_part = barcode.split('-')[1]
        assert len(sequence_part) == 6
        assert sequence_part.isdigit()

        # Check checksum part
        checksum_part = barcode.split('-')[2]
        assert len(checksum_part) == 1
        assert checksum_part.isdigit()

        # Validate the barcode
        assert barcode_service.validate_barcode_format(barcode)

    @async_test
    async def test_generate_barcode_with_invalid_category(
        self,
        barcode_service: BarcodeService,
        test_subcategory_prefix: SubcategoryPrefix,
    ) -> None:
        """Test generating a barcode with invalid category."""
        with pytest.raises(ValidationError) as excinfo:
            await barcode_service.generate_barcode(
                category_id=999999,  # Non-existent category ID
                subcategory_prefix_id=test_subcategory_prefix.id,
            )

        assert 'Category not found' in str(excinfo.value)

    @async_test
    async def test_generate_barcode_with_invalid_subcategory_prefix(
        self,
        barcode_service: BarcodeService,
        test_category_with_prefix: Category,
    ) -> None:
        """Test generating a barcode with invalid subcategory prefix."""
        with pytest.raises(ValidationError) as excinfo:
            await barcode_service.generate_barcode(
                category_id=test_category_with_prefix.id,
                subcategory_prefix_id=999999,  # Non-existent subcategory prefix ID
            )

        assert 'Subcategory prefix not found' in str(excinfo.value)

    @async_test
    async def test_validate_barcode_format(
        self,
        barcode_service: BarcodeService,
    ) -> None:
        """Test validating barcode format."""
        # Valid barcode
        assert barcode_service.validate_barcode_format('CATS-000001-5')

        # Invalid formats
        # Missing checksum
        assert not barcode_service.validate_barcode_format('CATS-000001')
        # Sequence too short
        assert not barcode_service.validate_barcode_format('CATS-00001-5')
        # Prefix too short
        assert not barcode_service.validate_barcode_format('CAT-000001-5')
        # Non-digit sequence
        assert not barcode_service.validate_barcode_format('CATS-00000A-5')
        # Non-digit checksum
        assert not barcode_service.validate_barcode_format('CATS-000001-A')

    @async_test
    async def test_parse_barcode(
        self,
        barcode_service: BarcodeService,
        test_category_with_prefix: Category,
        test_subcategory_prefix: SubcategoryPrefix,
    ) -> None:
        """Test parsing a barcode."""
        # First generate a barcode
        barcode = await barcode_service.generate_barcode(
            category_id=test_category_with_prefix.id,
            subcategory_prefix_id=test_subcategory_prefix.id,
        )

        # Then parse it
        result = await barcode_service.parse_barcode(barcode)
        category, subcategory_prefix, sequence_number = result

        # Check parsed components
        assert category['id'] == test_category_with_prefix.id
        assert subcategory_prefix['id'] == test_subcategory_prefix.id
        assert isinstance(sequence_number, int)
        assert sequence_number > 0

    @async_test
    async def test_parse_invalid_barcode(
        self,
        barcode_service: BarcodeService,
    ) -> None:
        """Test parsing an invalid barcode."""
        with pytest.raises(ValidationError) as excinfo:
            await barcode_service.parse_barcode('INVALID-BARCODE')

        assert 'Invalid barcode format' in str(excinfo.value)

    @async_test
    async def test_sequential_barcode_generation(
        self,
        barcode_service: BarcodeService,
        test_category_with_prefix: Category,
        test_subcategory_prefix: SubcategoryPrefix,
    ) -> None:
        """Test sequential generation of barcodes."""
        # Generate first barcode
        barcode1 = await barcode_service.generate_barcode(
            category_id=test_category_with_prefix.id,
            subcategory_prefix_id=test_subcategory_prefix.id,
        )

        # Generate second barcode
        barcode2 = await barcode_service.generate_barcode(
            category_id=test_category_with_prefix.id,
            subcategory_prefix_id=test_subcategory_prefix.id,
        )

        # Extract sequence numbers
        sequence1 = int(barcode1.split('-')[1])
        sequence2 = int(barcode2.split('-')[1])

        # Check that sequence2 = sequence1 + 1
        assert sequence2 == sequence1 + 1
