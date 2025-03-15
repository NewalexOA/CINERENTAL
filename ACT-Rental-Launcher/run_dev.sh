#!/bin/bash

# Script for running the application in development mode

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Виртуальное окружение не найдено. Создаю..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Launch the application
echo "Запуск ACT-Rental Launcher в режиме разработки..."
cd src && python main.py
