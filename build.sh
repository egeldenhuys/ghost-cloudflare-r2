#!/bin/bash
set -e

echo "Building ghost-cloudflare-r2..."
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

set -x

cd $SCRIPT_DIR
npm install
