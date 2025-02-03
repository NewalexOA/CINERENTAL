"""Integration tests for category endpoints."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.category import Category


@pytest.mark.asyncio  # type: ignore[misc]
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
    assert data['id'] is not None


@pytest.mark.asyncio  # type: ignore[misc]
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


@pytest.mark.asyncio  # type: ignore[misc]
async def test_get_categories(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_category: Category,
) -> None:
    """Test getting all categories."""
    response = await async_client.get('/api/v1/categories/')
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(cat['id'] == test_category.id for cat in data)


@pytest.mark.asyncio  # type: ignore[misc]
async def test_get_categories_with_equipment_count(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_category: Category,
) -> None:
    """Test getting categories with equipment count."""
    response = await async_client.get('/api/v1/categories/with-equipment-count')
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    category = next(cat for cat in data if cat['id'] == test_category.id)
    assert 'equipment_count' in category


@pytest.mark.asyncio  # type: ignore[misc]
async def test_get_category(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_category: Category,
) -> None:
    """Test getting a specific category."""
    response = await async_client.get(f'/api/v1/categories/{test_category.id}')
    assert response.status_code == 200
    data = response.json()
    assert data['id'] == test_category.id
    assert data['name'] == test_category.name


@pytest.mark.asyncio  # type: ignore[misc]
async def test_get_category_not_found(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test getting a non-existent category."""
    response = await async_client.get('/api/v1/categories/999999')
    assert response.status_code == 404


@pytest.mark.asyncio  # type: ignore[misc]
async def test_update_category(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_category: Category,
) -> None:
    """Test updating a category."""
    response = await async_client.put(
        f'/api/v1/categories/{test_category.id}',
        json={'name': 'Updated Name', 'description': 'Updated Description'},
    )
    assert response.status_code == 200
    data = response.json()
    assert data['name'] == 'Updated Name'
    assert data['description'] == 'Updated Description'


@pytest.mark.asyncio  # type: ignore[misc]
async def test_update_category_not_found(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test updating a non-existent category."""
    response = await async_client.put(
        '/api/v1/categories/999999',
        json={'name': 'Updated Name', 'description': 'Updated Description'},
    )
    assert response.status_code == 404


@pytest.mark.asyncio  # type: ignore[misc]
async def test_delete_category(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_category: Category,
) -> None:
    """Test deleting a category."""
    response = await async_client.delete(f'/api/v1/categories/{test_category.id}')
    assert response.status_code == 204

    # Verify category is deleted
    get_response = await async_client.get(f'/api/v1/categories/{test_category.id}')
    assert get_response.status_code == 404


@pytest.mark.asyncio  # type: ignore[misc]
async def test_delete_category_not_found(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test deleting a non-existent category."""
    response = await async_client.delete('/api/v1/categories/999999')
    assert response.status_code == 404


@pytest.mark.asyncio  # type: ignore[misc]
async def test_search_categories(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_category: Category,
) -> None:
    """Test searching categories."""
    response = await async_client.get(
        f'/api/v1/categories/search/{test_category.name[:4]}'
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(cat['id'] == test_category.id for cat in data)
