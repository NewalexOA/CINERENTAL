"""Unit tests for category subcategory functionality.

Tests the new get_all_subcategory_ids method and equipment filtering
with subcategories included.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import NotFoundError
from backend.models.category import Category
from backend.models.equipment import Equipment, EquipmentStatus
from backend.services.category import CategoryService
from backend.services.equipment import EquipmentService
from tests.conftest import async_fixture, async_test


class TestCategorySubcategories:
    """Test category subcategory functionality."""

    @async_fixture
    async def category_service(self, db_session: AsyncSession) -> CategoryService:
        """Create category service with database session."""
        return CategoryService(db_session)

    @async_fixture
    async def equipment_service(self, db_session: AsyncSession) -> EquipmentService:
        """Create equipment service with database session."""
        return EquipmentService(db_session)

    @async_fixture
    async def sample_category_hierarchy(
        self, db_session: AsyncSession
    ) -> dict[str, Category]:
        """Create sample category hierarchy in database."""
        # Root category
        cameras = Category(name='Cameras', description='All cameras', parent_id=None)
        db_session.add(cameras)
        await db_session.commit()
        await db_session.refresh(cameras)

        # First level subcategories
        dslr = Category(name='DSLR', description='DSLR cameras', parent_id=cameras.id)
        mirrorless = Category(
            name='Mirrorless', description='Mirrorless cameras', parent_id=cameras.id
        )
        db_session.add_all([dslr, mirrorless])
        await db_session.commit()
        await db_session.refresh(dslr)
        await db_session.refresh(mirrorless)

        # Second level subcategories
        canon_dslr = Category(
            name='Canon DSLR', description='Canon DSLR cameras', parent_id=dslr.id
        )
        nikon_dslr = Category(
            name='Nikon DSLR', description='Nikon DSLR cameras', parent_id=dslr.id
        )
        sony_mirrorless = Category(
            name='Sony Mirrorless',
            description='Sony mirrorless cameras',
            parent_id=mirrorless.id,
        )
        db_session.add_all([canon_dslr, nikon_dslr, sony_mirrorless])
        await db_session.commit()
        await db_session.refresh(canon_dslr)
        await db_session.refresh(nikon_dslr)
        await db_session.refresh(sony_mirrorless)

        return {
            'cameras': cameras,
            'dslr': dslr,
            'mirrorless': mirrorless,
            'canon_dslr': canon_dslr,
            'nikon_dslr': nikon_dslr,
            'sony_mirrorless': sony_mirrorless,
        }

    @async_fixture
    async def sample_equipment(
        self, db_session: AsyncSession, sample_category_hierarchy: dict[str, Category]
    ) -> list[Equipment]:
        """Create sample equipment for testing."""
        categories = sample_category_hierarchy

        equipment_list = [
            Equipment(
                name='Canon 5D Mark IV',
                description='Professional DSLR camera',
                barcode='CATS-000001-5',
                serial_number='C5D001',
                category_id=categories['canon_dslr'].id,
                replacement_cost=3000,
                status=EquipmentStatus.AVAILABLE,
            ),
            Equipment(
                name='Sony A7R V',
                description='High-resolution mirrorless camera',
                barcode='CATS-000002-2',
                serial_number='SA7R001',
                category_id=categories['sony_mirrorless'].id,
                replacement_cost=4000,
                status=EquipmentStatus.AVAILABLE,
            ),
            Equipment(
                name='Nikon D850',
                description='High-resolution DSLR camera',
                barcode='CATS-000003-9',
                serial_number='ND850001',
                category_id=categories['nikon_dslr'].id,
                replacement_cost=3500,
                status=EquipmentStatus.AVAILABLE,
            ),
        ]

        db_session.add_all(equipment_list)
        await db_session.commit()

        for equipment in equipment_list:
            await db_session.refresh(equipment)

        return equipment_list

    @async_test
    async def test_get_all_subcategory_ids_root_category(
        self,
        category_service: CategoryService,
        sample_category_hierarchy: dict[str, Category],
    ) -> None:
        """Test getting all subcategory IDs for root category."""
        categories = sample_category_hierarchy

        # Test
        result = await category_service.get_all_subcategory_ids(
            categories['cameras'].id
        )

        # Assert - should include all categories in hierarchy
        expected_ids = [
            categories['cameras'].id,
            categories['dslr'].id,
            categories['mirrorless'].id,
            categories['canon_dslr'].id,
            categories['nikon_dslr'].id,
            categories['sony_mirrorless'].id,
        ]
        assert sorted(result) == sorted(expected_ids)

    @async_test
    async def test_get_all_subcategory_ids_leaf_category(
        self,
        category_service: CategoryService,
        sample_category_hierarchy: dict[str, Category],
    ) -> None:
        """Test getting all subcategory IDs for leaf category (no children)."""
        categories = sample_category_hierarchy

        # Test
        result = await category_service.get_all_subcategory_ids(
            categories['canon_dslr'].id
        )

        # Assert - should only include the category itself
        assert result == [categories['canon_dslr'].id]

    @async_test
    async def test_get_all_subcategory_ids_middle_category(
        self,
        category_service: CategoryService,
        sample_category_hierarchy: dict[str, Category],
    ) -> None:
        """Test getting all subcategory IDs for middle-level category."""
        categories = sample_category_hierarchy

        # Test
        result = await category_service.get_all_subcategory_ids(categories['dslr'].id)

        # Assert - should include DSLR and its subcategories
        expected_ids = [
            categories['dslr'].id,
            categories['canon_dslr'].id,
            categories['nikon_dslr'].id,
        ]
        assert sorted(result) == sorted(expected_ids)

    @async_test
    async def test_get_all_subcategory_ids_nonexistent_category(
        self, category_service: CategoryService
    ) -> None:
        """Test getting subcategory IDs for nonexistent category."""
        # Test & Assert
        with pytest.raises(ValueError, match='Category with ID 999 not found'):
            await category_service.get_all_subcategory_ids(999)

    @async_test
    async def test_equipment_filtering_with_subcategories(
        self,
        equipment_service: EquipmentService,
        sample_category_hierarchy: dict[str, Category],
        sample_equipment: list[Equipment],
    ) -> None:
        """Test equipment filtering includes subcategories."""
        categories = sample_category_hierarchy

        # Test - filter by root cameras category
        result = await equipment_service.get_equipment_list(
            category_id=categories['cameras'].id
        )

        # Assert - should return all equipment from subcategories
        assert len(result) == 3
        equipment_names = [eq.name for eq in result]
        assert 'Canon 5D Mark IV' in equipment_names
        assert 'Sony A7R V' in equipment_names
        assert 'Nikon D850' in equipment_names

    @async_test
    async def test_equipment_filtering_with_middle_category(
        self,
        equipment_service: EquipmentService,
        sample_category_hierarchy: dict[str, Category],
        sample_equipment: list[Equipment],
    ) -> None:
        """Test equipment filtering with middle-level category."""
        categories = sample_category_hierarchy

        # Test - filter by DSLR category
        result = await equipment_service.get_equipment_list(
            category_id=categories['dslr'].id
        )

        # Assert - should return only DSLR equipment
        assert len(result) == 2
        equipment_names = [eq.name for eq in result]
        assert 'Canon 5D Mark IV' in equipment_names
        assert 'Nikon D850' in equipment_names
        assert 'Sony A7R V' not in equipment_names

    @async_test
    async def test_equipment_filtering_with_leaf_category(
        self,
        equipment_service: EquipmentService,
        sample_category_hierarchy: dict[str, Category],
        sample_equipment: list[Equipment],
    ) -> None:
        """Test equipment filtering with leaf category."""
        categories = sample_category_hierarchy

        # Test - filter by Canon DSLR category (leaf)
        result = await equipment_service.get_equipment_list(
            category_id=categories['canon_dslr'].id
        )

        # Assert - should return only Canon equipment
        assert len(result) == 1
        assert result[0].name == 'Canon 5D Mark IV'

    @async_test
    async def test_equipment_filtering_with_invalid_category(
        self, equipment_service: EquipmentService
    ) -> None:
        """Test equipment filtering with invalid category raises error."""
        # Test & Assert
        with pytest.raises(NotFoundError):
            await equipment_service.get_equipment_list(category_id=999)

    @async_test
    async def test_equipment_query_with_subcategories(
        self,
        equipment_service: EquipmentService,
        sample_category_hierarchy: dict[str, Category],
        sample_equipment: list[Equipment],
    ) -> None:
        """Test equipment query generation includes subcategories."""
        categories = sample_category_hierarchy

        # Test - get query for root category
        query = await equipment_service.get_equipment_list_query(
            category_id=categories['cameras'].id
        )

        # Assert - query should be generated successfully
        assert query is not None
        # Note: Detailed query validation would require more complex database inspection
