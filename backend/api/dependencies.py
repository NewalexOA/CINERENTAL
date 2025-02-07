"""API dependencies module."""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session."""
    async with AsyncSessionLocal() as session:
        yield session
