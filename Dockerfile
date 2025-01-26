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
        python3-setuptools \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install setuptools first
RUN pip install --no-cache-dir setuptools wheel

# Copy and install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create media directory and non-root user
RUN mkdir -p media && \
    adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app /opt/venv

# Copy project files
COPY --chown=appuser:appuser . .

# Install package in development mode
RUN pip install -e .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
