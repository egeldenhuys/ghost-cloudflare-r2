FROM quay.io/podman/stable

# Some mirrors in South Africa are slow
RUN echo "fastestmirror=1" >> /etc/dnf/confg.conf

# Recommended version by Ghost: https://ghost.org/docs/faq/node-versions/
ARG DNF_NODE_VERSION=20

RUN dnf install -y nodejs${DNF_NODE_VERSION} nodejs${DNF_NODE_VERSION}-npm

RUN ln -fs /usr/bin/node-${DNF_NODE_VERSION} /usr/bin/node
RUN ln -fs /usr/bin/npm-${DNF_NODE_VERSION} /usr/bin/npm

RUN npm install -g tslint-to-eslint-config typescript
RUN npm install -g ghost-cli@latest

RUN dnf install -y git
RUN dnf install -y podman-compose
