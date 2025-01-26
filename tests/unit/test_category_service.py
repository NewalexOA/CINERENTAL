"""Unit tests for category service."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.category import Category
from backend.services.category import CategoryService


@pytest.fixture  # type: ignore[misc]
async def category_service(db_session: AsyncSession) -> CategoryService:
    """Create category service for tests.

    Args:
        db_session: Database session

    Returns:
        Category service instance
    """
    return CategoryService(db_session)


class TestCategoryService:
    """Tests for category service."""

    async def test_create_category(self, category_service: CategoryService) -> None:
        """Test creating a category."""
        category = await category_service.create_category(
            name='Test Category',
            description='Test Description',
        )

        assert isinstance(category, Category)
        assert category.id is not None
        assert category.name == 'Test Category'
        assert category.description == 'Test Description'

    async def test_get_category(self, category_service: CategoryService) -> None:
        """Test getting a category."""
        created = await category_service.create_category(
            name='Test Category',
            description='Test Description',
        )

        result = await category_service.get_category(created.id)
        assert isinstance(result, Category)
        assert result.name == 'Test Category'
        assert result.description == 'Test Description'

    async def test_get_nonexistent_category(
        self,
        category_service: CategoryService,
    ) -> None:
        """Test getting a nonexistent category."""
        category = await category_service.get_category(999)
        assert category is None

    async def test_update_category(self, category_service: CategoryService) -> None:
        """Test updating a category."""
        category = await category_service.create_category(
            name='Test Category',
            description='Test Description',
        )

        updated = await category_service.update_category(
            category.id,
            name='Updated Category',
            description='Updated Description',
        )

        assert isinstance(updated, Category)
        assert updated.name == 'Updated Category'
        assert updated.description == 'Updated Description'

    async def test_update_nonexistent_category(
        self,
        category_service: CategoryService,
    ) -> None:
        """Test updating a nonexistent category."""
        with pytest.raises(ValueError, match='Category with ID 999 not found'):
            await category_service.update_category(
                999,
                name='Updated Category',
                description='Updated Description',
            )

    async def test_get_categories(self, category_service: CategoryService) -> None:
        """Test getting all categories."""
        await category_service.create_category(
            name='Category 1',
            description='Description 1',
        )
        await category_service.create_category(
            name='Category 2',
            description='Description 2',
        )
        await category_service.create_category(
            name='Category 3',
            description='Description 3',
        )

        categories = await category_service.get_categories()
        assert len(categories) == 3
        assert all(isinstance(cat, Category) for cat in categories)
        assert categories[0].name == 'Category 1'
        assert categories[1].name == 'Category 2'
        assert categories[2].name == 'Category 3'

    async def test_search_categories(self, category_service: CategoryService) -> None:
        """Test searching categories."""
        await category_service.create_category(
            name='Test',
            description='Description',
        )
        await category_service.create_category(
            name='Other',
            description='Test Description',
        )
        await category_service.create_category(
            name='Another',
            description='Another Description',
        )

        categories = await category_service.search_categories('test')
        assert len(categories) == 2
        assert all(isinstance(cat, Category) for cat in categories)

    async def test_get_with_equipment_count(
        self,
        category_service: CategoryService,
    ) -> None:
        """Test getting categories with equipment count."""
        await category_service.create_category(
            name='Test',
            description='Description',
        )

        categories = await category_service.get_with_equipment_count()
        assert len(categories) == 1
        assert isinstance(categories[0], Category)
        assert hasattr(categories[0], 'equipment_count')
        assert getattr(categories[0], 'equipment_count') == 0
