# Миграции базы данных

## Общая информация

Для управления миграциями базы данных используется Alembic. Миграции позволяют:
- Отслеживать изменения схемы базы данных
- Применять изменения к базе данных
- Откатывать изменения при необходимости

## Структура

```
migrations/
├── versions/          # Файлы миграций
├── env.py            # Настройки окружения
├── script.py.mako    # Шаблон для генерации миграций
└── alembic.ini       # Основной конфигурационный файл
```

## Конфигурация

### alembic.ini
- Основной конфигурационный файл
- Настройки логирования
- Форматирование файлов миграций
- Хуки для автоматического форматирования кода

### env.py
- Настройки окружения для миграций
- Подключение к базе данных
- Интеграция с настройками приложения
- Загрузка моделей для автогенерации

## Команды

### Создание миграции
```bash
# Автоматическая генерация миграции на основе изменений моделей
docker-compose exec web alembic revision --autogenerate -m "description"

# Создание пустой миграции
docker-compose exec web alembic revision -m "description"
```

### Применение миграций
```bash
# Применить все миграции
docker-compose exec web alembic upgrade head

# Применить определенное количество миграций
docker-compose exec web alembic upgrade +n

# Откатить определенное количество миграций
docker-compose exec web alembic downgrade -n

# Откатить все миграции
docker-compose exec web alembic downgrade base
```

### Просмотр информации
```bash
# Текущая версия базы данных
docker-compose exec web alembic current

# История миграций
docker-compose exec web alembic history

# Список не примененных миграций
docker-compose exec web alembic history --indicate-current
```

## Лучшие практики

1. **Именование миграций**
   - Используйте понятные и описательные имена
   - Следуйте формату: `YYYYMMDD_HHMM_description`
   - Пример: `20250124_2045_create_initial_tables`

2. **Содержимое миграций**
   - Одна миграция = одно логическое изменение
   - Добавляйте комментарии к сложным изменениям
   - Проверяйте миграции на тестовой базе

3. **Безопасность**
   - Всегда проверяйте downgrade
   - Делайте бэкап перед применением
   - Тестируйте на копии данных

4. **Работа в команде**
   - Не изменяйте существующие миграции
   - Создавайте новые миграции для исправлений
   - Синхронизируйте миграции с git

## Текущие миграции

### 20250124_2045_create_initial_tables
- Создание основных таблиц:
  - categories (категории оборудования)
  - equipment (оборудование)
  - clients (клиенты)
  - bookings (бронирования)
  - documents (документы)
- Создание необходимых индексов
- Настройка внешних ключей
- Добавление временных меток

## Решение проблем

### Конфликты миграций
1. Откатите конфликтующие миграции
2. Создайте новую миграцию с нужными изменениями
3. Примените обновленную миграцию

### Ошибки применения
1. Проверьте подключение к базе данных
2. Убедитесь в актуальности моделей
3. Проверьте зависимости миграций
