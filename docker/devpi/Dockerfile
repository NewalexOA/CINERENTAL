FROM python:3.12-slim

LABEL maintainer="Aleksei Anaskin <dev.anaskin@gmail.com>"
LABEL description="Devpi server for Python package caching"

ENV PYTHONUNBUFFERED=1
ENV DEVPI_SERVERDIR="/data/devpi"

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r devpi && \
    useradd -r -g devpi -d /home/devpi -m devpi

RUN pip install --no-cache-dir devpi-server devpi-web

RUN mkdir -p /data/devpi && \
    chown -R devpi:devpi /data

USER devpi

COPY --chown=devpi:devpi entrypoint.sh /home/devpi/entrypoint.sh
RUN chmod +x /home/devpi/entrypoint.sh

EXPOSE 3141
VOLUME ["/data"]

WORKDIR /home/devpi
ENTRYPOINT ["./entrypoint.sh"]
