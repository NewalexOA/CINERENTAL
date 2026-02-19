"""Scan session service module.

This module provides service for managing scan sessions.
"""

from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from backend.models import ScanSession
from backend.models.equipment import Equipment
from backend.repositories import ScanSessionRepository
from backend.schemas.scan_session import EquipmentItemResponse


class ScanSessionService:
    """Service for managing scan sessions."""

    def __init__(self, repository: ScanSessionRepository) -> None:
        """Initialize service.

        Args:
            repository: Scan session repository
        """
        self.repository = repository

    async def _enrich_items(
        self,
        raw_items: list,
    ) -> List[EquipmentItemResponse]:
        """Enrich stored item references with current equipment data from DB.

        Args:
            raw_items: Raw JSON items from session (each has equipment_id, quantity)

        Returns:
            List of enriched items with current name, barcode, category, etc.
        """
        if not raw_items:
            return []

        equipment_ids = [
            item.get('equipment_id') for item in raw_items if item.get('equipment_id')
        ]
        if not equipment_ids:
            return []

        # Fetch current equipment data with categories
        query = (
            select(Equipment)
            .where(Equipment.id.in_(equipment_ids))
            .options(joinedload(Equipment.category))
        )
        result = await self.repository.session.execute(query)
        equipment_map: Dict[int, Equipment] = {
            eq.id: eq for eq in result.unique().scalars().all()
        }

        enriched: List[EquipmentItemResponse] = []
        for item in raw_items:
            eq_id = item.get('equipment_id')
            eq = equipment_map.get(eq_id)
            if not eq:
                continue

            enriched.append(
                EquipmentItemResponse(
                    equipment_id=eq.id,
                    barcode=eq.barcode,
                    name=eq.name,
                    category_id=eq.category_id,
                    category_name=eq.category_name,
                    serial_number=eq.serial_number,
                    quantity=item.get('quantity', 1),
                )
            )

        return enriched

    async def enrich_session(self, session: ScanSession) -> dict:
        """Convert a ScanSession model to a response dict with enriched items.

        Args:
            session: ScanSession model instance

        Returns:
            Dict suitable for ScanSessionResponse validation
        """
        enriched_items = await self._enrich_items(session.items or [])
        return {
            'id': session.id,
            'name': session.name,
            'items': [item.model_dump() for item in enriched_items],
            'user_id': session.user_id,
            'created_at': session.created_at,
            'updated_at': session.updated_at,
            'expires_at': session.expires_at,
        }

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
            items: List of scanned equipment items (equipment_id + quantity)
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

    async def get_all_sessions(self) -> List[ScanSession]:
        """Get all non-deleted scan sessions.

        Returns:
            List of scan sessions
        """
        return await self.repository.get_all_active()

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
            items: New list of items (equipment_id + quantity)

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
