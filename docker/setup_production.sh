#!/bin/bash
# setup_production.sh
set -e

echo "Подготовка и запуск продакшен-окружения ACT-RENTAL"
echo "==================================================="

# Проверка наличия .env.production
if [ ! -f .env.production ]; then
    echo "ОШИБКА: Файл .env.production не найден!"
    echo "Пожалуйста, создайте его на основе .env.example и настройте для продакшена."
    exit 1
fi

# Создание внешних томов (только если они не существуют)
echo "Проверка и создание внешних именованных томов для хранения данных..."
VOLUMES=("act_rental_postgres_data" "act_rental_redis_data" "act_rental_media" "act_rental_devpi_data")

for VOLUME in "${VOLUMES[@]}"; do
    if docker volume inspect "$VOLUME" >/dev/null 2>&1; then
        echo "✓ Том $VOLUME уже существует"
    else
        echo "→ Создание тома $VOLUME"
        docker volume create "$VOLUME"
        echo "✓ Том $VOLUME создан"
    fi
done

# Проверка успешного создания всех томов
echo "Проверка создания всех необходимых томов..."
ALL_VOLUMES_EXIST=true

for VOLUME in "${VOLUMES[@]}"; do
    if ! docker volume inspect "$VOLUME" >/dev/null 2>&1; then
        echo "✗ ОШИБКА: Том $VOLUME не был создан!"
        ALL_VOLUMES_EXIST=false
    fi
done

if [ "$ALL_VOLUMES_EXIST" = true ]; then
    echo ""
    echo "✅ Все внешние тома успешно созданы!"
    echo ""

    # Проверка, запущены ли уже контейнеры
    if docker compose -f docker-compose.prod.yml ps --services --filter "status=running" | grep -q "web"; then
        echo "⚠️ Продакшен-окружение уже запущено!"
        echo ""
        read -p "Хотите перезапустить контейнеры? (y/n): " choice
        if [[ "$choice" =~ ^[Yy]$ ]]; then
            echo "Перезапуск продакшен-окружения..."
            docker compose -f docker-compose.prod.yml --env-file ./.env.production down
            export $(grep -v '^#' .env.production | xargs)
            docker compose -f docker-compose.prod.yml --env-file ./.env.production up -d
            echo "✅ Продакшен-окружение успешно перезапущено!"
        else
            echo "Операция отменена. Контейнеры продолжают работать."
        fi
    else
        echo "🚀 Запуск продакшен-окружения..."
        docker compose -f docker-compose.prod.yml --env-file .env.production up -d
        echo "✅ Продакшен-окружение успешно запущено!"
    fi
else
    echo ""
    echo "❌ Не все тома были успешно созданы. Проверьте ошибки выше."
    exit 1
fi
