"""Unit tests for category service."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import NotFoundError
from backend.models.category import Category
from backend.services.category import CategoryService
from tests.conftest import async_fixture, async_test


@async_fixture
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

    @async_test
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

    @async_test
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

    @async_test
    async def test_get_nonexistent_category(
        self,
        category_service: CategoryService,
    ) -> None:
        """Test getting a nonexistent category."""
        category = await category_service.get_category(999)
        assert category is None

    @async_test
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

    @async_test
    async def test_update_nonexistent_category(
        self,
        category_service: CategoryService,
    ) -> None:
        """Test updating a nonexistent category."""
        with pytest.raises(NotFoundError, match='Category with ID 999 not found'):
            await category_service.update_category(
                999,
                name='Updated Category',
                description='Updated Description',
            )

    @async_test
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

    @async_test
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

    @async_test
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


class TestSortPathMap:
    """Tests for the ancestry map used to reproduce the print form ordering."""

    @async_test
    async def test_root_category_path_is_itself(
        self,
        category_service: CategoryService,
    ) -> None:
        """Test that a root category maps to a single-element path."""
        root = await category_service.create_category(
            name='Root',
            description='Root category',
        )

        sort_paths = await category_service.get_sort_path_map()

        assert sort_paths[root.id] == [root.id]

    @async_test
    async def test_nested_path_runs_from_root_down(
        self,
        category_service: CategoryService,
    ) -> None:
        """Test that a nested category maps to its full ancestry, root first."""
        root = await category_service.create_category(
            name='Root',
            description='Root category',
        )
        child = await category_service.create_category(
            name='Child',
            description='Child category',
            parent_id=root.id,
        )
        grandchild = await category_service.create_category(
            name='Grandchild',
            description='Grandchild category',
            parent_id=child.id,
        )

        sort_paths = await category_service.get_sort_path_map()

        assert sort_paths[grandchild.id] == [root.id, child.id, grandchild.id]
        assert sort_paths[child.id] == [root.id, child.id]
        assert sort_paths[root.id] == [root.id]

    @async_test
    async def test_sibling_branches_stay_independent(
        self,
        category_service: CategoryService,
    ) -> None:
        """Test that separate branches do not leak into each other's paths."""
        first_root = await category_service.create_category(
            name='Cameras',
            description='First branch',
        )
        second_root = await category_service.create_category(
            name='Light',
            description='Second branch',
        )
        under_first = await category_service.create_category(
            name='Optics',
            description='Child of the first branch',
            parent_id=first_root.id,
        )
        under_second = await category_service.create_category(
            name='Accessories',
            description='Child of the second branch',
            parent_id=second_root.id,
        )

        sort_paths = await category_service.get_sort_path_map()

        assert sort_paths[under_first.id] == [first_root.id, under_first.id]
        assert sort_paths[under_second.id] == [second_root.id, under_second.id]

    @async_test
    async def test_matches_print_hierarchy_sort_path(
        self,
        category_service: CategoryService,
    ) -> None:
        """Test parity with the per-category path the print form builds.

        The two are computed differently — one resolves the whole tree in
        memory, the other walks it per category — so a divergence would make
        the project list and the print form disagree on ordering.
        """
        root = await category_service.create_category(
            name='Root',
            description='Root category',
        )
        child = await category_service.create_category(
            name='Child',
            description='Child category',
            parent_id=root.id,
        )
        grandchild = await category_service.create_category(
            name='Grandchild',
            description='Grandchild category',
            parent_id=child.id,
        )

        sort_paths = await category_service.get_sort_path_map()

        for category in (root, child, grandchild):
            print_path, _ = await category_service.get_print_hierarchy_and_sort_path(
                category.id
            )
            assert sort_paths[category.id] == print_path
