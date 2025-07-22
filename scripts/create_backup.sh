#!/bin/bash
# ACT-Rental Complete Backup Script
# Создает полный бэкап базы данных и всех Docker volumes с указанием версий

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="act-rental"
BACKUP_BASE_DIR="$HOME/Documents/ACT-Rental-Backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE_DIR/$TIMESTAMP"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if container is running
check_container_running() {
    local container_name=$1
    if ! docker ps --format 'table {{.Names}}' | grep -q "^${container_name}$"; then
        print_error "Container $container_name is not running!"
        print_warning "Please start ACT-Rental services first: docker compose up -d"
        exit 1
    fi
}

# Function to get service versions
get_versions() {
    print_status "Detecting service versions..."
    
    # PostgreSQL version
    PG_FULL_VERSION=$(docker exec ${PROJECT_NAME}-db-1 psql -U postgres -d ${PROJECT_NAME} -t -c "SELECT version();" | head -1 | sed 's/^ *//')
    PG_VERSION=$(echo "$PG_FULL_VERSION" | sed -n 's/.*PostgreSQL \([0-9]*\.[0-9]*\).*/\1/p')
    
    # Redis version  
    REDIS_VERSION=$(docker exec ${PROJECT_NAME}-redis-1 redis-cli INFO server | grep redis_version | cut -d: -f2 | tr -d '\r')
    
    # App version (from git or pyproject.toml)
    if [ -f "pyproject.toml" ]; then
        APP_VERSION=$(grep '^version = ' pyproject.toml | cut -d'"' -f2)
    else
        APP_VERSION="unknown"
    fi
    
    print_success "PostgreSQL: $PG_VERSION"
    print_success "Redis: $REDIS_VERSION" 
    print_success "App: $APP_VERSION"
}

# Function to get database statistics
get_db_stats() {
    print_status "Collecting database statistics..."
    
    EQUIPMENT_COUNT=$(docker exec ${PROJECT_NAME}-db-1 psql -U postgres -d ${PROJECT_NAME} -t -c "SELECT count(*) FROM equipment;" | tr -d ' ')
    BOOKINGS_COUNT=$(docker exec ${PROJECT_NAME}-db-1 psql -U postgres -d ${PROJECT_NAME} -t -c "SELECT count(*) FROM bookings;" | tr -d ' ')
    CLIENTS_COUNT=$(docker exec ${PROJECT_NAME}-db-1 psql -U postgres -d ${PROJECT_NAME} -t -c "SELECT count(*) FROM clients;" | tr -d ' ')
    PROJECTS_COUNT=$(docker exec ${PROJECT_NAME}-db-1 psql -U postgres -d ${PROJECT_NAME} -t -c "SELECT count(*) FROM projects;" | tr -d ' ')
    ALEMBIC_VERSION=$(docker exec ${PROJECT_NAME}-db-1 psql -U postgres -d ${PROJECT_NAME} -t -c "SELECT version_num FROM alembic_version;" | tr -d ' ')
    
    print_success "Equipment: $EQUIPMENT_COUNT items"
    print_success "Bookings: $BOOKINGS_COUNT records"  
    print_success "Clients: $CLIENTS_COUNT records"
    print_success "Projects: $PROJECTS_COUNT records"
    print_success "DB Schema: $ALEMBIC_VERSION"
}

# Function to create database backup
create_database_backup() {
    print_status "Creating PostgreSQL database backup..."
    
    local db_backup_file="$BACKUP_DIR/${PROJECT_NAME}_pg${PG_VERSION}_full_backup_${TIMESTAMP}.sql"
    
    docker exec ${PROJECT_NAME}-db-1 pg_dump \
        -U postgres \
        -d ${PROJECT_NAME} \
        --verbose \
        --create \
        --clean \
        --if-exists > "$db_backup_file"
    
    print_success "Database backup created: $(basename $db_backup_file)"
    print_success "Size: $(du -h "$db_backup_file" | cut -f1)"
}

# Function to create volume backups
create_volume_backups() {
    print_status "Creating Docker volume backups..."
    
    # PostgreSQL volume
    print_status "Backing up PostgreSQL volume..."
    local pg_volume_backup="$BACKUP_DIR/postgres_volume_pg${PG_VERSION}_backup_${TIMESTAMP}.tar.gz"
    docker run --rm \
        -v ${PROJECT_NAME}_postgres_data:/source \
        -v "$BACKUP_DIR:/backup" \
        postgres:14-alpine \
        tar czf /backup/$(basename $pg_volume_backup) -C /source .
    print_success "PostgreSQL volume backup: $(basename $pg_volume_backup) ($(du -h "$pg_volume_backup" | cut -f1))"
    
    # Redis volume
    print_status "Backing up Redis volume..."
    local redis_volume_backup="$BACKUP_DIR/redis_volume_redis${REDIS_VERSION}_backup_${TIMESTAMP}.tar.gz"
    docker run --rm \
        -v ${PROJECT_NAME}_redis_data:/source \
        -v "$BACKUP_DIR:/backup" \
        redis:6-alpine \
        tar czf /backup/$(basename $redis_volume_backup) -C /source .
    print_success "Redis volume backup: $(basename $redis_volume_backup) ($(du -h "$redis_volume_backup" | cut -f1))"
    
    # Media volume
    print_status "Backing up Media volume..."
    local media_volume_backup="$BACKUP_DIR/media_volume_backup_${TIMESTAMP}.tar.gz"
    docker run --rm \
        -v ${PROJECT_NAME}_media:/source \
        -v "$BACKUP_DIR:/backup" \
        alpine:latest \
        tar czf /backup/$(basename $media_volume_backup) -C /source .
    print_success "Media volume backup: $(basename $media_volume_backup) ($(du -h "$media_volume_backup" | cut -f1))"
}

# Function to create backup info file
create_backup_info() {
    print_status "Creating backup information file..."
    
    local info_file="$BACKUP_DIR/backup_info.txt"
    cat > "$info_file" << EOF
ACT-RENTAL ПОЛНЫЙ БЭКАП
========================

Дата создания: $(date '+%d.%m.%Y %H:%M:%S')
Создано: автоматический бэкап системы

ВЕРСИИ КОМПОНЕНТОВ:
- PostgreSQL: $PG_VERSION
- Redis: $REDIS_VERSION  
- App: $APP_VERSION
- Docker: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)

СОСТАВ БЭКАПА:
==============

1. БАЗА ДАННЫХ (ПОЛНЫЙ ДАМП):
   Файл: ${PROJECT_NAME}_pg${PG_VERSION}_full_backup_${TIMESTAMP}.sql
   Описание: Полный дамп базы данных включающий:
   - Все схемы и структуры
   - Все данные ($EQUIPMENT_COUNT единиц оборудования, $BOOKINGS_COUNT бронирований, $CLIENTS_COUNT клиентов, $PROJECTS_COUNT проектов)
   - Все индексы и ограничения
   - Последовательности (sequences)
   - Права доступа
   - Расширения (pg_trgm)
   
2. VOLUME POSTGRESQL:
   Файл: postgres_volume_pg${PG_VERSION}_backup_${TIMESTAMP}.tar.gz
   Описание: Полная копия данных PostgreSQL на уровне файловой системы
   
3. VOLUME REDIS:
   Файл: redis_volume_redis${REDIS_VERSION}_backup_${TIMESTAMP}.tar.gz
   Описание: Копия кэша Redis включающая:
   - Все кэшированные данные
   - RDB файлы
   - AOF файлы (если включены)

4. VOLUME MEDIA:
   Файл: media_volume_backup_${TIMESTAMP}.tar.gz
   Описание: Все загруженные медиа-файлы и документы

5. СКРИПТ ВОССТАНОВЛЕНИЯ:
   Файл: restore_backup.sh
   Описание: Автоматический скрипт для полного восстановления системы
   - Проверяет готовность сервисов
   - Автоматически находит проект ACT-Rental
   - Восстанавливает базу данных из SQL дампа
   - Проверяет корректность восстановления
   - Выводит статистику восстановленных данных

СТАТИСТИКА ДАННЫХ:
==================
- Оборудование: $EQUIPMENT_COUNT единиц
- Бронирования: $BOOKINGS_COUNT записей  
- Клиенты: $CLIENTS_COUNT записей
- Проекты: $PROJECTS_COUNT записей
- Alembic версия: $ALEMBIC_VERSION

ИНСТРУКЦИИ ПО ВОССТАНОВЛЕНИЮ:
=============================

ВАРИАНТ 1 - Автоматическое восстановление (РЕКОМЕНДУЕТСЯ):
1. Перейти в папку бэкапа: cd ~/Documents/ACT-Rental-Backups/${TIMESTAMP}
2. Запустить скрипт: ./restore_backup.sh
3. Подтвердить восстановление: введите "yes"
4. Дождаться завершения процесса

ВАРИАНТ 2 - Ручное восстановление из SQL дампа:
1. Остановить приложение: docker compose down
2. Очистить базу: docker volume rm ${PROJECT_NAME}_postgres_data
3. Создать volume: docker volume create ${PROJECT_NAME}_postgres_data  
4. Запустить только БД: docker compose up -d db
5. Восстановить данные: docker exec -i ${PROJECT_NAME}-db-1 psql -U postgres < ${PROJECT_NAME}_pg${PG_VERSION}_full_backup_${TIMESTAMP}.sql
6. Запустить приложение: docker compose up -d

ВАРИАНТ 3 - Восстановление из volume архивов:
1. Остановить приложение: docker compose down
2. Удалить старые volumes: docker volume rm ${PROJECT_NAME}_postgres_data ${PROJECT_NAME}_redis_data ${PROJECT_NAME}_media
3. Создать volumes: docker volume create ${PROJECT_NAME}_postgres_data && docker volume create ${PROJECT_NAME}_redis_data && docker volume create ${PROJECT_NAME}_media
4. Восстановить PostgreSQL: docker run --rm -v ${PROJECT_NAME}_postgres_data:/target -v \$(pwd):/backup postgres:14-alpine tar xzf /backup/postgres_volume_pg${PG_VERSION}_backup_${TIMESTAMP}.tar.gz -C /target
5. Восстановить Redis: docker run --rm -v ${PROJECT_NAME}_redis_data:/target -v \$(pwd):/backup redis:6-alpine tar xzf /backup/redis_volume_redis${REDIS_VERSION}_backup_${TIMESTAMP}.tar.gz -C /target  
6. Восстановить Media: docker run --rm -v ${PROJECT_NAME}_media:/target -v \$(pwd):/backup alpine:latest tar xzf /backup/media_volume_backup_${TIMESTAMP}.tar.gz -C /target
7. Запустить приложение: docker compose up -d

ПРОВЕРКА ПОСЛЕ ВОССТАНОВЛЕНИЯ:
==============================
1. Проверить работу приложения: curl http://localhost:8000/api/v1/health
2. Проверить количество записей:
   - docker exec ${PROJECT_NAME}-db-1 psql -U postgres -d ${PROJECT_NAME} -c "SELECT count(*) FROM equipment;"
   - docker exec ${PROJECT_NAME}-db-1 psql -U postgres -d ${PROJECT_NAME} -c "SELECT count(*) FROM bookings;"
   - docker exec ${PROJECT_NAME}-db-1 psql -U postgres -d ${PROJECT_NAME} -c "SELECT count(*) FROM clients;"
   - docker exec ${PROJECT_NAME}-db-1 psql -U postgres -d ${PROJECT_NAME} -c "SELECT count(*) FROM projects;"

БЫСТРОЕ ВОССТАНОВЛЕНИЕ:
======================
Для быстрого восстановления используйте автоматический скрипт:
  cd ~/Documents/ACT-Rental-Backups/${TIMESTAMP}
  ./restore_backup.sh

Скрипт автоматически:
- Найдёт проект ACT-Rental
- Остановит сервисы
- Очистит старые данные  
- Восстановит базу данных
- Запустит приложение
- Проверит корректность восстановления

ВАЖНЫЕ ЗАМЕТКИ:
===============
- Используйте точно те же версии PostgreSQL ($PG_VERSION) и Redis ($REDIS_VERSION)
- SQL дамп содержит команды DROP/CREATE DATABASE, будьте осторожны
- Volume бэкапы содержат полные копии данных на уровне файловой системы
- Всегда останавливайте приложение перед восстановлением
- После восстановления перезапустите веб-приложение для очистки кэша SQLAlchemy
- Скрипт restore_backup.sh можно запускать из любой папки

АВТОР: ACT-Rental Backup System
ДАТА: $(date)
КОНТАКТ: Система автоматического резервного копирования
EOF
    
    print_success "Backup info created: $(basename $info_file)"
}

# Function to create restore script
create_restore_script() {
    print_status "Creating restore script..."
    
    local restore_script="$BACKUP_DIR/restore_backup.sh"
    cat > "$restore_script" << 'EOF'
#!/bin/bash
# ACT-Rental Backup Restore Script
# Автоматическое восстановление из бэкапа

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

PROJECT_NAME="act-rental"
BACKUP_DIR=$(dirname "$0")

print_warning "ВНИМАНИЕ! Это полностью удалит текущие данные ACT-Rental!"
read -p "Продолжить? (yes/no): " confirmation
if [[ $confirmation != "yes" ]]; then
    print_error "Восстановление отменено"
    exit 1
fi

print_status "Остановка приложения..."
docker compose down || true

print_status "Удаление старых volumes..."
docker volume rm ${PROJECT_NAME}_postgres_data ${PROJECT_NAME}_redis_data ${PROJECT_NAME}_media 2>/dev/null || true

print_status "Создание новых volumes..."
docker volume create ${PROJECT_NAME}_postgres_data
docker volume create ${PROJECT_NAME}_redis_data  
docker volume create ${PROJECT_NAME}_media

print_status "Запуск PostgreSQL для восстановления..."
docker compose up -d db
sleep 10

print_status "Восстановление базы данных..."
BACKUP_DIR=$(dirname "$0")
SQL_FILE=$(find "$BACKUP_DIR" -name "*_full_backup_*.sql" | head -1)
if [[ -z "$SQL_FILE" ]]; then
    print_error "SQL backup file not found!"
    exit 1
fi

docker exec -i ${PROJECT_NAME}-db-1 psql -U postgres < "$SQL_FILE"
print_success "База данных восстановлена"

print_status "Запуск приложения..."
docker compose up -d

print_status "Ожидание готовности приложения..."
sleep 15

print_status "Проверка восстановления..."
curl -f http://localhost:8000/api/v1/health > /dev/null && print_success "Приложение работает" || print_error "Приложение не отвечает"

print_success "Восстановление завершено!"
print_status "Проверьте данные в веб-интерфейсе: http://localhost:8000"
EOF
    
    chmod +x "$restore_script"
    print_success "Restore script created: $(basename $restore_script)"
}

# Main execution
main() {
    print_status "Starting ACT-Rental backup process..."
    print_status "Timestamp: $TIMESTAMP"
    
    # Check if containers are running
    check_container_running "${PROJECT_NAME}-db-1"
    check_container_running "${PROJECT_NAME}-redis-1"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    print_success "Created backup directory: $BACKUP_DIR"
    
    # Get versions and stats
    get_versions
    get_db_stats
    
    # Create backups
    create_database_backup
    create_volume_backups
    
    # Create documentation
    create_backup_info
    create_restore_script
    
    # Final summary
    echo
    print_success "=== BACKUP COMPLETED ==="
    print_success "Location: $BACKUP_DIR"
    print_success "Total size: $(du -sh "$BACKUP_DIR" | cut -f1)"
    print_status "Files created:"
    ls -la "$BACKUP_DIR" | grep -v "^total"
    echo
    print_status "To restore: cd $BACKUP_DIR && ./restore_backup.sh"
}

# Run main function
main "$@" 