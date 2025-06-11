"""Project service module.

This module provides service functionality for project management.
Import redirected to modular implementation.
"""

# Import the new modular ProjectService to maintain backward compatibility
from backend.services.project.project import ProjectService

__all__ = ['ProjectService']
