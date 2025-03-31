# Функциональность живого поиска в таблице оборудования

## 1. Общее описание

Функциональность живого поиска позволяет пользователям мгновенно находить оборудование в системе ACT-RENTAL по мере ввода поискового запроса. Поиск выполняется в реальном времени с фильтрацией результатов без необходимости перезагрузки страницы.

### Основные возможности:
- Поиск по названию, описанию, штрих-коду и серийному номеру оборудования
- Фильтрация по категории и статусу оборудования
- Мгновенное обновление результатов в таблице
- Визуальная индикация процесса поиска
- Обновление URL с параметрами поиска для возможности поделиться результатами

## 2. Архитектура решения

### 2.1. Frontend компоненты

#### HTML структура (frontend/templates/equipment/list.html)
```html
<div class="position-relative">
    <input type="text"
           class="form-control rounded"
           id="searchInput"
           placeholder="Поиск по названию, описанию, штрих-коду или серийному номеру..."
           minlength="3">
    <div id="search-spinner" class="spinner-border spinner-border-sm d-none text-primary position-absolute"
         style="right: 10px; top: 50%; transform: translateY(-50%)" role="status">
        <span class="visually-hidden">Поиск...</span>
    </div>
</div>
```

#### JavaScript модуль (frontend/static/js/main.js)
Основной модуль `equipmentSearch` отвечает за инициализацию и обработку поисковых запросов:

```javascript
const equipmentSearch = {
    init() {
        const searchInput = document.querySelector('#searchInput');
        const categoryFilter = document.querySelector('#categoryFilter');
        const statusFilter = document.querySelector('#statusFilter');
        const searchSpinner = document.querySelector('#search-spinner');

        // Обработчики событий
        searchInput.addEventListener('input', updateResults);
        categoryFilter.addEventListener('change', updateResults);
        statusFilter.addEventListener('change', updateResults);

        // Функция обновления результатов с debounce
        const updateResults = debounce(async () => {
            // Логика запроса и обновления таблицы
        }, 300);
    }
};
```

### 2.2. Backend компоненты

#### API Endpoint (backend/api/v1/endpoints/equipment.py)
```python
@typed_get(
    equipment_router,
    '/',
    response_model=List[EquipmentResponse],
)
async def get_equipment_list(
    skip: Optional[int] = Query(0),
    limit: Optional[int] = Query(100),
    status: Optional[EquipmentStatus] = None,
    category_id: Optional[int] = None,
    query: Optional[str] = None,
    available_from: Optional[datetime] = None,
    available_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
) -> List[EquipmentResponse]:
    """Get list of equipment with optional filtering."""
    # Валидация и обработка запроса
    equipment_service = EquipmentService(db)
    equipment_list = await equipment_service.get_equipment_list(
        skip=skip,
        limit=limit,
        status=status,
        category_id=category_id,
        query=query,
        available_from=available_from,
        available_to=available_to,
    )
    return equipment_list
```

#### Сервисный слой (backend/services/equipment.py)
```python
async def get_equipment_list(
    self,
    skip: int = 0,
    limit: int = 100,
    status: Optional[EquipmentStatus] = None,
    category_id: Optional[int] = None,
    query: Optional[str] = None,
    available_from: Optional[datetime] = None,
    available_to: Optional[datetime] = None,
) -> List[EquipmentResponse]:
    """Get list of equipment with optional filtering."""
    # Валидация и подготовка параметров
    equipment_list = await self.repository.get_list(
        skip=skip,
        limit=limit,
        status=status,
        category_id=category_id,
        query=query,
        available_from=available_from,
        available_to=available_to,
    )
    return [
        EquipmentResponse.model_validate(equipment) for equipment in equipment_list
    ]
```

#### Репозиторий (backend/repositories/equipment.py)
```python
async def get_list(
    self,
    skip: int = 0,
    limit: int = 100,
    status: Optional[EquipmentStatus] = None,
    category_id: Optional[int] = None,
    query: Optional[str] = None,
    available_from: Optional[datetime] = None,
    available_to: Optional[datetime] = None,
) -> List[Equipment]:
    """Get list of equipment with optional filtering and search."""
    stmt = select(Equipment)

    if status:
        stmt = stmt.where(Equipment.status == status)
    if category_id:
        stmt = stmt.where(Equipment.category_id == category_id)
    if query:
        search_pattern = f'%{query}%'
        stmt = stmt.where(
            or_(
                Equipment.name.ilike(search_pattern),
                Equipment.description.ilike(search_pattern),
                Equipment.barcode.ilike(search_pattern),
                Equipment.serial_number.ilike(search_pattern),
            )
        )

    # Дополнительная фильтрация по датам доступности
    # ...

    stmt = stmt.offset(skip).limit(limit)
    result = await self.session.execute(stmt)
    return list(result.scalars().all())
```

### 2.3. Оптимизация базы данных

Для обеспечения высокой производительности поиска используются GIN индексы PostgreSQL с расширением pg_trgm:

```sql
-- Создание расширения для поиска по триграммам
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Индексы для полей поиска
CREATE INDEX idx_equipment_name_search ON equipment USING gin (name gin_trgm_ops);
CREATE INDEX idx_equipment_barcode_search ON equipment USING gin (barcode gin_trgm_ops);
CREATE INDEX idx_equipment_description_search ON equipment USING gin (description gin_trgm_ops);
CREATE INDEX idx_equipment_serial_number_search ON equipment USING gin (serial_number gin_trgm_ops);
```

## 3. Алгоритм работы

### 3.1. Процесс поиска

1. Пользователь вводит текст в поле поиска
2. Если длина запроса ≥ 3 символов, активируется функция поиска
3. Отображается индикатор загрузки (спиннер)
4. Выполняется debounce для предотвращения частых запросов
5. Формируется URL с параметрами поиска и фильтрации
6. Отправляется AJAX запрос к API
7. Обновляется URL в браузере без перезагрузки страницы
8. Результаты отображаются в таблице
9. Скрывается индикатор загрузки

### 3.2. Обработка ошибок

- При ошибке запроса отображается уведомление с помощью функции `showToast`
- Логирование ошибок в консоль и на сервере
- Возврат к предыдущему состоянию при неудачном запросе

## 4. Производительность

### 4.1. Оптимизации на стороне клиента

- Использование debounce для предотвращения частых запросов (300мс)
- Минимальная длина запроса (3 символа) для уменьшения нагрузки
- Асинхронное обновление DOM без перезагрузки страницы

### 4.2. Оптимизации на стороне сервера

- Использование GIN индексов для быстрого поиска по текстовым полям
- Расширение pg_trgm для эффективного поиска подстрок
- Асинхронная обработка запросов с помощью FastAPI
- Ограничение размера результатов (пагинация)

## 5. Тестирование

### 5.1. Unit тесты

```python
async def test_search_by_name():
    """Тест поиска по имени оборудования."""
    service = EquipmentService(db_session)
    results = await service.search("Sony")
    assert len(results) > 0
    assert all("Sony" in item.name.lower() for item in results)

async def test_search_case_insensitive():
    """Тест нечувствительности к регистру."""
    service = EquipmentService(db_session)
    results_lower = await service.search("sony")
    results_upper = await service.search("SONY")
    assert len(results_lower) == len(results_upper)
```

### 5.2. Интеграционные тесты

```python
async def test_search_endpoint():
    """Тест endpoint поиска."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/equipment/?query=sony")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert all("sony" in item["name"].lower() for item in data)
```

### 5.3. E2E тесты

```javascript
describe('Equipment Search', () => {
    beforeEach(() => {
        cy.visit('/equipment');
    });

    it('should search as user types', () => {
        cy.get('#searchInput')
            .type('sony');
        cy.get('#search-spinner').should('be.visible');
        cy.get('table tbody tr').should('have.length.gt', 0);
        cy.get('table tbody tr').each(($row) => {
            cy.wrap($row).should('contain.text', 'Sony');
        });
    });
});
```

## 6. Мониторинг и логирование

### 6.1. Метрики для мониторинга

- Время отклика API endpoint `/equipment/?query={query}`
- Количество запросов к поиску в минуту
- Процент неудачных запросов

### 6.2. Логирование

```python
# Формат логов
{
    "time": "2024-02-21T11:34:33",
    "level": "INFO",
    "name": "backend.api.equipment",
    "function": "search_equipment",
    "line": 123,
    "query": "sony",
    "results_count": 5,
    "response_time_ms": 45
}
```

## 7. Возможные улучшения

1. **Полнотекстовый поиск**: Внедрение более продвинутых возможностей поиска с использованием PostgreSQL Full Text Search или Elasticsearch
2. **Автодополнение**: Добавление выпадающего списка с предложениями по мере ввода
3. **Сохранение истории поиска**: Отслеживание и отображение недавних поисковых запросов пользователя
4. **Фасетный поиск**: Расширение фильтрации с динамическим обновлением доступных фильтров
5. **Кеширование результатов**: Использование Redis для кеширования частых поисковых запросов

## 8. Заключение

Функциональность живого поиска в таблице оборудования обеспечивает быстрый и удобный способ нахождения нужного оборудования в системе ACT-RENTAL. Благодаря оптимизациям на стороне клиента и сервера, а также использованию современных технологий, поиск работает быстро и эффективно даже при большом количестве данных.
