#!/bin/sh

docker run --rm \
--volume "$(pwd)":/ghost-cloudflare-r2 \
--volume /content_parent_dir:/content_parent \
-e CONTENT_IMPORTER_CONTENT_PARENT_PATH='/content_parent' \
-e GHOST_STORAGE_ADAPTER_R2_ENDPOINT='https://<account_id>.r2.cloudflarestorage.com' \
-e GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID='xxxxxx' \
-e GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY='xxxxxx' \
-e GHOST_STORAGE_ADAPTER_R2_BUCKET='my-ghost-bucket' \
-e GHOST_STORAGE_ADAPTER_R2_DOMAIN='https://cdn.example.com' \
-e GHOST_STORAGE_ADAPTER_R2_UUID_NAME='false' \
-e GHOST_STORAGE_ADAPTER_R2_IMAGES_URL_PREFIX='/content/images/' \
-e GHOST_STORAGE_ADAPTER_R2_MEDIA_URL_PREFIX='/content/media/' \
-e GHOST_STORAGE_ADAPTER_R2_FILES_URL_PREFIX='/content/files/' \
-e GHOST_STORAGE_ADAPTER_R2_CONTENT_PREFIX='' \
-e GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE='true' \
-e GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES='false' \
-e GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL='true' \
-e GHOST_STORAGE_ADAPTER_R2_RESIZE_WIDTHS='300,600,1000,1600,400,750,960,1140,1200' \
-e GHOST_STORAGE_ADAPTER_R2_RESIZE_JPEG_QUALITY='80' \
-e GHOST_STORAGE_ADAPTER_R2_LOG_LEVEL='debug' \
node:18.13.0-alpine /ghost-cloudflare-r2/build/scripts/run_content_importer.js
