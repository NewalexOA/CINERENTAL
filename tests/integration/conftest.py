"""Test configuration and fixtures for integration tests."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.category import Category
from backend.models.client import Client
from backend.models.equipment import Equipment
from backend.services.category import CategoryService
from backend.services.client import ClientService
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
