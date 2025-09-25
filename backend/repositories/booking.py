"""Booking repository module.

This module provides database operations for managing equipment bookings,
including creating, retrieving, updating, and canceling rental records.
"""

import traceback
from datetime import datetime
from typing import List, Optional, Sequence

from loguru import logger
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy.sql import Select

# Keep Project import as it's used in joinedload
from backend.models import Project  # noqa: F401
from backend.models import Booking, BookingStatus, Client, Equipment, PaymentStatus
from backend.repositories import BaseRepository
from backend.schemas import BookingWithDetails, EquipmentResponse
from backend.schemas.project import ProjectBase


class BookingRepository(BaseRepository[Booking]):
    """Repository for managing bookings."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository.

        Args:
            session: SQLAlchemy async session
        """
        super().__init__(session, Booking)

    async def check_availability(
        self,
        equipment_id: int,
        start_date: datetime,
        end_date: datetime,
        exclude_booking_id: Optional[int] = None,
    ) -> bool:
        """Check if equipment is available for the specified period.

        Args:
            equipment_id: Equipment ID
            start_date: Start date
            end_date: End date
            exclude_booking_id: Booking ID to exclude from check (optional)

        Returns:
            True if equipment is available, False otherwise
        """
        # Check for conflicting bookings in relevant statuses
        conflicting_statuses = [
            BookingStatus.CONFIRMED,
            BookingStatus.ACTIVE,
            BookingStatus.OVERDUE,
        ]
        # Query explanation:
        # Find any booking for the given equipment_id
        # that is in a conflicting status
        # AND overlaps with the requested [start_date, end_date] period.
        # Overlap condition: (ExistingStart <= ReqEnd) AND (ExistingEnd >= ReqStart)
        query = select(Booking.id).where(
            Booking.equipment_id == equipment_id,
            Booking.booking_status.in_(conflicting_statuses),
            Booking.start_date <= end_date,
            Booking.end_date >= start_date,
        )

        if exclude_booking_id:
            query = query.where(Booking.id != exclude_booking_id)

        query = query.limit(1)

        result = await self.session.execute(query)
        return result.scalar_one_or_none() is None

    async def get_by_client(
        self,
        client_id: int,
        status_filter: Optional[Sequence[BookingStatus]] = None,
    ) -> List[BookingWithDetails]:
        """Get bookings by client ID.

        Args:
            client_id: Client ID.
            status_filter: Optional list of booking statuses to filter by.

        Returns:
            List of bookings with related project and equipment data.
        """
        query = (
            select(self.model)
            .where(self.model.client_id == client_id, self.model.deleted_at.is_(None))
            .options(
                joinedload(self.model.equipment).joinedload(Equipment.category),
                joinedload(self.model.project),
            )
            .order_by(self.model.created_at.desc())
        )

        # Add status filter if provided
        if status_filter:
            query = query.where(self.model.booking_status.in_(status_filter))

        result = await self.session.execute(query)
        bookings = result.unique().scalars().all()

        booking_details = []
        for booking in bookings:
            # Convert Equipment model to dictionary if exists
            equipment_data = None
            if booking.equipment:
                equipment_dict = {
                    'id': booking.equipment.id,
                    'name': booking.equipment.name,
                    'description': booking.equipment.description,
                    'serial_number': booking.equipment.serial_number,
                    'barcode': booking.equipment.barcode,
                    'category_id': booking.equipment.category_id,
                    'status': booking.equipment.status,
                    'replacement_cost': booking.equipment.replacement_cost,
                    'notes': booking.equipment.notes,
                    'created_at': booking.equipment.created_at,
                    'updated_at': booking.equipment.updated_at,
                    'category_name': booking.equipment.category_name,
                }
                equipment_data = EquipmentResponse.model_validate(equipment_dict)

            # Convert Project model to dictionary if exists
            project_data = None
            if booking.project:
                project_dict = {
                    'id': booking.project.id,
                    'name': booking.project.name,
                    'description': booking.project.description,
                    'client_id': booking.project.client_id,
                    'start_date': booking.project.start_date,
                    'end_date': booking.project.end_date,
                    'status': booking.project.status,
                    'notes': booking.project.notes,
                }
                project_data = ProjectBase.model_validate(project_dict)

            # Create BookingWithDetails with converted related data
            booking_detail = BookingWithDetails(
                id=booking.id,
                equipment_id=booking.equipment_id,
                client_id=booking.client_id,
                project_id=booking.project_id,
                start_date=booking.start_date,
                end_date=booking.end_date,
                total_amount=booking.total_amount,
                quantity=booking.quantity,
                created_at=booking.created_at,
                updated_at=booking.updated_at,
                booking_status=booking.booking_status,
                payment_status=booking.payment_status,
                equipment=equipment_data,
                project=project_data,
            )
            booking_details.append(booking_detail)

        return booking_details

    async def get_active_by_client(self, client_id: int) -> List[Booking]:
        """Get active bookings for client.

        Active means bookings that are PENDING, CONFIRMED, ACTIVE, or OVERDUE.

        Args:
            client_id: Client ID

        Returns:
            List of active bookings
        """
        active_statuses = [
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.ACTIVE,
            BookingStatus.OVERDUE,
        ]
        stmt = (
            select(self.model)
            .where(
                self.model.client_id == client_id,
                self.model.booking_status.in_(active_statuses),
                self.model.deleted_at.is_(None),
            )
            .options(
                joinedload(self.model.equipment),
                joinedload(self.model.project),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_by_equipment(
        self, equipment_id: int, include_deleted: bool = False
    ) -> List[Booking]:
        """Get all bookings for equipment.

        Args:
            equipment_id: Equipment ID
            include_deleted: Whether to include soft-deleted bookings

        Returns:
            List of bookings
        """
        conditions = [self.model.equipment_id == equipment_id]
        if not include_deleted:
            conditions.append(self.model.deleted_at.is_(None))
        stmt = (
            select(self.model)
            .where(*conditions)
            .options(
                joinedload(self.model.client),
                joinedload(self.model.project),
                joinedload(self.model.equipment),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_active_by_equipment(self, equipment_id: int) -> List[Booking]:
        """Get active bookings for equipment (excluding soft-deleted).

        Active means bookings that are PENDING, CONFIRMED, ACTIVE, or OVERDUE.

        Args:
            equipment_id: Equipment ID

        Returns:
            List of active bookings
        """
        active_statuses = [
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.ACTIVE,
            BookingStatus.OVERDUE,
        ]
        stmt = (
            select(self.model)
            .where(
                self.model.equipment_id == equipment_id,
                self.model.booking_status.in_(active_statuses),
                self.model.deleted_at.is_(None),
            )
            .options(
                joinedload(self.model.client),
                joinedload(self.model.project),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_overlapping_bookings(
        self,
        equipment_id: int,
        start_date: datetime,
        end_date: datetime,
        exclude_booking_id: Optional[int] = None,
    ) -> List[Booking]:
        """Get bookings for equipment that overlap with a given time period.

        Args:
            equipment_id: Equipment ID
            start_date: Start date of the period
            end_date: End date of the period
            exclude_booking_id: Booking ID to exclude from the check (optional)

        Returns:
            List of overlapping bookings
        """
        # Bookings considered conflicting if they are in these statuses
        conflicting_statuses = [
            BookingStatus.CONFIRMED,
            BookingStatus.ACTIVE,
            BookingStatus.OVERDUE,
        ]

        # Overlap condition: A booking overlaps if its period intersects
        # with the [start_date, end_date] interval.
        # (ExistingStart <= ReqEnd) AND (ExistingEnd >= ReqStart)
        stmt = select(self.model).where(
            self.model.equipment_id == equipment_id,
            self.model.booking_status.in_(conflicting_statuses),
            self.model.start_date <= end_date,
            self.model.end_date >= start_date,
            self.model.deleted_at.is_(None),
        )

        if exclude_booking_id:
            stmt = stmt.where(self.model.id != exclude_booking_id)

        # Load relations for context
        stmt = stmt.options(
            joinedload(self.model.client),
            joinedload(self.model.project),
        )

        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_active_for_period(
        self, start_date: datetime, end_date: datetime
    ) -> List[Booking]:
        """Get bookings that are ACTIVE during any part of the specified period.

        Args:
            start_date: Period start date
            end_date: Period end date

        Returns:
            List of active bookings overlapping the period
        """
        # Overlap condition: (ExistingStart <= PeriodEnd)
        # AND (ExistingEnd >= PeriodStart)
        stmt = (
            select(Booking)
            .where(
                Booking.booking_status == BookingStatus.ACTIVE,
                Booking.start_date <= end_date,
                Booking.end_date >= start_date,
                Booking.deleted_at.is_(None),
            )
            .options(
                joinedload(Booking.client),
                joinedload(Booking.equipment),
                joinedload(Booking.project),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_by_status(self, status: BookingStatus) -> List[Booking]:
        """Get bookings by status.

        Args:
            status: Booking status

        Returns:
            List of bookings with specified status
        """
        stmt = (
            select(Booking)
            .where(Booking.booking_status == status, Booking.deleted_at.is_(None))
            .options(
                joinedload(Booking.client),
                joinedload(Booking.equipment),
                joinedload(Booking.project),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_by_payment_status(self, status: PaymentStatus) -> List[Booking]:
        """Get bookings by payment status.

        Args:
            status: Payment status

        Returns:
            List of bookings with specified payment status
        """
        stmt = (
            select(Booking)
            .where(Booking.payment_status == status, Booking.deleted_at.is_(None))
            .options(
                joinedload(Booking.client),
                joinedload(Booking.equipment),
                joinedload(Booking.project),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_overdue(self, now: datetime) -> List[Booking]:
        """Get bookings overdue (status ACTIVE/CONFIRMED, end_date past).

        Args:
            now: Current datetime

        Returns:
            List of overdue bookings
        """
        # Status should ideally be OVERDUE, but we can also find potential ones
        # that haven't been updated yet.
        potential_overdue_statuses = [BookingStatus.ACTIVE, BookingStatus.CONFIRMED]
        stmt = (
            select(Booking)
            .where(
                Booking.booking_status.in_(potential_overdue_statuses),
                Booking.end_date < now,
                Booking.deleted_at.is_(None),
            )
            .options(
                joinedload(Booking.client),
                joinedload(Booking.equipment),
                joinedload(Booking.project),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_by_date_range(
        self, start_date: datetime, end_date: datetime
    ) -> List[Booking]:
        """Get bookings overlapping with a specific date range.

        Args:
            start_date: Range start date.
            end_date: Range end date.

        Returns:
            List of bookings within the range (excluding soft-deleted).
        """
        # Overlap condition: (ExistingStart <= RangeEnd) AND (ExistingEnd >= RangeStart)
        stmt = (
            select(Booking)
            .where(
                Booking.start_date <= end_date,
                Booking.end_date >= start_date,
                Booking.deleted_at.is_(None),
            )
            .options(
                joinedload(Booking.client),
                joinedload(Booking.equipment),
                joinedload(Booking.project),
            )
            .order_by(Booking.start_date)
        )
        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_all(
        self, skip: int = 0, limit: int = 100, include_deleted: bool = False
    ) -> List[Booking]:
        """Get all bookings with pagination and optional deleted.

        Args:
            skip: Number of records to skip.
            limit: Maximum number of records to return.
            include_deleted: Whether to include soft-deleted records.

        Returns:
            List of bookings.
        """
        stmt = (
            select(self.model)
            .options(
                joinedload(self.model.client),
                joinedload(self.model.equipment),
                joinedload(self.model.project),
            )
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        if not include_deleted:
            stmt = stmt.where(self.model.deleted_at.is_(None))

        result = await self.session.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_with_relations(self, booking_id: int) -> Optional[Booking]:
        """Get booking by ID with related client, equipment, project loaded.

        Args:
            booking_id: Booking ID

        Returns:
            Booking instance with relations loaded, or None if not found
            (excluding soft-deleted).
        """
        stmt = (
            select(self.model)
            .where(self.model.id == booking_id, self.model.deleted_at.is_(None))
            .options(
                joinedload(self.model.client),
                joinedload(self.model.equipment),
                joinedload(self.model.project),
            )
        )
        result = await self.session.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def get_equipment_for_booking(self, booking_id: int) -> Optional[Equipment]:
        """Get the equipment associated with a booking.

        Args:
            booking_id: The ID of the booking.

        Returns:
            The Equipment object or None if not found.
        """
        # Select the Equipment model
        # Join from Booking to Equipment using the foreign key
        # Filter where Booking.id matches the provided booking_id
        stmt = (
            select(Equipment)
            .join(Booking, Booking.equipment_id == Equipment.id)
            .where(Booking.id == booking_id)
        )

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_filtered(
        self,
        query: Optional[str] = None,
        equipment_query: Optional[str] = None,
        equipment_id: Optional[int] = None,
        booking_status: Optional[BookingStatus] = None,
        payment_status: Optional[PaymentStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[BookingWithDetails]:
        """Get filtered bookings.

        Args:
            query: Search query for booking details
            equipment_query: Search query for equipment details
            equipment_id: Filter by equipment ID
            booking_status: Filter by booking status
            payment_status: Filter by payment status
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            List of filtered bookings with details
        """
        try:
            logger.debug('Starting get_filtered method with parameters:')
            logger.debug('  booking_status: {}', booking_status)
            logger.debug('  payment_status: {}', payment_status)
            logger.debug('  equipment_id: {}', equipment_id)
            logger.debug('  query: {}', query)
            logger.debug('  equipment_query: {}', equipment_query)
            logger.debug('  start_date: {}', start_date)
            logger.debug('  end_date: {}', end_date)

            stmt = (
                select(Booking)
                .where(Booking.deleted_at.is_(None))
                .options(
                    joinedload(Booking.client),
                    joinedload(Booking.equipment).joinedload(Equipment.category),
                    joinedload(Booking.project),
                )
                .order_by(Booking.created_at.desc())
            )

            # Apply filters conditionally
            if query:
                search_query = f'%{query}%'
                # Ensure Client relationship is joined before filtering on it
                stmt = stmt.join(Booking.client).where(
                    or_(
                        Client.name.ilike(search_query),
                        Client.email.ilike(search_query),
                        Client.phone.ilike(search_query),
                    )
                )

            if equipment_query:
                search_eq_query = f'%{equipment_query}%'
                # Ensure Equipment relationship is joined before filtering on it
                stmt = stmt.join(Booking.equipment).where(
                    or_(
                        Equipment.name.ilike(search_eq_query),
                        # Add serial number search if Equipment model has it
                        Equipment.serial_number.ilike(search_eq_query),
                        # Add barcode search
                        Equipment.barcode.ilike(search_eq_query),
                    )
                )

            if equipment_id is not None:
                stmt = stmt.where(Booking.equipment_id == equipment_id)

            if booking_status is not None:
                logger.debug('Applying filter for booking_status: {}', booking_status)
                stmt = stmt.where(Booking.booking_status == booking_status)
                logger.debug('SQL condition added for booking_status')

            if payment_status is not None:
                stmt = stmt.where(Booking.payment_status == payment_status)

            # Apply date range filter (overlap logic)
            if start_date and end_date:
                # Find bookings that overlap with the [start_date, end_date] range
                # Overlap condition: booking.start_date <= end_date
                # AND booking.end_date >= start_date
                stmt = stmt.where(
                    and_(
                        Booking.start_date <= end_date,
                        Booking.end_date >= start_date,
                    )
                )
            elif start_date:
                stmt = stmt.where(Booking.end_date >= start_date)
            elif end_date:
                stmt = stmt.where(Booking.start_date <= end_date)

            logger.debug('Executing SQL query')
            result = await self.session.execute(stmt)
            bookings = result.unique().scalars().all()
            logger.debug(f'Found {len(bookings)} bookings')

            if booking_status is not None:
                logger.debug(
                    'Bookings after filtering by status {}: {}',
                    booking_status,
                    [(b.id, b.booking_status) for b in bookings],
                )

            booking_details = []
            for booking in bookings:
                try:
                    logger.debug(f'Processing booking {booking.id}')
                    equipment_data = None
                    if booking.equipment:
                        try:
                            logger.debug(f'Processing equipment {booking.equipment.id}')
                            equipment_dict = {
                                'id': booking.equipment.id,
                                'name': booking.equipment.name,
                                'description': booking.equipment.description or '',
                                'serial_number': booking.equipment.serial_number or '',
                                'barcode': booking.equipment.barcode or '',
                                'category_id': booking.equipment.category_id,
                                'status': booking.equipment.status,
                                'replacement_cost': booking.equipment.replacement_cost,
                                'notes': booking.equipment.notes or '',
                                'created_at': booking.equipment.created_at,
                                'updated_at': booking.equipment.updated_at,
                                'category_name': booking.equipment.category_name,
                            }
                            logger.debug('Created equipment dictionary')
                            equipment_data = EquipmentResponse.model_validate(
                                equipment_dict
                            )
                            logger.debug('Validated equipment model')
                        except Exception as e:
                            logger.error(
                                'Error processing equipment for booking '
                                f'{booking.id}: {str(e)}',
                            )

                    project_data = None
                    if booking.project:
                        try:
                            logger.debug(f'Processing project {booking.project.id}')
                            project_dict = {
                                'id': booking.project.id,
                                'name': booking.project.name,
                                'description': booking.project.description or '',
                                'client_id': booking.project.client_id,
                                'start_date': booking.project.start_date,
                                'end_date': booking.project.end_date,
                                'status': booking.project.status,
                                'notes': booking.project.notes or '',
                            }
                            logger.debug('Created project dictionary')
                            project_data = ProjectBase.model_validate(project_dict)
                            logger.debug('Validated project model')
                        except Exception as e:
                            logger.error(
                                'Error processing project for booking '
                                f'{booking.id}: {str(e)}',
                            )

                    # Process client information
                    client_name = None
                    if booking.client:
                        try:
                            logger.debug('Processing client {}', booking.client.id)
                            client_name = booking.client.name
                            logger.debug('Client name: {}', client_name)
                        except Exception as e:
                            logger.error(
                                'Error processing client for booking {}: {}',
                                booking.id,
                                str(e),
                            )
                            client_name = None

                    logger.debug('Creating BookingWithDetails')
                    # Create BookingWithDetails with all required fields
                    booking_detail_dict = {
                        'id': booking.id,
                        'equipment_id': booking.equipment_id,
                        'client_id': booking.client_id,
                        'project_id': booking.project_id,
                        'start_date': booking.start_date,
                        'end_date': booking.end_date,
                        'total_amount': booking.total_amount,
                        'quantity': booking.quantity,
                        'created_at': booking.created_at,
                        'updated_at': booking.updated_at,
                        'booking_status': booking.booking_status,
                        'payment_status': booking.payment_status,
                        'equipment': equipment_data,
                        'project': project_data,
                    }

                    # Add client name to the object
                    booking_detail = BookingWithDetails.model_validate(
                        booking_detail_dict
                    )
                    if client_name:
                        # Set client_name after model validation
                        booking_detail.client_name = client_name
                    logger.debug('Successfully created BookingWithDetails')
                    booking_details.append(booking_detail)
                except Exception as e:
                    logger.error(f'Error processing booking {booking.id}: {str(e)}')
                    continue

            logger.debug(f'Returning {len(booking_details)} booking details')
            if booking_status is not None:
                logger.debug(
                    'Final booking details with status {}: {}',
                    booking_status,
                    [(b.id, b.booking_status) for b in booking_details],
                )
            return booking_details

        except Exception as e:
            logger.error(f'Error in get_filtered method: {str(e)}')
            logger.error(traceback.format_exc())
            raise

    def get_paginatable_query(
        self,
        query: Optional[str] = None,
        equipment_query: Optional[str] = None,
        equipment_id: Optional[int] = None,
        booking_status: Optional[BookingStatus] = None,
        payment_status: Optional[PaymentStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        include_deleted: bool = False,
    ) -> Select:
        """Get a paginatable query for bookings with optional filtering.

        This method returns a SQLAlchemy Select query object that can be used
        with fastapi-pagination to provide efficient database-level pagination.

        Args:
            query: Search query for client details (name, email, phone).
            equipment_query: Search query for equipment details (name, serial, barcode).
            equipment_id: Filter by equipment ID.
            booking_status: Filter by booking status.
            payment_status: Filter by payment status.
            start_date: Filter by start date (overlap logic).
            end_date: Filter by end date (overlap logic).

        Returns:
            SQLAlchemy Select query object
        """
        # Base query with relationships
        conditions = []
        if not include_deleted:
            conditions.append(Booking.deleted_at.is_(None))
        stmt = (
            select(Booking)
            .options(
                joinedload(Booking.equipment).joinedload(Equipment.category),
                joinedload(Booking.client),
                joinedload(Booking.project),
            )
            .order_by(Booking.created_at.desc())
        )

        if conditions:
            stmt = stmt.where(*conditions)

        # Apply filters conditionally
        if query:
            search_query = f'%{query}%'
            # Ensure Client relationship is joined before filtering on it
            stmt = stmt.join(Booking.client).where(
                or_(
                    Client.name.ilike(search_query),
                    Client.email.ilike(search_query),
                    Client.phone.ilike(search_query),
                )
            )

        if equipment_query:
            search_eq_query = f'%{equipment_query}%'
            # Ensure Equipment relationship is joined before filtering on it
            stmt = stmt.join(Booking.equipment).where(
                or_(
                    Equipment.name.ilike(search_eq_query),
                    Equipment.serial_number.ilike(search_eq_query),
                    Equipment.barcode.ilike(search_eq_query),
                )
            )

        if equipment_id is not None:
            stmt = stmt.where(Booking.equipment_id == equipment_id)

        if booking_status is not None:
            stmt = stmt.where(Booking.booking_status == booking_status)

        if payment_status is not None:
            stmt = stmt.where(Booking.payment_status == payment_status)

        # Apply date range filter (overlap logic)
        if start_date and end_date:
            stmt = stmt.where(
                and_(
                    Booking.start_date <= end_date,
                    Booking.end_date >= start_date,
                )
            )
        elif start_date:
            stmt = stmt.where(Booking.end_date >= start_date)
        elif end_date:
            stmt = stmt.where(Booking.start_date <= end_date)

        return stmt

    async def update(self, instance: Booking) -> Booking:
        """Update booking instance.

        Args:
            instance: Booking instance to update

        Returns:
            Updated booking instance
        """
        try:
            self.session.add(instance)
            await self.session.commit()
            await self.session.refresh(instance)
            return instance
        except Exception as e:
            await self.session.rollback()
            raise e
