#!/bin/bash
set -e

echo "Building ghost-cloudflare-r2..."
# https://stackoverflow.com/a/246128
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

set -x

cd $SCRIPT_DIR
rm -fr build/
rm -f index.js index.d.ts index.js.map

npm_config_cache=${SCRIPT_DIR}/npm_cache npm install
rm -fr ${SCRIPT_DIR}/npm_cache

cp ./build/src/index.js .
cp ./build/src/index.js.map .
cp ./build/src/index.d.ts .
