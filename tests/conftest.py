"""Test configuration and fixtures."""

import asyncio
from typing import AsyncGenerator, Generator

import asyncpg
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.core.config import settings
from backend.core.database import get_db
from backend.main import app
from backend.models.base import Base
from backend.models.category import Category

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


@pytest_asyncio.fixture(scope='session')  # type: ignore[misc]
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope='session')  # type: ignore[misc]
async def test_db_setup() -> AsyncGenerator[None, None]:
    """Set up the test database."""
    await create_test_database()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture  # type: ignore[misc]
async def db_session(test_db_setup: None) -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for a test."""
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()
        await session.close()


@pytest_asyncio.fixture  # type: ignore[misc]
async def test_category(db_session: AsyncSession) -> AsyncGenerator[Category, None]:
    """Create a test category."""
    category = Category(name='Test Category', description='Test Description')
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    yield category


@pytest_asyncio.fixture  # type: ignore[misc]
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create an async client for testing."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(transport=transport, base_url='http://test') as client:
        yield client

    app.dependency_overrides.clear()
