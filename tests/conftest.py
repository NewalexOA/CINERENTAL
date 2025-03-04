"""Test configuration and fixtures."""

import asyncio
import os
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
from loguru import logger
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool
from sqlalchemy.sql import text

from backend.core.config import settings
from backend.core.database import get_db
from backend.core.logging import configure_logging
from backend.main import app as main_app
from backend.models.booking import Booking
from backend.models.category import Category
from backend.models.client import Client
from backend.models.core import Base
from backend.models.document import Document
from backend.models.equipment import Equipment
from backend.models.subcategory_prefix import SubcategoryPrefix
from backend.repositories import BookingRepository, EquipmentRepository
from backend.schemas import (
    BookingStatus,
    DocumentStatus,
    DocumentType,
    EquipmentStatus,
    PaymentStatus,
)
from backend.services import (
    BookingService,
    CategoryService,
    ClientService,
    DocumentService,
    EquipmentService,
)
from backend.services.barcode import BarcodeService


# Set logging for tests
def configure_test_logging():
    """Configure logging for tests."""
    # Set the environment variable for tests
    os.environ['ENVIRONMENT'] = 'testing'

    # Forcefully set the logging level to WARNING
    # First, remove all handlers
    logger.remove()

    # Add a handler with the WARNING level
    logger.add(
        sink=lambda msg: None, level='WARNING'  # Empty handler to suppress output
    )

    # Use centralized logging configuration through loguru
    configure_logging()


# Call the logging configuration function
configure_test_logging()


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

    return pytest.mark.asyncio(wrapper)


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


@pytest.fixture(scope='session')
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
        poolclass=NullPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    try:
        yield engine
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await engine.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a new database session for a test."""
    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False, autoflush=True
    )

    session = session_factory()
    try:
        yield session
    finally:
        await session.close()


@pytest.fixture
async def test_category(db_session: AsyncSession) -> Category:
    """Create a test category."""
    category = Category(name='Test Category', description='Test Description')
    db_session.add(category)
    await db_session.commit()
    return category


@pytest_asyncio.fixture
async def test_client(db_session: AsyncSession) -> AsyncGenerator[Client, None]:
    """Create a test client."""
    client = Client(
        first_name='Test',
        last_name='Client',
        email='test@example.com',
        phone='+1234567890',
        passport_number='TEST123',
        address='Test Address',
        company='Test Company',
        notes='Test notes',
    )
    db_session.add(client)
    await db_session.commit()
    return client


@pytest_asyncio.fixture
async def test_equipment(
    db_session: AsyncSession,
    test_category: Category,
) -> AsyncGenerator[Equipment, None]:
    """Create a test equipment."""
    equipment = Equipment(
        name='Test Equipment',
        description='Test Description',
        category_id=test_category.id,
        barcode='CATS-000001-5',
        serial_number='SN001',
        replacement_cost=Decimal('1000.00'),
        status=EquipmentStatus.AVAILABLE,
    )
    db_session.add(equipment)
    await db_session.commit()
    await db_session.refresh(equipment)
    yield equipment


@pytest_asyncio.fixture
async def test_booking(
    db_session: AsyncSession, test_equipment: Equipment, test_client: Client
) -> Booking:
    """Create a test booking."""
    start_date = datetime.now(timezone.utc) + timedelta(days=1)
    end_date = start_date + timedelta(days=1)

    booking = Booking(
        equipment_id=test_equipment.id,
        client_id=test_client.id,
        start_date=start_date,
        end_date=end_date,
        booking_status=BookingStatus.PENDING,
        payment_status=PaymentStatus.PENDING,
        total_amount=300.00,
        deposit_amount=100.00,
    )
    db_session.add(booking)
    await db_session.commit()
    return booking


@pytest_asyncio.fixture
async def booking(test_booking: Booking) -> Booking:
    """Get test booking."""
    return test_booking


@pytest_asyncio.fixture
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
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
async def services(db_session: AsyncSession) -> Dict[str, Any]:
    """Create service instances for testing."""
    return {
        'booking': BookingService(db_session),
        'category': CategoryService(db_session),
        'client': ClientService(db_session),
        'document': DocumentService(db_session),
        'equipment': EquipmentService(db_session),
    }


@pytest.fixture(autouse=True)
async def cleanup_test_data(engine) -> AsyncGenerator[None, None]:
    """Clean up test data after each test."""
    yield

    # Создаем новую сессию специально для очистки
    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False, autoflush=True
    )
    cleanup_session = session_factory()

    try:
        async with cleanup_session.begin():
            # Отключаем проверку внешних ключей
            await cleanup_session.execute(
                text("SET session_replication_role = 'replica'")
            )

            # Очищаем таблицы в правильном порядке
            tables = [
                'documents',
                'bookings',
                'equipment',
                'categories',
                'clients',
                'users',
            ]

            for table in tables:
                try:
                    await cleanup_session.execute(
                        text(f'TRUNCATE TABLE {table} CASCADE')
                    )
                except Exception as e:
                    print(f'Error cleaning up table {table}: {str(e)}')

            # Включаем обратно проверку внешних ключей
            await cleanup_session.execute(
                text("SET session_replication_role = 'origin'")
            )

    except Exception as e:
        print(f'Error during cleanup: {str(e)}')
        raise
    finally:
        await cleanup_session.close()


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
async def document_service(db_session: AsyncSession) -> DocumentService:
    """Create document service instance for testing."""
    return DocumentService(db_session)


@pytest_asyncio.fixture
async def category_service(db_session: AsyncSession) -> CategoryService:
    """Create category service instance for testing."""
    return CategoryService(db_session)


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


@pytest_asyncio.fixture
async def equipment_with_special_chars(
    db_session: AsyncSession,
    test_category: Category,
) -> Equipment:
    """Create equipment with special characters."""
    equipment = Equipment(
        name="Test <script>alert('XSS')</script> Equipment",
        description="Test equipment with !@#$%^&*() special chars ' OR '1'='1",
        barcode='DROP TABLE equipment;--',
        serial_number='Test & Equipment',
        category_id=test_category.id,
        status=EquipmentStatus.AVAILABLE,
        replacement_cost=Decimal('1000.00'),
    )
    db_session.add(equipment)
    await db_session.commit()
    await db_session.refresh(equipment)
    return equipment


@pytest_asyncio.fixture
async def equipment_with_long_strings(
    db_session: AsyncSession,
    test_category: Category,
) -> Equipment:
    """Create equipment with very long strings."""
    equipment = Equipment(
        name='A' * 200,  # Maximum length for name
        description='B' * 1000,  # Maximum length for description
        barcode='C' * 100,  # Maximum length for barcode
        serial_number='D' * 100,  # Maximum length for serial number
        category_id=test_category.id,
        status=EquipmentStatus.AVAILABLE,
        replacement_cost=Decimal('1000.00'),
    )
    db_session.add(equipment)
    await db_session.commit()
    await db_session.refresh(equipment)
    return equipment


@pytest_asyncio.fixture
async def equipment_with_unicode(
    db_session: AsyncSession,
    test_category: Category,
) -> Equipment:
    """Create equipment with Unicode characters."""
    equipment = Equipment(
        name='Тестовое оборудование 测试设备 テスト機器',
        description='Описание テスト-001 测试说明',
        barcode='バーコード-001',
        serial_number='シリアル-001',
        category_id=test_category.id,
        status=EquipmentStatus.AVAILABLE,
        replacement_cost=Decimal('1000.00'),
    )
    db_session.add(equipment)
    await db_session.commit()
    await db_session.refresh(equipment)
    return equipment


@pytest_asyncio.fixture
async def test_document(
    db_session: AsyncSession,
    test_booking: Booking,
) -> AsyncGenerator[Document, None]:
    """Create test document."""
    document = Document(
        client_id=test_booking.client_id,
        booking_id=test_booking.id,
        type=DocumentType.CONTRACT,
        file_path='/test/contract.pdf',
        title='Test Contract',
        description='Test contract description',
        file_name='contract.pdf',
        file_size=1024,
        mime_type='application/pdf',
        notes='Test document',
        status=DocumentStatus.DRAFT,
    )
    db_session.add(document)
    await db_session.commit()
    await db_session.refresh(document)
    yield document


@pytest_asyncio.fixture
async def document(test_document: Document) -> Document:
    """Get test document."""
    return test_document


@pytest_asyncio.fixture
async def equipment_service(db_session: AsyncSession) -> EquipmentService:
    """Create equipment service instance for testing."""
    return EquipmentService(db_session)


@pytest_asyncio.fixture
async def barcode_service(db_session: AsyncSession) -> BarcodeService:
    """Create barcode service for tests.

    Args:
        db_session: Database session

    Returns:
        Barcode service instance
    """
    return BarcodeService(db_session)


@pytest_asyncio.fixture
async def test_category_with_prefix(db_session: AsyncSession) -> Category:
    """Create a test category with prefix.

    Args:
        db_session: Database session

    Returns:
        Category instance with prefix
    """
    category = Category(
        name=f'Test Category {uuid.uuid4()}',
        description='Test Description',
        prefix='TC',
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    return category


@pytest_asyncio.fixture
async def test_subcategory_prefix(
    db_session: AsyncSession, test_category_with_prefix: Category
) -> SubcategoryPrefix:
    """Create a test subcategory prefix.

    Args:
        db_session: Database session
        test_category_with_prefix: Category instance

    Returns:
        SubcategoryPrefix instance
    """
    subcategory_prefix = SubcategoryPrefix(
        category_id=test_category_with_prefix.id,
        name=f'Test Subcategory {uuid.uuid4()}',
        prefix='TS',
        description='Test Subcategory Description',
    )
    db_session.add(subcategory_prefix)
    await db_session.commit()
    await db_session.refresh(subcategory_prefix)
    return subcategory_prefix


@pytest_asyncio.fixture
async def test_equipment_with_prefix(
    db_session: AsyncSession,
    test_category_with_prefix: Category,
) -> AsyncGenerator[Equipment, None]:
    """Create a test equipment with category that has prefix.

    Args:
        db_session: Database session
        test_category_with_prefix: Category instance with prefix

    Returns:
        Equipment instance with category that has prefix
    """
    equipment = Equipment(
        name='Test Equipment with Prefix',
        description='Test Description',
        category_id=test_category_with_prefix.id,
        barcode='TCXX-000001-5',
        serial_number='SN001',
        replacement_cost=Decimal('1000.00'),
        status=EquipmentStatus.AVAILABLE,
    )
    db_session.add(equipment)
    await db_session.commit()
    await db_session.refresh(equipment)
    yield equipment
