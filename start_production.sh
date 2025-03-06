#!/bin/bash

# сделайте скрипт исполняемым: chmod +x start_production.sh

# Версия скрипта
SCRIPT_VERSION="1.0.7"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Файл для записи лога
LOGS_DIR="/Users/anaskin/Github/CINERENTAL/logs"
LOG_FILE="$LOGS_DIR/cinerental_startup.log"

# Создаем директорию для логов, если она не существует
if [ ! -d "$LOGS_DIR" ]; then
    mkdir -p "$LOGS_DIR"
fi

# Очищаем лог-файл, если он существует
if [ -f "$LOG_FILE" ]; then
    > "$LOG_FILE"
fi

# Функция завершения текущего скрипта после успешного запуска
terminate_script() {
    # Записываем в лог информацию о попытке завершения
    echo "Завершение скрипта запуска, статус: $1" >> "$LOG_FILE"

    # Создаем временный скрипт для терминации текущего процесса после небольшой задержки
    # Это позволит нам избежать проблемы с незавершенным процессом
    local temp_killer="/tmp/cinerental_terminate_$$.sh"
    echo "#!/bin/bash" > "$temp_killer"
    echo "# Небольшая задержка для завершения текущих операций" >> "$temp_killer"
    echo "sleep 1" >> "$temp_killer"
    echo "# Завершаем процесс скрипта запуска" >> "$temp_killer"
    echo "kill -9 $$ > /dev/null 2>&1" >> "$temp_killer"
    echo "rm -f $temp_killer" >> "$temp_killer"
    chmod +x "$temp_killer"

    # Запускаем скрипт терминации отдельно от текущего процесса
    nohup "$temp_killer" > /dev/null 2>&1 &

    # Выходим из текущего скрипта со статусом, переданным в функцию
    exit $1
}

# Функция для обработки прерывания
cleanup() {
    echo "Получен сигнал прерывания. Останавливаем процесс..." >> "$LOG_FILE"
    terminate_script 130
}

# Устанавливаем обработчик для Ctrl+C и других сигналов
trap cleanup SIGINT SIGTERM

# Определяем, запущен ли скрипт из терминала или Finder
if [ -t 0 ]; then
    # Запущен из терминала
    IS_TERMINAL=true
    # Выводим информацию о версии
    echo -e "${YELLOW}CINERENTAL запуск, версия ${SCRIPT_VERSION}${NC}"
else
    # Запущен из Finder или другого GUI
    IS_TERMINAL=false
fi

# Записываем PID в начало лог-файла и информацию о запуске
echo "CINERENTAL запуск, версия ${SCRIPT_VERSION}" > "$LOG_FILE"
echo "PID: $$" >> "$LOG_FILE"
echo "Запуск $(date)" >> "$LOG_FILE"
echo "Операционная система: $(uname -a)" >> "$LOG_FILE"
echo "-----------------------------------" >> "$LOG_FILE"

# Если запуск из GUI, перенаправляем весь вывод в лог
if [ "$IS_TERMINAL" = false ]; then
    exec >> "$LOG_FILE" 2>&1
fi

# Добавляем стандартные пути для macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Applications/Docker.app/Contents/Resources/bin:$PATH"
    # Для M1/M2 Mac иногда Docker CLI находится в другом месте
    if [ -d "/Applications/Docker.app/Contents/MacOS" ]; then
        export PATH="/Applications/Docker.app/Contents/MacOS:$PATH"
    fi
    # Добавляем путь для Docker, установленного через Homebrew
    if [ -d "/opt/homebrew/bin" ]; then
        export PATH="/opt/homebrew/bin:$PATH"
    fi
fi

# Записываем текущий PATH для отладки
echo "PATH=$PATH" >> "$LOG_FILE"

# Функция для поиска Docker в системе
find_docker() {
    echo "Поиск Docker в системе..." >> "$LOG_FILE"

    # Проверяем стандартные пути
    local docker_paths=(
        "/usr/local/bin/docker"
        "/usr/bin/docker"
        "/opt/homebrew/bin/docker"
        "/Applications/Docker.app/Contents/Resources/bin/docker"
        "/Applications/Docker.app/Contents/MacOS/docker"
    )

    for path in "${docker_paths[@]}"; do
        if [ -x "$path" ]; then
            echo "Docker найден: $path" >> "$LOG_FILE"
            DOCKER_BIN="$path"
            return 0
        fi
    done

    # Если не нашли Docker, пробуем использовать стандартную команду
    if command -v docker &>/dev/null; then
        DOCKER_BIN=$(command -v docker)
        echo "Docker найден через command -v: $DOCKER_BIN" >> "$LOG_FILE"
        return 0
    fi

    echo "Docker не найден в системе" >> "$LOG_FILE"
    return 1
}

# Функция для выполнения команд с таймаутом
run_with_timeout() {
    local cmd="$1"
    local timeout="$2"
    local msg="$3"

    echo "Выполнение команды с таймаутом $timeout сек: $cmd" >> "$LOG_FILE"

    # Запускаем команду в фоне
    eval "$cmd" &
    local cmd_pid=$!

    # Ожидаем завершения команды или таймаута
    local count=0
    while kill -0 $cmd_pid 2>/dev/null; do
        if [ $count -ge $timeout ]; then
            echo "Таймаут ($timeout сек) истек для команды: $cmd" >> "$LOG_FILE"
            kill -9 $cmd_pid 2>/dev/null
            echo_progress "${RED}Таймаут ($timeout сек) истек: $msg${NC}"
            return 1
        fi
        sleep 1
        count=$((count + 1))
    done

    # Проверяем код возврата команды
    wait $cmd_pid
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo "Команда завершилась с ошибкой (код $exit_code): $cmd" >> "$LOG_FILE"
        echo_progress "${RED}Ошибка выполнения: $msg (код $exit_code)${NC}"
        return $exit_code
    fi

    return 0
}

# Функция для отображения прогресса
echo_progress() {
    local msg="$1"

    # Записываем в лог в любом случае
    echo "$msg" | sed 's/\x1b\[[0-9;]*m//g' >> "$LOG_FILE"

    if [ "$IS_TERMINAL" = true ]; then
        echo -e "$msg"
    else
        # Для запуска из Finder использовать диалоговое окно
        # Удаляем цветовые коды из сообщения для уведомления
        clean_msg=$(echo "$msg" | sed 's/\x1b\[[0-9;]*m//g')
        osascript -e "display notification \"$clean_msg\" with title \"CINERENTAL\"" 2>/dev/null || true
    fi
}

# Функция для проверки статуса выполнения команды
check_status() {
    RESULT=$?
    if [ $RESULT -eq 0 ]; then
        echo_progress "${GREEN}✓ $1${NC}"
        return 0
    else
        echo_progress "${RED}✗ $1 (код $RESULT)${NC}"

        if [ "$IS_TERMINAL" = false ]; then
            # Показываем ошибку в диалоговом окне при запуске из Finder
            osascript -e "display dialog \"Ошибка: $1 (код $RESULT)\" buttons {\"OK\"} default button \"OK\" with icon stop with title \"CINERENTAL - Ошибка\"" 2>/dev/null || true
        fi

        terminate_script 1
    fi
}

# Функция для проверки наличия необходимых команд
check_requirements() {
    echo_progress "Проверка необходимых команд..."

    # Поиск Docker
    if ! find_docker; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo_progress "${RED}Docker не найден. Проверяем наличие приложения Docker Desktop...${NC}"

            # Проверка приложения Docker Desktop
            if [ -d "/Applications/Docker.app" ]; then
                echo_progress "${YELLOW}Docker Desktop установлен, но CLI не найден. Запускаем приложение Docker Desktop...${NC}"
                open -g -a Docker
                sleep 5 # Даем время на запуск

                # Повторно ищем Docker после запуска приложения
                if ! find_docker; then
                    echo_progress "${RED}Docker CLI не найден. Убедитесь, что Docker Desktop полностью запустился и работает.${NC}"
                    osascript -e "display dialog \"Docker Desktop установлен, но команда docker не доступна.

Пожалуйста:
1. Запустите Docker Desktop
2. Дождитесь полной загрузки приложения
3. Запустите CINERENTAL снова\" buttons {\"OK\"} default button \"OK\" with icon stop with title \"CINERENTAL - Ошибка Docker\"" 2>/dev/null || true
                    terminate_script 1
                fi
            else
                echo_progress "${RED}Docker Desktop не установлен. Пожалуйста, установите Docker Desktop для macOS.${NC}"
                osascript -e "display dialog \"Docker Desktop не установлен на вашем компьютере.

Пожалуйста, установите Docker Desktop с официального сайта:
https://www.docker.com/products/docker-desktop/\" buttons {\"OK\"} default button \"OK\" with icon stop with title \"CINERENTAL - Ошибка Docker\"" 2>/dev/null || true
                terminate_script 1
            fi
        else
            echo_progress "${RED}Docker не установлен. Пожалуйста, установите Docker Desktop.${NC}"
            terminate_script 1
        fi
    fi

    # Проверка CLI docker-compose
    if ! "$DOCKER_BIN" compose version &> /dev/null; then
        echo_progress "${RED}Docker Compose не установлен или не доступен. Возможно, вам нужно обновить Docker Desktop.${NC}"
        terminate_script 1
    fi

    # Проверка наличия osascript (только для macOS)
    if [[ "$OSTYPE" == "darwin"* ]] && ! command -v osascript &> /dev/null; then
        echo_progress "${YELLOW}Команда osascript не найдена. Некоторые функции могут работать некорректно.${NC}"
    fi

    echo_progress "${GREEN}✓ Все необходимые команды найдены${NC}"
}

# Функция для запуска Docker в фоновом режиме (только macOS)
start_docker_hidden() {
    echo "Запуск Docker в фоновом режиме..." >> "$LOG_FILE"

    # Проверяем, запущен ли Docker Desktop
    if pgrep -x "Docker" >/dev/null; then
        echo "Docker Desktop уже запущен" >> "$LOG_FILE"
    else
        echo "Docker Desktop не запущен, запускаем через AppleScript..." >> "$LOG_FILE"

        # Более надежный способ запуска Docker в фоновом режиме через AppleScript
        osascript > /dev/null 2>&1 <<EOF
        tell application "Finder"
            -- Пытаемся запустить Docker без показа окна
            try
                do shell script "open -g -a Docker"
            end try

            -- Ожидаем запуска
            delay 3

            -- Пытаемся скрыть окно
            try
                tell application "System Events"
                    tell process "Docker"
                        set visible to false
                    end tell
                end tell
            end try
        end tell
EOF
        # Даем Docker время на запуск
        sleep 5
    fi

    # Дополнительная попытка скрыть Docker, если он виден
    echo "Пытаемся скрыть окно Docker..." >> "$LOG_FILE"

    # Пробуем несколько способов скрыть Docker
    osascript > /dev/null 2>&1 <<EOF
    try
        -- Прячем окно Docker через System Events
        tell application "System Events"
            set visible of process "Docker" to false
        end tell
    on error
        -- В случае ошибки пробуем другой способ
        try
            tell application "Docker" to set visible to false
        end try
    end try
EOF

    echo "Docker должен быть запущен и скрыт" >> "$LOG_FILE"
}

# Функция для проверки, запущен ли Docker
check_docker() {
    echo "Проверка статуса Docker..." >> "$LOG_FILE"

    if ! "$DOCKER_BIN" info > /dev/null 2>&1; then
        echo_progress "${YELLOW}Docker не запущен. Пытаемся запустить...${NC}"

        # Проверяем операционную систему
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS - запускаем Docker в фоновом режиме
            start_docker_hidden

            # Ждем запуска Docker с ограничением времени
            echo_progress "${YELLOW}Ожидаем запуска Docker (максимум 2 минуты)...${NC}"
            DOCKER_WAIT_COUNTER=0
            DOCKER_WAIT_MAX=120
            while ! "$DOCKER_BIN" info > /dev/null 2>&1; do
                sleep 1
                DOCKER_WAIT_COUNTER=$((DOCKER_WAIT_COUNTER + 1))
                # Каждые 10 секунд выводим прогресс
                if [ $((DOCKER_WAIT_COUNTER % 10)) -eq 0 ]; then
                    echo "Ожидание Docker: $DOCKER_WAIT_COUNTER секунд..." >> "$LOG_FILE"
                    echo_progress "${YELLOW}Ожидаем запуск Docker: $DOCKER_WAIT_COUNTER сек...${NC}"
                fi

                if [ $DOCKER_WAIT_COUNTER -ge $DOCKER_WAIT_MAX ]; then
                    echo_progress "${RED}Docker не запустился в течение $DOCKER_WAIT_MAX секунд. Проверьте установку Docker Desktop.${NC}"

                    # Отображаем диалог с помощью AppleScript для GUI
                    if [ "$IS_TERMINAL" = false ]; then
                        osascript -e "display dialog \"Docker не запустился в течение $DOCKER_WAIT_MAX секунд.

Пожалуйста, попробуйте:
1. Запустить Docker Desktop вручную
2. Дождаться полной загрузки (иконка в status bar станет стабильной)
3. Запустить CINERENTAL снова\" buttons {\"OK\"} default button \"OK\" with icon stop with title \"CINERENTAL - Ошибка Docker\"" 2>/dev/null || true
                    fi

                    terminate_script 1
                fi
            done

            echo_progress "${GREEN}Docker запущен через $DOCKER_WAIT_COUNTER секунд${NC}"

            # Повторно скрываем Docker, если он все еще видим
            if [ "$IS_TERMINAL" = false ]; then
                sleep 1
                osascript -e 'tell application "System Events" to set visible of process "Docker" to false' 2>/dev/null || true
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            sudo systemctl start docker
            check_status "Запуск Docker"
        else
            echo_progress "${RED}Неподдерживаемая операционная система: $OSTYPE${NC}"
            terminate_script 1
        fi
    else
        # Если Docker уже запущен, но окно видимо, скрываем его в macOS
        if [[ "$OSTYPE" == "darwin"* ]] && [ "$IS_TERMINAL" = false ]; then
            osascript -e 'tell application "System Events" to set visible of process "Docker" to false' 2>/dev/null || true
            echo "Docker уже запущен, скрыт" >> "$LOG_FILE"
        fi
    fi
    echo_progress "${GREEN}✓ Docker запущен${NC}"
}

# Функция для остановки существующих контейнеров
stop_containers() {
    echo "Остановка существующих контейнеров..." >> "$LOG_FILE"
    echo_progress "${YELLOW}Останавливаем существующие контейнеры...${NC}"

    # Запускаем с таймаутом
    run_with_timeout "$DOCKER_BIN compose down" 30 "Остановка контейнеров"
    if [ $? -ne 0 ]; then
        echo_progress "${RED}Ошибка при остановке контейнеров, завершаем работу...${NC}"
        terminate_script 1
    fi

    echo_progress "${GREEN}✓ Контейнеры остановлены${NC}"
}

# Функция для проверки наличия необходимых образов Docker
check_images() {
    echo "Проверка наличия Docker образов..." >> "$LOG_FILE"
    echo_progress "${YELLOW}Проверяем наличие необходимых Docker образов...${NC}"

    # Проверяем, есть ли образ нашего приложения
    if ! "$DOCKER_BIN" images | grep -q "cinerental-web"; then
        echo "Образы Docker не найдены" >> "$LOG_FILE"
        echo_progress "${YELLOW}Образы Docker не найдены. Начинаем сборку...${NC}"
        return 1
    fi

    # Если образы есть, но мы хотим принудительно пересобрать, раскомментируйте следующую строку
    # return 1

    echo "Docker образы найдены" >> "$LOG_FILE"
    echo_progress "${GREEN}✓ Необходимые Docker образы найдены${NC}"
    return 0
}

# Функция для сборки Docker образов
build_images() {
    echo "Сборка Docker образов..." >> "$LOG_FILE"
    echo_progress "${YELLOW}Собираем Docker образы. Это может занять несколько минут...${NC}"

    if [ "$IS_TERMINAL" = false ]; then
        osascript -e "display notification \"Начинаем сборку Docker образов. Это может занять несколько минут...\" with title \"CINERENTAL\"" 2>/dev/null || true
    fi

    # Запускаем сборку с таймаутом
    run_with_timeout "$DOCKER_BIN compose build" 600 "Сборка Docker образов"
    if [ $? -ne 0 ]; then
        echo_progress "${RED}Ошибка при сборке Docker образов, завершаем работу...${NC}"
        terminate_script 1
    fi

    echo_progress "${GREEN}✓ Docker образы успешно собраны${NC}"
}

# Функция для установки переменных окружения
set_environment() {
    echo "Установка переменных окружения..." >> "$LOG_FILE"
    echo_progress "${YELLOW}Устанавливаем переменные окружения для production...${NC}"
    export ENVIRONMENT=production
    export DEBUG=false
    export LOG_LEVEL=info
    export WORKERS_COUNT=2
}

# Функция для запуска приложения
start_application() {
    echo "Запуск приложения..." >> "$LOG_FILE"
    echo_progress "${YELLOW}Запускаем приложение в production режиме...${NC}"

    # Запускаем с таймаутом
    run_with_timeout "$DOCKER_BIN compose -f docker-compose.yml up -d" 60 "Запуск приложения"
    if [ $? -ne 0 ]; then
        echo_progress "${RED}Ошибка при запуске приложения, завершаем работу...${NC}"
        terminate_script 1
    fi

    echo_progress "${GREEN}✓ Приложение запущено${NC}"
}

# Функция для открытия браузера Chrome - ПОЛНОСТЬЮ ПЕРЕЗАПИСАНА
open_browser() {
    local url=$1
    echo "Открытие браузера для URL: $url" >> "$LOG_FILE"
    echo_progress "${YELLOW}Открываем браузер...${NC}"

    # Создаем временный скрипт для запуска браузера, который будет выполнен отдельно
    local temp_script="/tmp/cinerental_browser_launcher_$$.sh"

    echo "#!/bin/bash" > "$temp_script"
    echo "# Временный скрипт для запуска браузера" >> "$temp_script"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        # Проверяем наличие Chrome и используем его, иначе Safari
        if [ -d "/Applications/Google Chrome.app" ]; then
            echo "open -a \"Google Chrome\" \"$url\" > /dev/null 2>&1 &" >> "$temp_script"
        else
            echo "open \"$url\" > /dev/null 2>&1 &" >> "$temp_script"
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v google-chrome > /dev/null; then
            echo "nohup google-chrome \"$url\" > /dev/null 2>&1 &" >> "$temp_script"
        elif command -v chromium-browser > /dev/null; then
            echo "nohup chromium-browser \"$url\" > /dev/null 2>&1 &" >> "$temp_script"
        else
            echo "nohup xdg-open \"$url\" > /dev/null 2>&1 &" >> "$temp_script"
        fi
    else
        echo "echo \"Неподдерживаемая ОС для автоматического открытия браузера\"" >> "$temp_script"
        echo "exit 1" >> "$temp_script"
    fi

    # Делаем скрипт исполняемым
    chmod +x "$temp_script"

    # Запускаем в фоне и отсоединяем от текущего процесса
    echo "Запускаем временный скрипт для открытия браузера" >> "$LOG_FILE"
    nohup "$temp_script" > /dev/null 2>&1 &

    # Задержка, чтобы браузер успел запуститься до удаления скрипта
    sleep 1

    # Удаляем временный скрипт (не критично, если не удалится)
    rm -f "$temp_script" > /dev/null 2>&1

    echo "Браузер запущен асинхронно" >> "$LOG_FILE"
    return 0
}

# Функция для проверки статуса приложения
check_application() {
    echo "Проверка статуса приложения..." >> "$LOG_FILE"
    echo_progress "${YELLOW}Проверяем статус приложения...${NC}"

    # Ждем запуска приложения
    WAIT_COUNTER=0
    WAIT_MAX=90  # увеличиваем максимальное время ожидания
    HEALTH_CHECK_ATTEMPTS=0
    HEALTH_CHECK_REQUIRED=3  # требуем последовательных успешных проверок

    while [ $WAIT_COUNTER -lt $WAIT_MAX ]; do
        # Получаем статус контейнеров
        CONTAINERS_STATUS=$("$DOCKER_BIN" compose ps 2>/dev/null)
        STATUS_CODE=$?

        if [ $STATUS_CODE -ne 0 ]; then
            echo "Ошибка при получении статуса контейнеров (код $STATUS_CODE)" >> "$LOG_FILE"
            HEALTH_CHECK_ATTEMPTS=0
            sleep 1
            WAIT_COUNTER=$((WAIT_COUNTER + 1))
            continue
        fi

        echo "Статус контейнеров (попытка $WAIT_COUNTER): $CONTAINERS_STATUS" >> "$LOG_FILE"

        # Каждые 10 секунд выводим прогресс
        if [ $((WAIT_COUNTER % 10)) -eq 0 ]; then
            echo_progress "${YELLOW}Ожидаем готовность приложения: $WAIT_COUNTER сек...${NC}"
        fi

        if echo "$CONTAINERS_STATUS" | grep -q "healthy"; then
            HEALTH_CHECK_ATTEMPTS=$((HEALTH_CHECK_ATTEMPTS + 1))
            echo "Успешная проверка здоровья ($HEALTH_CHECK_ATTEMPTS/$HEALTH_CHECK_REQUIRED)" >> "$LOG_FILE"

            if [ $HEALTH_CHECK_ATTEMPTS -ge $HEALTH_CHECK_REQUIRED ]; then
                echo_progress "${GREEN}✓ Приложение успешно запущено${NC}"

                # Отображаем информацию о доступе
                SERVICE_URL="http://localhost:8000"

                if [ "$IS_TERMINAL" = true ]; then
                    echo -e "\nДоступные адреса:"
                    echo -e "${GREEN}API:${NC} $SERVICE_URL"
                    echo -e "${GREEN}База данных:${NC} localhost:5432"
                    echo -e "${GREEN}Redis:${NC} localhost:6379"
                    echo -e "\nДля просмотра логов используйте: ${YELLOW}$DOCKER_BIN compose logs -f${NC}"
                    echo -e "Для остановки приложения используйте: ${YELLOW}$DOCKER_BIN compose down${NC}"
                else
                    # Для Finder показываем уведомление
                    osascript -e "display notification \"Сервис доступен по адресу $SERVICE_URL\" with title \"CINERENTAL запущен\" sound name \"Glass\"" 2>/dev/null || true
                fi

                # Открываем браузер и не ждем завершения
                open_browser "$SERVICE_URL"

                echo "Приложение успешно запущено в $(date)" >> "$LOG_FILE"
                echo "Скрипт завершает работу после успешного запуска" >> "$LOG_FILE"

                # Гарантированное завершение скрипта с успешным статусом (0)
                terminate_script 0
            fi
        else
            HEALTH_CHECK_ATTEMPTS=0
        fi

        sleep 1
        WAIT_COUNTER=$((WAIT_COUNTER + 1))
    done

    echo "ОШИБКА: Приложение не запустилось в течение $WAIT_MAX секунд" >> "$LOG_FILE"
    echo_progress "${RED}✗ Ошибка при запуске приложения${NC}"

    # Сохраняем логи в файл для диагностики
    "$DOCKER_BIN" compose logs >> "$LOG_FILE" 2>&1

    if [ "$IS_TERMINAL" = true ]; then
        "$DOCKER_BIN" compose logs | head -n 100
        echo -e "\n${YELLOW}Полные логи записаны в файл: $LOG_FILE${NC}"
    else
        osascript -e "display dialog \"Не удалось запустить приложение за $WAIT_MAX секунд. Проверьте логи Docker по пути: $LOG_FILE\" buttons {\"OK\"} default button \"OK\" with icon stop with title \"CINERENTAL - Ошибка\"" 2>/dev/null || true
    fi

    # Гарантированное завершение скрипта с ошибкой (1)
    terminate_script 1
}

# Основной скрипт
echo_progress "${YELLOW}Запуск CINERENTAL в production режиме (версия $SCRIPT_VERSION)${NC}"

# Проверяем требования
check_requirements

# Проверяем и запускаем Docker
check_docker

# Останавливаем существующие контейнеры
stop_containers

# Проверяем наличие Docker образов и собираем их при необходимости
if ! check_images; then
    build_images
fi

# Устанавливаем переменные окружения
set_environment

# Запускаем приложение
start_application

# Проверяем статус приложения и открываем браузер
check_application

# Этот код никогда не должен выполняться, если все работает корректно
echo "КРИТИЧЕСКАЯ ОШИБКА: Скрипт достиг недопустимой точки выполнения" >> "$LOG_FILE"
terminate_script 1
