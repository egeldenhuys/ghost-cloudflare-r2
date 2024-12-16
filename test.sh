#!/bin/bash

set -e

cd e2e/
podman-compose down
podman-compose up -d
npx playwright test --workers=1
# podman-compose down
cd ..
