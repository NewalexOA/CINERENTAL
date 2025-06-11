"""Project service module.

This module provides service functionality for project management.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants.log_messages import (
    BookingLogMessages,
    ErrorLogMessages,
    ProjectLogMessages,
)
from backend.exceptions import NotFoundError, ValidationError
from backend.exceptions.messages import ProjectErrorMessages
from backend.models import Project, ProjectStatus
from backend.repositories import BookingRepository, ClientRepository, ProjectRepository
from backend.repositories.equipment import EquipmentRepository
from backend.services.booking import BookingService
from backend.services.project.operations.crud_operations import CrudOperations
from backend.services.project.operations.query_operations import QueryOperations


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
        self.crud_operations = CrudOperations(db_session)
        self.query_operations = QueryOperations(db_session)

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

    async def get_projects(
        self,
        limit: int = 100,
        offset: int = 0,
        client_id: Optional[int] = None,
        status: Optional[ProjectStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        query: Optional[str] = None,
    ) -> Tuple[List[Project], int]:
        """Get projects with pagination and filtering.

        Args:
            limit: Maximum number of projects to return
            offset: Number of projects to skip
            client_id: Filter by client ID
            status: Filter by project status
            start_date: Filter by start date
            end_date: Filter by end date
            query: Search by project name (case-insensitive)

        Returns:
            Tuple of list of projects and total count

        Raises:
            NotFoundError: If client not found
        """
        return await self.query_operations.get_projects(
            limit=limit,
            offset=offset,
            client_id=client_id,
            status=status,
            start_date=start_date,
            end_date=end_date,
            query=query,
        )

    async def get_projects_list_query(
        self,
        client_id: Optional[int] = None,
        status: Optional[ProjectStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        include_deleted: bool = False,
        query: Optional[str] = None,
    ) -> Any:
        """Get projects list query for pagination.

        Args:
            client_id: Filter by client ID
            status: Filter by project status
            start_date: Filter by start date
            end_date: Filter by end date
            include_deleted: Whether to include deleted projects
            query: Search by project name (case-insensitive)

        Returns:
            SQLAlchemy query object

        Raises:
            NotFoundError: If client not found
        """
        return await self.query_operations.get_projects_list_query(
            client_id=client_id,
            status=status,
            start_date=start_date,
            end_date=end_date,
            include_deleted=include_deleted,
            query=query,
        )

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
        return await self.crud_operations.update_project(
            project_id=project_id,
            name=name,
            client_id=client_id,
            start_date=start_date,
            end_date=end_date,
            status=status,
            description=description,
            notes=notes,
        )

    async def delete_project(self, project_id: int) -> bool:
        """Soft delete project.

        Args:
            project_id: Project ID

        Returns:
            True if project was deleted, False otherwise

        Raises:
            NotFoundError: If project not found
        """
        return await self.crud_operations.delete_project(project_id)

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
        return await self.crud_operations.create_project(
            name=name,
            client_id=client_id,
            start_date=start_date,
            end_date=end_date,
            description=description,
            notes=notes,
        )

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
        return await self.crud_operations.get_project(project_id, with_bookings)

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

        # Prepare equipment repository for direct lookup
        equipment_repo = EquipmentRepository(self.db_session)

        for booking in project_with_bookings.bookings:
            # Get equipment information
            equipment = None
            if booking.equipment_id:
                equipment = await equipment_repo.get(booking.equipment_id)

            # Process equipment data
            equipment_data = {}
            equipment_name = 'Неизвестно'
            serial_number = None
            quantity = booking.quantity or 1

            if equipment:
                equipment_name = equipment.name
                serial_number = equipment.serial_number
                barcode = equipment.barcode

                # Get category information
                category_name = 'Не указана'
                category_id = None

                if hasattr(equipment, 'category') and equipment.category:
                    category_name = equipment.category.name
                    category_id = equipment.category.id

                # Convert Decimal to float for JSON serialization
                replacement_cost_value = 0
                if equipment.replacement_cost:
                    replacement_cost_value = equipment.replacement_cost

                equipment_data = {
                    'id': equipment.id,
                    'name': equipment.name,
                    'category_id': category_id,
                    'category': category_name,
                    'replacement_cost': replacement_cost_value,
                    'serial_number': equipment.serial_number,
                }
            else:
                barcode = None
                category_name = 'Не указана'

            # Get booking status
            booking_status = None
            if hasattr(booking, 'booking_status') and booking.booking_status:
                booking_status = booking.booking_status.value
            elif hasattr(booking, 'status') and booking.status:
                booking_status = booking.status.value
            else:
                booking_status = 'DRAFT'

            # Convert dates to ISO format for JSON serialization
            has_start = booking.start_date is not None
            has_end = booking.end_date is not None
            start_iso = booking.start_date.isoformat() if has_start else None
            end_iso = booking.end_date.isoformat() if has_end else None

            # Get payment status
            payment_status = 'PENDING'
            if hasattr(booking, 'payment_status') and booking.payment_status:
                payment_status = booking.payment_status.value

            # Compare booking dates with project dates (ignoring time)
            has_different_dates = False
            if (
                booking.start_date
                and booking.end_date
                and project.start_date
                and project.end_date
            ):
                booking_start_date = booking.start_date.date()
                booking_end_date = booking.end_date.date()
                project_start_date = project.start_date.date()
                project_end_date = project.end_date.date()

                has_different_dates = (
                    booking_start_date != project_start_date
                    or booking_end_date != project_end_date
                )

            # Create booking dictionary with all required data
            booking_dict = {
                'id': booking.id,
                'start_date': start_iso,
                'end_date': end_iso,
                'booking_status': booking_status,
                'status': booking_status,
                'equipment': equipment_data,
                'equipment_name': equipment_name,
                'equipment_id': booking.equipment_id,
                'serial_number': serial_number,
                'barcode': barcode,
                'category_name': category_name,
                'quantity': quantity,
                'payment_status': payment_status,
                'has_different_dates': has_different_dates,
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

        # Prepare client object for response
        client_data = None
        if client:
            client_data = {
                'id': client.id,
                'name': client.name,
                'email': client.email if hasattr(client, 'email') else None,
                'phone': client.phone if hasattr(client, 'phone') else None,
            }

        log.debug('Found client for project: {}', client_name)

        # Convert to dictionary with basic project data
        project_dict = {
            'id': project.id,
            'name': project.name,
            'client_id': project.client_id,
            'client_name': client_name,
            'client': client_data,  # Add client object
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

    async def get_project_bookings_paginated(
        self,
        project_id: int,
        query: Optional[str] = None,
        category_id: Optional[int] = None,
        date_filter: str = 'all',
    ) -> Any:
        """Get paginated project bookings with filtering.

        Args:
            project_id: Project ID
            query: Search query (name, serial_number, barcode)
            category_id: Filter by category
            date_filter: Filter by date comparison with project
                ('all', 'different', 'matching')

        Returns:
            SQLAlchemy Query for pagination

        Raises:
            NotFoundError: If project not found
        """
        return await self.query_operations.get_project_bookings_paginated(
            project_id=project_id,
            query=query,
            category_id=category_id,
            date_filter=date_filter,
        )
