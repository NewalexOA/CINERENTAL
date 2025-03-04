"""API router module."""

from fastapi import APIRouter

from backend.api.v1.endpoints import (
    auth,
    barcode,
    bookings,
    categories,
    clients,
    documents,
    equipment,
    health,
    subcategory_prefix,
)

api_router = APIRouter()

api_router.include_router(health.health_router, prefix='/health', tags=['Health'])
api_router.include_router(auth.auth_router, prefix='/auth', tags=['Authentication'])
api_router.include_router(
    equipment.equipment_router, prefix='/equipment', tags=['Equipment']
)
api_router.include_router(
    categories.categories_router, prefix='/categories', tags=['Categories']
)
api_router.include_router(clients.clients_router, prefix='/clients', tags=['Clients'])
api_router.include_router(
    documents.documents_router, prefix='/documents', tags=['Documents']
)
api_router.include_router(
    bookings.bookings_router, prefix='/bookings', tags=['Bookings']
)
api_router.include_router(
    subcategory_prefix.subcategory_prefix_router,
    prefix='/subcategory-prefixes',
    tags=['Subcategory Prefixes'],
)
api_router.include_router(barcode.barcode_router, prefix='/barcodes', tags=['Barcodes'])
