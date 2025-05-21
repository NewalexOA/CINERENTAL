#!/bin/bash
set -e

DEVPI_HOST="devpi"
DEVPI_PORT="3141"
DEVPI_URL="http://${DEVPI_HOST}:${DEVPI_PORT}"

echo "Initializing DevPi cache..."
echo "DevPi URL: ${DEVPI_URL}"

# Ждем, пока devpi станет доступен
MAX_RETRIES=30
RETRY_INTERVAL=2
COUNT=0

echo "Waiting for DevPi server..."

# Проверяем доступность через сеть Docker
until curl -s "${DEVPI_URL}" > /dev/null || [ $COUNT -eq $MAX_RETRIES ]; do
    echo "Retry $COUNT/$MAX_RETRIES: DevPi is not available yet, retrying in $RETRY_INTERVAL seconds..."
    sleep $RETRY_INTERVAL
    COUNT=$((COUNT+1))
done

if [ $COUNT -eq $MAX_RETRIES ]; then
    echo "DevPi server did not become available after $MAX_RETRIES retries. Exiting."
    exit 1
fi

echo "DevPi server is up!"

# Устанавливаем devpi-client если не установлен
if ! command -v devpi &> /dev/null; then
    echo "Installing devpi-client..."
    pip install devpi-client
fi

# Создаем кеш
echo "Configuring DevPi..."
devpi use "${DEVPI_URL}"
devpi login root --password=""

# Проверяем, существует ли индекс pypi, если нет - создаем
if ! devpi index -l | grep -q "root/pypi"; then
    echo "Creating PyPI mirror index..."
    devpi index -c pypi type=mirror mirror_url=https://pypi.org/simple/
else
    echo "PyPI mirror index already exists"
fi

# Предзагрузка пакетов из requirements.txt
if [ -f "requirements.txt" ]; then
    echo "Preloading packages from requirements.txt..."

    # Создаем временную директорию для скачивания пакетов
    TEMP_DIR=$(mktemp -d)

    # Читаем requirements.txt и скачиваем пакеты
    while read package; do
        if [[ ! $package =~ ^# && ! -z $package ]]; then
            echo "Downloading $package..."
            pip download -d $TEMP_DIR $package
        fi
    done < requirements.txt

    # Загружаем пакеты в devpi
    echo "Uploading packages to DevPi..."
    devpi upload --from-dir $TEMP_DIR

    # Очищаем временную директорию
    rm -rf $TEMP_DIR
fi

echo "DevPi cache initialization completed successfully!"
