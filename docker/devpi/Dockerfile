FROM python:3.12-slim

# Install devpi
RUN pip install --no-cache-dir devpi-server devpi-web

# Create a non-root user
RUN useradd -m devpi

# Create directories
RUN mkdir -p /data/devpi && chown -R devpi:devpi /data/devpi

# Switch to non-root user
USER devpi

# Initialize devpi
RUN devpi-init --serverdir /data/devpi

# Expose the port
EXPOSE 3141

# Start devpi
CMD ["devpi-server", "--host", "0.0.0.0", "--port", "3141", "--serverdir", "/data/devpi"]
