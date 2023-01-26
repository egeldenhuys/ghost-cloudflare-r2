#!/bin/bash

docker run --rm --env npm_config_cache='/ghost-cloudflare-r2/npm_cache' --volume "$(pwd)":/ghost-cloudflare-r2 --entrypoint "/bin/bash" node:18.13.0 /ghost-cloudflare-r2/build.sh
