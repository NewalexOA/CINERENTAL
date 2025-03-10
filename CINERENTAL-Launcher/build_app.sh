#!/bin/bash

# Script for building the application

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Виртуальное окружение не найдено. Создаю..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Clean previous builds
echo "Очистка предыдущих сборок..."
rm -rf build dist

# Build the application
echo "Сборка приложения..."
python setup.py py2app

# Check the result
if [ -d "dist/CINERENTAL Launcher.app" ]; then
    echo "Приложение успешно собрано!"
    echo "Путь к приложению: $(pwd)/dist/CINERENTAL Launcher.app"

    # Create DMG image (optional)
    read -p "Создать DMG-образ? (y/n): " create_dmg
    if [ "$create_dmg" = "y" ]; then
        echo "Создание DMG-образа..."

        # Check if create-dmg utility exists
        if ! command -v create-dmg &> /dev/null; then
            echo "Утилита create-dmg не найдена. Установка..."
            brew install create-dmg || { echo "Ошибка установки create-dmg. Установите вручную: brew install create-dmg"; exit 1; }
        fi

        # Create DMG
        create-dmg \
            --volname "CINERENTAL Launcher" \
            --window-pos 200 120 \
            --window-size 800 400 \
            --icon-size 100 \
            --icon "CINERENTAL Launcher.app" 200 190 \
            --hide-extension "CINERENTAL Launcher.app" \
            --app-drop-link 600 185 \
            "dist/CINERENTAL Launcher.dmg" \
            "dist/CINERENTAL Launcher.app" || { echo "Ошибка создания DMG-образа"; }

        if [ -f "dist/CINERENTAL Launcher.dmg" ]; then
            echo "DMG-образ успешно создан: $(pwd)/dist/CINERENTAL Launcher.dmg"
        fi
    fi
else
    echo "Ошибка сборки приложения!"
    exit 1
fi
