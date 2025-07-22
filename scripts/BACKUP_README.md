# ACT-Rental Система Резервного Копирования

## Обзор

Автоматизированная система создания полных бэкапов ACT-Rental включающая:
- Полный дамп базы данных PostgreSQL
- Резервные копии всех Docker volumes
- Автоматическое определение версий сервисов
- Детальную документацию и скрипты восстановления

## Быстрый старт

### Создание бэкапа
```bash
# Способ 1: Через Makefile (рекомендуется)
make backup

# Способ 2: Напрямую
./scripts/create_backup.sh
```

### Просмотр существующих бэкапов
```bash
make backup-info
```

### Место хранения
Все бэкапы сохраняются в: `~/Documents/ACT-Rental-Backups/`

## Структура бэкапа

Каждый бэкап создаётся в отдельной папке с временной меткой:
```
~/Documents/ACT-Rental-Backups/
└── 20250722_151644/
    ├── act-rental_pg14.18_full_backup_20250722_151644.sql
    ├── postgres_volume_pg14.18_backup_20250722_151644.tar.gz
    ├── redis_volume_redis6.2.19_backup_20250722_151644.tar.gz
    ├── media_volume_backup_20250722_151644.tar.gz
    ├── backup_info.txt
    └── restore_backup.sh
```

## Файлы в бэкапе

### 1. SQL Дамп (рекомендуется для восстановления)
- **Файл**: `act-rental_pg{VERSION}_full_backup_{TIMESTAMP}.sql`
- **Содержит**: Полный дамп базы данных включая структуру, данные, индексы
- **Преимущества**: Независим от версии PostgreSQL, легко читается

### 2. Volume бэкапы
- **PostgreSQL**: `postgres_volume_pg{VERSION}_backup_{TIMESTAMP}.tar.gz`
- **Redis**: `redis_volume_redis{VERSION}_backup_{TIMESTAMP}.tar.gz`  
- **Media**: `media_volume_backup_{TIMESTAMP}.tar.gz`
- **Преимущества**: Точная побайтовая копия, включает системные файлы

### 3. Документация
- **backup_info.txt**: Детальная информация о бэкапе
- **restore_backup.sh**: Автоматический скрипт восстановления

## Восстановление данных

### Автоматическое восстановление (простое)
```bash
cd ~/Documents/ACT-Rental-Backups/20250722_151644
./restore_backup.sh
```

### Ручное восстановление из SQL дампа
```bash
# 1. Остановить приложение
docker compose down

# 2. Очистить базу данных
docker volume rm act-rental_postgres_data

# 3. Создать новый volume
docker volume create act-rental_postgres_data

# 4. Запустить только БД
docker compose up -d db

# 5. Дождаться готовности БД (10-15 секунд)
sleep 15

# 6. Восстановить данные
docker exec -i act-rental-db-1 psql -U postgres < act-rental_pg14.18_full_backup_20250722_151644.sql

# 7. Запустить приложение
docker compose up -d
```

### Восстановление из volume архивов
```bash
# 1. Остановить приложение
docker compose down

# 2. Удалить старые volumes
docker volume rm act-rental_postgres_data act-rental_redis_data act-rental_media

# 3. Создать новые volumes
docker volume create act-rental_postgres_data
docker volume create act-rental_redis_data
docker volume create act-rental_media

# 4. Восстановить PostgreSQL
docker run --rm \
  -v act-rental_postgres_data:/target \
  -v ~/Documents/ACT-Rental-Backups/20250722_151644:/backup \
  postgres:14-alpine \
  tar xzf /backup/postgres_volume_pg14.18_backup_20250722_151644.tar.gz -C /target

# 5. Восстановить Redis
docker run --rm \
  -v act-rental_redis_data:/target \
  -v ~/Documents/ACT-Rental-Backups/20250722_151644:/backup \
  redis:6-alpine \
  tar xzf /backup/redis_volume_redis6.2.19_backup_20250722_151644.tar.gz -C /target

# 6. Восстановить Media
docker run --rm \
  -v act-rental_media:/target \
  -v ~/Documents/ACT-Rental-Backups/20250722_151644:/backup \
  alpine:latest \
  tar xzf /backup/media_volume_backup_20250722_151644.tar.gz -C /target

# 7. Запустить приложение
docker compose up -d
```

## Проверка после восстановления

```bash
# Проверить работу API
curl http://localhost:8000/api/v1/health

# Проверить количество записей
docker exec act-rental-db-1 psql -U postgres -d act-rental -c "
  SELECT 
    'Equipment' as table_name, count(*) as records FROM equipment
  UNION ALL
  SELECT 'Bookings', count(*) FROM bookings  
  UNION ALL
  SELECT 'Clients', count(*) FROM clients
  UNION ALL
  SELECT 'Projects', count(*) FROM projects;
"
```

## Версии сервисов

Система автоматически определяет версии:
- **PostgreSQL**: Извлекается из `SELECT version()`
- **Redis**: Извлекается из `INFO server`
- **Приложение**: Извлекается из `pyproject.toml`

Версии включаются в имена файлов для обеспечения совместимости.

## Рекомендации

### Регулярность бэкапов
- **Продакшен**: Ежедневно в нерабочее время
- **Разработка**: Перед критическими изменениями
- **Перед обновлениями**: Всегда создавайте бэкап

### Безопасность
- Бэкапы содержат чувствительные данные
- Храните в безопасном месте  
- Регулярно проверяйте возможность восстановления

### Место хранения
- Локальные бэкапы: `~/Documents/ACT-Rental-Backups/`
- Для продакшена: рассмотрите внешние хранилища
- Автоматическая очистка старых бэкапов (>30 дней)

## Устранение проблем

### "Container not running"
```bash
# Убедитесь что ACT-Rental запущен
docker compose up -d
```

### "Permission denied"
```bash
# Сделайте скрипт исполняемым
chmod +x docker/create_backup.sh
```

### "No space left on device"
```bash
# Очистите старые бэкапы
find ~/Documents/ACT-Rental-Backups/ -type d -mtime +30 -exec rm -rf {} \;
```

### "Database connection refused"
```bash
# Дождитесь готовности PostgreSQL
docker compose up -d db
sleep 15
```

## Автоматизация

### Добавление в cron (для продакшена)
```bash
# Редактировать crontab
crontab -e

# Добавить строку для ежедневного бэкапа в 2:00
0 2 * * * cd /path/to/act-rental && ./scripts/create_backup.sh
```

### Интеграция с CI/CD
Скрипт можно использовать в pipeline для создания бэкапов перед деплоем:
```yaml
- name: Create backup before deploy
  run: ./scripts/create_backup.sh
```

## Контакты

При проблемах с системой бэкапов обращайтесь к команде разработки или создавайте Issue в репозитории проекта.
