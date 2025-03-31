# Руководство по разработке

## Настройка локального окружения

### Предварительные требования

1. Docker и Docker Compose
2. Python 3.12
3. Git
4. Редактор кода (рекомендуется VS Code с расширениями для Python)

### Первоначальная настройка

1. Клонирование репозитория:
```bash
git clone <repository-url>
cd ACT-RENTAL
```

2. Настройка окружения:
```bash
# Копируем шаблон окружения
cp .env.example .env

# Настраиваем параметры если нужно
nano .env
```

3. Запуск в режиме разработки:
```bash
docker compose up --watch
```

## Структура проекта

```
cinerental/
├── backend/           # Бэкенд приложение
│   ├── core/         # Ядро приложения
│   ├── models/       # Модели данных
│   ├── repositories/ # Репозитории
│   ├── services/     # Бизнес-логика
│   ├── schemas/      # Pydantic схемы
│   └── web/          # Web handlers
├── frontend/         # Frontend шаблоны
├── docker/          # Docker скрипты
├── docs/           # Документация
└── tests/          # Тесты
```

## Рабочий процесс разработки

### 1. Работа с кодом

- Код автоматически перезагружается при изменениях
- Используйте типизацию Python
- Следуйте PEP 8
- Документируйте код с помощью docstrings

### 2. Тестирование

```bash
# Запуск всех тестов
docker compose run --rm test

# Запуск конкретного теста
docker compose run --rm test ./docker/run-tests.sh tests/unit/test_equipment_service.py

# Запуск с покрытием
docker compose run --rm test ./docker/run-tests.sh --cov
```

### 3. Работа с базой данных

```bash
# Создание новой миграции
docker compose exec web alembic revision -m "description"

# Применение миграций
docker compose exec web alembic upgrade head

# Откат миграции
docker compose exec web alembic downgrade -1
```

### 4. Тестовые данные

```bash
# Загрузка тестовых данных
docker compose exec web python -m backend.scripts.seed_data
```

## Отладка

### Логирование

- Уровни логирования настраиваются в `.env`
- Логи доступны через `docker compose logs`
- В режиме разработки логи более подробные

### Отладка в IDE

1. VS Code:
   - Используйте launch.json для настройки отладчика
   - Подключитесь к работающему контейнеру

2. PyCharm:
   - Настройте Python interpreter из Docker
   - Используйте Remote Debug

## Рекомендации

1. **Код**:
   - Используйте типизацию
   - Пишите тесты
   - Следуйте принципам SOLID
   - Документируйте код

2. **Git**:
   - Используйте feature branches
   - Пишите понятные commit messages
   - Делайте регулярные коммиты

3. **Безопасность**:
   - Не коммитьте секреты
   - Используйте .env для конфигурации
   - Следите за зависимостями

4. **Производительность**:
   - Профилируйте код
   - Оптимизируйте запросы к БД
   - Используйте кэширование

## Решение проблем

### Частые проблемы

1. **Проблемы с Docker**:
```bash
# Пересборка образов
docker compose build --no-cache

# Очистка неиспользуемых ресурсов
docker system prune
```

2. **Проблемы с базой данных**:
```bash
# Сброс базы
docker compose down -v
docker compose up -d db
docker compose exec web alembic upgrade head
```

3. **Проблемы с зависимостями**:
```bash
# Обновление зависимостей
docker compose build --no-cache web
```

### Отладка

1. **Просмотр логов**:
```bash
# Все логи
docker compose logs -f

# Логи конкретного сервиса
docker compose logs -f web
```

2. **Проверка статуса**:
```bash
# Статус контейнеров
docker compose ps

# Использование ресурсов
docker stats
```

3. **Доступ к контейнеру**:
```bash
# Запуск shell в контейнере
docker compose exec web bash
```
