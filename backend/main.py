"""Main FastAPI application module."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.v1.api import api_router
from backend.core.cache import init_redis, close_redis
from backend.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager.

    Initialize and cleanup resources.
    """
    # Initialize Redis
    await init_redis()
    yield
    # Cleanup
    await close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Cinema Equipment Rental Management System",
    lifespan=lifespan,
)

# Set CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1") 