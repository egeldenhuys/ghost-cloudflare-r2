#!/bin/bash

# Create a random 32x32 png
mx=32;my=32;head -c "$((3*mx*my))" /dev/urandom | magick -depth 8 -size "${mx}x${my}" RGB:- PNG:random.png
