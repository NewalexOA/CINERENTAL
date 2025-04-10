# Схема базы данных ACT-RENTAL

## Обзор
База данных ACT-RENTAL спроектирована для эффективного управления прокатом оборудования. Схема включает в себя следующие основные сущности:
- Categories (Категории оборудования)
- Equipment (Оборудование)
- Clients (Клиенты)
- Bookings (Бронирования)
- Documents (Документы)

## ERD Диаграмма
ERD диаграмма доступна в файле [database_schema.puml](database_schema.puml). Для визуализации используйте PlantUML.

## Описание таблиц

### Categories
Таблица для хранения иерархической структуры категорий оборудования.
- `id` (INTEGER, PK) - уникальный идентификатор категории
- `name` (VARCHAR(100), NOT NULL, INDEX) - название категории
- `description` (VARCHAR(500), INDEX) - описание категории
- `parent_id` (INTEGER, FK) - ссылка на родительскую категорию (CASCADE)
- `created_at` (TIMESTAMP WITH TIMEZONE, NOT NULL, INDEX) - дата и время создания
- `updated_at` (TIMESTAMP WITH TIMEZONE, NOT NULL, INDEX) - дата и время последнего обновления

### Equipment
Таблица для хранения информации об оборудовании.
- `id` (INTEGER, PK) - уникальный идентификатор оборудования
- `name` (VARCHAR(200), NOT NULL, INDEX) - название оборудования
- `description` (VARCHAR(1000), INDEX) - описание оборудования
- `serial_number` (VARCHAR(100), NOT NULL, UNIQUE, INDEX) - серийный номер
- `barcode` (VARCHAR(100), NOT NULL, UNIQUE, INDEX) - штрих-код для идентификации
- `category_id` (INTEGER, FK, NOT NULL) - ссылка на категорию (RESTRICT)
- `status` (ENUM, NOT NULL, INDEX) - статус оборудования:
  - AVAILABLE (доступно)
  - RENTED (в аренде)
  - MAINTENANCE (на обслуживании)
  - BROKEN (сломано)
  - RETIRED (списано)

- `replacement_cost` (INTEGER, NOT NULL) - стоимость замены
- `notes` (VARCHAR(1000)) - дополнительные заметки
- `created_at` (TIMESTAMP WITH TIMEZONE, NOT NULL, INDEX) - дата и время создания
- `updated_at` (TIMESTAMP WITH TIMEZONE, NOT NULL, INDEX) - дата и время последнего обновления
- `deleted_at` (TIMESTAMP WITH TIMEZONE, INDEX) - дата и время удаления (soft delete)

### Clients
Таблица для хранения информации о клиентах.
- `id` (INTEGER, PK) - уникальный идентификатор клиента
- `first_name` (VARCHAR(100), NOT NULL) - имя клиента
- `last_name` (VARCHAR(100), NOT NULL) - фамилия клиента
- `email` (VARCHAR(255), NOT NULL, UNIQUE, INDEX) - email адрес
- `phone` (VARCHAR(20), NOT NULL) - номер телефона
- `company` (VARCHAR(200)) - название компании
- `status` (ENUM, NOT NULL, INDEX) - статус клиента:
  - ACTIVE (активный)
  - BLOCKED (заблокирован)
  - ARCHIVED (в архиве)
- `notes` (VARCHAR(1000)) - дополнительные заметки
- `passport_number` (VARCHAR(50), NOT NULL) - номер паспорта
- `address` (VARCHAR(500), NOT NULL) - адрес
- `created_at` (TIMESTAMP WITH TIMEZONE, NOT NULL, INDEX) - дата и время создания
- `updated_at` (TIMESTAMP WITH TIMEZONE, NOT NULL, INDEX) - дата и время последнего обновления
- `deleted_at` (TIMESTAMP WITH TIMEZONE, INDEX) - дата и время удаления (soft delete)

### Bookings
Таблица для хранения информации о бронированиях.
- `id` (INTEGER, PK) - уникальный идентификатор бронирования
- `client_id` (INTEGER, FK, NOT NULL) - ссылка на клиента (RESTRICT)
- `equipment_id` (INTEGER, FK, NOT NULL) - ссылка на оборудование (RESTRICT)
- `start_date` (TIMESTAMP WITH TIMEZONE, NOT NULL, INDEX) - дата начала аренды
- `end_date` (TIMESTAMP WITH TIMEZONE, NOT NULL, INDEX) - дата окончания аренды
- `actual_return_date` (TIMESTAMP WITH TIMEZONE) - фактическая дата возврата
- `booking_status` (ENUM, NOT NULL, INDEX) - статус бронирования:
  - PENDING (ожидает подтверждения)
  - CONFIRMED (подтверждено)
  - ACTIVE (активно)
  - COMPLETED (завершено)
  - CANCELLED (отменено)
  - OVERDUE (просрочено)
- `payment_status` (ENUM, NOT NULL, INDEX) - статус оплаты:
  - PENDING (ожидает оплаты)
  - PARTIAL (частично оплачено)
  - PAID (полностью оплачено)
  - REFUNDED (возвращено)
  - OVERDUE (просрочено)
- `total_amount` (NUMERIC(10,2), NOT NULL) - общая стоимость аренды
- `paid_amount` (NUMERIC(10,2), NOT NULL) - оплаченная сумма
- `deposit_amount` (NUMERIC(10,2), NOT NULL) - сумма депозита
- `notes` (VARCHAR(1000)) - дополнительные заметки
- `created_at` (TIMESTAMP WITH TIMEZONE, NOT NULL, INDEX) - дата и время создания
- `updated_at` (TIMESTAMP WITH TIMEZONE, NOT NULL, INDEX) - дата и время последнего обновления

### Documents
Таблица для хранения документов, связанных с бронированиями.
- `id` (INTEGER, PK) - уникальный идентификатор документа
- `client_id` (INTEGER, FK, NOT NULL) - ссылка на клиента (RESTRICT)
- `booking_id` (INTEGER, FK) - ссылка на бронирование (SET NULL)
- `type` (ENUM, NOT NULL, INDEX) - тип документа:
  - CONTRACT (договор)
  - INVOICE (счет)
  - RECEIPT (квитанция)
  - PASSPORT (паспорт)
  - DAMAGE_REPORT (акт о повреждении)
  - INSURANCE (страховка)
  - OTHER (прочее)
- `status` (ENUM, NOT NULL, INDEX) - статус документа:
  - DRAFT (черновик)
  - PENDING (на рассмотрении)
  - UNDER_REVIEW (на проверке)
  - APPROVED (одобрен)
  - REJECTED (отклонен)
  - EXPIRED (истек)
  - CANCELLED (отменен)
- `title` (VARCHAR(200), NOT NULL) - название документа
- `description` (VARCHAR(1000)) - описание документа
- `file_path` (VARCHAR(500), NOT NULL) - путь к файлу
- `file_name` (VARCHAR(255), NOT NULL) - имя файла
- `file_size` (INTEGER, NOT NULL) - размер файла в байтах
- `mime_type` (VARCHAR(100), NOT NULL) - MIME-тип файла
- `notes` (VARCHAR(1000)) - дополнительные заметки
- `created_at` (TIMESTAMP WITH TIMEZONE, NOT NULL, INDEX) - дата и время создания
- `updated_at` (TIMESTAMP WITH TIMEZONE, NOT NULL, INDEX) - дата и время последнего обновления
