#!/bin/bash

function run_hurl() {
    local hurl_args=$1
    podman run --rm -v $PWD/hurl:/hurl:z,ro --userns=keep-id --workdir /hurl --net=host ghcr.io/orange-opensource/hurl:latest --file-root /hurl --variables-file /hurl/variables.env --jobs 1 --test ${hurl_args}
}

run_hurl fragments/0-init-blog.hurl
run_hurl tests/upload-image.hurl
run_hurl tests/upload-thumbnail.hurl