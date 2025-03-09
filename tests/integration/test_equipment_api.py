"""Equipment API integration tests."""

from datetime import datetime, timedelta
from typing import TypedDict, cast

from fastapi import status as http_status
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Category, Client, Equipment
from backend.models.equipment import EquipmentStatus
from backend.services.booking import BookingService
from tests.conftest import async_test


class EquipmentResponse(TypedDict):
    """Equipment response type."""

    name: str
    barcode: str
    status: str


@async_test
async def test_create_equipment(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test creating new equipment."""
    data = {
        'name': 'New Camera',
        'description': 'Professional camera for testing',
        'barcode': 'CATS-000002-5',
        'serial_number': 'SN-002',
        'category_id': test_category.id,
        'replacement_cost': '1500.00',
        'status': EquipmentStatus.AVAILABLE,
    }

    response = await async_client.post('/api/v1/equipment/', json=data)
    assert response.status_code == 201
    result = cast(EquipmentResponse, response.json())

    assert result['name'] == data['name']
    assert result['barcode'] == data['barcode']
    assert result['status'] == EquipmentStatus.AVAILABLE


@async_test
async def test_create_equipment_duplicate_barcode(
    async_client: AsyncClient,
    test_category: Category,
    test_equipment: Equipment,
) -> None:
    """Test creating equipment with duplicate barcode."""
    data = {
        'name': 'Another Equipment',
        'description': 'Test Description',
        'category_id': test_category.id,
        'barcode': test_equipment.barcode,
        'serial_number': 'SN002',
        'replacement_cost': '1000.00',
    }

    response = await async_client.post('/api/v1/equipment/', json=data)
    assert response.status_code == 400
    assert 'already exists' in response.json()['detail']


@async_test
async def test_get_equipment_list(
    async_client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test getting equipment list."""
    response = await async_client.get('/api/v1/equipment/')
    assert response.status_code == 200
    result = response.json()
    assert len(result) > 0
    assert any(item['id'] == test_equipment.id for item in result)


@async_test
async def test_get_equipment_by_category(
    async_client: AsyncClient,
    test_equipment: Equipment,
    test_category: Category,
) -> None:
    """Test getting equipment by category."""
    response = await async_client.get(
        f'/api/v1/equipment/?category_id={test_category.id}',
    )
    assert response.status_code == 200
    result = response.json()
    assert len(result) > 0
    assert all(item['category_id'] == test_category.id for item in result)


@async_test
async def test_get_equipment_by_status(
    async_client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test getting equipment by status."""
    response = await async_client.get(
        f'/api/v1/equipment/?status={test_equipment.status.value}',
    )
    assert response.status_code == 200
    result = response.json()
    assert len(result) > 0
    assert all(item['status'] == test_equipment.status.value for item in result)


@async_test
async def test_get_equipment_by_id(
    async_client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test getting equipment by ID."""
    response = await async_client.get(f'/api/v1/equipment/{test_equipment.id}')
    assert response.status_code == 200
    result = response.json()
    assert result['id'] == test_equipment.id


@async_test
async def test_get_equipment_by_id_not_found(async_client: AsyncClient) -> None:
    """Test getting non-existent equipment."""
    response = await async_client.get('/api/v1/equipment/999')
    assert response.status_code == 404


@async_test
async def test_update_equipment(
    async_client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test updating equipment."""
    data = {
        'name': 'Updated Equipment',
        'description': 'Updated Description',
    }

    response = await async_client.put(
        f'/api/v1/equipment/{test_equipment.id}',
        json=data,
    )
    assert response.status_code == 200
    result = response.json()
    assert result['name'] == data['name']


@async_test
async def test_update_equipment_status(
    async_client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test updating equipment status."""
    data = {'status': EquipmentStatus.MAINTENANCE.value}
    response = await async_client.put(
        f'/api/v1/equipment/{test_equipment.id}',
        json=data,
    )
    assert response.status_code == 200
    assert response.json()['status'] == EquipmentStatus.MAINTENANCE.value


@async_test
async def test_update_equipment_not_found(async_client: AsyncClient) -> None:
    """Test updating non-existent equipment."""
    data = {'name': 'Updated Equipment'}
    response = await async_client.put('/api/v1/equipment/999', json=data)
    assert response.status_code == 404


@async_test
async def test_delete_equipment(
    async_client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test deleting equipment."""
    response = await async_client.delete(f'/api/v1/equipment/{test_equipment.id}')
    assert response.status_code == 204

    # Verify equipment is deleted
    response = await async_client.get(f'/api/v1/equipment/{test_equipment.id}')
    assert response.status_code == 404


@async_test
async def test_delete_equipment_not_found(async_client: AsyncClient) -> None:
    """Test deleting non-existent equipment."""
    response = await async_client.delete('/api/v1/equipment/999')
    assert response.status_code == 404


@async_test
async def test_get_equipment_by_barcode(
    async_client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test getting equipment by barcode."""
    response = await async_client.get(
        f'/api/v1/equipment/barcode/{test_equipment.barcode}',
    )
    assert response.status_code == 200
    result = response.json()
    assert result['barcode'] == test_equipment.barcode


@async_test
async def test_get_equipment_by_barcode_not_found(async_client: AsyncClient) -> None:
    """Test getting equipment by non-existent barcode."""
    response = await async_client.get('/api/v1/equipment/barcode/NONEXISTENT')
    assert response.status_code == 404


@async_test
async def test_search_equipment(
    async_client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test searching equipment."""
    response = await async_client.get(
        f'/api/v1/equipment/?query={test_equipment.name}',
    )
    assert response.status_code == 200
    result = response.json()
    assert len(result) > 0
    assert any(item['id'] == test_equipment.id for item in result)


@async_test
async def test_get_equipment_list_invalid_pagination(async_client: AsyncClient) -> None:
    """Test get equipment list with invalid pagination parameters."""
    response = await async_client.get('/api/v1/equipment/?skip=-1&limit=0')
    assert response.status_code == http_status.HTTP_422_UNPROCESSABLE_ENTITY
    error_detail = response.json()['detail']
    assert 'Skip parameter' in str(error_detail) or 'greater than or equal to 0' in str(
        error_detail
    )

    response = await async_client.get('/api/v1/equipment/?skip=0&limit=0')
    assert response.status_code == http_status.HTTP_422_UNPROCESSABLE_ENTITY
    error_detail = response.json()['detail']
    assert 'Limit parameter' in str(error_detail) or 'greater than 0' in str(
        error_detail
    )

    response = await async_client.get('/api/v1/equipment/?skip=0&limit=1001')
    assert response.status_code == http_status.HTTP_422_UNPROCESSABLE_ENTITY
    error_detail = response.json()['detail']
    assert 'Limit parameter' in str(
        error_detail
    ) or 'less than or equal to 1000' in str(error_detail)


@async_test
async def test_create_equipment_invalid_rate(async_client: AsyncClient) -> None:
    """Test create equipment with invalid replacement cost."""
    data = {
        'name': 'Test Equipment',
        'description': 'Test Description',
        'barcode': '123456789',
        'serial_number': 'SN123',
        'replacement_cost': '0',
        'category_id': 1,
    }
    response = await async_client.post('/api/v1/equipment/', json=data)
    assert response.status_code == http_status.HTTP_400_BAD_REQUEST
    assert response.json()['detail'] == 'Replacement cost must be greater than 0'


@async_test
async def test_get_equipment_invalid_dates(
    async_client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test getting equipment with invalid dates."""
    response = await async_client.get(
        '/api/v1/equipment/?start_date=invalid&end_date=invalid'
    )
    assert response.status_code == 400
    assert 'Invalid date format' in response.json()['detail']


@async_test
async def test_update_equipment_invalid_rate(
    async_client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test updating equipment with invalid replacement cost."""
    data = {'replacement_cost': '-100.00'}
    response = await async_client.put(
        f'/api/v1/equipment/{test_equipment.id}',
        json=data,
    )
    assert response.status_code == 400
    assert 'must be greater than 0' in response.json()['detail']


@async_test
async def test_search_equipment_invalid_query(async_client: AsyncClient) -> None:
    """Test searching equipment with invalid query."""
    response = await async_client.get('/api/v1/equipment/?query=' + 'a' * 300)
    assert response.status_code == 400
    assert 'too long' in response.json()['detail'].lower()


@async_test
async def test_status_transition_invalid(
    async_client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test invalid equipment status transition."""
    data = {'status': EquipmentStatus.RENTED.value}
    response = await async_client.put(
        f'/api/v1/equipment/{test_equipment.id}',
        json=data,
    )
    assert response.status_code == 400
    assert 'Invalid status transition' in response.json()['detail']


@async_test
async def test_delete_equipment_with_bookings(
    async_client: AsyncClient,
    test_equipment: Equipment,
    test_client: Client,
    db_session: AsyncSession,
) -> None:
    """Test deleting equipment with active bookings."""
    # Create a booking for the equipment directly using the service
    booking_service = BookingService(db_session)
    start_date = datetime.now() + timedelta(days=1)
    end_date = start_date + timedelta(days=2)

    await booking_service.create_booking(
        client_id=test_client.id,
        equipment_id=test_equipment.id,
        start_date=start_date,
        end_date=end_date,
        total_amount=100.0,
        deposit_amount=50.0,
        notes='Test booking',
    )

    # Try to delete the equipmen
    response = await async_client.delete(f'/api/v1/equipment/{test_equipment.id}')
    assert response.status_code == 400
    assert 'has active bookings' in response.json()['detail']


@async_test
async def test_search_equipment_with_filters(
    async_client: AsyncClient,
    test_equipment: Equipment,
    test_category: Category,
) -> None:
    """Test searching equipment with multiple filters."""
    response = await async_client.get(
        f'/api/v1/equipment/?query={test_equipment.name}'
        f'&category_id={test_category.id}'
        f'&status={test_equipment.status.value}'
    )
    assert response.status_code == 200
    result = response.json()
    assert len(result) > 0


@async_test
async def test_search_equipment_pagination(
    async_client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test equipment search with pagination."""
    response = await async_client.get('/api/v1/equipment/?page=1&size=10')
    assert response.status_code == 200
    result = response.json()
    assert len(result) <= 10


@async_test
async def test_regenerate_equipment_barcode(
    async_client: AsyncClient,
    test_equipment: Equipment,
    db_session: AsyncSession,
) -> None:
    """Test regenerating equipment barcode."""
    # Store the original barcode
    original_barcode = test_equipment.barcode

    # Regenerate barcode
    response = await async_client.post(
        f'/api/v1/equipment/{test_equipment.id}/regenerate-barcode',
        json={},
    )

    assert response.status_code == 200
    data = response.json()
    assert data['id'] == test_equipment.id
    assert data['barcode'] != original_barcode
    # Verify the new barcode format (now it's a numeric string)
    assert data['barcode'].isdigit()


@async_test
async def test_regenerate_equipment_barcode_not_found(
    async_client: AsyncClient,
) -> None:
    """Test regenerating barcode for non-existent equipment."""
    non_existent_id = 9999
    response = await async_client.post(
        f'/api/v1/equipment/{non_existent_id}/regenerate-barcode',
        json={},
    )

    assert response.status_code == 404
    data = response.json()
    assert 'detail' in data
