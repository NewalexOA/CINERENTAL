"""Test configuration and fixtures."""

import asyncio
from typing import AsyncGenerator, Callable, Generator

import pytest
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.core.config import settings
from backend.models.base import Base


@pytest.fixture(scope='session')  # type: ignore[misc]
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for tests.

    Returns:
        Event loop instance
    """
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope='function')  # type: ignore[misc]
async def db_engine() -> AsyncGenerator[AsyncEngine, None]:
    """Create database engine for tests.

    Yields:
        Database engine instance
    """
    database_url = settings.DATABASE_URL.replace(
        'postgresql+asyncpg://',
        'postgresql+asyncpg://postgres:postgres@localhost:5432/cinerental_test',
    )

    engine = create_async_engine(database_url, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture  # type: ignore[misc]
def session_factory(
    db_engine: AsyncEngine,
) -> Callable[[], AsyncSession]:
    """Create session factory for tests.

    Args:
        db_engine: Database engine instance

    Returns:
        Session factory
    """
    return async_sessionmaker(
        bind=db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


@pytest.fixture  # type: ignore[misc]
async def db_session(
    session_factory: Callable[[], AsyncSession],
) -> AsyncGenerator[AsyncSession, None]:
    """Create database session for tests.

    Args:
        session_factory: Session factory

    Yields:
        Database session
    """
    async with session_factory() as session:
        yield session
        await session.rollback()
