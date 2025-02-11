"""Logging configuration module."""

import logging
import sys
from pathlib import Path
from typing import Any, Union

from loguru import logger

from backend.core.config import settings


class InterceptHandler(logging.Handler):
    """Intercept standard logging and redirect to loguru."""

    def emit(self, record: logging.LogRecord) -> None:
        """Intercept and emit log record.

        Args:
            record: Log record to emit
        """
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = str(record.levelno)  # Convert int to str

        # Find caller from where originated the logged message
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back  # type: ignore
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def setup_logging_intercept() -> None:
    """Intercept all standard logging and redirect to loguru."""
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    for name in logging.root.manager.loggerDict:
        if name.startswith(('uvicorn.', 'sqlalchemy.')):
            logging_logger = logging.getLogger(name)
            logging_logger.handlers = [InterceptHandler()]


def configure_logging(
    sink: Union[str, Path, None] = None,
    **kwargs: Any,
) -> None:
    """Configure logging for the application.

    Args:
        sink: Optional log file path
        **kwargs: Additional logging configuration options
    """
    # Remove default logger
    logger.remove()

    # Determine log level
    log_level = settings.LOG_LEVEL.upper()

    # Configure console logging
    logger.add(
        sys.stdout,
        level=log_level,
        format=(
            '<green>{time:YYYY-MM-DD HH:mm:ss}</green> | '
            '<level>{level: <8}</level> | '
            '<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | '
            '<level>{message}</level>'
        ),
        **kwargs,
    )

    # Configure file logging in development
    if settings.ENVIRONMENT == 'development':
        log_path = Path(sink) if sink else Path('logs/cinerental.log')
        log_path.parent.mkdir(parents=True, exist_ok=True)

        logger.add(
            str(log_path),
            level=log_level,
            rotation='1 day',
            retention='1 week',
            compression='zip',
            format=(
                '{time:YYYY-MM-DD HH:mm:ss} | '
                '{level: <8} | '
                '{name}:{function}:{line} | '
                '{message}'
            ),
            **kwargs,
        )

    # Set specific log levels for different environments
    if settings.ENVIRONMENT == 'production':
        logger.level('DEBUG', False)  # Disable debug logs in production
        logger.level('INFO', False)  # Only show warning and above in production

    # Intercept standard logging
    setup_logging_intercept()

    logger.info(
        'Logging configured | Environment: {} | Level: {}',
        settings.ENVIRONMENT,
        log_level,
    )
