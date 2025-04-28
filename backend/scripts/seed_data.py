"""Script to seed database with test data."""

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict

from faker import Faker
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.core.config import settings
from backend.core.logging import configure_logging
from backend.models.booking import Booking, BookingStatus
from backend.models.category import Category
from backend.models.client import Client, ClientStatus
from backend.models.core import Base
from backend.models.equipment import Equipment, EquipmentStatus
from backend.repositories.booking import BookingRepository
from backend.repositories.category import CategoryRepository
from backend.repositories.client import ClientRepository
from backend.repositories.equipment import EquipmentRepository
from backend.schemas import PaymentStatus
from backend.services.barcode import BarcodeService

# Initialize Faker with Russian locale
fake = Faker('ru_RU')


async def create_categories(session: AsyncSession) -> Dict[str, int]:
    """Create categories in the database.

    Args:
        session: Database session

    Returns:
        Dictionary mapping category names to category IDs
    """
    repository = CategoryRepository(session)

    # Define categories
    categories = [
        Category(
            name='Cameras',
            description='Video and photo cameras',
        ),
        Category(
            name='Lenses',
            description='Camera lenses',
        ),
        Category(
            name='Lighting',
            description='Lighting equipment',
        ),
        Category(
            name='Audio',
            description='Audio equipment',
        ),
        Category(
            name='Accessories',
            description='Various accessories',
        ),
    ]

    category_ids = {}
    for category in categories:
        # Check if category already exists
        existing = await repository.get_by_name(category.name)
        if existing:
            category_ids[category.name] = existing.id
            continue

        # Create category
        await repository.create(category)
        category_ids[category.name] = category.id

    return category_ids


async def create_subcategories(
    session: AsyncSession,
    category_ids: Dict[str, int],
) -> None:
    """Create subcategories in the database.

    Args:
        session: Database session
        category_ids: Dictionary mapping category names to category IDs
    """
    repository = CategoryRepository(session)

    # Define subcategories with their parent categories
    subcategories = [
        {
            'name': 'DSLR Cameras',
            'description': 'Digital SLR cameras',
            'parent_id': category_ids['Cameras'],
        },
        {
            'name': 'Cinema Cameras',
            'description': 'Professional cinema cameras',
            'parent_id': category_ids['Cameras'],
        },
        {
            'name': 'Prime Lenses',
            'description': 'Fixed focal length lenses',
            'parent_id': category_ids['Lenses'],
        },
        {
            'name': 'Zoom Lenses',
            'description': 'Variable focal length lenses',
            'parent_id': category_ids['Lenses'],
        },
        {
            'name': 'LED Panels',
            'description': 'LED lighting panels',
            'parent_id': category_ids['Lighting'],
        },
        {
            'name': 'Microphones',
            'description': 'Various microphones',
            'parent_id': category_ids['Audio'],
        },
    ]

    for subcat_data in subcategories:
        # Check if subcategory already exists by name
        subcat_name = str(subcat_data['name'])
        existing = await repository.get_by_name(subcat_name)
        if existing:
            logger.info('Subcategory already exists: {}', subcat_name)
            continue

        # Create subcategory
        subcategory = Category(
            name=subcat_data['name'],
            description=subcat_data['description'],
            parent_id=subcat_data['parent_id'],
        )
        await repository.create(subcategory)
        logger.info('Created subcategory: {}', subcategory.name)


async def seed_equipment(
    session: AsyncSession,
    category_ids: Dict[str, int],
) -> None:
    """Create equipment items in the database.

    Args:
        session: Database session
        category_ids: Dictionary mapping category names to category IDs
    """
    repository = EquipmentRepository(session)
    barcode_service = BarcodeService(session)

    # Define equipment
    equipment_items = [
        # Cameras
        {
            'name': 'Sony FX9',
            'description': 'Full-frame 6K sensor cinema camera',
            'category': 'Cameras',
            'serial_number': 'FX9-12345',
            'replacement_cost': 1099999,
            'status': EquipmentStatus.AVAILABLE,
        },
        {
            'name': 'Blackmagic URSA Mini Pro',
            'description': '4.6K Super 35 digital film camera',
            'category': 'Cameras',
            'serial_number': 'URSA-67890',
            'replacement_cost': 599999,
            'status': EquipmentStatus.AVAILABLE,
        },
        # Lenses
        {
            'name': 'Canon EF 24-70mm f/2.8L II USM',
            'description': 'Standard zoom lens for Canon EF mount',
            'category': 'Lenses',
            'serial_number': 'CN24-70-54321',
            'replacement_cost': 189999,
            'status': EquipmentStatus.AVAILABLE,
        },
        {
            'name': 'Sony FE 16-35mm f/2.8 GM',
            'description': 'Wide-angle zoom lens for Sony E-mount',
            'category': 'Lenses',
            'serial_number': 'SNY16-35-98765',
            'replacement_cost': 219999,
            'status': EquipmentStatus.AVAILABLE,
        },
        # Lighting
        {
            'name': 'Aputure 300d Mark II',
            'description': 'Daylight LED light with Bowens mount',
            'category': 'Lighting',
            'serial_number': 'AP300D-11111',
            'replacement_cost': 79999,
            'status': EquipmentStatus.AVAILABLE,
        },
        # Audio
        {
            'name': 'Rode NTG5',
            'description': 'Short shotgun microphone',
            'category': 'Audio',
            'serial_number': 'RD-NTG5-22222',
            'replacement_cost': 49999,
            'status': EquipmentStatus.AVAILABLE,
        },
        # Accessories
        {
            'name': 'SmallRig Cage for Sony A7S III',
            'description': 'Camera cage with multiple mounting points',
            'category': 'Accessories',
            'serial_number': 'SR-A7S3-33333',
            'replacement_cost': 14999,
            'status': EquipmentStatus.AVAILABLE,
        },
    ]

    for item in equipment_items:
        # Check if equipment already exists by serial number
        serial_number = str(item['serial_number'])
        existing = await repository.get_by_serial_number(serial_number)
        if existing:
            logger.info('Equipment already exists: {}', item['name'])
            continue

        # Create equipment
        category_name = str(item['category'])
        category_id = category_ids[category_name]

        # Generate barcode
        barcode = await barcode_service.generate_barcode()

        equipment = Equipment(
            name=item['name'],
            description=item['description'],
            category_id=category_id,
            serial_number=serial_number,
            barcode=barcode,
            replacement_cost=item['replacement_cost'],
            status=item['status'],
        )

        await repository.create(equipment)
        logger.info(
            'Created equipment: {} with barcode: {}', equipment.name, equipment.barcode
        )


async def create_clients(session: AsyncSession) -> None:
    """Create clients in the database.

    Args:
        session: Database session
    """
    repository = ClientRepository(session)

    # Define clients
    clients = [
        {
            'name': 'Иван Иванов',
            'email': 'ivan@example.com',
            'phone': '+7 (999) 123-45-67',
            'company': 'ООО "Медиа Продакшн"',
        },
        {
            'name': 'Анна Смирнова',
            'email': 'anna@example.com',
            'phone': '+7 (999) 987-65-43',
            'company': 'Студия "АртФильм"',
        },
        {
            'name': 'Сергей Петров',
            'email': 'sergey@example.com',
            'phone': '+7 (999) 456-78-90',
            'company': 'Независимый режиссер',
        },
    ]

    for client_data in clients:
        # Check if client already exists by email
        existing = await repository.get_by_email(client_data['email'])
        if existing:
            logger.info(
                'Client already exists: {}',
                client_data['name'],
            )
            continue

        # Create client
        client = Client(
            name=client_data['name'],
            email=client_data['email'],
            phone=client_data['phone'],
            company=client_data['company'],
            status=ClientStatus.ACTIVE,
        )
        await repository.create(client)
        logger.info('Created client: {}', client.name)


async def create_bookings(session: AsyncSession) -> None:
    """Create bookings in the database.

    Args:
        session: Database session
    """
    booking_repository = BookingRepository(session)
    equipment_repository = EquipmentRepository(session)
    client_repository = ClientRepository(session)

    # Get first client
    clients = await client_repository.get_all()
    if not clients:
        logger.warning('No clients found, skipping bookings creation')
        return
    client = clients[0]

    # Get first equipment
    equipment_list = await equipment_repository.get_all()
    if not equipment_list:
        logger.warning('No equipment found, skipping bookings creation')
        return
    equipment = equipment_list[0]

    # Create booking for today + 1 day
    today = datetime.now(timezone.utc)
    start_date = today + timedelta(days=1)  # Tomorrow
    end_date = start_date + timedelta(days=3)  # +3 days

    # Check if booking already exists
    bookings = await booking_repository.get_all()
    if bookings:
        logger.info(
            'Booking already exists for client {}',
            client.name,
        )
        return

    # Create booking with equipment
    booking = Booking(
        client_id=client.id,
        equipment_id=equipment.id,
        booking_status=BookingStatus.CONFIRMED,
        payment_status=PaymentStatus.PENDING,
        start_date=start_date,
        end_date=end_date,
        total_amount=Decimal('500.00'),
        deposit_amount=Decimal('100.00'),
    )
    await booking_repository.create(booking)

    logger.info(
        'Created booking for client {} with equipment {}',
        client.name,
        equipment.name,
    )


async def seed_data() -> None:
    """Seed database with test data.

    This function creates all necessary test data for development:
    - Categories
    - Subcategories
    - Equipment
    - Clients
    - Bookings
    """
    # Configure logging
    configure_logging()

    # Create database engine and session
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
    )
    async_session = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    try:
        # Create tables if they don't exist
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Create test data
        async with async_session() as session:
            try:
                # Create categories
                logger.info('Creating categories...')
                category_ids = await create_categories(session)
                logger.info('Successfully created all categories')

                # Create subcategories
                logger.info('Creating subcategories...')
                await create_subcategories(session, category_ids)
                logger.info('Successfully created all subcategories')

                # Create equipment using category IDs
                logger.info('Creating equipment...')
                await seed_equipment(
                    session,
                    category_ids,
                )
                logger.info('Successfully created all equipment')

                # Create clients
                logger.info('Creating clients...')
                await create_clients(session)
                logger.info('Successfully created all clients')

                # Create bookings
                # logger.info('Creating bookings...')
                # await create_bookings(session)
                # logger.info('Successfully created all bookings')

                logger.info('Database seeding completed successfully')
            except Exception as e:
                logger.error('Error seeding database: {}', str(e))
                raise
    finally:
        # Close engine
        await engine.dispose()


if __name__ == '__main__':
    asyncio.run(seed_data())
