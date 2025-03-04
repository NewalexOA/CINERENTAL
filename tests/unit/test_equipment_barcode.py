"""Unit tests for equipment barcode regeneration.

This module contains tests for equipment barcode regeneration functionality.
"""

from unittest.mock import patch

import pytest

from backend.exceptions import NotFoundError, ValidationError
from backend.models import Equipment, SubcategoryPrefix
from backend.schemas import EquipmentResponse
from backend.services import BarcodeService, EquipmentService
from tests.conftest import async_test


class TestEquipmentBarcodeRegeneration:
    """Equipment barcode regeneration tests."""

    @async_test
    async def test_regenerate_barcode_success(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
        test_subcategory_prefix: SubcategoryPrefix,
    ) -> None:
        """Test successful barcode regeneration."""
        # Mock barcode generation to return predictable value
        with patch.object(
            BarcodeService,
            'generate_barcode',
            return_value='CATS-000002-7',
        ) as mock_generate:
            # Call regenerate barcode
            response = await service.regenerate_barcode(
                equipment_id=test_equipment.id,
                subcategory_prefix_id=test_subcategory_prefix.id,
            )

            # Verify response
            assert isinstance(response, EquipmentResponse)
            assert response.id == test_equipment.id
            assert response.barcode == 'CATS-000002-7'

            # Verify barcode generation was called with correct arguments
            mock_generate.assert_called_once_with(
                test_equipment.category_id, test_subcategory_prefix.id
            )

    @async_test
    async def test_regenerate_barcode_equipment_not_found(
        self,
        service: EquipmentService,
        test_subcategory_prefix: SubcategoryPrefix,
    ) -> None:
        """Test barcode regeneration with non-existent equipment."""
        # Use a non-existent equipment ID
        non_existent_id = 9999

        # Attempt to regenerate barcode should fail
        with pytest.raises(NotFoundError, match='Equipment with ID .* not found'):
            await service.regenerate_barcode(
                equipment_id=non_existent_id,
                subcategory_prefix_id=test_subcategory_prefix.id,
            )

    @async_test
    async def test_regenerate_barcode_subcategory_validation(
        self,
        service: EquipmentService,
        test_equipment: Equipment,
    ) -> None:
        """Test barcode regeneration with invalid subcategory prefix."""
        # Mock barcode generation to raise validation error
        with patch.object(
            BarcodeService,
            'generate_barcode',
            side_effect=ValidationError('Invalid subcategory prefix'),
        ) as mock_generate:
            # Use a non-existent subcategory prefix ID
            non_existent_id = 9999

            # Attempt to regenerate barcode should fail with validation error
            with pytest.raises(ValidationError, match='Invalid subcategory prefix'):
                await service.regenerate_barcode(
                    equipment_id=test_equipment.id,
                    subcategory_prefix_id=non_existent_id,
                )

            # Verify barcode generation was called with correct arguments
            mock_generate.assert_called_once_with(
                test_equipment.category_id, non_existent_id
            )
