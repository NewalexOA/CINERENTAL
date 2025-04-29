"""Integration tests for booking functionality."""

from datetime import datetime, timedelta
from typing import Any, Dict, cast

from fastapi import status
from httpx import AsyncClient

from tests.conftest import async_test


@async_test
async def test_create_booking(
    async_client: AsyncClient, test_client: Any, test_equipment: Any
) -> None:
    """Test creating a booking."""
    # Prepare test data
    start_date = datetime.now() + timedelta(days=1)
    end_date = start_date + timedelta(days=3)

    data = {
        'client_id': test_client.id,
        'equipment_id': test_equipment.id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_amount': 300.00,
    }

    # Create booking
    response = await async_client.post('/api/v1/bookings/', json=data)
    assert response.status_code == status.HTTP_201_CREATED

    result = cast(Dict[str, Any], response.json())
    assert result['equipment_id'] == data['equipment_id']
    assert result['client_id'] == data['client_id']
    assert result['booking_status'] == 'ACTIVE'
    assert result['payment_status'] == 'PENDING'


@async_test
async def test_get_bookings(
    async_client: AsyncClient, test_client: Any, test_equipment: Any
) -> None:
    """Test getting a list of bookings."""
    # Create a booking first
    start_date = datetime.now() + timedelta(days=1)
    end_date = start_date + timedelta(days=3)

    create_data = {
        'client_id': test_client.id,
        'equipment_id': test_equipment.id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_amount': 300.00,
    }

    await async_client.post('/api/v1/bookings/', json=create_data)

    # Get all bookings
    response = await async_client.get('/api/v1/bookings/')
    assert response.status_code == status.HTTP_200_OK

    bookings = response.json()
    assert isinstance(bookings, list)
    assert len(bookings) > 0

    # Test filtering by client
    client_id = test_client.id
    url = f'/api/v1/bookings/?client_id={client_id}'
    response = await async_client.get(url)
    assert response.status_code == status.HTTP_200_OK

    client_bookings = response.json()
    assert isinstance(client_bookings, list)
    assert len(client_bookings) > 0
    assert all(booking.get('client_id') == client_id for booking in client_bookings)


@async_test
async def test_get_booking_by_id(
    async_client: AsyncClient, test_client: Any, test_equipment: Any
) -> None:
    """Test getting a booking by ID."""
    # Create a booking first
    start_date = datetime.now() + timedelta(days=1)
    end_date = start_date + timedelta(days=3)

    create_data = {
        'client_id': test_client.id,
        'equipment_id': test_equipment.id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_amount': 300.00,
    }

    create_response = await async_client.post('/api/v1/bookings/', json=create_data)
    booking_id = create_response.json()['id']

    # Get booking by ID
    response = await async_client.get(f'/api/v1/bookings/{booking_id}')
    assert response.status_code == status.HTTP_200_OK

    booking = response.json()
    assert booking['id'] == booking_id
    assert booking['client_id'] == test_client.id
    assert booking['equipment_id'] == test_equipment.id


@async_test
async def test_update_booking(
    async_client: AsyncClient, test_client: Any, test_equipment: Any
) -> None:
    """Test updating a booking."""
    # Create a booking first
    start_date = datetime.now() + timedelta(days=1)
    end_date = start_date + timedelta(days=3)

    create_data = {
        'client_id': test_client.id,
        'equipment_id': test_equipment.id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_amount': 300.00,
    }

    create_response = await async_client.post('/api/v1/bookings/', json=create_data)
    booking_id = create_response.json()['id']

    # Update booking
    new_end_date = start_date + timedelta(days=5)
    update_data = {
        'end_date': new_end_date.isoformat(),
    }

    response = await async_client.put(
        f'/api/v1/bookings/{booking_id}',
        json=update_data,
    )
    assert response.status_code == status.HTTP_200_OK

    updated_booking = response.json()
    assert updated_booking['id'] == booking_id
    assert updated_booking['end_date'].startswith(new_end_date.isoformat())


@async_test
async def test_delete_booking(
    async_client: AsyncClient, test_client: Any, test_equipment: Any
) -> None:
    """Test deleting a booking."""
    # Create a booking first
    start_date = datetime.now() + timedelta(days=1)
    end_date = start_date + timedelta(days=3)

    create_data = {
        'client_id': test_client.id,
        'equipment_id': test_equipment.id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_amount': 300.00,
    }

    create_response = await async_client.post('/api/v1/bookings/', json=create_data)
    booking_id = create_response.json()['id']

    # Delete booking
    response = await async_client.delete(f'/api/v1/bookings/{booking_id}')
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify booking is deleted (should return 404)
    get_response = await async_client.get(f'/api/v1/bookings/{booking_id}')
    assert get_response.status_code == status.HTTP_404_NOT_FOUND


@async_test
async def test_update_booking_status(
    async_client: AsyncClient, test_client: Any, test_equipment: Any
) -> None:
    """Test updating a booking status."""
    # Create a booking first
    start_date = datetime.now() + timedelta(days=1)
    end_date = start_date + timedelta(days=3)

    create_data = {
        'client_id': test_client.id,
        'equipment_id': test_equipment.id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_amount': 300.00,
    }

    create_response = await async_client.post('/api/v1/bookings/', json=create_data)
    booking_id = create_response.json()['id']

    # Test direct transition to COMPLETED
    status_data = {'booking_status': 'COMPLETED'}
    url = f'/api/v1/bookings/{booking_id}/status'
    response = await async_client.patch(url, json=status_data)
    assert response.status_code == status.HTTP_200_OK
    updated_booking = response.json()
    assert updated_booking['id'] == booking_id
    assert updated_booking['booking_status'] == 'COMPLETED'

    # Test transition from COMPLETED to PENDING
    status_data = {'booking_status': 'PENDING'}
    response = await async_client.patch(url, json=status_data)
    assert response.status_code == status.HTTP_200_OK
    updated_booking = response.json()
    assert updated_booking['booking_status'] == 'PENDING'


@async_test
async def test_booking_not_found(async_client: AsyncClient) -> None:
    """Test handling of non-existent booking."""
    # Try to get non-existent booking
    response = await async_client.get('/api/v1/bookings/9999')
    assert response.status_code == status.HTTP_404_NOT_FOUND

    # Try to update non-existent booking
    update_data = {
        'end_date': datetime.now().isoformat(),
    }
    response = await async_client.put('/api/v1/bookings/9999', json=update_data)
    assert response.status_code == status.HTTP_404_NOT_FOUND

    # Try to delete non-existent booking
    response = await async_client.delete('/api/v1/bookings/9999')
    assert response.status_code == status.HTTP_404_NOT_FOUND


@async_test
async def test_update_booking_with_status(
    async_client: AsyncClient, test_client: Any, test_equipment: Any
) -> None:
    """Test updating a booking with status change."""
    # Create a booking first
    start_date = datetime.now() + timedelta(days=1)
    end_date = start_date + timedelta(days=3)

    create_data = {
        'client_id': test_client.id,
        'equipment_id': test_equipment.id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_amount': 300.00,
    }

    create_response = await async_client.post('/api/v1/bookings/', json=create_data)
    booking_id = create_response.json()['id']

    # Update booking with status change
    new_end_date = start_date + timedelta(days=5)
    update_data = {'end_date': new_end_date.isoformat(), 'booking_status': 'COMPLETED'}

    url = f'/api/v1/bookings/{booking_id}'
    response = await async_client.put(url, json=update_data)
    assert response.status_code == status.HTTP_200_OK

    updated_booking = response.json()
    assert updated_booking['id'] == booking_id
    assert updated_booking['end_date'].startswith(new_end_date.isoformat())
    assert updated_booking['booking_status'] == 'COMPLETED'


@async_test
async def test_filter_by_equipment_id(
    async_client: AsyncClient, test_client: Any, test_equipment: Any
) -> None:
    """Test filtering bookings by equipment_id."""
    start_date = datetime.now() + timedelta(days=1)
    end_date = start_date + timedelta(days=3)
    data = {
        'client_id': test_client.id,
        'equipment_id': test_equipment.id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_amount': 300.00,
    }
    await async_client.post('/api/v1/bookings/', json=data)
    url = f'/api/v1/bookings/?equipment_id={test_equipment.id}'
    response = await async_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    bookings = response.json()
    assert any(b['equipment_id'] == test_equipment.id for b in bookings)


@async_test
async def test_filter_by_status(
    async_client: AsyncClient, test_client: Any, test_equipment: Any
) -> None:
    """Test filtering bookings by booking_status."""
    start_date = datetime.now() + timedelta(days=1)
    end_date = start_date + timedelta(days=3)
    data = {
        'client_id': test_client.id,
        'equipment_id': test_equipment.id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_amount': 300.00,
    }
    create_response = await async_client.post('/api/v1/bookings/', json=data)
    booking_id = create_response.json()['id']

    # Change status to COMPLETED directly
    status_data = {'booking_status': 'COMPLETED'}
    await async_client.patch(f'/api/v1/bookings/{booking_id}/status', json=status_data)

    # Filter bookings by COMPLETED status
    url = '/api/v1/bookings/?booking_status=COMPLETED'
    response = await async_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    bookings = response.json()
    assert any(
        b['id'] == booking_id and b['booking_status'] == 'COMPLETED' for b in bookings
    )


@async_test
async def test_filter_by_payment_status(
    async_client: AsyncClient, test_client: Any, test_equipment: Any
) -> None:
    """Test filtering bookings by payment_status."""
    start_date = datetime.now() + timedelta(days=1)
    end_date = start_date + timedelta(days=3)
    data = {
        'client_id': test_client.id,
        'equipment_id': test_equipment.id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_amount': 300.00,
    }
    create_response = await async_client.post('/api/v1/bookings/', json=data)
    booking_id = create_response.json()['id']
    payment_data = {'payment_status': 'PAID'}
    await async_client.patch(
        f'/api/v1/bookings/{booking_id}/payment', json=payment_data
    )
    url = '/api/v1/bookings/?payment_status=PAID'
    response = await async_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    bookings = response.json()
    assert any(
        b['id'] == booking_id and b['payment_status'] == 'PAID' for b in bookings
    )


@async_test
async def test_filter_by_date_range(
    async_client: AsyncClient, test_client: Any, test_equipment: Any
) -> None:
    """Test filtering bookings by start_date and end_date."""
    start_date = datetime.now() + timedelta(days=10)
    end_date = start_date + timedelta(days=3)
    data = {
        'client_id': test_client.id,
        'equipment_id': test_equipment.id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_amount': 300.00,
    }
    await async_client.post('/api/v1/bookings/', json=data)
    url = (
        f'/api/v1/bookings/?start_date={start_date.isoformat()}'
        f'&end_date={end_date.isoformat()}'
    )
    response = await async_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    bookings = response.json()
    assert any(
        b['start_date'].startswith(start_date.isoformat()[:10])
        and b['end_date'].startswith(end_date.isoformat()[:10])
        for b in bookings
    )


@async_test
async def test_filter_by_active_only(
    async_client: AsyncClient, test_client: Any, test_equipment: Any
) -> None:
    """Test filtering bookings by active_only flag."""
    start_date = datetime.now() + timedelta(days=1)
    end_date = start_date + timedelta(days=3)
    data = {
        'client_id': test_client.id,
        'equipment_id': test_equipment.id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_amount': 300.00,
    }
    await async_client.post('/api/v1/bookings/', json=data)
    url = '/api/v1/bookings/?active_only=true'
    response = await async_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    bookings = response.json()
    assert all(
        b['booking_status'] in ['PENDING', 'CONFIRMED', 'ACTIVE', 'OVERDUE']
        for b in bookings
    )


@async_test
async def test_filter_by_equipment_query(
    async_client: AsyncClient, test_client: Any, test_equipment: Any
) -> None:
    """Test filtering bookings by equipment_query (name or serial number)."""
    start_date = datetime.now() + timedelta(days=1)
    end_date = start_date + timedelta(days=3)
    data = {
        'client_id': test_client.id,
        'equipment_id': test_equipment.id,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'total_amount': 300.00,
    }
    await async_client.post('/api/v1/bookings/', json=data)
    url = f'/api/v1/bookings/?equipment_query={test_equipment.name}'
    response = await async_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    bookings = response.json()
    assert any(b['equipment_id'] == test_equipment.id for b in bookings)
