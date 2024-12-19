#!/bin/bash

podman images

podman load -i minio-image/image.tar
# podman tag "$(cat minio-image/digest)" "$(cat minio-image/repository):$(cat minio-image/tag)"

podman load -i ghost-image/image.tar
# podman tag "$(cat ghost-image/digest)" "$(cat ghost-image/repository):$(cat ghost-image/tag)"

podman load -i hurl-image/image.tar
# podman tag "$(cat hurl-image/digest)" "$(cat hurl-image/repository):$(cat hurl-image/tag)"

podman images

cd ghost-cloudflare-r2/integration-tests
# TODO: add to image

podman-compose up -d
./test.sh
RES=$?
#podman-compose down

exit $RES
