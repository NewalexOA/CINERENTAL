# Репозитории

## Общая информация

Репозитории в CINERENTAL реализуют паттерн Repository и отвечают за взаимодействие с базой данных. Все репозитории наследуются от базового класса `BaseRepository`, который предоставляет общие CRUD операции.

## BaseRepository

Базовый класс для всех репозиториев. Реализует основные операции:

- `create(instance: ModelType)` - создание новой записи
- `update(instance: ModelType)` - обновление существующей записи
- `delete(instance: ModelType)` - удаление записи
- `get(id: int)` - получение записи по ID
- `get_all()` - получение всех записей

## CategoryRepository

Репозиторий для работы с категориями оборудования.

### Методы
- `get_by_name(name: str)` - поиск категории по названию
- `get_children(parent_id: int)` - получение дочерних категорий
- `get_root_categories()` - получение корневых категорий
- `search(query: str)` - поиск категорий по названию или описанию
- `get_all_with_equipment_count()` - получение категорий с количеством оборудования

## EquipmentRepository

Репозиторий для работы с оборудованием.

### Методы
- `get_by_category(category_id: int)` - получение оборудования по категории
- `get_by_barcode(barcode: str)` - поиск оборудования по штрих-коду
- `get_by_serial_number(serial_number: str)` - поиск оборудования по серийному номеру
- `search(query: str)` - поиск оборудования по названию или описанию
- `check_availability(equipment_id: int, start_date: datetime, end_date: datetime, exclude_booking_id: Optional[int] = None)` - проверка доступности оборудования на период

## ClientRepository

Репозиторий для работы с клиентами.

### Методы
- `get_by_email(email: str)` - поиск клиента по email
- `get_by_phone(phone: str)` - поиск клиента по телефону
- `search(query: str)` - поиск клиентов по имени, email или телефону
- `get_with_active_bookings(client_id: int)` - получение клиента с активными бронированиями
- `get_with_overdue_bookings()` - получение клиентов с просроченными бронированиями

## BookingRepository

Репозиторий для работы с бронированиями.

### Методы
- `check_availability(equipment_id: int, start_date: datetime, end_date: datetime, exclude_booking_id: Optional[int] = None)` - проверка доступности оборудования на период
- `get_by_client(client_id: int)` - получение бронирований клиента
- `get_by_equipment(equipment_id: int)` - получение бронирований оборудования
- `get_active_for_period(start_date: datetime, end_date: datetime)` - получение активных бронирований на период

## DocumentRepository

Репозиторий для работы с документами.

### Методы
- `get_by_booking(booking_id: int)` - получение документов бронирования
- `get_by_client(client_id: int)` - получение документов клиента
- `get_by_type(document_type: DocumentType, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None)` - получение документов по типу за период

## Примеры использования

```python
# Пример работы с CategoryRepository
category = await category_repository.get_by_name("Камеры")
child_categories = await category_repository.get_children(category.id)
root_categories = await category_repository.get_root_categories()

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

# Пример работы с DocumentRepository
booking_docs = await document_repository.get_by_booking(booking_id=1)
client_docs = await document_repository.get_by_client(client_id=1)
contracts = await document_repository.get_by_type(
    document_type=DocumentType.CONTRACT,
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 31)
)
```
