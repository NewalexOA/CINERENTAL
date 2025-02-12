# Use Python 3.12 slim image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        netcat-traditional \
        libpq-dev \
        python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY . .

# Install project in development mode and psycopg2-binary
RUN pip install psycopg2-binary && pip install -e ".[dev]"

# Create media directory and non-root user
RUN mkdir -p media && \
    adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app

# Make scripts executable
RUN chmod +x docker/start.sh docker/wait-for-it.sh docker/run-tests.sh

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000
