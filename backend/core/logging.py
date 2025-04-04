"""Application logging configuration and setup.

This module provides logging configuration and setup for the application using
Loguru. It includes a custom logging configuration, an interceptor for standard
Python logging, and utilities for setting up the logging system.
"""

import logging
import sys
import types
from pathlib import Path
from typing import Any, Dict, Union

from loguru import logger
from pydantic import BaseModel

from backend.core.config import settings


class LogConfig(BaseModel):
    """Logging configuration for the application.

    This class defines the logging configuration using Pydantic model.
    It includes settings for log format, level, handlers, and formatters.
    """

    LOGGER_NAME: str = 'act-rental'
    CONSOLE_FORMAT: str = (
        '{time:YYYY-MM-DD HH:mm:ss} | '
        '<level>{level: <8}</level> | '
        '{name:<20} | '
        '<cyan>{function}:{line:<4}</cyan> | '
        '<level>{message}</level>'
    )
    FILE_FORMAT: str = (
        '{time:YYYY-MM-DD HH:mm:ss} | '
        '{level: <8} | '
        '{name:<20} | '
        '{function}:{line:<4} | '
        '{message}'
    )
    LOG_LEVEL: str = settings.LOG_LEVEL.upper()

    # Logging config
    version: int = 1
    disable_existing_loggers: bool = True
    formatters: Dict[str, Dict[str, Any]] = {
        'default': {
            '()': 'uvicorn.logging.DefaultFormatter',
            'fmt': '%(message)s',  # Remove timestamp from default formatter
            'use_colors': True,
        },
    }
    handlers: Dict[str, Dict[str, Any]] = {
        'default': {
            'formatter': 'default',
            'class': 'logging.StreamHandler',
            'stream': 'ext://sys.stderr',
        },
    }
    loggers: Dict[str, Dict[str, Any]] = {
        LOGGER_NAME: {'handlers': ['default'], 'level': LOG_LEVEL, 'propagate': False},
        'uvicorn': {'handlers': ['default'], 'level': LOG_LEVEL, 'propagate': False},
        'fastapi': {'handlers': ['default'], 'level': LOG_LEVEL, 'propagate': False},
        'sqlalchemy': {'handlers': ['default'], 'level': 'WARNING', 'propagate': False},
        'alembic': {'handlers': ['default'], 'level': LOG_LEVEL, 'propagate': False},
    }

    def __init__(self, **data: Any):
        """Initialize logging configuration with environment-specific settings."""
        super().__init__(**data)

        # Reduce logging verbosity in testing environment
        if settings.ENVIRONMENT == 'testing':
            # Set higher log level for HTTP access logs and other verbose components
            self.loggers.update(
                {
                    'uvicorn.access': {
                        'handlers': ['default'],
                        'level': 'WARNING',
                        'propagate': False,
                    },
                    'uvicorn.error': {
                        'handlers': ['default'],
                        'level': 'WARNING',
                        'propagate': False,
                    },
                    'uvicorn.asgi': {
                        'handlers': ['default'],
                        'level': 'WARNING',
                        'propagate': False,
                    },
                    'fastapi': {
                        'handlers': ['default'],
                        'level': 'WARNING',
                        'propagate': False,
                    },
                    'sqlalchemy.engine': {
                        'handlers': ['default'],
                        'level': 'WARNING',
                        'propagate': False,
                    },
                }
            )


class InterceptHandler(logging.Handler):
    """Intercepts standard logging and redirects to loguru."""

    def _get_level(self, record: logging.LogRecord) -> str:
        """Get the corresponding Loguru level.

        Args:
            record: The log record

        Returns:
            The Loguru level name
        """
        try:
            level_name = logger.level(record.levelname).name
            return str(level_name)  # Ensure string type
        except (ValueError, AttributeError):
            return str(record.levelno)  # Already returns string

    def _get_frame_depth(self) -> tuple[types.FrameType | None, int]:
        """Find the caller frame and depth.

        Returns:
            Tuple of (frame, depth)
        """
        frame, depth = logging.currentframe(), 6
        while frame and frame.f_code.co_filename == logging.__file__:
            next_frame = frame.f_back
            if not next_frame:
                break
            frame = next_frame
            depth += 1
        return frame, depth

    def _safe_get_attribute(
        self,
        record: logging.LogRecord,
        attr: str,
        default: Any,
        dict_fallback: bool = True,
    ) -> Any:
        """Safely get an attribute from the record.

        Args:
            record: The log record
            attr: Attribute name to get
            default: Default value if not found
            dict_fallback: Whether to check record.__dict__

        Returns:
            The attribute value or default
        """
        try:
            value = getattr(record, attr, None)
            if value is not None:
                return value
            if dict_fallback and hasattr(record, '__dict__'):
                return record.__dict__.get(attr, default)
            return default
        except Exception:
            return default

    def _prepare_extra_fields(self, record: logging.LogRecord) -> Dict[str, Any]:
        """Prepare extra fields for logging.

        Args:
            record: The log record

        Returns:
            Dictionary of extra fields
        """
        try:
            extra = {}
            if hasattr(record, '__dict__'):
                for key, value in record.__dict__.items():
                    if not key.startswith('_') and key not in {
                        'args',
                        'asctime',
                        'created',
                        'exc_info',
                        'exc_text',
                        'filename',
                        'levelname',
                        'levelno',
                        'msecs',
                        'msg',
                        'name',
                        'pathname',
                        'process',
                        'processName',
                        'relativeCreated',
                        'thread',
                        'threadName',
                        'funcName',
                        'lineno',
                        'module',
                    }:
                        try:
                            # Attempt to serialize the value
                            if isinstance(value, (str, int, float, bool, type(None))):
                                extra[key] = value
                            else:
                                extra[key] = str(value)
                        except Exception:
                            extra[key] = '<non-serializable>'
            return extra
        except Exception:
            return {}

    def emit(self, record: logging.LogRecord) -> None:
        """Process log record and emit to Loguru.

        Args:
            record: The logging record to process
        """
        # Skip uvicorn access logs timestamp
        try:
            # Skip more verbose logs in testing environment
            if settings.ENVIRONMENT == 'testing':
                # Skip all uvicorn access logs in testing
                if record.name == 'uvicorn.access':
                    return

                # Skip HTTP request logs for static files and common API endpoints
                if hasattr(record, 'getMessage'):
                    msg = record.getMessage()
                    if any(
                        pattern in msg
                        for pattern in [
                            'GET /css/',
                            'GET /js/',
                            'GET /static/',
                            'GET /api/v1/health',
                            'GET /api/v1/equipment',
                            'GET /api/v1/categories',
                        ]
                    ):
                        return

            # Original filtering logic
            if record.name == 'uvicorn.access' and record.getMessage().startswith('20'):
                return

            # Get level and find caller
            level = self._get_level(record)
            frame, depth = self._get_frame_depth()

            # Get message safely
            try:
                message = record.getMessage()
            except Exception:
                message = str(record.msg)

            # Extract base attributes with safe defaults
            name = self._safe_get_attribute(record, 'name', 'unknown')
            function = self._safe_get_attribute(record, 'funcName', 'unknown')
            line = self._safe_get_attribute(record, 'lineno', 0)
            module = self._safe_get_attribute(record, 'module', 'unknown')
            thread_name = self._safe_get_attribute(record, 'threadName', 'MainThread')
            process_name = self._safe_get_attribute(
                record, 'processName', 'MainProcess'
            )

            # Create base logger with required context
            log = logger.opt(depth=depth, exception=record.exc_info)
            log = log.bind(
                name=name,
                function=function,
                line=line,
                module=module,
                thread_name=thread_name,
                process_name=process_name,
            )

            # Add additional context from record.__dict__
            extra = self._prepare_extra_fields(record)
            if extra:
                log = log.bind(**extra)

            # Log with all context
            log.log(level, message)
        except Exception as e:
            # Fallback logging if something goes wrong
            sys.stderr.write(f'Error in InterceptHandler: {str(e)}\n')
            if hasattr(record, 'msg'):
                sys.stderr.write(f'Original message: {str(record.msg)}\n')


def should_log(record: Any) -> bool:
    """Filter log records based on source and content.

    Args:
        record: The log record to check

    Returns:
        bool: True if the log should be processed, False otherwise
    """
    try:
        # In the testing environment, filter more logs
        if settings.ENVIRONMENT == 'testing':
            # Filter all HTTP requests and responses
            if str(record['name']).startswith('uvicorn'):
                return False

            # Filter SQLAlchemy logs
            if str(record['name']).startswith('sqlalchemy'):
                return False

            # Filter FastAPI logs
            if str(record['name']).startswith('fastapi'):
                return False

            # Filter Alembic logs
            if str(record['name']).startswith('alembic'):
                return False

            # Check the message for the presence of HTTP requests
            if hasattr(record, 'message'):
                msg = str(record['message']).lower()
                if any(x in msg for x in ['get ', 'post ', 'put ', 'delete ', 'http']):
                    return False

        # Standard filtering for other environments
        # Skip SQLAlchemy initialization logs
        if str(record['name']).startswith('sqlalchemy'):
            msg = str(record['message']).lower()
            if any(
                x in msg
                for x in [
                    'initialize prop',
                    'setup',
                    'configure',
                    'select',
                    'begin',
                    'rollback',
                    'commit',
                    'cached',
                    'generated in',
                ]
            ):
                return False

        # Skip duplicate database operation logs from standard logging
        if str(record['name']) == 'logging':
            msg = str(record['message']).lower()
            if msg.startswith(('select', 'begin', 'rollback', 'commit')):
                return False

        return True
    except Exception:
        return True  # If filtering fails, allow the log


def setup_logging_intercept() -> None:
    """Intercept all standard logging and redirect to loguru."""
    # Remove all existing handlers
    logging.root.handlers = []

    # Configure SQLAlchemy logging to not include timestamps
    logging.getLogger('sqlalchemy.engine').handlers = []

    # Redirect standard logging to loguru
    logging.basicConfig(
        handlers=[InterceptHandler()],
        level=0,
        force=True,
        format='%(message)s',  # Remove timestamp from format
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
        logging_logger.handlers = []
        # Add our interceptor
        logging_logger.handlers = [InterceptHandler()]
        # Prevent propagation to avoid duplicates
        logging_logger.propagate = False


def configure_logging(
    sink: Union[str, Path, None] = None,
    **kwargs: Any,
) -> None:
    """Configure logging for the application.

    This function sets up the logging configuration by:
    1. Intercepting all standard Python logging
    2. Configuring Loguru with the application's logging settings
    3. Setting up log handlers and formatters

    Args:
        sink: Optional log file path
        **kwargs: Additional logging configuration options
    """
    # Create log config instance
    log_config = LogConfig()

    # Remove all existing handlers from loguru
    logger.remove()

    # In the testing environment, forcefully set the logging level to WARNING
    log_level = log_config.LOG_LEVEL
    if settings.ENVIRONMENT == 'testing':
        log_level = 'WARNING'

    # Configure console logging with colors
    logger.add(
        sys.stderr,
        format=log_config.CONSOLE_FORMAT,
        level=log_level,
        colorize=True,
        backtrace=True,
        diagnose=True,
        catch=True,
        filter=should_log,
        **kwargs,
    )

    # Configure file logging in development
    if settings.ENVIRONMENT == 'development':
        log_path = Path(sink) if sink else Path('logs/act-rental.log')
        log_path.parent.mkdir(parents=True, exist_ok=True)

        logger.add(
            str(log_path),
            format=log_config.FILE_FORMAT,
            level=log_level,
            rotation='00:00',  # Rotate at midnight
            retention='1 week',
            compression='zip',
            enqueue=True,  # Thread-safe logging
            backtrace=True,  # Include exception tracebacks
            diagnose=True,  # Include diagnostic info
            serialize=True,  # Enable JSON serialization
            catch=True,  # Handle exceptions gracefully
            filter=should_log,
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


def format_record(record: Dict[str, Any]) -> str:
    """Format log record as string."""
    return (
        f"{record.get('time', '')} | "
        f"{record.get('level', '')} | "
        f"{record.get('message', '')}"
    )


def serialize_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize log record to dict."""
    return {
        'time': record.get('time'),
        'level': record.get('level'),
        'message': record.get('message'),
    }


def patched_emit(record: Dict[str, Any]) -> None:
    """Patch emit function."""
    logger.bind(**record).info('')
