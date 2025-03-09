"""Unit tests for equipment barcode regeneration.

This module contains tests for equipment barcode regeneration functionality.
"""

from unittest.mock import patch

import pytest

from backend.exceptions import NotFoundError
from backend.models import Equipment
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
    ) -> None:
        """Test successful barcode regeneration."""
        # Mock barcode generation to return predictable value
        with patch.object(
            BarcodeService,
            'generate_barcode',
            return_value='1234567890',  # 10-digit string (including checksum)
        ):
            # Store original barcode
            original_barcode = test_equipment.barcode

            # Regenerate barcode
            result = await service.regenerate_barcode(test_equipment.id)

            # Validate result
            assert isinstance(result, EquipmentResponse)
            assert result.id == test_equipment.id
            assert result.barcode == '1234567890'
            assert result.barcode != original_barcode

    @async_test
    async def test_regenerate_barcode_equipment_not_found(
        self,
        service: EquipmentService,
    ) -> None:
        """Test barcode regeneration with non-existent equipment."""
        non_existent_id = 9999

        # Try to regenerate barcode for non-existent equipment
        with pytest.raises(NotFoundError) as exc_info:
            await service.regenerate_barcode(non_existent_id)

        # Validate error
        assert 'not found' in str(exc_info.value).lower()
