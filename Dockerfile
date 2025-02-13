# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    # Use Yandex mirror for pip packages (faster in Russia)
    PIP_INDEX_URL=https://mirror.yandex.ru/pypi/simple/ \
    # Backup mirrors
    PIP_EXTRA_INDEX_URL=https://pypi.org/simple/

# Set work directory
WORKDIR /build

# Install build dependencies using Russian mirrors
RUN echo "deb http://mirror.yandex.ru/debian/ bookworm main" > /etc/apt/sources.list && \
    echo "deb http://mirror.yandex.ru/debian/ bookworm-updates main" >> /etc/apt/sources.list && \
    echo "deb http://mirror.yandex.ru/debian-security/ bookworm-security main" >> /etc/apt/sources.list && \
    apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        libpq-dev \
        python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements files
COPY pyproject.toml requirements.txt ./

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir psycopg2-binary faker

# Stage 2: Runtime
FROM python:3.12-slim AS runtime

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/docker:$PATH"

# Set work directory
WORKDIR /app

# Install runtime dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        netcat-traditional \
        libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && adduser --disabled-password --gecos '' appuser \
    && mkdir -p media \
    && chown -R appuser:appuser /app

# Copy dependencies from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy project files
COPY --chown=appuser:appuser . .

# Make scripts executable
RUN chmod +x docker/start.sh docker/wait-for.sh docker/run-tests.sh

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1
