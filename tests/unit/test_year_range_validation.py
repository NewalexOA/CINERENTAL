"""Unit tests for year-range validation on project and booking schemas.

Regression: year validators must reject out-of-range input on create/update
schemas, but must NOT run on response schemas (which hydrate from ORM data
that may contain legacy year-0026 rows from before the validation existed).
"""

from datetime import datetime
from decimal import Decimal
from typing import Any

import pytest
from pydantic import BaseModel, ValidationError

from backend.schemas.booking import (
    BookingCreate,
    BookingResponse,
    BookingUpdate,
    BookingWithDetails,
)
from backend.schemas.project import (
    BookingCreateForProject,
    ProjectCreate,
    ProjectCreateWithBookings,
    ProjectResponse,
    ProjectUpdate,
    ProjectWithBookings,
)

# Legacy year 0026 — what the original bug produced before the display-format fix.
BAD_YEAR = datetime(26, 4, 19, 10, 0, 0)
GOOD_START = datetime(2026, 4, 19, 10, 0, 0)
GOOD_END = datetime(2026, 4, 25, 18, 0, 0)


class TestResponseSchemasTolerateLegacyBadYear:
    """Response schemas must hydrate legacy bad-year rows without raising."""

    def test_project_response_accepts_year_0026(self) -> None:
        """Verify ProjectResponse hydrates legacy year-0026 data."""
        model = ProjectResponse.model_validate(
            {
                'id': 1,
                'name': 'Legacy project',
                'client_id': 1,
                'start_date': BAD_YEAR,
                'end_date': BAD_YEAR,
                'status': 'DRAFT',
                'payment_status': 'UNPAID',
                'created_at': GOOD_START,
                'updated_at': GOOD_START,
                'client_name': 'Test Client',
            }
        )
        assert model.start_date.year == 26

    def test_project_with_bookings_accepts_year_0026(self) -> None:
        """Verify ProjectWithBookings hydrates legacy year-0026 data."""
        model = ProjectWithBookings.model_validate(
            {
                'id': 1,
                'name': 'Legacy project',
                'client_id': 1,
                'start_date': BAD_YEAR,
                'end_date': BAD_YEAR,
                'status': 'DRAFT',
                'payment_status': 'UNPAID',
                'created_at': GOOD_START,
                'updated_at': GOOD_START,
                'client_name': 'Test Client',
                'bookings': [],
            }
        )
        assert model.start_date.year == 26

    def test_booking_response_accepts_year_0026(self) -> None:
        """Verify BookingResponse hydrates legacy year-0026 data."""
        model = BookingResponse.model_validate(
            {
                'id': 1,
                'equipment_id': 1,
                'client_id': 1,
                'start_date': BAD_YEAR,
                'end_date': BAD_YEAR,
                'total_amount': Decimal('100'),
                'quantity': 1,
                'booking_status': 'PENDING',
                'payment_status': 'PENDING',
                'created_at': GOOD_START,
                'updated_at': GOOD_START,
                'equipment_name': 'Camera',
                'client_name': 'Test Client',
            }
        )
        assert model.start_date.year == 26

    def test_booking_with_details_accepts_year_0026(self) -> None:
        """Verify BookingWithDetails hydrates legacy year-0026 data."""
        model = BookingWithDetails.model_validate(
            {
                'id': 1,
                'equipment_id': 1,
                'client_id': 1,
                'start_date': BAD_YEAR,
                'end_date': BAD_YEAR,
                'total_amount': Decimal('100'),
                'quantity': 1,
                'booking_status': 'PENDING',
                'payment_status': 'PENDING',
                'created_at': GOOD_START,
                'updated_at': GOOD_START,
            }
        )
        assert model.start_date.year == 26


class TestInputSchemasRejectBadYear:
    """Create/update schemas must reject out-of-range years at validation."""

    @pytest.mark.parametrize(
        'schema_cls, payload_extras',
        [
            (
                ProjectCreate,
                {
                    'name': 'Test',
                    'client_id': 1,
                    'status': 'DRAFT',
                    'payment_status': 'UNPAID',
                },
            ),
            (
                ProjectCreateWithBookings,
                {
                    'name': 'Test',
                    'client_id': 1,
                    'status': 'DRAFT',
                    'payment_status': 'UNPAID',
                    'bookings': [],
                },
            ),
            (ProjectUpdate, {}),
            (BookingCreateForProject, {'equipment_id': 1, 'quantity': 1}),
        ],
    )
    def test_rejects_year_0026(
        self,
        schema_cls: type[BaseModel],
        payload_extras: dict[str, Any],
    ) -> None:
        """Parameterized: each input schema rejects year 0026."""
        with pytest.raises(ValidationError) as exc:
            schema_cls.model_validate(
                {'start_date': BAD_YEAR, 'end_date': BAD_YEAR, **payload_extras}
            )
        assert '2020-2100' in str(exc.value)

    def test_booking_create_rejects_year_0026(self) -> None:
        """Verify BookingCreate POST body rejects year 0026."""
        with pytest.raises(ValidationError) as exc:
            BookingCreate.model_validate(
                {
                    'equipment_id': 1,
                    'client_id': 1,
                    'start_date': BAD_YEAR,
                    'end_date': BAD_YEAR,
                    'total_amount': Decimal('100'),
                    'quantity': 1,
                }
            )
        assert '2020-2100' in str(exc.value)

    def test_booking_update_rejects_year_0026(self) -> None:
        """Verify BookingUpdate PATCH body rejects year 0026."""
        with pytest.raises(ValidationError) as exc:
            BookingUpdate.model_validate({'start_date': BAD_YEAR, 'end_date': BAD_YEAR})
        assert '2020-2100' in str(exc.value)

    def test_booking_update_accepts_none_for_unset_dates(self) -> None:
        """Verify BookingUpdate passes None dates through."""
        model = BookingUpdate.model_validate({'quantity': 2})
        assert model.start_date is None
        assert model.end_date is None

    def test_booking_update_rejects_single_bad_date(self) -> None:
        """Asymmetric PATCH: only start_date set, with bad year."""
        with pytest.raises(ValidationError) as exc:
            BookingUpdate.model_validate({'start_date': BAD_YEAR})
        assert '2020-2100' in str(exc.value)

    def test_project_create_with_bookings_rejects_nested_bad_year(self) -> None:
        """Nested validation: outer dates valid, inner booking date bad."""
        with pytest.raises(ValidationError) as exc:
            ProjectCreateWithBookings.model_validate(
                {
                    'name': 'Good outer, bad nested',
                    'client_id': 1,
                    'start_date': GOOD_START,
                    'end_date': GOOD_END,
                    'status': 'DRAFT',
                    'payment_status': 'UNPAID',
                    'bookings': [
                        {
                            'equipment_id': 1,
                            'quantity': 1,
                            'start_date': BAD_YEAR,
                            'end_date': BAD_YEAR,
                        }
                    ],
                }
            )
        assert '2020-2100' in str(exc.value)


class TestInputSchemasAcceptValidYears:
    """Create/update schemas must accept years within 2020-2100."""

    def test_project_create_accepts_2026(self) -> None:
        """Verify ProjectCreate accepts valid year 2026."""
        model = ProjectCreate.model_validate(
            {
                'name': 'Valid project',
                'client_id': 1,
                'start_date': GOOD_START,
                'end_date': GOOD_END,
                'status': 'DRAFT',
                'payment_status': 'UNPAID',
            }
        )
        assert model.start_date.year == 2026

    def test_booking_create_accepts_2100_edge(self) -> None:
        """Year 2100 upper boundary is accepted."""
        model = BookingCreate.model_validate(
            {
                'equipment_id': 1,
                'client_id': 1,
                'start_date': datetime(2100, 1, 1),
                'end_date': datetime(2100, 12, 31),
                'total_amount': Decimal('100'),
                'quantity': 1,
            }
        )
        assert model.end_date.year == 2100

    def test_project_create_rejects_2101(self) -> None:
        """Year 2101 is just above the upper boundary and is rejected."""
        with pytest.raises(ValidationError):
            ProjectCreate.model_validate(
                {
                    'name': 'Too far future',
                    'client_id': 1,
                    'start_date': datetime(2101, 1, 1),
                    'end_date': datetime(2101, 12, 31),
                    'status': 'DRAFT',
                    'payment_status': 'UNPAID',
                }
            )

    def test_project_create_rejects_2019(self) -> None:
        """Year 2019 is just below the lower boundary and is rejected."""
        with pytest.raises(ValidationError):
            ProjectCreate.model_validate(
                {
                    'name': 'Too far past',
                    'client_id': 1,
                    'start_date': datetime(2019, 12, 31),
                    'end_date': datetime(2020, 1, 1),
                    'status': 'DRAFT',
                    'payment_status': 'UNPAID',
                }
            )
