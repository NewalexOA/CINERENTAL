"""Base model module.

This module re-exports base model classes from core package.
"""

from backend.models.core.base import Base, HasId
from backend.models.mixins import SoftDeleteMixin, TimestampMixin

__all__ = [
    'Base',
    'HasId',
    'TimestampMixin',
    'SoftDeleteMixin',
]
