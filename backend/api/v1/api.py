"""Main API router module."""
from fastapi import APIRouter

from backend.api.v1.endpoints import (
    auth,
    equipment,
    categories,
    clients,
    bookings,
    documents,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(equipment.router, prefix="/equipment", tags=["Equipment"])
api_router.include_router(categories.router, prefix="/categories", tags=["Categories"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"]) 