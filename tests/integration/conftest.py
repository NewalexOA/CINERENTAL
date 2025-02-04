"""Test configuration and fixtures for integration tests."""

from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import (
    Any,
    AsyncGenerator,
    Callable,
    Coroutine,
    ParamSpec,
    TypeVar,
    overload,
)

import pytest_asyncio
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

P = ParamSpec('P')
T = TypeVar('T')


@overload
def async_fixture(
    func: Callable[P, AsyncGenerator[T, None]],
) -> Callable[P, AsyncGenerator[T, None]]:
    ...


@overload
def async_fixture(
    func: Callable[P, Coroutine[None, None, T]],
) -> Callable[P, Coroutine[None, None, T]]:
    ...


def async_fixture(
    func: Callable[P, AsyncGenerator[T, None] | Coroutine[None, None, T]],
) -> Callable[P, AsyncGenerator[T, None] | Coroutine[None, None, T]]:
    """Properly typed decorator for async fixtures.

    This decorator preserves the signature of the decorated function,
    allowing proper type checking of parameters and return values.
    It also preserves the function's metadata (docstring, name, etc.).

    Args:
        func: Async fixture function to decorate

    Returns:
        Decorated fixture function with preserved signature and metadata
    """
    fixture = pytest_asyncio.fixture(func)

    @wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        return await fixture(*args, **kwargs)

    return wrapper


@async_fixture
async def test_category(db_session: AsyncSession) -> AsyncGenerator[Category, None]:
    """Create test category."""
    category_service = CategoryService(db_session)
    category = await category_service.create_category(
        name='Test Category',
        description='Test Description',
    )
    yield category


@async_fixture
async def test_equipment(
    db_session: AsyncSession, test_category: Category
) -> AsyncGenerator[Equipment, None]:
    """Create test equipment."""
    equipment_service = EquipmentService(db_session)
    equipment = await equipment_service.create_equipment(
        name='Test Equipment',
        category_id=test_category.id,
        description='Test Description',
        serial_number='TEST001',
        barcode='TEST001',
        daily_rate=100.0,
        replacement_cost=1000.0,
    )
    yield equipment


@async_fixture
async def test_client(db_session: AsyncSession) -> AsyncGenerator[Client, None]:
    """Create test client."""
    client_service = ClientService(db_session)
    client = await client_service.create_client(
        first_name='John',
        last_name='Doe',
        email='john.doe@example.com',
        phone='+1234567890',
        passport_number='AB123456',
        address='123 Test St',
        company='Test Company',
        notes='Test client',
    )
    yield client


@async_fixture
async def booking_service(
    db_session: AsyncSession,
) -> AsyncGenerator[BookingService, None]:
    """Create booking service instance."""
    yield BookingService(db_session)


@async_fixture
async def document_service(
    db_session: AsyncSession,
) -> AsyncGenerator[DocumentService, None]:
    """Create document service instance."""
    yield DocumentService(db_session)


@async_fixture
async def equipment_service(
    db_session: AsyncSession,
) -> AsyncGenerator[EquipmentService, None]:
    """Create equipment service instance."""
    yield EquipmentService(db_session)


@async_fixture
async def test_booking(
    db_session: AsyncSession,
    test_client: Client,
    test_equipment: Equipment,
) -> AsyncGenerator[Booking, None]:
    """Create test booking."""
    booking_service = BookingService(db_session)
    start_date = datetime.now(timezone.utc) + timedelta(days=1)
    end_date = start_date + timedelta(days=4)
    booking = await booking_service.create_booking(
        client_id=test_client.id,
        equipment_id=test_equipment.id,
        start_date=start_date,
        end_date=end_date,
        total_amount=500.00,
        deposit_amount=100.00,
        notes='Test booking',
    )
    yield booking
