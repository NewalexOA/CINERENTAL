"""Core models package.

This package contains core model classes.
It's separated to avoid circular imports.
"""

from backend.models.core.base import Base, HasId

__all__ = ['Base', 'HasId']
