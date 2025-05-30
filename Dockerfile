# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1 \
    PIP_INDEX_URL=https://pypi.org/simple/ \
    PIP_TRUSTED_HOST=pypi.org \
    UV_INDEX_URL=https://pypi.org/simple/

# Set work directory
WORKDIR /build

# Install build dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        libpq-dev \
        python3-dev \
        ghostscript \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy project files for dependency installation
COPY pyproject.toml README.md ./
COPY backend backend/
COPY docker docker/

# Setup pip configuration for local mirrors if available
RUN if [ -f "docker/pip.conf" ]; then mkdir -p /etc/pip && cp docker/pip.conf /etc/pip/pip.conf; fi

# ARG to control environment type
ARG ENV_TYPE=prod

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    echo 'export PATH="/root/.local/bin:$PATH"' >> ~/.bashrc && \
    export PATH="/root/.local/bin:$PATH"

# Install dependencies based on environment type
RUN export PATH="/root/.local/bin:$PATH" && \
    uv pip install --system . && \
    uv pip install --system psycopg2-binary && \
    if [ "$ENV_TYPE" = "dev" ]; then \
        echo "Installing development-specific dependencies (e.g., faker for seeding)..." && \
        uv pip install --system faker; \
    fi && \
    if [ "$ENV_TYPE" = "test" ]; then \
        echo "Installing test-specific dependencies..." && \
        uv pip install --system faker pytest pytest-cov pytest-asyncio pytest-mock httpx coverage requests; \
    fi

# Install Playwright if needed
ARG INSTALL_PLAYWRIGHT=false
RUN if [ "$INSTALL_PLAYWRIGHT" = "true" ]; then \
        export PATH="/root/.local/bin:$PATH" && \
        uv pip install --system playwright && \
        playwright install chromium; \
    fi

# Stage 2: Runtime
FROM python:3.12-slim AS runtime

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set work directory
WORKDIR /app

# Install runtime dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        netcat-traditional \
        ghostscript \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=appuser:appuser backend backend
COPY --chown=appuser:appuser frontend frontend
COPY --chown=appuser:appuser migrations migrations
COPY --chown=appuser:appuser alembic.ini pyproject.toml README.md ./
COPY --chown=appuser:appuser docker docker

# Make scripts executable and set permissions
RUN chmod +x docker/start.sh docker/wait-for.sh docker/run-tests.sh && \
    mkdir -p /var/lib/apt/lists/partial && \
    chmod -R 777 /var/lib/apt/lists/

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Set entry point
CMD ["./docker/start.sh"]
