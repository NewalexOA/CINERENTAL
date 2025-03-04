"""Base model module.

This module re-exports base model classes from base_models package.
"""

from backend.models.base_models.base import Base, HasId
from backend.models.base_models.mixins import SoftDeleteMixin, TimestampMixin

__all__ = [
    'Base',
    'HasId',
    'TimestampMixin',
    'SoftDeleteMixin',
]
