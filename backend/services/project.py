"""Project service module.

This module provides service functionality for project management.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants.log_messages import (
    BookingLogMessages,
    ClientLogMessages,
    ErrorLogMessages,
    ProjectLogMessages,
)
from backend.exceptions import DateError, NotFoundError, ValidationError
from backend.exceptions.messages import DateErrorMessages, ProjectErrorMessages
from backend.models import Project, ProjectStatus
from backend.repositories import BookingRepository, ClientRepository, ProjectRepository
from backend.services.booking import BookingService


class ProjectService:
    """Service for managing projects."""

    def __init__(self, db_session: AsyncSession) -> None:
        """Initialize service.

        Args:
            db_session: Database session
        """
        self.db_session = db_session
        self.repository = ProjectRepository(db_session)
        self.client_repository = ClientRepository(db_session)
        self.booking_repository = BookingRepository(db_session)
        self.booking_service = BookingService(db_session)

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

            # Create the project first
            project = await self.create_project(
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

                    # Create booking with verified data
                    booking = await self.booking_service.create_booking(
                        client_id=client_id,
                        equipment_id=equipment_id_int,
                        start_date=booking_start,
                        end_date=booking_end,
                        total_amount=0,
                        deposit_amount=0,
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
            return await self.get_project(project.id, with_bookings=True)

        except Exception as e:
            # In case of an error, rollback the transaction
            await self.db_session.rollback()
            log.error(ErrorLogMessages.CREATE_PROJECT_ERROR, str(e))
            raise

    async def create_project(
        self,
        name: str,
        client_id: int,
        start_date: datetime,
        end_date: datetime,
        description: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Project:
        """Create new project.

        Args:
            name: Project name
            client_id: Client ID
            start_date: Start date of project
            end_date: End date of project
            description: Project description
            notes: Additional notes

        Returns:
            Created project

        Raises:
            ValidationError: If validation fails
            NotFoundError: If client not found
            DateError: If date validation fails
        """
        log = logger.bind(
            name=name, client_id=client_id, start_date=start_date, end_date=end_date
        )

        try:
            # Validate dates
            if start_date >= end_date:
                raise DateError(
                    DateErrorMessages.INVALID_DATES,
                    start_date=start_date,
                    end_date=end_date,
                )

            # Check if client exists
            client = await self.client_repository.get(client_id)
            if client is None:
                raise NotFoundError(
                    ProjectErrorMessages.CLIENT_NOT_FOUND.format(client_id),
                    details={'client_id': client_id},
                )

            # Create project
            project = Project(
                name=name,
                client_id=client_id,
                start_date=start_date,
                end_date=end_date,
                description=description,
                notes=notes,
                status=ProjectStatus.DRAFT,
            )

            # Save project
            created_project = await self.repository.create(project)

            # Commit transaction
            await self.db_session.commit()

            log.info(
                ProjectLogMessages.PROJECT_CREATED, created_project.id, client.name
            )

            return created_project

        except (ValidationError, NotFoundError, DateError):
            # Re-raise domain exceptions without wrapping
            await self.db_session.rollback()
            raise
        except Exception as e:
            # Rollback in case of error
            await self.db_session.rollback()
            log.error(ErrorLogMessages.CREATE_PROJECT_ERROR, str(e))
            raise

    async def get_project(
        self, project_id: int, with_bookings: bool = False
    ) -> Project:
        """Get project by ID.

        Args:
            project_id: Project ID
            with_bookings: Whether to include bookings

        Returns:
            Project

        Raises:
            NotFoundError: If project not found
        """
        log = logger.bind(project_id=project_id, with_bookings=with_bookings)

        # Get project
        if with_bookings:
            project = await self.repository.get_by_id_with_bookings(project_id)
        else:
            project = await self.repository.get_by_id(project_id)

        # Check if project exists
        if project is None:
            log.warning(ProjectLogMessages.PROJECT_NOT_FOUND, project_id)
            raise NotFoundError(
                ProjectErrorMessages.PROJECT_NOT_FOUND.format(project_id),
                details={'project_id': project_id},
            )

        # Get client name for response
        client = await self.client_repository.get(project.client_id)
        if client is None:
            log.warning('Client not found (ID: {})', project.client_id)
            raise NotFoundError(
                ProjectErrorMessages.CLIENT_NOT_FOUND.format(project.client_id),
                details={'client_id': project.client_id},
            )
        setattr(project, 'client_name', client.name)

        # Get equipment names for bookings if needed
        if with_bookings and project.bookings:
            for booking in project.bookings:
                # Get equipment information
                equipment = booking.equipment

                # Set names for response
                if equipment:
                    setattr(booking, 'equipment_name', equipment.name)

        log.debug(ProjectLogMessages.PROJECT_RETRIEVED, project_id)
        return project

    async def get_projects(
        self,
        limit: int = 100,
        offset: int = 0,
        client_id: Optional[int] = None,
        status: Optional[ProjectStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Tuple[List[Project], int]:
        """Get projects with pagination and filtering.

        Args:
            limit: Maximum number of projects to return
            offset: Number of projects to skip
            client_id: Filter by client ID
            status: Filter by project status
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            Tuple of list of projects and total count

        Raises:
            NotFoundError: If client not found
        """
        log = logger.bind(
            limit=limit,
            offset=offset,
            client_id=client_id,
            status=status.value if status else None,
            start_date=start_date,
            end_date=end_date,
        )

        # Validate client_id if provided
        if client_id is not None:
            client = await self.client_repository.get(client_id)
            if client is None:
                log.warning(ClientLogMessages.CLIENT_NOT_FOUND, client_id)
                raise NotFoundError(
                    ProjectErrorMessages.CLIENT_NOT_FOUND.format(client_id),
                    details={'client_id': client_id},
                )

        # Get projects
        result = await self.repository.get_projects_with_filters(
            limit=limit,
            offset=offset,
            client_id=client_id,
            status=status,
            start_date=start_date,
            end_date=end_date,
        )

        log.debug(ProjectLogMessages.PROJECT_LISTING, len(result[0]))
        return result

    async def update_project(
        self,
        project_id: int,
        name: Optional[str] = None,
        client_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[ProjectStatus] = None,
        description: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Project:
        """Update project.

        Args:
            project_id: Project ID
            name: Project name
            client_id: Client ID
            start_date: Start date of project
            end_date: End date of project
            status: Project status
            description: Project description
            notes: Additional notes

        Returns:
            Updated project

        Raises:
            NotFoundError: If project or client not found
            ValidationError: If validation fails
            DateError: If date validation fails
        """
        log = logger.bind(
            project_id=project_id,
            name=name,
            client_id=client_id,
            start_date=start_date,
            end_date=end_date,
            status=status.value if status else None,
        )

        try:
            # Check if project exists
            project = await self.repository.get_by_id(project_id)
            if project is None:
                log.warning(ProjectLogMessages.PROJECT_NOT_FOUND, project_id)
                raise NotFoundError(
                    ProjectErrorMessages.PROJECT_NOT_FOUND.format(project_id),
                    details={'project_id': project_id},
                )

            # Validate client_id if provided
            if client_id is not None:
                client = await self.client_repository.get(client_id)
                if client is None:
                    log.warning(ClientLogMessages.CLIENT_NOT_FOUND, client_id)
                    raise NotFoundError(
                        ProjectErrorMessages.CLIENT_NOT_FOUND.format(client_id),
                        details={'client_id': client_id},
                    )

            # Prepare update data
            update_data = {}
            params = {
                'name': name,
                'client_id': client_id,
                'start_date': start_date,
                'end_date': end_date,
                'status': status,
                'description': description,
                'notes': notes,
            }

            for key, value in params.items():
                if key in locals():
                    # Check required fields
                    if value is None and key in [
                        'name',
                        'client_id',
                        'status',
                        'start_date',
                        'end_date',
                    ]:
                        log.warning('Attempt to set required field {} to None', key)
                        continue
                    update_data[key] = value

            # Check dates if both provided
            if start_date is not None and end_date is not None:
                if start_date >= end_date:
                    raise DateError(
                        DateErrorMessages.INVALID_DATES,
                        start_date=start_date,
                        end_date=end_date,
                    )
            elif start_date is not None and project.end_date:
                if start_date >= project.end_date:
                    raise DateError(
                        DateErrorMessages.INVALID_DATES,
                        start_date=start_date,
                        end_date=project.end_date,
                    )
            elif end_date is not None and project.start_date:
                if project.start_date >= end_date:
                    raise DateError(
                        DateErrorMessages.INVALID_DATES,
                        start_date=project.start_date,
                        end_date=end_date,
                    )

            # Update project
            updated_project = await self.repository.update_project(
                project_id, update_data
            )
            if updated_project is None:
                log.warning(ProjectLogMessages.PROJECT_NOT_FOUND, project_id)
                raise NotFoundError(
                    ProjectErrorMessages.PROJECT_NOT_FOUND.format(project_id),
                    details={'project_id': project_id},
                )

            # Get client name for response
            client = await self.client_repository.get(updated_project.client_id)
            if client is None:
                client_id = updated_project.client_id
                log.warning(ClientLogMessages.CLIENT_NOT_FOUND, client_id)
                raise NotFoundError(
                    ProjectErrorMessages.CLIENT_NOT_FOUND.format(client_id),
                    details={'client_id': client_id},
                )
            setattr(updated_project, 'client_name', client.name)

            # Commit the transaction
            await self.db_session.commit()

            log.info(ProjectLogMessages.PROJECT_UPDATED, project_id)
            return updated_project

        except (ValidationError, NotFoundError, DateError):
            # Re-raise domain exceptions
            await self.db_session.rollback()
            raise
        except Exception as e:
            # Handle unexpected errors
            await self.db_session.rollback()
            log.error(ErrorLogMessages.UPDATE_PROJECT_ERROR, str(e))
            raise

    async def delete_project(self, project_id: int) -> bool:
        """Delete project.

        Args:
            project_id: Project ID

        Returns:
            True if project was deleted, False otherwise

        Raises:
            NotFoundError: If project not found
        """
        log = logger.bind(project_id=project_id)

        try:
            project = await self.repository.get_by_id_with_bookings(project_id)
            if project is None:
                log.warning(ProjectLogMessages.PROJECT_NOT_FOUND, project_id)
                raise NotFoundError(
                    ProjectErrorMessages.PROJECT_NOT_FOUND.format(project_id),
                    details={'project_id': project_id},
                )

            bookings_count = 0
            if project.bookings:
                bookings_count = len(project.bookings)
                log.info(
                    'Deleting {} bookings for project {}', bookings_count, project_id
                )

                booking_ids = [booking.id for booking in project.bookings]

                for booking_id in booking_ids:
                    log.debug('Deleting booking {}', booking_id)
                    await self.booking_repository.delete(booking_id)

                await self.db_session.flush()

            result = await self.repository.delete(project_id)
            await self.db_session.commit()

            if result:
                log.info(ProjectLogMessages.PROJECT_DELETED, project_id)
                if bookings_count > 0:
                    log.info('Successfully deleted {} bookings', bookings_count)

            return result

        except NotFoundError:
            await self.db_session.rollback()
            raise
        except Exception as e:
            await self.db_session.rollback()
            log.error(ErrorLogMessages.DELETE_PROJECT_ERROR, str(e))
            raise

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
            return await self.get_project(project_id, with_bookings=True)

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
            return await self.get_project(project_id, with_bookings=True)

        except (NotFoundError, ValidationError):
            # Re-raise domain exceptions
            await self.db_session.rollback()
            raise
        except Exception as e:
            # Handle unexpected errors
            await self.db_session.rollback()
            log.error(ErrorLogMessages.CREATE_BOOKING_ERROR, str(e))
            raise

    async def get_project_bookings(self, project_id: int) -> List[dict]:
        """Get bookings for project.

        Args:
            project_id: Project ID

        Returns:
            List of bookings with equipment information

        Raises:
            NotFoundError: If project not found
        """
        log = logger.bind(project_id=project_id)

        # Check if project exists
        project = await self.repository.get_by_id(project_id)
        if project is None:
            log.warning(ProjectLogMessages.PROJECT_NOT_FOUND, project_id)
            raise NotFoundError(
                ProjectErrorMessages.PROJECT_NOT_FOUND.format(project_id),
                details={'project_id': project_id},
            )

        # Get project with bookings
        project_with_bookings = await self.repository.get_by_id_with_bookings(
            project_id
        )
        if not project_with_bookings or not project_with_bookings.bookings:
            log.debug('No bookings found for project')
            return []

        # Format bookings with additional information
        result = []
        bookings_count = len(project_with_bookings.bookings)
        log.debug(BookingLogMessages.BOOKING_FORMATTING, bookings_count)

        for booking in project_with_bookings.bookings:
            # Process equipment data
            equipment_data = {}
            equipment_name = 'Неизвестно'

            if booking.equipment:
                equipment = booking.equipment
                equipment_name = equipment.name

                # Get category information
                category_name = 'Не указана'
                category_id = None

                if hasattr(equipment, 'category') and equipment.category:
                    category_name = equipment.category.name
                    category_id = equipment.category.id

                # Convert Decimal to float for JSON serialization
                replacement_cost_value = 0.0
                if equipment.replacement_cost:
                    replacement_cost_value = float(equipment.replacement_cost)

                equipment_data = {
                    'id': equipment.id,
                    'name': equipment.name,
                    'category_id': category_id,
                    'category': category_name,
                    'replacement_cost': replacement_cost_value,
                    'serial_number': equipment.serial_number,
                }

            # Get booking status
            booking_status = None
            if hasattr(booking, 'booking_status') and booking.booking_status:
                booking_status = booking.booking_status.value
            elif hasattr(booking, 'status') and booking.status:
                booking_status = booking.status.value
            else:
                booking_status = 'DRAFT'  # Default value

            # Convert dates to ISO format for JSON serialization
            has_start = booking.start_date is not None
            has_end = booking.end_date is not None
            start_iso = booking.start_date.isoformat() if has_start else None
            end_iso = booking.end_date.isoformat() if has_end else None

            # Get payment status
            payment_status = 'PENDING'  # Default payment status
            if hasattr(booking, 'payment_status') and booking.payment_status:
                payment_status = booking.payment_status.value

            # Create booking dictionary with all required data
            booking_dict = {
                'id': booking.id,
                'start_date': start_iso,
                'end_date': end_iso,
                'booking_status': booking_status,
                'status': booking_status,  # duplicate for compatibility
                'equipment': equipment_data,
                'equipment_name': equipment_name,  # for frontend compatibility
                'quantity': 1,  # for frontend compatibility
                'payment_status': payment_status,
            }
            result.append(booking_dict)

        log.debug('Returning {} formatted bookings', len(result))
        return result

    async def get_project_as_dict(self, project_id: int) -> dict:
        """Get project by ID and return as dictionary.

        Args:
            project_id: Project ID

        Returns:
            Project data as dictionary

        Raises:
            NotFoundError: If project not found
        """
        log = logger.bind(project_id=project_id)
        log.debug('Getting project as dictionary')

        # Get project with repository
        project = await self.repository.get_by_id(project_id)

        # Check if project exists
        if project is None:
            log.warning(ProjectLogMessages.PROJECT_NOT_FOUND, project_id)
            raise NotFoundError(
                ProjectErrorMessages.PROJECT_NOT_FOUND.format(project_id),
                details={'project_id': project_id},
            )

        # Get client name for response
        client = await self.client_repository.get(project.client_id)
        client_name = client.name if client else 'Unknown Client'

        log.debug('Found client for project: {}', client_name)

        # Convert to dictionary with basic project data
        project_dict = {
            'id': project.id,
            'name': project.name,
            'client_id': project.client_id,
            'client_name': client_name,
            'start_date': (
                project.start_date.isoformat() if project.start_date else None
            ),
            'end_date': (project.end_date.isoformat() if project.end_date else None),
            'status': project.status.value if project.status else None,
            'description': project.description,
            'notes': project.notes,
            'created_at': (
                project.created_at.isoformat() if project.created_at else None
            ),
            'updated_at': (
                project.updated_at.isoformat() if project.updated_at else None
            ),
        }

        # Get bookings separately to avoid serialization issues
        bookings_data = await self.get_project_bookings(project_id)
        project_dict['bookings'] = bookings_data

        log.debug(
            ProjectLogMessages.PROJECT_DICT_CONVERSION, project_id, len(bookings_data)
        )

        return project_dict
