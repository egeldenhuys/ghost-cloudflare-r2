#!/bin/bash

container_tool=podman

if ! command -v $container_tool --version &> /dev/null
then
    echo "${container_tool} could not be found"
    container_tool=docker
fi

if ! command -v $container_tool --version &> /dev/null
then
    echo "${container_tool} could not be found"
    exit 1
fi

echo "using $container_tool"

$container_tool run --rm \
--env npm_config_cache='/ghost-cloudflare-r2/npm_cache' \
--volume "$(pwd)":/ghost-cloudflare-r2:z \
--entrypoint "/bin/sh" \
node:18.13-alpine /ghost-cloudflare-r2/build.sh
