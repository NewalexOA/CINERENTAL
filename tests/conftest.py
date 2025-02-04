"""Test configuration and fixtures."""

import asyncio
from functools import wraps
from typing import (
    Any,
    AsyncGenerator,
    Callable,
    Coroutine,
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
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from starlette.types import ASGIApp

from backend.core.config import settings
from backend.core.database import get_db
from backend.main import app
from backend.models.base import Base
from backend.models.category import Category

P = ParamSpec('P')
T = TypeVar('T', covariant=True)
R = TypeVar('R')


def async_test(
    func: Callable[P, Coroutine[Any, Any, R]],
) -> Callable[P, Coroutine[Any, Any, R]]:
    """Properly typed decorator for async tests.

    Args:
        func: Async test function to decorate

    Returns:
        Decorated test function with preserved signature and metadata
    """
    decorated = pytest.mark.asyncio(func)

    @wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        result = await decorated(*args, **kwargs)
        return cast(R, result)

    return cast(Callable[P, Coroutine[Any, Any, R]], wrapper)


@overload
def async_fixture(
    func: Callable[P, AsyncGenerator[T, None]],
) -> Callable[P, AsyncGenerator[T, None]]:
    ...


@overload
def async_fixture(
    func: Callable[P, Coroutine[Any, Any, T]],
) -> Callable[P, Coroutine[Any, Any, T]]:
    ...


def async_fixture(
    func: Callable[P, AsyncGenerator[T, None] | Coroutine[Any, Any, T]],
) -> Callable[P, AsyncGenerator[T, None] | Coroutine[Any, Any, T]]:
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
        Callable[P, AsyncGenerator[T, None] | Coroutine[Any, Any, T]],
        wrapper,
    )


# Test database URL
TEST_DATABASE_URL = (
    settings.DATABASE_URL.replace('localhost', 'db')
    .replace('cinerental', 'test_cinerental')
    .replace('user:password', f'{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}')
)

# Create async engine for tests
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

# Create async session factory
TestingSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def create_test_database() -> None:
    """Create test database if it doesn't exist."""
    sys_conn = await asyncpg.connect(
        host='db',
        port=5432,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        database='postgres',
    )

    try:
        await sys_conn.execute(
            f'CREATE DATABASE '
            f'{settings.POSTGRES_DB.replace("cinerental", "test_cinerental")}'
        )
    except asyncpg.exceptions.DuplicateDatabaseError:
        pass
    finally:
        await sys_conn.close()


@pytest.fixture(scope='session')  # type: ignore[misc]
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@async_fixture
async def test_db_setup() -> AsyncGenerator[None, None]:
    """Set up the test database."""
    await create_test_database()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@async_fixture
async def db_session(test_db_setup: None) -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for a test."""
    async with TestingSessionLocal() as session:
        try:
            yield session
            await session.rollback()
        finally:
            await session.close()


@async_fixture
async def test_category(db_session: AsyncSession) -> AsyncGenerator[Category, None]:
    """Create a test category."""
    category = Category(name='Test Category', description='Test Description')
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    yield category


@async_fixture
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create an async client for testing."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=cast(ASGIApp, app))
    async with AsyncClient(transport=transport, base_url='http://test') as client:
        yield client

    app.dependency_overrides.clear()
