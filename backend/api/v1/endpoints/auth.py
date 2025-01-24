"""Authentication endpoints."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health-check")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "message": "Service is running"}
