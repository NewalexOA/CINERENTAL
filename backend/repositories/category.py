"""Category repository module.

This module provides database operations for managing equipment categories,
including creating, retrieving, updating, and organizing hierarchical relationships.
"""

from typing import Dict, List, Optional

from sqlalchemy import bindparam, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased
from sqlalchemy.sql import func
from sqlalchemy.sql.expression import CTE, or_

from backend.models import Category, Equipment
from backend.repositories import BaseRepository


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
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = 'asc',
        include_deleted: bool = False,
    ) -> List[Category]:
        """Search categories by name or description.

        Args:
            query: Search query string
            sort_by: Field to sort by (optional, currently ignored).
            sort_order: Sort order ('asc' or 'desc', currently ignored).
            include_deleted: Whether to include deleted categories

        Returns:
            List of matching categories
        """
        # Note: Sorting logic is not implemented here yet, but parameters are accepted.
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
        stmt = (
            select(
                Category,
                func.coalesce(equipment_count.c.equipment_count, 0).label(
                    'equipment_count'
                ),
            )
            .outerjoin(
                equipment_count,
                Category.id == equipment_count.c.category_id,
            )
            .where(Category.deleted_at.is_(None))
        )

        result = await self.session.execute(stmt)
        categories = []
        for row in result:
            category = row[0]
            category.equipment_count = row[1]
            categories.append(category)
        return categories

    async def get_category_path_from_root(self, category_id: int) -> List[Dict]:
        """Retrieves the full ancestry path for a given category_id.

        Path is ordered from root, using SQLAlchemy ORM for the recursive CTE.
        """
        # Alias for the Category model for the recursive part of the CTE
        category_alias = aliased(Category, name='c_alias')

        # Base case of the CTE: select the starting category
        cte_base = (
            select(
                Category.id,
                Category.name,
                Category.parent_id,
                Category.show_in_print_overview,
                literal_column('0').label('distance'),
            )
            .where(Category.id == bindparam('current_category_id'))
            .where(Category.deleted_at.is_(None))
            .cte(name='category_path_cte', recursive=True)
        )

        # Recursive part of the CTE: join with the CTE itself
        cte_recursive_part = (
            select(
                category_alias.id,
                category_alias.name,
                category_alias.parent_id,
                category_alias.show_in_print_overview,
                (cte_base.c.distance + 1).label('distance'),
            )
            .join(cte_base, category_alias.id == cte_base.c.parent_id)
            .where(category_alias.deleted_at.is_(None))
        )

        # Combine base and recursive parts
        category_path_cte = cte_base.union_all(cte_recursive_part)

        # Final query to select from the CTE and order the results
        final_query = (
            select(
                category_path_cte.c.id,
                category_path_cte.c.name,
                category_path_cte.c.show_in_print_overview,
                category_path_cte.c.parent_id,
            )
            .select_from(category_path_cte)
            .order_by(category_path_cte.c.distance.desc())
        )

        result = await self.session.execute(
            final_query, {'current_category_id': category_id}
        )
        rows = result.mappings().all()
        return [dict(row) for row in rows]
