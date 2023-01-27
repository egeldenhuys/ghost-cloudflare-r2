import StorageBase from 'ghost-storage-base';
import {Handler} from 'express-serve-static-core';
import pkg from 'loglevel';

const {getLogger} = pkg;
import {Logger} from 'loglevel';
import sharp from 'sharp';
import {v4 as uuidv4} from 'uuid';

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
import {fileTypeFromFile} from 'file-type';

interface FileInfo extends StorageBase.Image {
  originalname: string;
  ext: string;
}

function stripLeadingSlash(s: string): string {
  return s.indexOf('/') === 0 ? s.substring(1) : s;
}

function stripEndingSlash(s: string): string {
  return s.indexOf('/') === s.length - 1 ? s.substring(0, s.length - 1) : s;
}

function check_env_variable(variableName: string) {
  if (process.env[variableName] === undefined) {
    throw new Error(`Environment variable ${variableName} is not defined`);
  }
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
}

export default class CloudflareR2Adapter extends StorageBase {
  S3: S3Client;
  private bucket: string;
  private pathPrefix: string;
  private domain: string;
  private storageType: StorageType = StorageType.Images;
  private imagesUrlPrefix: string;
  private mediaUrlPrefix: string;
  private filesUrlPrefix: string;
  private responsiveImages: string;
  private resizeWidths: number[];
  public saveRaw: unknown = undefined;
  private uuidName: string;
  private saveOriginal: string;
  private jpegQuality: number | undefined;

  constructor(config: Config = {}) {
    log.debug('Initialising ghost-cloudflare-r2 storage adapter');
    super();

    check_env_variable('GHOST_STORAGE_ADAPTER_R2_DOMAIN');
    check_env_variable('GHOST_STORAGE_ADAPTER_R2_BUCKET');
    check_env_variable('GHOST_STORAGE_ADAPTER_R2_ACCOUNT_ID');
    check_env_variable('GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID');
    check_env_variable('GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY');

    this.bucket = process.env.GHOST_STORAGE_ADAPTER_R2_BUCKET || '';
    this.pathPrefix = process.env.GHOST_STORAGE_ADAPTER_R2_PATH_PREFIX || '';
    this.domain = process.env.GHOST_STORAGE_ADAPTER_R2_DOMAIN || '';
    this.imagesUrlPrefix =
      process.env.GHOST_STORAGE_ADAPTER_R2_IMAGES_URL_PREFIX ||
      '/content/images/';
    this.mediaUrlPrefix =
      process.env.GHOST_STORAGE_ADAPTER_R2_MEDIA_URL_PREFIX ||
      '/content/media/';
    this.filesUrlPrefix =
      process.env.GHOST_STORAGE_ADAPTER_R2_FILES_URL_PREFIX ||
      '/content/files/';
    this.responsiveImages =
      process.env.GHOST_STORAGE_ADAPTER_R2_RESPONSIVE_IMAGES || 'false';
    this.resizeWidths = (
      process.env.GHOST_STORAGE_ADAPTER_R2_RESIZE_WIDTHS || '600,1000,1600,2400'
    )
      .split(',')
      .map(w => parseInt(w));

    this.uuidName = process.env.GHOST_STORAGE_ADAPTER_R2_UUID_NAME || 'false';
    this.saveOriginal =
      process.env.GHOST_STORAGE_ADAPTER_R2_SAVE_ORIGINAL || 'true';

    this.jpegQuality = process.env.GHOST_STORAGE_ADAPTER_R2_RESIZE_JPEG_QUALITY
      ? parseInt(process.env.GHOST_STORAGE_ADAPTER_R2_RESIZE_JPEG_QUALITY)
      : undefined;

    if (this.responsiveImages === 'true') {
      // Ghost checks if a 'saveRaw' function exists on the storage adapter,
      // if it exists, the theme will generate srcset attribute in the HTML.
      this.saveRaw = function () {};
    }

    if (config.storage_type_images === true) {
      this.storageType = StorageType.Images;
      this.pathPrefix = this.imagesUrlPrefix;
    } else if (config.storage_type_media === true) {
      this.storageType = StorageType.Media;
      this.pathPrefix = this.mediaUrlPrefix;
    } else if (config.storage_type_files === true) {
      this.storageType = StorageType.Files;
      this.pathPrefix = this.filesUrlPrefix;
    } else {
      this.storageType = StorageType.Images;
      this.pathPrefix = this.imagesUrlPrefix;
    }

    log.info(
      'Cloudflare R2 Storage Adapter: handling',
      StorageType[this.storageType],
      'at',
      this.pathPrefix
    );

    this.S3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.GHOST_STORAGE_ADAPTER_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.GHOST_STORAGE_ADAPTER_R2_ACCESS_KEY_ID || '',
        secretAccessKey:
          process.env.GHOST_STORAGE_ADAPTER_R2_SECRET_ACCESS_KEY || '',
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
            if (reason.$metadata.httpStatusCode === 404) {
              resolve(false);
            } else {
              reject(reason);
            }
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

          Promise.all([
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
              );
            })
            .catch(reason => {
              reject(reason);
            });
        })
      )
        .then(() => {
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

  save(fileInfo: FileInfo, targetDir?: string): Promise<string> {
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
      if (this.saveOriginal === 'false' && this.isOriginalImage(fileInfo)) {
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
        uuid = uuidv4();
      }

      Promise.all([
        this.getUniqueFileName(fileInfo, directory, uuid),
        readFileAsync(fileInfo.path),
        fileTypeFromFile(fileInfo.path),
      ])
        .then(([filePathR2, fileBuffer, fileType]) => {
          if (
            (fileInfo.type === '' || fileInfo.type === undefined) &&
            fileType
          ) {
            fileInfo.type = fileType.mime;
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
              if (
                this.isOriginalImage(fileInfo) &&
                this.responsiveImages === 'true' &&
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

// module.exports = CloudflareR2Adapter;
