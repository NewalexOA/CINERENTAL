### Техническое задание: Реализация живого поиска в таблице оборудования

**1. Цель:**
Реализация функционала мгновенного поиска по таблице оборудования с фильтрацией результатов в реальном времени.

**2. Текущее состояние и необходимые изменения:**

2.1. Frontend (HTML):
```html
Уже реализовано:
- Базовая структура страницы оборудования
- Поле поиска с id="searchInput"
- Таблица для отображения результатов

Требуется добавить:
- Спиннер загрузки рядом с полем поиска
- Обновить placeholder с описанием поиска
- Добавить атрибут minlength="3"
```

2.2. Frontend (JavaScript):
```javascript
Уже реализовано:
- API клиент с методами GET, POST, PUT, DELETE
- Функция showToast для отображения уведомлений
- Базовая обработка ошибок

Требуется добавить:
- Обработчик события input для поля поиска
- Реализацию debounce
- Логику живого поиска
- Обновление таблицы результатов
```

2.3. Backend:
```python
Уже реализовано:
- Endpoint GET /equipment/search/{query}
- Поиск по полям: name, description, barcode, serial_number
- Нечувствительность к регистру через ILIKE
- Поддержка частичного совпадения
- Валидация входных данных
- Обработка исключений
- Логирование через loguru

Дополнительные изменения не требуются
```

**3. Задачи для реализации:**

3.1. Модификация HTML:
```html
<div class="input-group">
    <input type="text"
           class="form-control"
           id="searchInput"
           placeholder="Поиск по названию, описанию, штрих-коду или серийному номеру..."
           minlength="3">
    <div id="search-spinner" class="spinner-border spinner-border-sm d-none" role="status">
        <span class="visually-hidden">Поиск...</span>
    </div>
</div>
```

3.2. Добавление JavaScript:
```javascript
// Добавить в main.js:
const equipmentSearch = {
    init() {
        const searchInput = document.querySelector('#searchInput');
        const searchSpinner = document.querySelector('#search-spinner');

        searchInput.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.trim();

            searchSpinner.classList.remove('d-none');
            try {
                if (query.length < 3) {
                    const results = await api.get('/equipment');
                    updateEquipmentTable(results);
                    return;
                }

                const results = await api.get(`/equipment/search/${encodeURIComponent(query)}`);
                updateEquipmentTable(results);
            } catch (error) {
                console.error('Search error:', error);
                showToast('Ошибка при поиске оборудования', 'danger');
            } finally {
                searchSpinner.classList.add('d-none');
            }
        }, 300));
    }
};

// Функция updateEquipmentTable уже существует в шаблоне
```

3.3. Оптимизация базы данных:
```sql
-- Создать миграцию для добавления индексов:
CREATE INDEX idx_equipment_name_search ON equipment USING gin (name gin_trgm_ops);
CREATE INDEX idx_equipment_barcode_search ON equipment USING gin (barcode gin_trgm_ops);
CREATE INDEX idx_equipment_description_search ON equipment USING gin (description gin_trgm_ops);
CREATE INDEX idx_equipment_serial_number_search ON equipment USING gin (serial_number gin_trgm_ops);
```

**4. План реализации:**

1. Создание миграции (1 день):
   - Создать файл миграции для индексов - ✓
   - Проверить и применить миграцию - ✓

2. Frontend изменения (1 день):
   - Обновить HTML шаблон - ✓
   - Добавить JavaScript код - ✓
   - Протестировать работу поиска - ✓

3. Написание тестов (1-2 дня):
   - Создать unit тесты - ✓
   - Создать integration тесты - ✓
   - Создать e2e тесты для frontend - ❌

4. Тестирование и отладка (1 день):
   - Проверить производительность поиска
   - Проверить корректность работы UI
   - Проверить обработку ошибок

**5. Критерии приемки:**

5.1. Функциональные:
- Поиск начинается после ввода 3 символов ✓
- Результаты обновляются в реальном времени ✓
- При очистке поля показывается полный список ✓
- Отображается индикатор загрузки ✓

5.2. Нефункциональные:
- Время отклика поиска < 300мс
- Корректная работа debounce
- Плавное обновление UI
- Понятные сообщения об ошибках

5.3. Тестовое покрытие:
- Unit тесты покрывают > 80% нового кода
- Все критические пути покрыты integration тестами
- E2E тесты проверяют основные сценарии использования

**6. Риски:**

1. Производительность:
   - Уже реализовано: оптимизированные SQL запросы
   - Требуется: добавить индексы для улучшения производительности

2. UI/UX:
   - Уже реализовано: базовый интерфейс
   - Требуется: добавить индикацию загрузки и обработку ошибок

**7. Зависимости:**

Все необходимые зависимости уже установлены:
- FastAPI для backend
- SQLAlchemy для работы с БД
- Bootstrap для UI
- Существующий API клиент

**8. Тестирование:**

8.1. Unit тесты:
```python
# tests/unit/test_equipment_search.py

async def test_search_by_name():
    """Тест поиска по имени оборудования."""
    service = EquipmentService(db_session)
    results = await service.search("Sony")
    assert len(results) > 0
    assert all("Sony" in item.name.lower() for item in results)

async def test_search_by_barcode():
    """Тест поиска по штрих-коду."""
    service = EquipmentService(db_session)
    results = await service.search("CAM001")
    assert len(results) > 0
    assert all("CAM001" in item.barcode for item in results)

async def test_search_case_insensitive():
    """Тест нечувствительности к регистру."""
    service = EquipmentService(db_session)
    results_lower = await service.search("sony")
    results_upper = await service.search("SONY")
    assert len(results_lower) == len(results_upper)

async def test_search_partial_match():
    """Тест частичного совпадения."""
    service = EquipmentService(db_session)
    results = await service.search("son")
    assert len(results) > 0
    assert all("son" in item.name.lower() for item in results)

async def test_search_min_length():
    """Тест минимальной длины запроса."""
    service = EquipmentService(db_session)
    with pytest.raises(ValidationError):
        await service.search("so")
```

8.2. Integration тесты:
```python
# tests/integration/test_equipment_search_api.py

async def test_search_endpoint():
    """Тест endpoint поиска."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/equipment/search/sony")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert all("sony" in item["name"].lower() for item in data)

async def test_search_no_results():
    """Тест поиска без результатов."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/equipment/search/nonexistent")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0

async def test_search_invalid_query():
    """Тест невалидного запроса."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/equipment/search/ab")
        assert response.status_code == 400
```

8.3. E2E тесты (Frontend):
```javascript
// tests/e2e/equipment_search.spec.js

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

    it('should show all equipment when search is cleared', () => {
        cy.get('#searchInput')
            .type('sony')
            .clear();
        cy.get('table tbody tr').should('have.length.gt', 0);
    });

    it('should handle no results', () => {
        cy.get('#searchInput')
            .type('nonexistent');
        cy.get('table tbody').should('contain.text', 'Ничего не найдено');
    });

    it('should debounce search requests', () => {
        cy.get('#searchInput')
            .type('son', { delay: 100 });
        cy.get('#search-spinner').should('be.visible');
        cy.wait(300); // Wait for debounce
        cy.get('#search-spinner').should('not.be.visible');
    });
});
```

8.4. Тестирование производительности:
```python
# tests/performance/test_search_performance.py

async def test_search_response_time():
    """Тест времени отклика поиска."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        start_time = time.time()
        response = await client.get("/api/v1/equipment/search/sony")
        end_time = time.time()

        assert response.status_code == 200
        assert (end_time - start_time) < 0.3  # Проверка на время отклика < 300мс

async def test_search_under_load():
    """Тест производительности под нагрузкой."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        tasks = []
        for _ in range(50):  # Симуляция 50 одновременных запросов
            tasks.append(client.get("/api/v1/equipment/search/sony"))

        start_time = time.time()
        responses = await asyncio.gather(*tasks)
        end_time = time.time()

        assert all(r.status_code == 200 for r in responses)
        assert (end_time - start_time) < 5  # Все запросы должны выполниться менее чем за 5 секунд
```

**9. Требования к окружению:**

9.1. Разработка:
```bash
# Версии ПО (уже установлены)
- Python 3.12
- PostgreSQL 14+
- Docker и Docker Compose

# Python пакеты (уже в requirements.txt)
- fastapi==0.104.1
- sqlalchemy[asyncio]==2.0.25
- pydantic==2.5.1
- pytest==7.4.3
- pytest-asyncio==0.21.1
- pytest-cov==4.1.0
- httpx==0.25.1
- loguru==0.7.2

# PostgreSQL расширения
- pg_trgm (требуется установить)
```

9.2. Продакшен:
```bash
# Уже настроено в Docker
- Python 3.12-slim
- PostgreSQL 14+
- Redis 6+
- Nginx (для статических файлов)
```

**10. Инструкции по развертыванию:**

10.1. Установка зависимостей:
```bash
# Все зависимости уже в requirements.txt и docker-compose
# Требуется только:
psql -d cinerental -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

10.2. Применение миграций:
```bash
# Используем существующий механизм миграций
alembic revision --autogenerate -m "Add search indices"
alembic upgrade head
```

10.3. Запуск тестов:
```bash
# Используем существующие команды
make test  # Запуск всех тестов
pytest tests/unit tests/integration -v  # Выборочный запуск
```

**11. Мониторинг и логирование:**

11.1. Метрики для мониторинга:
```python
# Использовать существующую конфигурацию логирования в backend/core/logging.py
- Время отклика API endpoint /equipment/search/{query}
- Количество запросов к поиску в минуту
- Процент неудачных запросов
```

11.2. Логирование:
```python
# Использовать существующий формат из LogConfig:
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

# События уже настроены в логгере:
- Начало поискового запроса
- Завершение поиска с результатами
- Ошибки поиска
- Медленные запросы
```

11.3. Алерты:
```python
# Добавить в существующую систему логирования:
logger.bind(name='backend.api.equipment').warning(
    'Slow search response: {response_time_ms}ms for query "{query}"',
    response_time_ms=response_time,
    query=query,
)
```

**12. Откат изменений:**

12.1. Откат миграции:
```bash
# Использовать существующий механизм:
alembic downgrade -1
```

12.2. Откат фронтенд изменений:
```javascript
// Использовать систему контроля версий:
git checkout -- frontend/static/js/main.js
git checkout -- frontend/templates/equipment/list.html
```

**13. Поддержка и обновление:**

13.1. Документация:
- Добавить раздел о поиске в существующую документацию `docs/architecture.md`
- Обновить `docs/development_plan.md`
- Добавить примеры в `docs/code_style.md`

13.2. План обновлений:
- Использовать существующую систему логирования для сбора метрик
- Анализировать логи для оптимизации
- Следовать существующему процессу разработки с pre-commit хуками
- Поддерживать актуальность тестов
