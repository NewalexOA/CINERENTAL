"""Scan sessions endpoints module.

This module provides API endpoints for scan sessions management.
"""

from typing import List

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


def get_scan_session_repository(
    db: AsyncSession = Depends(get_db),
) -> ScanSessionRepository:
    """Get scan session repository.

    Args:
        db: Database session

    Returns:
        Scan session repository
    """
    return ScanSessionRepository(db)


def get_scan_session_service(
    repository: ScanSessionRepository = Depends(get_scan_session_repository),
) -> ScanSessionService:
    """Get scan session service.

    Args:
        repository: Scan session repository

    Returns:
        Scan session service
    """
    return ScanSessionService(repository)


@typed_post(
    scan_sessions_router,
    '/',
    response_model=ScanSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary='Создание новой сессии сканирования',
)
async def create_scan_session(
    session_data: ScanSessionCreate,
    service: ScanSessionService = Depends(get_scan_session_service),
) -> ScanSessionResponse:
    """Create new scan session.

    Args:
        session_data: Session data
        service: Scan session service

    Returns:
        Created scan session
    """
    session = await service.create_session(
        name=session_data.name,
        items=[item.model_dump() for item in session_data.items],
        user_id=session_data.user_id,
    )
    # Convert model to response schema
    return ScanSessionResponse.model_validate(session, from_attributes=True)


@typed_get(
    scan_sessions_router,
    '/{session_id}',
    response_model=ScanSessionResponse,
    summary='Получение сессии сканирования по ID',
)
async def get_scan_session(
    session_id: int,
    service: ScanSessionService = Depends(get_scan_session_service),
) -> ScanSessionResponse:
    """Get scan session by ID.

    Args:
        session_id: Scan session ID
        service: Scan session service

    Returns:
        Scan session

    Raises:
        NotFoundError: If session not found
    """
    session = await service.get_session(session_id)
    if not session:
        raise NotFoundError(message='Сессия сканирования не найдена')
    return ScanSessionResponse.model_validate(session, from_attributes=True)


@typed_get(
    scan_sessions_router,
    '/user/{user_id}',
    response_model=List[ScanSessionResponse],
    summary='Получение всех сессий сканирования пользователя',
)
async def get_user_scan_sessions(
    user_id: int,
    service: ScanSessionService = Depends(get_scan_session_service),
) -> List[ScanSessionResponse]:
    """Get all scan sessions for a user.

    Args:
        user_id: User ID
        service: Scan session service

    Returns:
        List of scan sessions
    """
    sessions = await service.get_user_sessions(user_id)
    return [
        ScanSessionResponse.model_validate(session, from_attributes=True)
        for session in sessions
    ]


@typed_put(
    scan_sessions_router,
    '/{session_id}',
    response_model=ScanSessionResponse,
    summary='Обновление сессии сканирования',
)
async def update_scan_session(
    session_id: int,
    session_data: ScanSessionUpdate,
    service: ScanSessionService = Depends(get_scan_session_service),
) -> ScanSessionResponse:
    """Update scan session.

    Args:
        session_id: Scan session ID
        session_data: Update data
        service: Scan session service

    Returns:
        Updated scan session

    Raises:
        NotFoundError: If session not found
    """
    items = None
    if session_data.items is not None:
        items = [item.model_dump() for item in session_data.items]

    session = await service.update_session(
        session_id=session_id,
        name=session_data.name,
        items=items,
    )
    if not session:
        raise NotFoundError(message='Сессия сканирования не найдена')
    return ScanSessionResponse.model_validate(session, from_attributes=True)


@typed_delete(
    scan_sessions_router,
    '/{session_id}',
    status_code=status.HTTP_204_NO_CONTENT,
    summary='Удаление сессии сканирования',
)
async def delete_scan_session(
    session_id: int,
    service: ScanSessionService = Depends(get_scan_session_service),
) -> None:
    """Delete scan session.

    Args:
        session_id: Scan session ID
        service: Scan session service

    Raises:
        NotFoundError: If session not found
    """
    result = await service.delete_session(session_id)
    if not result:
        raise NotFoundError(message='Сессия сканирования не найдена')
