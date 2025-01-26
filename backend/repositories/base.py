"""Base repository module."""

from typing import Generic, List, Optional, Protocol, Type, TypeVar, Union, cast
from uuid import UUID

from sqlalchemy import Column, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from backend.models.base import Base


class HasId(Protocol):
    """Protocol for models with id attribute."""

    id: Union[Column[int], Column[UUID]]


ModelType = TypeVar('ModelType', bound=Base)


class BaseRepository(Generic[ModelType]):
    """Base repository class.

    This class provides basic CRUD operations for models.
    """

    def __init__(self, session: AsyncSession, model: type[ModelType]) -> None:
        """Initialize repository.

        Args:
            session: SQLAlchemy async session
            model: SQLAlchemy model class
        """
        self.session = session
        self.model = model

    async def get(self, id: Union[int, UUID]) -> Optional[ModelType]:
        """Get entity by ID.

        Args:
            id: Entity ID

        Returns:
            Entity if found, None otherwise
        """
        model = cast(Type[HasId], self.model)
        query: Select[tuple[ModelType]] = select(self.model).where(model.id == id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_all(self) -> List[ModelType]:
        """Get all entities.

        Returns:
            List of entities
        """
        query: Select[tuple[ModelType]] = select(self.model)
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
        model = cast(Type[HasId], self.model)
        query = delete(self.model).where(model.id == id)
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
        model = cast(Type[HasId], self.model)
        query = select(model.id).where(model.id == id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none() is not None
