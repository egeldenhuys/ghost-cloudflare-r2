#!/bin/bash

# trap ctrl-c and call ctrl_c()
trap ctrl_c INT

function ctrl_c() {
    echo "** Trapped CTRL-C"
    exit 1
}

function run_hurl() {
    local hurl_args=$1
    # --userns=keep-id
    podman run --rm -v $PWD/hurl:/hurl:z,ro --workdir /hurl --net=host ghcr.io/orange-opensource/hurl:5.0.1 --file-root /hurl --variables-file /hurl/variables.env --jobs 1 --test ${hurl_args}
}

# podman-compose down
# podman-compose up -d

run_hurl fragments/0-init-blog.hurl
run_hurl tests/upload-image.hurl
run_hurl tests/upload-thumbnail.hurl
run_hurl tests/upload-video.hurl
run_hurl tests/upload-file.hurl

# podman-compose down
