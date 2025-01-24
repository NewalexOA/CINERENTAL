# Схема базы данных CINERENTAL

## Обзор
База данных CINERENTAL спроектирована для эффективного управления прокатом оборудования. Схема включает в себя следующие основные сущности:
- Categories (Категории оборудования)
- Equipment (Оборудование)
- Clients (Клиенты)
- Bookings (Бронирования)
- Booking Items (Позиции бронирования)
- Documents (Документы)

## ERD Диаграмма
ERD диаграмма доступна в файле [database_schema.puml](database_schema.puml). Для визуализации используйте PlantUML.

## Описание таблиц

### Categories
Таблица для хранения иерархической структуры категорий оборудования.
- `id` (UUID, PK) - уникальный идентификатор категории
- `name` (VARCHAR(255)) - название категории
- `description` (TEXT) - описание категории
- `parent_id` (UUID, FK) - ссылка на родительскую категорию
- `created_at` (TIMESTAMP) - дата и время создания
- `updated_at` (TIMESTAMP) - дата и время последнего обновления

### Equipment
Таблица для хранения информации об оборудовании.
- `id` (UUID, PK) - уникальный идентификатор оборудования
- `category_id` (UUID, FK) - ссылка на категорию
- `name` (VARCHAR(255)) - название оборудования
- `description` (TEXT) - описание оборудования
- `barcode` (VARCHAR(50)) - штрих-код для идентификации
- `daily_price` (DECIMAL) - стоимость аренды в день
- `status` (VARCHAR(20)) - статус оборудования (available, booked, maintenance)
- `created_at` (TIMESTAMP) - дата и время создания
- `updated_at` (TIMESTAMP) - дата и время последнего обновления

### Clients
Таблица для хранения информации о клиентах.
- `id` (UUID, PK) - уникальный идентификатор клиента
- `first_name` (VARCHAR(100)) - имя клиента
- `last_name` (VARCHAR(100)) - фамилия клиента
- `email` (VARCHAR(255)) - email адрес
- `phone` (VARCHAR(20)) - номер телефона
- `address` (TEXT) - адрес
- `created_at` (TIMESTAMP) - дата и время создания
- `updated_at` (TIMESTAMP) - дата и время последнего обновления

### Bookings
Таблица для хранения информации о бронированиях.
- `id` (UUID, PK) - уникальный идентификатор бронирования
- `client_id` (UUID, FK) - ссылка на клиента
- `start_date` (TIMESTAMP) - дата начала аренды
- `end_date` (TIMESTAMP) - дата окончания аренды
- `status` (VARCHAR(20)) - статус бронирования (pending, active, completed, cancelled)
- `total_price` (DECIMAL) - общая стоимость аренды
- `created_at` (TIMESTAMP) - дата и время создания
- `updated_at` (TIMESTAMP) - дата и время последнего обновления

### Booking Items
Таблица для хранения позиций в бронировании.
- `id` (UUID, PK) - уникальный идентификатор позиции
- `booking_id` (UUID, FK) - ссылка на бронирование
- `equipment_id` (UUID, FK) - ссылка на оборудование
- `daily_price` (DECIMAL) - стоимость аренды в день на момент бронирования
- `created_at` (TIMESTAMP) - дата и время создания
- `updated_at` (TIMESTAMP) - дата и время последнего обновления

### Documents
Таблица для хранения документов, связанных с бронированиями.
- `id` (UUID, PK) - уникальный идентификатор документа
- `booking_id` (UUID, FK) - ссылка на бронирование
- `type` (VARCHAR(50)) - тип документа (contract, invoice, act)
- `number` (VARCHAR(100)) - номер документа
- `content` (TEXT) - содержимое документа
- `created_at` (TIMESTAMP) - дата и время создания
- `updated_at` (TIMESTAMP) - дата и время последнего обновления 