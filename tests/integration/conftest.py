"""Test configuration and fixtures for integration tests."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.booking import Booking
from backend.models.category import Category
from backend.models.client import Client
from backend.models.equipment import Equipment
from backend.services.booking import BookingService
from backend.services.category import CategoryService
from backend.services.client import ClientService
from backend.services.document import DocumentService
from backend.services.equipment import EquipmentService


@pytest.fixture  # type: ignore[misc]
async def test_category(db_session: AsyncSession) -> Category:
    """Create test category."""
    category_service = CategoryService(db_session)
    return await category_service.create_category(
        name='Test Category',
        description='Test Description',
    )


@pytest.fixture  # type: ignore[misc]
async def test_equipment(
    db_session: AsyncSession, test_category: Category
) -> Equipment:
    """Create test equipment."""
    equipment_service = EquipmentService(db_session)
    return await equipment_service.create_equipment(
        name='Test Equipment',
        category_id=test_category.id,
        description='Test Description',
        serial_number='TEST001',
        barcode='TEST001',
        daily_rate=100.0,
        replacement_cost=1000.0,
    )


@pytest.fixture  # type: ignore[misc]
async def test_client(db_session: AsyncSession) -> Client:
    """Create test client."""
    client_service = ClientService(db_session)
    return await client_service.create_client(
        first_name='John',
        last_name='Doe',
        email='john.doe@example.com',
        phone='+1234567890',
        passport_number='AB123456',
        address='123 Test St',
        company='Test Company',
        notes='Test client',
    )


@pytest.fixture  # type: ignore[misc]
async def booking_service(db_session: AsyncSession) -> BookingService:
    """Create booking service instance."""
    return BookingService(db_session)


@pytest.fixture  # type: ignore[misc]
async def document_service(db_session: AsyncSession) -> DocumentService:
    """Create document service instance."""
    return DocumentService(db_session)


@pytest.fixture  # type: ignore[misc]
async def equipment_service(db_session: AsyncSession) -> EquipmentService:
    """Create equipment service instance."""
    return EquipmentService(db_session)


@pytest.fixture  # type: ignore[misc]
async def test_booking(
    db_session: AsyncSession,
    test_client: Client,
    test_equipment: Equipment,
) -> Booking:
    """Create test booking."""
    booking_service = BookingService(db_session)
    start_date = datetime.now(timezone.utc) + timedelta(days=1)
    end_date = start_date + timedelta(days=4)
    return await booking_service.create_booking(
        client_id=test_client.id,
        equipment_id=test_equipment.id,
        start_date=start_date,
        end_date=end_date,
        total_amount=500.00,
        deposit_amount=100.00,
        notes='Test booking',
    )
