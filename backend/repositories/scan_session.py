"""Scan session repository module.

This module provides repository for scan sessions.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import ScanSession
from backend.repositories.base import BaseRepository


class ScanSessionRepository(BaseRepository[ScanSession]):
    """Repository for scan sessions."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            session: Database session
        """
        super().__init__(session, ScanSession)

    async def get_by_user(self, user_id: int) -> List[ScanSession]:
        """Get all scan sessions for a user.

        Args:
            user_id: User ID

        Returns:
            List of scan sessions
        """
        query = (
            select(self.model)
            .where(self.model.user_id == user_id, self.model.deleted_at.is_(None))
            .order_by(self.model.created_at.desc())
        )

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_expired(self, now: Optional[datetime] = None) -> List[ScanSession]:
        """Get all expired scan sessions.

        Args:
            now: Current datetime (defaults to current time)

        Returns:
            List of expired scan sessions
        """
        if now is None:
            now = datetime.now()

        query = select(self.model).where(
            self.model.expires_at < now, self.model.deleted_at.is_(None)
        )

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def clean_expired(self, now: Optional[datetime] = None) -> int:
        """Delete all expired scan sessions.

        Args:
            now: Current datetime (defaults to current time)

        Returns:
            Number of deleted sessions
        """
        expired_sessions = await self.get_expired(now)

        for session in expired_sessions:
            await self.soft_delete(session.id)

        return len(expired_sessions)
