#!/bin/bash

echo "START"

BUILD_DIR="$(pwd)"
PODMAN_ROOT="${BUILD_DIR}/cache/storage"
PODMAN_STORAGE_DRIVER=vfs

ls -al
ls -al $BUILD_DIR/cache
ls -al $PODMAN_ROOT

podman --root=$PODMAN_ROOT --storage-driver=$PODMAN_STORAGE_DRIVER load -i podman-base-image/image.tar
podman --root=$PODMAN_ROOT --storage-driver=$PODMAN_STORAGE_DRIVER images

podman --root=$PODMAN_ROOT --storage-driver=$PODMAN_STORAGE_DRIVER build -f ghost-cloudflare-r2/ci/images/podman-compose/Dockerfile -t localhost/podman-compose ghost-cloudflare-r2/ci/images/podman-compose

podman --root=$PODMAN_ROOT --storage-driver=$PODMAN_STORAGE_DRIVER images

podman --root=$PODMAN_ROOT --storage-driver=$PODMAN_STORAGE_DRIVER save localhost/podman-compose > image/image.tar

ls -al
ls -al $BUILD_DIR/cache
ls -al $PODMAN_ROOT

echo "DONE"
