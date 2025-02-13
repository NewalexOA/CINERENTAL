"""Test configuration and fixtures."""

import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from functools import wraps
from typing import (
    Any,
    AsyncGenerator,
    Callable,
    Coroutine,
    Dict,
    Generator,
    ParamSpec,
    TypeVar,
    cast,
    overload,
)

import asyncpg
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.core.config import settings
from backend.core.database import get_db
from backend.main import app as main_app
from backend.models import Base, Booking, Category, Client, Equipment
from backend.repositories import BookingRepository, EquipmentRepository
from backend.schemas import EquipmentStatus
from backend.services import (
    BookingService,
    CategoryService,
    ClientService,
    DocumentService,
    EquipmentService,
)

P = ParamSpec('P')
T = TypeVar('T')
R = TypeVar('R')


@pytest.fixture(scope='session')
def event_loop():
    """Create event loop for tests."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()


@pytest.fixture(scope='session')
def executor():
    """Create thread pool executor for async operations."""
    with ThreadPoolExecutor() as executor:
        yield executor


def async_test(
    func: Callable[P, Coroutine[Any, Any, R]],
) -> Callable[P, R]:
    """Decorator for async test functions.

    This decorator properly handles type information for pytest fixtures
    and async functions using ParamSpec for parameter types preservation.
    """

    @wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        return await func(*args, **kwargs)

    return wrapper


@overload
def async_fixture(
    func: Callable[P, AsyncGenerator[T, None]],
) -> Callable[P, Generator[T, None, None]]: ...


@overload
def async_fixture(
    func: Callable[P, Coroutine[Any, Any, T]],
) -> Callable[P, Generator[T, None, None]]: ...


def async_fixture(
    func: Callable[P, AsyncGenerator[T, None] | Coroutine[Any, Any, T]],
) -> Callable[P, Generator[T, None, None]]:
    """Properly typed decorator for async fixtures.

    Args:
        func: Async fixture function to decorate

    Returns:
        Decorated fixture function with preserved signature and metadata
    """
    fixture = pytest_asyncio.fixture(func)

    @wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        result = await fixture(*args, **kwargs)
        if isinstance(result, AsyncGenerator):
            async for item in result:
                return cast(T, item)
        return cast(T, result)

    return cast(
        Callable[P, Generator[T, None, None]],
        wrapper,
    )


# Test database URL
TEST_DATABASE_URL = (
    f'postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}'
    f'@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/cinerental_test'
)


@pytest_asyncio.fixture(scope='session')
async def create_test_database() -> None:
    """Create test database if it doesn't exist."""
    sys_conn = await asyncpg.connect(
        host=settings.POSTGRES_SERVER,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        database='postgres',
    )

    try:
        await sys_conn.execute(
            '''SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = 'cinerental_test'
                AND pid <> pg_backend_pid();
            '''
        )
        await sys_conn.execute('DROP DATABASE IF EXISTS cinerental_test')
        await sys_conn.execute('CREATE DATABASE cinerental_test')
    except asyncpg.exceptions.DuplicateDatabaseError:
        pass
    finally:
        await sys_conn.close()


@pytest_asyncio.fixture(scope='session')
async def engine(create_test_database) -> AsyncGenerator[AsyncEngine, None]:
    """Create engine instance."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        future=True,
        pool_pre_ping=True,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    """Get session for testing."""
    session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )

    async with session_factory() as session:
        try:
            yield session
        finally:
            await session.rollback()
            await session.close()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Get test client."""

    async def override_get_session():
        yield db_session

    main_app.dependency_overrides[get_db] = override_get_session

    transport = ASGITransport(app=main_app)
    base_url = 'http://test'
    async with AsyncClient(transport=transport, base_url=base_url) as client:
        yield client

    main_app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_category(db_session: AsyncSession) -> AsyncGenerator[Category, None]:
    """Create a test category."""
    category = Category(name='Test Category', description='Test Description')
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    yield category
    await db_session.delete(category)
    await db_session.commit()


@pytest_asyncio.fixture
async def test_client(db_session: AsyncSession) -> AsyncGenerator[Client, None]:
    """Create a test client for testing."""
    unique_id = str(uuid.uuid4())[:8]
    client = Client(
        first_name='Test',
        last_name='User',
        email=f'test_{unique_id}@example.com',
        phone=f'+1234567890_{unique_id}',
        address='123 Test St',
        passport_number=f'AB123456_{unique_id}',
        notes='Test client for testing',
    )
    db_session.add(client)
    await db_session.commit()
    await db_session.refresh(client)
    yield client
    # Clean up related bookings first
    await db_session.execute(delete(Booking).where(Booking.client_id == client.id))
    await db_session.commit()
    # Then delete the client
    await db_session.delete(client)
    await db_session.commit()


@pytest_asyncio.fixture
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create an async client for testing."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        try:
            yield db_session
        finally:
            await db_session.rollback()

    main_app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=main_app)
    base_url = 'http://test'
    async with AsyncClient(transport=transport, base_url=base_url) as client:
        yield client

    main_app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_equipment(
    db_session: AsyncSession, test_category: Category
) -> Equipment:
    """Create a test equipment."""
    equipment = Equipment(
        name='Test Camera',
        description='Professional camera for testing',
        barcode='TEST-001',
        serial_number='SN-001',
        category_id=test_category.id,
        daily_rate=Decimal('100.00'),
        replacement_cost=Decimal('1000.00'),
        status=EquipmentStatus.AVAILABLE,
    )
    db_session.add(equipment)
    await db_session.commit()
    await db_session.refresh(equipment)
    return equipment


@pytest_asyncio.fixture
async def services(db_session: AsyncSession) -> Dict[str, Any]:
    """Create service instances for testing."""
    return {
        'booking': BookingService(db_session),
        'category': CategoryService(db_session),
        'client': ClientService(db_session),
        'document': DocumentService(db_session),
        'equipment': EquipmentService(db_session),
    }


@pytest_asyncio.fixture(autouse=True)
async def cleanup_db(db_session: AsyncSession) -> AsyncGenerator[None, None]:
    """Clean up database after each test."""
    yield
    try:
        # Rollback any pending changes
        await db_session.rollback()

        # Delete all data from tables in reverse order to handle foreign keys
        for table in reversed(Base.metadata.sorted_tables):
            try:
                await db_session.execute(table.delete())
            except Exception as e:
                print(f'Error cleaning up table {table.name}: {str(e)}')
                continue

        # Commit the cleanup
        await db_session.commit()
    except Exception as e:
        print(f'Error during database cleanup: {str(e)}')
        await db_session.rollback()
        raise


def run_sync(coro):
    """Run coroutine in synchronous context."""
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)


@pytest.fixture(scope='function')
def sync_session(db_session):
    """Get synchronous session for testing."""

    def run_sync(coro):
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(coro)

    return run_sync


@pytest_asyncio.fixture
async def service(db_session: AsyncSession) -> EquipmentService:
    """Create equipment service instance for testing."""
    return EquipmentService(db_session)


@pytest_asyncio.fixture
async def booking_service(db_session: AsyncSession) -> BookingService:
    """Create booking service instance for testing."""
    return BookingService(db_session)


@pytest_asyncio.fixture
async def equipment_repository(db_session: AsyncSession) -> EquipmentRepository:
    """Create equipment repository instance for testing."""
    return EquipmentRepository(db_session)


@pytest_asyncio.fixture
async def booking_repository(db_session: AsyncSession) -> BookingRepository:
    """Create booking repository instance for testing."""
    return BookingRepository(db_session)


@pytest.fixture
def test_dates() -> Dict[str, datetime]:
    """Generate test dates in the future."""
    base_date = datetime.now(timezone.utc) + timedelta(days=1)
    return {
        'now': base_date - timedelta(days=1),
        'start_date': base_date,
        'end_date': base_date + timedelta(days=3),
        'past_date': base_date - timedelta(days=2),
        'future_date': base_date + timedelta(days=4),
        'far_future_date': base_date + timedelta(days=30),
    }
