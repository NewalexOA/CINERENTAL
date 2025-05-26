# Инструкция по переносу базы данных после обновления проекта

## Важные предварительные замечания

- **Цель**: Обновить проект с ACT-RENTAL на ACT-Rental с сохранением всех данных
- **Основная задача**: Переименование базы данных с `cinerental` на `act-rental`
- **Обязательное условие**: Создание резервных копий перед началом работы

## Шаг 1: Подтверждение версии PostgreSQL

```bash
echo "Проверка версии PostgreSQL:"
docker run --rm -it \
  -v cinerental_postgres_data:/var/lib/postgresql/data \
  --user root \
  --entrypoint bash \
  postgres:14-alpine \
  -c "cat /var/lib/postgresql/data/pgdata/PG_VERSION 2>/dev/null || echo 'Файл PG_VERSION не найден'"

echo -e "\nПроверка образа PostgreSQL в docker-compose:"
grep -A 3 "db:" docker-compose.prod.yml
```

Результат должен быть `14`. Если версия другая, используйте соответствующий образ PostgreSQL во всех командах.

## Шаг 2: Создание резервных копий (обязательно!)

Сначала создаем уникальную метку времени для бэкапов:

```bash
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo $BACKUP_TIMESTAMP > ~/backup_timestamp.txt
mkdir -p ~/act_rental_backups/$BACKUP_TIMESTAMP
```

Затем создаем архивы Docker томов:

```bash
docker run --rm -v cinerental_postgres_data:/source -v ~/act_rental_backups/$BACKUP_TIMESTAMP:/backup \
  alpine:latest tar czf /backup/cinerental_postgres_data.tar.gz -C /source .
```

```bash
docker run --rm -v cinerental_redis_data:/source -v ~/act_rental_backups/$BACKUP_TIMESTAMP:/backup \
  alpine:latest tar czf /backup/cinerental_redis_data.tar.gz -C /source .
```

```bash
docker run --rm -v cinerental_media:/source -v ~/act_rental_backups/$BACKUP_TIMESTAMP:/backup \
  alpine:latest tar czf /backup/cinerental_media.tar.gz -C /source .
```

Создаем SQL дамп базы данных и ролей:

```bash
docker run --rm -it \
  -v cinerental_postgres_data:/var/lib/postgresql/data \
  -v ~/act_rental_backups/$BACKUP_TIMESTAMP:/backup \
  --user root \
  postgres:14-alpine \
  bash -c "chown -R postgres:postgres /var/lib/postgresql/data && \
           su postgres -c 'pg_ctl -D /var/lib/postgresql/data/pgdata start' && \
           until su postgres -c 'pg_isready' 2>/dev/null; do sleep 1; done && \
           echo 'Создание дампа базы данных...' && \
           su postgres -c 'pg_dump -U postgres -d cinerental > /backup/database_dump.sql' && \
           echo 'Создание дампа ролей пользователей...' && \
           su postgres -c 'pg_dumpall --roles-only > /backup/roles.sql' && \
           su postgres -c 'pg_ctl -D /var/lib/postgresql/data/pgdata stop -m fast'"
```

Проверяем созданные бэкапы:

```bash
ls -lh ~/act_rental_backups/$BACKUP_TIMESTAMP/
```

## Шаг 3: Остановка текущего приложения

```bash
docker compose -f docker-compose.prod.yml down
```

## Шаг 4: Скачивание нового кода

```bash
cd /путь/к/вашему/проекту
```

Создаем резервную копию текущей ветки:

```bash
git branch backup-$(date +%Y%m%d)
```

Получаем последние изменения:

```bash
git fetch origin
git checkout main
git pull origin main
```

Примечание: вместо `main` можно использовать другую ветку с новой версией кода.

## Шаг 5: Создание новых Docker томов

Создаем тома для ACT-Rental:

```bash
docker volume create act-rental_postgres_data
docker volume create act-rental_redis_data
docker volume create act-rental_media
```

## Шаг 6: Копирование данных Redis и медиа-файлов

Копируем Redis данные:

```bash
docker run --rm -v cinerental_redis_data:/from -v act-rental_redis_data:/to alpine sh -c "cp -av /from/. /to/"
```

Копируем медиа-файлы:

```bash
docker run --rm -v cinerental_media:/from -v act-rental_media:/to alpine sh -c "cp -av /from/. /to/"
```

## Шаг 7: Инициализация и миграция PostgreSQL

Инициализация тома PostgreSQL:

```bash
docker run --rm -it \
  -v act-rental_postgres_data:/var/lib/postgresql/data \
  --env POSTGRES_DB=act-rental \
  --env POSTGRES_USER=postgres \
  --env POSTGRES_PASSWORD=postgres \
  --env PGDATA=/var/lib/postgresql/data/pgdata \
  postgres:14-alpine \
  bash -c "docker-entrypoint.sh postgres & \
           until pg_isready -U postgres 2>/dev/null; do sleep 1; done && \
           sleep 5 && \
           echo 'База данных инициализирована'"
```

Останавливаем временный контейнер:

```bash
docker stop $(docker ps -q --filter ancestor=postgres:14-alpine) || true
```

Восстанавливаем значение BACKUP_TIMESTAMP, если оно утеряно:

```bash
if [ -z "$BACKUP_TIMESTAMP" ] && [ -f ~/backup_timestamp.txt ]; then
  BACKUP_TIMESTAMP=$(cat ~/backup_timestamp.txt)
  echo "Восстановлено значение BACKUP_TIMESTAMP: $BACKUP_TIMESTAMP"
fi
```

Восстанавливаем данные из бэкапа:

```bash
docker run --rm -it \
  -v act-rental_postgres_data:/var/lib/postgresql/data \
  -v ~/act_rental_backups/$BACKUP_TIMESTAMP:/backup \
  --user root \
  postgres:14-alpine \
  bash -c "su postgres -c 'pg_ctl -D /var/lib/postgresql/data/pgdata start' && \
           until su postgres -c 'pg_isready' 2>/dev/null; do sleep 1; done && \
           echo 'Восстановление ролей пользователей...' && \
           su postgres -c 'psql -f /backup/roles.sql' && \
           echo 'Восстановление данных в act-rental...' && \
           su postgres -c 'psql -d act-rental -f /backup/database_dump.sql' && \
           echo 'Данные успешно восстановлены!' && \
           su postgres -c 'pg_ctl -D /var/lib/postgresql/data/pgdata stop -m fast'"
```

## Шаг 8: Проверка и обновление .env файла

Создаем резервную копию:

```bash
cp .env.production .env.production.backup
```

Обновляем POSTGRES_DB в .env.production:

```bash
sed -i '' 's/POSTGRES_DB=cinerental/POSTGRES_DB=act-rental/g' .env.production
```

Проверяем изменения:

```bash
grep POSTGRES_DB .env.production
```

## Шаг 9: Запуск нового приложения

Запускаем с новой конфигурацией:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Проверяем статус:

```bash
docker compose -f docker-compose.prod.yml ps
```

## Шаг 10: Проверка работоспособности

Проверяем доступность веб-интерфейса:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000
```

Проверяем логи:

```bash
docker compose -f docker-compose.prod.yml logs
```

## Шаг 11: Проверка данных в базе

Чтобы убедиться, что данные корректно мигрированы, выполните:

```bash
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d act-rental -c "SELECT COUNT(*) FROM users;"
```

```bash
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d act-rental -c "SELECT COUNT(*) FROM equipment;"
```

```bash
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d act-rental -c "SELECT COUNT(*) FROM clients;"
```

## Действия в случае проблем

Если возникли проблемы, вы можете восстановить предыдущую версию:

1. Остановите контейнеры: `docker compose -f docker-compose.prod.yml down`
2. Восстановите код из резервной ветки: `git checkout backup-YYYYMMDD`
3. Восстановите .env: `cp .env.production.backup .env.production`
4. Переименуйте тома или восстановите из резервных копий
5. Запустите старую версию: `docker compose -f docker-compose.prod.yml up -d`

## Очистка после успешной миграции

После подтверждения, что новая версия работает корректно (рекомендуется подождать несколько дней), можно удалить старые тома:

```bash
docker volume rm cinerental_postgres_data
```

```bash
docker volume rm cinerental_redis_data
```

```bash
docker volume rm cinerental_media
```
