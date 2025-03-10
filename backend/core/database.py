"""Database initialization module.

This module provides database connection and session management functionality,
including async session creation and dependency injection for FastAPI.
"""

import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.core.config import settings

POSTGRES_USER = os.environ.get('POSTGRES_USER', settings.POSTGRES_USER)
POSTGRES_PASSWORD = os.environ.get('POSTGRES_PASSWORD', settings.POSTGRES_PASSWORD)
POSTGRES_SERVER = os.environ.get('POSTGRES_SERVER', settings.POSTGRES_SERVER)
POSTGRES_PORT = os.environ.get('POSTGRES_PORT', str(settings.POSTGRES_PORT))
POSTGRES_DB = os.environ.get('POSTGRES_DB', settings.POSTGRES_DB)

# Construct database URL directly from environment variables
DATABASE_URL = (
    f'postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}'
    f'@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}'
)

# Also create a synchronous URL for migrations
SYNC_DATABASE_URL = (
    f'postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}'
    f'@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}'
)

# Forcefully override URL in settings for compatibility with scripts
# This ensures that migrations use the correct URL
# pylint: disable=protected-access
settings.__dict__['SYNC_DATABASE_URL'] = SYNC_DATABASE_URL
settings.__dict__['DATABASE_URL'] = DATABASE_URL

# Create async engine with optimized settings
engine = create_async_engine(
    DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=settings.WORKERS_COUNT * 2,
    max_overflow=10,
    pool_recycle=3600,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session.

    This is a FastAPI dependency that provides an async database session.
    The session is automatically closed when the request is complete.

    Example:
        ```python
        @app.get('/items')
        async def get_items(session: AsyncSession = Depends(get_db)):
            items = await session.execute(select(Item))
            return items.scalars().all()
        ```

    Yields:
        AsyncSession: Database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
