"""Integration tests for scan sessions API."""

from typing import Any

import pytest
from fastapi import status
from httpx import AsyncClient

from backend.models import ScanSession

pytestmark = pytest.mark.asyncio


async def test_create_scan_session(
    async_client: AsyncClient,
    test_user: Any,
) -> None:
    """Test creating a new scan session."""
    session_data = {
        'name': 'Test API Session',
        'user_id': test_user.id,
        'items': [{'equipment_id': 1, 'barcode': 'TEST123', 'name': 'Test Equipment'}],
    }

    response = await async_client.post(
        '/api/v1/scan-sessions/',
        json=session_data,
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data['name'] == session_data['name']
    assert data['user_id'] == session_data['user_id']
    assert len(data['items']) == 1
    assert data['items'][0]['barcode'] == 'TEST123'
    assert 'id' in data
    assert 'created_at' in data
    assert 'updated_at' in data
    assert 'expires_at' in data


async def test_get_scan_session(
    async_client: AsyncClient,
    test_scan_session: ScanSession,
) -> None:
    """Test getting a scan session by ID."""
    response = await async_client.get(
        f'/api/v1/scan-sessions/{test_scan_session.id}',
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data['id'] == test_scan_session.id
    assert data['name'] == test_scan_session.name
    assert data['user_id'] == test_scan_session.user_id


async def test_get_nonexistent_scan_session(async_client: AsyncClient) -> None:
    """Test getting a non-existent scan session."""
    response = await async_client.get(
        '/api/v1/scan-sessions/999',
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    data = response.json()
    assert 'detail' in data
    error_msg = data['detail'].lower()
    assert 'not found' in error_msg or 'не найдена' in error_msg


async def test_get_user_scan_sessions(
    async_client: AsyncClient,
    test_scan_session: ScanSession,
) -> None:
    """Test getting all scan sessions for a user."""
    # Ensure user_id is not None
    user_id = test_scan_session.user_id
    assert user_id is not None

    response = await async_client.get(
        f'/api/v1/scan-sessions/user/{user_id}',
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    # Check if our test session is in the list
    found = False
    for session in data:
        session_data: dict = session
        if session_data['id'] == test_scan_session.id:
            found = True
            break
    assert found


async def test_update_scan_session(
    async_client: AsyncClient,
    test_scan_session: ScanSession,
) -> None:
    """Test updating a scan session."""
    update_data = {
        'name': 'Updated API Session',
        'items': [
            {'equipment_id': 2, 'barcode': 'TEST456', 'name': 'Another Test Equipment'},
        ],
    }

    response = await async_client.put(
        f'/api/v1/scan-sessions/{test_scan_session.id}',
        json=update_data,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data['id'] == test_scan_session.id
    assert data['name'] == update_data['name']
    assert len(data['items']) == 1
    assert data['items'][0]['barcode'] == 'TEST456'


async def test_update_nonexistent_scan_session(async_client: AsyncClient) -> None:
    """Test updating a non-existent scan session."""
    update_data = {
        'name': 'Updated API Session',
    }

    response = await async_client.put(
        '/api/v1/scan-sessions/999',
        json=update_data,
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    data = response.json()
    assert 'detail' in data
    error_msg = data['detail'].lower()
    assert 'not found' in error_msg or 'не найдена' in error_msg


async def test_delete_scan_session(
    async_client: AsyncClient,
    test_scan_session: ScanSession,
) -> None:
    """Test deleting a scan session."""
    response = await async_client.delete(
        f'/api/v1/scan-sessions/{test_scan_session.id}',
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT


async def test_delete_nonexistent_scan_session(async_client: AsyncClient) -> None:
    """Test deleting a non-existent scan session."""
    response = await async_client.delete(
        '/api/v1/scan-sessions/999',
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    data = response.json()
    assert 'detail' in data
    error_msg = data['detail'].lower()
    assert 'not found' in error_msg or 'не найдена' in error_msg


async def test_create_scan_session_invalid_data(
    async_client: AsyncClient,
    test_user: Any,
) -> None:
    """Test creating a scan session with invalid data."""
    # Missing required field 'name'
    session_data = {'user_id': test_user.id, 'items': []}

    response = await async_client.post(
        '/api/v1/scan-sessions/',
        json=session_data,
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    data = response.json()
    assert 'detail' in data


async def test_update_scan_session_partial(
    async_client: AsyncClient,
    test_scan_session: ScanSession,
) -> None:
    """Test partially updating a scan session."""
    # Only update name, items should remain unchanged
    update_data = {
        'name': 'Partially Updated Session',
    }

    response = await async_client.put(
        f'/api/v1/scan-sessions/{test_scan_session.id}',
        json=update_data,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data['id'] == test_scan_session.id
    assert data['name'] == update_data['name']
    # Items should be unchanged
    assert len(data['items']) == len(test_scan_session.items)
