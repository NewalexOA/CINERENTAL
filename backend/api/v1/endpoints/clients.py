"""Clients endpoints module.

This module implements API endpoints for managing rental service clients.
It provides routes for client registration, profile management,
and accessing rental history and related documents.
"""

from fastapi import APIRouter

clients_router: APIRouter = APIRouter()
