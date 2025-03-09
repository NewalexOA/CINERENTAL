"""Bookings web routes module.

This module defines routes for the bookings web interface.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.templating import _TemplateResponse

from backend.core.database import get_db
from backend.core.templates import templates
from backend.services import BookingService, ClientService, EquipmentService
from backend.web.routes.utils import (
    get_booking_status_values,
    get_payment_status_values,
    prepare_booking_data,
)

router = APIRouter()


@router.get('/', response_class=HTMLResponse)
async def list_bookings(
    request: Request, db: AsyncSession = Depends(get_db)
) -> _TemplateResponse:
    """Bookings list page."""
    return templates.TemplateResponse(
        'bookings/list.html',
        {
            'request': request,
            'booking_statuses': get_booking_status_values(),
            'payment_statuses': get_payment_status_values(),
        },
    )


@router.get('/{booking_id}', response_class=HTMLResponse)
async def booking_detail(
    request: Request, booking_id: int, db: AsyncSession = Depends(get_db)
) -> _TemplateResponse:
    """Booking detail page."""
    booking_service = BookingService(db)

    try:
        booking = await booking_service.get_booking(booking_id)

        # Get additional data about the client and equipment
        client_service = ClientService(db)
        equipment_service = EquipmentService(db)

        client = await client_service.get_client(booking.client_id)
        equipment = await equipment_service.get_equipment(booking.equipment_id)

        # Prepare booking data using utility function
        booking_data = prepare_booking_data(
            booking, include_relations=True, client=client, equipment=equipment
        )

        return templates.TemplateResponse(
            'bookings/detail.html',
            {
                'request': request,
                'booking': booking_data,
                'booking_statuses': get_booking_status_values(),
                'payment_statuses': get_payment_status_values(),
            },
        )
    except Exception as e:
        # In case of an error, redirect to the bookings list
        raise HTTPException(status_code=404, detail=f'Booking not found: {str(e)}')
