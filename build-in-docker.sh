#!/bin/bash

docker run --rm --volume "$(pwd)":/ghost-cloudflare-r2 --entrypoint "/bin/bash" node:18.13.0 /ghost-cloudflare-r2/build.sh
