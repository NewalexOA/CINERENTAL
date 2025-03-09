"""Model mixins package.

This package contains mixins for models.
It's separated to avoid circular imports.
"""

from backend.models.mixins.soft_delete import SoftDeleteMixin
from backend.models.mixins.timestamps import TimestampMixin

__all__ = ['TimestampMixin', 'SoftDeleteMixin']
