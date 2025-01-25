# Примеры использования CINERENTAL

## Управление категориями

```python
from datetime import datetime
from backend.models.category import Category
from backend.services.category import CategoryService

# Создание категории
category = await category_service.create_category(
    name="Камеры",
    description="Профессиональные видеокамеры"
)

# Обновление категории
updated = await category_service.update_category(
    category_id=category.id,
    name="Видеокамеры",
    description="Профессиональные видеокамеры и аксессуары"
)

# Получение категорий с количеством оборудования
categories = await category_service.get_with_equipment_count()
for cat in categories:
    print(f"{cat.name}: {cat.equipment_count} единиц")
```

## Управление оборудованием

```python
from backend.models.equipment import Equipment, EquipmentStatus
from backend.services.equipment import EquipmentService

# Создание оборудования
equipment = await equipment_service.create_equipment(
    category_id=1,
    name="Sony PXW-FX9",
    description="Полнокадровая видеокамера",
    barcode="CAM-001",
    daily_rate=500.00,
    replacement_cost=15000.00
)

# Проверка доступности
is_available = await equipment_service.check_availability(
    equipment_id=equipment.id,
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 5)
)

# Изменение статуса
await equipment_service.change_status(
    equipment_id=equipment.id,
    status=EquipmentStatus.MAINTENANCE
)

# Поиск по штрих-коду
found = await equipment_service.get_by_barcode("CAM-001")
```

## Управление клиентами

```python
from backend.models.client import Client, ClientStatus
from backend.services.client import ClientService

# Регистрация клиента
client = await client_service.create_client(
    first_name="Иван",
    last_name="Петров",
    email="ivan@example.com",
    phone="+7-999-123-4567",
    passport_number="1234 567890",
    address="г. Москва, ул. Примерная, д. 1",
    company="ООО Фильм"
)

# Обновление данных клиента
updated = await client_service.update_client(
    client_id=client.id,
    phone="+7-999-765-4321"
)

# Блокировка клиента
await client_service.change_status(
    client_id=client.id,
    status=ClientStatus.BLOCKED
)

# Поиск клиентов с просроченными бронированиями
overdue = await client_service.get_with_overdue_bookings()
```

## Управление бронированиями

```python
from backend.models.booking import Booking, BookingStatus, PaymentStatus
from backend.services.booking import BookingService

# Создание бронирования
booking = await booking_service.create_booking(
    client_id=1,
    equipment_id=1,
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 5),
    total_amount=2500.00,
    deposit_amount=1000.00,
    notes="Съемки документального фильма"
)

# Обновление бронирования
updated = await booking_service.update_booking(
    booking_id=booking.id,
    end_date=datetime(2024, 3, 7),
    total_amount=3500.00
)

# Подтверждение оплаты
await booking_service.change_payment_status(
    booking_id=booking.id,
    status=PaymentStatus.PAID
)

# Активация бронирования
await booking_service.change_status(
    booking_id=booking.id,
    status=BookingStatus.ACTIVE
)

# Получение активных бронирований на период
active = await booking_service.get_active_for_period(
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 31)
)
```

## Управление документами

```python
from backend.models.document import Document, DocumentStatus, DocumentType
from backend.services.document import DocumentService

# Создание договора
contract = await document_service.create_document(
    booking_id=1,
    document_type=DocumentType.CONTRACT,
    file_path="/contracts/2024/03/contract-001.pdf",
    notes="Стандартный договор аренды"
)

# Создание акта приема-передачи
handover = await document_service.create_document(
    booking_id=1,
    document_type=DocumentType.DAMAGE_REPORT,
    file_path="/reports/2024/03/handover-001.pdf",
    notes="Акт приема-передачи оборудования"
)

# Одобрение документа
await document_service.change_status(
    document_id=contract.id,
    status=DocumentStatus.APPROVED
)

# Получение всех документов бронирования
docs = await document_service.get_by_booking(booking_id=1)

# Поиск документов за период
recent = await document_service.get_by_date_range(
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 31)
)
```

## Комплексный пример

```python
# Регистрация клиента и создание бронирования
async def register_and_book(
    client_data: dict,
    equipment_id: int,
    start_date: datetime,
    end_date: datetime
) -> Booking:
    # Создаем клиента
    client = await client_service.create_client(**client_data)

    # Проверяем доступность оборудования
    is_available = await equipment_service.check_availability(
        equipment_id=equipment_id,
        start_date=start_date,
        end_date=end_date
    )
    if not is_available:
        raise ValueError("Оборудование недоступно на выбранные даты")

    # Получаем оборудование для расчета стоимости
    equipment = await equipment_service.get_equipment(equipment_id)
    days = (end_date - start_date).days
    total_amount = equipment.daily_rate * days
    deposit_amount = equipment.replacement_cost * 0.2  # 20% от стоимости

    # Создаем бронирование
    booking = await booking_service.create_booking(
        client_id=client.id,
        equipment_id=equipment_id,
        start_date=start_date,
        end_date=end_date,
        total_amount=total_amount,
        deposit_amount=deposit_amount
    )

    # Создаем договор
    contract = await document_service.create_document(
        booking_id=booking.id,
        document_type=DocumentType.CONTRACT,
        file_path=f"/contracts/{booking.id}/contract.pdf"
    )

    return booking

# Пример использования
client_data = {
    "first_name": "Иван",
    "last_name": "Петров",
    "email": "ivan@example.com",
    "phone": "+7-999-123-4567",
    "passport_number": "1234 567890",
    "address": "г. Москва, ул. Примерная, д. 1",
    "company": "ООО Фильм"
}

booking = await register_and_book(
    client_data=client_data,
    equipment_id=1,
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 5)
)
