#!/bin/bash

podman run --rm -v $PWD/hurl:/hurl:z,ro --net=host ghcr.io/orange-opensource/hurl:latest --variables-file /hurl/variables.env --test /hurl/tests.hurl
