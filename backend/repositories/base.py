"""Base repository module."""

from datetime import datetime, timezone
from typing import Generic, List, Optional, Type, TypeVar, Union
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.base import Base

ModelType = TypeVar('ModelType', bound=Base)


class BaseRepository(Generic[ModelType]):
    """Base repository class.

    This class provides basic CRUD operations for models.
    """

    model: Type[ModelType]

    def __init__(self, session: AsyncSession, model: Type[ModelType]) -> None:
        """Initialize repository.

        Args:
            session: SQLAlchemy async session
            model: SQLAlchemy model class
        """
        self.session = session
        self.model = model

    async def get(
        self,
        id: Union[int, UUID],
        include_deleted: bool = False,
    ) -> Optional[ModelType]:
        """Get entity by ID.

        Args:
            id: Entity ID
            include_deleted: Whether to include deleted entities

        Returns:
            Entity if found, None otherwise
        """
        conditions = [self.model.id == id]  # type: ignore
        if not include_deleted:
            conditions.append(self.model.deleted_at.is_(None))  # type: ignore

        query = select(self.model).where(*conditions)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_all(self) -> List[ModelType]:
        """Get all entities.

        Returns:
            List of entities
        """
        query = select(self.model).where(
            self.model.deleted_at.is_(None),  # type: ignore
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def create(self, instance: ModelType) -> ModelType:
        """Create new record.

        Args:
            instance: Model instance to create

        Returns:
            Created record
        """
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def update(self, instance: ModelType) -> ModelType:
        """Update record.

        Args:
            instance: Model instance to update

        Returns:
            Updated record
        """
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def delete(self, id: Union[int, UUID]) -> bool:
        """Delete record.

        Args:
            id: Record ID

        Returns:
            True if record was deleted, False otherwise
        """
        query = delete(self.model).where(self.model.id == id)  # type: ignore
        result = await self.session.execute(query)
        await self.session.commit()
        return result.rowcount > 0

    async def exists(self, id: Union[int, UUID]) -> bool:
        """Check if entity exists by ID.

        Args:
            id: Entity ID

        Returns:
            True if entity exists, False otherwise
        """
        query = select(self.model.id).where(self.model.id == id)  # type: ignore
        result = await self.session.execute(query)
        return result.scalar_one_or_none() is not None

    async def soft_delete(self, id: Union[int, UUID]) -> Optional[ModelType]:
        """Soft delete record.

        Args:
            id: Record ID

        Returns:
            Deleted record if found, None otherwise
        """
        instance = await self.get(id)
        if instance:
            instance.deleted_at = datetime.now(timezone.utc)  # type: ignore
            await self.session.flush()
            await self.session.refresh(instance)
        return instance
