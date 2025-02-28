"""Main application module.

This module initializes the FastAPI application, configures CORS middleware,
and includes API routers. It serves as the entry point for the web application.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from backend.api.v1.api import api_router
from backend.api.v1.exceptions import (
    business_exception_handler,
    validation_exception_handler,
)
from backend.core.cache import close_redis, init_redis
from backend.core.config import settings
from backend.core.logging import configure_logging
from backend.core.templates import static_files
from backend.exceptions import BusinessError
from backend.web.router import web_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager.

    This context manager handles startup and shutdown events for the application.
    It ensures proper setup of logging, initialization of resources, and cleanup.

    Args:
        app: The FastAPI application instance
    """
    # Setup logging on startup
    configure_logging()

    # If we are in the testing environment, log only warnings and errors
    if settings.ENVIRONMENT == 'testing':
        logger.info('Application startup in testing mode - reduced logging')
    else:
        logger.info('Application startup')

    # Initialize resources
    await init_redis()
    yield
    # Cleanup resources
    await close_redis()
    logger.info('Application shutdown')


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    This function creates a new FastAPI instance, configures middleware,
    exception handlers, and includes routers.

    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.PROJECT_VERSION,
        description='CINERENTAL API',
        docs_url='/api/docs',
        openapi_url='/api/openapi.json',
        lifespan=lifespan,
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )

    # Configure exception handlers
    app.add_exception_handler(BusinessError, business_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    # Mount static files
    app.mount('/static', static_files, name='static')

    # Include routers
    app.include_router(api_router, prefix=settings.API_V1_STR)
    app.include_router(web_router)

    return app


app = create_app()
