"""Scan session service module.

This module provides service for managing scan sessions.
"""

from typing import List, Optional

from backend.models import ScanSession
from backend.repositories import ScanSessionRepository


class ScanSessionService:
    """Service for managing scan sessions."""

    def __init__(self, repository: ScanSessionRepository) -> None:
        """Initialize service.

        Args:
            repository: Scan session repository
        """
        self.repository = repository

    async def create_session(
        self,
        name: str,
        items: Optional[List[dict]] = None,
        user_id: Optional[int] = None,
        days: int = 7,
    ) -> ScanSession:
        """Create a new scan session.

        Args:
            name: Session name
            items: List of scanned equipment items
            user_id: User ID
            days: Number of days until expiration

        Returns:
            Created scan session
        """
        session = ScanSession.create_with_expiration(
            name=name,
            user_id=user_id,
            items=items or [],
            days=days,
        )
        return await self.repository.create(session)

    async def get_session(self, session_id: int) -> Optional[ScanSession]:
        """Get scan session by ID.

        Args:
            session_id: Scan session ID

        Returns:
            Scan session if found, None otherwise
        """
        return await self.repository.get(session_id)

    async def get_user_sessions(self, user_id: int) -> List[ScanSession]:
        """Get all scan sessions for a user.

        Args:
            user_id: User ID

        Returns:
            List of scan sessions
        """
        return await self.repository.get_by_user(user_id)

    async def update_session(
        self,
        session_id: int,
        name: Optional[str] = None,
        items: Optional[List[dict]] = None,
    ) -> Optional[ScanSession]:
        """Update an existing scan session.

        Args:
            session_id: Scan session ID
            name: New session name
            items: New list of items

        Returns:
            Updated scan session if found, None otherwise
        """
        session = await self.repository.get(session_id)
        if not session:
            return None

        if name is not None:
            session.name = name

        if items is not None:
            session.items = items

        return await self.repository.update(session)

    async def delete_session(self, session_id: int) -> bool:
        """Delete scan session by ID.

        Args:
            session_id: Scan session ID

        Returns:
            True if deleted, False otherwise
        """
        session = await self.repository.get(session_id)
        if not session:
            return False

        await self.repository.soft_delete(session_id)
        return True

    async def clean_expired_sessions(self) -> int:
        """Delete all expired scan sessions.

        Returns:
            Number of deleted sessions
        """
        return await self.repository.clean_expired()
