"""CRUD operations for project management.

This module contains all basic CRUD operations for projects.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants.log_messages import (
    ClientLogMessages,
    ErrorLogMessages,
    ProjectLogMessages,
)
from backend.core.config import settings
from backend.core.timezone_utils import ensure_timezone_aware, normalize_project_period
from backend.exceptions import CaptchaError, DateError, NotFoundError, ValidationError
from backend.exceptions.messages import DateErrorMessages, ProjectErrorMessages
from backend.models import BookingStatus, Project, ProjectPaymentStatus, ProjectStatus
from backend.repositories import BookingRepository, ClientRepository, ProjectRepository


class CrudOperations:
    """CRUD operations for projects."""

    def __init__(self, db_session: AsyncSession) -> None:
        """Initialize CRUD operations.

        Args:
            db_session: Database session
        """
        self.db_session = db_session
        self.repository = ProjectRepository(db_session)
        self.client_repository = ClientRepository(db_session)
        self.booking_repository = BookingRepository(db_session)

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
            # Normalize timezone and clamp to business day boundaries
            start_date, end_date = normalize_project_period(start_date, end_date)

            # Extra safety to ensure tz-aware datetimes
            start_date = ensure_timezone_aware(start_date)
            end_date = ensure_timezone_aware(end_date)

            # Validate dates
            if start_date > end_date:
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

            # Prepare update data - only include non-None values
            update_data: Dict[str, Any] = {}

            # Only add fields that are explicitly provided (not None)
            if name is not None:
                update_data['name'] = name
            if client_id is not None:
                update_data['client_id'] = client_id
            if start_date is not None:
                update_data['start_date'] = start_date
            if end_date is not None:
                update_data['end_date'] = end_date
            if status is not None:
                update_data['status'] = status
            if description is not None:
                update_data['description'] = description
            if notes is not None:
                update_data['notes'] = notes

            # Check dates if both provided
            if start_date is not None and end_date is not None:
                if start_date > end_date:
                    raise DateError(
                        DateErrorMessages.INVALID_DATES,
                        start_date=start_date,
                        end_date=end_date,
                    )
            elif start_date is not None and project.end_date:
                if start_date > project.end_date:
                    raise DateError(
                        DateErrorMessages.INVALID_DATES,
                        start_date=start_date,
                        end_date=project.end_date,
                    )
            elif end_date is not None and project.start_date:
                if project.start_date > end_date:
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

            # Cascade completion and soft deletion of bookings if project is completed
            if status in [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]:
                project_with_bookings = await self.repository.get_by_id_with_bookings(
                    project_id
                )
                if project_with_bookings and project_with_bookings.bookings:
                    for booking in project_with_bookings.bookings:
                        if booking.booking_status not in [
                            BookingStatus.COMPLETED,
                            BookingStatus.CANCELLED,
                        ]:
                            booking.booking_status = BookingStatus.COMPLETED
                            await self.booking_repository.update(booking)
                        await self.booking_repository.soft_delete(booking.id)
                await self.db_session.flush()

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
        """Soft delete project.

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
                    'Soft deleting {} bookings for project {}',
                    bookings_count,
                    project_id,
                )

                # Use soft delete for bookings instead of physical deletion
                for booking in project.bookings:
                    log.debug('Soft deleting booking {}', booking.id)
                    await self.booking_repository.soft_delete(booking.id)

                await self.db_session.flush()

            # Soft delete the project
            result = await self.repository.delete(project_id)
            await self.db_session.commit()

            if result:
                log.info(ProjectLogMessages.PROJECT_DELETED, project_id)
                if bookings_count > 0:
                    log.info('Successfully soft deleted {} bookings', bookings_count)

            return result

        except NotFoundError:
            await self.db_session.rollback()
            raise
        except Exception as e:
            await self.db_session.rollback()
            log.error(ErrorLogMessages.DELETE_PROJECT_ERROR, str(e))
            raise

    async def update_payment_status(
        self,
        project_id: int,
        payment_status: ProjectPaymentStatus,
        captcha_code: str,
    ) -> Project:
        """Update project payment status with captcha validation.

        Args:
            project_id: Project ID
            payment_status: New payment status
            captcha_code: Captcha code for validation

        Returns:
            Updated project

        Raises:
            NotFoundError: If project not found
            CaptchaError: If captcha code is invalid
        """
        log = logger.bind(
            project_id=project_id,
            payment_status=payment_status.value,
        )

        try:
            # Validate captcha code
            if captcha_code != settings.PAYMENT_STATUS_CAPTCHA_CODE:
                log.warning('Invalid captcha code for payment status update')
                raise CaptchaError(
                    'Invalid captcha code',
                    details={'project_id': project_id},
                )

            # Check if project exists
            project = await self.repository.get_by_id(project_id)
            if project is None:
                log.warning(ProjectLogMessages.PROJECT_NOT_FOUND, project_id)
                raise NotFoundError(
                    ProjectErrorMessages.PROJECT_NOT_FOUND.format(project_id),
                    details={'project_id': project_id},
                )

            # Update payment status
            update_data = {'payment_status': payment_status}
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

            log.info(
                'Project {} payment status updated to {}',
                project_id,
                payment_status.value,
            )
            return updated_project

        except (NotFoundError, CaptchaError):
            # Re-raise domain exceptions
            await self.db_session.rollback()
            raise
        except Exception as e:
            # Handle unexpected errors
            await self.db_session.rollback()
            log.error('Error updating payment status: {}', str(e))
            raise
