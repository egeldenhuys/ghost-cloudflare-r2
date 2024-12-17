#!/bin/bash

OUTPUT_DIR=$1

# Create a random 32x32 png
mx=32;my=32;head -c "$((3*mx*my))" /dev/urandom | convert -depth 8 -size "${mx}x${my}" RGB:- PNG:${OUTPUT_DIR}/random.png

# Generate test video
ffmpeg -f lavfi -i testsrc -t 10 -pix_fmt yuv420p ${OUTPUT_DIR}/test.mp4
