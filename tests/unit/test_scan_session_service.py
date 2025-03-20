"""Unit tests for scan session service."""

from datetime import datetime, timezone
from typing import Any

import pytest

from backend.models import ScanSession
from backend.services import ScanSessionService

pytestmark = pytest.mark.asyncio


async def test_create_session(
    scan_session_service: ScanSessionService,
    test_user: Any,
) -> None:
    """Test creating a new scan session."""
    # Create data for test
    user_id = test_user.id
    name = 'Test Session'
    items = [{'equipment_id': 1, 'barcode': 'TEST123', 'name': 'Test Equipment'}]

    session = await scan_session_service.create_session(
        name=name,
        user_id=user_id,
        items=items,
    )

    assert session is not None
    assert session.name == name
    assert session.user_id == user_id
    assert session.items == items
    assert session.expires_at > datetime.now(timezone.utc)


async def test_get_session(
    scan_session_service: ScanSessionService,
    test_scan_session: ScanSession,
) -> None:
    """Test getting a scan session by ID."""
    session = await scan_session_service.get_session(test_scan_session.id)

    assert session is not None
    assert session.id == test_scan_session.id
    assert session.name == test_scan_session.name
    assert session.user_id == test_scan_session.user_id


async def test_get_nonexistent_session(
    scan_session_service: ScanSessionService,
) -> None:
    """Test getting a non-existent scan session."""
    session = await scan_session_service.get_session(999)

    assert session is None


async def test_get_user_sessions(
    scan_session_service: ScanSessionService,
    test_scan_session: ScanSession,
) -> None:
    """Test getting all scan sessions for a user."""
    # Ensuring user_id is not None for the type checker
    user_id = test_scan_session.user_id
    assert user_id is not None

    sessions = await scan_session_service.get_user_sessions(user_id)

    assert len(sessions) >= 1

    # Check if our test session is in the returned sessions
    found = False
    for session in sessions:
        if session.id == test_scan_session.id:
            found = True
            break
    assert found


async def test_update_session(
    scan_session_service: ScanSessionService,
    test_scan_session: ScanSession,
) -> None:
    """Test updating a scan session."""
    new_name = 'Updated Test Session'
    new_items = [
        {'equipment_id': 2, 'barcode': 'TEST456', 'name': 'Another Test Equipment'},
    ]

    updated_session = await scan_session_service.update_session(
        session_id=test_scan_session.id,
        name=new_name,
        items=new_items,
    )

    assert updated_session is not None
    assert updated_session.id == test_scan_session.id
    assert updated_session.name == new_name
    assert updated_session.items == new_items


async def test_update_nonexistent_session(
    scan_session_service: ScanSessionService,
) -> None:
    """Test updating a non-existent scan session."""
    updated_session = await scan_session_service.update_session(
        session_id=999,
        name='Updated Test Session',
    )

    assert updated_session is None


async def test_delete_session(
    scan_session_service: ScanSessionService,
    scan_session_repository: Any,
    test_scan_session: ScanSession,
) -> None:
    """Test deleting a scan session."""
    result = await scan_session_service.delete_session(test_scan_session.id)

    assert result is True

    session = await scan_session_repository.get(
        test_scan_session.id, include_deleted=True
    )
    assert session is not None
    assert session.deleted_at is not None


async def test_delete_nonexistent_session(
    scan_session_service: ScanSessionService,
) -> None:
    """Test deleting a non-existent scan session."""
    result = await scan_session_service.delete_session(999)

    assert result is False


async def test_clean_expired_sessions(
    scan_session_service: ScanSessionService,
    scan_session_repository: Any,
    db_session: Any,
    test_user: Any,
) -> None:
    """Test cleaning expired scan sessions."""
    # Create an expired session
    expired_session = ScanSession.create_with_expiration(
        name='Expired Session',
        user_id=test_user.id,
        items=[],
        days=-1,  # Make it expire yesterday
    )

    db_session.add(expired_session)
    await db_session.commit()
    await db_session.refresh(expired_session)

    # Create a valid session
    valid_session = ScanSession.create_with_expiration(
        name='Valid Session',
        user_id=test_user.id,
        items=[],
        days=7,
    )

    db_session.add(valid_session)
    await db_session.commit()
    await db_session.refresh(valid_session)

    # Clean expired sessions
    cleaned_count = await scan_session_service.clean_expired_sessions()

    # At least one session should be cleaned (the expired one)
    assert cleaned_count >= 1

    # Check that the expired session is deleted (используем include_deleted=True)
    expired = await scan_session_repository.get(
        expired_session.id, include_deleted=True
    )
    assert expired is not None
    assert expired.deleted_at is not None

    # Check that the valid session is not deleted
    valid = await scan_session_repository.get(valid_session.id)
    assert valid is not None
    assert valid.deleted_at is None

    # Cleanup
    await db_session.delete(expired_session)
    await db_session.delete(valid_session)
    await db_session.commit()
