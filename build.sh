#!/bin/bash
set -e

echo "Building ghost-cloudflare-r2..."
# https://stackoverflow.com/a/246128
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

set -x

cd $SCRIPT_DIR

rm -f index.js index.d.ts
npm_config_cache='/npm_cache' npm install

cp ./build/index.js .
cp ./build/index.d.ts .

