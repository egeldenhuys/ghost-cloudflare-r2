#!/bin/sh

docker run --rm --volume "$(pwd)":/ghost-cloudflare-r2 node:18.13.0-alpine /ghost-cloudflare-r2/build/scripts/run_content_importer.js
