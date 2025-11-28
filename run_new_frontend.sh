#!/bin/bash
echo "Starting React Frontend..."
echo "Ensure your backend is running on http://localhost:8000 (or set BACKEND_URL env var)"

cd frontend-react
npm install
npm run dev
