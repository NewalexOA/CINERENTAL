"""Repository package.

This package provides data access layer implementations for all entities.
"""

from backend.repositories.base import BaseRepository
from backend.repositories.booking import BookingRepository
from backend.repositories.category import CategoryRepository
from backend.repositories.client import ClientRepository
from backend.repositories.document import DocumentRepository
from backend.repositories.equipment import EquipmentRepository

__all__ = [
    'BaseRepository',
    'BookingRepository',
    'CategoryRepository',
    'ClientRepository',
    'DocumentRepository',
    'EquipmentRepository',
]
