#!/bin/bash

set -e

echo "Initializing DevPi server..."

# Wait for DevPi to become available
./docker/wait-for-devpi.sh devpi 3141 60

# Create pip.conf for devpi if it doesn't exist
if [ ! -f "docker/pip.conf" ]; then
    cat > docker/pip.conf << EOL
[global]
index-url = http://devpi:3141/root/pypi/+simple/
trusted-host = devpi
timeout = 60

[search]
index = http://devpi:3141/root/pypi/
EOL
    echo "Created docker/pip.conf"
fi

# Install devpi-client if not already available
if ! command -v devpi-client &> /dev/null; then
    pip install devpi-client
fi

# Login to devpi
devpi use http://devpi:3141
devpi login root --password=''

# Create mirror if it doesn't exist
if ! devpi index -l | grep -q 'root/pypi'; then
    devpi index -c pypi type=mirror mirror_url=https://pypi.org/simple/
    echo "Created PyPI mirror"
fi

# Preload packages from requirements.txt
if [ -f "requirements.txt" ]; then
    echo "Preloading packages from requirements.txt to DevPi cache..."
    xargs -n1 pip download -d /tmp/pip_cache < requirements.txt

    for pkg in /tmp/pip_cache/*; do
        echo "Uploading $pkg to DevPi..."
        devpi upload --from-dir /tmp/pip_cache
    done

    rm -rf /tmp/pip_cache
    echo "Preloaded packages to DevPi cache"
fi

echo "DevPi initialization complete"
