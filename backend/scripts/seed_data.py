"""Script for seeding test data into the database."""

import asyncio
import logging
from decimal import Decimal

from faker import Faker
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import AsyncSessionLocal
from backend.core.logging import configure_logging
from backend.models import Category, Client, ClientStatus, Equipment, EquipmentStatus
from backend.repositories import (
    CategoryRepository,
    ClientRepository,
    EquipmentRepository,
)

logger = logging.getLogger(__name__)

# Initialize Faker with Russian locale
fake = Faker('ru_RU')


async def create_categories(session: AsyncSession) -> dict[str, int]:
    """Create test categories.

    Args:
        session: Database session

    Returns:
        Dictionary mapping category names to their IDs
    """
    repository = CategoryRepository(session)
    categories = [
        Category(
            name='Cameras',
            description='Professional video cameras for any shooting scenario',
        ),
        Category(
            name='Lenses',
            description='Wide range of professional cinema lenses',
        ),
        Category(
            name='Lighting',
            description='Professional lighting equipment for studio and location',
        ),
        Category(
            name='Audio',
            description='Professional audio recording and monitoring equipment',
        ),
        Category(
            name='Stabilization',
            description='Camera stabilization systems and gimbals',
        ),
        Category(
            name='Monitors',
            description='Professional on-camera and studio monitors',
        ),
        Category(
            name='Power',
            description='Batteries, chargers and power distribution',
        ),
        Category(
            name='Storage',
            description='Memory cards, SSDs and storage solutions',
        ),
        Category(
            name='Grip',
            description='Camera support, dollies, and grip equipment',
        ),
        Category(
            name='Accessories',
            description='Various filming accessories and support gear',
        ),
    ]

    category_ids = {}
    for category in categories:
        # Check if category already exists
        existing_category = await repository.get_by_name(category.name)
        if existing_category:
            logger.info('Category already exists: %s', category.name)
            category_ids[category.name] = existing_category.id
            continue

        # Create new category if it doesn't exist
        db_category = await repository.create(category)
        category_ids[db_category.name] = db_category.id
        logger.info('Created category: %s', db_category.name)

    return category_ids


async def create_equipment(
    session: AsyncSession,
    category_ids: dict[str, int],
) -> None:
    """Create test equipment.

    Args:
        session: Database session
        category_ids: Dictionary mapping category names to their IDs
    """
    repository = EquipmentRepository(session)
    equipment = [
        # Cameras
        Equipment(
            name='Sony PXW-FX9',
            description='Full-frame professional camcorder with 6K sensor',
            serial_number='FX9001',
            barcode='CAM001',
            category_id=category_ids['Cameras'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('500.00'),
            replacement_cost=Decimal('15000.00'),
            notes='6K full-frame sensor, Dual ISO',
        ),
        Equipment(
            name='RED KOMODO 6K',
            description='Compact digital cinema camera',
            serial_number='RED001',
            barcode='CAM002',
            category_id=category_ids['Cameras'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('600.00'),
            replacement_cost=Decimal('20000.00'),
            notes='Super 35mm sensor, RF mount',
        ),
        Equipment(
            name='ARRI ALEXA Mini LF',
            description='Large format cinema camera',
            serial_number='ALX001',
            barcode='CAM003',
            category_id=category_ids['Cameras'],
            status=EquipmentStatus.RENTED,
            daily_rate=Decimal('1200.00'),
            replacement_cost=Decimal('85000.00'),
            notes='4.5K large format sensor',
        ),
        Equipment(
            name='Blackmagic URSA Mini Pro 12K',
            description='High resolution digital film camera',
            serial_number='BMP001',
            barcode='CAM004',
            category_id=category_ids['Cameras'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('400.00'),
            replacement_cost=Decimal('12000.00'),
            notes='12K resolution, Super35',
        ),
        Equipment(
            name='Canon C500 Mark II',
            description='Full-frame cinema camera',
            serial_number='C500001',
            barcode='CAM005',
            category_id=category_ids['Cameras'],
            status=EquipmentStatus.MAINTENANCE,
            daily_rate=Decimal('450.00'),
            replacement_cost=Decimal('16000.00'),
            notes='5.9K full-frame sensor',
        ),
        # Lenses
        Equipment(
            name='Canon CN-E 50mm T1.3',
            description='Cinema prime lens',
            serial_number='CNE001',
            barcode='LENS001',
            category_id=category_ids['Lenses'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('100.00'),
            replacement_cost=Decimal('4000.00'),
            notes='EF mount, manual focus',
        ),
        Equipment(
            name='ZEISS Supreme Prime 85mm T1.5',
            description='High-end cinema prime lens',
            serial_number='ZSP001',
            barcode='LENS002',
            category_id=category_ids['Lenses'],
            status=EquipmentStatus.MAINTENANCE,
            daily_rate=Decimal('150.00'),
            replacement_cost=Decimal('5000.00'),
            notes='PL mount, supreme series',
        ),
        Equipment(
            name='ARRI Signature Prime 40mm T1.8',
            description='Premium cinema prime lens',
            serial_number='ASP001',
            barcode='LENS003',
            category_id=category_ids['Lenses'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('200.00'),
            replacement_cost=Decimal('7000.00'),
            notes='LPL mount, signature series',
        ),
        Equipment(
            name='Angenieux EZ-1 30-90mm T2.0',
            description='Cinema zoom lens',
            serial_number='ANGEZ001',
            barcode='LENS004',
            category_id=category_ids['Lenses'],
            status=EquipmentStatus.RENTED,
            daily_rate=Decimal('250.00'),
            replacement_cost=Decimal('9000.00'),
            notes='Super35 zoom lens',
        ),
        Equipment(
            name='Fujinon Premista 28-100mm T2.9',
            description='Large format zoom lens',
            serial_number='FUJ001',
            barcode='LENS005',
            category_id=category_ids['Lenses'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('300.00'),
            replacement_cost=Decimal('12000.00'),
            notes='Large format zoom',
        ),
        # Lighting
        Equipment(
            name='ARRI SkyPanel S60-C',
            description='LED soft light panel',
            serial_number='SP60001',
            barcode='LIGHT001',
            category_id=category_ids['Lighting'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('200.00'),
            replacement_cost=Decimal('6000.00'),
            notes='RGB+W LED panel',
        ),
        Equipment(
            name='Aputure 600d Pro',
            description='LED spotlight',
            serial_number='AP600001',
            barcode='LIGHT002',
            category_id=category_ids['Lighting'],
            status=EquipmentStatus.RENTED,
            daily_rate=Decimal('150.00'),
            replacement_cost=Decimal('2000.00'),
            notes='Daylight LED',
        ),
        Equipment(
            name='ARRI M18',
            description='HMI light',
            serial_number='M18001',
            barcode='LIGHT003',
            category_id=category_ids['Lighting'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('180.00'),
            replacement_cost=Decimal('8000.00'),
            notes='1800W HMI fresnel',
        ),
        Equipment(
            name='Litepanels Gemini 2x1',
            description='RGBWW LED panel',
            serial_number='GEM001',
            barcode='LIGHT004',
            category_id=category_ids['Lighting'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('160.00'),
            replacement_cost=Decimal('4500.00'),
            notes='Soft RGBWW panel',
        ),
        Equipment(
            name='Quasar Science Rainbow 2',
            description='RGBX LED tube',
            serial_number='QS001',
            barcode='LIGHT005',
            category_id=category_ids['Lighting'],
            status=EquipmentStatus.MAINTENANCE,
            daily_rate=Decimal('50.00'),
            replacement_cost=Decimal('800.00'),
            notes='4ft LED tube',
        ),
        # Audio
        Equipment(
            name='Sennheiser MKH 416',
            description='Shotgun microphone',
            serial_number='MKH001',
            barcode='AUDIO001',
            category_id=category_ids['Audio'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('50.00'),
            replacement_cost=Decimal('1000.00'),
            notes='Short shotgun mic',
        ),
        Equipment(
            name='Sound Devices MixPre-10 II',
            description='Portable audio recorder',
            serial_number='MP10001',
            barcode='AUDIO002',
            category_id=category_ids['Audio'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('100.00'),
            replacement_cost=Decimal('3000.00'),
            notes='32-bit float recording',
        ),
        Equipment(
            name='Lectrosonics DCHR',
            description='Digital wireless receiver',
            serial_number='DCH001',
            barcode='AUDIO003',
            category_id=category_ids['Audio'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('75.00'),
            replacement_cost=Decimal('2000.00'),
            notes='Digital hybrid wireless',
        ),
        Equipment(
            name='Shure SM7B',
            description='Studio vocal microphone',
            serial_number='SM7001',
            barcode='AUDIO004',
            category_id=category_ids['Audio'],
            status=EquipmentStatus.RENTED,
            daily_rate=Decimal('40.00'),
            replacement_cost=Decimal('400.00'),
            notes='Dynamic vocal mic',
        ),
        Equipment(
            name='DPA 4098',
            description='Supercardioid microphone',
            serial_number='DPA001',
            barcode='AUDIO005',
            category_id=category_ids['Audio'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('60.00'),
            replacement_cost=Decimal('900.00'),
            notes='Gooseneck mic',
        ),
        # Stabilization
        Equipment(
            name='DJI Ronin 2',
            description='Professional gimbal stabilizer',
            serial_number='RON001',
            barcode='STAB001',
            category_id=category_ids['Stabilization'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('200.00'),
            replacement_cost=Decimal('8000.00'),
            notes='Pro gimbal',
        ),
        Equipment(
            name='ARRI Trinity',
            description='Hybrid stabilizer system',
            serial_number='TRI001',
            barcode='STAB002',
            category_id=category_ids['Stabilization'],
            status=EquipmentStatus.RENTED,
            daily_rate=Decimal('500.00'),
            replacement_cost=Decimal('45000.00'),
            notes='Hybrid stabilizer',
        ),
        # Monitors
        Equipment(
            name='SmallHD 702 Touch',
            description='7" on-camera monitor',
            serial_number='SHD001',
            barcode='MON001',
            category_id=category_ids['Monitors'],
            status=EquipmentStatus.BROKEN,
            daily_rate=Decimal('75.00'),
            replacement_cost=Decimal('1500.00'),
            notes='1080p touchscreen',
        ),
        Equipment(
            name='TVLogic LVM-171S',
            description='17" production monitor',
            serial_number='TVM001',
            barcode='MON002',
            category_id=category_ids['Monitors'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('150.00'),
            replacement_cost=Decimal('3500.00'),
            notes='SDI/HDMI monitor',
        ),
        # Power
        Equipment(
            name='Anton Bauer Titon 240',
            description='V-mount battery',
            serial_number='AB001',
            barcode='PWR001',
            category_id=category_ids['Power'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('40.00'),
            replacement_cost=Decimal('500.00'),
            notes='240Wh V-mount',
        ),
        Equipment(
            name='Core SWX NEO-150S',
            description='V-mount battery',
            serial_number='CSW001',
            barcode='PWR002',
            category_id=category_ids['Power'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('35.00'),
            replacement_cost=Decimal('400.00'),
            notes='147Wh V-mount',
        ),
        # Storage
        Equipment(
            name='Angelbird AV Pro CF XT 512GB',
            description='CFast 2.0 memory card',
            serial_number='AGB001',
            barcode='STR001',
            category_id=category_ids['Storage'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('30.00'),
            replacement_cost=Decimal('500.00'),
            notes='CFast 2.0 card',
        ),
        Equipment(
            name='Samsung 870 QVO 2TB',
            description='SSD drive',
            serial_number='SAM001',
            barcode='STR002',
            category_id=category_ids['Storage'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('25.00'),
            replacement_cost=Decimal('200.00'),
            notes='SATA SSD',
        ),
        # Grip
        Equipment(
            name='Matthews C-Stand',
            description='40" C-Stand with Grip Head',
            serial_number='MTW001',
            barcode='GRP001',
            category_id=category_ids['Grip'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('15.00'),
            replacement_cost=Decimal('200.00'),
            notes='Steel C-stand',
        ),
        Equipment(
            name='Dana Dolly',
            description='Complete dolly kit',
            serial_number='DD001',
            barcode='GRP002',
            category_id=category_ids['Grip'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('100.00'),
            replacement_cost=Decimal('2000.00'),
            notes='With track',
        ),
        # Accessories
        Equipment(
            name='Teradek Bolt 4K 750',
            description='Wireless video system',
            serial_number='TRD001',
            barcode='ACC001',
            category_id=category_ids['Accessories'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('150.00'),
            replacement_cost=Decimal('3000.00'),
            notes='4K wireless video',
        ),
        Equipment(
            name='Wooden Camera UMB-1',
            description='Universal mattebox',
            serial_number='WC001',
            barcode='ACC002',
            category_id=category_ids['Accessories'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('50.00'),
            replacement_cost=Decimal('1000.00'),
            notes='Pro mattebox',
        ),
    ]

    for item in equipment:
        # Check if equipment already exists by barcode or serial number
        existing_by_barcode = await repository.get_by_barcode(item.barcode)
        if existing_by_barcode:
            logger.info(
                'Equipment with barcode %s already exists: %s',
                item.barcode,
                existing_by_barcode.name,
            )
            continue

        existing_by_serial = await repository.get_by_serial_number(item.serial_number)
        if existing_by_serial:
            logger.info(
                'Equipment with serial number %s already exists: %s',
                item.serial_number,
                existing_by_serial.name,
            )
            continue

        created_item = await repository.create(item)
        logger.info(
            'Created equipment: %s (Status: %s)',
            created_item.name,
            created_item.status.value,
        )


async def create_clients(session: AsyncSession) -> None:
    """Create test clients.

    Args:
        session: Database session
    """
    repository = ClientRepository(session)

    # Create 10 unique clients
    for _ in range(10):
        # Generate company name with industry
        company_types = ['Студия', 'Продакшн', 'Медиа', 'Синема', 'Фильм']
        company = f'{fake.company()} {fake.random_element(company_types)}'

        # Generate client data
        client = Client(
            first_name=fake.first_name(),
            last_name=fake.last_name(),
            email=fake.unique.email(),
            phone=fake.unique.phone_number(),
            passport_number=fake.unique.numerify(text='#### ######'),
            address=fake.address(),
            company=company,
            notes=fake.text(max_nb_chars=200),
            status=ClientStatus.ACTIVE,
        )

        created_client = await repository.create(client)
        logger.info(
            'Created client: %s %s (%s)',
            created_client.first_name,
            created_client.last_name,
            created_client.company,
        )


async def seed_data() -> None:
    """Seed test data into the database."""
    async with AsyncSessionLocal() as session:
        try:
            logger.info('Starting test data seeding...')

            # Create categories first
            category_ids = await create_categories(session)
            logger.info('Successfully created all categories')

            # Create equipment using category IDs
            await create_equipment(session, category_ids)
            logger.info('Successfully created all equipment')

            # Create clients
            await create_clients(session)
            logger.info('Successfully created all clients')

            await session.commit()
            logger.info('Test data seeding completed successfully')
        except Exception as e:
            await session.rollback()
            logger.error('Error seeding data: %s', str(e))
            raise


if __name__ == '__main__':
    configure_logging()
    asyncio.run(seed_data())
