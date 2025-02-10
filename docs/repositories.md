# Репозитории CINERENTAL

## Общая информация

Репозитории в CINERENTAL реализуют паттерн Repository и отвечают за взаимодействие с базой данных. Все репозитории наследуются от базового класса `BaseRepository`, который предоставляет общие CRUD операции.

## BaseRepository

Базовый класс реализует следующие операции:

### Основные методы
- `get(id: Union[int, UUID], include_deleted: bool = False)` - получение записи по ID
- `get_all()` - получение всех записей
- `create(instance: ModelType)` - создание новой записи
- `update(instance: ModelType)` - обновление существующей записи
- `delete(id: Union[int, UUID])` - удаление записи
- `exists(id: Union[int, UUID])` - проверка существования записи
- `soft_delete(id: Union[int, UUID])` - мягкое удаление записи
- `search(query_str: str, include_deleted: bool = False)` - базовый метод поиска

### Особенности реализации
- Использует Generic типы для типизации моделей
- Поддерживает как UUID, так и integer ID
- Реализует мягкое удаление (soft delete)
- Асинхронные операции через SQLAlchemy

## Специализированные репозитории

### EquipmentRepository
Репозиторий для работы с оборудованием:

#### Основные методы
- `get_by_barcode(barcode: str) -> Optional[Equipment]` - поиск по штрих-коду
- `get_by_serial_number(serial_number: str) -> Optional[Equipment]` - поиск по серийному номеру
- `get_by_category(category_id: int) -> List[Equipment]` - получение по категории
- `get_by_status(status: EquipmentStatus) -> List[Equipment]` - получение по статусу
- `search(query_str: str, include_deleted: bool = False) -> List[Equipment]` - поиск по всем полям

#### Методы доступности
- `check_availability(equipment_id: int, start_date: datetime, end_date: datetime, exclude_booking_id: Optional[int] = None) -> bool` - проверка доступности
- `get_available(start_date: datetime, end_date: datetime) -> List[Equipment]` - получение доступного оборудования
- `get_equipment_list(category_id: Optional[int] = None, status: Optional[EquipmentStatus] = None, available_from: Optional[datetime] = None, available_to: Optional[datetime] = None, skip: int = 0, limit: int = 100) -> List[Equipment]` - получение списка с фильтрацией и пагинацией

#### Особенности
- Проверка доступности учитывает существующие бронирования
- Поиск поддерживает case-insensitive поиск по name, description, barcode, serial_number
- Все методы поддерживают soft delete через include_deleted
- Пагинация и фильтрация в get_equipment_list

### CategoryRepository
Репозиторий для работы с категориями:

#### Основные методы
- `get_by_name(name: str) -> Optional[Category]` - поиск категории по точному совпадению имени
- `get_children(parent_id: int) -> List[Category]` - получение прямых дочерних категорий
- `get_root_categories() -> List[Category]` - получение корневых категорий (без родителя)
- `get_equipment_count(category_id: int) -> int` - количество единиц оборудования в категории
- `get_subcategories(category_id: int) -> List[Category]` - получение всех подкатегорий
- `search(query: str, include_deleted: bool = False) -> List[Category]` - поиск по имени и описанию (case-insensitive)
- `get_all_with_equipment_count() -> List[Category]` - все категории с количеством оборудования, включая подкатегории

#### Особенности
- Иерархическая структура через parent_id
- Case-insensitive поиск по name и description
- Рекурсивный подсчет оборудования во всех подкатегориях
- Поддержка soft delete во всех методах

### ClientRepository
Репозиторий для работы с клиентами:

#### Основные методы
- `get_by_email(email: str) -> Optional[Client]` - поиск клиента по email
- `get_by_phone(phone: str) -> Optional[Client]` - поиск клиента по телефону
- `get_by_status(status: ClientStatus) -> List[Client]` - получение клиентов по статусу
- `search(query_str: str, include_deleted: bool = False) -> List[Client]` - поиск по имени, email или телефону

#### Методы бронирований
- `get_with_active_bookings(client_id: int) -> Optional[Client]` - получение клиента с активными бронированиями
- `get_with_overdue_bookings() -> List[Client]` - получение клиентов с просроченными бронированиями

#### Особенности
- Case-insensitive поиск по first_name, last_name, email, phone
- Поддержка soft delete через include_deleted
- Использование JOIN для получения связанных бронирований
- Учет часового пояса (UTC) при проверке просроченных бронирований

### BookingRepository
Репозиторий для работы с бронированиями:

#### Основные методы
- `get_by_client(client_id: int) -> List[Booking]` - все бронирования клиента
- `get_active_by_client(client_id: int) -> List[Booking]` - активные бронирования клиента
- `get_by_equipment(equipment_id: int) -> List[Booking]` - все бронирования оборудования
- `get_active_by_equipment(equipment_id: int) -> List[Booking]` - активные бронирования оборудования

#### Методы доступности
- `check_availability(equipment_id: int, start_date: datetime, end_date: datetime, exclude_booking_id: Optional[int] = None) -> bool` - проверка доступности оборудования
- `get_overlapping(equipment_id: int, start_date: datetime, end_date: datetime) -> List[Booking]` - получение пересекающихся бронирований

#### Методы статусов
- `get_active_for_period(start_date: datetime, end_date: datetime) -> List[Booking]` - активные бронирования за период
- `get_by_status(status: BookingStatus) -> List[Booking]` - бронирования по статусу
- `get_by_payment_status(status: PaymentStatus) -> List[Booking]` - бронирования по статусу оплаты
- `get_overdue(now: datetime) -> List[Booking]` - просроченные бронирования

#### Особенности
- Учет статусов бронирования (PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED, OVERDUE)
- Учет статусов оплаты (PENDING, PARTIAL, PAID, REFUNDED, OVERDUE)
- Проверка пересечений дат при бронировании
- Поддержка исключения конкретного бронирования при проверке доступности

### DocumentRepository
Репозиторий для работы с документами:

#### Основные методы
- `get_by_booking(booking_id: int) -> List[Document]` - получение документов бронирования
- `get_by_client(client_id: int) -> List[Document]` - получение документов клиента
- `get_by_status(status: DocumentStatus) -> List[Document]` - получение документов по статусу
- `search(query_str: str, include_deleted: bool = False) -> List[Document]` - поиск по заголовку и описанию

#### Методы фильтрации
- `get_by_type(document_type: DocumentType, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[Document]` - получение документов по типу с опциональным периодом
- `get_by_date_range(start_date: datetime, end_date: datetime) -> List[Document]` - получение документов за период

#### Особенности
- Case-insensitive поиск по title и description
- Поддержка фильтрации по дате создания
- Поддержка soft delete через include_deleted
- Возможность комбинирования типа документа и периода

## Особенности реализации

### Типизация
- Использование Generic типов
- Строгая типизация всех методов
- Поддержка опциональных параметров

### Асинхронность
- Все методы асинхронные
- Использование SQLAlchemy async session
- Оптимизированные запросы

### Безопасность
- Проверка входных данных
- Защита от SQL-инъекций через ORM
- Мягкое удаление данных

### Производительность
- Оптимизированные запросы
- Использование составных индексов
- Поддержка пагинации

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
