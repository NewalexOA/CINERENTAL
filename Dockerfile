# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

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

# Copy project files
COPY pyproject.toml README.md ./
COPY backend backend/

# ARG to control environment type
ARG ENV_TYPE=prod

# Install dependencies
RUN pip install --no-cache-dir . && \
    pip install --no-cache-dir psycopg2-binary faker treepoem

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
        curl \
        libpq5 \
        ghostscript \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=appuser:appuser . .

# Install Playwright if needed
ARG INSTALL_PLAYWRIGHT=false
RUN if [ "$INSTALL_PLAYWRIGHT" = "true" ]; then \
        playwright install; \
    fi

# Make scripts executable
RUN chmod +x docker/start.sh docker/wait-for.sh docker/run-tests.sh

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Set entry point
CMD ["./docker/start.sh"]
