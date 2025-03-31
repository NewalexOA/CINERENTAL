# Сервисы

## Общая информация

Сервисы в ACT-RENTAL реализуют бизнес-логику приложения. Каждый сервис отвечает за определенный домен и использует соответствующий репозиторий для работы с данными.

## CategoryService

Сервис для управления категориями оборудования.

### Методы
- `create_category(name: str, description: str)` - создание новой категории
- `update_category(category_id: int, name: str, description: str)` - обновление категории
- `get_categories()` - получение всех категорий
- `get_category(category_id: int)` - получение категории по ID
- `get_with_equipment_count()` - получение категорий с количеством оборудования
- `search_categories(query: str)` - поиск категорий по названию или описанию

## EquipmentService

Сервис для управления оборудованием.

### Методы
- `create_equipment(...)` - создание нового оборудования
- `update_equipment(...)` - обновление оборудования
- `change_status(equipment_id: int, status: EquipmentStatus)` - изменение статуса
- `check_availability(equipment_id: int, start_date: datetime, end_date: datetime)` - проверка доступности
- `get_available_equipment()` - получение доступного оборудования
- `search_equipment(query: str)` - поиск оборудования
- `get_by_category(category_id: int)` - получение оборудования по категории
- `get_by_barcode(barcode: str)` - поиск оборудования по штрих-коду

## ClientService

Сервис для управления клиентами.

### Методы
- `create_client(...)` - создание нового клиента с проверкой уникальности email и телефона
- `update_client(...)` - обновление данных клиента
- `change_status(client_id: int, status: ClientStatus)` - изменение статуса клиента
- `get_clients()` - получение всех клиентов
- `get_client(client_id: int)` - получение клиента по ID
- `search_clients(query: str)` - поиск клиентов
- `get_with_active_bookings(client_id: int)` - получение клиента с активными бронированиями
- `get_with_overdue_bookings()` - получение клиентов с просроченными бронированиями
- `get_by_status(status: ClientStatus)` - получение клиентов по статусу

## BookingService

Сервис для управления бронированиями.

### Методы
- `create_booking(...)` - создание нового бронирования с проверкой доступности
- `update_booking(...)` - обновление деталей бронирования
- `change_status(booking_id: int, status: BookingStatus)` - изменение статуса бронирования
- `change_payment_status(booking_id: int, status: PaymentStatus)` - изменение статуса оплаты
- `get_bookings()` - получение всех бронирований
- `get_booking(booking_id: int)` - получение бронирования по ID
- `get_by_client(client_id: int)` - получение бронирований клиента
- `get_by_equipment(equipment_id: int)` - получение бронирований оборудования
- `get_active_for_period(start_date: datetime, end_date: datetime)` - получение активных бронирований
- `get_by_status(status: BookingStatus)` - получение бронирований по статусу
- `get_by_payment_status(status: PaymentStatus)` - получение бронирований по статусу оплаты
- `get_overdue()` - получение просроченных бронирований

## DocumentService

Сервис для управления документами.

### Методы
- `create_document(...)` - создание нового документа
- `update_document(...)` - обновление документа
- `change_status(document_id: int, status: DocumentStatus)` - изменение статуса документа
- `get_documents()` - получение всех документов
- `get_document(document_id: int)` - получение документа по ID
- `get_by_booking(booking_id: int)` - получение документов бронирования
- `get_by_type(document_type: DocumentType)` - получение документов по типу
- `get_by_status(status: DocumentStatus)` - получение документов по статусу
- `get_by_date_range(start_date: datetime, end_date: datetime)` - получение документов за период

## Примеры использования

```python
# Пример работы с CategoryService
category = await category_service.create_category(
    name="Камеры",
    description="Профессиональные видеокамеры"
)
categories = await category_service.get_with_equipment_count()

# Пример работы с EquipmentService
equipment = await equipment_service.create_equipment(
    category_id=1,
    name="Sony PXW-FX9",
    description="Полнокадровая видеокамера",
    barcode="CAM-001",
)
is_available = await equipment_service.check_availability(
    equipment_id=1,
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 5)
)

# Пример работы с ClientService
client = await client_service.create_client(
    first_name="Иван",
    last_name="Петров",
    email="ivan@example.com",
    phone="+7-999-123-4567",
    passport_number="1234 567890",
    address="г. Москва, ул. Примерная, д. 1"
)
overdue_clients = await client_service.get_with_overdue_bookings()

# Пример работы с BookingService
booking = await booking_service.create_booking(
    client_id=1,
    equipment_id=1,
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 5),
    total_amount=2500.00,
    deposit_amount=1000.00
)
await booking_service.change_payment_status(
    booking_id=1,
    status=PaymentStatus.PAID
)

# Пример работы с DocumentService
document = await document_service.create_document(
    booking_id=1,
    document_type=DocumentType.CONTRACT,
    file_path="/contracts/2024/03/contract-001.pdf"
)
await document_service.change_status(
    document_id=1,
    status=DocumentStatus.APPROVED
)
```
