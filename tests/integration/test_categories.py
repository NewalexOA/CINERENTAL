"""Category API integration tests."""

from typing import Any, Dict, List, TypedDict, cast

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.category import Category
from tests.conftest import async_test


class CategoryData(TypedDict):
    """Category data type."""

    id: int
    name: str
    description: str


class CategoryWithCount(CategoryData):
    """Category data with equipment count."""

    equipment_count: int


def get_category_attr(category: Category, attr: str) -> Any:
    """Get category attribute by name."""
    return getattr(category, attr)


@async_test
async def test_create_category(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test creating new category."""
    data: Dict[str, str] = {
        'name': 'Test Category',
        'description': 'Test Description',
    }
    response = await async_client.post('/api/v1/categories/', json=data)
    assert response.status_code == 201
    result = cast(CategoryData, response.json())
    assert result['name'] == data['name']
    assert result['description'] == data['description']


@async_test
async def test_create_category_duplicate_name(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_category: Category,
) -> None:
    """Test creating category with duplicate name."""
    data: Dict[str, str] = {
        'name': get_category_attr(test_category, 'name'),
        'description': 'Another description',
    }
    response = await async_client.post('/api/v1/categories/', json=data)
    assert response.status_code == 400


@async_test
async def test_get_categories(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test getting all categories."""
    response = await async_client.get('/api/v1/categories/')
    assert response.status_code == 200
    data = cast(List[CategoryData], response.json())
    assert len(data) >= 1

    try:
        category_data = next(
            cat
            for cat in data
            if cat['name'] == get_category_attr(test_category, 'name')
        )
    except StopIteration:
        raise AssertionError('Category not found in response')

    assert category_data['id'] == get_category_attr(test_category, 'id')
    category_desc = get_category_attr(test_category, 'description')
    assert category_data['description'] == category_desc


@async_test
async def test_get_categories_with_equipment_count(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test getting categories with equipment count."""
    response = await async_client.get('/api/v1/categories/with_equipment_count')
    assert response.status_code == 200
    data = cast(List[CategoryWithCount], response.json())
    assert len(data) >= 1

    try:
        category_data = next(
            cat
            for cat in data
            if cat['name'] == get_category_attr(test_category, 'name')
        )
    except StopIteration:
        raise AssertionError('Category not found in response')

    assert category_data['id'] == get_category_attr(test_category, 'id')
    assert 'equipment_count' in category_data
    assert isinstance(category_data['equipment_count'], int)


@async_test
async def test_get_category(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test getting category by ID."""
    category_id = get_category_attr(test_category, 'id')
    response = await async_client.get(f'/api/v1/categories/{category_id}')
    assert response.status_code == 200
    data = cast(CategoryData, response.json())
    assert data['id'] == category_id
    assert data['name'] == get_category_attr(test_category, 'name')
    assert data['description'] == get_category_attr(test_category, 'description')


@async_test
async def test_get_category_not_found(
    async_client: AsyncClient,
) -> None:
    """Test getting non-existent category."""
    response = await async_client.get('/api/v1/categories/999999')
    assert response.status_code == 404


@async_test
async def test_update_category(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test updating category."""
    category_id = get_category_attr(test_category, 'id')
    data: Dict[str, str] = {
        'name': 'Updated Category',
        'description': 'Updated Description',
    }
    response = await async_client.put(
        f'/api/v1/categories/{category_id}',
        json=data,
    )
    assert response.status_code == 200
    result = cast(CategoryData, response.json())
    assert result['name'] == data['name']
    assert result['description'] == data['description']


@async_test
async def test_update_category_not_found(
    async_client: AsyncClient,
) -> None:
    """Test updating non-existent category."""
    data: Dict[str, str] = {
        'name': 'Updated Category',
        'description': 'Updated Description',
    }
    response = await async_client.put('/api/v1/categories/999999', json=data)
    assert response.status_code == 404


@async_test
async def test_delete_category(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test deleting category."""
    category_id = get_category_attr(test_category, 'id')
    response = await async_client.delete(f'/api/v1/categories/{category_id}')
    assert response.status_code == 204

    # Verify category is deleted
    response = await async_client.get(f'/api/v1/categories/{category_id}')
    assert response.status_code == 404


@async_test
async def test_delete_category_not_found(
    async_client: AsyncClient,
) -> None:
    """Test deleting non-existent category."""
    response = await async_client.delete('/api/v1/categories/999999')
    assert response.status_code == 404


@async_test
async def test_search_categories(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test searching categories."""
    category_name = get_category_attr(test_category, 'name')
    response = await async_client.get(f'/api/v1/categories/search/{category_name[:4]}')
    assert response.status_code == 200
    data = cast(List[CategoryData], response.json())
    assert len(data) >= 1

    try:
        category_data = next(cat for cat in data if cat['name'] == category_name)
    except StopIteration:
        raise AssertionError('Category not found in response')

    assert category_data['id'] == get_category_attr(test_category, 'id')
    category_desc = get_category_attr(test_category, 'description')
    assert category_data['description'] == category_desc


@async_test
async def test_category_fixture(test_category: Category) -> None:
    """Test category fixture."""
    assert test_category.name == 'Test Category'
    assert test_category.description == 'Test Description'
