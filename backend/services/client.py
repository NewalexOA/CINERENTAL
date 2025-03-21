"""Client service module.

This module implements business logic for managing rental service clients,
including client registration, profile updates, and rental history tracking.
"""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import ConflictError, NotFoundError, StatusTransitionError
from backend.models import Booking, Client, ClientStatus
from backend.repositories import BookingRepository, ClientRepository


class ClientService:
    """Service for managing clients."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize service.

        Args:
            session: SQLAlchemy async session
        """
        self.session = session
        self.repository = ClientRepository(session)
        self.booking_repository = BookingRepository(session)

    async def create_client(
        self,
        first_name: str,
        last_name: str,
        email: str,
        phone: str,
        passport_number: str,
        address: str,
        company: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Client:
        """Create new client.

        Args:
            first_name: Client's first name
            last_name: Client's last name
            email: Client's email
            phone: Client's phone number
            passport_number: Client's passport number
            address: Client's address
            company: Client's company name (optional)
            notes: Additional notes (optional)

        Returns:
            Created client

        Raises:
            ConflictError: If client with given email or phone already exists
            ValidationError: If validation fails
        """
        # Check if client with given email exists
        existing = await self.repository.get_by_email(email)
        if existing:
            raise ConflictError(
                f'Client with email {email} already exists', {'email': email}
            )

        # Check if client with given phone exists
        existing = await self.repository.get_by_phone(phone)
        if existing:
            raise ConflictError(
                f'Client with phone {phone} already exists', {'phone': phone}
            )

        client = Client(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            passport_number=passport_number,
            address=address,
            company=company,
            notes=notes,
            status=ClientStatus.ACTIVE,
        )
        return await self.repository.create(client)

    async def update_client(
        self,
        client_id: int,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        passport_number: Optional[str] = None,
        address: Optional[str] = None,
        company: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Client:
        """Update client details.

        Args:
            client_id: Client ID
            first_name: New first name (optional)
            last_name: New last name (optional)
            email: New email (optional)
            phone: New phone number (optional)
            passport_number: New passport number (optional)
            address: New address (optional)
            company: New company name (optional)
            notes: New notes (optional)

        Returns:
            Updated client

        Raises:
            NotFoundError: If client not found
            ConflictError: If new email/phone already exists
            ValidationError: If validation fails
        """
        # Get client
        client = await self.repository.get(client_id)
        if not client:
            raise NotFoundError(
                f'Client with ID {client_id} not found', {'client_id': client_id}
            )

        # Check if new email is unique
        if email and email != client.email:
            existing = await self.repository.get_by_email(email)
            if existing:
                raise ConflictError(
                    f'Client with email {email} already exists', {'email': email}
                )

        # Check if new phone is unique
        if phone and phone != client.phone:
            existing = await self.repository.get_by_phone(phone)
            if existing:
                raise ConflictError(
                    f'Client with phone {phone} already exists', {'phone': phone}
                )

        # Update fields
        if first_name is not None:
            client.first_name = first_name
        if last_name is not None:
            client.last_name = last_name
        if email is not None:
            client.email = email
        if phone is not None:
            client.phone = phone
        if passport_number is not None:
            client.passport_number = passport_number
        if address is not None:
            client.address = address
        if company is not None:
            client.company = company
        if notes is not None:
            client.notes = notes

        return await self.repository.update(client)

    async def change_status(self, client_id: int, status: ClientStatus) -> Client:
        """Change client status.

        Args:
            client_id: Client ID
            status: New status

        Returns:
            Updated client

        Raises:
            NotFoundError: If client not found
            StatusTransitionError: If status transition is invalid
        """
        # Get client
        client = await self.repository.get(client_id)
        if not client:
            raise NotFoundError(
                f'Client with ID {client_id} not found', {'client_id': client_id}
            )

        # Check if client has active bookings when trying to block or archive
        if status in (ClientStatus.BLOCKED, ClientStatus.ARCHIVED):
            active_bookings = await self.booking_repository.get_active_by_client(
                client_id
            )
            if active_bookings:
                raise StatusTransitionError(
                    'Cannot change client status while they have active bookings',
                    current_status=str(client.status),
                    new_status=str(status),
                    details={'active_bookings': [b.id for b in active_bookings]},
                )

        # Update status
        client.status = status
        return await self.repository.update(client)

    async def get_clients(self) -> List[Client]:
        """Get all clients.

        Returns:
            List of all clients
        """
        return await self.repository.get_all()

    async def get_client(
        self,
        client_id: int,
        include_deleted: bool = False,
    ) -> Optional[Client]:
        """Get client by ID.

        Args:
            client_id: Client ID
            include_deleted: Whether to include deleted clients

        Returns:
            Client if found, None otherwise
        """
        return await self.repository.get(client_id, include_deleted=include_deleted)

    async def search_clients(
        self,
        query: str,
        include_deleted: bool = False,
    ) -> List[Client]:
        """Search clients by name, email, or phone.

        Args:
            query: Search query
            include_deleted: Whether to include deleted clients

        Returns:
            List of matching clients
        """
        return await self.repository.search(query, include_deleted=include_deleted)

    async def get_with_active_bookings(self, client_id: int) -> Optional[Client]:
        """Get client with active bookings.

        Args:
            client_id: Client ID

        Returns:
            Client with active bookings if found, None otherwise
        """
        return await self.repository.get_with_active_bookings(client_id)

    async def get_with_overdue_bookings(self) -> List[Client]:
        """Get clients with overdue bookings.

        Returns:
            List of clients with overdue bookings
        """
        return await self.repository.get_with_overdue_bookings()

    async def get_by_status(self, status: ClientStatus) -> List[Client]:
        """Get clients by status.

        Args:
            status: Client status

        Returns:
            List of clients with specified status
        """
        return await self.repository.get_by_status(status)

    async def get_client_bookings(self, client_id: int) -> list[Booking]:
        """Get all bookings for a client.

        Args:
            client_id: ID of the client.

        Returns:
            List of bookings.

        Raises:
            ClientNotFoundError: If client not found.
        """
        client = await self.repository.get(client_id)
        if not client:
            raise NotFoundError(
                f'Client with ID {client_id} not found', {'client_id': client_id}
            )
        return await self.booking_repository.get_by_client(client.id)

    async def delete_client(self, client_id: int) -> None:
        """Soft delete client.

        Args:
            client_id: Client ID

        Raises:
            ValueError: If client not found or has active bookings
        """
        # Get client
        client = await self.repository.get(client_id)
        if not client:
            msg = f'Client with ID {client_id} not found'
            raise ValueError(msg)

        # Check for active bookings
        active_bookings = await self.booking_repository.get_active_by_client(client_id)
        if active_bookings:
            raise ValueError('Cannot delete client with active bookings')

        # Set deleted_at timestamp
        client.deleted_at = datetime.now(timezone.utc)
        await self.repository.update(client)

    async def search(
        self,
        query: str,
        include_deleted: bool = False,
    ) -> List[Client]:
        """Search clients by name, email or phone.

        Args:
            query: Search query
            include_deleted: Whether to include deleted clients

        Returns:
            List of matching clients
        """
        return await self.repository.search(query, include_deleted=include_deleted)

    async def deactivate(self, client_id: int) -> Client:
        """Deactivate a client.

        Args:
            client_id: ID of the client to deactivate

        Returns:
            Updated client

        Raises:
            ClientNotFoundError: If client not found
        """
        client = await self.repository.get(client_id)
        if not client:
            raise NotFoundError(
                f'Client with ID {client_id} not found', {'client_id': client_id}
            )
        client.status = ClientStatus.BLOCKED
        return await self.repository.update(client)
