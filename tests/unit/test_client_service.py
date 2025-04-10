"""Unit tests for client service."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.exceptions import ConflictError, NotFoundError
from backend.models import (
    Booking,
    Category,
    Client,
    ClientStatus,
    Equipment,
    EquipmentStatus,
    PaymentStatus,
)
from backend.services import BookingService, CategoryService, ClientService
from tests.conftest import async_test


class TestClientService:
    """Test cases for ClientService."""

    @pytest.fixture
    async def service(self, db_session: AsyncSession) -> ClientService:
        """Create ClientService instance."""
        return ClientService(db_session)

    @pytest.fixture
    async def client(self, service: ClientService) -> Client:
        """Create test client."""
        return await service.create_client(
            name='John Doe',
            email='john.doe@example.com',
            phone='+1234567890',
            company='Test Company',
            notes='Test client',
        )

    @pytest.fixture
    async def category(self, db_session: AsyncSession) -> Category:
        """Create test category."""
        category_service = CategoryService(db_session)
        return await category_service.create_category(
            name='Test Category',
            description='Test Description',
        )

    @pytest.fixture
    async def equipment(
        self, db_session: AsyncSession, category: Category
    ) -> Equipment:
        """Create test equipment.

        Args:
            db_session: Database session
            category: Test category

        Returns:
            Created equipment
        """
        equipment = Equipment(
            name='Test Equipment',
            category_id=category.id,
            description='Test Description',
            serial_number='TEST001',
            barcode='TEST001',
            replacement_cost=1000.00,
            status=EquipmentStatus.AVAILABLE,
        )
        db_session.add(equipment)
        await db_session.commit()
        await db_session.refresh(equipment)
        return equipment

    @pytest.fixture
    async def booking(
        self,
        db_session: AsyncSession,
        client: Client,
        equipment: Equipment,
    ) -> Booking:
        """Create test booking."""
        booking_service = BookingService(db_session)
        start_date = datetime.now(timezone.utc) + timedelta(days=1)
        end_date = start_date + timedelta(days=3)
        total_amount = float(300.00)
        deposit_amount = float(200.00)  # 20% of replacement cost

        return await booking_service.create_booking(
            client_id=client.id,
            equipment_id=equipment.id,
            start_date=start_date,
            end_date=end_date,
            total_amount=total_amount,
            deposit_amount=deposit_amount,
            notes='Test booking',
        )

    @async_test
    async def test_create_client(self, service: ClientService) -> None:
        """Test creating a new client."""
        # Create a client
        client = await service.create_client(
            name='John Doe',
            email='john.doe@example.com',
            phone='+0987654321',
            company='Test Inc.',
            notes='Test client',
        )

        assert client.id is not None
        assert client.name == 'John Doe'
        assert client.email == 'john.doe@example.com'
        assert client.phone == '+0987654321'
        assert client.company == 'Test Inc.'
        assert client.notes == 'Test client'
        assert client.status == ClientStatus.ACTIVE

        # Test creating another client
        another_client = await service.create_client(
            name='Jane Smith',
            email='jane.smith@example.com',
            phone='+1111111111',
            company='Another Inc.',
            notes='Another client',
        )

        assert another_client.id is not None
        assert another_client.id != client.id
        assert another_client.name == 'Jane Smith'
        assert another_client.email == 'jane.smith@example.com'
        assert another_client.phone == '+1111111111'
        assert another_client.company == 'Another Inc.'
        assert another_client.notes == 'Another client'
        assert another_client.status == ClientStatus.ACTIVE

        # Create client with existing email (should now succeed)
        duplicate_email_client = await service.create_client(
            name='Jane Smith',
            email='john.doe@example.com',  # Same as first client
            phone='+2222222222',  # Different phone
        )

        assert duplicate_email_client.id is not None
        assert duplicate_email_client.id != client.id
        assert duplicate_email_client.id != another_client.id
        assert duplicate_email_client.email == 'john.doe@example.com'
        assert duplicate_email_client.phone == '+2222222222'

        # Create client with existing phone (should now succeed)
        duplicate_phone_client = await service.create_client(
            name='Jane Smith',
            email='different.email@example.com',  # Different email
            phone='+0987654321',  # Same as first client
        )

        assert duplicate_phone_client.id is not None
        assert duplicate_phone_client.id != client.id
        assert duplicate_phone_client.id != another_client.id
        assert duplicate_phone_client.id != duplicate_email_client.id
        assert duplicate_phone_client.email == 'different.email@example.com'
        assert duplicate_phone_client.phone == '+0987654321'

    async def test_get_client(self, service: ClientService, client: Client) -> None:
        """Test getting a client by ID."""
        # Get the client
        result = await service.get_client(client.id)

        # Check that the client was retrieved correctly
        assert result is not None
        assert result.id == client.id
        assert result.name == client.name
        assert result.email == client.email
        assert result.phone == client.phone
        assert result.company == client.company
        assert result.notes == client.notes
        assert result.status == client.status

        # Test getting a non-existent client
        result = await service.get_client(999)
        assert result is None

    @async_test
    async def test_update_client(self, service: ClientService, client: Client) -> None:
        """Test updating a client."""
        # Update client details
        updated = await service.update_client(
            client.id,
            name='John Doe Updated',
            email='john.updated@example.com',
            phone='+9999999999',
            company='Updated Company',
            notes='Updated notes',
        )

        # Check that the client was updated correctly
        assert updated is not None
        assert updated.id == client.id
        assert updated.name == 'John Doe Updated'
        assert updated.email == 'john.updated@example.com'
        assert updated.phone == '+9999999999'
        assert updated.company == 'Updated Company'
        assert updated.notes == 'Updated notes'

        # Try to update to existing email
        other_client = await service.create_client(
            name='Other Client',
            email='other@example.com',
            phone='+8888888888',
        )

        with pytest.raises(ConflictError, match='Client with email .* already exists'):
            await service.update_client(
                other_client.id,
                email='john.updated@example.com',  # Email of first client
            )

        # Try to update to existing phone
        with pytest.raises(ConflictError, match='Client with phone .* already exists'):
            await service.update_client(
                other_client.id,
                phone='+9999999999',  # Phone of first client
            )

        # Test updating non-existent client
        with pytest.raises(NotFoundError, match='Client with ID 999 not found'):
            await service.update_client(999, name='Non-existent')

    @async_test
    async def test_change_status(self, service: ClientService, client: Client) -> None:
        """Test changing client status."""
        # Change status to BLOCKED
        updated = await service.change_status(client.id, ClientStatus.BLOCKED)
        assert updated is not None
        assert updated.status == ClientStatus.BLOCKED

        # Change status back to ACTIVE
        updated = await service.change_status(client.id, ClientStatus.ACTIVE)
        assert updated is not None
        assert updated.status == ClientStatus.ACTIVE

        # Test changing status of non-existent client
        with pytest.raises(NotFoundError, match='Client with ID 999 not found'):
            await service.change_status(999, ClientStatus.BLOCKED)

    async def test_get_clients(self, service: ClientService, client: Client) -> None:
        """Test getting all clients."""
        # Get all clients
        clients = await service.get_clients()

        # Check that the list contains our client
        assert len(clients) >= 1
        assert any(c.id == client.id for c in clients)

        # Create another client
        other_client = await service.create_client(
            name='Other Client',
            email='other@example.com',
            phone='+8888888888',
            company='Test Company',
            notes='Test client',
        )

        # Get all clients again
        clients = await service.get_clients()

        # Check that both clients are in the list
        assert len(clients) >= 2
        assert any(c.id == client.id for c in clients)
        assert any(c.id == other_client.id for c in clients)

    async def test_search_clients(self, service: ClientService, client: Client) -> None:
        """Test searching clients."""
        # Search by name
        results = await service.search_clients('John')
        assert len(results) >= 1
        assert any(c.id == client.id for c in results)

        # Search by email
        results = await service.search_clients('john.doe@example.com')
        assert len(results) >= 1
        assert any(c.id == client.id for c in results)

        # Search by phone
        results = await service.search_clients('+1234567890')
        assert len(results) >= 1
        assert any(c.id == client.id for c in results)

        # Search with no matches
        results = await service.search_clients('NonExistentClient')
        assert len(results) == 0

    async def test_get_with_active_bookings(
        self,
        service: ClientService,
        client: Client,
        booking: Booking,
        db_session: AsyncSession,
    ) -> None:
        """Test getting client with active bookings."""
        # Initially client has no active bookings
        result = await service.get_with_active_bookings(client.id)
        assert result is not None

        # Set payment status to PAID to validate the booking is fully active
        booking_service = BookingService(db_session)
        await booking_service.update_booking(
            booking_id=booking.id,
            paid_amount=float(booking.total_amount),
        )
        await booking_service.change_payment_status(
            booking_id=booking.id,
            status=PaymentStatus.PAID,
        )

        # Now client should still have active bookings
        result = await service.get_with_active_bookings(client.id)
        assert result is not None
        assert result.id == client.id

    async def test_get_with_overdue_bookings(
        self,
        service: ClientService,
        client: Client,
        booking: Booking,
        db_session: AsyncSession,
    ) -> None:
        """Test getting clients with overdue bookings."""
        # Initially client has no overdue bookings
        clients = await service.get_with_overdue_bookings()
        assert not any(c.id == client.id for c in clients)

        # Set payment status to PAID to make booking fully active
        booking_service = BookingService(db_session)
        await booking_service.update_booking(
            booking_id=booking.id,
            paid_amount=float(booking.total_amount),
        )
        await booking_service.change_payment_status(
            booking_id=booking.id,
            status=PaymentStatus.PAID,
        )

        # Manually set end_date to past date to make it overdue
        booking.end_date = datetime.now(timezone.utc) - timedelta(days=1)
        await booking_service.repository.update(booking)

        # Now client should be in the list of clients with overdue bookings
        clients = await service.get_with_overdue_bookings()
        assert len(clients) >= 1
        assert any(c.id == client.id for c in clients)

    async def test_get_by_status(self, service: ClientService, client: Client) -> None:
        """Test getting clients by status."""
        # Initially client is ACTIVE
        clients = await service.get_by_status(ClientStatus.ACTIVE)
        assert len(clients) >= 1
        assert any(c.id == client.id for c in clients)

        # Change status to BLOCKED
        await service.change_status(client.id, ClientStatus.BLOCKED)
        clients = await service.get_by_status(ClientStatus.BLOCKED)
        assert len(clients) >= 1
        assert any(c.id == client.id for c in clients)

        # Check that client is not in ACTIVE anymore
        clients = await service.get_by_status(ClientStatus.ACTIVE)
        assert not any(c.id == client.id for c in clients)

        # Change status back to ACTIVE
        await service.change_status(client.id, ClientStatus.ACTIVE)
