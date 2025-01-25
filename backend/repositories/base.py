"""Base repository module."""

from typing import Any, Generic, List, Optional, Protocol, Type, TypeVar, Union, cast
from uuid import UUID

from sqlalchemy import Column, delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from backend.models.base import Base


class HasId(Protocol):
    """Protocol for models with id attribute."""

    id: Union[Column[int], Column[UUID]]


ModelType = TypeVar('ModelType', bound=Base)


class BaseRepository(Generic[ModelType]):
    """Base repository with common CRUD operations."""

    model: Type[ModelType]
    session: AsyncSession

    def __init__(self, model: Type[ModelType], session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            model: SQLAlchemy model class
            session: SQLAlchemy async session
        """
        self.model = model
        self.session = session

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

    async def create(self, **kwargs: Any) -> ModelType:
        """Create new entity.

        Args:
            **kwargs: Entity attributes

        Returns:
            Created entity
        """
        entity = self.model(**kwargs)
        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity

    async def update(self, id: Union[int, UUID], **kwargs: Any) -> Optional[ModelType]:
        """Update entity by ID.

        Args:
            id: Entity ID
            **kwargs: Attributes to update

        Returns:
            Updated entity if found, None otherwise
        """
        model = cast(Type[HasId], self.model)
        query = (
            update(self.model)
            .where(model.id == id)
            .values(**kwargs)
            .returning(self.model)
        )
        result = await self.session.execute(query)
        await self.session.commit()
        return result.scalar_one_or_none()

    async def delete(self, id: Union[int, UUID]) -> bool:
        """Delete entity by ID.

        Args:
            id: Entity ID

        Returns:
            True if entity was deleted, False otherwise
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
