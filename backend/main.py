"""Main FastAPI application module."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from backend.api.v1.api import api_router
from backend.api.v1.exceptions import (
    business_exception_handler,
    validation_exception_handler,
)
from backend.core.cache import close_redis, init_redis
from backend.core.config import settings
from backend.core.templates import static_files
from backend.exceptions import BusinessError
from backend.web.router import web_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager.

    Initialize and cleanup resources.
    """
    # Initialize Redis
    await init_redis()
    yield
    # Cleanup
    await close_redis()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.PROJECT_VERSION,
    openapi_url=settings.OPENAPI_URL,
    docs_url=settings.DOCS_URL,
    redoc_url=settings.REDOC_URL,
    lifespan=lifespan,
    redirect_slashes=False,
)

# Add exception handlers
app.add_exception_handler(BusinessError, business_exception_handler)
app.add_exception_handler(ValidationError, validation_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# Set CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allow_headers=['*'],
    max_age=3600,  # Maximum time to cache preflight requests
)

# Mount static files
app.mount('/static', static_files, name='static')

# Include routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(web_router)
