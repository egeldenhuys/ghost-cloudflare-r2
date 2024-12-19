#!/bin/bash

podman load -i podman-base-image/image.tar
podman image ls

podman build -f ghost-cloudflare-r2/ci/images/podman-compose/Dockerfile -t localhost/podman-compose ghost-cloudflare-r2/ci/images/podman-compose
ls -al
podman save localhost/podman-compose > podman-compose-image/image.tar
