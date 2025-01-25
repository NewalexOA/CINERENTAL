"""Client service module.

This module implements business logic for managing rental service clients,
including client registration, profile updates, and rental history tracking.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.client import Client, ClientStatus
from backend.repositories.client import ClientRepository


class ClientService:
    """Service for managing clients."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize service.

        Args:
            session: SQLAlchemy async session
        """
        self.session = session
        self.repository = ClientRepository(session)

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
            ValueError: If client with given email or phone already exists
        """
        # Check if client with given email exists
        existing = await self.repository.get_by_email(email)
        if existing:
            msg = f'Client with email {email} already exists'
            raise ValueError(msg)

        # Check if client with given phone exists
        existing = await self.repository.get_by_phone(phone)
        if existing:
            msg = f'Client with phone {phone} already exists'
            raise ValueError(msg)

        return await self.repository.create(
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
    ) -> Optional[Client]:
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
            Updated client if found, None otherwise

        Raises:
            ValueError: If client with given email or phone already exists
        """
        if email is not None:
            existing = await self.repository.get_by_email(email)
            if existing and existing.id != client_id:
                msg = f'Client with email {email} already exists'
                raise ValueError(msg)

        if phone is not None:
            existing = await self.repository.get_by_phone(phone)
            if existing and existing.id != client_id:
                msg = f'Client with phone {phone} already exists'
                raise ValueError(msg)

        update_data: Dict[str, Any] = {}
        if first_name is not None:
            update_data['first_name'] = first_name
        if last_name is not None:
            update_data['last_name'] = last_name
        if email is not None:
            update_data['email'] = email
        if phone is not None:
            update_data['phone'] = phone
        if passport_number is not None:
            update_data['passport_number'] = passport_number
        if address is not None:
            update_data['address'] = address
        if company is not None:
            update_data['company'] = company
        if notes is not None:
            update_data['notes'] = notes

        if update_data:
            return await self.repository.update(client_id, **update_data)
        return await self.repository.get(client_id)

    async def change_status(
        self, client_id: int, status: ClientStatus
    ) -> Optional[Client]:
        """Change client status.

        Args:
            client_id: Client ID
            status: New status

        Returns:
            Updated client if found, None otherwise
        """
        return await self.repository.update(client_id, status=status)

    async def get_clients(self) -> List[Client]:
        """Get all clients.

        Returns:
            List of all clients
        """
        return await self.repository.get_all()

    async def get_client(self, client_id: int) -> Optional[Client]:
        """Get client by ID.

        Args:
            client_id: Client ID

        Returns:
            Client if found, None otherwise
        """
        return await self.repository.get(client_id)

    async def search_clients(self, query: str) -> List[Client]:
        """Search clients by name, email, or phone.

        Args:
            query: Search query

        Returns:
            List of matching clients
        """
        return await self.repository.search(query)

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
