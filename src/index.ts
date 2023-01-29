import StorageBase from 'ghost-storage-base';
import {Handler} from 'express-serve-static-core';
import pkg from 'loglevel';

const {getLogger} = pkg;
import {Logger} from 'loglevel';
import sharp from 'sharp';
import {v4 as uuidv4} from 'uuid';
import mime from 'mime';

const log = getLogger('ghost-cloudflare-r2');
setLogLevel(log, 'GHOST_STORAGE_ADAPTER_R2_LOG_LEVEL');

import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import path from 'path';
import {readFile} from 'fs';

export interface FileInfo extends StorageBase.Image {
  originalname: string;
  fieldname?: string;
  encoding?: string;
  mimetype?: string;
  destination?: string;
  filename?: string;
  size?: number;
  ext: string;
}

function stripLeadingSlash(s: string): string {
  return s.indexOf('/') === 0 ? s.substring(1) : s;
}

function stripEndingSlash(s: string): string {
  return s.indexOf('/') === s.length - 1 ? s.substring(0, s.length - 1) : s;
}

function readFileAsync(filePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    readFile(filePath, (err, data) => (err ? reject(err) : resolve(data)))
  );
}

function setLogLevel(logger: Logger, envVariable: string) {
  switch (process.env[envVariable] || '') {
    case 'trace':
      logger.setLevel('trace');
      break;
    case 'debug':
      logger.setLevel('debug');
      break;
    case 'info':
      logger.setLevel('info');
      break;
    case 'warn':
      logger.setLevel('warn');
      break;
    case 'error':
      logger.setLevel('error');
      break;
    default:
      logger.setLevel('info');
  }
}

enum StorageType {
  Images = 0,
  Media = 1,
  Files = 2,
}

interface Config {
  storage_type_images?: boolean;
  storage_type_media?: boolean;
  storage_type_files?: boolean;
  GHOST_STORAGE_ADAPTER_R2_DOMAIN?: string;
  GHOST_STORAGE_ADAPTER_R2_BUCKET?: string;
  GHOST_STORAGE_ADAPTER_R2_ENDPOINT?: string;
  GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID?: string;
  GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY?: string;
  GHOST_STORAGE_ADAPTER_R2_IMAGES_URL_PREFIX?: string;
  GHOST_STORAGE_ADAPTER_R2_MEDIA_URL_PREFIX?: string;
  GHOST_STORAGE_ADAPTER_R2_FILES_URL_PREFIX?: string;
  GHOST_STORAGE_ADAPTER_R2_CONTENT_PREFIX?: string;
  GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES?: boolean;
  GHOST_STORAGE_ADAPTER_R2_RESIZE_WIDTHS?: string;
  GHOST_STORAGE_ADAPTER_R2_UUID_NAME?: boolean;
  GHOST_STORAGE_ADAPTER_R2_RESIZE_JPEG_QUALITY?: number;
  GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL?: boolean;
  GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE?: boolean;
}

function mergeConfigWithEnv(config: Config): Config {
  config.GHOST_STORAGE_ADAPTER_R2_DOMAIN =
    process.env.GHOST_STORAGE_ADAPTER_R2_DOMAIN ||
    config.GHOST_STORAGE_ADAPTER_R2_DOMAIN;

  config.GHOST_STORAGE_ADAPTER_R2_BUCKET =
    process.env.GHOST_STORAGE_ADAPTER_R2_BUCKET ||
    config.GHOST_STORAGE_ADAPTER_R2_BUCKET;

  config.GHOST_STORAGE_ADAPTER_R2_ENDPOINT =
    process.env.GHOST_STORAGE_ADAPTER_R2_ENDPOINT ||
    config.GHOST_STORAGE_ADAPTER_R2_ENDPOINT;

  config.GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID =
    process.env.GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID ||
    config.GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID;

  config.GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY =
    process.env.GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY ||
    config.GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY;

  config.GHOST_STORAGE_ADAPTER_R2_CONTENT_PREFIX =
    process.env.GHOST_STORAGE_ADAPTER_R2_CONTENT_PREFIX ||
    config.GHOST_STORAGE_ADAPTER_R2_CONTENT_PREFIX ||
    '';

  config.GHOST_STORAGE_ADAPTER_R2_IMAGES_URL_PREFIX =
    process.env.GHOST_STORAGE_ADAPTER_R2_IMAGES_URL_PREFIX ||
    config.GHOST_STORAGE_ADAPTER_R2_IMAGES_URL_PREFIX ||
    '/content/images/';
  config.GHOST_STORAGE_ADAPTER_R2_MEDIA_URL_PREFIX =
    process.env.GHOST_STORAGE_ADAPTER_R2_MEDIA_URL_PREFIX ||
    config.GHOST_STORAGE_ADAPTER_R2_MEDIA_URL_PREFIX ||
    '/content/media/';
  config.GHOST_STORAGE_ADAPTER_R2_FILES_URL_PREFIX =
    process.env.GHOST_STORAGE_ADAPTER_R2_FILES_URL_PREFIX ||
    config.GHOST_STORAGE_ADAPTER_R2_FILES_URL_PREFIX ||
    '/content/files/';

  let responsiveImages: boolean | undefined;
  if (
    process.env.GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES &&
    process.env.GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES === 'true'
  ) {
    responsiveImages = true;
  }
  config.GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES =
    responsiveImages ||
    config.GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES ||
    false;

  config.GHOST_STORAGE_ADAPTER_R2_RESIZE_WIDTHS =
    process.env.GHOST_STORAGE_ADAPTER_R2_RESIZE_WIDTHS ||
    config.GHOST_STORAGE_ADAPTER_R2_RESIZE_WIDTHS ||
    '300,600,1000,1600,400,750,960,1140,1200';

  let uuidName: boolean | undefined;
  if (
    process.env.GHOST_STORAGE_ADAPTER_R2_UUID_NAME &&
    process.env.GHOST_STORAGE_ADAPTER_R2_UUID_NAME === 'true'
  ) {
    uuidName = true;
  } else if (
    process.env.GHOST_STORAGE_ADAPTER_R2_UUID_NAME &&
    process.env.GHOST_STORAGE_ADAPTER_R2_UUID_NAME === 'false'
  ) {
    uuidName = false;
  } else if (process.env.GHOST_STORAGE_ADAPTER_R2_UUID_NAME) {
    throw new Error(
      `Environment variable GHOST_STORAGE_ADAPTER_R2_UUID_NAME contains invalid value ${process.env.GHOST_STORAGE_ADAPTER_R2_UUID_NAME}`
    );
  }

  config.GHOST_STORAGE_ADAPTER_R2_UUID_NAME =
    uuidName ?? (config.GHOST_STORAGE_ADAPTER_R2_UUID_NAME || false);

  let jpegQuality: number | undefined;
  if (process.env.GHOST_STORAGE_ADAPTER_R2_RESIZE_JPEG_QUALITY) {
    jpegQuality = parseInt(
      process.env.GHOST_STORAGE_ADAPTER_R2_RESIZE_JPEG_QUALITY
    );
  }
  config.GHOST_STORAGE_ADAPTER_R2_RESIZE_JPEG_QUALITY =
    jpegQuality || config.GHOST_STORAGE_ADAPTER_R2_RESIZE_JPEG_QUALITY || 80;

  let saveOriginal: boolean | undefined;
  if (
    process.env.GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL &&
    process.env.GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL === 'true'
  ) {
    saveOriginal = true;
  } else if (
    process.env.GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL &&
    process.env.GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL === 'false'
  ) {
    saveOriginal = false;
  } else if (process.env.GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL) {
    throw new Error(
      `Environment variable GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL contains invalid value ${process.env.GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL}`
    );
  }

  config.GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL =
    saveOriginal ?? (config.GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL || true);

  let ghostResize: boolean | undefined;
  if (
    process.env.GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE &&
    process.env.GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE === 'true'
  ) {
    ghostResize = true;
  } else if (
    process.env.GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE &&
    process.env.GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE === 'false'
  ) {
    ghostResize = false;
  } else if (process.env.GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE) {
    throw new Error(
      `Environment variable GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE contains invalid value ${process.env.GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE}`
    );
  }

  config.GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE =
    ghostResize ?? (config.GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE || true);

  return config;
}

function checkConfig(config: Config) {
  if (!config.GHOST_STORAGE_ADAPTER_R2_DOMAIN) {
    throw new Error(
      'Environment/config variable "GHOST_STORAGE_ADAPTER_R2_DOMAIN" has not been set'
    );
  }
  if (!config.GHOST_STORAGE_ADAPTER_R2_BUCKET) {
    throw new Error(
      'Environment/config variable "GHOST_STORAGE_ADAPTER_R2_BUCKET" has not been set'
    );
  }
  if (!config.GHOST_STORAGE_ADAPTER_R2_ENDPOINT) {
    throw new Error(
      'Environment/config variable "GHOST_STORAGE_ADAPTER_R2_ENDPOINT" has not been set'
    );
  }
  if (!config.GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID) {
    throw new Error(
      'Environment/config variable "GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID" has not been set'
    );
  }
  if (!config.GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY) {
    throw new Error(
      'Environment/config variable "GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY" has not been set'
    );
  }
}

export default class CloudflareR2Adapter extends StorageBase {
  private S3: S3Client;
  private bucket: string;
  private pathPrefix: string;
  private domain: string;
  private storageType: StorageType = StorageType.Images;
  private imagesUrlPrefix: string;
  private mediaUrlPrefix: string;
  private filesUrlPrefix: string;
  private responsiveImages: boolean;
  private resizeWidths: number[];
  public saveRaw: unknown = undefined;
  private uuidName: boolean;
  private saveOriginal: boolean;
  private jpegQuality: number | undefined;
  private ghostResize: boolean;

  constructor(config: Config = {}) {
    log.debug('Initialising ghost-cloudflare-r2 storage adapter');
    super();
    mergeConfigWithEnv(config);
    checkConfig(config);

    this.bucket = <string>config.GHOST_STORAGE_ADAPTER_R2_BUCKET;
    this.domain = <string>config.GHOST_STORAGE_ADAPTER_R2_DOMAIN;
    this.imagesUrlPrefix = <string>(
      config.GHOST_STORAGE_ADAPTER_R2_IMAGES_URL_PREFIX
    );
    this.mediaUrlPrefix = <string>(
      config.GHOST_STORAGE_ADAPTER_R2_MEDIA_URL_PREFIX
    );
    this.filesUrlPrefix = <string>(
      config.GHOST_STORAGE_ADAPTER_R2_FILES_URL_PREFIX
    );
    this.responsiveImages = <boolean>(
      config.GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES
    );

    this.resizeWidths = (<string>config.GHOST_STORAGE_ADAPTER_R2_RESIZE_WIDTHS)
      .split(',')
      .map(w => parseInt(w));

    if (config.GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES === true) {
      // Ghost checks if a 'saveRaw' function exists on the storage adapter,
      // if it exists, the theme will generate srcset attribute in the HTML.
      this.saveRaw = function () {};
    }

    if (config.storage_type_images === true) {
      this.storageType = StorageType.Images;
      this.pathPrefix = <string>(
        config.GHOST_STORAGE_ADAPTER_R2_IMAGES_URL_PREFIX
      );
    } else if (config.storage_type_media === true) {
      this.storageType = StorageType.Media;
      this.pathPrefix = <string>(
        config.GHOST_STORAGE_ADAPTER_R2_MEDIA_URL_PREFIX
      );
    } else if (config.storage_type_files === true) {
      this.storageType = StorageType.Files;
      this.pathPrefix = <string>(
        config.GHOST_STORAGE_ADAPTER_R2_FILES_URL_PREFIX
      );
    } else {
      this.storageType = StorageType.Images;
      this.pathPrefix = this.imagesUrlPrefix;
    }

    this.pathPrefix =
      config.GHOST_STORAGE_ADAPTER_R2_CONTENT_PREFIX + this.pathPrefix;

    this.uuidName = <boolean>config.GHOST_STORAGE_ADAPTER_R2_UUID_NAME;
    this.saveOriginal = <boolean>config.GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL;
    this.ghostResize = <boolean>config.GHOST_STORAGE_ADAPTER_R2_GHOST_RESIZE;

    log.info(
      'Cloudflare R2 Storage Adapter: handling',
      StorageType[this.storageType],
      'at',
      this.pathPrefix
    );

    this.S3 = new S3Client({
      region: 'auto',
      endpoint: <string>config.GHOST_STORAGE_ADAPTER_R2_ENDPOINT,
      credentials: {
        accessKeyId: <string>config.GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID,
        secretAccessKey: <string>(
          config.GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY
        ),
      },
    });
    log.debug('Initialisation done');
  }

  delete(fileName: string, targetDir?: string): Promise<boolean> {
    log.debug('delete():', 'filename:', fileName, 'targetDir:', targetDir);
    log.error('Cloudflare R2 Storage Adapter: delete() is not implemented');
    return Promise.resolve(false);
  }

  exists(fileName: string, targetDir?: string): Promise<boolean> {
    log.debug('exists():', 'fileName:', fileName, 'targetDir:', targetDir);

    let targetPath: string;

    if (targetDir === undefined) {
      targetPath = fileName;
    } else {
      targetPath = path.join(targetDir, fileName);
    }

    return new Promise((resolve, reject) => {
      this.S3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: stripLeadingSlash(targetPath),
        })
      )
        .then(
          value => {
            if (value.$metadata.httpStatusCode === 200) {
              resolve(true);
            } else {
              resolve(false);
            }
          },
          reason => {
            resolve(false);
          }
        )
        .catch(reason => {
          log.debug(reason);
          reject(reason);
        });
    });
  }

  read(options?: StorageBase.ReadOptions): Promise<Buffer> {
    log.debug('Cloudflare R2 Storage Adapter: read():', 'options:', options);

    return new Promise((resolve, reject) => {
      if (options === undefined) {
        reject(
          'Cloudflare R2 Storage Adapter: read(): argument "options" is undefined'
        );
        return;
      }

      if (options?.path === undefined) {
        reject(
          'Cloudflare R2 Storage Adapter: read(): argument "options.path" is undefined'
        );
        return;
      }

      const r2Path = stripLeadingSlash(
        path.join(this.pathPrefix, options?.path)
      );

      this.S3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: r2Path,
        })
      )
        .then(
          value => {
            value.Body?.transformToByteArray()
              .then(
                (value: Uint8Array) => {
                  resolve(Buffer.from(value));
                },
                (reason: unknown) => {
                  reject(reason);
                }
              )
              .catch((err: unknown) => {
                reject(err);
              });
          },
          reason => {
            reject(reason);
          }
        )
        .catch(err => {
          reject(err);
        });
    });
  }

  saveResizedImages(
    fileInfo: FileInfo,
    fileBuffer: Buffer,
    originalUuid?: string | null
  ): Promise<boolean> {
    log.debug(
      'Cloudflare R2 Storage Adapter: saveResizedImages(): fileInfo:',
      fileInfo
    );

    return new Promise((resolve, reject) => {
      Promise.all(
        this.resizeWidths.map(width => {
          const directory = this.getTargetDir(
            `${stripEndingSlash(this.pathPrefix)}/size/w${width}`
          );

          return Promise.all([
            this.getUniqueFileName(fileInfo, directory, originalUuid),
            this.jpegQuality && fileInfo.type === 'image/jpeg'
              ? sharp(fileBuffer)
                  .resize({width: width})
                  .jpeg({quality: this.jpegQuality})
                  .toBuffer()
              : sharp(fileBuffer).resize({width: width}).toBuffer(),
          ])
            .then(([filePathR2, resizedBuffer]) => {
              log.debug(
                'Cloudflare R2 Storage Adapter: saveResizedImages(): saving',
                filePathR2
              );

              return this.S3.send(
                new PutObjectCommand({
                  Bucket: this.bucket,
                  Body: resizedBuffer,
                  ContentType: fileInfo.type,
                  CacheControl: `max-age=${30 * 24 * 60 * 60}`,
                  Key: stripLeadingSlash(filePathR2),
                })
              ).then(() => {
                log.info('Saved', filePathR2);
              });
            })
            .catch(reason => {
              reject(reason);
            });
        })
      )
        .then(() => {
          log.debug('Finished saving resized images for', fileInfo.name);
          resolve(true);
        })
        .catch(reason => {
          reject(reason);
        });
    });
  }

  getUniqueFileName(
    fileInfo: FileInfo,
    targetDir: string,
    uuid?: string | null
  ): string {
    if (this.storageType === StorageType.Files) {
      return super.getUniqueFileName(fileInfo, targetDir);
    }

    if (uuid) {
      return path.join(targetDir, uuid + fileInfo.ext);
    } else {
      return super.getUniqueFileName(fileInfo, targetDir);
    }
  }

  isOriginalImage(fileInfo: FileInfo): boolean {
    return !fileInfo.path.endsWith('_processed');
  }

  save(
    fileInfo: FileInfo,
    targetDir?: string,
    forceUuid?: string
  ): Promise<string> {
    log.debug(
      'Cloudflare R2 Storage Adapter: save():',
      'fileInfo:',
      fileInfo,
      'targetDir:',
      targetDir
    );

    let isImport = false;
    if (targetDir) {
      log.info('Cloudflare R2 Storage Adapter: save(): Detected import.');
      isImport = true;
      fileInfo.name = path.basename(fileInfo.name);
      fileInfo.ext = path.extname(fileInfo.name);
    }

    const directory = this.getTargetDir(this.pathPrefix);

    return new Promise((resolve, reject) => {
      if (
        !this.saveOriginal &&
        this.isOriginalImage(fileInfo) &&
        this.ghostResize
      ) {
        log.info(
          'Cloudflare R2 Storage Adapter: save(): discarding original: ',
          fileInfo.name
        );
        // Not sure if the URL for the original image is used.
        // Should only be used if imageOptimization__resize is true since then the original (*_o.jpg) is not used.
        resolve('');
        return;
      }

      let uuid: string | null = null;
      if (this.uuidName && !isImport) {
        uuid = forceUuid || uuidv4();
      }

      Promise.all([
        this.getUniqueFileName(fileInfo, directory, uuid),
        readFileAsync(fileInfo.path),
      ])
        .then(([filePathR2, fileBuffer]) => {
          if (fileInfo.type === '' || fileInfo.type === undefined) {
            const mimeType = mime.getType(fileInfo.path);
            if (mimeType) {
              log.debug('Detected mimeType:', mimeType);
              fileInfo.type = mimeType;
            }
          }
          log.debug(
            'Cloudflare R2 Storage Adapter: save(): saving',
            filePathR2
          );
          this.S3.send(
            new PutObjectCommand({
              Bucket: this.bucket,
              Body: fileBuffer,
              ContentType: fileInfo.type,
              CacheControl: `max-age=${30 * 24 * 60 * 60}`,
              Key: stripLeadingSlash(filePathR2),
            })
          ).then(
            () => {
              log.info('Saved', filePathR2);
              if (
                ((this.ghostResize && !this.isOriginalImage(fileInfo)) ||
                  (!this.ghostResize && this.isOriginalImage(fileInfo))) &&
                this.responsiveImages &&
                this.storageType === StorageType.Images
              ) {
                log.info('Generating different image sizes...');
                this.saveResizedImages(fileInfo, fileBuffer, uuid)
                  .then(() => {
                    log.info('Generating different image sizes... Done');
                    resolve(`${this.domain}/${stripLeadingSlash(filePathR2)}`);
                  })
                  .catch(reason => {
                    reject(reason);
                  });
              } else {
                resolve(`${this.domain}/${stripLeadingSlash(filePathR2)}`);
              }
            },
            reason => {
              reject(reason);
            }
          );
        })
        .catch(err => {
          log.debug(err);
          reject(err);
        });
    });
  }

  serve(): Handler {
    return (req, res, next) => {
      next();
    };
  }
}

module.exports = CloudflareR2Adapter;
