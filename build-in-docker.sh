#!/bin/bash

docker run --rm --env npm_config_cache='/ghost-cloudflare-r2/npm_cache' --volume "$(pwd)":/ghost-cloudflare-r2 --entrypoint "/bin/sh" node:18.13.0-alpine /ghost-cloudflare-r2/build.sh
