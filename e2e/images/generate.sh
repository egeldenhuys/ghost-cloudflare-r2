#!/bin/bash

# Create a random 32x32 png
mx=512;my=512;head -c "$((3*mx*my))" /dev/urandom | convert -depth 8 -size "${mx}x${my}" RGB:- PNG:random-x512.png
