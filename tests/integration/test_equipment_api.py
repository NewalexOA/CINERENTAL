"""Equipment API integration tests."""

from datetime import datetime

import pytest
from httpx import AsyncClient

from backend.models import Category, Client, Equipment, EquipmentStatus


@pytest.mark.asyncio
async def test_create_equipment(
    client: AsyncClient,
    test_category: Category,
) -> None:
    """Test creating new equipment."""
    data = {
        'name': 'Test Equipment',
        'description': 'Test Description',
        'category_id': test_category.id,
        'barcode': 'TEST-001',
        'serial_number': 'SN001',
        'daily_rate': 100.00,
        'replacement_cost': 1000.00,
    }

    response = await client.post(
        '/api/v1/equipment/',
        json=data,
    )
    assert response.status_code == 201
    result = response.json()
    assert result['name'] == data['name']
    assert result['barcode'] == data['barcode']


@pytest.mark.asyncio
async def test_create_equipment_duplicate_barcode(
    client: AsyncClient,
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
        'daily_rate': 100.00,
        'replacement_cost': 1000.00,
    }

    response = await client.post(
        '/api/v1/equipment/',
        json=data,
    )
    assert response.status_code == 400
    assert 'already exists' in response.json()['detail']


@pytest.mark.asyncio
async def test_get_equipment_list(
    client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test getting equipment list."""
    response = await client.get('/api/v1/equipment/')
    assert response.status_code == 200
    result = response.json()
    assert len(result) > 0
    assert any(item['id'] == test_equipment.id for item in result)


@pytest.mark.asyncio
async def test_get_equipment_by_category(
    client: AsyncClient,
    test_equipment: Equipment,
    test_category: Category,
) -> None:
    """Test getting equipment by category."""
    response = await client.get(
        f'/api/v1/equipment/?category_id={test_category.id}',
    )
    assert response.status_code == 200
    result = response.json()
    assert len(result) > 0
    assert all(item['category_id'] == test_category.id for item in result)


@pytest.mark.asyncio
async def test_get_equipment_by_status(
    client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test getting equipment by status."""
    response = await client.get(
        f'/api/v1/equipment/?status={test_equipment.status.value}',
    )
    assert response.status_code == 200
    result = response.json()
    assert len(result) > 0
    assert all(item['status'] == test_equipment.status.value for item in result)


@pytest.mark.asyncio
async def test_get_equipment_by_id(
    client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test getting equipment by ID."""
    response = await client.get(f'/api/v1/equipment/{test_equipment.id}')
    assert response.status_code == 200
    result = response.json()
    assert result['id'] == test_equipment.id


@pytest.mark.asyncio
async def test_get_equipment_by_id_not_found(client: AsyncClient) -> None:
    """Test getting non-existent equipment."""
    response = await client.get('/api/v1/equipment/999')
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_equipment(
    client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test updating equipment."""
    data = {
        'name': 'Updated Equipment',
        'description': 'Updated Description',
        'daily_rate': '150.00',
    }

    response = await client.put(
        f'/api/v1/equipment/{test_equipment.id}',
        json=data,
    )
    assert response.status_code == 200
    result = response.json()
    assert result['name'] == data['name']
    assert result['daily_rate'] == data['daily_rate']


@pytest.mark.asyncio
async def test_update_equipment_status(
    client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test updating equipment status."""
    data = {'status': EquipmentStatus.MAINTENANCE.value}
    response = await client.put(
        f'/api/v1/equipment/{test_equipment.id}',
        json=data,
    )
    assert response.status_code == 200
    assert response.json()['status'] == EquipmentStatus.MAINTENANCE.value


@pytest.mark.asyncio
async def test_update_equipment_not_found(client: AsyncClient) -> None:
    """Test updating non-existent equipment."""
    data = {'name': 'Updated Equipment'}
    response = await client.put('/api/v1/equipment/999', json=data)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_equipment(
    client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test deleting equipment."""
    response = await client.delete(f'/api/v1/equipment/{test_equipment.id}')
    assert response.status_code == 204

    # Verify equipment is deleted
    response = await client.get(f'/api/v1/equipment/{test_equipment.id}')
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_equipment_not_found(client: AsyncClient) -> None:
    """Test deleting non-existent equipment."""
    response = await client.delete('/api/v1/equipment/999')
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_equipment_by_barcode(
    client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test getting equipment by barcode."""
    response = await client.get(
        f'/api/v1/equipment/barcode/{test_equipment.barcode}',
    )
    assert response.status_code == 200
    result = response.json()
    assert result['barcode'] == test_equipment.barcode


@pytest.mark.asyncio
async def test_get_equipment_by_barcode_not_found(client: AsyncClient) -> None:
    """Test getting equipment by non-existent barcode."""
    response = await client.get('/api/v1/equipment/barcode/NONEXISTENT')
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_search_equipment(
    client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test searching equipment."""
    response = await client.get(
        f'/api/v1/equipment/?query={test_equipment.name}',
    )
    assert response.status_code == 200
    result = response.json()
    assert len(result) > 0
    assert any(item['id'] == test_equipment.id for item in result)


@pytest.mark.asyncio
async def test_create_equipment_invalid_rate(
    client: AsyncClient,
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

    response = await client.post('/api/v1/equipment/', json=data)
    assert response.status_code == 400
    error = response.json()
    assert 'must be positive' in str(error['detail'])


@pytest.mark.asyncio
async def test_get_equipment_list_invalid_pagination(client: AsyncClient) -> None:
    """Test getting equipment list with invalid pagination."""
    # Test negative skip
    response = await client.get('/api/v1/equipment/?skip=-1')
    assert response.status_code == 400
    error = response.json()
    assert 'Input should be greater than or equal to 0' in str(error['detail'])

    # Test zero limit
    response = await client.get('/api/v1/equipment/?limit=0')
    assert response.status_code == 400
    error = response.json()
    assert 'Input should be greater than 0' in str(error['detail'])

    # Test limit exceeding maximum
    response = await client.get('/api/v1/equipment/?limit=1001')
    assert response.status_code == 400
    error = response.json()
    assert 'Input should be less than or equal to 1000' in str(error['detail'])


@pytest.mark.asyncio
async def test_get_equipment_invalid_dates(client: AsyncClient) -> None:
    """Test getting equipment with invalid date range."""
    response = await client.get(
        '/api/v1/equipment/?'
        'available_from=2024-02-10T00:00:00Z&'
        'available_to=2024-02-01T00:00:00Z'  # End date before start date
    )
    assert response.status_code == 400
    error = response.json()
    assert 'Start date must be before end date' in str(error['detail'])


@pytest.mark.asyncio
async def test_update_equipment_invalid_rate(
    client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test updating equipment with invalid rate."""
    response = await client.put(
        f'/api/v1/equipment/{test_equipment.id}',
        json={'daily_rate': '-200.00'},
    )
    assert response.status_code == 400
    error = response.json()
    assert 'must be positive' in str(error['detail'])


@pytest.mark.asyncio
async def test_search_equipment_invalid_query(client: AsyncClient) -> None:
    """Test searching equipment with invalid query."""
    response = await client.get('/api/v1/equipment/?query=ab')
    assert response.status_code == 200
    result = response.json()
    assert isinstance(result, list)


@pytest.mark.asyncio
async def test_status_transition_invalid(
    client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test invalid equipment status transitions."""
    # First set to RETIRED
    response = await client.put(
        f'/api/v1/equipment/{test_equipment.id}',
        json={'status': 'RETIRED'},
    )
    assert response.status_code == 200

    # Try to change from RETIRED (not allowed)
    response = await client.put(
        f'/api/v1/equipment/{test_equipment.id}',
        json={'status': 'AVAILABLE'},
    )
    assert response.status_code == 400
    error = response.json()
    assert 'RETIRED' in str(error['detail'])
    assert 'AVAILABLE' in str(error['detail'])


@pytest.mark.asyncio
async def test_delete_equipment_with_bookings(
    client: AsyncClient,
    test_equipment: Equipment,
    test_client: Client,
    test_dates: dict[str, datetime],
) -> None:
    """Test deleting equipment with active bookings."""
    # TODO: Implement booking creation test when booking API is ready
    response = await client.delete(f'/api/v1/equipment/{test_equipment.id}')
    assert response.status_code == 204  # No active bookings yet


@pytest.mark.asyncio
async def test_search_equipment_with_filters(
    client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test searching equipment with filters."""
    # Create another equipment with different status
    data = {
        'name': 'Another Test Equipment',
        'description': 'Test Description',
        'category_id': test_equipment.category_id,
        'barcode': 'TEST-002',
        'serial_number': 'SN002',
        'daily_rate': '100.00',
        'replacement_cost': '1000.00',
    }
    response = await client.post('/api/v1/equipment/', json=data)
    assert response.status_code == 201
    another_equipment = response.json()

    # Update its status to MAINTENANCE
    response = await client.put(
        f'/api/v1/equipment/{another_equipment["id"]}',
        json={'status': 'MAINTENANCE'},
    )
    assert response.status_code == 200

    # Search with query only
    response = await client.get('/api/v1/equipment/?query=test')
    assert response.status_code == 200
    result = response.json()
    assert len(result) == 2

    # Search with query and status
    response = await client.get(
        f'/api/v1/equipment/?query=test&status={test_equipment.status.value}',
    )
    assert response.status_code == 200
    result = response.json()
    assert len(result) == 1
    assert result[0]['id'] == test_equipment.id

    # Search with query and category
    response = await client.get(
        f'/api/v1/equipment/?query=test&category_id={test_equipment.category_id}',
    )
    assert response.status_code == 200
    result = response.json()
    assert len(result) == 2
    assert all(item['category_id'] == test_equipment.category_id for item in result)

    # Search with all filters
    response = await client.get(
        '/api/v1/equipment/'
        f'?query=test'
        f'&category_id={test_equipment.category_id}'
        f'&status={test_equipment.status.value}',
    )
    assert response.status_code == 200
    result = response.json()
    assert len(result) == 1
    assert result[0]['id'] == test_equipment.id


@pytest.mark.asyncio
async def test_search_equipment_pagination(
    client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test equipment search pagination."""
    # Create multiple equipment items with unique barcodes
    for i in range(5):
        data = {
            'name': f'Test Equipment {i}',
            'description': 'Test Description',
            'category_id': test_equipment.category_id,
            'barcode': f'TEST-SEARCH-{i:03d}',  # Unique barcode
            'serial_number': f'SN-SEARCH-{i:03d}',  # Unique serial
            'daily_rate': '100.00',
            'replacement_cost': '1000.00',
        }
        response = await client.post('/api/v1/equipment/', json=data)
        assert response.status_code == 201

    # Test first page
    response = await client.get('/api/v1/equipment/?query=test&limit=3')
    assert response.status_code == 200
    result = response.json()
    assert len(result) == 3

    # Test second page
    response = await client.get('/api/v1/equipment/?query=test&limit=3&skip=3')
    assert response.status_code == 200
    result = response.json()
    assert len(result) > 0
    assert len(result) <= 3

    # Test invalid pagination
    response = await client.get('/api/v1/equipment/?query=test&limit=0')
    assert response.status_code == 400

    response = await client.get('/api/v1/equipment/?query=test&skip=-1')
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_search_equipment_validation(
    client: AsyncClient,
    test_equipment: Equipment,
) -> None:
    """Test equipment search input validation."""
    # Test short query
    response = await client.get('/api/v1/equipment/?query=ab')
    assert response.status_code == 200
    result = response.json()
    assert len(result) > 0

    # Test empty query
    response = await client.get('/api/v1/equipment/?query=')
    assert response.status_code == 200
    result = response.json()
    assert len(result) > 0

    # Test invalid category
    response = await client.get('/api/v1/equipment/?query=test&category_id=999')
    assert response.status_code == 200
    result = response.json()
    assert len(result) == 0

    # Test invalid status
    response = await client.get('/api/v1/equipment/?query=test&status=INVALID')
    assert response.status_code == 422  # FastAPI validation error
    error = response.json()
    assert 'Invalid status value' in str(error['detail'])
