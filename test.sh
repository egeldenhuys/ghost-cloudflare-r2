#!/bin/bash

set -e

cd e2e/
podman-compose down
podman-compose up -d

cd images
./generate.sh
cd ..
cd ..
npx playwright test --workers=1 --ui --ui-host=0.0.0.0

cd e2e/
podman-compose down
cd ..
