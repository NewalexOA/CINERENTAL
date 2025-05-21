#!/bin/bash
set -e

# Параметры
DEVPI_HOST=${1:-"devpi"}
DEVPI_PORT=${2:-"3141"}
TIMEOUT=${3:-10}

# Пути
PIP_CONF="/etc/pip/pip.conf"
PIP_CONF_DIR="/etc/pip"

echo "Checking if DevPi server is available at ${DEVPI_HOST}:${DEVPI_PORT}..."

# Проверка доступности devpi сервера
if timeout ${TIMEOUT} bash -c "(echo > /dev/tcp/${DEVPI_HOST}/${DEVPI_PORT}) 2>/dev/null"; then
    echo "DevPi server is available, configuring pip to use it."

    # Убедимся, что директория существует
    mkdir -p "${PIP_CONF_DIR}"

    # Создаем конфигурацию pip для использования devpi
    cat > "${PIP_CONF}" << EOL
[global]
index-url = http://${DEVPI_HOST}:${DEVPI_PORT}/root/pypi/+simple/
trusted-host = ${DEVPI_HOST}
timeout = 60

[search]
index = http://${DEVPI_HOST}:${DEVPI_PORT}/root/pypi/
EOL

    echo "Created ${PIP_CONF}, pip will use local DevPi server."
    # Экспортируем переменные окружения для UV
    export UV_INDEX_URL="http://${DEVPI_HOST}:${DEVPI_PORT}/root/pypi/+simple/"
    echo "UV_INDEX_URL set to ${UV_INDEX_URL}"
else
    echo "DevPi server is not available, using default PyPI."
    # Если devpi недоступен, используем значения по умолчанию
    if [ -f "${PIP_CONF}" ]; then
        rm "${PIP_CONF}"
        echo "Removed existing ${PIP_CONF} to use default PyPI."
    fi
    export UV_INDEX_URL="https://pypi.org/simple/"
    echo "UV_INDEX_URL set to ${UV_INDEX_URL}"
fi
