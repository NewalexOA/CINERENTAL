"""Redis cache initialization module."""

from typing import Optional

from redis.asyncio import ConnectionPool, Redis
from redis.exceptions import ConnectionError, RedisError

from backend.core.config import settings

# Create Redis connection pool and client
# Using decode_responses=True, so we work with str values
redis_pool: Optional[ConnectionPool] = None
redis: Optional[Redis] = None


async def init_redis() -> None:
    """Initialize Redis connection pool.

    Raises:
        RedisError: If connection to Redis fails
    """
    global redis_pool, redis
    try:
        # Create connection pool
        pool: ConnectionPool = ConnectionPool.from_url(
            settings.REDIS_URL,
            encoding='utf-8',
            decode_responses=True,
            health_check_interval=30,  # Check connection every 30 seconds
        )
        # Create and test Redis client
        client: Redis = Redis(connection_pool=pool)
        # Test connection with timeout
        await client.ping()
        redis_pool = pool
        redis = client
    except (ConnectionError, RedisError) as e:
        redis_pool = None
        redis = None
        raise RedisError(f'Failed to initialize Redis connection: {str(e)}') from e


async def get_redis() -> Redis:
    """Get Redis client.

    Returns:
        Redis: Redis client from connection pool.

    Raises:
        RuntimeError: If Redis is not initialized.
    """
    if redis is None:
        raise RuntimeError('Redis is not initialized')
    return redis


async def close_redis() -> None:
    """Close Redis connection pool and client."""
    global redis_pool, redis
    if redis is not None:
        try:
            await redis.close()  # Use standard close() method
            redis = None
        except RedisError:
            # Ignore errors during shutdown
            pass

    if redis_pool is not None:
        try:
            await redis_pool.disconnect(inuse_connections=True)  # Close all connections
            redis_pool = None
        except RedisError:
            # Ignore errors during shutdown
            pass
