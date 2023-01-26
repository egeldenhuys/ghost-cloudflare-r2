#!/bin/sh
set -e

echo "Building ghost-cloudflare-r2..."
# https://stackoverflow.com/a/1638397
# Absolute path to this script, e.g. /home/user/bin/foo.sh
SCRIPT=$(readlink -f "$0")
# Absolute path this script is in, thus /home/user/bin
SCRIPT_DIR=$(dirname "$SCRIPT")

set -x

cd $SCRIPT_DIR

# Cleanup
rm -fr build/
rm -fr node_modules/
rm -fr ${SCRIPT_DIR}/npm_cache
rm -f index.js index.d.ts index.js.map

# Install
npm_config_cache=${SCRIPT_DIR}/npm_cache npm install

# Cleanup
rm -fr ${SCRIPT_DIR}/npm_cache

# Install
cp ./build/src/index.js .
cp ./build/src/index.js.map .
cp ./build/src/index.d.ts .
