#!/bin/bash

echo "START"

BUILD_DIR="$(pwd)"
PODMAN_ROOT="/var/lib/containers/storage"
PODMAN_STORAGE_DRIVER=overlay

# Create a file, /etc/containers/registries.conf.d/local.conf
cat > /etc/containers/registries.conf.d/local.conf <<EOF
[[registry]]
location = "192.168.88.20:5000"
insecure = true

EOF

CACHE_COMMANDS="--layers --cache-from 192.168.88.20:5000/concourse/cache --cache-to 192.168.88.20:5000/concourse/cache"

ls -al
ls -al $BUILD_DIR/cache
ls -al $PODMAN_ROOT

podman --root=$PODMAN_ROOT --storage-driver=$PODMAN_STORAGE_DRIVER load -i podman-base-image/image.tar
podman --root=$PODMAN_ROOT --storage-driver=$PODMAN_STORAGE_DRIVER images

podman --root=$PODMAN_ROOT --storage-driver=$PODMAN_STORAGE_DRIVER $CACHE_COMMANDS build -f ghost-cloudflare-r2/ci/images/podman-compose/Dockerfile -t localhost/podman-compose ghost-cloudflare-r2/ci/images/podman-compose

podman --root=$PODMAN_ROOT --storage-driver=$PODMAN_STORAGE_DRIVER images

podman --root=$PODMAN_ROOT --storage-driver=$PODMAN_STORAGE_DRIVER save localhost/podman-compose > image/image.tar

ls -al
ls -al $BUILD_DIR/cache
ls -al $PODMAN_ROOT

echo "DONE"
