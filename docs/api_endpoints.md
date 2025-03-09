# API Endpoints Documentation

## Categories API

### Base URL
```
/api/v1/categories
```

### Endpoints

#### Create Category
```http
POST /
```

Создает новую категорию оборудования.

**Request Body:**
```json
{
    "name": "string",
    "description": "string",
    "parent_id": "integer | null"
}
```

**Response:** `201 Created`
```json
{
    "id": "integer",
    "name": "string",
    "description": "string",
    "parent_id": "integer | null",
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

**Errors:**
- `400 Bad Request` - категория с таким именем уже существует
- `400 Bad Request` - некорректные данные

#### Get All Categories
```http
GET /
```

Получает список всех категорий.

**Response:** `200 OK`
```json
[
    {
        "id": "integer",
        "name": "string",
        "description": "string",
        "parent_id": "integer | null",
        "created_at": "datetime",
        "updated_at": "datetime"
    }
]
```

#### Get Categories with Equipment Count
```http
GET /with-equipment-count
```

Получает список категорий с количеством единиц оборудования в каждой категории.

**Response:** `200 OK`
```json
[
    {
        "id": "integer",
        "name": "string",
        "description": "string",
        "parent_id": "integer | null",
        "equipment_count": "integer",
        "created_at": "datetime",
        "updated_at": "datetime"
    }
]
```

#### Get Category by ID
```http
GET /{category_id}
```

Получает информацию о конкретной категории по её ID.

**Parameters:**
- `category_id` (path) - ID категории

**Response:** `200 OK`
```json
{
    "id": "integer",
    "name": "string",
    "description": "string",
    "parent_id": "integer | null",
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

**Errors:**
- `404 Not Found` - категория не найдена

#### Update Category
```http
PUT /{category_id}
```

Обновляет информацию о категории.

**Parameters:**
- `category_id` (path) - ID категории

**Request Body:**
```json
{
    "name": "string",
    "description": "string",
    "parent_id": "integer | null"
}
```

**Response:** `200 OK`
```json
{
    "id": "integer",
    "name": "string",
    "description": "string",
    "parent_id": "integer | null",
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

**Errors:**
- `404 Not Found` - категория не найдена
- `400 Bad Request` - категория с таким именем уже существует
- `400 Bad Request` - некорректные данные

#### Delete Category
```http
DELETE /{category_id}
```

Удаляет категорию.

**Parameters:**
- `category_id` (path) - ID категории

**Response:** `204 No Content`

**Errors:**
- `404 Not Found` - категория не найдена
- `400 Bad Request` - категория содержит оборудование или подкатегории

#### Search Categories
```http
GET /search/{query}
```

Поиск категорий по названию или описанию.

**Parameters:**
- `query` (path) - строка поиска

**Response:** `200 OK`
```json
[
    {
        "id": "integer",
        "name": "string",
        "description": "string",
        "parent_id": "integer | null",
        "created_at": "datetime",
        "updated_at": "datetime"
    }
]
```

### Примеры использования

#### Создание категории
```bash
curl -X POST "http://localhost:8000/api/v1/categories/" \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Камеры",
           "description": "Профессиональные видеокамеры",
           "parent_id": null
         }'
```

#### Получение списка категорий с количеством оборудования
```bash
curl "http://localhost:8000/api/v1/categories/with-equipment-count"
```

#### Обновление категории
```bash
curl -X PUT "http://localhost:8000/api/v1/categories/1" \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Видеокамеры",
           "description": "Профессиональные видеокамеры и аксессуары",
           "parent_id": null
         }'
```

#### Поиск категорий
```bash
curl "http://localhost:8000/api/v1/categories/search/камер"
```

## Equipment API

### Base URL
```
/api/v1/equipment
```

### Endpoints

#### Create Equipment
```http
POST /
```

Создает новую единицу оборудования.

**Request Body:**
```json
{
    "name": "string",
    "description": "string | null",
    "barcode": "string",
    "serial_number": "string",
    "category_id": "integer",
    "replacement_cost": "decimal",
    "notes": "string | null"
}
```

**Response:** `201 Created`
```json
{
    "id": "integer",
    "name": "string",
    "description": "string | null",
    "barcode": "string",
    "serial_number": "string",
    "category_id": "integer",
    "replacement_cost": "decimal",
    "notes": "string | null",
    "status": "string",
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

**Errors:**
- `400 Bad Request` - оборудование с таким штрих-кодом или серийным номером уже существует
- `400 Bad Request` - некорректные данные

#### Get Equipment List
```http
GET /
```

Получает список оборудования с возможностью фильтрации.

**Query Parameters:**
- `category_id` (optional) - фильтр по ID категории
- `status` (optional) - фильтр по статусу оборудования (available, rented, maintenance, broken, retired)
- `available_from` (optional) - фильтр по дате начала доступности
- `available_to` (optional) - фильтр по дате окончания доступности
- `skip` (optional, default: 0) - количество пропускаемых записей
- `limit` (optional, default: 100, max: 1000) - максимальное количество возвращаемых записей

**Response:** `200 OK`
```json
[
    {
        "id": "integer",
        "name": "string",
        "description": "string | null",
        "barcode": "string",
        "serial_number": "string",
        "category_id": "integer",
        "category_name": "string",
        "replacement_cost": "decimal",
        "notes": "string | null",
        "status": "string",
        "created_at": "datetime",
        "updated_at": "datetime"
    }
]
```

#### Get Equipment by ID
```http
GET /{equipment_id}
```

Получает информацию о конкретной единице оборудования по её ID.

**Parameters:**
- `equipment_id` (path) - ID оборудования

**Response:** `200 OK`
```json
{
    "id": "integer",
    "name": "string",
    "description": "string | null",
    "barcode": "string",
    "serial_number": "string",
    "category_id": "integer",
    "category_name": "string",
    "replacement_cost": "decimal",
    "notes": "string | null",
    "status": "string",
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

**Errors:**
- `404 Not Found` - оборудование не найдено

#### Update Equipment
```http
PUT /{equipment_id}
```

Обновляет информацию об оборудовании.

**Parameters:**
- `equipment_id` (path) - ID оборудования

**Request Body:**
```json
{
    "name": "string | null",
    "description": "string | null",
    "barcode": "string | null",
    "serial_number": "string | null",
    "category_id": "integer | null",
    "replacement_cost": "decimal | null",
    "notes": "string | null",
    "status": "string | null"
}
```

**Response:** `200 OK`
```json
{
    "id": "integer",
    "name": "string",
    "description": "string | null",
    "barcode": "string",
    "serial_number": "string",
    "category_id": "integer",
    "replacement_cost": "decimal",
    "notes": "string | null",
    "status": "string",
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

**Errors:**
- `404 Not Found` - оборудование не найдено
- `400 Bad Request` - некорректные данные

#### Delete Equipment
```http
DELETE /{equipment_id}
```

Удаляет оборудование.

**Parameters:**
- `equipment_id` (path) - ID оборудования

**Response:** `204 No Content`

**Errors:**
- `404 Not Found` - оборудование не найдено
- `400 Bad Request` - оборудование имеет активные бронирования

#### Get Equipment by Barcode
```http
GET /barcode/{barcode}
```

Получает информацию об оборудовании по штрих-коду.

**Parameters:**
- `barcode` (path) - штрих-код оборудования

**Response:** `200 OK`
```json
{
    "id": "integer",
    "name": "string",
    "description": "string | null",
    "barcode": "string",
    "serial_number": "string",
    "category_id": "integer",
    "category_name": "string",
    "replacement_cost": "decimal",
    "notes": "string | null",
    "status": "string",
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

**Errors:**
- `404 Not Found` - оборудование не найдено

#### Search Equipment
```http
GET /search/{query}
```

Поиск оборудования по названию или описанию.

**Parameters:**
- `query` (path) - строка поиска

**Response:** `200 OK`
```json
[
    {
        "id": "integer",
        "name": "string",
        "description": "string | null",
        "barcode": "string",
        "serial_number": "string",
        "category_id": "integer",
        "category_name": "string",
        "replacement_cost": "decimal",
        "notes": "string | null",
        "status": "string",
        "created_at": "datetime",
        "updated_at": "datetime"
    }
]
```

### Примеры использования

#### Создание оборудования
```bash
curl -X POST "http://localhost:8000/api/v1/equipment/" \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Sony PXW-FX9",
           "description": "Полнокадровая видеокамера",
           "barcode": "CAM-001",
           "serial_number": "FX9-12345",
           "category_id": 1,
           "replacement_cost": 15000.00
         }'
```

#### Получение списка доступного оборудования
```bash
curl "http://localhost:8000/api/v1/equipment/?status=available"
```

#### Поиск оборудования по штрих-коду
```bash
curl "http://localhost:8000/api/v1/equipment/barcode/CAM-001"
```

#### Обновление статуса оборудования
```bash
curl -X PUT "http://localhost:8000/api/v1/equipment/1" \
     -H "Content-Type: application/json" \
     -d '{
           "status": "maintenance"
         }'
```

## Clients API

### Base URL
```
/api/v1/clients
```

### Endpoints

#### Create Client
```http
POST /
```

Создает нового клиента.

**Request Body:**
```json
{
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone": "string",
    "passport_number": "string",
    "address": "string",
    "company": "string (optional)",
    "notes": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
    "id": "integer",
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone": "string",
    "passport_number": "string",
    "address": "string",
    "company": "string",
    "notes": "string",
    "status": "string",
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

**Errors:**
- `400 Bad Request` - некорректные данные клиента
- `409 Conflict` - клиент с таким email или телефоном уже существует

#### Get Clients List
```http
GET /
```

Получает список клиентов с возможностью фильтрации и пагинации.

**Query Parameters:**
- `skip` (optional, default: 0) - количество пропускаемых записей
- `limit` (optional, default: 100, max: 1000) - максимальное количество возвращаемых записей
- `query` (optional) - строка поиска по имени, email или телефону

**Response:** `200 OK`
```json
[
    {
        "id": "integer",
        "first_name": "string",
        "last_name": "string",
        "email": "string",
        "phone": "string",
        "passport_number": "string",
        "address": "string",
        "company": "string",
        "notes": "string",
        "status": "string",
        "created_at": "datetime",
        "updated_at": "datetime"
    }
]
```

#### Get Client by ID
```http
GET /{client_id}/
```

Получает информацию о конкретном клиенте по его ID.

**Parameters:**
- `client_id` (path) - ID клиента

**Response:** `200 OK`
```json
{
    "id": "integer",
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone": "string",
    "passport_number": "string",
    "address": "string",
    "company": "string",
    "notes": "string",
    "status": "string",
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

**Errors:**
- `404 Not Found` - клиент не найден

#### Update Client
```http
PUT /{client_id}/
```

Обновляет информацию о клиенте.

**Parameters:**
- `client_id` (path) - ID клиента

**Request Body:**
```json
{
    "first_name": "string (optional)",
    "last_name": "string (optional)",
    "email": "string (optional)",
    "phone": "string (optional)",
    "passport_number": "string (optional)",
    "address": "string (optional)",
    "company": "string (optional)",
    "notes": "string (optional)"
}
```

**Response:** `200 OK`
```json
{
    "id": "integer",
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone": "string",
    "passport_number": "string",
    "address": "string",
    "company": "string",
    "notes": "string",
    "status": "string",
    "created_at": "datetime",
    "updated_at": "datetime"
}
```

**Errors:**
- `404 Not Found` - клиент не найден
- `400 Bad Request` - некорректные данные клиента
- `409 Conflict` - клиент с таким email или телефоном уже существует

#### Delete Client
```http
DELETE /{client_id}/
```

Удаляет клиента.

**Parameters:**
- `client_id` (path) - ID клиента

**Response:** `204 No Content`

**Errors:**
- `404 Not Found` - клиент не найден
- `409 Conflict` - клиент имеет активные бронирования

#### Get Client Bookings
```http
GET /{client_id}/bookings/
```

Получает список бронирований клиента.

**Parameters:**
- `client_id` (path) - ID клиента

**Query Parameters:**
- `skip` (optional, default: 0) - количество пропускаемых записей
- `limit` (optional, default: 100, max: 1000) - максимальное количество возвращаемых записей
- `booking_status` (optional) - фильтр по статусу бронирования

**Response:** `200 OK`
```json
[
    {
        "id": "integer",
        "equipment_id": "integer",
        "client_id": "integer",
        "start_date": "datetime",
        "end_date": "datetime",
        "status": "string",
        "payment_status": "string",
        "total_amount": "decimal",
        "equipment_name": "string",
        "client_name": "string",
        "created_at": "datetime",
        "updated_at": "datetime"
    }
]
```

**Errors:**
- `404 Not Found` - клиент не найден

### Примеры использования

#### Создание клиента
```bash
curl -X POST "http://localhost:8000/api/v1/clients/" \
     -H "Content-Type: application/json" \
     -d '{
           "first_name": "Иван",
           "last_name": "Петров",
           "email": "ivan@example.com",
           "phone": "+7-999-123-4567",
           "passport_number": "1234 567890",
           "address": "г. Москва, ул. Примерная, д. 1",
           "company": "ООО Фильм"
         }'
```

#### Получение списка клиентов с поиском
```bash
curl "http://localhost:8000/api/v1/clients/?query=иван"
```

#### Обновление клиента
```bash
curl -X PUT "http://localhost:8000/api/v1/clients/1/" \
     -H "Content-Type: application/json" \
     -d '{
           "phone": "+7-999-765-4321",
           "address": "г. Москва, ул. Новая, д. 5"
         }'
```

#### Получение бронирований клиента
```bash
curl "http://localhost:8000/api/v1/clients/1/bookings/"
```
