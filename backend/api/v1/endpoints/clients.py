"""Clients endpoints module.

This module implements API endpoints for managing rental service clients.
It provides routes for client registration, profile management,
and accessing rental history and related documents.
"""

from typing import Annotated, List, Optional, cast

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.decorators import (
    typed_delete,
    typed_get,
    typed_patch,
    typed_post,
    typed_put,
)
from backend.core.database import get_db
from backend.exceptions import (
    BusinessError,
    ConflictError,
    NotFoundError,
    ValidationError,
)
from backend.models import BookingStatus
from backend.schemas import BookingResponse, ClientCreate, ClientResponse, ClientUpdate
from backend.services import ClientService

clients_router: APIRouter = APIRouter()


@typed_get(
    clients_router,
    '/',
    response_model=List[ClientResponse],
)
async def get_clients(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: Optional[int] = Query(0, ge=0, description='Number of clients to skip'),
    limit: Optional[int] = Query(
        100, ge=1, le=1000, description='Maximum number of clients to return'
    ),
    query: Optional[str] = Query(
        None, description='Search query for filtering clients by name, email or phone'
    ),
    sort_by: Optional[str] = Query(
        'name',  # Default sort by name
        description='Field to sort by (e.g., name, created_at, bookings_count)',
    ),
    sort_order: Optional[str] = Query(
        'asc', description='Sort order (asc or desc)'  # Default sort order ascending
    ),
) -> List[ClientResponse]:
    """Get list of clients with optional filtering and sorting.

    Args:
        db: Database session
        skip: Number of clients to skip (for pagination)
        limit: Maximum number of clients to return (for pagination)
        query: Search query for filtering clients
        sort_by: Field to sort clients by
        sort_order: Sort order (asc/desc)

    Returns:
        List of clients matching the criteria
    """
    try:
        service = ClientService(db)

        # Pass sorting parameters to service methods
        if query:
            clients = await service.search_clients(
                query, sort_by=sort_by, sort_order=sort_order
            )
        else:
            clients = await service.get_clients(sort_by=sort_by, sort_order=sort_order)

        # Apply pagination manually (consider moving pagination to service/repo)
        skip_val = skip or 0
        limit_val = limit or 100
        # Assuming service always returns a list due to type hints
        # Remove the isinstance check causing unreachable code warning
        # if not isinstance(clients, list):
        #    logger.error(f"Service returned non-list type: {type(clients)}")
        #    clients = []

        return cast(List[ClientResponse], clients[skip_val : skip_val + limit_val])
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_get(
    clients_router,
    '/{client_id}/',
    response_model=ClientResponse,
)
async def get_client(
    client_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ClientResponse:
    """Get client by ID.

    Args:
        client_id: Client ID
        db: Database session

    Returns:
        Client details

    Raises:
        HTTPException: If client not found
    """
    try:
        service = ClientService(db)
        client = await service.get_client(client_id)

        if not client:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f'Client with ID {client_id} not found',
            )

        return cast(ClientResponse, client)
    except NotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_post(
    clients_router,
    '/',
    response_model=ClientResponse,
    status_code=http_status.HTTP_201_CREATED,
)
async def create_client(
    client: ClientCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ClientResponse:
    """Create a new client.

    Args:
        client: Client data
        db: Database session

    Returns:
        Created client

    Raises:
        HTTPException: If validation fails or client with same email/phone
        already exists
    """
    try:
        service = ClientService(db)
        created_client = await service.create_client(
            name=client.name,
            email=client.email,
            phone=client.phone,
            company=getattr(client, 'company', None),
            notes=getattr(client, 'notes', None),
        )
        return cast(ClientResponse, created_client)
    except ConflictError as e:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from e
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_put(
    clients_router,
    '/{client_id}/',
    response_model=ClientResponse,
)
async def update_client(
    client_id: int,
    client: ClientUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ClientResponse:
    """Update client details.

    Args:
        client_id: Client ID
        client: Updated client data
        db: Database session

    Returns:
        Updated client

    Raises:
        HTTPException: If client not found or validation fails
    """
    try:
        service = ClientService(db)
        updated_client = await service.update_client(
            client_id=client_id,
            name=client.name,
            email=client.email,
            phone=client.phone,
            company=getattr(client, 'company', None),
            notes=getattr(client, 'notes', None),
        )
        return cast(ClientResponse, updated_client)
    except NotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except ConflictError as e:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from e
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_patch(
    clients_router,
    '/{client_id}/',
    response_model=ClientResponse,
)
async def patch_client(
    client_id: int,
    client: ClientUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ClientResponse:
    """Partially update client details.

    Only updates fields that were explicitly provided in the request.
    Uses model_dump(exclude_unset=True) for true PATCH semantics.

    Args:
        client_id: Client ID
        client: Partial client data to update
        db: Database session

    Returns:
        Updated client

    Raises:
        HTTPException: If client not found or validation fails
    """
    try:
        service = ClientService(db)
        # Only update fields that were explicitly set in the request
        # (true PATCH semantics)
        update_data = client.model_dump(exclude_unset=True)
        updated_client = await service.update_client(
            client_id=client_id,
            name=update_data.get('name'),
            email=update_data.get('email'),
            phone=update_data.get('phone'),
            company=update_data.get('company'),
            notes=update_data.get('notes'),
        )
        return cast(ClientResponse, updated_client)
    except NotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except ValidationError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except ConflictError as e:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from e
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_delete(
    clients_router,
    '/{client_id}/',
    status_code=http_status.HTTP_204_NO_CONTENT,
)
async def delete_client(
    client_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Delete client.

    Args:
        client_id: Client ID
        db: Database session

    Raises:
        HTTPException: If client not found or has active bookings
    """
    try:
        service = ClientService(db)

        # Check if client exists before deletion
        client = await service.get_client(client_id)
        if not client:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f'Client with ID {client_id} not found',
            )

        await service.delete_client(client_id)
    except NotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except ValueError as e:
        if 'active bookings' in str(e):
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=str(e),
            ) from e
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@typed_get(
    clients_router,
    '/{client_id}/bookings/',
    response_model=List[BookingResponse],
)
async def get_client_bookings(
    client_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: Optional[int] = Query(0, ge=0, description='Number of bookings to skip'),
    limit: Optional[int] = Query(
        100, ge=1, le=1000, description='Maximum number of bookings to return'
    ),
    status: Optional[str] = Query(
        None, description='Filter bookings by status (comma-separated list of statuses)'
    ),
) -> List[BookingResponse]:
    """Get client's booking history.

    Args:
        client_id: Client ID
        db: Database session
        skip: Number of bookings to skip (for pagination)
        limit: Maximum number of bookings to return (for pagination)
        status: Comma-separated list of booking statuses to filter by

    Returns:
        List of client's bookings

    Raises:
        HTTPException: If client not found or invalid status provided
    """
    try:
        client_service = ClientService(db)

        # Check if client exists
        client = await client_service.get_client(client_id)
        if not client:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f'Client with ID {client_id} not found',
            )

        # Parse status filter if provided
        status_filter = None
        if status:
            try:
                status_filter = [BookingStatus[s.strip()] for s in status.split(',')]
            except KeyError as e:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail=f'Invalid booking status: {str(e)}',
                )

        # Get client's bookings with status filter
        bookings = await client_service.get_client_bookings(
            client_id=client_id,
            status_filter=status_filter,
        )

        # Apply pagination manually
        skip_val = skip or 0
        limit_val = limit or 100

        # Convert Booking objects to dictionaries for matching BookingResponse schema
        booking_responses = []
        for booking in bookings[skip_val : skip_val + limit_val]:
            # Create base fields required for BookingResponse schema
            client_name = client.name
            equipment_name = (
                booking.equipment.name
                if booking.equipment
                else f'Equipment {booking.equipment_id}'
            )

            booking_dict = {
                'id': booking.id,
                'equipment_id': booking.equipment_id,
                'client_id': booking.client_id,
                'project_id': booking.project_id,
                'start_date': booking.start_date,
                'end_date': booking.end_date,
                'booking_status': booking.booking_status,
                'payment_status': booking.payment_status,
                'total_amount': booking.total_amount,
                'equipment_name': equipment_name,
                'client_name': client_name,
                'project_name': booking.project.name if booking.project else None,
                'created_at': booking.created_at,
                'updated_at': booking.updated_at,
                'quantity': booking.quantity,
            }
            booking_responses.append(booking_dict)

        return cast(List[BookingResponse], booking_responses)
    except NotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except BusinessError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
