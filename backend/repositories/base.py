"""Base repository module."""

from typing import Any, Generic, List, Optional, Type, TypeVar
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Base repository with common CRUD operations."""

    def __init__(self, model: Type[ModelType], session: AsyncSession):
        """Initialize repository.

        Args:
            model: SQLAlchemy model class
            session: SQLAlchemy async session
        """
        self.model = model
        self.session = session

    async def get(self, id: int) -> Optional[ModelType]:
        """Get entity by ID.

        Args:
            id: Entity ID

        Returns:
            Entity if found, None otherwise
        """
        query = select(self.model).where(self.model.id == id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_all(self) -> List[ModelType]:
        """Get all entities.

        Returns:
            List of entities
        """
        query = select(self.model)
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

    async def update(self, id: int, **kwargs: Any) -> Optional[ModelType]:
        """Update entity by ID.

        Args:
            id: Entity ID
            **kwargs: Attributes to update

        Returns:
            Updated entity if found, None otherwise
        """
        query = (
            update(self.model)
            .where(self.model.id == id)
            .values(**kwargs)
            .returning(self.model)
        )
        result = await self.session.execute(query)
        await self.session.commit()
        return result.scalar_one_or_none()

    async def delete(self, id: int) -> bool:
        """Delete entity by ID.

        Args:
            id: Entity ID

        Returns:
            True if entity was deleted, False otherwise
        """
        query = delete(self.model).where(self.model.id == id)
        result = await self.session.execute(query)
        await self.session.commit()
        return result.rowcount > 0

    async def exists(self, id: int) -> bool:
        """Check if entity exists by ID.

        Args:
            id: Entity ID

        Returns:
            True if entity exists, False otherwise
        """
        query = select(self.model.id).where(self.model.id == id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none() is not None 