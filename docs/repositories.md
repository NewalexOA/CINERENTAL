# Репозитории

## Общая информация

Репозитории в CINERENTAL реализуют паттерн Repository и отвечают за взаимодействие с базой данных. Все репозитории наследуются от базового класса `BaseRepository`, который предоставляет общие CRUD операции.

## BaseRepository

Базовый класс для всех репозиториев. Реализует основные операции:

- `create` - создание новой записи
- `update` - обновление существующей записи
- `delete` - удаление записи
- `get` - получение записи по ID
- `get_all` - получение всех записей

## CategoryRepository

Репозиторий для работы с категориями оборудования.

### Методы
- `get_by_name(name: str)` - поиск категории по названию
- `get_with_equipment_count()` - получение категорий с количеством оборудования
- `search(query: str)` - поиск категорий по названию или описанию

## EquipmentRepository

Репозиторий для работы с оборудованием.

### Методы
- `get_by_category(category_id: int)` - получение оборудования по категории
- `get_by_barcode(barcode: str)` - поиск оборудования по штрих-коду
- `get_available()` - получение доступного оборудования
- `search(query: str)` - поиск оборудования по названию или описанию
- `check_availability(equipment_id: int, start_date: datetime, end_date: datetime)` - проверка доступности оборудования на период

## ClientRepository

Репозиторий для работы с клиентами.

### Методы
- `get_by_email(email: str)` - поиск клиента по email
- `get_by_phone(phone: str)` - поиск клиента по телефону
- `search(query: str)` - поиск клиентов по имени, email или телефону
- `get_with_active_bookings(client_id: int)` - получение клиента с активными бронированиями
- `get_with_overdue_bookings()` - получение клиентов с просроченными бронированиями
- `get_by_status(status: ClientStatus)` - получение клиентов по статусу

## BookingRepository

Репозиторий для работы с бронированиями.

### Методы
- `get_by_client(client_id: int)` - получение бронирований клиента
- `get_by_equipment(equipment_id: int)` - получение бронирований оборудования
- `get_active_for_period(start_date: datetime, end_date: datetime)` - получение активных бронирований на период
- `get_by_status(status: BookingStatus)` - получение бронирований по статусу
- `get_by_payment_status(status: PaymentStatus)` - получение бронирований по статусу оплаты
- `get_overdue()` - получение просроченных бронирований

## DocumentRepository

Репозиторий для работы с документами.

### Методы
- `get_by_booking(booking_id: int)` - получение документов бронирования
- `get_by_client(client_id: int)` - получение документов клиента
- `get_by_type(document_type: DocumentType)` - получение документов по типу
- `search(query: str)` - поиск документов по названию или описанию
- `get_by_status(status: DocumentStatus)` - получение документов по статусу
- `get_by_date_range(start_date: datetime, end_date: datetime)` - получение документов за период

## Примеры использования

```python
# Пример работы с CategoryRepository
category = await category_repository.get_by_name("Камеры")
categories = await category_repository.get_with_equipment_count()

# Пример работы с EquipmentRepository
equipment = await equipment_repository.get_by_barcode("CAM-001")
is_available = await equipment_repository.check_availability(
    equipment_id=1,
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 5)
)

# Пример работы с ClientRepository
client = await client_repository.get_by_email("client@example.com")
overdue_clients = await client_repository.get_with_overdue_bookings()

# Пример работы с BookingRepository
active_bookings = await booking_repository.get_active_for_period(
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 31)
)
overdue = await booking_repository.get_overdue()

# Пример работы с DocumentRepository
contract = await document_repository.get_by_type(DocumentType.CONTRACT)
recent_docs = await document_repository.get_by_date_range(
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 31)
)
```
