"""Base models package for backward compatibility.

This package re-exports functionality from the new model structure.
It's maintained for backward compatibility during refactoring period.
"""

from backend.models.core.base import Base, HasId
from backend.models.mixins import SoftDeleteMixin, TimestampMixin

__all__ = ['Base', 'HasId', 'SoftDeleteMixin', 'TimestampMixin']
