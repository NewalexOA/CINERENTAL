"""Category service module.

This module implements business logic for managing equipment categories,
including hierarchy management and validation of category relationships.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.category import Category
from backend.repositories.category import CategoryRepository


class CategoryService:
    """Service for managing equipment categories."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize service.

        Args:
            session: SQLAlchemy async session
        """
        self.session = session
        self.repository = CategoryRepository(session)

    async def create_category(
        self, name: str, description: str, parent_id: Optional[int] = None
    ) -> Category:
        """Create new equipment category.

        Args:
            name: Category name
            description: Category description
            parent_id: Parent category ID (optional)

        Returns:
            Created category

        Raises:
            ValueError: If category with given name already exists
        """
        # Check if category with given name exists
        existing = await self.repository.get_by_name(name)
        if existing:
            msg = f'Category with name {name} already exists'
            raise ValueError(msg)

        return await self.repository.create(
            name=name,
            description=description,
            parent_id=parent_id,
        )

    async def update_category(
        self,
        category_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        parent_id: Optional[int] = None,
    ) -> Category:
        """Update category details.

        Args:
            category_id: Category ID
            name: New name (optional)
            description: New description (optional)
            parent_id: New parent category ID (optional)

        Returns:
            Updated category

        Raises:
            ValueError: If category with given name already exists or category not found
        """
        # Check if category exists
        category = await self.repository.get(category_id)
        if not category:
            raise ValueError('Category not found')

        if name is not None:
            existing = await self.repository.get_by_name(name)
            if existing and existing.id != category_id:
                msg = f'Category with name {name} already exists'
                raise ValueError(msg)

        update_data: Dict[str, Any] = {}
        if name is not None:
            update_data['name'] = name
        if description is not None:
            update_data['description'] = description
        if parent_id is not None:
            update_data['parent_id'] = parent_id

        if update_data:
            result = await self.repository.update(category_id, **update_data)
            if not result:
                raise ValueError('Category not found')
            return result
        return category

    async def get_categories(self) -> List[Category]:
        """Get all categories.

        Returns:
            List of all categories
        """
        return await self.repository.get_all()

    async def get_category(self, category_id: int) -> Optional[Category]:
        """Get category by ID.

        Args:
            category_id: Category ID

        Returns:
            Category if found, None otherwise
        """
        return await self.repository.get(category_id)

    async def delete_category(self, category_id: int) -> bool:
        """Delete category.

        Args:
            category_id: Category ID

        Returns:
            True if category was deleted, False otherwise

        Raises:
            ValueError: If category has equipment or subcategories
        """
        # Check if category has equipment
        equipment_count = await self.repository.get_equipment_count(category_id)
        if equipment_count > 0:
            msg = (
                f'Cannot delete category {category_id} - '
                f'it has {equipment_count} equipment items'
            )
            raise ValueError(msg)

        # Check if category has subcategories
        subcategories = await self.repository.get_subcategories(category_id)
        if subcategories:
            msg = (
                f'Cannot delete category {category_id} - '
                f'it has {len(subcategories)} subcategories'
            )
            raise ValueError(msg)

        return await self.repository.delete(category_id)

    async def search_categories(self, query: str) -> List[Category]:
        """Search categories by name or description.

        Args:
            query: Search query string

        Returns:
            List of matching categories
        """
        return await self.repository.search(query)

    async def get_with_equipment_count(self) -> List[Category]:
        """Get all categories with equipment count.

        Returns:
            List of categories with equipment count
        """
        return await self.repository.get_all_with_equipment_count()
