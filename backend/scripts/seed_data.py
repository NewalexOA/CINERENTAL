"""Script for seeding test data into the database."""

import asyncio
import logging
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import async_sessionmaker
from backend.core.logging import configure_logging
from backend.models import Category, Equipment, EquipmentStatus
from backend.repositories import CategoryRepository, EquipmentRepository

logger = logging.getLogger(__name__)


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
            description='Professional video cameras',
        ),
        Category(
            name='Lenses',
            description='Camera lenses',
        ),
        Category(
            name='Lighting',
            description='Professional lighting equipment',
        ),
        Category(
            name='Audio',
            description='Professional audio equipment',
        ),
        Category(
            name='Accessories',
            description='Various filming accessories',
        ),
    ]

    category_ids = {}
    for category in categories:
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
            description='Full-frame professional camcorder',
            serial_number='FX9001',
            barcode='CAM001',
            category_id=category_ids['Cameras'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('500.00'),
            replacement_cost=Decimal('15000.00'),
            notes='6K full-frame sensor',
        ),
        Equipment(
            name='RED KOMODO 6K',
            description='Digital cinema camera',
            serial_number='RED001',
            barcode='CAM002',
            category_id=category_ids['Cameras'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('600.00'),
            replacement_cost=Decimal('20000.00'),
            notes='Super 35mm sensor',
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
            notes='EF mount',
        ),
        Equipment(
            name='ZEISS Supreme Prime 85mm T1.5',
            description='Cinema prime lens',
            serial_number='ZSP001',
            barcode='LENS002',
            category_id=category_ids['Lenses'],
            status=EquipmentStatus.MAINTENANCE,
            daily_rate=Decimal('150.00'),
            replacement_cost=Decimal('5000.00'),
            notes='PL mount',
        ),
        # Lighting
        Equipment(
            name='ARRI SkyPanel S60-C',
            description='LED soft light',
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
        # Accessories
        Equipment(
            name='DJI Ronin 2',
            description='Professional gimbal stabilizer',
            serial_number='RON001',
            barcode='ACC001',
            category_id=category_ids['Accessories'],
            status=EquipmentStatus.AVAILABLE,
            daily_rate=Decimal('200.00'),
            replacement_cost=Decimal('8000.00'),
            notes='Pro gimbal',
        ),
        Equipment(
            name='SmallHD 702 Touch',
            description='7" on-camera monitor',
            serial_number='SHD001',
            barcode='ACC002',
            category_id=category_ids['Accessories'],
            status=EquipmentStatus.BROKEN,
            daily_rate=Decimal('75.00'),
            replacement_cost=Decimal('1500.00'),
            notes='1080p touchscreen',
        ),
    ]

    for item in equipment:
        created_item = await repository.create(item)
        logger.info(
            'Created equipment: %s (Category: %s, Status: %s)',
            created_item.name,
            created_item.category_name,
            created_item.status.value,
        )


async def seed_data() -> None:
    """Seed test data into the database."""
    async_session = async_sessionmaker()
    async with async_session() as session:
        try:
            logger.info('Starting test data seeding...')

            # Create categories first
            category_ids = await create_categories(session)
            logger.info('Successfully created all categories')

            # Create equipment using category IDs
            await create_equipment(session, category_ids)
            logger.info('Successfully created all equipment')

            logger.info('Test data seeding completed successfully')
        except Exception as e:
            logger.error('Error seeding data: %s', str(e))
            raise


if __name__ == '__main__':
    configure_logging()
    asyncio.run(seed_data())
