"""Timezone utilities.

This module centralizes timezone handling for the backend to ensure
consistent storage of datetimes. We consider Moscow time (UTC+3)
as the business timezone for rentals and normalize incoming datetimes
accordingly.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

# Moscow timezone (UTC+3)
MOSCOW_TZ = timezone(timedelta(hours=3))


def ensure_timezone_aware(dt: datetime) -> datetime:
    """Ensure datetime is timezone-aware.

    - If ``dt`` has no tzinfo, assume Moscow timezone.
    - If ``dt`` has tzinfo, return as-is.

    Args:
        dt: Datetime to normalize.

    Returns:
        Timezone-aware datetime.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=MOSCOW_TZ)
    return dt


def normalize_project_period(
    start: datetime, end: datetime
) -> tuple[datetime, datetime]:
    """Normalize project/booking period with respect to explicit times.

    Rules:
    - Convert both endpoints to Moscow timezone (if naive, assume MSK).
    - Preserve explicit times sent by the client.
    - If end time equals 00:00:00 (typical for date-only input), default it to 23:59.

    Args:
        start: Start datetime.
        end: End datetime.

    Returns:
        Tuple ``(start_normalized, end_normalized)`` in Moscow timezone.
    """
    start_aware = ensure_timezone_aware(start).astimezone(MOSCOW_TZ)
    end_aware = ensure_timezone_aware(end).astimezone(MOSCOW_TZ)

    # Keep the start time as provided by client (already tz-normalized)
    start_norm = start_aware

    # If the end is exactly midnight (common when only a date is supplied),
    # move it to the end of day to include the whole selected day by default.
    if (
        end_aware.hour == 0
        and end_aware.minute == 0
        and end_aware.second == 0
        and end_aware.microsecond == 0
    ):
        end_norm = end_aware.replace(hour=23, minute=59, second=0, microsecond=0)
    else:
        end_norm = end_aware

    return start_norm, end_norm
