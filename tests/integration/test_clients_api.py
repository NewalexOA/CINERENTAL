"""Clients API integration tests."""

from typing import TypedDict, cast

from fastapi import status as http_status
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Client
from tests.conftest import async_test


class ClientResponse(TypedDict):
    """Client response type."""

    id: int
    name: str
    email: str
    phone: str
    passport_number: str
    address: str
    status: str


@async_test
async def test_create_client(
    async_client: AsyncClient,
) -> None:
    """Test creating new client."""
    data = {
        'name': 'John Doe',
        'email': 'john.doe@example.com',
        'phone': '+1234567890',
        'passport_number': 'AB123456',
        'address': '123 Main St, City',
    }

    response = await async_client.post('/api/v1/clients/', json=data)
    assert response.status_code == http_status.HTTP_201_CREATED
    result = cast(ClientResponse, response.json())

    assert result['name'] == data['name']
    assert result['email'] == data['email']
    assert result['phone'] == data['phone']
    assert result['passport_number'] == data['passport_number']
    assert result['address'] == data['address']
    assert result['status'] == 'ACTIVE'


@async_test
async def test_create_client_duplicate_email(
    async_client: AsyncClient,
    test_client: Client,
) -> None:
    """Test creating client with duplicate email."""
    data = {
        'name': 'Jane Smith',
        'email': test_client.email,  # Using existing email
        'phone': '+9876543210',
        'passport_number': 'CD654321',
        'address': '456 Oak St, Town',
    }

    response = await async_client.post('/api/v1/clients/', json=data)
    assert response.status_code == http_status.HTTP_409_CONFLICT
    assert 'email' in response.text.lower()


@async_test
async def test_create_client_duplicate_phone(
    async_client: AsyncClient,
    test_client: Client,
) -> None:
    """Test creating client with duplicate phone."""
    data = {
        'name': 'Jane Smith',
        'email': 'jane.smith@example.com',
        'phone': test_client.phone,  # Using existing phone
        'passport_number': 'CD654321',
        'address': '456 Oak St, Town',
    }

    response = await async_client.post('/api/v1/clients/', json=data)
    assert response.status_code == http_status.HTTP_409_CONFLICT
    assert 'phone' in response.text.lower()


@async_test
async def test_get_clients_list(
    async_client: AsyncClient,
    test_client: Client,
) -> None:
    """Test getting list of clients."""
    response = await async_client.get('/api/v1/clients/')
    assert response.status_code == http_status.HTTP_200_OK

    clients = response.json()
    assert isinstance(clients, list)
    assert len(clients) >= 1

    # Check if test_client is in the list
    client_ids = [client.get('id') for client in clients]
    assert test_client.id in client_ids


@async_test
async def test_get_client_by_id(
    async_client: AsyncClient,
    test_client: Client,
) -> None:
    """Test getting client by ID."""
    response = await async_client.get(f'/api/v1/clients/{test_client.id}/')
    assert response.status_code == http_status.HTTP_200_OK

    client = cast(ClientResponse, response.json())
    assert client['id'] == test_client.id
    assert client['name'] == test_client.name
    assert client['email'] == test_client.email
    assert client['phone'] == test_client.phone
    assert client['passport_number'] == test_client.passport_number
    assert client['address'] == test_client.address


@async_test
async def test_get_client_by_id_not_found(async_client: AsyncClient) -> None:
    """Test getting non-existent client."""
    response = await async_client.get('/api/v1/clients/9999/')
    assert response.status_code == http_status.HTTP_404_NOT_FOUND


@async_test
async def test_update_client(
    async_client: AsyncClient,
    test_client: Client,
) -> None:
    """Test updating client details."""
    data = {
        'name': 'Updated Name',
        'address': 'New Address, City',
    }

    response = await async_client.put(f'/api/v1/clients/{test_client.id}/', json=data)
    assert response.status_code == http_status.HTTP_200_OK

    client = cast(ClientResponse, response.json())
    assert client['id'] == test_client.id
    assert client['name'] == data['name']
    assert client['address'] == data['address']
    # These fields should remain unchanged
    assert client['email'] == test_client.email
    assert client['phone'] == test_client.phone
    assert client['passport_number'] == test_client.passport_number


@async_test
async def test_update_client_not_found(async_client: AsyncClient) -> None:
    """Test updating non-existent client."""
    data = {'name': 'Updated Name'}
    response = await async_client.put('/api/v1/clients/9999/', json=data)
    assert response.status_code == http_status.HTTP_404_NOT_FOUND


@async_test
async def test_update_client_duplicate_email(
    async_client: AsyncClient,
    test_client: Client,
    db_session: AsyncSession,
) -> None:
    """Test updating client with duplicate email."""
    # Create another client first
    other_client = Client(
        name='Other Client',
        email='other.client@example.com',
        phone='+5555555555',
        passport_number='XY987654',
        address='789 Pine St, Village',
    )
    db_session.add(other_client)
    await db_session.commit()
    await db_session.refresh(other_client)

    # Try to update test_client with other_client's email
    data = {'email': other_client.email}
    response = await async_client.put(f'/api/v1/clients/{test_client.id}/', json=data)
    assert response.status_code == http_status.HTTP_409_CONFLICT
    assert 'email' in response.text.lower()


@async_test
async def test_delete_client(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test deleting client."""
    # Create a client to delete
    client_to_delete = Client(
        name='Delete Me',
        email='delete.me@example.com',
        phone='+1122334455',
        passport_number='ZZ111222',
        address='999 Delete St, Nowhere',
    )
    db_session.add(client_to_delete)
    await db_session.commit()
    await db_session.refresh(client_to_delete)

    response = await async_client.delete(f'/api/v1/clients/{client_to_delete.id}/')
    assert response.status_code == http_status.HTTP_204_NO_CONTENT

    # Verify client is deleted
    response = await async_client.get(f'/api/v1/clients/{client_to_delete.id}/')
    assert response.status_code == http_status.HTTP_404_NOT_FOUND


@async_test
async def test_delete_client_not_found(async_client: AsyncClient) -> None:
    """Test deleting non-existent client."""
    response = await async_client.delete('/api/v1/clients/9999/')
    assert response.status_code == http_status.HTTP_404_NOT_FOUND


@async_test
async def test_get_client_bookings(
    async_client: AsyncClient,
    test_client: Client,
    test_booking: Client,
) -> None:
    """Test getting client's bookings."""
    response = await async_client.get(f'/api/v1/clients/{test_client.id}/bookings/')
    assert response.status_code == http_status.HTTP_200_OK

    bookings = response.json()
    assert isinstance(bookings, list)
    # At least one booking should exist for test_client
    assert len(bookings) >= 1


@async_test
async def test_get_client_bookings_not_found(async_client: AsyncClient) -> None:
    """Test getting bookings for non-existent client."""
    response = await async_client.get('/api/v1/clients/9999/bookings/')
    assert response.status_code == http_status.HTTP_404_NOT_FOUND


@async_test
async def test_search_clients(
    async_client: AsyncClient,
    test_client: Client,
) -> None:
    """Test searching clients."""
    # Search by part of name
    query = test_client.name[:3]
    response = await async_client.get(f'/api/v1/clients/?query={query}')
    assert response.status_code == http_status.HTTP_200_OK

    clients = response.json()
    assert isinstance(clients, list)
    assert len(clients) >= 1

    # Check if test_client is in the results
    client_ids = [client.get('id') for client in clients]
    assert test_client.id in client_ids


@async_test
async def test_clients_pagination(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Test clients pagination."""
    # Create multiple clients for pagination testing
    for i in range(5):
        client = Client(
            name=f'Page{i} Test{i}',
            email=f'page.test{i}@example.com',
            phone=f'+1000000{i:04d}',
            passport_number=f'PT{i:06d}',
            address=f'{i} Pagination St, Testville',
        )
        db_session.add(client)
    await db_session.commit()

    # Test first page (limit=2)
    response = await async_client.get('/api/v1/clients/?skip=0&limit=2')
    assert response.status_code == http_status.HTTP_200_OK

    first_page = response.json()
    assert isinstance(first_page, list)
    assert len(first_page) == 2

    # Test second page (skip=2, limit=2)
    response = await async_client.get('/api/v1/clients/?skip=2&limit=2')
    assert response.status_code == http_status.HTTP_200_OK

    second_page = response.json()
    assert isinstance(second_page, list)
    assert len(second_page) == 2

    # Ensure first and second page contain different clients
    first_page_ids = [client.get('id') for client in first_page]
    second_page_ids = [client.get('id') for client in second_page]
    assert not set(first_page_ids).intersection(set(second_page_ids))
