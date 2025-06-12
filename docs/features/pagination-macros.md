# Универсальные макросы пагинации

## Описание

Созданы универсальные макросы для переиспользования компонентов пагинации в разных частях приложения. Включают функциональность сохранения размера страницы между перезагрузками через localStorage.

## Файлы

- **Макросы**: `frontend/templates/macros.jinja2`
- **Применение**: `frontend/templates/projects/view.html`

## Доступные макросы

### 1. `pagination()` - Полная пагинация

Полнофункциональный макрос пагинации с селектором размера страницы.

#### Параметры

```jinja2
{% from "macros.jinja2" import pagination %}

{{ pagination(
    prefix="equipment",                  # Префикс для ID элементов (обязательный)
    page_start_id=None,                 # ID для начального элемента (опционально)
    page_end_id=None,                   # ID для конечного элемента (опционально)
    total_items_id=None,                # ID для общего количества (опционально)
    total_pages_id=None,                # ID для общего количества страниц (опционально)
    current_page_id=None,               # ID для текущей страницы (опционально)
    page_size_id=None,                  # ID для селектора размера (опционально)
    prev_page_id=None,                  # ID для кнопки "назад" (опционально)
    next_page_id=None,                  # ID для кнопки "вперед" (опционально)
    page_sizes=[20, 50, 100],           # Доступные размеры страниц
    default_page_size=20,               # Размер страницы по умолчанию
    show_all_option=true,               # Показывать опцию "Все"
    container_class="..."               # CSS классы контейнера
) }}
```

#### Пример использования

```jinja2
{{ pagination("equipment", default_page_size=20) }}
```

#### Генерируемые ID

При использовании префикса `"equipment"` автоматически создаются:

- `equipmentPagination` - контейнер пагинации
- `equipmentPageStart` - начальный элемент
- `equipmentPageEnd` - конечный элемент
- `equipmentTotalItems` - общее количество
- `equipmentTotalPages` - общее количество страниц
- `equipmentCurrentPage` - текущая страница
- `equipmentPageSize` - селектор размера
- `equipmentPrevPage` - кнопка "назад"
- `equipmentNextPage` - кнопка "вперед"

### 2. `simple_pagination()` - Упрощенная пагинация

Упрощенный макрос пагинации без селектора размера страницы (для каталогов).

#### Параметры

```jinja2
{% from "macros.jinja2" import simple_pagination %}

{{ simple_pagination(
    prefix="catalog",                   # Префикс для ID элементов (обязательный)
    page_start_id=None,                 # ID для начального элемента (опционально)
    page_end_id=None,                   # ID для конечного элемента (опционально)
    total_items_id=None,                # ID для общего количества (опционально)
    prev_page_id=None,                  # ID для кнопки "назад" (опционально)
    next_page_id=None,                  # ID для кнопки "вперед" (опционально)
    container_class="d-none",           # CSS классы контейнера
    show_total_pages=false              # Показывать общее количество страниц
) }}
```

#### Пример использования

```jinja2
{{ simple_pagination("catalog") }}
```

#### Генерируемые ID

При использовании префикса `"catalog"` автоматически создаются:

- `catalogPagination` - контейнер пагинации
- `catalogPageStart` - начальный элемент
- `catalogPageEnd` - конечный элемент
- `catalogTotalItems` - общее количество
- `catalogPrevPage` - кнопка "назад"
- `catalogNextPage` - кнопка "вперед"

## Структура вывода

### Полная пагинация

```text
[Показано 1-50 из 57 (Всего 2 стр.)]    [20 ▼] [« 1 »]
```

### Упрощенная пагинация

```text
[Показано 1-20 из 57]                   [‹ ›]
```

## JavaScript интеграция

Все ID элементов сохраняются совместимыми с существующим JavaScript кодом. Логика пагинации работает без изменений.

## Преимущества

1. **Переиспользование кода** - один макрос для всех страниц
2. **Единообразие интерфейса** - везде одинаковый вид пагинации
3. **Легкое сопровождение** - изменения в одном месте
4. **Гибкость настройки** - настройка через параметры
5. **Обратная совместимость** - все ID сохранены
6. **Умная обработка "Все"** - опция "Все" использует реальное количество элементов
7. **Точное отслеживание выбора** - селектор показывает "100", даже если элементов меньше

## Применение в других местах

Для использования в других шаблонах:

1. Добавьте импорт:

    ```jinja2
    {% from "macros.jinja2" import pagination, simple_pagination %}
    ```

2. Используйте макрос с уникальным префиксом:

    ```jinja2
    {{ pagination("clients", default_page_size=50) }}
    {{ simple_pagination("search") }}
    ```

## Примеры для разных секций

```jinja2
{# Клиенты #}
{{ pagination("clients", default_page_size=25, page_sizes=[25, 50, 100]) }}

{# Оборудование в проекте - двойная пагинация #}
{{ pagination("equipmentTop", default_page_size=20) }}
{{ pagination("equipmentBottom", default_page_size=20) }}

{# Список проектов - множественная пагинация для разных режимов #}
{{ pagination("projectsTop", default_page_size=20) }}
{{ pagination("projectsBottom", default_page_size=20) }}
{{ pagination("projectsCardTop", default_page_size=20) }}
{{ pagination("projectsCardBottom", default_page_size=20) }}

{# Поиск в каталоге #}
{{ simple_pagination("search") }}

{# Бронирования #}
{{ pagination("bookings", default_page_size=30, show_all_option=false) }}
```

## Сохранение размера страницы (Version 1.1.0)

### Функциональность

Система автоматически сохраняет выбранный пользователем размер страницы в `localStorage` и восстанавливает его при следующем посещении страницы.

### Настройки в JavaScript

```javascript
// В конфигурации Pagination включены следующие опции:
new Pagination({
    options: {
        persistPageSize: true,  // Включить сохранение размера страницы
        storageKey: 'project_equipment_pagesize_123',  // Уникальный ключ для каждого проекта
        useUrlParams: false     // Использование URL параметров (опционально)
    }
});
```

### Приоритет восстановления

1. **URL параметр** (если `useUrlParams: true`) - `?size=50` или `?size=all`
2. **localStorage** - сохраненное значение пользователя
3. **Значение по умолчанию** - из конфигурации

### Ключи хранения

- `project_equipment_pagesize_{projectId}` - для списка оборудования в проектах
- `projects_list_pagesize` - для общего списка проектов
- `pagination_pagesize` - стандартный ключ для общих случаев

### Поддержка опции "Все"

Система корректно сохраняет и восстанавливает выбор "Все":
- Сохраняется как строка `'all'` в localStorage
- При восстановлении правильно устанавливается флаг `isShowingAll`
- Селектор отображает "Все" вместо числового значения

### Примеры использования

```javascript
// Уникальное хранение для разных проектов
storageKey: `project_equipment_pagesize_${projectId}`

// Общее хранение для списков клиентов
storageKey: 'clients_pagesize'

// Список проектов
storageKey: 'projects_list_pagesize'

// С поддержкой URL параметров
useUrlParams: true  // Размер страницы будет в URL
```

## Version History

### Version 1.1.0 (December 2024)
- **ENHANCED**: Добавлено сохранение размера страницы через localStorage
- **NEW**: Поддержка URL-параметров для состояния пагинации (опционально)
- **NEW**: Уникальные ключи хранения для изоляции настроек между проектами
- **IMPROVED**: Размер страницы сохраняется между перезагрузками страницы
- **ENHANCED**: Улучшенная обработка состояния опции "Все"

### Version 1.0.0 (December 2024)
- Начальная реализация с двумя типами макросов
- Полная пагинация с селектором размера страницы
- Упрощенная пагинация для каталогов
- Совместимость с Bootstrap 5
- Адаптивный дизайн с оптимизацией для мобильных устройств
