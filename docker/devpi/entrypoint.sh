#!/bin/bash
set -e

echo "Starting DevPi Server"
echo "Data directory: $DEVPI_SERVERDIR"

if [ ! -f "$DEVPI_SERVERDIR/.serverversion" ]; then
    echo "Initializing DevPi server..."
    devpi-init --serverdir="$DEVPI_SERVERDIR"
fi

echo "Starting devpi-server..."
exec devpi-server --host=0.0.0.0 --port=3141 --serverdir="$DEVPI_SERVERDIR"
