#!/bin/bash

cat > /etc/containers/registries.conf.d/local.conf <<EOF
# Configure insecure
[[registry]]
location = "192.168.88.20:5000"
insecure = true

[[registry]]
location = "192.168.88.20:5001"
insecure = true

[[registry]]
location = "192.168.88.20:5002"
insecure = true

[[registry]]
location = "192.168.88.20:5003"
insecure = true

# Use mirrors
[[registry]]
prefix = "docker.io"
location = "192.168.88.20:5001"
insecure = true

[[registry.mirror]]
location = "192.168.88.20:5001"
insecure = true

[[registry]]
prefix = "ghcr.io"
location = "192.168.88.20:5002"
insecure = true

[[registry]]
prefix = "quay.io"
location = "192.168.88.20:5003"
insecure = true

EOF

cd ghost-cloudflare-r2/integration-tests

podman-compose pull
podman-compose up -d
./test.sh
RES=$?
podman-compose down

exit $RES
