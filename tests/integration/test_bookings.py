"""Integration tests for booking functionality."""

# from datetime import datetime
# from typing import Any, Dict, cast
#
# from fastapi import status
# from httpx import AsyncClient
#
# from tests.conftest import async_test


# TODO: Раскомментировать после реализации функционала бронирований
# @async_test
# async def test_create_booking(
#     client: AsyncClient,
#     test_dates: Dict[str, datetime],
#     test_equipment: Any,
#     test_client: Any
# ) -> None:
#     """Test creating a booking.
#
#     Note: This test is temporarily disabled until the booking functionality
#     is fully implemented, including:
#     - BookingCreate and BookingResponse schemas
#     - BookingService with create_booking method
#     - Database models and migrations
#     - API endpoints in bookings router
#     """
#     data = {
#         'client_id': test_client.id,
#         'equipment_id': test_equipment.id,
#         'start_date': test_dates['start_date'].isoformat(),
#         'end_date': test_dates['end_date'].isoformat(),
#         'total_amount': 300.00,
#         'deposit_amount': 100.00,
#         'notes': 'Test booking'
#     }
#
#     response = await client.post('/bookings/', json=data)
#     assert response.status_code == status.HTTP_201_CREATED
#
#     result = cast(Dict[str, Any], response.json())
#     assert result['equipment_id'] == data['equipment_id']
#     assert result['client_id'] == data['client_id']
#     assert result['start_date'] == data['start_date']
#     assert result['end_date'] == data['end_date']
#     assert result['notes'] == data['notes']
