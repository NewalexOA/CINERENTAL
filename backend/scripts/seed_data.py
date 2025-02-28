"""Script for seeding test data into the database."""

import asyncio
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import cast

from faker import Faker
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import AsyncSessionLocal
from backend.core.logging import configure_logging
from backend.models import (
    Booking,
    BookingStatus,
    Category,
    Client,
    ClientStatus,
    Equipment,
    EquipmentStatus,
    PaymentStatus,
)
from backend.repositories import (
    BookingRepository,
    CategoryRepository,
    ClientRepository,
    EquipmentRepository,
)

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
            replacement_cost=Decimal('85000.00'),
            notes='4.5K large format sensor',
        ),
        Equipment(
            name='Blackmagic URSA Mini Pro 12K',
            description='Digital film camera with 12K resolution',
            serial_number='BMP001',
            barcode='CAM004',
            category_id=category_ids['Cameras'],
            status=EquipmentStatus.AVAILABLE,
            replacement_cost=Decimal('15000.00'),
            notes='12K resolution, Super 35 sensor',
        ),
        Equipment(
            name='Canon C300 Mark III',
            description='Super 35mm Cinema Camera with Dual Gain Output',
            serial_number='C300001',
            barcode='CAM005',
            category_id=category_ids['Cameras'],
            status=EquipmentStatus.AVAILABLE,
            replacement_cost=Decimal('12000.00'),
            notes='4K 120fps, Super 35mm sensor',
        ),
        # Lenses
        Equipment(
            name='Canon CN-E 50mm T1.3',
            description='Cinema prime lens',
            serial_number='CNE001',
            barcode='LENS001',
            category_id=category_ids['Lenses'],
            status=EquipmentStatus.AVAILABLE,
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
            replacement_cost=Decimal('800.00'),
            notes='4ft LED tube',
        ),
        # Audio
        Equipment(
            name='Sennheiser MKH 416',
            description='Short shotgun interference tube microphone',
            serial_number='MKH001',
            barcode='MIC001',
            category_id=category_ids['Audio'],
            status=EquipmentStatus.AVAILABLE,
            replacement_cost=Decimal('1200.00'),
            notes='Industry standard shotgun mic',
        ),
        Equipment(
            name='Rode NTG5',
            description='Broadcast-grade shotgun microphone',
            serial_number='NTG001',
            barcode='MIC002',
            category_id=category_ids['Audio'],
            status=EquipmentStatus.AVAILABLE,
            replacement_cost=Decimal('800.00'),
            notes='Lightweight, weather-resistant',
        ),
        Equipment(
            name='Lectrosonics DCHR',
            description='Digital wireless receiver',
            serial_number='DCH001',
            barcode='AUDIO003',
            category_id=category_ids['Audio'],
            status=EquipmentStatus.AVAILABLE,
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


async def create_bookings(session: AsyncSession) -> None:
    """Create test bookings.

    Args:
        session: Database session
    """
    booking_repository = BookingRepository(session)
    client_repository = ClientRepository(session)
    equipment_repository = EquipmentRepository(session)

    # Get all clients and available equipment
    clients = await client_repository.get_all()
    equipment_items = await equipment_repository.get_all()
    available_equipment = [
        item for item in equipment_items if item.status == EquipmentStatus.AVAILABLE
    ]

    if not clients or not available_equipment:
        logger.warning(
            'No clients or available equipment found. Cannot create bookings.'
        )
        return

    # Create bookings with different statuses
    now = datetime.now(timezone.utc)
    booking_data = [
        # PENDING bookings (future dates)
        {
            'client': random.choice(clients),
            'equipment': random.choice(available_equipment),
            'start_date': now + timedelta(days=random.randint(5, 10)),
            'end_date': now + timedelta(days=random.randint(11, 15)),
            'booking_status': BookingStatus.PENDING,
            'payment_status': PaymentStatus.PENDING,
            'notes': 'Ожидает подтверждения',
        },
        {
            'client': random.choice(clients),
            'equipment': random.choice(available_equipment),
            'start_date': now + timedelta(days=random.randint(7, 12)),
            'end_date': now + timedelta(days=random.randint(13, 18)),
            'booking_status': BookingStatus.PENDING,
            'payment_status': PaymentStatus.PENDING,
            'notes': 'Требуется проверка доступности',
        },
        # CONFIRMED bookings (future dates)
        {
            'client': random.choice(clients),
            'equipment': random.choice(available_equipment),
            'start_date': now + timedelta(days=random.randint(3, 7)),
            'end_date': now + timedelta(days=random.randint(8, 12)),
            'booking_status': BookingStatus.CONFIRMED,
            'payment_status': PaymentStatus.PARTIAL,
            'notes': 'Внесена предоплата 50%',
        },
        {
            'client': random.choice(clients),
            'equipment': random.choice(available_equipment),
            'start_date': now + timedelta(days=random.randint(2, 5)),
            'end_date': now + timedelta(days=random.randint(6, 10)),
            'booking_status': BookingStatus.CONFIRMED,
            'payment_status': PaymentStatus.PENDING,
            'notes': 'Подтверждено, ожидается оплата',
        },
        # ACTIVE bookings (current dates)
        {
            'client': random.choice(clients),
            'equipment': random.choice(available_equipment),
            'start_date': now - timedelta(days=random.randint(2, 4)),
            'end_date': now + timedelta(days=random.randint(2, 5)),
            'booking_status': BookingStatus.ACTIVE,
            'payment_status': PaymentStatus.PAID,
            'notes': 'Оборудование выдано',
        },
        {
            'client': random.choice(clients),
            'equipment': random.choice(available_equipment),
            'start_date': now - timedelta(days=random.randint(1, 3)),
            'end_date': now + timedelta(days=random.randint(3, 6)),
            'booking_status': BookingStatus.ACTIVE,
            'payment_status': PaymentStatus.PARTIAL,
            'notes': 'Оборудование в использовании, доплата при возврате',
        },
        # COMPLETED bookings (past dates)
        {
            'client': random.choice(clients),
            'equipment': random.choice(available_equipment),
            'start_date': now - timedelta(days=random.randint(15, 20)),
            'end_date': now - timedelta(days=random.randint(5, 10)),
            'booking_status': BookingStatus.COMPLETED,
            'payment_status': PaymentStatus.PAID,
            'notes': 'Успешно завершено',
        },
        {
            'client': random.choice(clients),
            'equipment': random.choice(available_equipment),
            'start_date': now - timedelta(days=random.randint(25, 30)),
            'end_date': now - timedelta(days=random.randint(15, 20)),
            'booking_status': BookingStatus.COMPLETED,
            'payment_status': PaymentStatus.PAID,
            'notes': 'Клиент остался доволен',
        },
        # CANCELLED bookings
        {
            'client': random.choice(clients),
            'equipment': random.choice(available_equipment),
            'start_date': now + timedelta(days=random.randint(5, 10)),
            'end_date': now + timedelta(days=random.randint(11, 15)),
            'booking_status': BookingStatus.CANCELLED,
            'payment_status': PaymentStatus.REFUNDED,
            'notes': 'Отменено клиентом, средства возвращены',
        },
        # OVERDUE bookings
        {
            'client': random.choice(clients),
            'equipment': random.choice(available_equipment),
            'start_date': now - timedelta(days=random.randint(10, 15)),
            'end_date': now - timedelta(days=random.randint(2, 5)),
            'booking_status': BookingStatus.OVERDUE,
            'payment_status': PaymentStatus.OVERDUE,
            'notes': 'Просрочен возврат оборудования',
        },
    ]

    for data in booking_data:
        client = cast(Client, data['client'])
        equipment = cast(Equipment, data['equipment'])
        start_date = cast(datetime, data['start_date'])
        end_date = cast(datetime, data['end_date'])

        # Calculate rental duration in days
        duration = (end_date - start_date).days
        if duration < 1:
            duration = 1

        # In a real system, these would be calculated by the external financial system
        total_amount = Decimal('100.00') * duration

        # Calculate deposit (usually 30% of total)
        deposit_amount = total_amount * Decimal('0.3')

        # Calculate paid amount based on payment status
        paid_amount = Decimal('0')
        if data['payment_status'] == PaymentStatus.PAID:
            paid_amount = total_amount
        elif data['payment_status'] == PaymentStatus.PARTIAL:
            paid_amount = total_amount * Decimal('0.5')  # 50% paid

        # Create booking object
        booking = Booking(
            client_id=client.id,
            equipment_id=equipment.id,
            start_date=start_date,
            end_date=end_date,
            booking_status=data['booking_status'],
            payment_status=data['payment_status'],
            total_amount=total_amount,
            deposit_amount=deposit_amount,
            paid_amount=paid_amount,
            notes=data['notes'],
        )

        # Save to database
        created_booking = await booking_repository.create(booking)
        logger.info(
            'Created booking #%s: %s - %s, Status: %s, Payment: %s',
            created_booking.id,
            created_booking.start_date.strftime('%Y-%m-%d'),
            created_booking.end_date.strftime('%Y-%m-%d'),
            created_booking.booking_status.value,
            created_booking.payment_status.value,
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

            # Create bookings
            await create_bookings(session)
            logger.info('Successfully created all bookings')

            await session.commit()
            logger.info('Test data seeding completed successfully')
        except Exception as e:
            await session.rollback()
            logger.error('Error seeding data: %s', str(e))
            raise


if __name__ == '__main__':
    configure_logging()
    asyncio.run(seed_data())
