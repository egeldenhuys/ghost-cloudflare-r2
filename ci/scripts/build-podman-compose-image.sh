#!/bin/bash

BUILD_DIR="$(pwd)"
PODMAN_ROOT="${BUILD_DIR}/cache/storage"

ls -al
ls -al $PODMAN_ROOT

podman --root=$PODMAN_ROOT load -i podman-base-image/image.tar
podman --root=$PODMAN_ROOT images

podman --root=$PODMAN_ROOT build -f ghost-cloudflare-r2/ci/images/podman-compose/Dockerfile -t localhost/podman-compose ghost-cloudflare-r2/ci/images/podman-compose

podman --root=$PODMAN_ROOT images

podman --root=$PODMAN_ROOT save localhost/podman-compose > image/image.tar
