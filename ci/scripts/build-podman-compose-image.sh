#!/bin/bash

podman load -i podman-base-image/image.tar
podman images

podman build -f ghost-cloudflare-r2/ci/images/podman-compose/Dockerfile -t localhost/podman-compose ghost-cloudflare-r2/ci/images/podman-compose

podman images

podman save localhost/podman-compose > image/image.tar
