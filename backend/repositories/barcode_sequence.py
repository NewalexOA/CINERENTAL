"""Barcode sequence repository module.

This module provides database operations for managing barcode sequences,
which are used to track the last used sequence number for each category
and subcategory prefix combination.
"""

from typing import List, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import BarcodeSequence
from backend.repositories.base import BaseRepository


class BarcodeSequenceRepository(BaseRepository[BarcodeSequence]):
    """Barcode sequence repository.

    Provides database operations for managing barcode sequences.
    """

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            session: Database session
        """
        super().__init__(session, BarcodeSequence)

    async def get_by_category_and_prefix(
        self, category_id: int, subcategory_prefix: str
    ) -> Optional[BarcodeSequence]:
        """Get barcode sequence by category ID and subcategory prefix.

        Args:
            category_id: Category ID
            subcategory_prefix: Subcategory prefix

        Returns:
            BarcodeSequence if found, None otherwise
        """
        stmt = select(BarcodeSequence).where(
            BarcodeSequence.category_id == category_id,
            BarcodeSequence.subcategory_prefix == subcategory_prefix,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_category(self, category_id: int) -> List[BarcodeSequence]:
        """Get all barcode sequences for a category.

        Args:
            category_id: Category ID

        Returns:
            List of barcode sequences
        """
        stmt = select(BarcodeSequence).where(BarcodeSequence.category_id == category_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def increment_sequence(
        self, category_id: int, subcategory_prefix: str
    ) -> int:
        """Increment sequence number and return the new value.

        This method atomically increments the sequence number and returns
        the new value. If the sequence doesn't exist, it creates a new one
        with last_number = 1.

        Args:
            category_id: Category ID
            subcategory_prefix: Subcategory prefix

        Returns:
            New sequence number
        """
        # Try to get existing sequence
        sequence = await self.get_by_category_and_prefix(
            category_id, subcategory_prefix
        )

        if sequence:
            # Increment existing sequence
            stmt = (
                update(BarcodeSequence)
                .where(
                    BarcodeSequence.category_id == category_id,
                    BarcodeSequence.subcategory_prefix == subcategory_prefix,
                )
                .values(last_number=BarcodeSequence.last_number + 1)
                .returning(BarcodeSequence.last_number)
            )
            result = await self.session.execute(stmt)
            await self.session.commit()
            return result.scalar_one()
        else:
            # Create new sequence
            sequence = BarcodeSequence(
                category_id=category_id,
                subcategory_prefix=subcategory_prefix,
                last_number=1,
            )
            await self.create(sequence)
            return 1
