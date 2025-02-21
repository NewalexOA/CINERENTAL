"""Redis cache initialization module."""

from typing import Optional, Union

from redis.asyncio import Redis, from_url
from redis.exceptions import ConnectionError, RedisError

from backend.core.config import settings

# Create Redis client
redis: Optional[Redis[Union[str, bytes]]] = None


async def init_redis() -> None:
    """Initialize Redis connection.

    Raises:
        RedisError: If connection to Redis fails
    """
    global redis
    try:
        redis = from_url(
            settings.REDIS_URL,
            encoding='utf-8',
            decode_responses=True,
        )
        # Test connection
        await redis.ping()
    except (ConnectionError, RedisError) as e:
        redis = None
        raise RedisError(f'Failed to initialize Redis connection: {str(e)}') from e


async def get_redis() -> Redis[Union[str, bytes]]:
    """Get Redis client.

    Returns:
        Redis: Redis client.

    Raises:
        RuntimeError: If Redis is not initialized.
    """
    if redis is None:
        raise RuntimeError('Redis is not initialized')
    return redis


async def close_redis() -> None:
    """Close Redis connection."""
    if redis is not None:
        try:
            await redis.close()
        except RedisError:
            # Ignore errors during shutdown
            pass
