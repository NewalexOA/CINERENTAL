"""Unit tests for client service."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.booking import Booking, BookingStatus
from backend.models.category import Category
from backend.models.client import Client, ClientStatus
from backend.models.equipment import Equipment
from backend.services.booking import BookingService
from backend.services.category import CategoryService
from backend.services.client import ClientService
from backend.services.equipment import EquipmentService


class TestClientService:
    """Test cases for ClientService."""

    @pytest.fixture  # type: ignore[misc]
    async def service(self, db_session: AsyncSession) -> ClientService:
        """Create ClientService instance."""
        return ClientService(db_session)

    @pytest.fixture  # type: ignore[misc]
    async def client(self, service: ClientService) -> Client:
        """Create test client."""
        return await service.create_client(
            first_name='John',
            last_name='Doe',
            email='john.doe@example.com',
            phone='+1234567890',
            passport_number='AB123456',
            address='123 Test St',
            company='Test Company',
            notes='Test client',
        )

    @pytest.fixture  # type: ignore[misc]
    async def category(self, db_session: AsyncSession) -> Category:
        """Create test category."""
        category_service = CategoryService(db_session)
        return await category_service.create_category(
            name='Test Category',
            description='Test Description',
        )

    @pytest.fixture  # type: ignore[misc]
    async def equipment(
        self, db_session: AsyncSession, category: Category
    ) -> Equipment:
        """Create test equipment."""
        equipment_service = EquipmentService(db_session)
        return await equipment_service.create_equipment(
            name='Test Equipment',
            category_id=category.id,
            description='Test Description',
            serial_number='TEST001',
            barcode='TEST001',
            daily_rate=100.0,
            replacement_cost=1000.0,
        )

    @pytest.fixture  # type: ignore[misc]
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
        total_amount = float(300.00)  # 3 days * 100.00 daily rate
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

    async def test_create_client(self, service: ClientService) -> None:
        """Test client creation."""
        # Create client
        client = await service.create_client(
            first_name='Jane',
            last_name='Smith',
            email='jane.smith@example.com',
            phone='+0987654321',
            passport_number='CD789012',
            address='456 Test Ave',
            company='Another Company',
            notes='Another client',
        )

        # Check client properties
        assert client.first_name == 'Jane'
        assert client.last_name == 'Smith'
        assert client.email == 'jane.smith@example.com'
        assert client.phone == '+0987654321'
        assert client.passport_number == 'CD789012'
        assert client.address == '456 Test Ave'
        assert client.company == 'Another Company'
        assert client.notes == 'Another client'
        assert client.status == ClientStatus.ACTIVE

        # Try to create client with existing email
        with pytest.raises(ValueError, match='Client with email .* already exists'):
            await service.create_client(
                first_name='Jane',
                last_name='Smith',
                email='jane.smith@example.com',  # Same email
                phone='+1111111111',  # Different phone
                passport_number='EF345678',
                address='789 Test Blvd',
            )

        # Try to create client with existing phone
        with pytest.raises(ValueError, match='Client with phone .* already exists'):
            await service.create_client(
                first_name='Jane',
                last_name='Smith',
                email='other.email@example.com',  # Different email
                phone='+0987654321',  # Same phone
                passport_number='EF345678',
                address='789 Test Blvd',
            )

    async def test_get_client(self, service: ClientService, client: Client) -> None:
        """Test getting a client by ID."""
        # Get the client
        result = await service.get_client(client.id)

        # Check that the client was retrieved correctly
        assert result is not None
        assert result.id == client.id
        assert result.first_name == client.first_name
        assert result.last_name == client.last_name
        assert result.email == client.email
        assert result.phone == client.phone
        assert result.passport_number == client.passport_number
        assert result.address == client.address
        assert result.company == client.company
        assert result.notes == client.notes
        assert result.status == client.status

        # Test getting a non-existent client
        result = await service.get_client(999)
        assert result is None

    async def test_update_client(self, service: ClientService, client: Client) -> None:
        """Test updating a client."""
        # Update client details
        updated = await service.update_client(
            client.id,
            first_name='John Updated',
            last_name='Doe Updated',
            email='john.updated@example.com',
            phone='+9999999999',
            passport_number='XY987654',
            address='321 Updated St',
            company='Updated Company',
            notes='Updated notes',
        )

        # Check that the client was updated correctly
        assert updated is not None
        assert updated.id == client.id
        assert updated.first_name == 'John Updated'
        assert updated.last_name == 'Doe Updated'
        assert updated.email == 'john.updated@example.com'
        assert updated.phone == '+9999999999'
        assert updated.passport_number == 'XY987654'
        assert updated.address == '321 Updated St'
        assert updated.company == 'Updated Company'
        assert updated.notes == 'Updated notes'

        # Try to update to existing email
        other_client = await service.create_client(
            first_name='Other',
            last_name='Client',
            email='other@example.com',
            phone='+8888888888',
            passport_number='ZZ111111',
            address='888 Other St',
        )

        with pytest.raises(ValueError, match='Client with email .* already exists'):
            await service.update_client(
                other_client.id,
                email='john.updated@example.com',  # Email of first client
            )

        # Try to update to existing phone
        with pytest.raises(ValueError, match='Client with phone .* already exists'):
            await service.update_client(
                other_client.id,
                phone='+9999999999',  # Phone of first client
            )

        # Test updating non-existent client
        result = await service.update_client(999, first_name='Non-existent')
        assert result is None

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
        result = await service.change_status(999, ClientStatus.BLOCKED)
        assert result is None

    async def test_get_clients(self, service: ClientService, client: Client) -> None:
        """Test getting all clients."""
        # Get all clients
        clients = await service.get_clients()

        # Check that the list contains our client
        assert len(clients) >= 1
        assert any(c.id == client.id for c in clients)

        # Create another client
        other_client = await service.create_client(
            first_name='Other',
            last_name='Client',
            email='other@example.com',
            phone='+8888888888',
            passport_number='ZZ111111',
            address='888 Other St',
        )

        # Get all clients again
        clients = await service.get_clients()

        # Check that both clients are in the list
        assert len(clients) >= 2
        assert any(c.id == client.id for c in clients)
        assert any(c.id == other_client.id for c in clients)

    async def test_search_clients(self, service: ClientService, client: Client) -> None:
        """Test searching clients."""
        # Search by first name
        results = await service.search_clients('John')
        assert len(results) >= 1
        assert any(c.id == client.id for c in results)

        # Search by last name
        results = await service.search_clients('Doe')
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
        # Initially booking is PENDING
        result = await service.get_with_active_bookings(client.id)
        assert result is None

        # Change booking status to ACTIVE
        booking_service = BookingService(db_session)
        await booking_service.change_status(booking.id, BookingStatus.ACTIVE)

        # Now we should get the client
        result = await service.get_with_active_bookings(client.id)
        assert result is not None
        assert result.id == client.id

        # Change booking status back to PENDING
        await booking_service.change_status(booking.id, BookingStatus.PENDING)

        # Test getting non-existent client
        result = await service.get_with_active_bookings(999)
        assert result is None

    async def test_get_with_overdue_bookings(
        self,
        service: ClientService,
        client: Client,
        booking: Booking,
        db_session: AsyncSession,
    ) -> None:
        """Test getting clients with overdue bookings."""
        # Initially booking is not overdue
        clients = await service.get_with_overdue_bookings()
        assert not any(c.id == client.id for c in clients)

        # Make booking overdue
        booking_service = BookingService(db_session)
        past_start = datetime.now(timezone.utc) - timedelta(days=5)
        past_end = datetime.now(timezone.utc) - timedelta(days=2)
        await booking_service.update_booking(
            booking.id,
            start_date=past_start,
            end_date=past_end,
        )
        await booking_service.change_status(booking.id, BookingStatus.ACTIVE)

        # Now we should get the client
        clients = await service.get_with_overdue_bookings()
        assert any(c.id == client.id for c in clients)

        # Reset booking dates and status
        future_start = datetime.now(timezone.utc) + timedelta(days=1)
        future_end = future_start + timedelta(days=3)
        await booking_service.update_booking(
            booking.id,
            start_date=future_start,
            end_date=future_end,
        )
        await booking_service.change_status(booking.id, BookingStatus.PENDING)

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
