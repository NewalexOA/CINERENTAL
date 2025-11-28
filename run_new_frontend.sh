#!/bin/bash
echo "Starting React Frontend..."
echo "Ensure your backend is running on http://localhost:8000 (or set BACKEND_URL env var)"

cd frontend-react

if [ "$1" == "--clean" ]; then
    echo "Cleaning node_modules..."
    rm -rf node_modules package-lock.json
fi

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting development server..."
npm run dev
