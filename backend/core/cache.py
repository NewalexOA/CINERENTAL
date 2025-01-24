"""Redis cache initialization module."""
from redis import asyncio as aioredis

from backend.core.config import settings

# Create Redis connection pool
redis = aioredis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
)


async def get_redis():
    """Get Redis connection."""
    try:
        yield redis
    finally:
        await redis.close() 