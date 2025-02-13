"""Database initialization module.

This module provides database connection and session management functionality,
including async session creation and dependency injection for FastAPI.
"""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.core.config import settings

# Create async engine with optimized settings
engine = create_async_engine(
    settings.DATABASE_URL,
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
