"""Booking operations for project service.

This module contains methods for managing project bookings.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants.log_messages import (
    BookingLogMessages,
    ErrorLogMessages,
    ProjectLogMessages,
)
from backend.core.timezone_utils import ensure_timezone_aware, normalize_project_period
from backend.exceptions import NotFoundError, ValidationError
from backend.exceptions.messages import ProjectErrorMessages
from backend.models import Project
from backend.repositories import BookingRepository, ProjectRepository
from backend.services.booking import BookingService
from backend.services.project.operations.crud_operations import CrudOperations


class BookingOperations:
    """Class for handling project booking operations."""

    def __init__(self, db_session: AsyncSession) -> None:
        """Initialize booking operations.

        Args:
            db_session: Database session
        """
        self.db_session = db_session
        self.repository = ProjectRepository(db_session)
        self.booking_repository = BookingRepository(db_session)
        self.booking_service = BookingService(db_session)
        self.crud_operations = CrudOperations(db_session)

    async def add_booking_to_project(self, project_id: int, booking_id: int) -> Project:
        """Add booking to project.

        Args:
            project_id: Project ID
            booking_id: Booking ID

        Returns:
            Updated project

        Raises:
            NotFoundError: If project or booking not found
        """
        log = logger.bind(project_id=project_id, booking_id=booking_id)

        try:
            # Check if project exists
            project = await self.repository.get_by_id(project_id)
            if project is None:
                log.warning(ProjectLogMessages.PROJECT_NOT_FOUND, project_id)
                raise NotFoundError(
                    ProjectErrorMessages.PROJECT_NOT_FOUND.format(project_id),
                    details={'project_id': project_id},
                )

            # Check if booking exists
            booking = await self.booking_repository.get(booking_id)
            if booking is None:
                log.warning(BookingLogMessages.BOOKING_NOT_FOUND, booking_id)
                raise NotFoundError(
                    ProjectErrorMessages.BOOKING_NOT_FOUND.format(booking_id),
                    details={'booking_id': booking_id},
                )

            # Update booking with project_id
            booking.project_id = project_id
            await self.db_session.flush()

            # Commit transaction
            await self.db_session.commit()

            log.info(BookingLogMessages.BOOKING_ADDED, booking_id, project_id)

            # Refresh project with bookings
            return await self.crud_operations.get_project(
                project_id, with_bookings=True
            )

        except NotFoundError:
            # Re-raise domain exceptions
            await self.db_session.rollback()
            raise
        except Exception as e:
            # Handle unexpected errors
            await self.db_session.rollback()
            log.error(ErrorLogMessages.CREATE_BOOKING_ERROR, str(e))
            raise

    async def remove_booking_from_project(
        self, project_id: int, booking_id: int
    ) -> Project:
        """Remove booking from project.

        Args:
            project_id: Project ID
            booking_id: Booking ID

        Returns:
            Updated project

        Raises:
            NotFoundError: If project or booking not found
            ValidationError: If booking does not belong to project
        """
        log = logger.bind(project_id=project_id, booking_id=booking_id)

        try:
            # Check if project exists
            project = await self.repository.get_by_id(project_id)
            if project is None:
                log.warning(ProjectLogMessages.PROJECT_NOT_FOUND, project_id)
                raise NotFoundError(
                    ProjectErrorMessages.PROJECT_NOT_FOUND.format(project_id),
                    details={'project_id': project_id},
                )

            # Check if booking exists
            booking = await self.booking_repository.get(booking_id)
            if booking is None:
                log.warning(BookingLogMessages.BOOKING_NOT_FOUND, booking_id)
                raise NotFoundError(
                    ProjectErrorMessages.BOOKING_NOT_FOUND.format(booking_id),
                    details={'booking_id': booking_id},
                )

            # Check if booking belongs to project
            if booking.project_id != project_id:
                log.warning(
                    BookingLogMessages.BOOKING_NOT_IN_PROJECT,
                    booking_id,
                    project_id,
                    booking.project_id,
                )
                error_msg = ProjectErrorMessages.BOOKING_NOT_IN_PROJECT.format(
                    booking_id, project_id
                )
                raise ValidationError(
                    error_msg,
                    details={
                        'booking_id': booking_id,
                        'project_id': project_id,
                        'actual_project_id': booking.project_id,
                    },
                )

            # Update booking to remove project_id
            booking.project_id = None
            await self.db_session.flush()

            # Commit transaction
            await self.db_session.commit()

            log.info(BookingLogMessages.BOOKING_REMOVED, booking_id, project_id)

            # Refresh project with bookings
            return await self.crud_operations.get_project(
                project_id, with_bookings=True
            )

        except (NotFoundError, ValidationError):
            # Re-raise domain exceptions
            await self.db_session.rollback()
            raise
        except Exception as e:
            # Handle unexpected errors
            await self.db_session.rollback()
            log.error(ErrorLogMessages.CREATE_BOOKING_ERROR, str(e))
            raise

    async def create_project_with_bookings(
        self,
        name: str,
        client_id: int,
        start_date: datetime,
        end_date: datetime,
        bookings: List[Dict[str, Any]],
        description: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Project:
        """Create new project with bookings.

        This method creates a project and associated bookings in a single transaction.
        If the project creation succeeds but some bookings fail, the transaction will
        still be committed and the method will return the project with the successfully
        created bookings.

        Args:
            name: Project name
            client_id: Client ID
            start_date: Start date of project
            end_date: End date of project
            bookings: List of booking data (equipment_id, start_date, end_date)
            description: Project description
            notes: Additional notes

        Returns:
            Created project with bookings

        Raises:
            ValidationError: If validation fails
            NotFoundError: If client or equipment not found
            DateError: If date validation fails
        """
        log = logger.bind(
            client_id=client_id,
            bookings_count=len(bookings),
            start_date=start_date,
            end_date=end_date,
        )

        try:
            log.info(BookingLogMessages.CREATING_WITH_BOOKINGS, len(bookings))

            # Normalize project period boundaries and tz
            start_date, end_date = normalize_project_period(start_date, end_date)
            start_date = ensure_timezone_aware(start_date)
            end_date = ensure_timezone_aware(end_date)

            # Create the project first
            project = await self.crud_operations.create_project(
                name=name,
                client_id=client_id,
                start_date=start_date,
                end_date=end_date,
                description=description,
                notes=notes,
            )

            created_bookings = []
            failed_bookings = []

            # Create bookings for each piece of equipment
            for booking_data in bookings:
                equipment_id = booking_data.get('equipment_id')
                booking_start = booking_data.get('start_date')
                booking_end = booking_data.get('end_date')

                if not all([equipment_id, booking_start, booking_end]):
                    log.warning('Incomplete booking data: {}', booking_data)
                    failed_bookings.append(
                        {
                            'data': booking_data,
                            'reason': ProjectErrorMessages.INCOMPLETE_BOOKING_DATA,
                        }
                    )
                    continue

                try:
                    # Validate and convert types
                    try:
                        equipment_id_str = str(equipment_id)
                        equipment_id_int = int(equipment_id_str)
                    except (ValueError, TypeError):
                        log.warning('Invalid equipment ID: {}', equipment_id)
                        failed_bookings.append(
                            {
                                'data': booking_data,
                                'reason': (
                                    ProjectErrorMessages.INVALID_EQUIPMENT_ID.format(
                                        equipment_id
                                    )
                                ),
                            }
                        )
                        continue

                    if not isinstance(booking_start, datetime):
                        log.warning('Invalid start date type: {}', booking_start)
                        failed_bookings.append(
                            {
                                'data': booking_data,
                                'reason': (
                                    ProjectErrorMessages.INVALID_DATE_TYPE.format(
                                        booking_start
                                    )
                                ),
                            }
                        )
                        continue

                    if not isinstance(booking_end, datetime):
                        log.warning('Invalid end date type: {}', booking_end)
                        failed_bookings.append(
                            {
                                'data': booking_data,
                                'reason': (
                                    ProjectErrorMessages.INVALID_DATE_TYPE.format(
                                        booking_end
                                    )
                                ),
                            }
                        )
                        continue

                    # Normalize only if end is 00:00 (date-only);
                    # otherwise keep explicit times
                    if (
                        isinstance(booking_end, datetime)
                        and booking_end.hour == 0
                        and booking_end.minute == 0
                        and booking_end.second == 0
                        and booking_end.microsecond == 0
                    ):
                        booking_start, booking_end = normalize_project_period(
                            booking_start, booking_end
                        )
                    # Ensure tz-aware (assume Moscow for naive)
                    booking_start = ensure_timezone_aware(booking_start)
                    booking_end = ensure_timezone_aware(booking_end)

                    # Create booking with verified data
                    booking = await self.booking_service.create_booking(
                        client_id=client_id,
                        equipment_id=equipment_id_int,
                        start_date=booking_start,
                        end_date=booking_end,
                        total_amount=0,
                        deposit_amount=0,
                        quantity=booking_data.get('quantity', 1),
                        notes=None,
                    )

                    # Link booking to project
                    booking.project_id = project.id
                    await self.db_session.flush()

                    created_bookings.append(booking)

                    log.info(
                        BookingLogMessages.BOOKING_CREATED, equipment_id, project.id
                    )
                except Exception as e:
                    log.error(
                        'Failed to create booking for equipment {}: {}',
                        equipment_id,
                        str(e),
                    )
                    failed_bookings.append(
                        {
                            'data': booking_data,
                            'reason': (
                                ProjectErrorMessages.BOOKING_CREATION_FAILED.format(
                                    equipment_id, str(e)
                                )
                            ),
                        }
                    )

            if not created_bookings and bookings:
                log.warning(
                    BookingLogMessages.NO_BOOKINGS_CREATED, project.id, len(bookings)
                )
                # Log that all booking attempts failed
                log.info(
                    'Project {} has no bookings: all {} booking attempts failed',
                    project.id,
                    len(bookings),
                )

            # Log the results of the operation
            log.info(
                BookingLogMessages.BOOKING_RESULT,
                project.id,
                len(created_bookings),
                len(failed_bookings),
            )

            # Commit the transaction
            await self.db_session.commit()

            # Update project with loaded bookings
            return await self.crud_operations.get_project(
                project.id, with_bookings=True
            )

        except Exception as e:
            # In case of an error, rollback the transaction
            await self.db_session.rollback()
            log.error(ErrorLogMessages.CREATE_PROJECT_ERROR, str(e))
            raise
