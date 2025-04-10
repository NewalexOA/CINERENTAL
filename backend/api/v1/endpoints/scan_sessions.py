"""Scan Sessions endpoints module.

This module implements API endpoints for managing scan sessions.
It provides routes for creating, retrieving, updating, and deleting scan sessions,
along with adding and removing equipment from sessions.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.v1.decorators import typed_delete, typed_get, typed_post, typed_put
from backend.core.database import get_db
from backend.exceptions import NotFoundError
from backend.repositories import ScanSessionRepository
from backend.schemas.scan_session import (
    ScanSessionCreate,
    ScanSessionResponse,
    ScanSessionUpdate,
)
from backend.services import ScanSessionService

scan_sessions_router = APIRouter()


def get_repository(db: AsyncSession = Depends(get_db)) -> ScanSessionRepository:
    """Get scan session repository.

    Args:
        db: Database session

    Returns:
        ScanSessionRepository: Repository instance
    """
    return ScanSessionRepository(db)


def get_service(
    repository: ScanSessionRepository = Depends(get_repository),
) -> ScanSessionService:
    """Get scan session service.

    Args:
        repository: Repository instance

    Returns:
        ScanSessionService: Service instance
    """
    return ScanSessionService(repository)


@typed_post(
    scan_sessions_router,
    '/',
    response_model=ScanSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary='Create new scan session',
)
async def create_scan_session(
    scan_session: ScanSessionCreate,
    service: ScanSessionService = Depends(get_service),
) -> ScanSessionResponse:
    """Create a new scan session.

    Args:
        scan_session: Scan session data
        service: Scan session service

    Returns:
        ScanSessionResponse: Created scan session
    """
    items = []
    if scan_session.items:
        items = [item.model_dump() for item in scan_session.items]

    result = await service.create_session(
        name=scan_session.name,
        items=items,
        user_id=None,  # Make user_id always None for demo purposes
    )
    return ScanSessionResponse.model_validate(result, from_attributes=True)


@typed_get(
    scan_sessions_router,
    '/',
    response_model=List[ScanSessionResponse],
    summary='Get all scan sessions',
)
async def get_scan_sessions(
    user_id: Optional[int] = None,
    service: ScanSessionService = Depends(get_service),
) -> List[ScanSessionResponse]:
    """Get a list of scan sessions.

    Args:
        user_id: Optional user ID to filter sessions
        service: Scan session service

    Returns:
        List[ScanSessionResponse]: List of scan sessions
    """
    if user_id:
        result = await service.get_user_sessions(user_id)
    else:
        # We'll use an empty placeholder since the original service doesn't support
        # getting all sessions without a user
        result = []

    return [
        ScanSessionResponse.model_validate(session, from_attributes=True)
        for session in result
    ]


@typed_get(
    scan_sessions_router,
    '/{session_id}',
    response_model=ScanSessionResponse,
    summary='Get scan session by ID',
)
async def get_scan_session(
    session_id: int,
    service: ScanSessionService = Depends(get_service),
) -> ScanSessionResponse:
    """Get a scan session by ID.

    Args:
        session_id: Scan session ID
        service: Scan session service

    Returns:
        ScanSessionResponse: Scan session

    Raises:
        NotFoundError: If scan session not found
    """
    session = await service.get_session(session_id)
    if not session:
        raise NotFoundError(f'Scan session with ID {session_id} not found')
    return ScanSessionResponse.model_validate(session, from_attributes=True)


@typed_put(
    scan_sessions_router,
    '/{session_id}',
    response_model=ScanSessionResponse,
    summary='Update scan session',
)
async def update_scan_session(
    session_id: int,
    session_update: ScanSessionUpdate,
    service: ScanSessionService = Depends(get_service),
) -> ScanSessionResponse:
    """Update a scan session.

    Args:
        session_id: Scan session ID
        session_update: Updated scan session data
        service: Scan session service

    Returns:
        ScanSessionResponse: Updated scan session

    Raises:
        NotFoundError: If scan session not found
    """
    items = None
    if session_update.items is not None:
        items = [item.model_dump() for item in session_update.items]

    session = await service.update_session(
        session_id=session_id, name=session_update.name, items=items
    )
    if not session:
        raise NotFoundError(f'Scan session with ID {session_id} not found')
    return ScanSessionResponse.model_validate(session, from_attributes=True)


@typed_delete(
    scan_sessions_router,
    '/{session_id}',
    status_code=status.HTTP_204_NO_CONTENT,
    summary='Delete scan session',
)
async def delete_scan_session(
    session_id: int,
    service: ScanSessionService = Depends(get_service),
) -> None:
    """Delete a scan session.

    Args:
        session_id: Scan session ID
        service: Scan session service

    Raises:
        NotFoundError: If scan session not found
    """
    result = await service.delete_session(session_id)
    if not result:
        raise NotFoundError(f'Scan session with ID {session_id} not found')


@typed_post(
    scan_sessions_router,
    '/clean-expired',
    status_code=status.HTTP_200_OK,
    summary='Clean expired scan sessions',
)
async def clean_expired_sessions_endpoint(
    service: ScanSessionService = Depends(get_service),
) -> dict:
    """Clean (soft delete) all expired scan sessions.

    Returns:
        dict: Dictionary containing the number of cleaned sessions.
    """
    cleaned_count = await service.clean_expired_sessions()
    return {'cleaned_count': cleaned_count}
