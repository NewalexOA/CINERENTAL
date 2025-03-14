# Инструкция по переносу базы данных после переименования проекта

## Шаг 1: Проверка существующих томов

```bash
docker volume ls | grep -E 'cinerental_|act-rental_'
```

Убедитесь, что у вас есть старые тома (`cinerental_postgres_data`, `cinerental_redis_data`, `cinerental_media`).

## Шаг 2: Остановите все контейнеры

```bash
cd /путь/к/вашему/проекту
docker compose -f docker-compose.prod.yml down
```

## Шаг 3: Создайте бэкап базы данных (важно!)

Перед любыми операциями с томами создайте полный бэкап базы данных PostgreSQL:

```bash
# Создание директории для бэкапов
mkdir -p ~/db_backups/$(date +%Y%m%d_%H%M%S)

# Создание бэкапа PostgreSQL (дамп данных)
docker run --rm -v cinerental_postgres_data:/var/lib/postgresql/data \
  -v ~/db_backups/$(date +%Y%m%d_%H%M%S):/backups \
  --env PGUSER=postgres \
  --env PGPASSWORD=postgres \
  postgres:13 \
  pg_dumpall -c > ~/db_backups/$(date +%Y%m%d_%H%M%S)/full_db_backup.sql

# Архивируем тома для дополнительной безопасности
docker run --rm -v cinerental_postgres_data:/source -v ~/db_backups/$(date +%Y%m%d_%H%M%S):/backup \
  alpine:latest tar czf /backup/cinerental_postgres_data.tar.gz -C /source .
docker run --rm -v cinerental_redis_data:/source -v ~/db_backups/$(date +%Y%m%d_%H%M%S):/backup \
  alpine:latest tar czf /backup/cinerental_redis_data.tar.gz -C /source .
docker run --rm -v cinerental_media:/source -v ~/db_backups/$(date +%Y%m%d_%H%M%S):/backup \
  alpine:latest tar czf /backup/cinerental_media.tar.gz -C /source .
```

Убедитесь, что бэкапы были успешно созданы, проверив размер и содержимое файлов:

```bash
ls -lh ~/db_backups/$(date +%Y%m%d_%H%M%S)/
```

## Шаг 4: Создайте резервные копии томов (необязательно, но рекомендуется)

```bash
# Создание папки для резервных копий
mkdir -p ~/docker_backups/$(date +%Y%m%d)

# Резервное копирование старых томов
docker run --rm -v cinerental_postgres_data:/data -v ~/docker_backups/$(date +%Y%m%d):/backup alpine tar czf /backup/cinerental_postgres_data.tar.gz /data
docker run --rm -v cinerental_redis_data:/data -v ~/docker_backups/$(date +%Y%m%d):/backup alpine tar czf /backup/cinerental_redis_data.tar.gz /data
docker run --rm -v cinerental_media:/data -v ~/docker_backups/$(date +%Y%m%d):/backup alpine tar czf /backup/cinerental_media.tar.gz /data
```

## Шаг 5: Создание новых томов (если они не существуют)

Проверьте, существуют ли новые тома и создайте их, если они отсутствуют:

### Проверка существования новых томов
```bash
NEW_VOLUMES=$(docker volume ls --format "{{.Name}}" | grep act-rental)
```

### Создание томов, если они отсутствуют
```bash
if [[ ! $NEW_VOLUMES =~ "act-rental_postgres_data" ]]; then
  echo "Создание тома act-rental_postgres_data..."
  docker volume create act-rental_postgres_data
fi

if [[ ! $NEW_VOLUMES =~ "act-rental_redis_data" ]]; then
  echo "Создание тома act-rental_redis_data..."
  docker volume create act-rental_redis_data
fi

if [[ ! $NEW_VOLUMES =~ "act-rental_media" ]]; then
  echo "Создание тома act-rental_media..."
  docker volume create act-rental_media
fi
```

### Проверка, что все тома созданы
```bash
docker volume ls | grep act-rental_
```

Альтернативный способ - использование Docker Compose для создания томов без запуска контейнеров:

### Создание томов через docker-compose
```bash
cd /путь/к/вашему/проекту
docker compose -f docker-compose.prod.yml up --no-start
docker compose -f docker-compose.prod.yml down
```

## Шаг 6: Копирование данных из старых томов в новые

### Копирование данных PostgreSQL
```bash
docker run --rm -v cinerental_postgres_data:/from -v act-rental_postgres_data:/to alpine sh -c "cp -av /from/. /to/"

### Копирование данных Redis
```bash
docker run --rm -v cinerental_redis_data:/from -v act-rental_redis_data:/to alpine sh -c "cp -av /from/. /to/"
```

### Копирование медиа-файлов
```bash
docker run --rm -v cinerental_media:/from -v act-rental_media:/to alpine sh -c "cp -av /from/. /to/"
```

## Шаг 7: Запустите приложение и проверьте данные

### Запустите лаунчер и используйте кнопку "Запустить" в интерфейсе Или запустите контейнеры напрямую:
```bash
cd /путь/к/вашему/проекту
docker compose -f docker-compose.prod.yml up -d
```

Проверьте, что ваши данные доступны в приложении. Войдите в систему с вашими учетными данными и убедитесь, что все данные на месте.

## Шаг 8: (Необязательно) Удаление старых томов после успешной миграции

Если вы убедились, что все данные успешно перенесены и приложение работает нормально, можно удалить старые тома, чтобы освободить место:

```bash
docker volume rm cinerental_postgres_data
docker volume rm cinerental_redis_data
docker volume rm cinerental_media
```

## Дополнительные примечания:

1. **Проблемы с правами доступа**: В некоторых случаях могут возникнуть проблемы с правами доступа при копировании данных. Если приложение не запускается или не может получить доступ к базе данных после копирования, попробуйте изменить владельца данных:

   ```bash
   docker run --rm -v act-rental_postgres_data:/data alpine sh -c "chown -R 999:999 /data"
   ```

2. **Восстановление из резервной копии**: Если что-то пошло не так, вы можете восстановить данные из резервной копии:

   ```bash
   # Восстановление из SQL дампа (предпочтительный метод)
   docker run --rm -i \
     -v ~/db_backups/YYYYMMDD_HHMMSS:/backups \
     --env PGUSER=postgres \
     --env PGPASSWORD=postgres \
     postgres:13 \
     psql -d postgres < /backups/full_db_backup.sql

   # Или восстановление из архива тома (альтернативный метод)
   docker run --rm -v act-rental_postgres_data:/data -v ~/db_backups/YYYYMMDD_HHMMSS:/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/cinerental_postgres_data.tar.gz -C /data"
   ```

3. **Проверка размера томов**: Чтобы убедиться, что данные были успешно скопированы, сравните размеры старых и новых томов:

   ```bash
   docker system df -v | grep -E 'cinerental_|act-rental_'
   ```

# Обновление продакшен-сервера с CINERENTAL до ACT-Rental

Если вам нужно обновить существующий продакшен-сервер с версии CINERENTAL до ACT-Rental, следуйте этой инструкции.

## Шаг 1: Создание резервной копии данных (крайне важно!)

```bash
# Создание директории для бэкапов с текущей датой и временем
mkdir -p ~/prod_backups/$(date +%Y%m%d_%H%M%S)

# Создание полного дампа базы данных
docker exec -t $(docker ps -q -f name=cinerental_db) pg_dumpall -c -U postgres > ~/prod_backups/$(date +%Y%m%d_%H%M%S)/full_database_backup.sql

# Архивирование томов для дополнительной безопасности
docker run --rm -v cinerental_postgres_data:/source -v ~/prod_backups/$(date +%Y%m%d_%H%M%S):/backup \
  alpine:latest tar czf /backup/cinerental_postgres_data.tar.gz -C /source .
docker run --rm -v cinerental_redis_data:/source -v ~/prod_backups/$(date +%Y%m%d_%H%M%S):/backup \
  alpine:latest tar czf /backup/cinerental_redis_data.tar.gz -C /source .
docker run --rm -v cinerental_media:/source -v ~/prod_backups/$(date +%Y%m%d_%H%M%S):/backup \
  alpine:latest tar czf /backup/cinerental_media.tar.gz -C /source .
```

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

## Дополнительные рекомендации для продакшен-сервера:

1. **Проверка миграций базы данных**: Если в новой версии есть изменения схемы базы данных, убедитесь, что миграции применяются автоматически при запуске или выполните их вручную:
   ```bash
   docker compose -f docker-compose.prod.yml exec web alembic upgrade head
   ```

2. **Подготовка плана отката**: На случай серьезных проблем имейте готовый план отката:
   ```bash
   # Для восстановления старой версии:
   git checkout backup-$(date +%Y%m%d)
   docker compose -f docker-compose.prod.yml down
   docker volume rm act-rental_postgres_data act-rental_redis_data act-rental_media
   docker compose -f docker-compose.prod.yml up -d
   ```

3. **Мониторинг после обновления**: В течение нескольких дней после обновления внимательно следите за логами и производительностью системы:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f
   ```

4. **Документирование изменений**: Запишите все изменения и проблемы, возникшие в процессе обновления, для будущих обновлений.
