"""Equipment API integration tests."""

from datetime import datetime, timedelta
from decimal import Decimal

from httpx import AsyncClient

from backend.models import Category, Client, Equipment
from backend.models.equipment import EquipmentStatus
from tests.conftest import async_test


@async_test
async def test_create_equipment(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test creating new equipment."""
    data = {
        'name': 'New Camera',
        'description': 'Professional camera for testing',
        'barcode': 'TEST-002',
        'serial_number': 'SN-002',
        'category_id': test_category.id,
        'daily_rate': '150.00',
        'replacement_cost': '1500.00',
        'status': EquipmentStatus.AVAILABLE,
    }

    response = await async_client.post('/api/v1/equipment/', json=data)
    assert response.status_code == 201
    result = response.json()

    assert result['name'] == data['name']
    assert result['barcode'] == data['barcode']
    assert Decimal(str(result['daily_rate'])) == Decimal(str(data['daily_rate']))
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
        'daily_rate': '100.00',
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
        'daily_rate': '150.00',
    }

    response = await async_client.put(
        f'/api/v1/equipment/{test_equipment.id}',
        json=data,
    )
    assert response.status_code == 200
    result = response.json()
    assert result['name'] == data['name']
    assert result['daily_rate'] == data['daily_rate']


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
async def test_create_equipment_invalid_rate(
    async_client: AsyncClient,
    test_category: Category,
) -> None:
    """Test creating equipment with invalid rate."""
    data = {
        'name': 'Test Equipment',
        'description': 'Test Description',
        'serial_number': 'TEST001',
        'barcode': 'TEST001',
        'category_id': test_category.id,
        'daily_rate': '-100.00',
        'replacement_cost': '1000.00',
    }

    response = await async_client.post('/api/v1/equipment/', json=data)
    assert response.status_code == 400
    assert 'must be greater than 0' in response.json()['detail']


@async_test
async def test_get_equipment_list_invalid_pagination(async_client: AsyncClient) -> None:
    """Test getting equipment list with invalid pagination."""
    response = await async_client.get('/api/v1/equipment/?page=0&size=0')
    assert response.status_code == 400
    assert 'greater than 0' in response.json()['detail']


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
    """Test updating equipment with invalid rate."""
    data = {'daily_rate': '-100.00'}
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
) -> None:
    """Test deleting equipment with active bookings."""
    # Create a booking for the equipment
    booking_data = {
        'equipment_id': test_equipment.id,
        'client_id': test_client.id,
        'start_date': (datetime.now() + timedelta(days=1)).isoformat(),
        'end_date': (datetime.now() + timedelta(days=2)).isoformat(),
    }
    await async_client.post('/api/v1/bookings/', json=booking_data)

    # Try to delete the equipment
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
        '&min_rate=50.00&max_rate=200.00'
    )
    assert response.status_code == 200
    result = response.json()
    assert len(result) > 0
    assert all(
        float(item['daily_rate']) >= 50.00 and float(item['daily_rate']) <= 200.00
        for item in result
    )


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
async def test_search_equipment_validation(async_client: AsyncClient) -> None:
    """Test equipment search with invalid parameters."""
    response = await async_client.get(
        '/api/v1/equipment/?min_rate=invalid&max_rate=invalid'
    )
    assert response.status_code == 400
    assert 'Invalid rate format' in response.json()['detail']
