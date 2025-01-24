"""Redis cache initialization module."""
from typing import Optional

from redis.asyncio import Redis, from_url

from backend.core.config import settings

# Create Redis client
redis: Optional[Redis] = None


async def init_redis() -> None:
    """Initialize Redis connection."""
    global redis
    redis = from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )


async def get_redis() -> Redis:
    """Get Redis client.

    Returns:
        Redis: Redis client.

    Raises:
        RuntimeError: If Redis is not initialized.
    """
    if redis is None:
        raise RuntimeError("Redis is not initialized")
    return redis


async def close_redis() -> None:
    """Close Redis connection."""
    if redis is not None:
        await redis.close() 