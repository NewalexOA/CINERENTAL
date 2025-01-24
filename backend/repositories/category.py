"""Category repository module.

This module provides database operations for managing equipment categories,
including creating, retrieving, updating, and organizing hierarchical relationships.
"""

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from backend.models.category import Category
from backend.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    """Repository for equipment categories."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            session: SQLAlchemy async session
        """
        super().__init__(Category, session)

    async def get_by_name(self, name: str) -> Optional[Category]:
        """Get category by name.

        Args:
            name: Category name

        Returns:
            Category if found, None otherwise
        """
        query: Select[tuple[Category]] = select(self.model).where(
            self.model.name == name
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_children(self, parent_id: int) -> List[Category]:
        """Get child categories.

        Args:
            parent_id: Parent category ID

        Returns:
            List of child categories
        """
        query: Select[tuple[Category]] = select(self.model).where(
            self.model.parent_id == parent_id
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_root_categories(self) -> List[Category]:
        """Get root categories (without parent).

        Returns:
            List of root categories
        """
        query: Select[tuple[Category]] = select(self.model).where(
            self.model.parent_id.is_(None)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_full_path(self, category_id: int) -> List[Category]:
        """Get category path from root to given category.

        Args:
            category_id: Category ID

        Returns:
            List of categories from root to given category
        """
        path: List[Category] = []
        current: Optional[Category] = await self.get(category_id)

        while current:
            path.insert(0, current)
            if current.parent_id:
                current = await self.get(current.parent_id)
            else:
                break

        return path
