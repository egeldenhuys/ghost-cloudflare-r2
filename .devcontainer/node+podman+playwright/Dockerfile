FROM docker.io/node:20-bookworm

# TODO: optimise commands for caching and to avoid stale versions
RUN apt-get update
RUN apt-get -y install podman fuse-overlayfs

RUN npm install -g tslint-to-eslint-config typescript
RUN npm install -g ghost-cli@latest

RUN npx -y playwright@1.49.1 install --with-deps
RUN apt-get -y install podman-compose

# For generating a random video
RUN apt-get -y install ffmpeg

VOLUME /var/lib/containers

