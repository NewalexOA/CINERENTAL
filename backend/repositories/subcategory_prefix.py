"""Subcategory prefix repository module.

This module provides database operations for managing subcategory prefixes,
which are used in barcode generation for equipment items.
"""

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.expression import or_

from backend.models import SubcategoryPrefix
from backend.repositories.base import BaseRepository


class SubcategoryPrefixRepository(BaseRepository[SubcategoryPrefix]):
    """Subcategory prefix repository.

    Provides database operations for managing subcategory prefixes.
    """

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            session: Database session
        """
        super().__init__(session, SubcategoryPrefix)

    async def get_by_category(self, category_id: int) -> List[SubcategoryPrefix]:
        """Get all subcategory prefixes for a category.

        Args:
            category_id: Category ID

        Returns:
            List of subcategory prefixes
        """
        stmt = select(SubcategoryPrefix).where(
            SubcategoryPrefix.category_id == category_id
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_prefix(
        self, category_id: int, prefix: str
    ) -> Optional[SubcategoryPrefix]:
        """Get subcategory prefix by prefix value.

        Args:
            category_id: Category ID
            prefix: Prefix value

        Returns:
            SubcategoryPrefix if found, None otherwise
        """
        stmt = select(SubcategoryPrefix).where(
            SubcategoryPrefix.category_id == category_id,
            SubcategoryPrefix.prefix == prefix,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(
        self, category_id: int, name: str
    ) -> Optional[SubcategoryPrefix]:
        """Get subcategory prefix by name.

        Args:
            category_id: Category ID
            name: Subcategory name

        Returns:
            SubcategoryPrefix if found, None otherwise
        """
        stmt = select(SubcategoryPrefix).where(
            SubcategoryPrefix.category_id == category_id,
            SubcategoryPrefix.name == name,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search(
        self, query: str, category_id: Optional[int] = None
    ) -> List[SubcategoryPrefix]:
        """Search subcategory prefixes by name or description.

        Args:
            query: Search query
            category_id: Optional category ID to filter by

        Returns:
            List of matching subcategory prefixes
        """
        query_lower = query.lower()
        stmt = select(SubcategoryPrefix).where(
            or_(
                SubcategoryPrefix.name.ilike(f'%{query_lower}%'),
                SubcategoryPrefix.description.ilike(f'%{query_lower}%'),
            )
        )

        if category_id is not None:
            stmt = stmt.where(SubcategoryPrefix.category_id == category_id)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())
