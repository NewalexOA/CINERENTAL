"""Formatters operations for project service.

This module contains methods for formatting and transforming project data.
"""

from typing import List

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants.log_messages import BookingLogMessages, ProjectLogMessages
from backend.exceptions import NotFoundError
from backend.exceptions.messages import ProjectErrorMessages
from backend.repositories import ClientRepository, ProjectRepository
from backend.repositories.equipment import EquipmentRepository


class FormattersOperations:
    """Formatters operations for project service."""

    def __init__(self, db_session: AsyncSession) -> None:
        """Initialize formatters operations.

        Args:
            db_session: Database session
        """
        self.db_session = db_session
        self.repository = ProjectRepository(db_session)
        self.client_repository = ClientRepository(db_session)

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
            'payment_status': (
                project.payment_status.value if project.payment_status else 'UNPAID'
            ),
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
