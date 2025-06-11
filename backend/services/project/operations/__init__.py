"""Project operations module.

Contains all project-related operations classes.
"""

from .crud_operations import CrudOperations
from .query_operations import QueryOperations

__all__ = ['CrudOperations', 'QueryOperations']
