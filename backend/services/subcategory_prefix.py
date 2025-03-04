"""Subcategory prefix service module.

This module implements business logic for managing subcategory prefixes,
which are used in barcode generation for equipment items.
"""

from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import ConflictError, NotFoundError
from backend.models import SubcategoryPrefix
from backend.repositories import CategoryRepository, SubcategoryPrefixRepository


class SubcategoryPrefixService:
    """Service for managing subcategory prefixes."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize service.

        Args:
            session: SQLAlchemy async session
        """
        self.session = session
        self.repository = SubcategoryPrefixRepository(session)
        self.category_repository = CategoryRepository(session)

    async def create_subcategory_prefix(
        self,
        category_id: int,
        name: str,
        prefix: str,
        description: Optional[str] = None,
    ) -> SubcategoryPrefix:
        """Create new subcategory prefix.

        Args:
            category_id: Category ID
            name: Subcategory name
            prefix: Subcategory prefix (2 characters)
            description: Subcategory description (optional)

        Returns:
            Created subcategory prefix

        Raises:
            NotFoundError: If category not found
            ConflictError: If subcategory prefix with given name or prefix
            already exists
        """
        # Check if category exists
        category = await self.category_repository.get(category_id)
        if not category:
            raise NotFoundError(f'Category with ID {category_id} not found')

        # Check if subcategory prefix with given name exists
        existing_by_name = await self.repository.get_by_name(category_id, name)
        if existing_by_name:
            msg = f'Subcategory prefix with name "{name}" already exists '
            msg += 'for this category'
            raise ConflictError(
                msg,
                details={'name': name, 'category_id': category_id},
            )

        # Check if subcategory prefix with given prefix exists
        existing_by_prefix = await self.repository.get_by_prefix(category_id, prefix)
        if existing_by_prefix:
            msg = f'Subcategory prefix with prefix "{prefix}" already exists '
            msg += 'for this category'
            raise ConflictError(
                msg,
                details={'prefix': prefix, 'category_id': category_id},
            )

        # Create subcategory prefix
        subcategory_prefix = SubcategoryPrefix(
            category_id=category_id,
            name=name,
            prefix=prefix,
            description=description,
        )
        await self.repository.create(subcategory_prefix)
        return subcategory_prefix

    async def update_subcategory_prefix(
        self,
        subcategory_prefix_id: int,
        name: Optional[str] = None,
        prefix: Optional[str] = None,
        description: Optional[str] = None,
    ) -> SubcategoryPrefix:
        """Update subcategory prefix.

        Args:
            subcategory_prefix_id: Subcategory prefix ID
            name: New name (optional)
            prefix: New prefix (optional)
            description: New description (optional)

        Returns:
            Updated subcategory prefix

        Raises:
            NotFoundError: If subcategory prefix not found
            ConflictError: If subcategory prefix with given name or prefix
            already exists
        """
        # Get subcategory prefix
        subcategory_prefix = await self.repository.get(subcategory_prefix_id)
        if not subcategory_prefix:
            msg = f'Subcategory prefix with ID {subcategory_prefix_id} not found'
            raise NotFoundError(msg)

        # Check name uniqueness if changing
        if name and name != subcategory_prefix.name:
            existing_by_name = await self.repository.get_by_name(
                subcategory_prefix.category_id, name
            )
            if existing_by_name:
                msg = f'Subcategory prefix with name "{name}" already exists '
                msg += 'for this category'
                raise ConflictError(
                    msg,
                    details={
                        'name': name,
                        'category_id': subcategory_prefix.category_id,
                    },
                )

        # Check prefix uniqueness if changing
        if prefix and prefix != subcategory_prefix.prefix:
            existing_by_prefix = await self.repository.get_by_prefix(
                subcategory_prefix.category_id, prefix
            )
            if existing_by_prefix:
                msg = f'Subcategory prefix with prefix "{prefix}" already exists '
                msg += 'for this category'
                raise ConflictError(
                    msg,
                    details={
                        'prefix': prefix,
                        'category_id': subcategory_prefix.category_id,
                    },
                )

        # Apply updates
        if name:
            subcategory_prefix.name = name
        if prefix:
            subcategory_prefix.prefix = prefix
        if description is not None:  # Allow setting to None
            subcategory_prefix.description = description

        await self.repository.update(subcategory_prefix)
        return subcategory_prefix

    async def get_subcategory_prefix(
        self, subcategory_prefix_id: int
    ) -> Optional[SubcategoryPrefix]:
        """Get subcategory prefix by ID.

        Args:
            subcategory_prefix_id: Subcategory prefix ID

        Returns:
            Subcategory prefix or None if not found
        """
        return await self.repository.get(subcategory_prefix_id)

    async def get_by_category(self, category_id: int) -> List[SubcategoryPrefix]:
        """Get all subcategory prefixes for a category.

        Args:
            category_id: Category ID

        Returns:
            List of subcategory prefixes
        """
        return await self.repository.get_by_category(category_id)

    async def delete_subcategory_prefix(self, subcategory_prefix_id: int) -> bool:
        """Delete subcategory prefix by ID.

        Args:
            subcategory_prefix_id: Subcategory prefix ID

        Returns:
            True if subcategory prefix was deleted, False if not found
        """
        subcategory_prefix = await self.repository.get(subcategory_prefix_id)
        if not subcategory_prefix:
            return False
        return await self.repository.delete(subcategory_prefix_id)

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
        return await self.repository.search(query, category_id)
