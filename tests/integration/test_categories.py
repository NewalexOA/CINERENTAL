"""Integration tests for category endpoints."""

from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.util import greenlet_spawn

from backend.models.category import Category


async def get_category_attr(category: Category, attr: str) -> Any:
    """Get category attribute safely."""
    return await greenlet_spawn(lambda: getattr(category, attr))


@pytest.mark.asyncio
async def test_create_category(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test creating a category."""
    response = await async_client.post(
        '/api/v1/categories/',
        json={'name': 'Test Category', 'description': 'Test Description'},
    )
    assert response.status_code == 201
    data = response.json()
    assert data['name'] == 'Test Category'
    assert data['description'] == 'Test Description'


@pytest.mark.asyncio
async def test_create_category_duplicate_name(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_category: Category,
) -> None:
    """Test creating a category with duplicate name."""
    response = await async_client.post(
        '/api/v1/categories/',
        json={'name': test_category.name, 'description': 'Test Description'},
    )
    assert response.status_code == 400
    assert 'already exists' in response.json()['detail'].lower()


@pytest.mark.asyncio
async def test_get_categories(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test getting categories list."""
    response = await async_client.get('/api/v1/categories/')
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    category_name = await get_category_attr(test_category, 'name')
    category_data = next(cat for cat in data if cat['name'] == category_name)
    assert category_data['id'] == await get_category_attr(test_category, 'id')
    category_desc = await get_category_attr(test_category, 'description')
    assert category_data['description'] == category_desc


@pytest.mark.asyncio
async def test_get_categories_with_equipment_count(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test getting categories with equipment count."""
    response = await async_client.get('/api/v1/categories/with-equipment-count')
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    category_name = await get_category_attr(test_category, 'name')
    category_data = next(cat for cat in data if cat['name'] == category_name)
    assert category_data['id'] == await get_category_attr(test_category, 'id')
    category_desc = await get_category_attr(test_category, 'description')
    assert category_data['description'] == category_desc
    assert 'equipment_count' in category_data
    assert isinstance(category_data['equipment_count'], int)


@pytest.mark.asyncio
async def test_get_category(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test getting a specific category."""
    category_id = await get_category_attr(test_category, 'id')
    response = await async_client.get(f'/api/v1/categories/{category_id}')
    assert response.status_code == 200
    data = response.json()
    category_name = await get_category_attr(test_category, 'name')
    assert data['name'] == category_name


@pytest.mark.asyncio
async def test_get_category_not_found(
    async_client: AsyncClient,
) -> None:
    """Test getting a non-existent category."""
    response = await async_client.get('/api/v1/categories/999999')
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_category(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test updating a category."""
    response = await async_client.put(
        f'/api/v1/categories/{test_category.id}',
        json={'name': 'Updated Category', 'description': 'Updated Description'},
    )
    assert response.status_code == 200
    data = response.json()
    assert data['name'] == 'Updated Category'
    assert data['description'] == 'Updated Description'


@pytest.mark.asyncio
async def test_update_category_not_found(
    async_client: AsyncClient,
) -> None:
    """Test updating a non-existent category."""
    response = await async_client.put(
        '/api/v1/categories/999999',
        json={'name': 'Updated Category'},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_category(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test deleting a category."""
    response = await async_client.delete(f'/api/v1/categories/{test_category.id}')
    assert response.status_code == 204

    # Verify category is deleted
    response = await async_client.get(f'/api/v1/categories/{test_category.id}')
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_category_not_found(
    async_client: AsyncClient,
) -> None:
    """Test deleting a non-existent category."""
    response = await async_client.delete('/api/v1/categories/999999')
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_search_categories(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test searching categories."""
    category_name = await get_category_attr(test_category, 'name')
    response = await async_client.get(
        f'/api/v1/categories/search/{category_name[:4]}'
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    category_data = next(cat for cat in data if cat['name'] == category_name)
    assert category_data['id'] == await get_category_attr(test_category, 'id')
    category_desc = await get_category_attr(test_category, 'description')
    assert category_data['description'] == category_desc


@pytest.mark.asyncio
async def test_category_fixture(test_category: Category) -> None:
    """Test category fixture."""
    assert test_category.name == 'Test Category'
    assert test_category.description == 'Test Description'
