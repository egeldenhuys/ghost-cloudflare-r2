#!/bin/bash

echo "START"

# Create a file, /etc/containers/registries.conf.d/local.conf
cat > /etc/containers/registries.conf.d/local.conf <<EOF
# Configure insecure
[[registry]]
location = "192.168.88.20:5000"
insecure = true

[[registry]]
location = "192.168.88.20:5001"
insecure = true

[[registry]]
location = "192.168.88.20:5002"
insecure = true

[[registry]]
location = "192.168.88.20:5003"
insecure = true

# Use mirrors
[[registry]]
prefix = "docker.io"
location = "192.168.88.20:5001"
insecure = true

[[registry.mirror]]
location = "192.168.88.20:5001"
insecure = true

[[registry]]
prefix = "ghcr.io"
location = "192.168.88.20:5002"
insecure = true

[[registry]]
prefix = "quay.io"
location = "192.168.88.20:5003"
insecure = true

EOF

BUILD_DIR="$(pwd)"
PODMAN_ROOT="/var/lib/containers/storage"
PODMAN_STORAGE_DRIVER=overlay
PODMAN_CACHE_FLAGS="--layers --cache-from 192.168.88.20:5000/cache --cache-to 192.168.88.20:5000/cache"
PODMAN_BASE_FLAGS="--root=${PODMAN_ROOT} --storage-driver=${PODMAN_STORAGE_DRIVER}"

# podman $PODMAN_BASE_FLAGS load -i podman-base-image/image.tar
# podman $PODMAN_BASE_FLAGS images

podman $PODMAN_BASE_FLAGS build $PODMAN_CACHE_FLAGS -f ghost-cloudflare-r2/ci/images/podman-compose/Dockerfile -t localhost/podman-compose ghost-cloudflare-r2/ci/images/podman-compose

# podman -$PODMAN_BASE_FLAGS images

podman $PODMAN_BASE_FLAGS save localhost/podman-compose > image/image.tar

echo "DONE"
