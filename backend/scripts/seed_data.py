"""Script to seed database with test data."""

import argparse
import asyncio
import json
import shutil
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.core.config import settings
from backend.core.logging import configure_logging
from backend.models.booking import Booking, BookingStatus
from backend.models.category import Category
from backend.models.client import Client, ClientStatus
from backend.models.core import Base
from backend.models.equipment import Equipment, EquipmentStatus
from backend.models.project import Project, ProjectStatus
from backend.repositories.booking import BookingRepository
from backend.repositories.category import CategoryRepository
from backend.repositories.client import ClientRepository
from backend.repositories.equipment import EquipmentRepository
from backend.repositories.project import ProjectRepository
from backend.schemas import PaymentStatus
from backend.services.barcode import BarcodeService


async def load_extended_data_from_json(session: AsyncSession) -> None:
    """Load extended production data from JSON file."""
    extended_data_path = Path(__file__).parent / 'extended_data.json'

    # Check if data already loaded (file was renamed)
    loaded_data_path = Path(__file__).parent / 'extended_data_loaded.json'

    if loaded_data_path.exists() and not extended_data_path.exists():
        logger.info(
            'Extended data already loaded (found {}, no {}). Skipping.',
            loaded_data_path.name,
            extended_data_path.name,
        )
        return

    if not extended_data_path.exists():
        logger.warning('Extended data file not found: {}', extended_data_path)
        return

    logger.info('Loading production data from {}', extended_data_path)

    with open(extended_data_path, 'r', encoding='utf-8') as file:
        data = json.load(file)

    # Load categories and create ID mapping
    category_id_mapping = await load_categories_from_json(
        session, data.get('categories', [])
    )

    # Load clients and create ID mapping
    client_id_mapping = await load_clients_from_json(session, data.get('clients', []))

    # Load projects and create ID mapping
    project_id_mapping = await load_projects_from_json(
        session, data.get('projects', []), client_id_mapping
    )

    # Load equipment and create ID mapping
    equipment_id_mapping = await load_equipment_from_json(
        session, data.get('equipment', []), category_id_mapping
    )

    # Load bookings
    await load_bookings_from_json(
        session,
        data.get('bookings', []),
        client_id_mapping,
        project_id_mapping,
        equipment_id_mapping,
    )

    # After successful loading, rename the file to prevent re-loading
    try:
        shutil.move(str(extended_data_path), str(loaded_data_path))
        logger.info(
            'Extended data file renamed from {} to {} to prevent re-loading',
            extended_data_path.name,
            loaded_data_path.name,
        )
    except Exception as e:
        logger.warning(
            'Failed to rename extended data file: {}. '
            'Data may be loaded again on next run.',
            e,
        )

    logger.info('Production data loaded successfully')


async def load_categories_from_json(
    session: AsyncSession,
    categories_data: List[Dict[str, Any]],
) -> Dict[int, int]:
    """Load categories from JSON data with proper hierarchical ordering.

    Returns:
        Dict mapping old category IDs to new category IDs
    """
    repository = CategoryRepository(session)

    # Create mapping for old IDs to new IDs
    id_mapping = {}

    # Phase 1: Create root categories (parent_id is None)
    root_categories = [cat for cat in categories_data if cat.get('parent_id') is None]

    for cat_data in root_categories:
        # Check if category already exists
        existing = await repository.get_by_name(cat_data['name'])
        if existing:
            logger.info('Category already exists: {}', cat_data['name'])
            id_mapping[cat_data['id']] = existing.id
            continue

        category = Category(
            name=cat_data['name'],
            description=cat_data['description'],
            parent_id=None,
            show_in_print_overview=cat_data.get('show_in_print_overview', True),
        )
        created_category = await repository.create(category)
        id_mapping[cat_data['id']] = created_category.id
        logger.info('Created root category: {}', category.name)

    # Phase 2: Create child categories in multiple passes
    child_categories = [
        cat for cat in categories_data if cat.get('parent_id') is not None
    ]
    remaining_categories = child_categories.copy()
    max_iterations = len(child_categories) + 1  # Prevent infinite loops
    iteration = 0

    while remaining_categories and iteration < max_iterations:
        iteration += 1
        categories_created_this_iteration = []

        for cat_data in remaining_categories:
            old_parent_id = cat_data['parent_id']

            # Check if parent category has been created (exists in mapping)
            if old_parent_id in id_mapping:
                # Check if category already exists
                existing = await repository.get_by_name(cat_data['name'])
                if existing:
                    logger.info('Category already exists: {}', cat_data['name'])
                    id_mapping[cat_data['id']] = existing.id
                    categories_created_this_iteration.append(cat_data)
                    continue

                category = Category(
                    name=cat_data['name'],
                    description=cat_data['description'],
                    parent_id=id_mapping[old_parent_id],
                    show_in_print_overview=cat_data.get('show_in_print_overview', True),
                )
                created_category = await repository.create(category)
                id_mapping[cat_data['id']] = created_category.id
                categories_created_this_iteration.append(cat_data)
                logger.info(
                    'Created child category: {} (parent: {})',
                    category.name,
                    old_parent_id,
                )

        # Remove successfully created categories from remaining list
        for created_cat in categories_created_this_iteration:
            remaining_categories.remove(created_cat)

        # If no categories were created in this iteration,
        # log remaining problematic ones
        if not categories_created_this_iteration and remaining_categories:
            logger.warning(
                'Could not create {} categories due to missing parents:',
                len(remaining_categories),
            )
            for cat_data in remaining_categories:
                logger.warning(
                    '  - "{}" (parent_id: {})', cat_data['name'], cat_data['parent_id']
                )
            break

    logger.info(
        'Category loading completed. Created mapping for {} categories', len(id_mapping)
    )
    return id_mapping


async def load_clients_from_json(
    session: AsyncSession,
    clients_data: List[Dict[str, Any]],
) -> Dict[int, int]:
    """Load clients from JSON data."""
    repository = ClientRepository(session)

    id_mapping = {}

    for client_data in clients_data:
        # Check if client already exists by email
        existing = await repository.get_by_email(client_data['email'])
        if existing:
            logger.info('Client already exists: {}', client_data['name'])
            id_mapping[client_data['id']] = existing.id
            continue

        client = Client(
            name=client_data['name'],
            email=client_data['email'],
            phone=client_data['phone'],
            company=client_data.get('company'),
            status=getattr(ClientStatus, client_data['status'], ClientStatus.ACTIVE),
            notes=client_data.get('notes'),
        )
        await repository.create(client)
        logger.info('Created client: {}', client.name)
        id_mapping[client_data['id']] = client.id

    return id_mapping


async def load_equipment_from_json(
    session: AsyncSession,
    equipment_data: List[Dict[str, Any]],
    category_id_mapping: Dict[int, int],
) -> Dict[int, int]:
    """Load equipment from JSON data."""
    repository = EquipmentRepository(session)
    equipment_id_mapping: Dict[int, int] = {}

    for eq_data in equipment_data:
        # Skip equipment with unknown category references
        old_category_id = eq_data['category_id']
        if old_category_id not in category_id_mapping:
            logger.warning(
                'Equipment "{}" references unknown category_id: {}. Skipping.',
                eq_data.get('name', 'Unknown'),
                old_category_id,
            )
            continue

        # Check if equipment already exists by barcode
        barcode = eq_data['barcode']
        logger.debug('Searching for existing equipment with barcode: {}', barcode)
        existing_equipment = await repository.get_by_barcode(barcode)

        if existing_equipment:
            logger.info(
                'Equipment already exists: {} (barcode: {})', eq_data['name'], barcode
            )
            equipment_id_mapping[eq_data['id']] = existing_equipment.id
            continue
        else:
            logger.debug('No existing equipment found for barcode: {}', barcode)

        # Get equipment status with safe fallback
        equipment_status = getattr(
            EquipmentStatus, eq_data['status'], EquipmentStatus.AVAILABLE
        )

        # Create new equipment
        equipment = Equipment(
            name=eq_data['name'],
            description=eq_data.get('description'),
            serial_number=eq_data.get('serial_number'),
            barcode=eq_data['barcode'],
            category_id=category_id_mapping[old_category_id],
            status=equipment_status,
            replacement_cost=eq_data.get('replacement_cost', 0),
        )

        created_equipment = await repository.create(equipment)
        equipment_id_mapping[eq_data['id']] = created_equipment.id

        logger.info('Created equipment: {}', eq_data['name'])

    logger.info(
        'Equipment loading completed. Created mapping for {} equipment',
        len(equipment_id_mapping),
    )
    return equipment_id_mapping


async def load_projects_from_json(
    session: AsyncSession,
    projects_data: List[Dict[str, Any]],
    client_id_mapping: Dict[int, int],
) -> Dict[int, int]:
    """Load projects from JSON data."""
    repository = ProjectRepository(session)

    id_mapping = {}

    for proj_data in projects_data:
        # Skip projects with missing client references
        if proj_data['client_id'] not in client_id_mapping:
            logger.warning(
                'Project "{}" references unknown client_id: {}. Skipping.',
                proj_data.get('name', 'Unknown'),
                proj_data['client_id'],
            )
            continue

        existing_projects = await repository.get_all()
        if any(p.name == proj_data['name'] for p in existing_projects):
            logger.info('Project already exists: {}', proj_data['name'])
            # Find the existing project with matching name
            existing_project = next(
                p for p in existing_projects if p.name == proj_data['name']
            )
            id_mapping[proj_data['id']] = existing_project.id
            continue

        project = Project(
            name=proj_data['name'],
            client_id=client_id_mapping[proj_data['client_id']],
            start_date=(
                datetime.fromisoformat(proj_data['start_date'])
                if proj_data['start_date']
                else None
            ),
            end_date=(
                datetime.fromisoformat(proj_data['end_date'])
                if proj_data['end_date']
                else None
            ),
            status=getattr(ProjectStatus, proj_data['status'], ProjectStatus.DRAFT),
            description=proj_data.get('description'),
            notes=proj_data.get('notes'),
        )
        await repository.create(project)
        logger.info('Created project: {}', project.name)
        id_mapping[proj_data['id']] = project.id

    logger.info(
        'Project loading completed. Created mapping for {} projects', len(id_mapping)
    )
    return id_mapping


async def load_bookings_from_json(
    session: AsyncSession,
    bookings_data: List[Dict[str, Any]],
    client_id_mapping: Dict[int, int],
    project_id_mapping: Dict[int, int],
    equipment_id_mapping: Dict[int, int],
) -> None:
    """Load bookings from JSON data."""
    repository = BookingRepository(session)

    for booking_data in bookings_data:
        # Skip bookings with missing references
        if (
            booking_data['client_id'] not in client_id_mapping
            or booking_data['equipment_id'] not in equipment_id_mapping
        ):
            logger.warning(
                'Booking references unknown client_id: {} or equipment_id: {}. '
                'Skipping.',
                booking_data['client_id'],
                booking_data['equipment_id'],
            )
            continue

        # Map old IDs to new IDs
        mapped_client_id = client_id_mapping[booking_data['client_id']]
        mapped_equipment_id = equipment_id_mapping[booking_data['equipment_id']]

        # Handle project_id mapping safely
        project_id = booking_data.get('project_id')
        mapped_project_id = project_id_mapping.get(project_id) if project_id else None

        # Parse dates first for availability check
        try:
            start_date = datetime.fromisoformat(booking_data['start_date'])
            end_date = datetime.fromisoformat(booking_data['end_date'])
        except (AttributeError, TypeError, ValueError) as e:
            logger.warning(
                'Failed to parse dates for booking (start: {}, end: {}). '
                'Error: {}. Skipping.',
                booking_data.get('start_date'),
                booking_data.get('end_date'),
                e,
            )
            continue

        # Check equipment availability using proper service layer
        equipment_repository = EquipmentRepository(session)
        is_available = await equipment_repository.check_availability(
            mapped_equipment_id, start_date, end_date
        )

        if not is_available:
            logger.info(
                'Equipment {} is not available for dates {}-{}. '
                'Skipping booking for client {}.',
                mapped_equipment_id,
                start_date.date(),
                end_date.date(),
                mapped_client_id,
            )
            continue

        # Get booking and payment statuses with safe fallbacks
        status_key = booking_data.get('booking_status', 'ACTIVE')
        booking_status = getattr(BookingStatus, status_key, BookingStatus.ACTIVE)

        payment_key = booking_data.get('payment_status', 'PENDING')
        payment_status = getattr(PaymentStatus, payment_key, PaymentStatus.PENDING)

        # Create booking
        booking = Booking(
            client_id=mapped_client_id,
            equipment_id=mapped_equipment_id,
            project_id=mapped_project_id,
            start_date=start_date,
            end_date=end_date,
            booking_status=booking_status,
            total_amount=Decimal(
                str(booking_data.get('total_amount', booking_data.get('total_cost', 0)))
            ),
            deposit_amount=Decimal(str(booking_data.get('deposit_amount', 0))),
            notes=booking_data.get('notes'),
            payment_status=payment_status,
        )

        await repository.create(booking)
        logger.info(
            'Created booking for equipment {} (client {})',
            mapped_equipment_id,
            mapped_client_id,
        )


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
            status=getattr(ClientStatus, client_data['status'], ClientStatus.ACTIVE),
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


async def seed_data(use_extended_data: bool = False) -> None:
    """Seed database with test data.

    Args:
        use_extended_data: If True, load extended data from JSON file

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

        # Load data
        async with async_session() as session:
            try:
                if use_extended_data:
                    # Load extended data from JSON
                    logger.info('Loading extended data...')
                    await load_extended_data_from_json(session)
                    logger.info('Extended data loaded successfully')
                else:
                    # Create test data (original logic)
                    logger.info('Creating test data...')

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
                    await seed_equipment(session, category_ids)
                    logger.info('Successfully created all equipment')

                    # Create clients
                    logger.info('Creating clients...')
                    await create_clients(session)
                    logger.info('Successfully created all clients')

                    logger.info('Test data seeding completed successfully')

            except Exception as e:
                logger.error('Error seeding database: {}', str(e))
                raise
    finally:
        # Close engine
        await engine.dispose()


def main() -> None:
    """Main function with CLI argument parsing."""
    parser = argparse.ArgumentParser(
        description='Seed database with test or production data'
    )
    parser.add_argument(
        '--extended-data',
        action='store_true',
        help='Load extended data instead of basic test data',
    )

    args = parser.parse_args()

    asyncio.run(seed_data(use_extended_data=args.extended_data))


if __name__ == '__main__':
    main()
