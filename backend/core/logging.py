"""Logging configuration module."""

import logging
import sys
from pathlib import Path
from typing import Any, Dict, Union

from loguru import logger

from backend.core.config import settings


class InterceptHandler(logging.Handler):
    """Intercepts standard logging and redirects to loguru."""

    def emit(self, record: logging.LogRecord) -> None:
        """Intercept log record and pass to loguru.

        Args:
            record: Log record to intercept
        """
        # Skip uvicorn access logs timestamp
        if record.name == 'uvicorn.access' and record.getMessage().startswith('20'):
            return

        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = str(record.levelno)

        # Find caller from where originated the logged message
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back  # type: ignore
            depth += 1

        # Extract log message without timestamp
        message = record.getMessage()
        if message.startswith('20') and ' | ' in message:
            message = ' | '.join(message.split(' | ')[1:])

        # Pass extra fields from record with safe defaults
        extra: Dict[str, Any] = {
            'name': getattr(record, 'name', 'unknown'),
            'function': getattr(record, 'funcName', 'unknown'),
            'line': getattr(record, 'lineno', 0),
            'module': getattr(record, 'module', 'unknown'),
            'thread_name': getattr(record, 'threadName', 'MainThread'),
            'process_name': getattr(record, 'processName', 'MainProcess'),
        }

        logger.opt(
            depth=depth,
            exception=record.exc_info,
        ).bind(
            **extra
        ).log(level, message)


def setup_logging_intercept() -> None:
    """Intercept all standard logging and redirect to loguru."""
    # Remove all existing handlers
    logging.root.handlers = []

    # Redirect standard logging to loguru
    logging.basicConfig(
        handlers=[InterceptHandler()],
        level=0,
        force=True,
        format='%(message)s',
    )

    # Intercept all third-party loggers
    loggers = [
        'uvicorn',
        'uvicorn.access',
        'uvicorn.error',
        'uvicorn.asgi',
        'fastapi',
        'sqlalchemy.engine',
        'alembic',
        'watchfiles',
        'backend',
    ]

    # Configure each logger
    for name in loggers:
        logging_logger = logging.getLogger(name)
        # Remove any existing handlers
        if logging_logger.handlers:
            for handler in logging_logger.handlers[:]:
                logging_logger.removeHandler(handler)
        # Add our interceptor
        logging_logger.addHandler(InterceptHandler())
        # Prevent double logging
        logging_logger.propagate = False


def configure_logging(
    sink: Union[str, Path, None] = None,
    **kwargs: Any,
) -> None:
    """Configure logging for the application.

    Args:
        sink: Optional log file path
        **kwargs: Additional logging configuration options
    """
    # Remove all existing handlers from loguru
    logger.remove()

    # Determine log level
    log_level = settings.LOG_LEVEL.upper()

    # Common log format with safe defaults for extra fields
    log_format = (
        '<green>{time:YYYY-MM-DD HH:mm:ss}</green> | '
        '<level>{level: <8}</level> | '
        '{extra[name]!s:>20}:{extra[function]!s:>20}:{extra[line]!s:<4} | '
        '<level>{message}</level>'
    )

    # Configure console logging with colors
    logger.add(
        sys.stderr,
        level=log_level,
        format=log_format,
        enqueue=True,  # Thread-safe logging
        backtrace=True,  # Include exception tracebacks
        diagnose=True,  # Include diagnostic info
        catch=True,  # Handle exceptions gracefully
        colorize=True,  # Enable colorization
        **kwargs,
    )

    # Configure file logging in development
    if settings.ENVIRONMENT == 'development':
        log_path = Path(sink) if sink else Path('logs/cinerental.log')
        log_path.parent.mkdir(parents=True, exist_ok=True)

        # File format without colors and with safe defaults
        file_format = (
            '{time:YYYY-MM-DD HH:mm:ss} | '
            '{level: <8} | '
            '{extra[name]!s}:{extra[function]!s}:{extra[line]!s} | '
            '{message}'
        )

        logger.add(
            str(log_path),
            level=log_level,
            format=file_format,
            rotation='00:00',  # Rotate at midnight
            retention='1 week',
            compression='zip',
            enqueue=True,  # Thread-safe logging
            backtrace=True,  # Include exception tracebacks
            diagnose=True,  # Include diagnostic info
            catch=True,  # Handle exceptions gracefully
            serialize=True,  # Enable JSON serialization for better parsing
            **kwargs,
        )

    # Setup logging interception after loguru configuration
    setup_logging_intercept()

    # Log configuration complete
    logger.bind(
        name='backend.core.logging',
        function='configure_logging',
        line=0,
    ).info(
        'Logging configured | Environment: {} | Level: {}',
        settings.ENVIRONMENT,
        log_level,
    )
