# Инструкция по переносу базы данных после переименования проекта

## Шаг 1: Создание резервной копии данных (крайне важно!)

```bash
# Сохраняем текущий таймстемп в переменную для консистентности
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Создание директории для бэкапов с текущей датой и временем
mkdir -p ~/prod_backups/$BACKUP_TIMESTAMP

# Создание архивов томов (работает независимо от запущенных контейнеров)
docker run --rm -v cinerental_postgres_data:/source -v ~/prod_backups/$BACKUP_TIMESTAMP:/backup \
  alpine:latest tar czf /backup/cinerental_postgres_data.tar.gz -C /source .
docker run --rm -v cinerental_redis_data:/source -v ~/prod_backups/$BACKUP_TIMESTAMP:/backup \
  alpine:latest tar czf /backup/cinerental_redis_data.tar.gz -C /source .
docker run --rm -v cinerental_media:/source -v ~/prod_backups/$BACKUP_TIMESTAMP:/backup \
  alpine:latest tar czf /backup/cinerental_media.tar.gz -C /source .

# Если контейнеры запущены, можно создать SQL дамп через запущенный контейнер
if [ $(docker ps -q -f name=cinerental_db | wc -l) -gt 0 ]; then
  docker exec -t $(docker ps -q -f name=cinerental_db) pg_dumpall -c -U postgres > ~/prod_backups/$BACKUP_TIMESTAMP/full_database_backup.sql
  echo "SQL дамп создан через работающий контейнер"
else
  # Если контейнеры не запущены, создаем SQL дамп через временный контейнер
  docker run --rm -v cinerental_postgres_data:/var/lib/postgresql/data \
    -v ~/prod_backups/$BACKUP_TIMESTAMP:/backup \
    -e PGDATA=/var/lib/postgresql/data/pgdata \
    -e POSTGRES_PASSWORD=postgres \
    postgres:13 \
    bash -c "pg_dumpall -U postgres > /backup/full_database_backup.sql"
  echo "SQL дамп создан через временный контейнер"
fi

# Проверка созданных бэкапов
ls -lh ~/prod_backups/$BACKUP_TIMESTAMP/
```

> **Примечание**: Обратите внимание, что для создания SQL дампа нам не нужен запущенный контейнер с базой данных. Мы можем использовать временный контейнер, который подключается напрямую к тому.

## Шаг 2: Скачивание обновленного кода из репозитория

```bash
# Перейдите в директорию проекта
cd /путь/к/вашему/проекту

# Сохраните текущую ветку на случай необходимости отката
git branch backup-$(date +%Y%m%d)

# Получите последние изменения из репозитория
git fetch origin

# Проверьте, на какой ветке находится новая версия (например, main или develop)
git checkout main  # или develop, в зависимости от того, где находится новая версия

# Обновите локальный код
git pull origin main  # или develop
```

## Шаг 3: Остановка текущих контейнеров

```bash
# Остановите все контейнеры
docker compose -f docker-compose.prod.yml down
```

## Шаг 4: Проверка и подготовка к миграции данных

```bash
# Проверка существующих томов
docker volume ls | grep -E 'cinerental_|act-rental_'

# Создание новых томов для ACT-Rental (если их еще нет)
if [[ ! $(docker volume ls --format "{{.Name}}" | grep act-rental_postgres_data) ]]; then
  echo "Создание тома act-rental_postgres_data..."
  docker volume create act-rental_postgres_data
fi

if [[ ! $(docker volume ls --format "{{.Name}}" | grep act-rental_redis_data) ]]; then
  echo "Создание тома act-rental_redis_data..."
  docker volume create act-rental_redis_data
fi

if [[ ! $(docker volume ls --format "{{.Name}}" | grep act-rental_media) ]]; then
  echo "Создание тома act-rental_media..."
  docker volume create act-rental_media
fi
```

## Шаг 5: Копирование данных из старых томов в новые

```bash
# Копирование данных PostgreSQL
docker run --rm -v cinerental_postgres_data:/from -v act-rental_postgres_data:/to alpine sh -c "cp -av /from/. /to/"

# Копирование данных Redis
docker run --rm -v cinerental_redis_data:/from -v act-rental_redis_data:/to alpine sh -c "cp -av /from/. /to/"

# Копирование медиа-файлов
docker run --rm -v cinerental_media:/from -v act-rental_media:/to alpine sh -c "cp -av /from/. /to/"
```

## Шаг 6: Обновление файла .env (если требуется)

```bash
# Проверьте, существует ли файл .env.example в новой версии
if [ -f .env.example ]; then
  # Сравните его с вашим текущим .env
  echo "Сравнение .env с .env.example:"
  diff .env .env.example

  # Создайте резервную копию текущего .env
  cp .env .env.backup

  echo "Проверьте различия и обновите .env при необходимости"
fi
```

## Шаг 7: Запуск новой версии приложения

```bash
# Сборка и запуск контейнеров новой версии
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Проверка, что все контейнеры запустились
docker compose -f docker-compose.prod.yml ps
```

## Шаг 8: Проверка работоспособности приложения

```bash
# Проверка доступности веб-интерфейса
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000

# Проверка логов на наличие ошибок
docker compose -f docker-compose.prod.yml logs
```

## Шаг 9: Тестирование функциональности

Войдите в систему и убедитесь, что:
- Все данные доступны
- Вы можете создавать и редактировать записи
- Все основные функции работают корректно

## Шаг 10: Удаление устаревших томов (после успешной миграции)

**Внимание: Выполняйте этот шаг только после полной проверки работоспособности новой версии!**

```bash
# Подтверждение удаления (введите "yes" для продолжения)
read -p "Вы уверены, что хотите удалить старые тома? Это необратимое действие (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
  docker volume rm cinerental_postgres_data
  docker volume rm cinerental_redis_data
  docker volume rm cinerental_media
  echo "Старые тома удалены."
else
  echo "Отмена удаления. Старые тома сохранены."
fi
```

## Дополнительные примечания:

1. **Проблемы с правами доступа**: В некоторых случаях могут возникнуть проблемы с правами доступа при копировании данных. Если приложение не запускается или не может получить доступ к базе данных после копирования, попробуйте изменить владельца данных:

   ```bash
   docker run --rm -v act-rental_postgres_data:/data alpine sh -c "chown -R 999:999 /data"
   ```

2. **Восстановление из резервной копии**: Если что-то пошло не так, вы можете восстановить данные из резервной копии:

   ```bash
   # Укажите фактический таймстемп вашего бэкапа
   BACKUP_TIMESTAMP=YYYYMMDD_HHMMSS

   # Восстановление из архива тома
   docker run --rm -v act-rental_postgres_data:/data -v ~/prod_backups/$BACKUP_TIMESTAMP:/backup \
     alpine sh -c "rm -rf /data/* && tar xzf /backup/cinerental_postgres_data.tar.gz -C /data"

   # Или восстановление из SQL дампа
   docker run --rm -i \
     -v ~/prod_backups/$BACKUP_TIMESTAMP:/backup \
     -v act-rental_postgres_data:/var/lib/postgresql/data \
     -e POSTGRES_PASSWORD=postgres \
     postgres:13 bash -c "mkdir -p /var/lib/postgresql/data/pgdata && \
                         psql -U postgres -d postgres -f /backup/full_database_backup.sql"
   ```

3. **Проверка миграций базы данных**: Если в новой версии есть изменения схемы базы данных, убедитесь, что миграции применяются автоматически при запуске или выполните их вручную:
   ```bash
   docker compose -f docker-compose.prod.yml exec web alembic upgrade head
   ```

4. **Подготовка плана отката**: На случай серьезных проблем имейте готовый план отката:
   ```bash
   # Для восстановления старой версии:
   git checkout backup-$(date +%Y%m%d)
   docker compose -f docker-compose.prod.yml down
   docker volume rm act-rental_postgres_data act-rental_redis_data act-rental_media
   docker compose -f docker-compose.prod.yml up -d
   ```

5. **Мониторинг после обновления**: В течение нескольких дней после обновления внимательно следите за логами и производительностью системы:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f
   ```

6. **Проверка размера томов**: Чтобы убедиться, что данные были успешно скопированы, сравните размеры старых и новых томов:
   ```bash
   docker system df -v | grep -E 'cinerental_|act-rental_'
   ```

7. **Документирование изменений**: Запишите все изменения и проблемы, возникшие в процессе обновления, для будущих обновлений.
