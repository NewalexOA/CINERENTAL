"""Category service module.

This module implements business logic for managing equipment categories,
including hierarchy management and validation of category relationships.
"""

from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import (
    BusinessError,
    ConflictError,
    NotFoundError,
    ValidationError,
)
from backend.models import Category
from backend.repositories import CategoryRepository, EquipmentRepository
from backend.schemas import CategoryResponse, CategoryWithEquipmentCount
from backend.schemas.project import PrintableCategoryInfo


class CategoryService:
    """Service for managing equipment categories."""

    def __init__(
        self,
        session: AsyncSession,
        repository: Optional[CategoryRepository] = None,
        equipment_repository: Optional[EquipmentRepository] = None,
    ) -> None:
        """Initialize service.

        Args:
            session: SQLAlchemy async session
            repository: Category repository (optional)
            equipment_repository: Equipment repository (optional)
        """
        self.session = session
        self.repository = repository or CategoryRepository(session)
        self.equipment_repository = equipment_repository or EquipmentRepository(session)

    async def create_category(
        self,
        name: str,
        description: str,
        parent_id: Optional[int] = None,
        show_in_print_overview: bool = True,
    ) -> Category:
        """Create new equipment category.

        Args:
            name: Category name
            description: Category description
            parent_id: Parent category ID (optional)
            show_in_print_overview: Whether to show in print overview (defaults to True)

        Returns:
            Created category

        Raises:
            ConflictError: If category with given name already exists
            NotFoundError: If parent category not found
            ValidationError: If validation fails
        """
        # Check if category with given name exists
        existing = await self.repository.get_by_name(name)
        if existing:
            raise ConflictError(f'Category with name "{name}" already exists')

        # Validate parent category if provided
        if parent_id:
            parent = await self.repository.get(parent_id)
            if not parent:
                raise NotFoundError(f'Parent category with ID {parent_id} not found')

        # Create category
        category = Category(
            name=name,
            description=description,
            parent_id=parent_id,
            show_in_print_overview=show_in_print_overview,
        )
        await self.repository.create(category)
        return category

    async def update_category(
        self,
        category_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        parent_id: Optional[int] = None,
        show_in_print_overview: Optional[bool] = None,
    ) -> Category:
        """Update category.

        Args:
            category_id: Category ID
            name: New name (optional)
            description: New description (optional)
            parent_id: New parent ID (optional)
            show_in_print_overview: New value for show_in_print_overview (optional)

        Returns:
            Updated category

        Raises:
            ValueError: If category not found
        """
        category = await self.repository.get(category_id)
        if not category:
            raise ValueError(f'Category with ID {category_id} not found')

        # Check name uniqueness if changing
        if name and name != category.name:
            existing = await self.repository.get_by_name(name)
            if existing:
                raise ConflictError(
                    f'Category with name "{name}" already exists',
                    details={'name': name},
                )

        # Validate parent category if changing
        if parent_id is not None and parent_id != category.parent_id:
            parent = await self.repository.get(parent_id)
            if not parent and parent_id is not None:
                raise NotFoundError(
                    f'Parent category with ID {parent_id} not found',
                    details={'parent_id': parent_id},
                )
            # Prevent circular references
            if parent_id == category_id:
                raise ValidationError(
                    'Category cannot be its own parent',
                    details={'category_id': category_id, 'parent_id': parent_id},
                )

        # Apply updates
        if name:
            category.name = name
        if description:
            category.description = description
        if parent_id is not None:  # Allow setting to None
            category.parent_id = parent_id
        if show_in_print_overview is not None:  # Update if provided
            category.show_in_print_overview = show_in_print_overview

        await self.repository.update(category)
        return category

    async def get_categories(self) -> List[Category]:
        """Get all categories.

        Returns:
            List of categories
        """
        return await self.repository.get_all()

    async def get_category(self, category_id: int) -> Optional[Category]:
        """Get category by ID.

        Args:
            category_id: Category ID

        Returns:
            Category or None if not found
        """
        category = await self.repository.get(category_id)
        return category

    async def delete_category(self, category_id: int) -> bool:
        """Delete category by ID.

        Args:
            category_id: Category ID

        Returns:
            True if category was deleted, False if not found

        Raises:
            BusinessError: If category has associated equipment
            NotFoundError: If category not found
        """
        category = await self.repository.get(category_id)
        if not category:
            raise NotFoundError(f'Category with ID {category_id} not found')

        # Check if category has non-deleted equipment
        equipment = await self.equipment_repository.get_by_category(category_id)
        non_deleted_equipment = [e for e in equipment if e.deleted_at is None]

        if non_deleted_equipment:
            raise BusinessError(
                'Cannot delete category with associated equipment',
                details={
                    'category_id': category_id,
                    'equipment_count': len(non_deleted_equipment),
                },
            )

        # Use soft delete instead of physical delete
        deleted_category = await self.repository.soft_delete(category_id)
        return deleted_category is not None

    async def search_categories(self, query: str) -> List[Category]:
        """Search categories by name.

        Args:
            query: Search query

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

    async def get_print_hierarchy_and_sort_path(
        self, category_id: Optional[int]
    ) -> Tuple[List[int], List[PrintableCategoryInfo]]:
        """Retrieves ancestry path and printable categories for a category_id.

        For a given category_id, retrieves its full ancestry path for sorting
        and a list of categories marked for printing.

        Args:
            category_id: The ID of the direct category of the equipment.
                         If None, returns empty lists.

        Returns:
            A tuple containing:
                - sort_path: List of category IDs from root to the direct category.
                - printable_categories: List of PrintableCategoryInfo objects
                                        for categories marked with
                                        show_in_print_overview=True.
                                        Follows special rule if all are False.
        """
        if category_id is None:
            return [], []

        # Call the repository method to get the full path
        full_path_rows = await self.repository.get_category_path_from_root(category_id)

        if not full_path_rows:
            direct_category = await self.repository.get(category_id)
            if direct_category and direct_category.show_in_print_overview:
                return (
                    [direct_category.id],
                    [
                        PrintableCategoryInfo(
                            id=direct_category.id,
                            name=direct_category.name,
                            level=1,
                        )
                    ],
                )
            return [], []

        sort_path: List[int] = [row['id'] for row in full_path_rows]

        printable_categories: List[PrintableCategoryInfo] = []
        current_printable_level = 1
        has_any_printable = False

        for row in full_path_rows:
            if row['show_in_print_overview']:
                has_any_printable = True
                printable_categories.append(
                    PrintableCategoryInfo(
                        id=row['id'],
                        name=row['name'],
                        level=current_printable_level,
                    )
                )
                current_printable_level += 1

        if not has_any_printable and full_path_rows:
            root_category_in_path = full_path_rows[0]
            printable_categories = [
                PrintableCategoryInfo(
                    id=root_category_in_path['id'],
                    name=root_category_in_path['name'],
                    level=1,
                )
            ]

        return sort_path, printable_categories

    async def get_subcategories(self, category_id: int) -> list[Category]:
        """Get all subcategories of a category.

        Args:
            category_id: ID of the parent category

        Returns:
            List of subcategories

        Raises:
            ValueError: If category not found
        """
        category = await self.get_category(category_id)
        if not category:
            raise ValueError(f'Category with ID {category_id} not found')

        return await self.repository.get_children(category.id)

    async def get_all_subcategory_ids(self, category_id: int) -> List[int]:
        """Get all subcategory IDs recursively for a given category.

        Args:
            category_id: ID of the parent category

        Returns:
            List of all subcategory IDs including the parent category ID

        Raises:
            ValueError: If category not found
        """
        category = await self.get_category(category_id)
        if not category:
            raise ValueError(f'Category with ID {category_id} not found')

        # Include the current category itself
        category_ids = [category_id]

        # Get direct subcategories
        subcategories = await self.repository.get_children(category_id)

        # Recursively get all subcategories
        for subcategory in subcategories:
            subcategory_ids = await self.get_all_subcategory_ids(subcategory.id)
            category_ids.extend(subcategory_ids)

        return category_ids

    async def get_categories_with_equipment_count(
        self,
    ) -> list[CategoryWithEquipmentCount]:
        """Get all categories with equipment count.

        Returns:
            List of categories with equipment count
        """
        # Get categories with equipment count
        categories = await self.get_with_equipment_count()

        # Convert to response schema
        return [
            CategoryWithEquipmentCount(
                id=category.id,
                name=category.name,
                description=category.description,
                parent_id=category.parent_id,
                show_in_print_overview=category.show_in_print_overview,
                equipment_count=category.equipment_count,
                created_at=category.created_at,
                updated_at=category.updated_at,
            )
            for category in categories
        ]

    async def get_all(
        self,
        parent_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[CategoryResponse]:
        """Get all categories with optional filtering and pagination.

        Args:
            parent_id: Filter by parent category ID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of categories
        """
        stmt = (
            select(Category)
            .filter(Category.deleted_at.is_(None))
            .order_by(Category.name)
        )

        if parent_id is not None:
            stmt = stmt.filter(Category.parent_id == parent_id)

        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        categories = result.scalars().all()

        return [CategoryResponse.model_validate(c) for c in categories]
