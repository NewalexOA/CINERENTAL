#!/bin/bash

# Скрипт для копирования JS и CSS библиотек в соответствующие директории

# Создаем директории, если они не существуют
mkdir -p /app/frontend/static/js/lib
mkdir -p /app/frontend/static/css/lib

# Показываем содержимое директорий
echo "Текущее содержимое JS директории:"
ls -la /app/frontend/static/js/lib/ 2>/dev/null || echo "Директория пуста или не существует"

echo "Текущее содержимое CSS директории:"
ls -la /app/frontend/static/css/lib/ 2>/dev/null || echo "Директория пуста или не существует"

# Проверяем наличие файлов в исходной директории
echo "Проверка наличия исходных JS файлов:"
ls -la frontend/static/js/lib/ 2>/dev/null || echo "Исходная JS директория пуста или не существует"

echo "Проверка наличия исходных CSS файлов:"
ls -la frontend/static/css/lib/ 2>/dev/null || echo "Исходная CSS директория пуста или не существует"

# Загрузка библиотек, если они отсутствуют
if [ ! -f "/app/frontend/static/js/lib/moment.min.js" ]; then
    echo "Загрузка JavaScript библиотек..."
    
    # Создаем директории
    mkdir -p /app/frontend/static/js/lib
    mkdir -p /app/frontend/static/css/lib
    
    # Загружаем библиотеки
    curl -s -o /app/frontend/static/js/lib/moment.min.js https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js
    curl -s -o /app/frontend/static/js/lib/daterangepicker.min.js https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js
    curl -s -o /app/frontend/static/css/lib/daterangepicker.min.css https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css
    
    # Создаем README файлы
    echo "# JavaScript Libraries" > /app/frontend/static/js/lib/README.md
    echo "Эта директория содержит сторонние JavaScript библиотеки, необходимые для работы приложения:" >> /app/frontend/static/js/lib/README.md
    echo "" >> /app/frontend/static/js/lib/README.md
    echo "* \`moment.min.js\` - Библиотека для работы с датами и временем" >> /app/frontend/static/js/lib/README.md
    echo "* \`daterangepicker.min.js\` - Компонент выбора диапазона дат" >> /app/frontend/static/js/lib/README.md
    
    echo "# CSS Libraries" > /app/frontend/static/css/lib/README.md
    echo "Эта директория содержит сторонние CSS библиотеки, необходимые для работы приложения:" >> /app/frontend/static/css/lib/README.md
    echo "" >> /app/frontend/static/css/lib/README.md
    echo "* \`daterangepicker.min.css\` - Стили для компонента выбора диапазона дат" >> /app/frontend/static/css/lib/README.md
    
    echo "Библиотеки успешно загружены"
else
    echo "JavaScript и CSS библиотеки уже присутствуют"
fi

# Проверяем, что файлы загружены
echo "Итоговое содержимое JS директории:"
ls -la /app/frontend/static/js/lib/

echo "Итоговое содержимое CSS директории:"
ls -la /app/frontend/static/css/lib/

echo "Копирование библиотек завершено" 