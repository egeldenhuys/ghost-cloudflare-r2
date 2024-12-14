#!/bin/bash

mx=32;my=32;head -c "$((3*mx*my))" /dev/urandom | magick -depth 8 -size "${mx}x${my}" RGB:- PNG:/tmp/image.png
export HURL_random_image_path=/tmp/image.png

hurl "$@"
