"""Integration tests for scan session cleanup scheduler."""

from datetime import datetime, timedelta
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.scheduler import clean_expired_scan_sessions
from backend.models import ScanSession
from backend.repositories import ScanSessionRepository

pytestmark = pytest.mark.asyncio


async def test_clean_expired_scan_sessions(
    db_session: AsyncSession,
    scan_session_repository: ScanSessionRepository,
    test_user: Any,
) -> None:
    """Test scheduler function that cleans expired scan sessions."""
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

    # Run the scheduler function directly
    await clean_expired_scan_sessions(scan_session_repository)

    # Check that the expired session is deleted
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


async def test_clean_expired_sessions_with_specific_date(
    db_session: AsyncSession,
    scan_session_repository: ScanSessionRepository,
    test_user: Any,
) -> None:
    """Test cleaning expired sessions using a specific date."""
    # Create two sessions that expire at different times
    today = datetime.now()

    # Session that expires in 3 days
    session_1 = ScanSession(
        name='Session 1',
        user_id=test_user.id,
        items=[],
        expires_at=today + timedelta(days=3),
    )

    # Session that expires in 5 days
    session_2 = ScanSession(
        name='Session 2',
        user_id=test_user.id,
        items=[],
        expires_at=today + timedelta(days=5),
    )

    db_session.add(session_1)
    db_session.add(session_2)
    await db_session.commit()
    await db_session.refresh(session_1)
    await db_session.refresh(session_2)

    # Set future date to 4 days from now, which should only make session_1 expired
    future_date = today + timedelta(days=4)

    # Get expired sessions at the future date
    expired_sessions = await scan_session_repository.get_expired(future_date)
    assert len(expired_sessions) == 1
    assert expired_sessions[0].id == session_1.id

    # Clean sessions that are expired at the future date
    cleaned_count = await scan_session_repository.clean_expired(future_date)
    assert cleaned_count == 1

    # Check that session_1 is deleted and session_2 is not
    s1 = await scan_session_repository.get(session_1.id, include_deleted=True)
    assert s1 is not None
    assert s1.deleted_at is not None

    s2 = await scan_session_repository.get(session_2.id)
    assert s2 is not None
    assert s2.deleted_at is None

    # Cleanup
    await db_session.delete(session_1)
    await db_session.delete(session_2)
    await db_session.commit()
