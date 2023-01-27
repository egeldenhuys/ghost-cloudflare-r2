# Ghost Cloudflare R2 Storage Adapter
[Cloudflare R2](https://www.cloudflare.com/products/r2/) storage adapter for [Ghost](https://github.com/TryGhost/Ghost).

## Features
- Save images in Cloudflare R2
- Supports images, media and files
- Resize images to emulate [Responsive Images](https://ghost.org/docs/themes/assets/)
  - Implements `saveRaw` to force ghost to generate the `srcset` attribute for image cards
- Save images and media using UUID as name
- Compress resized images
- Written in TypeScript for maintainability

## Installation
The adapter can be installed using npm or Docker.

### Clone repo
```bash
# Starting from the Ghost base directory
mkdir -p content/adapters/storage
cd content/adapters/storage
git clone https://github.com/egeldenhuys/ghost-cloudflare-r2
cd ghost-cloudflare-r2
git checkout v1.0.0
```

### Install using npm
Requires `npm` to be installed.

```bash
npm install
cp -f ./build/src/index.js ./build/src/index.js.map ./build/src/index.d.ts .
```

### Install using Docker
Requires Docker to be installed. This has the advantage of not requiring you to pollute your server with node and npm if you are already using Docker.

```bash
./build-in-docker.sh
```

## Configuration
The storage adapter makes use of the following environment variables:

| Environment Variable                           | Description                                                                                                                                       |
|------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| `GHOST_STORAGE_ADAPTER_R2_ACCOUNT_ID`          | Cloudflare R2 Account ID                                                                                                                          |
| `GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID`       | Access Key ID from Cloudflare R2 API Token                                                                                                        |
| `GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY`   | Secret Access Key from Cloudflare R2 API Token                                                                                                    |
| `GHOST_STORAGE_ADAPTER_R2_BUCKET`              | R2 Bucket to use for storage                                                                                                                      |
| `GHOST_STORAGE_ADAPTER_R2_DOMAIN`              | R2 Custom domain to use for serving content                                                                                                       |
| `GHOST_STORAGE_ADAPTER_R2_IMAGES_URL_PREFIX`   | URL prefix to use for storing and serving images from R2. Default `/content/images/`                                                              |
| `GHOST_STORAGE_ADAPTER_R2_MEDIA_URL_PREFIX`    | URL prefix to use for storing and serving media (video) from R2. Default `/content/media/`                                                        |
| `GHOST_STORAGE_ADAPTER_R2_FILES_URL_PREFIX`    | URL prefix to use for storing and serving files from R2. Default `/content/files/`                                                                |
| `GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES`   | Generate an image for each width specified. Experimental: uses undocumented Ghost internal logic. Default `false`. Allowed values `true`, `false` |
| `GHOST_STORAGE_ADAPTER_R2_RESIZE_WIDTHS`       | Comma separated list of widths to resize the image when saving. Default `600,1000,1600,2400`                                                      |
| `GHOST_STORAGE_ADAPTER_R2_LOG_LEVEL`           | Log level for the storage adapter. Default `info`. Allowed values `debug`, `info`, `warn`, `error`                                                |
| `GHOST_STORAGE_ADAPTER_R2_UUID_NAME`           | Use UUID as name when storing images. May cause issues when used with Responsive Images. Default `false`. Allowed values `true`, `false`          |
| `GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL`       | Save the original unoptimized image. May cause issues when used with Responsive Images. Default `true`. Allowed Values `true`, `false`            |
| `GHOST_STORAGE_ADAPTER_R2_RESIZE_JPEG_QUALITY` | Quality to use when resizing JPEG images. Default: `80`                                                                                           |

The following Ghost configuration is required to activate the plugin for `images`, `media`, and `files`:
```json
"storage": {
  "active": "ghost-cloudflare-r2",
  "ghost-cloudflare-r2": {},
  "media": {
    "adapter": "ghost-cloudflare-r2",
    "storage_type_media": true
  },
  "files": {
    "adapter": "ghost-cloudflare-r2",
    "storage_type_files": true
  }
}
```

The section for `media` and `files` and be removed if the adapter should not handle those types.
Note: this is an undocumented syntax and might change in future Ghost releases (tested on 5.30.1).
See [Configuring Storage Adapters](https://ghost.org/docs/config/#storage-adapters) for more details.

### Redirects for backwards compatibility (migrating to R2)
If your blog is already live, and you have sent out newsletters with images, then you no longer have control over the image URLs in the emails.
The URLs will be pointing to `example.com/content/images/*` but you want to serve them from the CDN `cdn.example.com/content/images/*`.

One solution is to use [Ghost Redirects](https://ghost.org/tutorials/implementing-redirects/) (assuming your content has been copied to the CDN):
```yaml
# Temporary redirect if you might be changing the CDN in the future
302:
  ^\/content\/images\/(.*)$: https://cdn.example.com/content/images/$1
  ^\/content\/media\/(.*)$: https://cdn.example.com/content/media/$1
  ^\/content\/files\/(.*)$: https://cdn.example.com/content/files/$1
```

If you want the flexibility to later change to a different blog domain or CDN you can set
`GHOST_STORAGE_ADAPTER_R2_DOMAIN` to `blog.example.com` and use Ghost to redirect to the CDN.

### Example Docker Compose environment variables
```yaml
environment:
  storage__active: ghost-cloudflare-r2
  storage__media__adapter: ghost-cloudflare-r2
  storage__media__storage_type_media: true
  storage__files__adapter: ghost-cloudflare-r2
  storage__files__storage_type_files: true
  GHOST_STORAGE_ADAPTER_R2_ACCOUNT_ID: xxxxxx
  GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID: xxxxxx
  GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY: xxxxxx
  GHOST_STORAGE_ADAPTER_R2_BUCKET: my-ghost-bucket
  GHOST_STORAGE_ADAPTER_R2_DOMAIN: https://cdn.example.com
  GHOST_STORAGE_ADAPTER_R2_IMAGES_URL_PREFIX: /content/images/ # optional
  GHOST_STORAGE_ADAPTER_R2_MEDIA_URL_PREFIX: /content/media/ # optional
  GHOST_STORAGE_ADAPTER_R2_FILES_URL_PREFIX: /content/files/ # optional
  GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES: false # optional
  GHOST_STORAGE_ADAPTER_R2_RESIZE_JPEG_QUALITY: 80 # optional
  # Example widths to get Dawn theme working correctly:
  GHOST_STORAGE_ADAPTER_R2_RESIZE_WIDTHS: 300,600,1000,1600,400,750,960,1140,1200 # optional.
  GHOST_STORAGE_ADAPTER_R2_UUID_NAME: false # optional
  GHOST_STORAGE_ADAPTER_R2_LOG_LEVEL: info # optional
  GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL: true # optional
```

## TODO
- [ ] Read adapter configuration from Ghost config as well as environment variables
- [ ] Tag a version for deployment
- [ ] Publish npm package
- [ ] Tests
