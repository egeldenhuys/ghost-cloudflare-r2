FROM docker.io/node:20-bookworm

# TODO: optimise commands for caching and to avoid stale versions
RUN apt-get update
RUN apt-get -y install podman podman-compose fuse-overlayfs ffmpeg

RUN npm install -g tslint-to-eslint-config typescript
RUN npm install -g ghost-cli@latest

VOLUME /var/lib/containers
