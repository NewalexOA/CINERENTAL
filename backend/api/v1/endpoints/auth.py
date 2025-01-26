"""Authentication endpoints."""

from fastapi import APIRouter

auth_router = APIRouter()


@auth_router.get('/health', response_model=dict[str, str])  # type: ignore[misc]
async def health_check() -> dict[str, str]:
    """Health check endpoint.

    Returns:
        Status message indicating service is running
    """
    return {'status': 'Service is running'}
