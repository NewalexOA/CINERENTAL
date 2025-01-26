# Репозитории

## Общая информация

Репозитории в CINERENTAL реализуют паттерн Repository и отвечают за взаимодействие с базой данных. Все репозитории наследуются от базового класса `BaseRepository`, который предоставляет общие CRUD операции.

## BaseRepository

Базовый класс для всех репозиториев. Реализует основные операции:

- `create(instance: ModelType)` - создание новой записи
- `update(instance: ModelType)` - обновление существующей записи
- `delete(instance: ModelType)` - удаление записи (soft delete)
- `get(id: int, include_deleted: bool = False)` - получение записи по ID
- `get_all(include_deleted: bool = False)` - получение всех записей

## CategoryRepository

Репозиторий для работы с категориями оборудования.

### Методы

- `get_by_name(name: str)` - поиск категории по точному совпадению названия
- `get_children(parent_id: int)` - получение прямых дочерних категорий
- `get_root_categories()` - получение корневых категорий (без родителя)
- `get_full_path(category_id: int)` - получение пути от корня до заданной категории
- `get_equipment_count(category_id: int)` - получение количества единиц оборудования в категории
- `get_subcategories(category_id: int)` - получение всех прямых подкатегорий
- `search(query: str)` - поиск категорий по названию и описанию (без учета регистра)
- `get_all_with_equipment_count()` - получение всех категорий с количеством оборудования, включая оборудование из подкатегорий
- `get_category_tree()` - получение полного дерева категорий с подсчетом оборудования

### Основные возможности

- Иерархическая структура категорий с отношениями родитель-потомок
- Подсчет оборудования по всему дереву категорий
- Поиск по названию и описанию без учета регистра
- Рекурсивный обход категорий для подсчета оборудования

## EquipmentRepository

Репозиторий для работы с оборудованием.

### Методы
- `get_by_category(category_id: int, include_deleted: bool = False)` - получение оборудования по категории
- `get_by_barcode(barcode: str, include_deleted: bool = False)` - поиск оборудования по штрих-коду
- `get_by_serial_number(serial_number: str, include_deleted: bool = False)` - поиск оборудования по серийному номеру
- `search(query: str, include_deleted: bool = False)` - поиск оборудования по названию или описанию
- `check_availability(equipment_id: int, start_date: datetime, end_date: datetime, exclude_booking_id: Optional[int] = None)` - проверка доступности оборудования на период
- `get_available_equipment(start_date: datetime, end_date: datetime)` - получение доступного оборудования на период

## ClientRepository

Репозиторий для работы с клиентами.

### Методы
- `get_by_email(email: str, include_deleted: bool = False)` - поиск клиента по email
- `get_by_phone(phone: str, include_deleted: bool = False)` - поиск клиента по телефону
- `search(query: str, include_deleted: bool = False)` - поиск клиентов по имени, email или телефону
- `get_with_active_bookings(client_id: int)` - получение клиента с активными бронированиями
- `get_with_overdue_bookings()` - получение клиентов с просроченными бронированиями
- `get_by_status(status: ClientStatus, include_deleted: bool = False)` - получение клиентов по статусу

## BookingRepository

Репозиторий для работы с бронированиями.

### Методы
- `check_availability(equipment_id: int, start_date: datetime, end_date: datetime, exclude_booking_id: Optional[int] = None)` - проверка доступности оборудования на период
- `get_by_client(client_id: int)` - получение бронирований клиента
- `get_by_equipment(equipment_id: int)` - получение бронирований оборудования
- `get_active_for_period(start_date: datetime, end_date: datetime)` - получение активных бронирований на период
- `get_by_status(status: BookingStatus)` - получение бронирований по статусу
- `get_by_payment_status(payment_status: PaymentStatus)` - получение бронирований по статусу оплаты
- `get_overdue()` - получение просроченных бронирований

## DocumentRepository

Репозиторий для работы с документами.

### Методы
- `get_by_booking(booking_id: int)` - получение документов бронирования
- `get_by_client(client_id: int)` - получение документов клиента
- `get_by_type(document_type: DocumentType, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None)` - получение документов по типу за период
- `get_by_status(status: DocumentStatus)` - получение документов по статусу
- `get_by_date_range(start_date: datetime, end_date: datetime)` - получение документов за период

## Примеры использования

```python
# Пример работы с CategoryRepository
category = await category_repository.get_by_name("Камеры")
child_categories = await category_repository.get_children(category.id)
root_categories = await category_repository.get_root_categories()
category_tree = await category_repository.get_category_tree()

# Пример работы с EquipmentRepository
equipment = await equipment_repository.get_by_barcode("CAM-001")
is_available = await equipment_repository.check_availability(
    equipment_id=1,
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 5)
)
available_equipment = await equipment_repository.get_available_equipment(
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 5)
)

# Пример работы с ClientRepository
client = await client_repository.get_by_email("client@example.com")
overdue_clients = await client_repository.get_with_overdue_bookings()
active_clients = await client_repository.get_by_status(ClientStatus.ACTIVE)

# Пример работы с BookingRepository
active_bookings = await booking_repository.get_active_for_period(
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 31)
)
overdue_bookings = await booking_repository.get_overdue()
paid_bookings = await booking_repository.get_by_payment_status(PaymentStatus.PAID)

# Пример работы с DocumentRepository
booking_docs = await document_repository.get_by_booking(booking_id=1)
client_docs = await document_repository.get_by_client(client_id=1)
contracts = await document_repository.get_by_type(
    document_type=DocumentType.CONTRACT,
    start_date=datetime(2024, 3, 1),
    end_date=datetime(2024, 3, 31)
)
approved_docs = await document_repository.get_by_status(DocumentStatus.APPROVED)
```
