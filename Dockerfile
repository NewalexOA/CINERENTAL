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
        ghostscript \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements files
COPY pyproject.toml requirements*.txt ./

# ARG to control environment type
ARG ENV_TYPE=prod

# Install dependencies based on environment type
RUN if [ "$ENV_TYPE" = "prod" ]; then \
        pip install --no-cache-dir -r requirements-prod.txt; \
    elif [ "$ENV_TYPE" = "dev" ]; then \
        pip install --no-cache-dir -r requirements-dev.txt; \
    else \
        pip install --no-cache-dir -r requirements-test.txt; \
    fi

# Install additional dependencies
RUN pip install --no-cache-dir psycopg2-binary faker

# Stage 2: Runtime
FROM python:3.12-slim AS runtime

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/docker:$PATH"

# Set work directory
WORKDIR /app

# ARG to control whether to install Playwright dependencies
ARG INSTALL_PLAYWRIGHT_DEPS=false

# Install runtime dependencies and optionally Playwright system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        netcat-traditional \
        libpq-dev \
        postgresql-client \
        ghostscript \
    && if [ "$INSTALL_PLAYWRIGHT_DEPS" = "true" ]; then \
        apt-get install -y --no-install-recommends \
        libnss3 \
        libnspr4 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libcups2 \
        libdrm2 \
        libdbus-1-3 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxrandr2 \
        libgbm1 \
        libpango-1.0-0 \
        libcairo2 \
        libasound2 \
        libatspi2.0-0; \
    fi \
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

# Switch to non-root user
USER appuser

# Install Playwright browsers conditionally
ARG INSTALL_PLAYWRIGHT=false
RUN if [ "$INSTALL_PLAYWRIGHT" = "true" ]; then \
        playwright install chromium; \
    fi

# Make scripts executable
RUN chmod +x docker/start.sh docker/wait-for.sh docker/run-tests.sh

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=5s --timeout=50s --start-period=5s --retries=10 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1
