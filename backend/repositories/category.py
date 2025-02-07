"""Category repository module.

This module provides database operations for managing equipment categories,
including creating, retrieving, updating, and organizing hierarchical relationships.
"""

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func
from sqlalchemy.sql.expression import CTE, or_

from backend.models.category import Category
from backend.models.equipment import Equipment
from backend.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    """Category repository.

    Provides database operations for managing equipment categories.
    """

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            session: Database session
        """
        super().__init__(session, Category)

    async def get_by_name(self, name: str) -> Optional[Category]:
        """Get category by name.

        Args:
            name: Category name

        Returns:
            Category if found, None otherwise
        """
        stmt = select(Category).where(
            Category.name == name,
            Category.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_children(self, parent_id: int) -> List[Category]:
        """Get all child categories.

        Args:
            parent_id: Parent category ID

        Returns:
            List of child categories
        """
        stmt = select(Category).where(
            Category.parent_id == parent_id,
            Category.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_root_categories(self) -> List[Category]:
        """Get all root categories (without parent).

        Returns:
            List of root categories
        """
        stmt = select(Category).where(
            Category.parent_id.is_(None),
            Category.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_equipment_count(self, category_id: int) -> int:
        """Get number of equipment items in category.

        Args:
            category_id: Category ID

        Returns:
            Number of equipment items
        """
        query = (
            select(func.count())
            .select_from(Equipment)
            .where(Equipment.category_id == category_id)
        )
        result = await self.session.execute(query)
        return result.scalar_one()

    async def get_subcategories(self, category_id: int) -> List[Category]:
        """Get all subcategories (direct children).

        Args:
            category_id: Category ID

        Returns:
            List of subcategories
        """
        return await self.get_children(category_id)

    async def search(
        self,
        query: str,
        include_deleted: bool = False,
    ) -> List[Category]:
        """Search categories by name or description.

        Args:
            query: Search query string
            include_deleted: Whether to include deleted categories

        Returns:
            List of matching categories
        """
        query = query.lower()
        stmt = select(Category).where(
            or_(
                func.lower(Category.name).contains(query),
                func.lower(Category.description).contains(query),
            )
        )
        if not include_deleted:
            stmt = stmt.where(Category.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_all_with_equipment_count(self) -> List[Category]:
        """Get all categories with equipment count.

        Returns:
            List of categories with equipment count, including equipment
            from subcategories.
        """
        # Create recursive CTE to get all subcategories
        hierarchy: CTE = select(
            Category.id.label('category_id'),
            Category.id.label('subcategory_id'),
        ).cte(recursive=True)

        hierarchy = hierarchy.union_all(
            select(
                hierarchy.c.category_id,
                Category.id.label('subcategory_id'),
            ).join(
                Category,
                Category.parent_id == hierarchy.c.subcategory_id,
            )
        )

        # Count equipment in each category and its subcategories
        equipment_count = (
            select(
                hierarchy.c.category_id,
                func.count(Equipment.id).label('equipment_count'),
            )
            .join(
                Equipment,
                Equipment.category_id == hierarchy.c.subcategory_id,
            )
            .group_by(hierarchy.c.category_id)
            .subquery()
        )

        # Get categories with equipment count
        stmt = select(
            Category,
            func.coalesce(equipment_count.c.equipment_count, 0).label(
                'equipment_count'
            ),
        ).outerjoin(
            equipment_count,
            Category.id == equipment_count.c.category_id,
        )

        result = await self.session.execute(stmt)
        categories = []
        for row in result:
            category = row[0]
            category.equipment_count = row[1]
            categories.append(category)
        return categories
