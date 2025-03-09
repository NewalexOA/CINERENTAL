"""Global barcode sequence repository module.

This module provides database operations for managing the global barcode sequence,
which is used to track the last used sequence number for auto-incremented barcodes.
"""

from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import GlobalBarcodeSequence
from backend.repositories.base import BaseRepository


class GlobalBarcodeSequenceRepository(BaseRepository[GlobalBarcodeSequence]):
    """Global barcode sequence repository.

    Provides database operations for managing the global barcode sequence.
    """

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            session: Database session
        """
        super().__init__(session, GlobalBarcodeSequence)

    async def get_sequence(self) -> Optional[GlobalBarcodeSequence]:
        """Get the global barcode sequence.

        There should only be one record in the table with id=1.

        Returns:
            GlobalBarcodeSequence if found, None otherwise
        """
        query = select(GlobalBarcodeSequence).where(GlobalBarcodeSequence.id == 1)
        result = await self.session.scalar(query)
        return result

    async def increment_sequence(self) -> int:
        """Increment sequence number and return the new value.

        This method atomically increments the sequence number and returns
        the new value. If the sequence doesn't exist, it creates a new one
        with last_number = 1.

        Returns:
            New sequence number
        """
        # Get existing sequence
        sequence = await self.get_sequence()

        if sequence:
            # Increment existing sequence atomically
            stmt = (
                update(GlobalBarcodeSequence)
                .where(GlobalBarcodeSequence.id == 1)
                .values(last_number=GlobalBarcodeSequence.last_number + 1)
                .returning(GlobalBarcodeSequence.last_number)
            )
            result = await self.session.execute(stmt)
            await self.session.commit()
            return result.scalar_one()
        else:
            # Create new sequence record with id=1
            sequence = GlobalBarcodeSequence(
                id=1,
                last_number=1,
            )
            await self.create(sequence)
            return 1

    async def get_or_create_sequence(self) -> GlobalBarcodeSequence:
        """Get or create the global barcode sequence.

        If the sequence doesn't exist, it creates a new one with id=1
        and last_number = 0.

        Returns:
            GlobalBarcodeSequence instance
        """
        sequence = await self.get_sequence()
        if not sequence:
            sequence = GlobalBarcodeSequence(
                id=1,
                last_number=0,
            )
            await self.create(sequence)
        return sequence
