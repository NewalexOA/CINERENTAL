"""Scheduler module.

This module provides scheduler for background tasks.
"""

import logging
from typing import Callable

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI

from backend.repositories import ScanSessionRepository
from backend.services import ScanSessionService

logger = logging.getLogger(__name__)


async def clean_expired_scan_sessions(
    repository: ScanSessionRepository,
) -> None:
    """Clean expired scan sessions.

    Args:
        repository: Scan session repository
    """
    service = ScanSessionService(repository)
    count = await service.clean_expired_sessions()
    logger.info(f'Cleaned {count} expired scan sessions')


def setup_scheduler(
    app: FastAPI,
    get_scan_session_repository: Callable[[], ScanSessionRepository],
) -> None:
    """Setup scheduler for periodic tasks.

    Args:
        app: FastAPI application
        get_scan_session_repository: Function to get scan session repository
    """
    scheduler = AsyncIOScheduler()

    # Trigger to run every day at midnight
    trigger = IntervalTrigger(days=1)

    # Add job to clean expired scan sessions
    scheduler.add_job(
        clean_expired_scan_sessions,
        trigger=trigger,
        args=[get_scan_session_repository()],
        id='clean_expired_scan_sessions',
        name='Clean expired scan sessions',
        replace_existing=True,
    )

    # Start scheduler
    scheduler.start()
    app.state.scheduler = scheduler

    logger.info('Scheduler started')

    @app.on_event('shutdown')
    async def shutdown_scheduler() -> None:
        """Shutdown scheduler gracefully."""
        logger.info('Shutting down scheduler')
        app.state.scheduler.shutdown()
